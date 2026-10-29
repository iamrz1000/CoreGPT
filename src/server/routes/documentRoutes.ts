import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../db.ts';
import { getGeminiClient, generateGeminiImage } from '../gemini.ts';
import {
  createDocxBuffer,
  createPptxBuffer,
  createPdfBuffer,
  createExcelBuffer,
  synthesizeAssignment,
  synthesizePresentation,
  synthesizeSpreadsheet,
  generateTopicImages,
  DocumentTheme,
  EngagementLevel,
} from '../documentService.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const documentRouter = Router();

const STORAGE_DIR = path.resolve(__dirname, '../../../data/documents');
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

function getEffectiveUserId(req: AuthenticatedRequest): string {
  if (req.user?.id) return req.user.id;
  return 'default_user';
}

// -------------------------------------------------------------
// 1. GENERATE SINGLE IMAGE (For review, replace, or regeneration)
// -------------------------------------------------------------
documentRouter.post('/generate-single-image', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { prompt, style = 'realistic', aspectRatio = '16:9' } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required.' });
    }

    console.log(`[Document Studio] Generating single image for prompt: "${prompt.slice(0, 60)}"`);
    const enhancedPrompt = `${prompt}, ${style}, educational and academic illustration, clean sharp composition, highly informative, neutral background`;

    const result = await generateGeminiImage(enhancedPrompt, aspectRatio, {
      autoEnhance: false,
      style,
    });

    if (!result || !result.imageUrl) {
      return res.status(502).json({
        error: 'Image provider did not return an image asset.',
        failedPrompt: prompt,
      });
    }

    return res.json({
      success: true,
      image: {
        id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        url: result.imageUrl,
        prompt,
        caption: prompt.slice(0, 50),
        status: 'ready',
      },
    });
  } catch (err: any) {
    console.error('Single image generation error:', err);
    return res.status(500).json({
      error: err.message || 'Failed to generate image.',
      failedPrompt: req.body?.prompt,
    });
  }
});

// -------------------------------------------------------------
// 2. SUGGEST TOPIC-MATCHED IMAGES
// -------------------------------------------------------------
documentRouter.post('/suggest-images', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { topic, sections = [], imageOptions } = req.body;
    if (!topic) {
      return res.status(400).json({ error: 'Topic is required.' });
    }

    const ai = getGeminiClient();
    const quantity = imageOptions?.quantity || 'balanced';
    const limit = quantity === 'few' ? 1 : quantity === 'more' ? 4 : 2;

    const sectionTitles = sections.map((s: any, idx: number) => `Section ${idx + 1}: ${s.title || ''}`).join('\n');

    const prompt = `You are a visual director for academic textbooks and technical reports.
Topic: "${topic}"
Available Sections:
${sectionTitles || 'Standard 4 sections'}
Requested Quantity: ${limit} images
Image Types requested: ${(imageOptions?.types || ['diagrams', 'scientific']).join(', ')}
Style: ${imageOptions?.style || 'Professional'}

Suggest ${limit} highly relevant, factually grounded images or diagrams that match specific sections.
Return ONLY valid JSON matching this schema:
{
  "suggestions": [
    {
      "prompt": "Detailed topic-matched prompt for scientific or educational illustration",
      "caption": "Figure 1: Concise academic caption",
      "sectionIndex": 0,
      "placement": "below_heading"
    }
  ]
}`;

    const resp = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { responseMimeType: 'application/json' },
    });

    const parsed = JSON.parse(resp.text || '{}');
    const suggestions = (parsed.suggestions || []).slice(0, limit).map((s: any, idx: number) => ({
      id: `img_sug_${idx}_${Date.now()}`,
      prompt: s.prompt,
      caption: s.caption || `Figure ${idx + 1}`,
      sectionIndex: typeof s.sectionIndex === 'number' ? s.sectionIndex : idx,
      placement: s.placement || 'below_heading',
      status: 'pending',
    }));

    return res.json({ success: true, suggestions });
  } catch (err: any) {
    console.warn('Suggest images fallback:', err);
    return res.json({
      success: true,
      suggestions: [
        {
          id: `img_sug_0_${Date.now()}`,
          prompt: `Diagram illustrating core concepts of ${req.body?.topic || 'the topic'}`,
          caption: 'Figure 1: Conceptual overview diagram',
          sectionIndex: 0,
          placement: 'below_heading',
          status: 'pending',
        },
      ],
    });
  }
});

// -------------------------------------------------------------
// 3. COMPILE FINAL DOCUMENT (With edited sections, images & themes)
// -------------------------------------------------------------
documentRouter.post('/compile-final', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      title,
      subtitle,
      format = 'docx', // 'docx' | 'pdf' | 'pptx' | 'xlsx'
      metadata,
      sections = [],
      references = [],
      theme = 'academic_green',
      engagementLevel = 'professional',
      coverImage,
      slides = [],
      sheets = [],
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Document title is required.' });
    }

    const userId = getEffectiveUserId(req);
    const cleanTitle = title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
    const timeId = Date.now();

    let fileBuffer: Buffer;
    let fileName: string;
    let mimeType: string;

    if (format === 'pdf') {
      fileBuffer = await createPdfBuffer({
        title,
        subtitle,
        metadata: metadata || {},
        sections,
        references,
        theme: theme as DocumentTheme,
        engagementLevel: engagementLevel as EngagementLevel,
        coverImage,
      });
      fileName = `${cleanTitle}.pdf`;
      mimeType = 'application/pdf';
    } else if (format === 'pptx') {
      fileBuffer = await createPptxBuffer({
        title,
        subtitle,
        theme: theme as any,
        slides,
      });
      fileName = `${cleanTitle}.pptx`;
      mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    } else if (format === 'xlsx') {
      fileBuffer = await createExcelBuffer({
        title,
        sheets,
      });
      fileName = `${cleanTitle}.xlsx`;
      mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else {
      // DOCX default
      fileBuffer = await createDocxBuffer({
        title,
        subtitle,
        metadata,
        sections,
        references,
        theme: theme as DocumentTheme,
        engagementLevel: engagementLevel as EngagementLevel,
        coverImage,
      });
      fileName = `${cleanTitle}.docx`;
      mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }

    const diskId = `final_${timeId}`;
    const diskPath = path.join(STORAGE_DIR, `${diskId}_${fileName}`);
    fs.writeFileSync(diskPath, fileBuffer);

    const fileRecord = db.createUserFile(userId, {
      name: fileName,
      mime_type: mimeType,
      size: fileBuffer.length,
      url: `/api/documents/download/${diskId}_${fileName}`,
    });

    return res.json({
      success: true,
      file: fileRecord,
      downloadUrl: fileRecord.url,
      message: `Document compiled successfully as ${fileName}`,
    });
  } catch (err: any) {
    console.error('Compile final error:', err);
    return res.status(500).json({ error: err.message || 'Failed to compile final document.' });
  }
});

// -------------------------------------------------------------
// 4. UNIVERSAL AI FILE CREATOR
// -------------------------------------------------------------
documentRouter.post('/universal-create', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      prompt,
      formatPreference,
      includeImages = false,
      imageOptions,
      engagementLevel = 'professional',
      theme = 'academic_green',
      language = 'English',
    } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required.' });
    }

    const userId = getEffectiveUserId(req);
    const ai = getGeminiClient();

    // Step 1: Detect intent and extract structured parameters
    const classificationPrompt = `Analyze the user's document creation request:
"${prompt}"
Desired Format Preference: "${formatPreference || 'auto'}"

Determine the best document type ('assignment', 'presentation', 'docx', 'pdf', 'spreadsheet', 'notes', 'resume', 'letter', 'worksheet').
Extract or infer key parameters:
- topic
- subject (if applicable)
- gradeClass (e.g. "Class 10", "Grade 8", "College Year 2")
- board (e.g. "Maharashtra State Board", "CBSE", "ICSE", or "Standard Academic")
- slideCount (if presentation, default 6)
- rowCount (if spreadsheet, default 10)
- category (for spreadsheet or notes)

Return ONLY valid JSON:
{
  "docType": "assignment" | "presentation" | "docx" | "pdf" | "spreadsheet" | "notes" | "resume" | "letter" | "worksheet",
  "topic": "Cleaned topic",
  "subject": "Inferred subject or General",
  "gradeClass": "Inferred class or Grade 10",
  "board": "Inferred board or Maharashtra State Board",
  "slideCount": 6,
  "rowCount": 10
}`;

    const classResp = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [{ role: 'user', parts: [{ text: classificationPrompt }] }],
      config: { responseMimeType: 'application/json' },
    });

    const parsedIntent = JSON.parse(classResp.text || '{}');
    const docType = parsedIntent.docType || 'assignment';
    const topic = parsedIntent.topic || prompt.slice(0, 40);

    let fileBuffer: Buffer;
    let fileName: string;
    let mimeType: string;
    let previewData: any;

    if (docType === 'presentation') {
      const presParams = await synthesizePresentation({
        topic,
        slideCount: parsedIntent.slideCount || 6,
        theme: theme as any,
        includeImages: Boolean(includeImages),
        imageStyle: imageOptions?.style,
      });
      fileBuffer = await createPptxBuffer(presParams);
      fileName = `${topic.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30)}_deck.pptx`;
      mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      previewData = presParams;
    } else if (docType === 'spreadsheet') {
      const sheetParams = await synthesizeSpreadsheet({
        topic,
        category: parsedIntent.category,
        rowCount: parsedIntent.rowCount || 10,
      });
      fileBuffer = await createExcelBuffer(sheetParams);
      fileName = `${topic.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30)}_sheet.xlsx`;
      mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      previewData = sheetParams;
    } else {
      // Assignment / DOCX / PDF
      const assignParams = await synthesizeAssignment({
        topic,
        subject: parsedIntent.subject || 'General Studies',
        gradeClass: parsedIntent.gradeClass || 'Class 10',
        board: parsedIntent.board || 'Maharashtra State Board',
        language,
        includeImages: Boolean(includeImages),
        imageOptions,
        engagementLevel: engagementLevel as EngagementLevel,
        theme: theme as DocumentTheme,
      });

      if (formatPreference === 'pdf') {
        fileBuffer = await createPdfBuffer({
          title: assignParams.title,
          subtitle: `${assignParams.subject} — ${assignParams.board}`,
          metadata: {
            Subject: assignParams.subject,
            Board: assignParams.board,
            Date: assignParams.submissionDate || new Date().toLocaleDateString(),
          },
          sections: assignParams.sections,
          references: assignParams.references,
          theme: theme as DocumentTheme,
          engagementLevel: engagementLevel as EngagementLevel,
          coverImage: assignParams.coverImage,
        });
        fileName = `${topic.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30)}_document.pdf`;
        mimeType = 'application/pdf';
      } else {
        fileBuffer = await createDocxBuffer({
          title: assignParams.title,
          subtitle: `${assignParams.subject} — ${assignParams.board}`,
          metadata: {
            subject: assignParams.subject,
            board: assignParams.board,
            date: assignParams.submissionDate || new Date().toLocaleDateString(),
          },
          sections: assignParams.sections,
          references: assignParams.references,
          theme: theme as DocumentTheme,
          engagementLevel: engagementLevel as EngagementLevel,
          coverImage: assignParams.coverImage,
        });
        fileName = `${topic.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30)}_assignment.docx`;
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      }
      previewData = assignParams;
    }

    // Persist file to storage
    const fileId = `hynex_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const diskPath = path.join(STORAGE_DIR, `${fileId}_${fileName}`);
    fs.writeFileSync(diskPath, fileBuffer);

    // Save metadata in database
    const fileRecord = db.createUserFile(userId, {
      name: fileName,
      mime_type: mimeType,
      size: fileBuffer.length,
      url: `/api/documents/download/${fileId}_${fileName}`,
    });

    return res.json({
      success: true,
      file: fileRecord,
      docType,
      preview: previewData,
      downloadUrl: fileRecord.url,
      message: `Successfully generated ${fileName}`,
    });
  } catch (err: any) {
    console.error('Universal creation failed:', err);
    return res.status(500).json({ error: err.message || 'Failed to create document.' });
  }
});

// -------------------------------------------------------------
// 5. AI ASSIGNMENT MAKER (School & College, Maharashtra Board, CBSE)
// -------------------------------------------------------------
documentRouter.post('/generate-assignment', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      topic,
      subject = 'Science',
      gradeClass = 'Class 10',
      board = 'Maharashtra State Board',
      language = 'English',
      detailLevel = 'detailed',
      pageTarget = 3,
      teacherInstructions,
      studentName,
      rollNumber,
      exportFormat = 'both', // 'docx' | 'pdf' | 'both'
      includeImages = false,
      imageOptions,
      engagementLevel = 'professional',
      theme = 'academic_green',
      approvedImages,
    } = req.body;

    if (!topic) {
      return res.status(400).json({ error: 'Assignment topic is required.' });
    }

    const userId = getEffectiveUserId(req);

    // Synthesize academic content
    const assignmentData = await synthesizeAssignment({
      topic,
      subject,
      gradeClass,
      board,
      language,
      detailLevel,
      pageTarget,
      teacherInstructions,
      studentName,
      rollNumber,
      includeImages: Boolean(includeImages),
      imageOptions,
      engagementLevel: engagementLevel as EngagementLevel,
      theme: theme as DocumentTheme,
    });

    // If approved images provided manually (e.g. from review step), use those
    if (approvedImages && Array.isArray(approvedImages) && approvedImages.length > 0) {
      assignmentData.images = approvedImages;
      assignmentData.coverImage = approvedImages.find((img: any) => img.status === 'ready')?.url;
      // Re-link images to sections
      for (const img of approvedImages) {
        if (img.status === 'ready' && img.url) {
          const sIdx = img.sectionIndex ?? 0;
          if (assignmentData.sections[sIdx]) {
            if (!assignmentData.sections[sIdx].images) assignmentData.sections[sIdx].images = [];
            assignmentData.sections[sIdx].images!.push(img);
          }
        }
      }
    }

    // Generate real files
    const cleanTopic = topic.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
    const timeId = Date.now();

    // DOCX Buffer
    const docxBuf = await createDocxBuffer({
      title: assignmentData.title,
      subtitle: `${subject} (${gradeClass}) — ${board}`,
      metadata: {
        studentName,
        rollNumber,
        subject,
        board,
        date: assignmentData.submissionDate || new Date().toLocaleDateString(),
      },
      sections: assignmentData.sections,
      references: assignmentData.references,
      theme: theme as DocumentTheme,
      engagementLevel: engagementLevel as EngagementLevel,
      coverImage: assignmentData.coverImage,
    });

    const docxName = `${cleanTopic}_${board.replace(/\s+/g, '_')}.docx`;
    const docxId = `asgn_docx_${timeId}`;
    fs.writeFileSync(path.join(STORAGE_DIR, `${docxId}_${docxName}`), docxBuf);

    const docxRecord = db.createUserFile(userId, {
      name: docxName,
      mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: docxBuf.length,
      url: `/api/documents/download/${docxId}_${docxName}`,
    });

    // PDF Buffer
    const pdfBuf = await createPdfBuffer({
      title: assignmentData.title,
      subtitle: `${subject} (${gradeClass}) — ${board}`,
      metadata: {
        'Student Name': studentName || 'Student',
        'Roll Number': rollNumber || 'N/A',
        Subject: subject,
        Board: board,
        Date: assignmentData.submissionDate || new Date().toLocaleDateString(),
        'Design Level': `${engagementLevel.toUpperCase()} · ${theme}`,
      },
      sections: assignmentData.sections,
      references: assignmentData.references,
      theme: theme as DocumentTheme,
      engagementLevel: engagementLevel as EngagementLevel,
      coverImage: assignmentData.coverImage,
    });

    const pdfName = `${cleanTopic}_${board.replace(/\s+/g, '_')}.pdf`;
    const pdfId = `asgn_pdf_${timeId}`;
    fs.writeFileSync(path.join(STORAGE_DIR, `${pdfId}_${pdfName}`), pdfBuf);

    const pdfRecord = db.createUserFile(userId, {
      name: pdfName,
      mime_type: 'application/pdf',
      size: pdfBuf.length,
      url: `/api/documents/download/${pdfId}_${pdfName}`,
    });

    return res.json({
      success: true,
      assignment: assignmentData,
      files: {
        docx: docxRecord,
        pdf: pdfRecord,
      },
      primaryDownloadUrl: exportFormat === 'pdf' ? pdfRecord.url : docxRecord.url,
      message: `Assignment successfully created for ${board}!`,
    });
  } catch (err: any) {
    console.error('Assignment generation error:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate assignment.' });
  }
});

// -------------------------------------------------------------
// 6. AI PRESENTATION MAKER
// -------------------------------------------------------------
documentRouter.post('/generate-presentation', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      topic,
      slideCount = 6,
      audience = 'College Students & Instructors',
      theme = 'academic_green',
      aspectRatio = '16:9',
      includeImages = false,
      imageStyle = 'flux',
    } = req.body;

    if (!topic) {
      return res.status(400).json({ error: 'Presentation topic is required.' });
    }

    const userId = getEffectiveUserId(req);

    const presParams = await synthesizePresentation({
      topic,
      slideCount: parseInt(String(slideCount), 10) || 6,
      audience,
      theme: theme as any,
      aspectRatio,
      includeImages: Boolean(includeImages),
      imageStyle,
    });

    const cleanTopic = topic.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
    const pptxBuf = await createPptxBuffer(presParams);

    const timeId = Date.now();
    const pptxName = `${cleanTopic}_deck.pptx`;
    const pptxId = `pres_${timeId}`;
    fs.writeFileSync(path.join(STORAGE_DIR, `${pptxId}_${pptxName}`), pptxBuf);

    const fileRecord = db.createUserFile(userId, {
      name: pptxName,
      mime_type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      size: pptxBuf.length,
      url: `/api/documents/download/${pptxId}_${pptxName}`,
    });

    return res.json({
      success: true,
      presentation: presParams,
      file: fileRecord,
      downloadUrl: fileRecord.url,
      message: 'Generated professional PowerPoint presentation (.pptx)!',
    });
  } catch (err: any) {
    console.error('Presentation generation error:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate presentation.' });
  }
});

// -------------------------------------------------------------
// 7. AI SPREADSHEET MAKER
// -------------------------------------------------------------
documentRouter.post('/generate-spreadsheet', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { topic, category = 'budget', rowCount = 10 } = req.body;

    if (!topic) {
      return res.status(400).json({ error: 'Spreadsheet topic is required.' });
    }

    const userId = getEffectiveUserId(req);

    const sheetParams = await synthesizeSpreadsheet({
      topic,
      category,
      rowCount: parseInt(String(rowCount), 10) || 10,
    });

    const cleanTopic = topic.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
    const xlsxBuf = await createExcelBuffer(sheetParams);

    const timeId = Date.now();
    const xlsxName = `${cleanTopic}_sheet.xlsx`;
    const xlsxId = `sheet_${timeId}`;
    fs.writeFileSync(path.join(STORAGE_DIR, `${xlsxId}_${xlsxName}`), xlsxBuf);

    const fileRecord = db.createUserFile(userId, {
      name: xlsxName,
      mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: xlsxBuf.length,
      url: `/api/documents/download/${xlsxId}_${xlsxName}`,
    });

    return res.json({
      success: true,
      spreadsheet: sheetParams,
      file: fileRecord,
      downloadUrl: fileRecord.url,
      message: 'Generated professional Excel spreadsheet with formulas!',
    });
  } catch (err: any) {
    console.error('Spreadsheet generation error:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate spreadsheet.' });
  }
});

// -------------------------------------------------------------
// 8. AI DOCUMENT IMPROVEMENT TOOLS
// -------------------------------------------------------------
documentRouter.post('/ai-improve', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { text, action, context } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text to improve is required.' });
    }

    const ai = getGeminiClient();
    const actionPrompts: Record<string, string> = {
      fix_grammar: 'Fix all grammar, spelling, punctuation, and syntax errors while preserving the original tone.',
      simplify: 'Simplify this text so that it is easy to read, crystal clear, and concise without losing important technical details.',
      summarize: 'Provide an executive summary highlighting the primary insights, core arguments, and action items.',
      expand: 'Expand this text with greater academic depth, clear explanations, and supporting examples.',
      bullet_points: 'Convert this paragraph into crisp, structured bullet points.',
      paragraphs: 'Convert these bullet points into flowing, coherent, well-structured prose paragraphs.',
      academic_tone: 'Rewrite in an authoritative, objective academic tone suitable for formal assignments and research papers.',
      translate_hindi: 'Translate this text into clear, fluent, natural Hindi.',
      translate_marathi: 'Translate this text into clear, fluent, natural Marathi.',
    };

    const instruction = actionPrompts[action] || 'Improve and refine this text for optimal clarity and flow.';
    const prompt = `You are the lead editor for HYNEX AI Document Studio.
Task: ${instruction}
Additional Context: ${context || 'None'}

Original Text:
"""
${text}
"""

Output ONLY the improved text directly without conversational prefix.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    return res.json({
      success: true,
      originalText: text,
      improvedText: (response.text || text).trim(),
      action,
    });
  } catch (err: any) {
    console.error('AI improve error:', err);
    return res.status(500).json({ error: err.message || 'Failed to improve text.' });
  }
});

// -------------------------------------------------------------
// 9. MY FILES (List, Download, Delete)
// -------------------------------------------------------------
documentRouter.get('/my-files', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getEffectiveUserId(req);
    const files = db.getUserFiles(userId);
    return res.json({ files });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to load user files.' });
  }
});

documentRouter.get('/download/:filename', (req: Request, res: Response) => {
  try {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(STORAGE_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found or link expired.' });
    }

    let contentType = 'application/octet-stream';
    if (filename.endsWith('.pdf')) contentType = 'application/pdf';
    else if (filename.endsWith('.docx')) contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    else if (filename.endsWith('.pptx')) contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    else if (filename.endsWith('.xlsx')) contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    const cleanDownloadName = filename.replace(/^[^_]+_/, '');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${cleanDownloadName || filename}"`);

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (err: any) {
    console.error('Download error:', err);
    return res.status(500).json({ error: 'Download failed.' });
  }
});

documentRouter.delete('/:fileId', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getEffectiveUserId(req);
    const fileId = req.params.fileId;

    const files = db.getUserFiles(userId);
    const target = files.find((f) => f.id === fileId);

    if (target) {
      const diskFilename = path.basename(target.url);
      const filePath = path.join(STORAGE_DIR, diskFilename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch {}
      }
    }

    const success = db.deleteUserFile(userId, fileId);
    return res.json({ success });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to delete file.' });
  }
});
