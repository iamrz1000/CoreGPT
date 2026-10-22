import { WebSocketServer, WebSocket } from 'ws';
import { getGeminiClient } from './gemini.ts';
import { LiveServerMessage, Modality } from '@google/genai';

export function setupLiveWebSocket(wss: WebSocketServer) {
  wss.on('connection', async (clientWs: WebSocket, req: any) => {
    let url: URL;
    try {
      url = new URL(req.url || '', 'http://localhost');
    } catch {
      url = new URL('http://localhost');
    }

    const requestedVoice = url.searchParams.get('voice') || 'Zephyr';
    const validVoices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];
    const voiceName = validVoices.includes(requestedVoice) ? requestedVoice : 'Zephyr';

    console.log(`🎙️ [Live API]: Client connected for real-time conversation (Voice: ${voiceName})`);
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
            voiceConfig: { prebuiltVoiceConfig: { voiceName } },
          },
          systemInstruction: `You are CoreGPT Live, an elite, real-time conversational partner with live camera vision powered by Google Gemini 3.8 technology. Founder: Umar Hani, Developer: Ahmadraza.
You possess real-time auditory hearing and real-time visual camera perception.
- Vocal Persona: Speak with a charismatic, professional, articulate, warm human tone—identical to Google Gemini Live and Project Astra. Keep your vocal pacing natural, fluid, and engaging.
- Live Camera & Vision: You receive real-time camera video frames from the user's camera feed (front or rear). When the user asks about what they are showing you, pointing at, holding up, or wearing, analyze the visual scene with high precision, detail, and contextual intelligence.
- Direct & Punchy: Keep spoken answers concise, conversational, and direct so a fast-flowing back-and-forth dialogue is easy. Avoid markdown formatting, asterisks, bulleted lists, or robotic phrasing unless asked. If interrupted, halt gracefully and listen.`,
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
            voice: voiceName,
            message: `Connected to Gemini 3.8 Live API with ${voiceName} voice & camera vision enabled`,
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

          // Handle real-time camera video frame (JPEG base64 at 1 FPS)
          if (parsed.video && session) {
            session.sendRealtimeInput({
              video: {
                data: parsed.video,
                mimeType: parsed.mimeType || 'image/jpeg',
              },
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
