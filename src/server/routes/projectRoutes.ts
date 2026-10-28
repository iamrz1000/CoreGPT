import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../auth.ts';
import { db } from '../db.ts';

export const projectRouter = Router();

// GET /api/projects - List all projects for authenticated user
projectRouter.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const projects = db.getProjects(req.user!.id);
    res.json(projects);
  } catch (err: any) {
    console.error('[Projects] Error fetching projects:', err);
    res.status(500).json({ error: 'Failed to retrieve projects.' });
  }
});

// POST /api/projects - Create a new project
projectRouter.post('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, description, category, status, character_refs, scenes, script } = req.body;
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Project title is required.' });
    }

    const project = db.createProject(req.user!.id, {
      title,
      description,
      category,
      status,
      character_refs,
      scenes,
      script,
    });

    res.status(201).json(project);
  } catch (err: any) {
    console.error('[Projects] Error creating project:', err);
    res.status(500).json({ error: 'Failed to create project.' });
  }
});

// GET /api/projects/:id - Get project with linked assets, memories, and agent tasks
projectRouter.get('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const project = db.getProject(req.user!.id, req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found or access denied.' });
    }

    // Retrieve scoped memories, agent tasks, and user files linked to this project
    const memories = db.getMemories(req.user!.id, project.id);
    const tasks = db.getAgentTasks(req.user!.id, project.id);
    const files = db.getUserFiles(req.user!.id, project.id);

    res.json({
      ...project,
      linkedMemories: memories,
      linkedTasks: tasks,
      linkedFiles: files,
    });
  } catch (err: any) {
    console.error('[Projects] Error fetching project details:', err);
    res.status(500).json({ error: 'Failed to load project details.' });
  }
});

// PATCH /api/projects/:id - Update project
projectRouter.patch('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = db.updateProject(req.user!.id, req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Project not found or access denied.' });
    }
    res.json(updated);
  } catch (err: any) {
    console.error('[Projects] Error updating project:', err);
    res.status(500).json({ error: 'Failed to update project.' });
  }
});

// DELETE /api/projects/:id - Delete project and scoped entities
projectRouter.delete('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const success = db.deleteProject(req.user!.id, req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Project not found or access denied.' });
    }
    res.json({ success: true, message: 'Project and all associated assets deleted.' });
  } catch (err: any) {
    console.error('[Projects] Error deleting project:', err);
    res.status(500).json({ error: 'Failed to delete project.' });
  }
});

// POST /api/projects/:id/resume - Resume project (updates active timestamp and status)
projectRouter.post('/:id/resume', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const project = db.getProject(req.user!.id, req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found or access denied.' });
    }

    const updated = db.updateProject(req.user!.id, req.params.id, {
      status: project.status === 'archived' ? 'in_progress' : project.status,
    });

    res.json({
      project: updated,
      message: `Resumed "${project.title}" successfully.`,
    });
  } catch (err: any) {
    console.error('[Projects] Error resuming project:', err);
    res.status(500).json({ error: 'Failed to resume project.' });
  }
});

// POST /api/projects/:id/character - Add or update character reference
projectRouter.post('/:id/character', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const project = db.getProject(req.user!.id, req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found or access denied.' });
    }

    const { id, name, description, avatar_url, visual_traits, voice_id } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Character name is required.' });
    }

    const charId = id || `char_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const character = {
      id: charId,
      name: name.trim(),
      description: description?.trim() || '',
      avatar_url,
      visual_traits: Array.isArray(visual_traits) ? visual_traits : [],
      voice_id,
    };

    const existingIndex = project.character_refs.findIndex((c) => c.id === charId);
    let updatedRefs = [...project.character_refs];
    if (existingIndex >= 0) {
      updatedRefs[existingIndex] = character;
    } else {
      updatedRefs.push(character);
    }

    const updatedProject = db.updateProject(req.user!.id, req.params.id, {
      character_refs: updatedRefs,
    });

    res.json({ character, project: updatedProject });
  } catch (err: any) {
    console.error('[Projects] Error saving character:', err);
    res.status(500).json({ error: 'Failed to save character reference.' });
  }
});

// DELETE /api/projects/:id/character/:charId - Remove character reference
projectRouter.delete('/:id/character/:charId', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const project = db.getProject(req.user!.id, req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found or access denied.' });
    }

    const updatedRefs = project.character_refs.filter((c) => c.id !== req.params.charId);
    const updatedProject = db.updateProject(req.user!.id, req.params.id, {
      character_refs: updatedRefs,
    });

    res.json({ success: true, project: updatedProject });
  } catch (err: any) {
    console.error('[Projects] Error deleting character:', err);
    res.status(500).json({ error: 'Failed to delete character reference.' });
  }
});

// ==========================================
// --- Hynex Project Twin Endpoints ---
// ==========================================

// POST /api/projects/:id/decisions - Add project decision
projectRouter.post('/:id/decisions', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, description, category, status } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Decision title is required.' });
    }

    const decision = db.addProjectDecision(req.user!.id, req.params.id, {
      title,
      description,
      category,
      status,
    });

    if (!decision) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    res.status(201).json({ decision });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to add decision.' });
  }
});

// PATCH /api/projects/:id/decisions/:decisionId - Update decision status
projectRouter.patch('/:id/decisions/:decisionId', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, title, description } = req.body;
    const updated = db.updateProjectDecision(req.user!.id, req.params.id, req.params.decisionId, {
      status,
      title,
      description,
    });

    if (!updated) {
      return res.status(404).json({ error: 'Decision or project not found.' });
    }

    res.json({ decision: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update decision.' });
  }
});

// POST /api/projects/:id/versions - Create a version snapshot
projectRouter.post('/:id/versions', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { changelog } = req.body;
    const version = db.createProjectVersion(req.user!.id, req.params.id, changelog || 'Manual snapshot');
    if (!version) {
      return res.status(404).json({ error: 'Project not found.' });
    }
    res.status(201).json({ version });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create project version.' });
  }
});

// GET /api/projects/:id/versions - List project versions
projectRouter.get('/:id/versions', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const versions = db.getProjectVersions(req.user!.id, req.params.id);
    res.json({ versions });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to retrieve versions.' });
  }
});

// GET /api/projects/:id/activity - List audit activity
projectRouter.get('/:id/activity', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const activity = db.getProjectActivity(req.user!.id, req.params.id);
    res.json({ activity });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to retrieve activity.' });
  }
});

// GET /api/projects/:id/consistency - Run consistency assistant audit
projectRouter.get('/:id/consistency', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const report = db.checkProjectConsistency(req.user!.id, req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Project not found.' });
    }
    res.json({ report });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Consistency check failed.' });
  }
});

// POST /api/projects/:id/continue-step - Identify and propose next step for resuming project
projectRouter.post('/:id/continue-step', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const project = db.getProject(req.user!.id, req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    // Determine smart next step based on project state
    let nextStep = {
      action: 'review_overview',
      title: 'Review Project Overview',
      description: 'Your project is in draft mode. Define objectives or add instructions.',
      recommendedStage: 'planning',
    };

    if (!project.instructions || project.instructions.length < 10) {
      nextStep = {
        action: 'set_instructions',
        title: 'Define Project Instructions',
        description: 'Set target audience, visual style preferences, and key goals.',
        recommendedStage: 'planning',
      };
    } else if (!project.script || project.script.length < 50) {
      nextStep = {
        action: 'generate_script',
        title: 'Generate Project Script',
        description: 'Draft the narrative script or screenplay in Creator Studio.',
        recommendedStage: 'scripting',
      };
    } else if (!project.scenes || project.scenes.length === 0) {
      nextStep = {
        action: 'breakdown_scenes',
        title: 'Breakdown Script into Scenes',
        description: 'Extract scenes and visual prompts from the approved script.',
        recommendedStage: 'storyboarding',
      };
    } else {
      const incompleteScene = project.scenes.find((s) => !s.image_url || s.video_status !== 'completed');
      if (incompleteScene) {
        nextStep = {
          action: 'render_scene',
          title: `Generate Assets for Scene ${incompleteScene.scene_number}: ${incompleteScene.title}`,
          description: 'Generate storyboard keyframe image or video footage.',
          recommendedStage: 'media_generation',
        };
      } else {
        nextStep = {
          action: 'assemble_timeline',
          title: 'Assemble & Render Master Timeline',
          description: 'All scene media are ready. Concatenate into a final video reel.',
          recommendedStage: 'assembling',
        };
      }
    }

    db.logProjectActivity(project.id, req.user!.id, 'continue_project', `Resumed project step: ${nextStep.title}`);

    res.json({
      success: true,
      project,
      nextStep,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to determine next step.' });
  }
});

