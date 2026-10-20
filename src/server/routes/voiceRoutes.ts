import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../auth.ts';
import { db } from '../db.ts';
import { generateGeminiTTS, transcribeGeminiAudio } from '../gemini.ts';

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
