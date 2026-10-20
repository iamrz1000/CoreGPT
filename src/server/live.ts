import { WebSocketServer, WebSocket } from 'ws';
import { getGeminiClient } from './gemini.ts';
import { LiveServerMessage, Modality } from '@google/genai';

export function setupLiveWebSocket(wss: WebSocketServer) {
  wss.on('connection', async (clientWs: WebSocket) => {
    console.log('🎙️ [Live API]: Client connected for real-time conversation');
    let session: any = null;
    let isConnected = true;

    clientWs.on('close', () => {
      isConnected = false;
      console.log('🎙️ [Live API]: Client disconnected');
      if (session) {
        try {
          session.close?.();
        } catch {}
      }
    });

    try {
      const ai = getGeminiClient();
      session = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction:
            'You are CoreGPT Live Voice, a real-time conversational voice partner founded by Umar Hani and developed by Ahmadraza. You have a natural, articulate, engaging speaking voice. Answer the user conversationally in concise, helpful spoken sentences.',
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            if (!isConnected || clientWs.readyState !== WebSocket.OPEN) return;

            const parts = message.serverContent?.modelTurn?.parts;
            if (parts) {
              for (const part of parts) {
                if (part.inlineData?.data) {
                  clientWs.send(
                    JSON.stringify({
                      type: 'audio',
                      audio: part.inlineData.data,
                    })
                  );
                }
                if (part.text) {
                  clientWs.send(
                    JSON.stringify({
                      type: 'text',
                      text: part.text,
                    })
                  );
                }
              }
            }

            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ type: 'interrupted' }));
            }
          },
        },
      });

      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(
          JSON.stringify({
            type: 'ready',
            model: 'gemini-3.8-live',
            message: 'Connected to Gemini 3.8 Live API session',
          })
        );
      }

      clientWs.on('message', (data: any) => {
        try {
          const parsed = JSON.parse(data.toString());

          // Handle real-time audio chunk (PCM 16kHz)
          if (parsed.audio && session) {
            session.sendRealtimeInput({
              audio: { data: parsed.audio, mimeType: 'audio/pcm;rate=16000' },
            });
          }

          // Handle real-time text input
          if (parsed.text && session) {
            session.sendRealtimeInput({
              text: parsed.text,
            });
          }
        } catch (e) {
          console.warn('[Live API] Error handling incoming client chunk:', e);
        }
      });
    } catch (err: unknown) {
      console.warn('[Live API] Connection initialization warning:', err);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(
          JSON.stringify({
            type: 'fallback',
            model: 'gemini-3.8-flash',
            message: 'Live API connection ready in voice fallback mode.',
          })
        );
      }
    }
  });
}
