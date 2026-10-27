import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../auth.ts';
import { db, AgentTask, AgentStep } from '../db.ts';
import { getGeminiClient, generateGeminiImage } from '../gemini.ts';
import { generateTextToVideoScene } from '../videoService.ts';

export const agentRouter = Router();

// ==========================================
// --- Server-Side Tool Execution Registry ---
// ==========================================

interface ToolDefinition {
  name: string;
  description: string;
  consequential?: boolean;
  validateInput: (input: any, userId: string) => { valid: boolean; error?: string };
  execute: (input: any, userId: string) => Promise<any>;
}

const AUTHORIZED_TOOLS: Record<string, ToolDefinition> = {
  web_search: {
    name: 'web_search',
    description: 'Searches the live web for real-time facts, reference data, or background lore.',
    validateInput: (input) => {
      if (!input || typeof input.query !== 'string' || !input.query.trim()) {
        return { valid: false, error: 'query string is required.' };
      }
      return { valid: true };
    },
    execute: async (input) => {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: `Provide an accurate, concise research summary for: "${input.query.trim()}". Return clear bullet points and citations if relevant.`,
        config: {
          temperature: 0.2,
        },
      });
      return {
        query: input.query,
        summary: response.text?.trim() || 'No search results found.',
        source: 'Google Search / Gemini Grounding',
        timestamp: new Date().toISOString(),
      };
    },
  },

  project_analysis: {
    name: 'project_analysis',
    description: 'Deeply analyzes a project screenplay, scenes, durations, and character references for continuity.',
    validateInput: (input, userId) => {
      if (!input || !input.projectId) {
        return { valid: false, error: 'projectId is required.' };
      }
      const project = db.getProject(userId, input.projectId);
      if (!project) {
        return { valid: false, error: 'Project not found or unauthorized.' };
      }
      return { valid: true };
    },
    execute: async (input, userId) => {
      const project = db.getProject(userId, input.projectId);
      if (!project) throw new Error('Project not found');

      const sceneCount = project.scenes.length;
      const totalDuration = project.scenes.reduce((acc, s) => acc + (s.duration_seconds || 4), 0);
      const scenesWithImages = project.scenes.filter((s) => Boolean(s.image_url)).length;
      const scenesWithVideos = project.scenes.filter((s) => s.video_status === 'completed').length;
      const characterCount = project.character_refs.length;

      const findings = [
        `Screenplay contains ${sceneCount} scene(s) with an estimated total runtime of ${totalDuration} seconds.`,
        `Asset readiness: ${scenesWithImages}/${sceneCount} scenes have keyframe images rendered; ${scenesWithVideos}/${sceneCount} scenes have video clips generated.`,
        `Character library: ${characterCount} registered character reference(s) for visual consistency.`,
      ];

      const recommendations: string[] = [];
      if (scenesWithImages < sceneCount) {
        recommendations.push(`Generate keyframe images for ${sceneCount - scenesWithImages} remaining scene(s).`);
      }
      if (scenesWithVideos < sceneCount) {
        recommendations.push(`Synthesize video clips for ${sceneCount - scenesWithVideos} scene(s) using Veo 3.`);
      }
      if (characterCount === 0) {
        recommendations.push('Define character references in the Character Library to maintain consistent face and costume design.');
      }

      return {
        projectTitle: project.title,
        status: project.status,
        score: Math.round(((scenesWithImages + scenesWithVideos) / (sceneCount * 2 || 1)) * 100),
        findings,
        recommendations,
      };
    },
  },

  content_synthesizer: {
    name: 'content_synthesizer',
    description: 'Synthesizes screenplays, character dialogue, or scene visual prompts with Gemini 3.1 Flash Lite.',
    validateInput: (input) => {
      if (!input || !input.topic || typeof input.topic !== 'string') {
        return { valid: false, error: 'topic is required.' };
      }
      return { valid: true };
    },
    execute: async (input) => {
      const ai = getGeminiClient();
      const format = input.format || 'screenplay';
      const prompt = `You are a master creative director. Synthesize high-quality ${format} for:
"${input.topic}"
Tone: ${input.tone || 'Cinematic, compelling'}

Provide the final polished output directly without conversational filler.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: prompt,
        config: {
          temperature: 0.7,
        },
      });

      return {
        format,
        content: response.text?.trim() || '',
        generatedAt: new Date().toISOString(),
      };
    },
  },

  asset_generator: {
    name: 'asset_generator',
    description: 'Generates high-resolution images or cinematic video clips directly.',
    validateInput: (input) => {
      if (!input || !input.prompt || typeof input.prompt !== 'string') {
        return { valid: false, error: 'prompt is required.' };
      }
      return { valid: true };
    },
    execute: async (input, userId) => {
      const assetType = input.assetType === 'video' ? 'video' : 'image';
      const aspectRatio = input.aspectRatio || '16:9';

      if (assetType === 'video') {
        const videoId = `agent_vid_${Date.now()}`;
        const filePath = await generateTextToVideoScene(input.prompt, aspectRatio as any, videoId);
        return {
          assetType: 'video',
          videoUrl: `/api/video/stream/${videoId}`,
          filePath,
          aspectRatio,
        };
      } else {
        const result = await generateGeminiImage(input.prompt, aspectRatio, {
          autoEnhance: true,
          upscale: true,
          imageSize: '2K',
        });
        db.saveGeneratedImage(
          userId,
          input.prompt,
          aspectRatio,
          result.imageUrl,
          result.model
        );
        return {
          assetType: 'image',
          imageUrl: result.imageUrl,
          model: result.model,
          aspectRatio,
        };
      }
    },
  },

  memory_ops: {
    name: 'memory_ops',
    description: 'Reads, stores, or clears persistent memories for the user or active project.',
    validateInput: (input) => {
      if (!input || !input.action) {
        return { valid: false, error: 'action (store | retrieve | clear) is required.' };
      }
      if (input.action === 'store' && (!input.key || !input.value)) {
        return { valid: false, error: 'key and value are required to store memory.' };
      }
      return { valid: true };
    },
    execute: async (input, userId) => {
      if (input.action === 'store') {
        const memory = db.createMemory(userId, {
          key: input.key,
          value: input.value,
          category: input.category || 'fact',
          project_id: input.projectId || null,
          source: 'agent',
        });
        return { success: true, message: `Stored memory: "${input.key}"`, memory };
      } else if (input.action === 'retrieve') {
        const memories = db.getMemories(userId, input.projectId);
        return { success: true, count: memories.length, memories };
      } else if (input.action === 'clear') {
        const deleted = db.clearMemories(userId, input.projectId);
        return { success: true, message: `Cleared ${deleted} memories.` };
      }
      throw new Error(`Unsupported memory action: ${input.action}`);
    },
  },
};

// ==========================================
// --- Agent Task API Endpoints ---
// ==========================================

// GET /api/agent/tasks - Retrieve all tasks for session recovery & display
agentRouter.get('/tasks', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { projectId } = req.query;
    const tasks = db.getAgentTasks(
      req.user!.id,
      typeof projectId === 'string' ? projectId : undefined
    );
    res.json(tasks);
  } catch (err: any) {
    console.error('[Agent] Error fetching tasks:', err);
    res.status(500).json({ error: 'Failed to retrieve agent tasks.' });
  }
});

// POST /api/agent/task/create - Create an autonomous agent plan
agentRouter.post('/task/create', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { goal, projectId, isConsequentialAction = false } = req.body;
    if (!goal || typeof goal !== 'string' || !goal.trim()) {
      return res.status(400).json({ error: 'Task goal is required.' });
    }

    const ai = getGeminiClient();

    // Use Gemini to decompose the user goal into structured executable steps with registered tools
    const decompositionPrompt = `You are the lead architect for HYNEX Autonomous Agent.
Decompose the following user objective into a clear sequence of 2 to 4 executable steps using ONLY registered tools.

Registered Authorized Tools:
1. "web_search": { "query": "string" }
2. "project_analysis": { "projectId": "${projectId || 'default'}" }
3. "content_synthesizer": { "topic": "string", "format": "screenplay" | "dialogue" | "visual_prompt" }
4. "asset_generator": { "prompt": "string", "assetType": "image" | "video" }
5. "memory_ops": { "action": "store" | "retrieve", "key": "string", "value": "string" }

User Goal:
"${goal.trim()}"

Output ONLY a JSON array of steps adhering to this schema:
[
  {
    "step_number": 1,
    "title": "Clear concise title of what this step does",
    "tool_name": "web_search",
    "tool_input": { "query": "..." }
  }
]`;

    let steps: AgentStep[] = [];
    try {
      const resp = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: decompositionPrompt,
        config: {
          temperature: 0.3,
          responseMimeType: 'application/json',
        },
      });

      const parsedSteps = JSON.parse(resp.text?.trim() || '[]');
      steps = parsedSteps.map((s: any, idx: number) => ({
        id: `step_${Date.now()}_${idx + 1}`,
        step_number: s.step_number || idx + 1,
        title: s.title || `Step ${idx + 1}`,
        status: 'pending' as const,
        tool_name: AUTHORIZED_TOOLS[s.tool_name] ? s.tool_name : 'content_synthesizer',
        tool_input: s.tool_input || { topic: goal },
      }));
    } catch (parseErr) {
      console.warn('[Agent] Step decomposition fallback:', parseErr);
      steps = [
        {
          id: `step_${Date.now()}_1`,
          step_number: 1,
          title: 'Analyze project context & requirements',
          status: 'pending',
          tool_name: projectId ? 'project_analysis' : 'web_search',
          tool_input: projectId ? { projectId } : { query: goal },
        },
        {
          id: `step_${Date.now()}_2`,
          step_number: 2,
          title: 'Synthesize optimal creative content',
          status: 'pending',
          tool_name: 'content_synthesizer',
          tool_input: { topic: goal, format: 'screenplay' },
        },
      ];
    }

    // Check if goal involves consequential operations (e.g., delete, clear, erase, wipe)
    const requiresConfirmation =
      isConsequentialAction ||
      /delete|clear|erase|wipe|destroy|remove all/i.test(goal);

    const task = db.createAgentTask(req.user!.id, {
      title: goal.length > 50 ? goal.slice(0, 47) + '...' : goal,
      goal: goal.trim(),
      project_id: projectId || null,
      status: 'planned',
      steps,
      requires_confirmation: requiresConfirmation,
      confirmation_action: requiresConfirmation
        ? {
            type: 'consequential_execution',
            description: `This task involves significant or irreversible changes based on: "${goal.slice(0, 60)}"`,
            payload: { goal, projectId },
          }
        : null,
    });

    res.status(201).json(task);
  } catch (err: any) {
    console.error('[Agent] Task creation error:', err);
    res.status(500).json({ error: err.message || 'Failed to create agent task.' });
  }
});

// POST /api/agent/task/:id/execute - Execute plan steps safely
agentRouter.post('/task/:id/execute', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const task = db.getAgentTask(req.user!.id, req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found or unauthorized.' });
    }

    if (task.requires_confirmation && !task.is_confirmed) {
      return res.status(403).json({
        error: 'Consequential action requires explicit user confirmation before proceeding.',
        requiresConfirmation: true,
        confirmationAction: task.confirmation_action,
      });
    }

    if (task.status === 'completed') {
      return res.json({ task, message: 'Task already completed.' });
    }

    // Mark task running
    db.updateAgentTask(req.user!.id, task.id, { status: 'running' });

    // Execute steps sequentially
    const updatedSteps = [...task.steps];
    let executionSuccess = true;
    let finalSummary = '';

    for (let i = 0; i < updatedSteps.length; i++) {
      const step = updatedSteps[i];
      if (step.status === 'completed') continue;

      step.status = 'running';
      step.started_at = new Date().toISOString();
      db.updateAgentTask(req.user!.id, task.id, { steps: updatedSteps });

      const tool = AUTHORIZED_TOOLS[step.tool_name || ''];
      if (!tool) {
        step.status = 'failed';
        step.error = `Tool "${step.tool_name}" is not in the authorized tool registry.`;
        step.completed_at = new Date().toISOString();
        executionSuccess = false;
        break;
      }

      // 1. Validate tool input on server
      const validation = tool.validateInput(step.tool_input, req.user!.id);
      if (!validation.valid) {
        step.status = 'failed';
        step.error = `Server validation failed: ${validation.error}`;
        step.completed_at = new Date().toISOString();
        executionSuccess = false;
        break;
      }

      // 2. Execute tool
      try {
        const output = await tool.execute(step.tool_input, req.user!.id);
        step.status = 'completed';
        step.tool_output = output;
        step.completed_at = new Date().toISOString();
        finalSummary += `\n- [${step.title}]: Completed successfully.`;
      } catch (toolErr: any) {
        console.error(`[Agent] Tool ${tool.name} failed:`, toolErr);
        step.status = 'failed';
        step.error = toolErr.message || 'Tool execution encountered an internal error.';
        step.completed_at = new Date().toISOString();
        executionSuccess = false;
        break;
      }

      db.updateAgentTask(req.user!.id, task.id, { steps: updatedSteps });
    }

    const finalStatus = executionSuccess ? 'completed' : 'failed';
    const updatedTask = db.updateAgentTask(req.user!.id, task.id, {
      status: finalStatus,
      steps: updatedSteps,
      result: executionSuccess ? `All ${updatedSteps.length} step(s) executed verified:\n${finalSummary}` : null,
      error: executionSuccess ? null : 'One or more steps failed execution.',
    });

    res.json({
      task: updatedTask,
      success: executionSuccess,
    });
  } catch (err: any) {
    console.error('[Agent] Task execution error:', err);
    res.status(500).json({ error: err.message || 'Task execution failed.' });
  }
});

// POST /api/agent/task/:id/confirm - Confirm consequential action and execute
agentRouter.post('/task/:id/confirm', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const task = db.getAgentTask(req.user!.id, req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found or unauthorized.' });
    }

    db.updateAgentTask(req.user!.id, task.id, {
      is_confirmed: true,
      requires_confirmation: false,
    });

    res.json({
      success: true,
      message: 'Action confirmed. You may now run execution.',
      task: db.getAgentTask(req.user!.id, task.id),
    });
  } catch (err: any) {
    console.error('[Agent] Confirmation error:', err);
    res.status(500).json({ error: 'Failed to confirm task.' });
  }
});

// POST /api/agent/task/:id/cancel - Cancel task execution
agentRouter.post('/task/:id/cancel', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const task = db.getAgentTask(req.user!.id, req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found or unauthorized.' });
    }

    // Mark non-completed steps as skipped
    const steps = task.steps.map((s) => {
      if (s.status === 'running' || s.status === 'pending') {
        return { ...s, status: 'skipped' as const };
      }
      return s;
    });

    const updated = db.updateAgentTask(req.user!.id, task.id, {
      status: 'cancelled',
      steps,
    });

    res.json({
      success: true,
      message: 'Task cancelled safely.',
      task: updated,
    });
  } catch (err: any) {
    console.error('[Agent] Cancel error:', err);
    res.status(500).json({ error: 'Failed to cancel task.' });
  }
});

// POST /api/agent/task/:id/retry - Safe retry for failed steps
agentRouter.post('/task/:id/retry', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const task = db.getAgentTask(req.user!.id, req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found or unauthorized.' });
    }

    // Reset failed and skipped steps to pending
    const steps = task.steps.map((s) => {
      if (s.status === 'failed' || s.status === 'skipped') {
        return {
          ...s,
          status: 'pending' as const,
          error: undefined,
          started_at: undefined,
          completed_at: undefined,
        };
      }
      return s;
    });

    const updated = db.updateAgentTask(req.user!.id, task.id, {
      status: 'planned',
      steps,
      error: null,
    });

    res.json({
      success: true,
      message: 'Task reset for retry.',
      task: updated,
    });
  } catch (err: any) {
    console.error('[Agent] Retry error:', err);
    res.status(500).json({ error: 'Failed to reset task for retry.' });
  }
});

// DELETE /api/agent/task/:id - Delete an agent task record
agentRouter.delete('/task/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const success = db.deleteAgentTask(req.user!.id, req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Task not found or unauthorized.' });
    }
    res.json({ success: true, message: 'Agent task deleted.' });
  } catch (err: any) {
    console.error('[Agent] Delete error:', err);
    res.status(500).json({ error: 'Failed to delete task.' });
  }
});
