import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../auth.ts';
import { db } from '../db.ts';
import { getGeminiClient, generateGeminiTTS, transcribeGeminiAudio } from '../gemini.ts';

export const voiceRouter = Router();

voiceRouter.use(requireAuth);

// POST /api/voice/tts
voiceRouter.post('/tts', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const isVoiceEnabled = db.getSetting('voice_features_enabled', 'true') === 'true';
    if (!isVoiceEnabled && user.role !== 'admin') {
      return res.status(403).json({
        error: 'Voice features are currently disabled by the administrator.',
      });
    }

    const { text, voice = 'Kore', style } = req.body;
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Text is required for speech synthesis.' });
    }

    const base64Audio = await generateGeminiTTS(text, voice, style);
    return res.json({
      audioBase64: base64Audio,
      mimeType: 'audio/wav',
    });
  } catch (err: unknown) {
    console.error('TTS error:', err);
    const message = err instanceof Error ? err.message : 'Speech synthesis failed.';
    return res.status(500).json({ error: message });
  }
});

// POST /api/voice/transcribe
voiceRouter.post('/transcribe', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const isVoiceEnabled = db.getSetting('voice_features_enabled', 'true') === 'true';
    if (!isVoiceEnabled && user.role !== 'admin') {
      return res.status(403).json({
        error: 'Voice features are currently disabled by the administrator.',
      });
    }

    const { audioBase64, mimeType = 'audio/webm' } = req.body;
    if (!audioBase64 || typeof audioBase64 !== 'string') {
      return res.status(400).json({ error: 'Base64 audio data is required.' });
    }

    const transcript = await transcribeGeminiAudio(audioBase64, mimeType);
    return res.json({ transcript });
  } catch (err: unknown) {
    console.error('Transcription error:', err);
    const message = err instanceof Error ? err.message : 'Audio transcription failed.';
    return res.status(500).json({ error: message });
  }
});

// POST /api/voice/vision-query
// High-accuracy multimodal camera scene analysis with spoken voice playback
voiceRouter.post('/vision-query', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const isVoiceEnabled = db.getSetting('voice_features_enabled', 'true') === 'true';
    if (!isVoiceEnabled && user.role !== 'admin') {
      return res.status(403).json({
        error: 'Voice features are currently disabled by the administrator.',
      });
    }

    const {
      prompt = 'What do you see in front of the camera? Describe it clearly.',
      imageBase64,
      voice = 'Zephyr',
      language = 'English',
    } = req.body;

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ error: 'imageBase64 snapshot is required.' });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
    const ai = getGeminiClient();

    let visionRes: any;
    try {
      visionRes = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  data: cleanBase64,
                  mimeType: 'image/jpeg',
                },
              },
              {
                text: `You are HYNEX AI Live with Real-Time Camera Vision perception, powered by Gemini 3.8. Founder: Umar Hani, Developer: Ahmadraza.
The user is holding their camera up right now and asking: "${prompt}".
Look closely at what is captured in the camera frame. Answer directly in 1 to 3 clear, articulate, natural, spoken conversational sentences in ${language}. Never say you cannot see. Be direct, charismatic, and helpful.`,
              },
            ],
          },
        ],
      });
    } catch {
      visionRes = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  data: cleanBase64,
                  mimeType: 'image/jpeg',
                },
              },
              {
                text: `You are HYNEX AI Live with Real-Time Camera Vision perception, powered by Gemini 3.8. Founder: Umar Hani, Developer: Ahmadraza.
The user is holding their camera up right now and asking: "${prompt}".
Look closely at what is captured in the camera frame. Answer directly in 1 to 3 clear, articulate, natural, spoken conversational sentences in ${language}. Never say you cannot see. Be direct, charismatic, and helpful.`,
              },
            ],
          },
        ],
      });
    }

    const textOutput = visionRes.text?.trim() || 'I see what you are showing me in the camera.';
    let audioBase64 = '';
    try {
      audioBase64 = await generateGeminiTTS(textOutput, voice);
    } catch (ttsErr) {
      console.warn('Vision query TTS warning:', ttsErr);
    }

    return res.json({
      text: textOutput,
      audioBase64,
      mimeType: 'audio/wav',
    });
  } catch (err: unknown) {
    console.error('Vision query endpoint error:', err);
    const message = err instanceof Error ? err.message : 'Vision analysis failed.';
    return res.status(500).json({ error: message });
  }
});
