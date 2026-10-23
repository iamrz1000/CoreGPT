import { WebSocketServer, WebSocket } from 'ws';
import { getGeminiClient, generateGeminiTTS } from './gemini.ts';
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
    let isSessionReady = false;
    const pendingInputs: any[] = [];

    const flushPending = () => {
      if (!session || !isSessionReady) return;
      while (pendingInputs.length > 0) {
        const item = pendingInputs.shift();
        try {
          session.sendRealtimeInput(item);
        } catch (e) {
          console.warn('[Live API] Error flushing pending item:', e);
        }
      }
    };

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
          systemInstruction: `You are CoreGPT Live with Real-Time Camera Vision and Voice Perception, powered by Google Gemini 3.8 technology. Founder: Umar Hani, Developer: Ahmadraza.
You possess real-time hearing and continuous visual camera perception.
- Vocal Persona: Speak with a charismatic, warm, natural, human conversational tone—identical to Google Gemini Live and Project Astra. Keep pacing fluid, engaging, and articulate.
- Camera Vision: You receive real-time camera video frames from the user's camera feed (front or rear). When the user asks about what they are showing you, pointing at, holding up, or scanning, analyze the visual scene with high precision, detail, and contextual intelligence.
- Direct & Punchy: Keep spoken answers concise, conversational, and direct so a fast-flowing back-and-forth dialogue is easy. Avoid markdown formatting, asterisks, bulleted lists, or robotic phrasing. If interrupted, halt gracefully and listen.`,
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            if (!isConnected || clientWs.readyState !== WebSocket.OPEN) return;

            if (message.setupComplete) {
              isSessionReady = true;
              flushPending();
            }

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

      isSessionReady = true;
      flushPending();

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

      clientWs.on('message', async (data: any) => {
        try {
          const parsed = JSON.parse(data.toString());

          // Handle direct visual scene question: { type: 'vision_query', prompt, image }
          if (parsed.type === 'vision_query') {
            const prompt = parsed.prompt || 'What do you see in front of the camera right now? Please describe clearly.';
            const image = parsed.image;

            if (session && isSessionReady && image) {
              try {
                session.sendRealtimeInput({
                  video: { data: image, mimeType: 'image/jpeg' },
                });
                session.sendRealtimeInput({
                  text: prompt,
                });
                return;
              } catch (e) {
                console.warn('[Live API] session send failed, using fallback synthesis:', e);
              }
            }

            // Fallback direct vision generation via Gemini 3.8 Flash
            (async () => {
              try {
                const parts: any[] = [];
                if (image) {
                  parts.push({
                    inlineData: {
                      data: image,
                      mimeType: 'image/jpeg',
                    },
                  });
                }
                parts.push({ text: prompt });

                const res = await ai.models.generateContent({
                  model: 'gemini-3.8-flash',
                  contents: parts,
                  config: {
                    systemInstruction:
                      'You are CoreGPT Live with Camera Vision. Answer conversationally in natural spoken English/selected language about what you see in the image.',
                  },
                });

                const textOutput = res.text || 'I can see the camera frame clearly.';
                if (clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(JSON.stringify({ type: 'text', text: textOutput }));
                }

                // Synthesize audio with selected voice
                const audioWav = await generateGeminiTTS(textOutput, voiceName);
                if (clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(JSON.stringify({ type: 'audio_wav', audio: audioWav, text: textOutput }));
                }
              } catch (err) {
                console.error('[Live API] Vision query fallback error:', err);
              }
            })();
            return;
          }

          // Handle real-time audio chunk (PCM 16kHz)
          if (parsed.audio) {
            const payload = { audio: { data: parsed.audio, mimeType: 'audio/pcm;rate=16000' } };
            if (session && isSessionReady) {
              session.sendRealtimeInput(payload);
            } else {
              pendingInputs.push(payload);
            }
          }

          // Handle real-time camera video frame (JPEG base64 at 1 FPS)
          if (parsed.video) {
            const payload = {
              video: {
                data: parsed.video,
                mimeType: parsed.mimeType || 'image/jpeg',
              },
            };
            if (session && isSessionReady) {
              session.sendRealtimeInput(payload);
            } else {
              // Keep only the latest video frame in queue
              const nonVideo = pendingInputs.filter((p) => !p.video);
              nonVideo.push(payload);
              pendingInputs.length = 0;
              pendingInputs.push(...nonVideo);
            }
          }

          // Handle real-time text input
          if (parsed.text) {
            const payload = { text: parsed.text };
            if (session && isSessionReady) {
              session.sendRealtimeInput(payload);
            } else {
              pendingInputs.push(payload);
            }
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
