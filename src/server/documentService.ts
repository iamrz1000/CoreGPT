import PDFDocument from 'pdfkit';
import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  Header,
  Footer,
  PageNumber,
  Packer,
  convertInchesToTwip,
  ShadingType,
  ImageRun,
  PageBreak,
} from 'docx';
import pptxgen from 'pptxgenjs';
import ExcelJS from 'exceljs';
import {
  getGeminiClient,
  generateGeminiImage,
  searchWikimediaImage,
  generateStudioVectorRaster,
} from './gemini.ts';
import sharp from 'sharp';

export type DocumentTheme =
  | 'modern_blue'
  | 'academic_green'
  | 'elegant_purple'
  | 'minimal_bw'
  | 'warm_neutral'
  | 'creative_colorful'
  | 'corporate';

export type EngagementLevel = 'simple' | 'professional' | 'creative';

export interface ThemeColors {
  primary: string; // 6 char hex without # for docx (e.g. '1D4ED8')
  primaryHex: string; // with # for pdf and preview (e.g. '#1D4ED8')
  secondary: string;
  secondaryHex: string;
  lightBg: string; // e.g. 'EFF6FF'
  lightBgHex: string;
  accent: string;
  accentHex: string;
  text: string;
  textHex: string;
}

export const THEMES: Record<DocumentTheme, ThemeColors> = {
  modern_blue: {
    primary: '1D4ED8',
    primaryHex: '#1D4ED8',
    secondary: '3B82F6',
    secondaryHex: '#3B82F6',
    lightBg: 'EFF6FF',
    lightBgHex: '#EFF6FF',
    accent: '0284C7',
    accentHex: '#0284C7',
    text: '0F172A',
    textHex: '#0F172A',
  },
  academic_green: {
    primary: '047857',
    primaryHex: '#047857',
    secondary: '10B981',
    secondaryHex: '#10B981',
    lightBg: 'F0FDF4',
    lightBgHex: '#F0FDF4',
    accent: '059669',
    accentHex: '#059669',
    text: '0F172A',
    textHex: '#0F172A',
  },
  elegant_purple: {
    primary: '6D28D9',
    primaryHex: '#6D28D9',
    secondary: '8B5CF6',
    secondaryHex: '#8B5CF6',
    lightBg: 'FAF5FF',
    lightBgHex: '#FAF5FF',
    accent: '7C3AED',
    accentHex: '#7C3AED',
    text: '0F172A',
    textHex: '#0F172A',
  },
  minimal_bw: {
    primary: '0F172A',
    primaryHex: '#0F172A',
    secondary: '475569',
    secondaryHex: '#475569',
    lightBg: 'F8FAFC',
    lightBgHex: '#F8FAFC',
    accent: '334155',
    accentHex: '#334155',
    text: '0F172A',
    textHex: '#0F172A',
  },
  warm_neutral: {
    primary: 'B45309',
    primaryHex: '#B45309',
    secondary: 'D97706',
    secondaryHex: '#D97706',
    lightBg: 'FFFBEB',
    lightBgHex: '#FFFBEB',
    accent: 'F59E0B',
    accentHex: '#F59E0B',
    text: '1C1917',
    textHex: '#1C1917',
  },
  creative_colorful: {
    primary: 'DB2777',
    primaryHex: '#DB2777',
    secondary: 'EC4899',
    secondaryHex: '#EC4899',
    lightBg: 'FDF2F8',
    lightBgHex: '#FDF2F8',
    accent: 'F43F5E',
    accentHex: '#F43F5E',
    text: '0F172A',
    textHex: '#0F172A',
  },
  corporate: {
    primary: '0369A1',
    primaryHex: '#0369A1',
    secondary: '0284C7',
    secondaryHex: '#0284C7',
    lightBg: 'F0F9FF',
    lightBgHex: '#F0F9FF',
    accent: '38BDF8',
    accentHex: '#38BDF8',
    text: '0F172A',
    textHex: '#0F172A',
  },
};

export interface DocumentCallout {
  type: 'highlight' | 'definition' | 'key_takeaway' | 'summary' | 'example';
  title?: string;
  text: string;
}

export interface DocumentImageItem {
  id: string;
  url: string; // data:image/... or https://...
  caption?: string;
  placement?: 'below_heading' | 'beside_text' | 'full_width' | 'dedicated_page';
  sectionIndex?: number;
  altText?: string;
  prompt?: string;
  status?: 'ready' | 'failed';
  error?: string;
}

export interface DocumentSection {
  title: string;
  level?: 1 | 2 | 3;
  content: string;
  bulletPoints?: string[];
  callouts?: DocumentCallout[];
  images?: DocumentImageItem[];
  table?: {
    headers: string[];
    rows: string[][];
  };
}

export interface AssignmentParams {
  title: string;
  studentName?: string;
  rollNumber?: string;
  subject: string;
  gradeClass: string;
  board: string;
  submissionDate?: string;
  teacherInstructions?: string;
  sections: DocumentSection[];
  references?: string[];
  theme?: DocumentTheme | 'academic' | 'modern' | 'minimal';
  engagementLevel?: EngagementLevel;
  images?: DocumentImageItem[];
  coverImage?: string;
}

export interface PresentationSlide {
  title: string;
  subtitle?: string;
  layout: 'title' | 'content' | 'two_column' | 'cards' | 'table' | 'quote' | 'conclusion' | 'image_focus';
  bulletPoints?: string[];
  leftBullets?: string[];
  rightBullets?: string[];
  cards?: Array<{ title: string; text: string }>;
  speakerNotes?: string;
  imageUrl?: string;
  imageCaption?: string;
  table?: {
    headers: string[];
    rows: string[][];
  };
}

export interface PresentationParams {
  title: string;
  subtitle?: string;
  author?: string;
  aspectRatio?: '16:9' | '4:3';
  theme?: 'dark' | 'academic' | 'indigo' | 'corporate' | 'emerald' | DocumentTheme;
  slides: PresentationSlide[];
}

export interface SpreadsheetParams {
  title: string;
  sheets?: Array<{
    name: string;
    headers: string[];
    rows: (string | number)[][];
    summaryRow?: { label: string; formulaColIndex?: number };
  }>;
  sheetName?: string;
  headers?: string[];
  rows?: (string | number)[][];
}

/**
 * Resolves an image URL or data URL to a raw Buffer safely
 */
export async function resolveImageBuffer(imgUrl: string): Promise<Buffer | null> {
  if (!imgUrl || typeof imgUrl !== 'string') return null;
  try {
    if (imgUrl.startsWith('data:image/svg+xml')) {
      let svgText = '';
      if (imgUrl.includes('base64,')) {
        svgText = Buffer.from(imgUrl.split('base64,')[1], 'base64').toString('utf8');
      } else if (imgUrl.includes(',')) {
        svgText = decodeURIComponent(imgUrl.split(',')[1]);
      }
      if (svgText) {
        return await sharp(Buffer.from(svgText)).png().toBuffer();
      }
    }
    if (imgUrl.startsWith('data:image/')) {
      const parts = imgUrl.split(',');
      if (parts.length > 1) {
        return Buffer.from(parts[1], 'base64');
      }
    }
    if (imgUrl.startsWith('http://') || imgUrl.startsWith('https://')) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(imgUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) HynexAI/2.0' },
      });
      clearTimeout(timeoutId);
      if (!res.ok) return null;
      const contentType = res.headers.get('content-type') || '';
      const ab = await res.arrayBuffer();
      const buf = Buffer.from(ab);
      if (contentType.includes('svg') || imgUrl.endsWith('.svg')) {
        return await sharp(buf).png().toBuffer();
      }
      return buf;
    }
  } catch (err) {
    console.warn('[HYNEX Document] Could not load image into buffer:', err);
  }
  return null;
}

/**
 * Resolves an image to base64 data string for PPTX
 */
export async function resolveImageBase64(imgUrl: string): Promise<string | null> {
  if (!imgUrl) return null;
  if (imgUrl.startsWith('data:image/')) return imgUrl;
  const buf = await resolveImageBuffer(imgUrl);
  if (buf) {
    return `data:image/png;base64,${buf.toString('base64')}`;
  }
  return null;
}

function resolveTheme(name?: string): ThemeColors {
  if (!name) return THEMES.academic_green;
  if (name in THEMES) return THEMES[name as DocumentTheme];
  if (name === 'academic') return THEMES.academic_green;
  if (name === 'modern') return THEMES.modern_blue;
  if (name === 'minimal') return THEMES.minimal_bw;
  return THEMES.modern_blue;
}

/**
 * Generates a real, valid Microsoft Word (.docx) document with embedded images & callouts
 */
export async function createDocxBuffer(params: {
  title: string;
  subtitle?: string;
  metadata?: {
    author?: string;
    subject?: string;
    board?: string;
    studentName?: string;
    rollNumber?: string;
    date?: string;
  };
  sections: DocumentSection[];
  references?: string[];
  theme?: DocumentTheme | 'academic' | 'modern' | 'minimal';
  engagementLevel?: EngagementLevel;
  coverImage?: string;
}): Promise<Buffer> {
  const theme = resolveTheme(params.theme);
  const engagement = params.engagementLevel || 'professional';
  const children: (Paragraph | Table)[] = [];

  // ==========================================
  // 1. PROFESSIONAL COVER PAGE (for Professional & Creative)
  // ==========================================
  if (engagement !== 'simple') {
    // Decorative Top Accent Bar
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'HYNEX AI · ACADEMIC & PROFESSIONAL DOCUMENT STUDIO',
            bold: true,
            size: 18,
            color: theme.primary,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 400 },
      })
    );

    // Main Title
    children.push(
      new Paragraph({
        text: params.title,
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200, before: 200 },
        children: [
          new TextRun({
            text: params.title,
            bold: true,
            size: 44, // 22pt
            color: theme.primary,
          }),
        ],
      })
    );

    // Subtitle
    if (params.subtitle) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [
            new TextRun({
              text: params.subtitle,
              italics: true,
              color: '475569',
              size: 26,
            }),
          ],
        })
      );
    }

    // Cover Image if provided
    if (params.coverImage) {
      const coverBuf = await resolveImageBuffer(params.coverImage);
      if (coverBuf) {
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 300 },
            children: [
              new ImageRun({
                data: coverBuf,
                transformation: { width: 480, height: 260 },
                type: 'png',
              }),
            ],
          })
        );
      }
    }

    // Metadata block (e.g. Student Name, Board, Subject)
    if (params.metadata && Object.values(params.metadata).some(Boolean)) {
      const metaRows: TableRow[] = [];
      const entries = [
        ['Student / Author', params.metadata.studentName || params.metadata.author],
        ['Roll Number / ID', params.metadata.rollNumber],
        ['Subject / Domain', params.metadata.subject],
        ['Education Board', params.metadata.board],
        ['Submission Date', params.metadata.date || new Date().toLocaleDateString()],
        ['Design Level', `${engagement.toUpperCase()} · ${theme.primaryHex}`],
      ].filter(([_, v]) => Boolean(v));

      for (const [k, v] of entries) {
        metaRows.push(
          new TableRow({
            children: [
              new TableCell({
                width: { size: 3000, type: WidthType.DXA },
                shading: { type: ShadingType.CLEAR, fill: theme.lightBg },
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: `${k}:`, bold: true, size: 20, color: theme.primary })],
                  }),
                ],
                borders: {
                  top: { style: BorderStyle.NONE },
                  bottom: { style: BorderStyle.NONE },
                  left: { style: BorderStyle.SINGLE, size: 16, color: theme.primary },
                  right: { style: BorderStyle.NONE },
                },
                margins: { top: 80, bottom: 80, left: 160, right: 160 },
              }),
              new TableCell({
                width: { size: 6000, type: WidthType.DXA },
                shading: { type: ShadingType.CLEAR, fill: 'FFFFFF' },
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: String(v), size: 20, color: '0F172A' })],
                  }),
                ],
                borders: {
                  top: { style: BorderStyle.NONE },
                  bottom: { style: BorderStyle.NONE },
                  left: { style: BorderStyle.NONE },
                  right: { style: BorderStyle.NONE },
                },
                margins: { top: 80, bottom: 80, left: 160, right: 160 },
              }),
            ],
          })
        );
      }

      children.push(
        new Table({
          rows: metaRows,
          width: { size: 9000, type: WidthType.DXA },
          alignment: AlignmentType.CENTER,
        })
      );
    }

    // Page Break after Cover Page
    children.push(
      new Paragraph({
        children: [new PageBreak()],
        spacing: { before: 200 },
      })
    );
  } else {
    // SIMPLE MODE: Clean single-page header without cover break
    children.push(
      new Paragraph({
        text: params.title,
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 120, before: 100 },
        children: [
          new TextRun({ text: params.title, bold: true, size: 32, color: '0F172A' }),
        ],
      })
    );
    if (params.subtitle) {
      children.push(
        new Paragraph({
          text: params.subtitle,
          alignment: AlignmentType.CENTER,
          spacing: { after: 240 },
          children: [
            new TextRun({ text: params.subtitle, italics: true, color: '475569', size: 22 }),
          ],
        })
      );
    }
  }

  // ==========================================
  // 2. DOCUMENT SECTIONS & VISUAL CONTENT BLOCKS
  // ==========================================
  for (let sIdx = 0; sIdx < params.sections.length; sIdx++) {
    const section = params.sections[sIdx];
    const headingLevel =
      section.level === 3
        ? HeadingLevel.HEADING_3
        : section.level === 2
        ? HeadingLevel.HEADING_2
        : HeadingLevel.HEADING_1;

    // Heading with theme styling
    children.push(
      new Paragraph({
        text: section.title,
        heading: headingLevel,
        spacing: { before: 360, after: 180 },
        children: [
          new TextRun({
            text: section.title,
            bold: true,
            color: section.level === 2 ? theme.secondary : theme.primary,
            size: section.level === 2 ? 26 : 28,
          }),
        ],
      })
    );

    // Section Content Paragraphs
    if (section.content) {
      const paragraphs = section.content.split('\n\n');
      for (const p of paragraphs) {
        if (!p.trim()) continue;
        children.push(
          new Paragraph({
            spacing: { after: 160, line: 320 },
            children: [
              new TextRun({
                text: p.trim(),
                size: 22, // 11pt
                color: '1E293B',
              }),
            ],
          })
        );
      }
    }

    // Callout / Visual Content Blocks (Definitions, Highlights, Key Takeaways)
    if (section.callouts && section.callouts.length > 0) {
      for (const c of section.callouts) {
        const isDef = c.type === 'definition';
        const isTakeaway = c.type === 'key_takeaway';
        const borderColor = isDef ? '10B981' : isTakeaway ? theme.primary : 'F59E0B';
        const bgColor = isDef ? 'F0FDF4' : isTakeaway ? theme.lightBg : 'FFFBEB';

        children.push(
          new Table({
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 9000, type: WidthType.DXA },
                    shading: { type: ShadingType.CLEAR, fill: bgColor },
                    borders: {
                      left: { style: BorderStyle.SINGLE, size: 24, color: borderColor },
                      top: { style: BorderStyle.NONE },
                      right: { style: BorderStyle.NONE },
                      bottom: { style: BorderStyle.NONE },
                    },
                    margins: { top: 120, bottom: 120, left: 200, right: 200 },
                    children: [
                      ...(c.title
                        ? [
                            new Paragraph({
                              children: [
                                new TextRun({
                                  text: c.title.toUpperCase(),
                                  bold: true,
                                  size: 18,
                                  color: borderColor,
                                }),
                              ],
                              spacing: { after: 60 },
                            }),
                          ]
                        : []),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: c.text,
                            size: 20,
                            color: '1E293B',
                            italics: isDef,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
            width: { size: 9000, type: WidthType.DXA },
            alignment: AlignmentType.CENTER,
          })
        );
        // Spacing paragraph
        children.push(new Paragraph({ spacing: { after: 160 } }));
      }
    }

    // Embedded Section Images
    if (section.images && section.images.length > 0) {
      for (const img of section.images) {
        const buf = await resolveImageBuffer(img.url);
        if (buf) {
          children.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 200, after: 120 },
              children: [
                new ImageRun({
                  data: buf,
                  transformation: {
                    width: 500,
                    height: 280,
                  },
                  type: 'png',
                }),
              ],
            })
          );
          if (img.caption) {
            children.push(
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 240 },
                children: [
                  new TextRun({
                    text: `Figure: ${img.caption}`,
                    italics: true,
                    size: 18,
                    color: '64748B',
                  }),
                ],
              })
            );
          }
        }
      }
    }

    // Bullet Points
    if (section.bulletPoints && section.bulletPoints.length > 0) {
      for (const bp of section.bulletPoints) {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: bp,
                size: 22,
                color: '1E293B',
              }),
            ],
          })
        );
      }
    }

    // Comparison / Structured Table
    if (section.table && section.table.headers.length > 0) {
      const tableRows: TableRow[] = [];

      // Header row
      tableRows.push(
        new TableRow({
          tableHeader: true,
          children: section.table.headers.map(
            (h) =>
              new TableCell({
                shading: { type: ShadingType.CLEAR, fill: theme.primary },
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: h, bold: true, color: 'FFFFFF', size: 20 })],
                    alignment: AlignmentType.CENTER,
                  }),
                ],
                margins: { top: 100, bottom: 100, left: 120, right: 120 },
              })
          ),
        })
      );

      // Data rows
      for (let rIdx = 0; rIdx < section.table.rows.length; rIdx++) {
        const rowData = section.table.rows[rIdx];
        const isAlt = rIdx % 2 === 1;
        tableRows.push(
          new TableRow({
            children: rowData.map(
              (cell) =>
                new TableCell({
                  shading: isAlt ? { type: ShadingType.CLEAR, fill: theme.lightBg } : undefined,
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: String(cell), size: 20, color: '1E293B' })],
                    }),
                  ],
                  margins: { top: 80, bottom: 80, left: 120, right: 120 },
                })
            ),
          })
        );
      }

      children.push(
        new Table({
          rows: tableRows,
          width: { size: 9000, type: WidthType.DXA },
          alignment: AlignmentType.CENTER,
        })
      );
      children.push(new Paragraph({ spacing: { after: 200 } }));
    }
  }

  // ==========================================
  // 3. REFERENCES & CITATIONS
  // ==========================================
  if (params.references && params.references.length > 0) {
    children.push(
      new Paragraph({
        text: 'References & Citations',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 180 },
        children: [
          new TextRun({
            text: 'References & Academic Sources',
            bold: true,
            size: 26,
            color: theme.primary,
          }),
        ],
      })
    );

    for (const ref of params.references) {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 80 },
          children: [
            new TextRun({
              text: ref,
              size: 20,
              italics: true,
              color: '475569',
            }),
          ],
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: 'HYNEX AI · Think. Create. Complete.',
                    size: 16,
                    color: '94A3B8',
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    children: ['Page ', PageNumber.CURRENT, ' of ', PageNumber.TOTAL_PAGES],
                    size: 16,
                    color: '94A3B8',
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

/**
 * Generates a real, valid Microsoft PowerPoint (.pptx) presentation
 */
export async function createPptxBuffer(params: PresentationParams): Promise<Buffer> {
  const pptx = new pptxgen();
  pptx.layout = params.aspectRatio === '4:3' ? 'LAYOUT_4x3' : 'LAYOUT_16x9';
  pptx.title = params.title;
  pptx.author = params.author || 'HYNEX AI Studio';

  const themeKey = String(params.theme || 'academic_green');
  const palette = resolveTheme(themeKey);

  const theme = {
    bg: themeKey.includes('dark') ? '0B0F19' : 'FFFFFF',
    cardBg: themeKey.includes('dark') ? '1E293B' : palette.lightBg,
    primaryText: themeKey.includes('dark') ? 'FFFFFF' : '0F172A',
    secondaryText: themeKey.includes('dark') ? '94A3B8' : '475569',
    accent: palette.primary,
    accentLight: palette.secondary,
  };

  for (let idx = 0; idx < params.slides.length; idx++) {
    const sData = params.slides[idx];
    const slide = pptx.addSlide();

    // Background
    slide.background = { color: theme.bg };

    // Header accent bar
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: pptx.layout === 'LAYOUT_4x3' ? 10 : 13.33,
      h: 0.12,
      fill: { color: theme.accent },
    });

    // Footer Watermark
    slide.addText('HYNEX AI · Think. Create. Complete.', {
      x: 0.6,
      y: pptx.layout === 'LAYOUT_4x3' ? 7.1 : 5.2,
      w: 6,
      h: 0.3,
      fontSize: 9,
      color: theme.secondaryText,
    });

    slide.addText(`${idx + 1} / ${params.slides.length}`, {
      x: pptx.layout === 'LAYOUT_4x3' ? 8.5 : 8.8,
      y: pptx.layout === 'LAYOUT_4x3' ? 7.1 : 5.2,
      w: 1,
      h: 0.3,
      fontSize: 9,
      align: 'right',
      color: theme.secondaryText,
    });

    // Resolve slide visual if present
    const slideImageBase64 = sData.imageUrl ? await resolveImageBase64(sData.imageUrl) : null;

    if (sData.layout === 'title' || idx === 0) {
      // Title Slide
      slide.addText(sData.title, {
        x: 0.8,
        y: 1.6,
        w: 8.4,
        h: 1.6,
        fontSize: 34,
        bold: true,
        color: theme.primaryText,
        align: 'center',
        breakLine: true,
      });

      if (sData.subtitle || params.subtitle) {
        slide.addText(sData.subtitle || params.subtitle || '', {
          x: 1.0,
          y: 3.2,
          w: 8.0,
          h: 0.8,
          fontSize: 18,
          color: theme.accent,
          align: 'center',
          breakLine: true,
        });
      }

      if (slideImageBase64) {
        slide.addImage({
          data: slideImageBase64,
          x: 4.0,
          y: 4.0,
          w: 5.0,
          h: 2.6,
        });
      }
    } else if (slideImageBase64 || sData.layout === 'image_focus') {
      // Image focus layout: Text on left (w: 5.0), Image on right (x: 5.8, w: 4.0)
      slide.addText(sData.title, {
        x: 0.8,
        y: 0.5,
        w: 8.4,
        h: 0.8,
        fontSize: 24,
        bold: true,
        color: theme.accent,
      });

      if (sData.bulletPoints && sData.bulletPoints.length > 0) {
        const textItems = sData.bulletPoints.map((b) => ({
          text: b,
          options: {
            fontSize: 13,
            color: theme.primaryText,
            bullet: true,
            spacingAfter: 12,
          },
        }));

        slide.addText(textItems, {
          x: 0.8,
          y: 1.5,
          w: 4.8,
          h: 3.5,
        });
      }

      if (slideImageBase64) {
        slide.addImage({
          data: slideImageBase64,
          x: 5.8,
          y: 1.4,
          w: 4.2,
          h: 3.4,
        });
        if (sData.imageCaption) {
          slide.addText(sData.imageCaption, {
            x: 5.8,
            y: 4.85,
            w: 4.2,
            h: 0.3,
            fontSize: 9,
            italic: true,
            color: theme.secondaryText,
            align: 'center',
          });
        }
      }
    } else if (sData.layout === 'cards' && sData.cards && sData.cards.length > 0) {
      // Cards layout
      slide.addText(sData.title, {
        x: 0.8,
        y: 0.5,
        w: 8.4,
        h: 0.8,
        fontSize: 24,
        bold: true,
        color: theme.accent,
      });

      const cardCount = Math.min(sData.cards.length, 3);
      const totalWidth = 8.4;
      const gap = 0.3;
      const cardWidth = (totalWidth - gap * (cardCount - 1)) / cardCount;

      sData.cards.slice(0, 3).forEach((card, cIdx) => {
        const cX = 0.8 + cIdx * (cardWidth + gap);

        slide.addShape(pptx.ShapeType.roundRect, {
          x: cX,
          y: 1.6,
          w: cardWidth,
          h: 3.2,
          fill: { color: theme.cardBg },
          line: { color: theme.accentLight, width: 1 },
          rectRadius: 0.1,
        });

        slide.addText(card.title, {
          x: cX + 0.2,
          y: 1.8,
          w: cardWidth - 0.4,
          h: 0.6,
          fontSize: 16,
          bold: true,
          color: theme.accent,
        });

        slide.addText(card.text, {
          x: cX + 0.2,
          y: 2.5,
          w: cardWidth - 0.4,
          h: 2.1,
          fontSize: 12,
          color: theme.primaryText,
          breakLine: true,
        });
      });
    } else if (sData.layout === 'two_column' && (sData.leftBullets || sData.rightBullets)) {
      // Two column layout
      slide.addText(sData.title, {
        x: 0.8,
        y: 0.5,
        w: 8.4,
        h: 0.8,
        fontSize: 24,
        bold: true,
        color: theme.accent,
      });

      const colW = 4.0;
      if (sData.leftBullets) {
        const leftItems = sData.leftBullets.map((b) => ({
          text: b,
          options: { fontSize: 13, color: theme.primaryText, bullet: true, spacingAfter: 12 },
        }));
        slide.addText(leftItems, {
          x: 0.8,
          y: 1.5,
          w: colW,
          h: 3.4,
        });
      }

      if (sData.rightBullets) {
        const rightItems = sData.rightBullets.map((b) => ({
          text: b,
          options: { fontSize: 13, color: theme.primaryText, bullet: true, spacingAfter: 12 },
        }));
        slide.addText(rightItems, {
          x: 5.2,
          y: 1.5,
          w: colW,
          h: 3.4,
        });
      }
    } else {
      // Standard Content Slide
      slide.addText(sData.title, {
        x: 0.8,
        y: 0.5,
        w: 8.4,
        h: 0.8,
        fontSize: 24,
        bold: true,
        color: theme.accent,
      });

      if (sData.subtitle) {
        slide.addText(sData.subtitle, {
          x: 0.8,
          y: 1.2,
          w: 8.4,
          h: 0.4,
          fontSize: 14,
          color: theme.secondaryText,
        });
      }

      if (sData.bulletPoints && sData.bulletPoints.length > 0) {
        const textItems = sData.bulletPoints.map((b) => ({
          text: b,
          options: {
            fontSize: 14,
            color: theme.primaryText,
            bullet: true,
            spacingAfter: 14,
          },
        }));

        slide.addText(textItems, {
          x: 0.8,
          y: sData.subtitle ? 1.7 : 1.5,
          w: 8.4,
          h: 3.4,
        });
      }
    }

    if (sData.speakerNotes) {
      slide.addNotes(sData.speakerNotes);
    }
  }

  const output = await pptx.write({ outputType: 'nodebuffer' });
  return Buffer.isBuffer(output) ? output : Buffer.from(output as ArrayBuffer);
}

/**
 * Generates a real, valid PDF document with embedded images & visual callouts
 */
export async function createPdfBuffer(params: {
  title: string;
  subtitle?: string;
  metadata?: Record<string, string>;
  sections: DocumentSection[];
  references?: string[];
  theme?: DocumentTheme | 'academic' | 'business' | 'minimal';
  engagementLevel?: EngagementLevel;
  coverImage?: string;
}): Promise<Buffer> {
  const theme = resolveTheme(params.theme);
  const engagement = params.engagementLevel || 'professional';

  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        bufferPages: true,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      // Top colored accent bar
      doc.rect(50, 40, 495, 4).fill(theme.primaryHex);
      doc.moveDown(1.5);

      // Title & Subtitle
      doc
        .fontSize(24)
        .font('Helvetica-Bold')
        .fillColor(theme.primaryHex)
        .text(params.title, { align: 'center' });

      if (params.subtitle) {
        doc.moveDown(0.4);
        doc
          .fontSize(12)
          .font('Helvetica-Oblique')
          .fillColor('#475569')
          .text(params.subtitle, { align: 'center' });
      }

      doc.moveDown(0.8);

      // Metadata box
      if (params.metadata && Object.keys(params.metadata).length > 0) {
        const startY = doc.y;
        doc.rect(50, startY, 495, 68).fillAndStroke(theme.lightBgHex, '#E2E8F0');
        doc.rect(50, startY, 4, 68).fill(theme.primaryHex);

        doc.fontSize(9).font('Helvetica-Bold').fillColor(theme.primaryHex);

        Object.entries(params.metadata).forEach(([k, v], idx) => {
          const col = idx % 2;
          const row = Math.floor(idx / 2);
          const x = col === 0 ? 65 : 310;
          const y = startY + 10 + row * 18;
          doc.font('Helvetica-Bold').fillColor(theme.primaryHex).text(`${k}: `, x, y, { continued: true });
          doc.font('Helvetica').fillColor('#0F172A').text(v);
        });

        doc.y = startY + 80;
      }

      // Cover image if provided
      if (params.coverImage) {
        const coverBuf = await resolveImageBuffer(params.coverImage);
        if (coverBuf) {
          try {
            doc.image(coverBuf, {
              fit: [495, 200],
              align: 'center',
            });
            doc.moveDown(0.8);
          } catch (e) {
            console.warn('PDF cover image skipped:', e);
          }
        }
      }

      // Sections
      for (const section of params.sections) {
        if (doc.y > 680) doc.addPage();

        // Section Title
        doc.moveDown(0.8);
        doc
          .fontSize(15)
          .font('Helvetica-Bold')
          .fillColor(theme.primaryHex)
          .text(section.title);

        doc.rect(50, doc.y + 2, 495, 1.5).fill(theme.secondaryHex);
        doc.moveDown(0.6);

        // Section Content
        if (section.content) {
          const paragraphs = section.content.split('\n\n');
          doc.fontSize(10).font('Helvetica').fillColor('#1E293B').lineGap(3);
          for (const p of paragraphs) {
            if (!p.trim()) continue;
            if (doc.y > 700) doc.addPage();
            doc.text(p.trim());
            doc.moveDown(0.5);
          }
        }

        // Callouts (Definition cards, highlights)
        if (section.callouts && section.callouts.length > 0) {
          for (const c of section.callouts) {
            if (doc.y > 670) doc.addPage();
            const isDef = c.type === 'definition';
            const bg = isDef ? '#F0FDF4' : '#EFF6FF';
            const border = isDef ? '#10B981' : theme.primaryHex;
            const cY = doc.y;
            doc.rect(50, cY, 495, 48).fill(bg);
            doc.rect(50, cY, 4, 48).fill(border);

            if (c.title) {
              doc.fontSize(8.5).font('Helvetica-Bold').fillColor(border).text(c.title.toUpperCase(), 62, cY + 8);
            }
            doc
              .fontSize(9.5)
              .font(isDef ? 'Helvetica-Oblique' : 'Helvetica')
              .fillColor('#1E293B')
              .text(c.text, 62, cY + (c.title ? 22 : 14), { width: 470 });
            doc.y = cY + 56;
          }
        }

        // Section Embedded Images
        if (section.images && section.images.length > 0) {
          for (const img of section.images) {
            const buf = await resolveImageBuffer(img.url);
            if (buf) {
              if (doc.y > 540) doc.addPage();
              try {
                doc.image(buf, {
                  fit: [495, 230],
                  align: 'center',
                });
                doc.moveDown(0.4);
                if (img.caption) {
                  doc
                    .fontSize(8.5)
                    .font('Helvetica-Oblique')
                    .fillColor('#64748B')
                    .text(`Figure: ${img.caption}`, { align: 'center' });
                  doc.moveDown(0.6);
                }
              } catch (e) {
                console.warn('PDF image embedding skipped:', e);
              }
            }
          }
        }

        // Bullet points
        if (section.bulletPoints && section.bulletPoints.length > 0) {
          doc.fontSize(9.5).font('Helvetica').fillColor('#1E293B').lineGap(2);
          for (const bp of section.bulletPoints) {
            if (doc.y > 720) doc.addPage();
            doc.text(`•  ${bp}`, { indent: 15 });
            doc.moveDown(0.25);
          }
          doc.moveDown(0.4);
        }

        // Table
        if (section.table && section.table.headers.length > 0) {
          if (doc.y > 640) doc.addPage();
          doc.moveDown(0.5);
          const headers = section.table.headers;
          const rows = section.table.rows;
          const colWidth = 495 / headers.length;

          // Header
          const tableTop = doc.y;
          doc.rect(50, tableTop, 495, 22).fill(theme.primaryHex);
          doc.fontSize(9).font('Helvetica-Bold').fillColor('#FFFFFF');

          headers.forEach((h, i) => {
            doc.text(h, 50 + i * colWidth + 5, tableTop + 6, {
              width: colWidth - 10,
              align: 'left',
            });
          });

          let currentY = tableTop + 22;

          // Rows
          rows.forEach((row, rIdx) => {
            const isAlt = rIdx % 2 === 1;
            if (isAlt) {
              doc.rect(50, currentY, 495, 20).fill(theme.lightBgHex);
            }
            doc.rect(50, currentY, 495, 20).stroke('#CBD5E1');

            doc.fontSize(8.5).font('Helvetica').fillColor('#1E293B');
            row.forEach((cell, cIdx) => {
              doc.text(String(cell), 50 + cIdx * colWidth + 5, currentY + 5, {
                width: colWidth - 10,
                align: 'left',
              });
            });

            currentY += 20;
          });

          doc.y = currentY + 12;
        }
      }

      // References
      if (params.references && params.references.length > 0) {
        if (doc.y > 660) doc.addPage();
        doc.moveDown(0.8);
        doc.fontSize(14).font('Helvetica-Bold').fillColor(theme.primaryHex).text('References & Citations');
        doc.rect(50, doc.y + 2, 495, 1).fill('#94A3B8');
        doc.moveDown(0.5);

        doc.fontSize(9).font('Helvetica-Oblique').fillColor('#475569');
        for (const ref of params.references) {
          doc.text(`[Ref]  ${ref}`, { indent: 10 });
          doc.moveDown(0.2);
        }
      }

      // Add Page Numbers across all pages
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc
          .fontSize(8)
          .font('Helvetica')
          .fillColor('#94A3B8')
          .text(`HYNEX AI · Page ${i + 1} of ${range.count}`, 50, 790, {
            align: 'center',
            width: 495,
          });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Generates a real, valid Microsoft Excel (.xlsx) spreadsheet
 */
export async function createExcelBuffer(params: SpreadsheetParams): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'HYNEX AI Studio';
  workbook.created = new Date();

  const sheetsList =
    params.sheets && params.sheets.length > 0
      ? params.sheets
      : [
          {
            name: params.sheetName || 'Sheet 1',
            headers: params.headers || ['Column A', 'Column B'],
            rows: params.rows || [],
          },
        ];

  for (const sheetData of sheetsList) {
    const worksheet = workbook.addWorksheet(sheetData.name.slice(0, 31));

    // Title row
    worksheet.mergeCells(1, 1, 1, Math.max(sheetData.headers.length, 4));
    const titleCell = worksheet.getCell(1, 1);
    titleCell.value = `${params.title} — ${sheetData.name}`;
    titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F172A' },
    };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(1).height = 28;

    // Header row
    const headerRow = worksheet.getRow(3);
    sheetData.headers.forEach((headerText, colIdx) => {
      const cell = headerRow.getCell(colIdx + 1);
      cell.value = headerText;
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E293B' },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      };
    });
    headerRow.height = 24;

    // Data rows
    let currentR = 4;
    for (const r of sheetData.rows) {
      const row = worksheet.getRow(currentR);
      const isAlt = currentR % 2 === 1;

      r.forEach((val, cIdx) => {
        const cell = row.getCell(cIdx + 1);
        if (typeof val === 'string' && val.startsWith('=')) {
          cell.value = { formula: val.slice(1) };
          cell.font = { bold: true };
        } else {
          cell.value = val;
        }

        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };

        if (isAlt) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8FAFC' },
          };
        }
      });
      row.height = 20;
      currentR++;
    }

    // Auto-fit column widths
    worksheet.columns.forEach((column) => {
      let maxLen = 12;
      column.eachCell?.({ includeEmpty: true }, (cell) => {
        const len = cell.value ? String(cell.value).length : 0;
        if (len > maxLen) maxLen = Math.min(len + 4, 45);
      });
      column.width = maxLen;
    });
  }

  const uint8 = await workbook.xlsx.writeBuffer();
  return Buffer.from(uint8);
}

/**
 * Intelligent topic-based image generation engine
 * Generates topic-matched visual assets using the backend image synthesis pipeline.
 */
export async function generateTopicImages(
  prompts: Array<{ id: string; prompt: string; caption?: string; sectionIndex?: number; placement?: string }>,
  options?: { style?: string; imageType?: string }
): Promise<DocumentImageItem[]> {
  const results: DocumentImageItem[] = [];

  for (const item of prompts) {
    try {
      console.log(`[HYNEX AI Studio] Generating topic-matched image for: "${item.prompt.slice(0, 60)}..."`);
      let resolvedUrl = '';

      // 1. Try Wikimedia Commons first for real-world syllabus subjects (instant, authentic, peer-reviewed 960px diagrams/figures)
      try {
        const wikiUrl = await searchWikimediaImage(item.prompt, 960);
        if (wikiUrl) {
          resolvedUrl = wikiUrl;
        }
      } catch {
        // Non-blocking fallback
      }

      // 2. If no Wikimedia figure, generate custom labeled academic SVG diagram & rasterize to PNG with sharp
      if (!resolvedUrl) {
        try {
          resolvedUrl = await generateStudioVectorRaster(
            item.prompt,
            960,
            540,
            options?.style || 'academic textbook diagram'
          );
        } catch {
          // Non-blocking fallback
        }
      }

      // 3. Fallback to Gemini image generator if vector raster failed
      if (!resolvedUrl) {
        const styleTag = options?.style || 'realistic educational';
        const promptText = `${item.prompt}, ${styleTag}, clear educational diagram or illustration, accurate scientific and academic detail, highly informative, clean white or modern background`;

        const genResult = await generateGeminiImage(promptText, '16:9', {
          autoEnhance: false,
          style: options?.style || 'flux',
        });

        if (genResult && genResult.imageUrl) {
          resolvedUrl = genResult.imageUrl;
        }
      }

      if (resolvedUrl) {
        results.push({
          id: item.id || `img_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          url: resolvedUrl,
          caption: item.caption || item.prompt.slice(0, 50),
          placement: (item.placement as any) || 'below_heading',
          sectionIndex: item.sectionIndex ?? 0,
          prompt: item.prompt,
          status: 'ready',
        });
      } else {
        throw new Error('Image generation could not resolve asset');
      }
    } catch (err: any) {
      console.warn(`[HYNEX AI Studio] Image generation failed for prompt: "${item.prompt.slice(0, 40)}"`, err);
      // Preserve error details without crashing the document generation!
      results.push({
        id: item.id || `img_fail_${Date.now()}`,
        url: '',
        caption: item.caption,
        sectionIndex: item.sectionIndex ?? 0,
        prompt: item.prompt,
        status: 'failed',
        error: err?.message || 'Image generation timed out or quota was reached',
      });
    }
  }

  return results;
}

export interface SynthesizeAssignmentInput {
  topic: string;
  subject?: string;
  gradeClass?: string;
  board?: string;
  language?: string;
  detailLevel?: string;
  pageTarget?: number;
  teacherInstructions?: string;
  studentName?: string;
  rollNumber?: string;
  includeImages?: boolean;
  imageOptions?: {
    types?: string[];
    quantity?: 'few' | 'balanced' | 'more';
    style?: string;
    placement?: string;
  };
  engagementLevel?: EngagementLevel;
  theme?: DocumentTheme;
}

/**
 * AI Synthesizer: Generates academically verified assignment material with callouts & topic-matched images
 */
export async function synthesizeAssignment(input: SynthesizeAssignmentInput): Promise<AssignmentParams> {
  const ai = getGeminiClient();
  const engagement = input.engagementLevel || 'professional';
  const includeImages = Boolean(input.includeImages);

  const prompt = `You are a distinguished academic curriculum director specialized in the ${input.board || 'State & CBSE'} syllabus.
Synthesize a comprehensive, factual, student-ready assignment on:
Topic: "${input.topic}"
Subject: "${input.subject || 'Science'}"
Grade/Class: "${input.gradeClass || 'Class 10'}"
Board: "${input.board || 'Maharashtra State Board'}"
Language: "${input.language || 'English'}"
Detail Level: "${input.detailLevel || 'detailed'}"
Target Pages: ${input.pageTarget || 3}
Engagement Design Level: "${engagement}" (includes definition cards, key takeaways, and comparison tables)
Include Visual Images: ${includeImages}
Teacher Instructions: "${input.teacherInstructions || 'Standard curriculum grading rubric'}"

Return ONLY a valid JSON object matching this schema:
{
  "title": "Clear Formal Assignment Title",
  "subject": "${input.subject || 'Science'}",
  "gradeClass": "${input.gradeClass || 'Class 10'}",
  "board": "${input.board || 'Maharashtra State Board'}",
  "studentName": "${input.studentName || ''}",
  "rollNumber": "${input.rollNumber || ''}",
  "submissionDate": "${new Date().toLocaleDateString()}",
  "sections": [
    {
      "title": "1. Introduction & Conceptual Framework",
      "level": 1,
      "content": "Detailed overview...",
      "bulletPoints": ["Key objective 1", "Key objective 2"],
      "callouts": [
        {
          "type": "definition",
          "title": "Core Definition",
          "text": "Formal syllabus definition..."
        }
      ]
    },
    {
      "title": "2. Theoretical Foundations & Classification",
      "level": 1,
      "content": "In-depth core academic material...",
      "table": {
        "headers": ["Concept", "Scientific Definition", "Curriculum Application"],
        "rows": [
          ["Term A", "Definition A", "Context A"],
          ["Term B", "Definition B", "Context B"]
        ]
      },
      "callouts": [
        {
          "type": "key_takeaway",
          "title": "Critical Syllabus Takeaways",
          "text": "Key points for examination revision..."
        }
      ]
    },
    {
      "title": "3. Case Studies & Practical Applications",
      "level": 1,
      "content": "Realistic examples explaining the phenomena...",
      "bulletPoints": ["Key observation 1", "Key observation 2"]
    },
    {
      "title": "4. Conclusion & Critical Analysis",
      "level": 1,
      "content": "Summary of findings and learnings..."
    }
  ],
  "suggestedImages": [
    {
      "prompt": "Clear topic-matched prompt for a realistic educational illustration or diagram",
      "caption": "Figure 1: Explanatory caption",
      "sectionIndex": 0
    },
    {
      "prompt": "Second topic-matched prompt for a classification or process diagram",
      "caption": "Figure 2: Explanatory caption",
      "sectionIndex": 1
    }
  ],
  "references": [
    "${input.board || 'Maharashtra State Board'} Official Textbook for ${input.subject || 'Science'}",
    "National Academic Reference Repository & NCERT Chapter Standards"
  ]
}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { responseMimeType: 'application/json' },
    });

    const parsed = JSON.parse(response.text || '{}');
    const sections: DocumentSection[] = parsed.sections || [
      {
        title: 'Introduction',
        content: `Assignment on ${input.topic} for ${input.subject} (${input.board}).`,
      },
    ];

    // If images requested, generate actual image assets!
    let generatedImages: DocumentImageItem[] = [];
    if (includeImages && parsed.suggestedImages && Array.isArray(parsed.suggestedImages)) {
      const quantityLimit = input.imageOptions?.quantity === 'few' ? 1 : input.imageOptions?.quantity === 'more' ? 3 : 2;
      const imageSpecs = parsed.suggestedImages.slice(0, quantityLimit).map((s: any, idx: number) => ({
        id: `img_asgn_${idx}_${Date.now()}`,
        prompt: s.prompt || `${input.topic} educational diagram`,
        caption: s.caption || `Figure ${idx + 1}: ${input.topic}`,
        sectionIndex: typeof s.sectionIndex === 'number' ? s.sectionIndex : idx,
        placement: input.imageOptions?.placement || 'below_heading',
      }));

      generatedImages = await generateTopicImages(imageSpecs, {
        style: input.imageOptions?.style || 'professional',
      });

      // Attach generated images to their corresponding sections
      for (const img of generatedImages) {
        if (img.status === 'ready' && img.url) {
          const targetSection = sections[img.sectionIndex || 0] || sections[0];
          if (!targetSection.images) targetSection.images = [];
          targetSection.images.push(img);
        }
      }
    }

    return {
      title: parsed.title || input.topic,
      subject: parsed.subject || input.subject || 'Science',
      gradeClass: parsed.gradeClass || input.gradeClass || 'Class 10',
      board: parsed.board || input.board || 'Maharashtra State Board',
      studentName: input.studentName,
      rollNumber: input.rollNumber,
      submissionDate: new Date().toLocaleDateString(),
      sections,
      references: parsed.references || [
        `${input.board} Standard Textbook for ${input.subject}`,
      ],
      theme: input.theme || 'academic_green',
      engagementLevel: engagement,
      images: generatedImages,
      coverImage: generatedImages.find((i) => i.status === 'ready')?.url,
    };
  } catch (err) {
    console.warn('Fallback assignment synthesis triggered:', err);
    return {
      title: `${input.topic} — ${input.subject || 'Academic'} Assignment`,
      subject: input.subject || 'Science',
      gradeClass: input.gradeClass || 'Class 10',
      board: input.board || 'Maharashtra State Board',
      studentName: input.studentName,
      rollNumber: input.rollNumber,
      submissionDate: new Date().toLocaleDateString(),
      sections: [
        {
          title: '1. Introduction & Background',
          level: 1,
          content: `${input.topic} is a foundational concept in ${input.subject || 'the curriculum'} under the ${input.board || 'Board'} curriculum for ${input.gradeClass || 'students'}. This assignment explores core principles, systematic classifications, and practical real-world significance.`,
          bulletPoints: [
            'Understanding fundamental definitions and historical context',
            'Applying conceptual frameworks to academic problem solving',
            'Analyzing experimental and theoretical evidence',
          ],
          callouts: [
            {
              type: 'definition',
              title: 'Key Terminology',
              text: `${input.topic}: Key governing concept defining operational dynamics in ${input.subject || 'the domain'}.`,
            },
          ],
        },
        {
          title: '2. Core Principles & Analysis',
          level: 1,
          content: `In standard syllabi, thorough mastery of ${input.topic} requires examining primary mechanisms, comparative classifications, and cause-and-effect relationships.`,
          table: {
            headers: ['Component', 'Scientific / Academic Role', 'Real-world Application'],
            rows: [
              ['Primary Factor', 'Core driving mechanism', 'Fundamental observation in syllabus experiments'],
              ['Secondary Factor', 'Regulatory and stabilizing condition', 'Industrial and ecological context'],
              ['Observed Outcome', 'Quantifiable result', 'Measurement standard in examinations'],
            ],
          },
          callouts: [
            {
              type: 'key_takeaway',
              title: 'Examination Takeaway',
              text: 'Ensure clear differentiation between primary mechanisms and empirical experimental factors during evaluation.',
            },
          ],
        },
        {
          title: '3. Real-World Applications & Examples',
          level: 1,
          content: `Practical applications of ${input.topic} demonstrate its relevance beyond textbook theory, illustrating how concepts drive modern technology and societal progress.`,
          bulletPoints: [
            'Case Study 1: Laboratory validation and textbook standard methodology',
            'Case Study 2: Practical implementation in contemporary industry',
          ],
        },
        {
          title: '4. Summary & Conclusion',
          level: 1,
          content: `In summary, this assignment on ${input.topic} establishes comprehensive understanding across all parameters specified by the instructor. Continuous revision and analytical inquiry reinforce academic excellence.`,
        },
      ],
      references: [
        `${input.board || 'State'} Standard Textbook for ${input.subject || 'Curriculum'} (${input.gradeClass || 'General'})`,
        'National Academic Digital Repository & Educational Standards Board',
      ],
      theme: input.theme || 'academic_green',
      engagementLevel: engagement,
      images: [],
    };
  }
}

/**
 * AI Synthesizer: Generates Presentation Outline, Slide content, and Slide visuals
 */
export async function synthesizePresentation(input: {
  topic: string;
  slideCount?: number;
  audience?: string;
  theme?: 'dark' | 'academic' | 'indigo' | 'corporate' | 'emerald' | DocumentTheme;
  language?: string;
  aspectRatio?: '16:9' | '4:3';
  includeImages?: boolean;
  imageStyle?: string;
}): Promise<PresentationParams> {
  const ai = getGeminiClient();
  const count = Math.min(Math.max(input.slideCount || 6, 4), 16);
  const includeImages = Boolean(input.includeImages);

  const prompt = `You are a world-class presentation designer and executive slide deck architect.
Create an engaging, modern ${count}-slide presentation deck.
Topic: "${input.topic}"
Target Audience: "${input.audience || 'Students and Professionals'}"
Language: "${input.language || 'English'}"
Include Visual Slide Focus: ${includeImages}

Generate exactly ${count} slides with a mix of layout types ('title', 'content', 'cards', 'two_column', 'image_focus', 'conclusion').
Include speaker notes for each slide.
If Include Visual Slide Focus is true, provide an "imagePrompt" and "imageCaption" for 2-3 key visual slides.

Return ONLY a valid JSON object matching this schema:
{
  "title": "Compelling Presentation Title",
  "subtitle": "Informative Subtitle",
  "theme": "${input.theme || 'academic_green'}",
  "aspectRatio": "${input.aspectRatio || '16:9'}",
  "slides": [
    {
      "title": "Title Slide Title",
      "subtitle": "Subtitle",
      "layout": "title",
      "speakerNotes": "Welcome everyone..."
    },
    {
      "title": "Core Problem & Thesis",
      "layout": "image_focus",
      "bulletPoints": ["Point 1", "Point 2", "Point 3"],
      "imagePrompt": "Topic-matched illustration or diagram prompt",
      "imageCaption": "Overview visual diagram",
      "speakerNotes": "Here we frame the central challenge..."
    },
    {
      "title": "Strategic Framework",
      "layout": "cards",
      "cards": [
        { "title": "Pillar 1", "text": "Detailed explanation..." },
        { "title": "Pillar 2", "text": "Detailed explanation..." },
        { "title": "Pillar 3", "text": "Detailed explanation..." }
      ],
      "speakerNotes": "These three pillars form our foundation..."
    },
    {
      "title": "Summary & Next Steps",
      "layout": "conclusion",
      "bulletPoints": ["Key action 1", "Key action 2"],
      "speakerNotes": "In closing..."
    }
  ]
}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { responseMimeType: 'application/json' },
    });

    const parsed = JSON.parse(response.text || '{}');
    const slides: PresentationSlide[] = parsed.slides || [];

    // Generate real images for slides with image prompts if requested
    if (includeImages) {
      const imageSlides = slides.filter((s: any) => Boolean(s.imagePrompt)).slice(0, 3);
      for (const s of imageSlides) {
        try {
          const gen = await generateGeminiImage(
            `${(s as any).imagePrompt}, presentation slide visual, high quality, modern aesthetic, clean composition`,
            '16:9',
            { style: input.imageStyle || 'flux' }
          );
          if (gen && gen.imageUrl) {
            s.imageUrl = gen.imageUrl;
          }
        } catch (e) {
          console.warn('Slide image generation skipped:', e);
        }
      }
    }

    return {
      title: parsed.title || input.topic,
      subtitle: parsed.subtitle,
      aspectRatio: input.aspectRatio || '16:9',
      theme: input.theme || 'academic_green',
      slides,
    };
  } catch (err) {
    console.warn('Fallback presentation synthesis triggered:', err);
    return {
      title: input.topic,
      subtitle: 'Executive Presentation · HYNEX AI Studio',
      aspectRatio: input.aspectRatio || '16:9',
      theme: input.theme || 'academic_green',
      slides: [
        {
          title: input.topic,
          subtitle: 'Executive Overview & Strategic Analysis',
          layout: 'title',
          speakerNotes: `Welcome everyone to this presentation on ${input.topic}.`,
        },
        {
          title: 'Problem Context & Opportunities',
          layout: 'content',
          bulletPoints: [
            `Current state and key dynamics governing ${input.topic}`,
            'Key friction points identified across implementation workflows',
            'Opportunities for measurable acceleration and improvement',
          ],
          speakerNotes: 'Set the stage by outlining current industry bottlenecks.',
        },
        {
          title: 'Strategic Pillars & Methodology',
          layout: 'cards',
          cards: [
            { title: 'Analysis', text: 'Systematic evaluation of underlying parameters and empirical data' },
            { title: 'Architecture', text: 'Modular, scalable foundations engineered for high-throughput resilience' },
            { title: 'Execution', text: 'Iterative milestones with continuous verification and measurable KPIs' },
          ],
          speakerNotes: 'Walk the audience through each core strategic pillar.',
        },
        {
          title: 'Summary & Key Takeaways',
          layout: 'conclusion',
          bulletPoints: [
            `Comprehensive mastery of ${input.topic} yields significant competitive leverage`,
            'Adopt structured evaluation criteria and continuous feedback cycles',
          ],
          speakerNotes: 'Summarize key takeaways and open the floor for discussion.',
        },
      ],
    };
  }
}

/**
 * AI Synthesizer: Generates Spreadsheet structure, rows, and formulas
 */
export async function synthesizeSpreadsheet(input: {
  topic: string;
  category?: string;
  rowCount?: number;
  language?: string;
}): Promise<SpreadsheetParams> {
  const ai = getGeminiClient();
  const targetRows = Math.min(Math.max(input.rowCount || 10, 5), 35);

  const prompt = `You are a financial analyst, operations lead, and Google Sheets/Excel formula master.
Generate a structured, professional spreadsheet for:
Topic: "${input.topic}"
Category: "${input.category || 'General / Business'}"
Target Rows: ${targetRows}
Language: "${input.language || 'English'}"

Create a clean table with appropriate columns and realistic data.
Include at least one column with an Excel formula (e.g. "=SUM(C4:E4)" or "=C4*D4" or "=AVERAGE(D4:F4)").
Rows start at index 4 (Row 1 is Title, Row 3 is Header).

Return ONLY valid JSON matching this schema:
{
  "title": "Spreadsheet Title",
  "sheetName": "Primary Worksheet",
  "headers": ["Col 1", "Col 2", "Col 3", "Col 4", "Total / Formula"],
  "rows": [
    ["Item A", 100, 250, 400, "=SUM(B4:D4)"],
    ["Item B", 120, 260, 420, "=SUM(B5:D5)"]
  ]
}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { responseMimeType: 'application/json' },
    });

    const parsed = JSON.parse(response.text || '{}');
    return {
      title: parsed.title || input.topic,
      sheetName: parsed.sheetName || 'Data Sheet',
      headers: parsed.headers || ['Item', 'Category', 'Quantity', 'Unit Cost', 'Total'],
      rows: parsed.rows || [
        ['Item 1', 'Standard', 10, 50, '=C4*D4'],
        ['Item 2', 'Premium', 5, 120, '=C5*D5'],
      ],
    };
  } catch (err) {
    console.warn('Fallback spreadsheet synthesis triggered:', err);
    return {
      title: `${input.topic} Tracker`,
      sheetName: 'Overview',
      headers: ['Index', 'Description', 'Q1 Estimate', 'Q2 Estimate', 'Projected Total'],
      rows: [
        ['01', 'Operational Logistics', 1200, 1450, '=SUM(C4:D4)'],
        ['02', 'Academic Materials', 800, 950, '=SUM(C5:D5)'],
        ['03', 'Hardware & Infrastructure', 2500, 2800, '=SUM(C6:D6)'],
        ['04', 'Quality Assurance & Testing', 600, 750, '=SUM(C7:D7)'],
      ],
    };
  }
}
