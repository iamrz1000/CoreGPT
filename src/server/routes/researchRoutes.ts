import { Router, Response } from 'express';
import { AuthenticatedRequest, verifyToken } from '../auth.ts';
import { db } from '../db.ts';
import { getGeminiClient } from '../gemini.ts';
import { ResearchReport, ResearchSource } from '../../types/index.ts';

export const researchRouter = Router();

function getEffectiveUserId(req: AuthenticatedRequest): string {
  const token =
    req.cookies?.nextgen_session ||
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null);

  if (token) {
    const payload = verifyToken(token);
    if (payload?.userId) {
      return payload.userId;
    }
  }
  return req.user?.id || 'guest_user';
}

// GET /api/research/reports - list saved research reports
researchRouter.get('/reports', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getEffectiveUserId(req);
    const reports = db.listResearchReports(userId);
    return res.json({ reports });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to list research reports';
    return res.status(500).json({ error: message });
  }
});

// POST /api/research/query - perform grounded web research
researchRouter.post('/query', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getEffectiveUserId(req);
    const { query, deepResearch = false } = req.body;

    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: 'Research query is required.' });
    }

    const ai = getGeminiClient();

    const researchPrompt = `You are Hynex AI Senior Research Intelligence.
Conduct a rigorous, objective, and deeply comprehensive research investigation on the following query:
"${query.trim()}"

Guidelines:
1. Search the web for authoritative, verified sources.
2. Synthesize key discoveries, chronological breakthroughs, and empirical facts.
3. Compare conflicting viewpoints or claims if debates exist.
4. Provide structured, executive-ready sections with clear markdown headings, key bullet takeaways, and citations.
5. Highlight any areas where evidence is still emerging or uncertain.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [
        {
          role: 'user',
          parts: [{ text: researchPrompt }],
        },
      ],
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const reportMarkdown = response.text || 'No research findings returned.';

    // Extract real grounding sources from Gemini grounding metadata
    const sources: ResearchSource[] = [];
    const groundingChunks = (response.candidates?.[0] as any)?.groundingMetadata?.groundingChunks || [];

    for (const chunk of groundingChunks) {
      if (chunk.web?.uri) {
        sources.push({
          title: chunk.web.title || new URL(chunk.web.uri).hostname,
          url: chunk.web.uri,
          snippet: chunk.web.title || '',
        });
      }
    }

    // Filter unique sources by URL
    const uniqueSources = sources.filter(
      (src, idx, self) => idx === self.findIndex((s) => s.url === src.url)
    );

    // Extract 3-5 executive findings
    const findings: string[] = [];
    const lines = reportMarkdown.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if ((trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\.\s/.test(trimmed)) && trimmed.length > 20) {
        findings.push(trimmed.replace(/^[-*]\s+|\d+\.\s+/, ''));
        if (findings.length >= 5) break;
      }
    }

    const reportTitle = `Deep Research: ${query.length > 50 ? query.slice(0, 47) + '...' : query}`;
    const reportSummary = findings.length > 0 ? findings.slice(0, 2).join(' ') : reportMarkdown.slice(0, 240) + '...';

    const newReport: ResearchReport = {
      id: crypto.randomUUID(),
      user_id: userId,
      query: query.trim(),
      title: reportTitle,
      summary: reportSummary,
      sources: uniqueSources,
      findings: findings.length > 0 ? findings : ['Research completed with live grounded web analysis.'],
      markdown_report: reportMarkdown,
      created_at: new Date().toISOString(),
    };

    // Auto-save report to user database
    db.saveResearchReport(newReport);

    return res.json({ report: newReport });
  } catch (err: unknown) {
    console.error('Research query error:', err);
    const message = err instanceof Error ? err.message : 'Research inquiry failed';
    return res.status(500).json({ error: message });
  }
});

// DELETE /api/research/reports/:id - delete research report
researchRouter.delete('/reports/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getEffectiveUserId(req);
    const success = db.deleteResearchReport(req.params.id, userId);
    if (!success) {
      return res.status(404).json({ error: 'Report not found or unauthorized' });
    }
    return res.json({ success: true, message: 'Report deleted' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete report';
    return res.status(500).json({ error: message });
  }
});
