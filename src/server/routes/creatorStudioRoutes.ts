import { Router, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { AuthenticatedRequest, requireAuth } from '../auth.ts';
import { db, Scene, CharacterRef } from '../db.ts';
import { getGeminiClient, generateGeminiImage } from '../gemini.ts';
import {
  generatePhotoAnimation,
  generateTextToVideoScene,
} from '../videoService.ts';

const execAsync = promisify(exec);
export const creatorStudioRouter = Router();

// In-memory active video generation jobs
interface VideoJob {
  jobId: string;
  userId: string;
  projectId?: string;
  sceneId: string;
  status: 'generating' | 'completed' | 'failed';
  videoUrl?: string;
  error?: string;
  progress: number;
  createdAt: string;
}

const activeVideoJobs = new Map<string, VideoJob>();

// 1. POST /api/creator/script/generate - Script & Scene Breakdown Generation
creatorStudioRouter.post(
  '/script/generate',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        premise,
        genre = 'Cinematic Sci-Fi',
        tone = 'Epic, dramatic',
        sceneCount = 4,
        characterRefs = [],
      } = req.body;

      if (!premise || typeof premise !== 'string' || !premise.trim()) {
        return res.status(400).json({ error: 'Premise/concept description is required.' });
      }

      const ai = getGeminiClient();

      const characterContext = Array.isArray(characterRefs) && characterRefs.length > 0
        ? `\nCharacter References to incorporate:\n` +
          characterRefs
            .map(
              (c: CharacterRef) =>
                `- ${c.name}: ${c.description} (Visual traits: ${(c.visual_traits || []).join(', ')})`
            )
            .join('\n')
        : '';

      const prompt = `You are an award-winning cinematic director and screenwriter.
Generate a structured screenplay and detailed scene breakdown for a ${sceneCount}-scene video project.

Project Premise:
"${premise.trim()}"

Genre: ${genre}
Tone: ${tone}
${characterContext}

Respond ONLY with a valid JSON object matching this exact schema (no markdown blocks, no explanatory text):
{
  "title": "A captivating, evocative title",
  "logline": "A one-sentence summary of the story arc",
  "synopsis": "A concise paragraph summarizing the narrative",
  "fullScript": "The complete screenplay formatted with scene headings, action descriptions, and character dialogues",
  "scenes": [
    {
      "scene_number": 1,
      "title": "Short descriptive scene title",
      "description": "Visual and narrative summary of what happens in this scene",
      "dialogue": "Character dialogue or voiceover lines if applicable, else empty string",
      "image_prompt": "Hyper-detailed, photorealistic visual prompt for Nano Banana 2.1 image generation. Include camera angle, 85mm lens, atmospheric volumetric lighting, rich textures, and specific character appearances",
      "video_prompt": "Cinematic camera movement and physical action prompt for Veo 3 video animation",
      "duration_seconds": 4,
      "camera_angle": "Wide cinematic tracking shot / Low angle slow pan / Close-up dramatic portrait",
      "audio_notes": "Ambient drone, distant thunder, or orchestral rise"
    }
  ]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: prompt,
        config: {
          temperature: 0.7,
          responseMimeType: 'application/json',
        },
      });

      const responseText = response.text?.trim() || '';
      let parsed: any;
      try {
        parsed = JSON.parse(responseText);
      } catch {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Failed to parse script generator response as JSON.');
        }
      }

      // Format scenes with unique IDs
      const formattedScenes: Scene[] = (parsed.scenes || []).map((s: any, idx: number) => ({
        id: `scene_${Date.now()}_${idx + 1}`,
        scene_number: s.scene_number || idx + 1,
        title: s.title || `Scene ${idx + 1}`,
        description: s.description || '',
        dialogue: s.dialogue || '',
        image_prompt: s.image_prompt || `${genre} scene: ${s.title}`,
        image_url: undefined,
        video_prompt: s.video_prompt || s.description || '',
        video_url: undefined,
        video_status: 'idle',
        duration_seconds: s.duration_seconds || 4,
        camera_angle: s.camera_angle || 'Cinematic wide shot',
        audio_notes: s.audio_notes || 'Ambient score',
      }));

      res.json({
        title: parsed.title || 'Untitled Project',
        logline: parsed.logline || '',
        synopsis: parsed.synopsis || '',
        fullScript: parsed.fullScript || '',
        scenes: formattedScenes,
      });
    } catch (err: any) {
      console.error('[CreatorStudio] Script generation error:', err);
      res.status(500).json({
        error: err.message || 'Script generation failed. Please try again.',
      });
    }
  }
);

// 2. POST /api/creator/scene/generate-image - Scene Keyframe Generation
creatorStudioRouter.post(
  '/scene/generate-image',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        prompt,
        aspectRatio = '16:9',
        model = 'nano-banana',
        upscale = true,
        imageSize = '2K',
        characterRefs = [],
      } = req.body;

      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ error: 'Image prompt is required.' });
      }

      // Character consistency enrichment
      let enrichedPrompt = prompt;
      if (Array.isArray(characterRefs) && characterRefs.length > 0) {
        const traits = characterRefs
          .map((c: CharacterRef) => `${c.name} (${c.description})`)
          .join(', ');
        enrichedPrompt = `${prompt}. Character design consistency: featuring ${traits}.`;
      }

      const result = await generateGeminiImage(enrichedPrompt, aspectRatio, {
        autoEnhance: true,
        model,
        upscale,
        imageSize,
      });

      // Save into DB image history
      db.saveGeneratedImage(
        req.user!.id,
        enrichedPrompt,
        aspectRatio,
        result.imageUrl,
        result.model
      );

      res.json({
        imageUrl: result.imageUrl,
        finalPrompt: result.finalPrompt,
        model: result.model,
      });
    } catch (err: any) {
      console.error('[CreatorStudio] Scene image generation error:', err);
      res.status(500).json({
        error: err.message || 'Image generation failed.',
      });
    }
  }
);

// 3. POST /api/creator/scene/generate-video - Scene Video Generation
creatorStudioRouter.post(
  '/scene/generate-video',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        sceneId,
        projectId,
        prompt,
        imageSource,
        aspectRatio = '16:9',
      } = req.body;

      if (!sceneId) {
        return res.status(400).json({ error: 'sceneId is required.' });
      }

      const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const job: VideoJob = {
        jobId,
        userId: req.user!.id,
        projectId,
        sceneId,
        status: 'generating',
        progress: 10,
        createdAt: new Date().toISOString(),
      };
      activeVideoJobs.set(jobId, job);

      // Launch asynchronous background rendering pipeline
      (async () => {
        try {
          let outputFilePath: string;
          const cleanAr = aspectRatio === '9:16' ? '9:16' : '16:9';

          if (imageSource && typeof imageSource === 'string' && imageSource.length > 50) {
            // Image-to-video photo animation
            job.progress = 30;
            outputFilePath = await generatePhotoAnimation(imageSource, cleanAr, jobId);
          } else {
            // Text-to-video scene synthesis
            job.progress = 30;
            outputFilePath = await generateTextToVideoScene(prompt || 'Cinematic scene', cleanAr, jobId);
          }

          job.progress = 100;
          job.status = 'completed';
          job.videoUrl = `/api/video/stream/${jobId}`;

          // If project exists, auto-update the scene's video fields
          if (projectId) {
            const project = db.getProject(job.userId, projectId);
            if (project) {
              const updatedScenes = project.scenes.map((s) => {
                if (s.id === sceneId) {
                  return {
                    ...s,
                    video_url: job.videoUrl,
                    video_status: 'completed' as const,
                    video_job_id: jobId,
                  };
                }
                return s;
              });
              db.updateProject(job.userId, projectId, { scenes: updatedScenes });
            }
          }
        } catch (err: any) {
          console.error(`[CreatorStudio] Background video job ${jobId} failed:`, err);
          job.status = 'failed';
          job.error = err.message || 'Video generation failed.';
        }
      })();

      res.json({
        jobId,
        status: 'generating',
        message: 'Video generation job started in background.',
      });
    } catch (err: any) {
      console.error('[CreatorStudio] Video dispatch error:', err);
      res.status(500).json({
        error: err.message || 'Failed to dispatch video generation job.',
      });
    }
  }
);

// 4. GET /api/creator/scene/video-status/:jobId - Track Video Job Status
creatorStudioRouter.get(
  '/scene/video-status/:jobId',
  requireAuth,
  (req: AuthenticatedRequest, res: Response) => {
    const job = activeVideoJobs.get(req.params.jobId);
    if (!job) {
      // Check if file exists on disk
      const rendersPath = path.resolve(process.cwd(), `public/videos/renders/${req.params.jobId}.mp4`);
      if (fs.existsSync(rendersPath)) {
        return res.json({
          jobId: req.params.jobId,
          status: 'completed',
          progress: 100,
          videoUrl: `/api/video/stream/${req.params.jobId}`,
        });
      }
      return res.status(404).json({ error: 'Video job not found.' });
    }

    if (job.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied to this job.' });
    }

    res.json(job);
  }
);

// 5. POST /api/creator/subtitles/export - Subtitle & Script Exports (.srt, .vtt, .txt, .json)
creatorStudioRouter.post(
  '/subtitles/export',
  requireAuth,
  (req: AuthenticatedRequest, res: Response) => {
    const { scenes, title = 'Screenplay' } = req.body;
    if (!Array.isArray(scenes)) {
      return res.status(400).json({ error: 'scenes array is required.' });
    }

    let currentSeconds = 0;
    const srtBlocks: string[] = [];
    const vttBlocks: string[] = ['WEBVTT\n'];
    const txtBlocks: string[] = [`=== ${title.toUpperCase()} ===\n`];

    scenes.forEach((scene: Scene, idx: number) => {
      const dur = scene.duration_seconds || 4;
      const startSec = currentSeconds;
      const endSec = currentSeconds + dur;
      currentSeconds = endSec;

      const formatTime = (totalSec: number, delimiter: string) => {
        const hrs = Math.floor(totalSec / 3600);
        const mins = Math.floor((totalSec % 3600) / 60);
        const secs = Math.floor(totalSec % 60);
        const ms = 0;
        return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}${delimiter}${String(ms).padStart(3, '0')}`;
      };

      const dialogue = scene.dialogue?.trim() || `[Scene ${idx + 1}: ${scene.title}]`;

      // SRT block
      srtBlocks.push(
        `${idx + 1}\n${formatTime(startSec, ',')} --> ${formatTime(endSec, ',')}\n${dialogue}\n`
      );

      // VTT block
      vttBlocks.push(
        `${formatTime(startSec, '.')} --> ${formatTime(endSec, '.')}\n${dialogue}\n`
      );

      // TXT block
      txtBlocks.push(
        `SCENE ${idx + 1}: ${scene.title}\nDescription: ${scene.description}\nCamera: ${scene.camera_angle || 'Standard'}\nDialogue: ${scene.dialogue || '(No dialogue)'}\nTiming: ${startSec}s - ${endSec}s (${dur}s)\n`
      );
    });

    res.json({
      srt: srtBlocks.join('\n'),
      vtt: vttBlocks.join('\n'),
      txt: txtBlocks.join('\n'),
      json: JSON.stringify(scenes, null, 2),
    });
  }
);

// 6. POST /api/creator/render-timeline - Final Timeline Assembly & Video Stitching
creatorStudioRouter.post(
  '/render-timeline',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { projectId, scenes } = req.body;
      if (!Array.isArray(scenes) || scenes.length === 0) {
        return res.status(400).json({ error: 'At least one scene is required to assemble timeline.' });
      }

      const timelineId = `timeline_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const rendersDir = path.resolve(process.cwd(), 'public/videos/renders');
      const concatListPath = `/tmp/concat_${timelineId}.txt`;
      const outputTimelinePath = path.join(rendersDir, `${timelineId}.mp4`);

      // Ensure renders directory exists
      if (!fs.existsSync(rendersDir)) {
        fs.mkdirSync(rendersDir, { recursive: true });
      }

      // Collect available video clips or generate fast clips for scenes with only images
      const clipPaths: string[] = [];
      const defaultFallback = path.resolve(process.cwd(), 'public/videos/kenburns_test.mp4');

      for (let i = 0; i < scenes.length; i++) {
        const sc = scenes[i];
        let clipPath = '';

        if (sc.video_job_id) {
          const directFile = path.join(rendersDir, `${sc.video_job_id}.mp4`);
          if (fs.existsSync(directFile)) {
            clipPath = directFile;
          }
        }

        if (!clipPath && sc.image_url) {
          // Generate quick clip from image
          const tempClipId = `clip_${timelineId}_${i}`;
          try {
            clipPath = await generatePhotoAnimation(sc.image_url, '16:9', tempClipId);
          } catch {
            clipPath = defaultFallback;
          }
        }

        if (!clipPath && fs.existsSync(defaultFallback)) {
          clipPath = defaultFallback;
        }

        if (clipPath) {
          clipPaths.push(clipPath);
        }
      }

      if (clipPaths.length === 0) {
        return res.status(400).json({ error: 'No video or image assets found across scenes to assemble.' });
      }

      // Write FFmpeg concat demuxer file
      const concatContent = clipPaths.map((p) => `file '${p}'`).join('\n');
      await fs.promises.writeFile(concatListPath, concatContent);

      // Stitch videos using FFmpeg
      const cmd = `ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "${outputTimelinePath}"`;
      await execAsync(cmd, { timeout: 35000 });
      fs.unlink(concatListPath, () => {});

      const timelineUrl = `/api/video/stream/${timelineId}`;

      // If projectId supplied, persist timeline reference
      if (projectId) {
        db.updateProject(req.user!.id, projectId, {
          status: 'completed',
        });
      }

      res.json({
        timelineUrl,
        timelineId,
        clipCount: clipPaths.length,
        message: 'Complete timeline assembled and rendered successfully!',
      });
    } catch (err: any) {
      console.error('[CreatorStudio] Timeline assembly error:', err);
      res.status(500).json({
        error: err.message || 'Failed to assemble video timeline.',
      });
    }
  }
);
