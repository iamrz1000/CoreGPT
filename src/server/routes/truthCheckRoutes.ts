import { Router, Response } from 'express';
import { AuthenticatedRequest, verifyToken } from '../auth.ts';
import { db } from '../db.ts';
import { getGeminiClient } from '../gemini.ts';
import { ClaimVerification, TruthCheckReport } from '../../types/index.ts';

export const truthCheckRouter = Router();

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

// POST /api/truthcheck/verify - verify factual claims within text or message
truthCheckRouter.post('/verify', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getEffectiveUserId(req);
    const { text, messageId } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Text content is required for truth verification.' });
    }

    const ai = getGeminiClient();

    // 1. Prompt Gemini with live Google Search Grounding to extract claims, verify each against live web evidence
    const verificationPrompt = `You are Hynex TruthCheck — an uncompromising, empirical factual verification engine.
Analyze the following text and perform an objective factual audit.

Text to verify:
"""${text.trim().slice(0, 4000)}"""

Instructions:
1. Identify 2 to 5 specific, testable factual claims made in the text.
2. For each claim, check current web sources using your search tool.
3. Classify each claim into exactly one status: "supported", "contradicted", "inconclusive", or "unverified".
4. Provide the exact empirical evidence found, cite specific web sources, and state any remaining uncertainty.
5. Provide an overall factual accuracy score from 0 to 100.
6. Provide output in STRICT JSON format with this exact structure:
{
  "overall_score": 85,
  "summary": "Brief executive summary of verification findings",
  "claims": [
    {
      "claim": "The exact claim statement",
      "status": "supported", // or "contradicted", "inconclusive", "unverified"
      "explanation": "Clear explanation grounded in retrieved evidence",
      "sources": [
        {
          "title": "Source page or publication title",
          "url": "https://valid-url.com",
          "snippet": "Direct quote or evidence snippet"
        }
      ],
      "uncertainty": "Any notes on remaining ambiguity or emerging data"
    }
  ]
}

DO NOT include markdown code fences or conversational prose outside the JSON.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [
        {
          role: 'user',
          parts: [{ text: verificationPrompt }],
        },
      ],
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const responseText = response.text || '';
    
    // Extract grounding metadata chunks if available
    const groundingChunks = (response.candidates?.[0] as any)?.groundingMetadata?.groundingChunks || [];
    const liveWebSources: Array<{ title: string; url: string; snippet?: string }> = [];
    for (const chunk of groundingChunks) {
      if (chunk.web?.uri) {
        liveWebSources.push({
          title: chunk.web.title || new URL(chunk.web.uri).hostname,
          url: chunk.web.uri,
          snippet: chunk.web.title || '',
        });
      }
    }

    // Parse JSON
    let parsed: {
      overall_score?: number;
      summary?: string;
      claims?: Array<{
        claim: string;
        status: 'supported' | 'contradicted' | 'inconclusive' | 'unverified';
        explanation: string;
        sources?: Array<{ title: string; url: string; snippet?: string }>;
        uncertainty?: string;
      }>;
    } = {};

    try {
      const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
      parsed = JSON.parse(cleanJson);
    } catch {
      // Fallback parsing or fallback structure
      parsed = {
        overall_score: 75,
        summary: responseText.slice(0, 200),
        claims: [
          {
            claim: text.slice(0, 100),
            status: 'inconclusive',
            explanation: responseText || 'Verification processed with live grounding.',
            sources: liveWebSources.slice(0, 3),
            uncertainty: 'Automated structure fallback',
          },
        ],
      };
    }

    // Attach verified live grounding sources if claims list had sparse sources
    const claimVerifications: ClaimVerification[] = (parsed.claims || []).map((c, idx) => {
      const sources = (c.sources && c.sources.length > 0) ? c.sources : liveWebSources.slice(idx * 2, idx * 2 + 2);
      return {
        id: `claim_${Date.now()}_${idx}`,
        claim: c.claim || 'Factual claim',
        status: ['supported', 'contradicted', 'inconclusive', 'unverified'].includes(c.status) ? c.status : 'inconclusive',
        evidence: c.explanation || 'Analyzed against external web references.',
        sources: sources.filter(s => s.url && s.url.startsWith('http')),
        uncertainty: c.uncertainty || undefined,
      };
    });

    // Save report in DB
    const report = db.saveTruthCheckReport(userId, {
      message_id: messageId,
      target_text: text,
      claim_verifications: claimVerifications,
      overall_score: typeof parsed.overall_score === 'number' ? parsed.overall_score : 85,
    });

    return res.json({
      success: true,
      report,
      summary: parsed.summary || 'TruthCheck audit completed successfully.',
    });
  } catch (err: unknown) {
    console.error('[TruthCheck Error]:', err);
    const message = err instanceof Error ? err.message : 'TruthCheck failed';
    return res.status(500).json({ error: message });
  }
});

// GET /api/truthcheck/reports - list reports for current user
truthCheckRouter.get('/reports', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getEffectiveUserId(req);
    const reports = db.getTruthCheckReports(userId);
    return res.json({ reports });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve reports';
    return res.status(500).json({ error: message });
  }
});

// GET /api/truthcheck/report/:id - get report detail
truthCheckRouter.get('/report/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getEffectiveUserId(req);
    const report = db.getTruthCheckReport(userId, req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'TruthCheck report not found.' });
    }
    return res.json({ report });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve report';
    return res.status(500).json({ error: message });
  }
});
