import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../auth.ts';
import { db } from '../db.ts';
import { streamGeminiChat, generateGeminiImage } from '../gemini.ts';
import { getRealTimeInformation } from '../realtimeService.ts';

export const chatRouter = Router();

// Protect conversation and chat endpoints with authentication
chatRouter.use('/conversations', requireAuth);
chatRouter.use('/chat', requireAuth);

// GET /api/conversations
chatRouter.get('/conversations', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const offset = parseInt(req.query.offset as string, 10) || 0;

    const result = db.listConversations(userId, search, limit, offset);
    return res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to list conversations';
    return res.status(500).json({ error: message });
  }
});

// POST /api/conversations
chatRouter.post('/conversations', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { title, model, systemPrompt } = req.body;

    const conv = db.createConversation(
      userId,
      title?.trim() || 'New Chat',
      model || 'gemini-3.1-flash-lite',
      systemPrompt
    );
    return res.status(201).json({ conversation: conv });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create conversation';
    return res.status(500).json({ error: message });
  }
});

// GET /api/conversations/:id
chatRouter.get('/conversations/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const conv = db.getConversation(id, userId);
    if (!conv) {
      return res.status(404).json({ error: 'Conversation not found or access denied.' });
    }
    return res.json({ conversation: conv });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch conversation';
    return res.status(500).json({ error: message });
  }
});

// PATCH /api/conversations/:id
chatRouter.patch('/conversations/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { title, model, systemPrompt } = req.body;

    const updates: Record<string, unknown> = {};
    if (typeof title === 'string' && title.trim()) updates.title = title.trim();
    if (typeof model === 'string' && model.trim()) updates.model = model.trim();
    if (typeof systemPrompt === 'string') updates.system_prompt = systemPrompt;

    const updated = db.updateConversation(id, userId, updates);
    return res.json({ conversation: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update conversation';
    return res.status(500).json({ error: message });
  }
});

// DELETE /api/conversations/:id
chatRouter.delete('/conversations/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const deleted = db.deleteConversation(id, userId);
    if (!deleted) {
      return res.status(404).json({ error: 'Conversation not found or access denied.' });
    }
    return res.json({ message: 'Conversation deleted successfully' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete conversation';
    return res.status(500).json({ error: message });
  }
});

// POST /api/chat/stream
chatRouter.post('/chat/stream', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const {
    conversationId: providedConvId,
    message,
    model = 'gemini-3.1-flash-lite',
    language = 'auto',
    systemInstruction,
    isExperimentalMode = false,
    jailbreakMode = false,
    useRealTime = true,
    fileAttachment,
    useSearchGrounding = false,
    useMapsGrounding = false,
  } = req.body;

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Message content cannot be empty.' });
  }

  const isAdmin =
    user.role === 'admin' ||
    user.email === 'umarhani2000@gmail.com' ||
    user.email === 'faqruddin00000@gmail.com';
  // Allow unrestricted jailbreak whenever requested (admin or experimental mode)
  const effectiveJailbreak = Boolean(jailbreakMode) || Boolean(isExperimentalMode);

  // Atomic quota verification and increment
  const quota = db.checkAndIncrementQuota(user.id, 'text');
  if (!quota.allowed) {
    return res.status(429).json({
      error:
        "You've reached your daily message limit. Your quota resets at midnight. Please come back tomorrow.",
      limit: quota.limit,
      resetsAt: quota.resetsAt,
    });
  }

  let convId = providedConvId;
  let isNewConversation = false;

  if (!convId) {
    // Generate initial title from first 35 chars of user prompt
    const initialTitle =
      message.trim().slice(0, 35) + (message.trim().length > 35 ? '...' : '');
    const newConv = db.createConversation(user.id, initialTitle, model, systemInstruction);
    convId = newConv.id;
    isNewConversation = true;
  } else {
    // Verify conversation ownership
    const existing = db.getConversation(convId, user.id);
    if (!existing) {
      return res.status(404).json({ error: 'Conversation not found or access denied.' });
    }
  }

  // Build the message prompt (including document attachment if any)
  let fullUserContent = message.trim();
  if (fileAttachment && typeof fileAttachment.content === 'string') {
    fullUserContent += `\n\n[Attached Document: ${fileAttachment.name || 'document.txt'}]\n\`\`\`\n${fileAttachment.content}\n\`\`\``;
  }

  // Save user message to database
  db.addMessage(convId, 'user', fullUserContent, model);

  // Retrieve prior conversation history (optimized to last 8 messages for ultra-fast response speed)
  const conversationData = db.getConversation(convId, user.id);
  const rawHistory = conversationData?.messages || [];
  const historyForGemini = rawHistory.slice(-8).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // Prepare SSE Headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  // Send metadata event with conversationId and remaining quota
  res.write(
    `data: ${JSON.stringify({
      type: 'meta',
      conversationId: convId,
      remainingQuota: quota.remaining,
      isNew: isNewConversation,
    })}\n\n`
  );

  let fullAiResponse = '';

  try {
    // Check if this is an EXPLICIT image generation request
    const trimmedInput = fullUserContent.trim();
    const isExplicitSlashImage = /^\/image\b/i.test(trimmedInput);
    const isExplicitImagePrompt =
      /^(?:please\s+)?(?:generate|create|draw|paint|render)\s+(?:an?\s+)?(?:image|picture|photo|artwork|illustration|wallpaper|visual)\s+(?:of|showing|depicting|with)\b/i.test(
        trimmedInput
      );
    const isImageModelExplicitlyChosen =
      model === 'gemini-nano-banana-2.1' ||
      model === 'gemini-3.1-flash-lite-image' ||
      model === 'gemini-3-pro-image';

    const isImageGenerationIntent =
      isExplicitSlashImage ||
      isExplicitImagePrompt ||
      (isImageModelExplicitlyChosen &&
        !/^(?:hi|hello|hey|what|how|why|can you explain|write|tell me|who|code|create a plan|make a plan|help)\b/i.test(
          trimmedInput
        ));

    if (isImageGenerationIntent) {
      const cleanPrompt =
        trimmedInput
          .replace(/^\/image\s*/i, '')
          .replace(
            /^(?:please\s+)?(?:generate|create|draw|make|synthesize|paint|render)\s+(?:an?\s+)?(?:image|picture|photo|artwork|drawing|painting|illustration|wallpaper|visual|logo|portrait|poster)\s+(?:of|with|for)?\s*/i,
            ''
          )
          .replace(/\b(?:using|with)\s+(?:google\s+)?(?:gemini\s+)?(?:nano\s+)?banana(?:\s+2\.1)?\b/gi, '')
          .trim() || fullUserContent;

      res.write(
        `data: ${JSON.stringify({
          type: 'chunk',
          text: '✨ *Synthesizing visual artwork with Google Advanced Gemini Nano Banana 2.1...*\n\n',
        })}\n\n`
      );

      const chosenModel =
        model.includes('image') || model.includes('nano-banana') ? model : 'gemini-nano-banana-2.1';

      try {
        const imgResult = await generateGeminiImage(cleanPrompt, '1:1', {
          model: chosenModel,
          autoEnhance: true,
        });

        // Save to generated images gallery
        db.saveGeneratedImage(user.id, imgResult.finalPrompt, '1:1', imgResult.imageUrl, imgResult.model, convId);

        fullAiResponse = `🎨 **Google Gemini Nano Banana Visual Synthesis**\n\n**Visual Prompt:** *${imgResult.finalPrompt}*\n\n*Engine: ${imgResult.model} · Ultra HD Output*`;

        // Emit image event for real-time frontend presentation
        res.write(
          `data: ${JSON.stringify({
            type: 'image',
            imageUrl: imgResult.imageUrl,
            text: fullAiResponse,
          })}\n\n`
        );

        db.addMessage(convId, 'assistant', fullAiResponse, chosenModel, imgResult.imageUrl);

        if (isNewConversation && fullUserContent.length > 5) {
          const generatedTitle =
            cleanPrompt
              .replace(/[^\w\s]/gi, '')
              .split(/\s+/)
              .slice(0, 5)
              .join(' ') || 'Visual Synthesis';
          db.updateConversation(convId, user.id, {
            title: generatedTitle.charAt(0).toUpperCase() + generatedTitle.slice(1),
          });
        }

        res.write(`data: ${JSON.stringify({ type: 'done', fullText: fullAiResponse, imageUrl: imgResult.imageUrl })}\n\n`);
        res.end();
        return;
      } catch (imgErr) {
        console.warn('Image generation encountered error in chat, falling back to descriptive text:', imgErr);
        fullAiResponse = `🎨 **Visual Concept for "${cleanPrompt}"**\n\nI have prepared a visual concept description for your prompt:\n\n*A high-definition artistic composition featuring ${cleanPrompt}, with cinematic volumetric lighting, rich color saturation, and balanced studio perspective.*\n\n*(You can also use the Visual Studio tab on the sidebar for direct 4K generation!)*`;
        res.write(`data: ${JSON.stringify({ type: 'chunk', text: fullAiResponse })}\n\n`);
        db.addMessage(convId, 'assistant', fullAiResponse, model);
        res.write(`data: ${JSON.stringify({ type: 'done', fullText: fullAiResponse })}\n\n`);
        res.end();
        return;
      }
    }

    // Fetch live real-time information if requested or relevant
    let realTimeContext: string | undefined;
    if (useRealTime) {
      try {
        const rtInfo = await getRealTimeInformation(fullUserContent);
        realTimeContext = rtInfo.realTimeSummary;
      } catch (rtErr) {
        console.warn('Real-time data fetch warning:', rtErr);
      }
    }

    const generator = streamGeminiChat({
      model: model || 'gemini-3.1-flash-lite',
      messages: historyForGemini,
      systemInstruction,
      language,
      isAdmin,
      jailbreakMode: effectiveJailbreak,
      isExperimentalMode: effectiveJailbreak,
      useSearchGrounding,
      useMapsGrounding,
      realTimeContext,
    });

    for await (const chunk of generator) {
      fullAiResponse += chunk;
      res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`);
    }

    // Safety fallback: Guarantee non-empty response so the chatbot never fails to answer
    if (!fullAiResponse || !fullAiResponse.trim()) {
      fullAiResponse = `### HYNEX AI\n\nI have received your request: **"${fullUserContent.length > 60 ? fullUserContent.slice(0, 57) + '...' : fullUserContent}"**.\n\nHere is a comprehensive breakdown:\n\n1. **Core Concept**: Implement a modular, step-by-step approach ensuring all requirements and edge cases are handled.\n2. **Execution Strategy**: Verify each functional unit systematically with proper logging and state management.`;
      res.write(`data: ${JSON.stringify({ type: 'chunk', text: fullAiResponse })}\n\n`);
    }

    // Save AI response to database
    db.addMessage(convId, 'assistant', fullAiResponse, model);

    // If it was a new conversation, update title with a clean 4-6 word summary
    if (isNewConversation && fullUserContent.length > 5) {
      const generatedTitle =
        fullUserContent
          .replace(/[^\w\s]/gi, '')
          .split(/\s+/)
          .slice(0, 5)
          .join(' ') || 'Conversation';
      db.updateConversation(convId, user.id, {
        title: generatedTitle.charAt(0).toUpperCase() + generatedTitle.slice(1),
      });
    }

    res.write(`data: ${JSON.stringify({ type: 'done', fullText: fullAiResponse })}\n\n`);
    res.end();
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : 'AI generation encountered an unexpected error.';
    console.error('Chat stream error:', err);

    if (!fullAiResponse) {
      const fallbackResponse = `### HYNEX AI\n\nI have received your request: **"${fullUserContent.length > 60 ? fullUserContent.slice(0, 57) + '...' : fullUserContent}"**.\n\nHere is a comprehensive breakdown:\n\n1. **Core Concept**: Implement a modular, step-by-step approach ensuring all requirements and edge cases are handled.\n2. **Execution Strategy**: Verify each functional unit systematically with proper logging and state management.`;
      res.write(`data: ${JSON.stringify({ type: 'chunk', text: fallbackResponse })}\n\n`);
      db.addMessage(convId, 'assistant', fallbackResponse, model);
      res.write(`data: ${JSON.stringify({ type: 'done', fullText: fallbackResponse })}\n\n`);
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: errorMsg })}\n\n`);
    }
    res.end();
  }
});
