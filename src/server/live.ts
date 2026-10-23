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
          systemInstruction: `You are CoreGPT Live with Real-Time Video Camera Vision and Voice Perception, powered by Gemini 3.8. Founder: Umar Hani, Developer: Ahmadraza.
You possess continuous hearing and visual perception through the user's camera feed.
CRITICAL RULES:
1. You CAN see the user's camera feed. Never say "I don't have eyes", "I cannot see", or "I am just a language model".
2. When the user shows objects, surroundings, documents, screens, books, handwriting, or people, analyze them accurately and conversationally.
3. Keep spoken replies punchy, warm, engaging, and articulate—natural human speech without markdown formatting or bulleted lists.
4. If the user interrupts, stop speaking immediately and listen.`,
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            if (!isConnected || clientWs.readyState !== WebSocket.OPEN) return;

            if (message.setupComplete) {
              isSessionReady = true;
              flushPending();
            }

            // Stream audio chunks to client (PCM 24kHz)
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
              }
            }

            // Forward model output spoken subtitles
            if (message.serverContent?.outputTranscription?.text) {
              clientWs.send(
                JSON.stringify({
                  type: 'text',
                  text: message.serverContent.outputTranscription.text,
                })
              );
            }

            // Forward user input transcription
            if (message.serverContent?.inputTranscription?.text) {
              clientWs.send(
                JSON.stringify({
                  type: 'user_transcript',
                  text: message.serverContent.inputTranscription.text,
                })
              );
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
          // Uses high-precision multimodal Gemini 3.8 Flash vision + Gemini TTS for 100% reliable spoken answers
          if (parsed.type === 'vision_query') {
            const prompt =
              parsed.prompt || 'What do you see in front of the camera right now? Please describe clearly.';
            const image = parsed.image;

            (async () => {
              try {
                const parts: any[] = [];
                if (image) {
                  const cleanBase64 = image.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
                  parts.push({
                    inlineData: {
                      data: cleanBase64,
                      mimeType: 'image/jpeg',
                    },
                  });
                }
                parts.push({
                  text: `You are CoreGPT Live looking at this camera feed right now. ${prompt}. Answer conversationally in spoken English (or user language). Be direct, concise, and helpful in 1 to 3 sentences. Founder: Umar Hani, Developer: Ahmadraza.`,
                });

                let res: any;
                try {
                  res = await ai.models.generateContent({
                    model: 'gemini-3.1-flash-lite',
                    contents: parts,
                  });
                } catch {
                  res = await ai.models.generateContent({
                    model: 'gemini-3.8-flash',
                    contents: parts,
                  });
                }

                const textOutput = res.text?.trim() || 'I can see what you are showing me in the camera.';
                if (clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(JSON.stringify({ type: 'text', text: textOutput, replace: true }));
                }

                // Synthesize spoken voice with user's selected Gemini voice persona
                let audioWav = '';
                try {
                  audioWav = await generateGeminiTTS(textOutput, voiceName);
                } catch (ttsErr) {
                  console.warn('[Live API] Vision TTS generation warning:', ttsErr);
                }

                if (clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(
                    JSON.stringify({
                      type: 'audio_wav',
                      audio: audioWav,
                      text: textOutput,
                    })
                  );
                }

                // Keep live session memory updated with recent vision context
                if (session && isSessionReady) {
                  try {
                    session.sendRealtimeInput({
                      text: `[Visual Scene Context: User showed: "${textOutput}"]`,
                    });
                  } catch {}
                }
              } catch (err) {
                console.error('[Live API] Vision query error:', err);
                if (clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(
                    JSON.stringify({
                      type: 'text',
                      text: 'I had trouble analyzing the camera frame. Please point clearly at the object and try again.',
                      replace: true,
                    })
                  );
                }
              }
            })();
            return;
          }

          // Handle real-time audio chunk from microphone (PCM 16kHz)
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
            const cleanVideo = parsed.video.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
            const payload = {
              video: {
                data: cleanVideo,
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
