import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Presentation,
  Table as TableIcon,
  Sparkles,
  Download,
  GraduationCap,
  Layers,
  Search,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  RefreshCw,
  FolderOpen,
  Filter,
  Check,
  Sliders,
  ChevronDown,
  ChevronUp,
  Palette,
  Eye,
  Edit3,
  Plus,
  X,
  Image as ImageIcon,
  RotateCw,
  SlidersHorizontal,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { User, UsageState } from '../types/index.ts';

interface DocumentStudioProps {
  currentUser?: User | null;
  usage?: UsageState | null;
  onRefreshUsage?: () => void;
}

export type DocumentTheme =
  | 'academic_green'
  | 'modern_blue'
  | 'elegant_purple'
  | 'minimal_bw'
  | 'warm_neutral'
  | 'creative_colorful'
  | 'corporate';

export type EngagementLevel = 'simple' | 'professional' | 'creative';

const THEME_OPTIONS: Array<{ id: DocumentTheme; name: string; primary: string; secondary: string }> = [
  { id: 'academic_green', name: 'Academic Green', primary: '#059669', secondary: '#10b981' },
  { id: 'modern_blue', name: 'Modern Blue', primary: '#2563eb', secondary: '#60a5fa' },
  { id: 'elegant_purple', name: 'Elegant Purple', primary: '#7c3aed', secondary: '#a78bfa' },
  { id: 'minimal_bw', name: 'Minimal B&W', primary: '#0f172a', secondary: '#64748b' },
  { id: 'warm_neutral', name: 'Warm Neutral', primary: '#d97706', secondary: '#f59e0b' },
  { id: 'creative_colorful', name: 'Creative Colorful', primary: '#ec4899', secondary: '#f43f5e' },
  { id: 'corporate', name: 'Corporate', primary: '#0284c7', secondary: '#38bdf8' },
];

const IMAGE_TYPES = [
  'Realistic educational images',
  'Scientific illustrations',
  'Diagrams',
  'Infographics',
  'Charts and graphs',
  'Historical images',
  'Maps and timelines',
  'Cartoon illustrations',
  'Professional business images',
  'AI-generated images',
];

export const DocumentStudio: React.FC<DocumentStudioProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<
    'universal' | 'assignment' | 'presentation' | 'spreadsheet' | 'improve' | 'files'
  >('universal');

  // ==========================================
  // Global Document Preferences & State
  // ==========================================
  // Image Preference: 'with_images' | 'without_images'
  const [includeImages, setIncludeImages] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('hynex_doc_image_pref');
      if (saved === 'prefer_images') return true;
      if (saved === 'prefer_text') return false;
    } catch {}
    return true; // default: engaging with images
  });

  const [defaultImagePref, setDefaultImagePref] = useState<'always_ask' | 'prefer_images' | 'prefer_text'>(() => {
    try {
      const saved = localStorage.getItem('hynex_doc_default_pref');
      if (saved === 'prefer_images' || saved === 'prefer_text' || saved === 'always_ask') {
        return saved;
      }
    } catch {}
    return 'always_ask';
  });

  const [skipReviewStep, setSkipReviewStep] = useState<boolean>(() => {
    try {
      return localStorage.getItem('hynex_doc_skip_review') === 'true';
    } catch {}
    return false;
  });

  // Selected Theme & Engagement
  const [selectedTheme, setSelectedTheme] = useState<DocumentTheme>('academic_green');
  const [engagementLevel, setEngagementLevel] = useState<EngagementLevel>('professional');

  // Image Customization Options
  const [showImageCustomizer, setShowImageCustomizer] = useState(false);
  const [selectedImageTypes, setSelectedImageTypes] = useState<string[]>([
    'Scientific illustrations',
    'Diagrams',
    'Realistic educational images',
  ]);
  const [imageQuantity, setImageQuantity] = useState<'few' | 'balanced' | 'more'>('balanced');
  const [imageStyle, setImageStyle] = useState<string>('Professional');
  const [imagePlacement, setImagePlacement] = useState<string>('auto');

  // Universal Creator State
  const [universalPrompt, setUniversalPrompt] = useState('');
  const [universalFormat, setUniversalFormat] = useState('auto');
  const [universalLoading, setUniversalLoading] = useState(false);
  const [universalResult, setUniversalResult] = useState<any>(null);
  const [universalError, setUniversalError] = useState<string | null>(null);

  // Assignment Maker State
  const [asgnTopic, setAsgnTopic] = useState('');
  const [asgnSubject, setAsgnSubject] = useState('Science');
  const [asgnGrade, setAsgnGrade] = useState('Class 10');
  const [asgnBoard, setAsgnBoard] = useState('Maharashtra State Board');
  const [asgnLang, setAsgnLang] = useState('English');
  const [asgnPages, setAsgnPages] = useState(3);
  const [asgnStudentName, setAsgnStudentName] = useState(currentUser?.displayName || '');
  const [asgnRollNo, setAsgnRollNo] = useState('');
  const [asgnInstructions, setAsgnInstructions] = useState('');
  const [asgnLoading, setAsgnLoading] = useState(false);
  const [asgnResult, setAsgnResult] = useState<any>(null);
  const [asgnError, setAsgnError] = useState<string | null>(null);

  // Presentation Maker State
  const [presTopic, setPresTopic] = useState('');
  const [presSlides, setPresSlides] = useState(6);
  const [presAudience, setPresAudience] = useState('College Students & Instructors');
  const [presAspect, setPresAspect] = useState<'16:9' | '4:3'>('16:9');
  const [presLoading, setPresLoading] = useState(false);
  const [presResult, setPresResult] = useState<any>(null);
  const [presActiveSlide, setPresActiveSlide] = useState(0);
  const [presError, setPresError] = useState<string | null>(null);

  // Spreadsheet Maker State
  const [sheetTopic, setSheetTopic] = useState('');
  const [sheetCategory, setSheetCategory] = useState('budget');
  const [sheetRows, setSheetRows] = useState(10);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetResult, setSheetResult] = useState<any>(null);
  const [sheetError, setSheetError] = useState<string | null>(null);

  // AI Improve State
  const [improveText, setImproveText] = useState('');
  const [improveAction, setImproveAction] = useState('academic_tone');
  const [improveLoading, setImproveLoading] = useState(false);
  const [improvedResult, setImprovedResult] = useState<string | null>(null);
  const [improveError, setImproveError] = useState<string | null>(null);

  // ==========================================
  // Image Review Step & In-line Document Editor State
  // ==========================================
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewImages, setReviewImages] = useState<any[]>([]);
  const [reviewDocContext, setReviewDocContext] = useState<any>(null);
  const [regeneratingImgId, setRegeneratingImgId] = useState<string | null>(null);
  const [replacingImgId, setReplacingImgId] = useState<string | null>(null);
  const [customPromptInput, setCustomPromptInput] = useState('');
  const [newImagePromptInput, setNewImagePromptInput] = useState('');
  const [isAddingNewImage, setIsAddingNewImage] = useState(false);
  const [compilingFinal, setCompilingFinal] = useState(false);

  // Document In-line Preview & Editing
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [activePreviewDoc, setActivePreviewDoc] = useState<any>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingSections, setEditingSections] = useState<any[]>([]);

  // My Files State
  const [myFiles, setMyFiles] = useState<any[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [fileFilter, setFileFilter] = useState('all');
  const [fileSearch, setFileSearch] = useState('');

  // Notification Toast
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const saveDefaultPref = (val: 'always_ask' | 'prefer_images' | 'prefer_text') => {
    setDefaultImagePref(val);
    try {
      localStorage.setItem('hynex_doc_default_pref', val);
      if (val === 'prefer_images') {
        setIncludeImages(true);
        localStorage.setItem('hynex_doc_image_pref', 'prefer_images');
      } else if (val === 'prefer_text') {
        setIncludeImages(false);
        localStorage.setItem('hynex_doc_image_pref', 'prefer_text');
      }
    } catch {}
    showToast(`Default preference updated: ${val.replace('_', ' ')}`);
  };

  const toggleSkipReview = (checked: boolean) => {
    setSkipReviewStep(checked);
    try {
      localStorage.setItem('hynex_doc_skip_review', String(checked));
    } catch {}
    showToast(checked ? 'Fast mode: review step skipped' : 'Review step enabled');
  };

  const loadMyFiles = async () => {
    setFilesLoading(true);
    try {
      const res = await api.documents.getMyFiles();
      setMyFiles(res.files || []);
    } catch (err) {
      console.warn('Failed to fetch user files:', err);
    } finally {
      setFilesLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'files') {
      loadMyFiles();
    }
  }, [activeTab]);

  // ==========================================
  // Image Review Actions
  // ==========================================
  const handleRegenerateImage = async (imgItem: any) => {
    setRegeneratingImgId(imgItem.id);
    try {
      const res = await api.documents.generateSingleImage({
        prompt: imgItem.prompt || imgItem.caption || 'Scientific diagram',
        style: imageStyle,
        aspectRatio: '16:9',
      });
      if (res.success && res.image) {
        setReviewImages((prev) =>
          prev.map((i) => (i.id === imgItem.id ? { ...i, url: res.image.url, status: 'ready', error: undefined } : i))
        );
        showToast('Image regenerated successfully!');
      }
    } catch (err: any) {
      showToast(`Regeneration failed: ${err.message || 'Please retry'}`);
    } finally {
      setRegeneratingImgId(null);
    }
  };

  const handleReplaceImagePrompt = async (imgId: string) => {
    if (!customPromptInput.trim()) return;
    setRegeneratingImgId(imgId);
    try {
      const res = await api.documents.generateSingleImage({
        prompt: customPromptInput.trim(),
        style: imageStyle,
        aspectRatio: '16:9',
      });
      if (res.success && res.image) {
        setReviewImages((prev) =>
          prev.map((i) =>
            i.id === imgId
              ? { ...i, url: res.image.url, prompt: customPromptInput.trim(), caption: customPromptInput.slice(0, 40), status: 'ready' }
              : i
          )
        );
        setReplacingImgId(null);
        setCustomPromptInput('');
        showToast('Image replaced successfully!');
      }
    } catch (err: any) {
      showToast(`Failed to replace image: ${err.message}`);
    } finally {
      setRegeneratingImgId(null);
    }
  };

  const handleRemoveImage = (imgId: string) => {
    setReviewImages((prev) => prev.filter((i) => i.id !== imgId));
    showToast('Image removed from document.');
  };

  const handleAddNewImage = async () => {
    if (!newImagePromptInput.trim()) return;
    setRegeneratingImgId('new');
    try {
      const res = await api.documents.generateSingleImage({
        prompt: newImagePromptInput.trim(),
        style: imageStyle,
        aspectRatio: '16:9',
      });
      if (res.success && res.image) {
        setReviewImages((prev) => [
          ...prev,
          {
            id: res.image.id,
            url: res.image.url,
            prompt: newImagePromptInput.trim(),
            caption: newImagePromptInput.slice(0, 40),
            sectionIndex: 0,
            placement: 'below_heading',
            status: 'ready',
          },
        ]);
        setNewImagePromptInput('');
        setIsAddingNewImage(false);
        showToast('New image added to document!');
      }
    } catch (err: any) {
      showToast(`Failed to add image: ${err.message}`);
    } finally {
      setRegeneratingImgId(null);
    }
  };

  const handleApproveAndCompile = async (formatOverride?: 'docx' | 'pdf' | 'pptx') => {
    if (!reviewDocContext) return;
    setCompilingFinal(true);
    try {
      const targetFormat = formatOverride || reviewDocContext.preferredFormat || 'docx';
      const approvedValidImages = reviewImages.filter((i) => i.status === 'ready' && i.url);

      const res = await api.documents.compileFinal({
        title: reviewDocContext.title,
        subtitle: reviewDocContext.subtitle,
        format: targetFormat,
        metadata: reviewDocContext.metadata,
        sections: reviewDocContext.sections?.map((s: any, idx: number) => ({
          ...s,
          images: approvedValidImages.filter((img) => img.sectionIndex === idx),
        })),
        references: reviewDocContext.references,
        theme: selectedTheme,
        engagementLevel,
        coverImage: approvedValidImages[0]?.url,
        slides: reviewDocContext.slides,
        sheets: reviewDocContext.sheets,
      });

      if (res.success) {
        showToast(`Compiled ${targetFormat.toUpperCase()} successfully!`);
        setReviewModalOpen(false);
        window.open(res.downloadUrl, '_blank');
        loadMyFiles();
      }
    } catch (err: any) {
      showToast(`Compilation failed: ${err.message}`);
    } finally {
      setCompilingFinal(false);
    }
  };

  // ==========================================
  // Document Creation Handlers
  // ==========================================
  const handleUniversalCreate = async (customPrompt?: string) => {
    const textToSubmit = customPrompt || universalPrompt;
    if (!textToSubmit.trim()) return;

    setUniversalLoading(true);
    setUniversalError(null);
    setUniversalResult(null);

    try {
      const res = await api.documents.universalCreate({
        prompt: textToSubmit.trim(),
        formatPreference: universalFormat,
        includeImages,
        imageOptions: {
          types: selectedImageTypes,
          quantity: imageQuantity,
          style: imageStyle,
          placement: imagePlacement,
        },
        engagementLevel,
        theme: selectedTheme,
      });

      setUniversalResult(res);
      showToast(`Generated ${res.docType.toUpperCase()} file successfully!`);

      // If document includes images and user didn't skip review, open review panel
      if (includeImages && !skipReviewStep && res.preview?.images?.length) {
        setReviewImages(res.preview.images);
        setReviewDocContext({
          title: res.preview.title,
          subtitle: res.preview.subtitle || `${res.preview.subject || 'Document'} — ${res.preview.board || ''}`,
          preferredFormat: universalFormat === 'pdf' ? 'pdf' : 'docx',
          metadata: {
            Subject: res.preview.subject,
            Board: res.preview.board,
            Date: new Date().toLocaleDateString(),
          },
          sections: res.preview.sections,
          references: res.preview.references,
        });
        setReviewModalOpen(true);
      }
    } catch (err: any) {
      setUniversalError(err.message || 'Failed to create document.');
    } finally {
      setUniversalLoading(false);
    }
  };

  const handleGenerateAssignment = async () => {
    if (!asgnTopic.trim()) {
      setAsgnError('Please enter an assignment topic.');
      return;
    }

    setAsgnLoading(true);
    setAsgnError(null);
    setAsgnResult(null);

    try {
      const res = await api.documents.generateAssignment({
        topic: asgnTopic.trim(),
        subject: asgnSubject,
        gradeClass: asgnGrade,
        board: asgnBoard,
        language: asgnLang,
        pageTarget: asgnPages,
        studentName: asgnStudentName,
        rollNumber: asgnRollNo,
        teacherInstructions: asgnInstructions,
        exportFormat: 'both',
        includeImages,
        imageOptions: {
          types: selectedImageTypes,
          quantity: imageQuantity,
          style: imageStyle,
          placement: imagePlacement,
        },
        engagementLevel,
        theme: selectedTheme,
      });

      setAsgnResult(res);
      showToast(`Created ${asgnBoard} assignment with DOCX & PDF!`);

      // If images were generated and review step not skipped, open review panel
      if (includeImages && !skipReviewStep && res.assignment?.images?.length) {
        setReviewImages(res.assignment.images);
        setReviewDocContext({
          title: res.assignment.title,
          subtitle: `${asgnSubject} (${asgnGrade}) — ${asgnBoard}`,
          preferredFormat: 'docx',
          metadata: {
            'Student Name': asgnStudentName || 'Student',
            'Roll Number': asgnRollNo || 'N/A',
            Subject: asgnSubject,
            Board: asgnBoard,
            Date: new Date().toLocaleDateString(),
          },
          sections: res.assignment.sections,
          references: res.assignment.references,
        });
        setReviewModalOpen(true);
      }
    } catch (err: any) {
      setAsgnError(err.message || 'Failed to generate assignment.');
    } finally {
      setAsgnLoading(false);
    }
  };

  const handleGeneratePresentation = async () => {
    if (!presTopic.trim()) {
      setPresError('Please enter a presentation topic.');
      return;
    }

    setPresLoading(true);
    setPresError(null);
    setPresResult(null);

    try {
      const res = await api.documents.generatePresentation({
        topic: presTopic.trim(),
        slideCount: presSlides,
        audience: presAudience,
        theme: selectedTheme,
        aspectRatio: presAspect,
        includeImages,
        imageStyle,
      });

      setPresResult(res);
      setPresActiveSlide(0);
      showToast('Generated editable PowerPoint (.pptx) deck!');
    } catch (err: any) {
      setPresError(err.message || 'Failed to generate presentation.');
    } finally {
      setPresLoading(false);
    }
  };

  const handleGenerateSpreadsheet = async () => {
    if (!sheetTopic.trim()) {
      setSheetError('Please enter a spreadsheet topic.');
      return;
    }

    setSheetLoading(true);
    setSheetError(null);
    setSheetResult(null);

    try {
      const res = await api.documents.generateSpreadsheet({
        topic: sheetTopic.trim(),
        category: sheetCategory,
        rowCount: sheetRows,
      });

      setSheetResult(res);
      showToast('Generated Excel spreadsheet (.xlsx) with formulas!');
    } catch (err: any) {
      setSheetError(err.message || 'Failed to generate spreadsheet.');
    } finally {
      setSheetLoading(false);
    }
  };

  const handleAiImprove = async () => {
    if (!improveText.trim()) {
      setImproveError('Please enter or paste text to improve.');
      return;
    }

    setImproveLoading(true);
    setImproveError(null);
    setImprovedResult(null);

    try {
      const res = await api.documents.aiImprove({
        text: improveText.trim(),
        action: improveAction,
      });

      setImprovedResult(res.improvedText);
      showToast('Text improved and formatted!');
    } catch (err: any) {
      setImproveError(err.message || 'Failed to improve text.');
    } finally {
      setImproveLoading(false);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      await api.documents.deleteFile(fileId);
      setMyFiles((prev) => prev.filter((f) => f.id !== fileId));
      showToast('File deleted.');
    } catch (err) {
      showToast('Failed to delete file.');
    }
  };

  const openPreviewModal = (docData: any) => {
    setActivePreviewDoc(docData);
    setEditingTitle(docData.title || '');
    setEditingSections(docData.sections ? JSON.parse(JSON.stringify(docData.sections)) : []);
    setPreviewModalOpen(true);
  };

  // Filtered files list
  const filteredFiles = myFiles.filter((f) => {
    const matchesFilter =
      fileFilter === 'all' ||
      (fileFilter === 'docx' && f.name.endsWith('.docx')) ||
      (fileFilter === 'pdf' && f.name.endsWith('.pdf')) ||
      (fileFilter === 'pptx' && f.name.endsWith('.pptx')) ||
      (fileFilter === 'xlsx' && f.name.endsWith('.xlsx'));

    const matchesSearch =
      !fileSearch.trim() || f.name.toLowerCase().includes(fileSearch.toLowerCase().trim());

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] overflow-y-auto bg-zinc-50 dark:bg-[#181818] text-zinc-900 dark:text-zinc-100 transition-colors">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="px-4 py-2 rounded-full bg-zinc-900/90 dark:bg-white/95 text-white dark:text-zinc-900 text-xs font-semibold shadow-xl backdrop-blur-md border border-white/20 flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{toast}</span>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        {/* Studio Hero Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-zinc-950 p-6 md:p-8 text-white border border-white/10 shadow-2xl">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>HYNEX AI Document &amp; Productivity Studio</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                Think. Create. Complete.
              </h1>
              <p className="text-zinc-300 text-xs md:text-sm max-w-xl leading-relaxed">
                Generate high-impact, visual academic assignments, genuine editable Microsoft Word (.docx), PowerPoint (.pptx), and Excel (.xlsx) files with topic-tailored visuals.
              </p>
            </div>

            {/* Quick Preference Dropdowns */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white/5 backdrop-blur-md p-3 rounded-2xl border border-white/10 shrink-0">
              <div className="text-left space-y-1">
                <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                  Image Preference
                </label>
                <select
                  value={defaultImagePref}
                  onChange={(e) => saveDefaultPref(e.target.value as any)}
                  className="w-full text-xs bg-zinc-800/80 text-white rounded-lg px-2.5 py-1.5 border border-white/10 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="always_ask">Always ask me</option>
                  <option value="prefer_images">Prefer images</option>
                  <option value="prefer_text">Prefer text-only documents</option>
                </select>
              </div>

              <div className="text-left space-y-1 sm:border-l sm:border-white/10 sm:pl-3">
                <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                  Speed Mode
                </label>
                <label className="flex items-center gap-2 text-xs text-zinc-200 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={skipReviewStep}
                    onChange={(e) => toggleSkipReview(e.target.checked)}
                    className="rounded text-emerald-500 focus:ring-emerald-400 w-3.5 h-3.5"
                  />
                  <span>Skip review</span>
                </label>
              </div>
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-6 border-t border-white/10 mt-6 no-scrollbar">
            {[
              { id: 'universal', label: 'Universal Creator', icon: Sparkles },
              { id: 'assignment', label: 'Assignment Maker', icon: GraduationCap },
              { id: 'presentation', label: 'Presentation Deck', icon: Presentation },
              { id: 'spreadsheet', label: 'Excel Spreadsheet', icon: TableIcon },
              { id: 'improve', label: 'AI Text Polish', icon: Edit3 },
              { id: 'files', label: 'My Files Library', icon: FolderOpen },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                      : 'text-zinc-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* REUSABLE CONTROLS: 1. IMAGE PREFERENCE CARDS & 2. DESIGN / THEME SETTINGS  */}
        {/* ========================================================================= */}
        {activeTab !== 'files' && activeTab !== 'improve' && (
          <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl p-5 border border-zinc-200 dark:border-white/10 shadow-sm space-y-5">
            {/* 1. IMAGE SELECTION QUESTION & CARDS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-indigo-500" />
                    <span>Would you like to add relevant images?</span>
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Choose whether Hynex AI should generate topic-matched diagrams, illustrations, and charts.
                  </p>
                </div>
                {includeImages && (
                  <button
                    type="button"
                    onClick={() => setShowImageCustomizer(!showImageCustomizer)}
                    className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <SlidersHorizontal className="w-3 h-3" />
                    <span>{showImageCustomizer ? 'Hide Options' : 'Customize Visuals'}</span>
                  </button>
                )}
              </div>

              {/* Two Selectable Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* OPTION 1: WITH IMAGES */}
                <button
                  type="button"
                  onClick={() => setIncludeImages(true)}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative group flex items-start gap-3.5 ${
                    includeImages
                      ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20'
                      : 'border-zinc-200 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20 bg-white dark:bg-[#252525]'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform ${
                      includeImages
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                    }`}
                  >
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-white">
                        Add Images
                      </span>
                      {includeImages && (
                        <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">
                          ✓
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      Make your document more visual with relevant images, diagrams, illustrations, and charts.
                    </p>
                  </div>
                </button>

                {/* OPTION 2: WITHOUT IMAGES */}
                <button
                  type="button"
                  onClick={() => setIncludeImages(false)}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative group flex items-start gap-3.5 ${
                    !includeImages
                      ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20'
                      : 'border-zinc-200 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20 bg-white dark:bg-[#252525]'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform ${
                      !includeImages
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                    }`}
                  >
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-white">
                        No Images
                      </span>
                      {!includeImages && (
                        <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                          ✓
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      Create a clean document using text, headings, tables, and professional formatting.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* EXPANDABLE IMAGE CUSTOMIZATION SETTINGS */}
            {includeImages && showImageCustomizer && (
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-white/10 space-y-4 animate-in fade-in duration-200">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                    Preferred Image Types (Multi-select)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {IMAGE_TYPES.map((type) => {
                      const isSelected = selectedImageTypes.includes(type);
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            setSelectedImageTypes((prev) =>
                              isSelected ? prev.filter((t) => t !== type) : [...prev, type]
                            );
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-white/10 hover:border-zinc-300'
                          }`}
                        >
                          {isSelected ? '✓ ' : '+ '}
                          {type}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 block mb-1">
                      Image Quantity
                    </label>
                    <select
                      value={imageQuantity}
                      onChange={(e) => setImageQuantity(e.target.value as any)}
                      className="w-full text-xs p-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="few">Few images (1-2 visuals)</option>
                      <option value="balanced">Balanced visuals (default)</option>
                      <option value="more">More visual content (richer visuals)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 block mb-1">
                      Visual Style
                    </label>
                    <select
                      value={imageStyle}
                      onChange={(e) => setImageStyle(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="Professional">Professional</option>
                      <option value="Academic">Academic</option>
                      <option value="Minimal">Minimal</option>
                      <option value="Colorful">Colorful</option>
                      <option value="Modern Infographic">Modern Infographic</option>
                      <option value="Realistic">Realistic</option>
                      <option value="Hand-drawn Educational">Hand-drawn Educational</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 block mb-1">
                      Placement
                    </label>
                    <select
                      value={imagePlacement}
                      onChange={(e) => setImagePlacement(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="auto">Automatically choose the best layout</option>
                      <option value="below_heading">Images below relevant headings</option>
                      <option value="beside_text">Images beside relevant paragraphs</option>
                      <option value="full_width">Full-width illustrations</option>
                      <option value="dedicated_page">Dedicated visual pages</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* 2. ENGAGEMENT LEVEL & COLOR THEME CONTROLS */}
            <div className="pt-3 border-t border-zinc-100 dark:border-white/5 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Engagement Level Selector */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block">
                  Engagement Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      id: 'simple',
                      title: 'Simple',
                      desc: 'Clean, minimal formatting',
                    },
                    {
                      id: 'professional',
                      title: 'Professional',
                      desc: 'Polished headings & tables',
                    },
                    {
                      id: 'creative',
                      title: 'Creative',
                      desc: 'Expressive visual layouts',
                    },
                  ].map((level) => {
                    const isSelected = engagementLevel === level.id;
                    return (
                      <button
                        key={level.id}
                        type="button"
                        onClick={() => setEngagementLevel(level.id as EngagementLevel)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-950 dark:text-white font-bold ring-1 ring-emerald-500/30'
                            : 'border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/5'
                        }`}
                      >
                        <div className="text-xs font-semibold">{level.title}</div>
                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400 line-clamp-1">
                          {level.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Themes Palette */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block">
                  Document Theme
                </label>
                <div className="flex flex-wrap gap-2">
                  {THEME_OPTIONS.map((theme) => {
                    const isSelected = selectedTheme === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => setSelectedTheme(theme.id)}
                        className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs transition-all cursor-pointer ${
                          isSelected
                            ? 'border-zinc-900 dark:border-white bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-semibold shadow-sm'
                            : 'border-zinc-200 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20 text-zinc-700 dark:text-zinc-300 bg-white dark:bg-[#252525]'
                        }`}
                      >
                        <span
                          className="w-3 h-3 rounded-full shrink-0 border border-black/10"
                          style={{ backgroundColor: theme.primary }}
                        />
                        <span>{theme.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: UNIVERSAL CREATOR                                                  */}
        {/* ========================================================================= */}
        {activeTab === 'universal' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl p-6 border border-zinc-200 dark:border-white/10 shadow-sm space-y-4">
              <div className="space-y-1">
                <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  <span>Universal AI File Creator</span>
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Type what you want to create in natural language. Hynex AI will detect intent and build complete office files.
                </p>
              </div>

              {/* Prompt Input */}
              <div className="space-y-3">
                <textarea
                  rows={4}
                  value={universalPrompt}
                  onChange={(e) => setUniversalPrompt(e.target.value)}
                  placeholder="e.g. Create a 3-page Grade 12 Physics assignment on Electromagnetism with diagrams for Maharashtra State Board, or generate an executive 6-slide presentation on AI Agent Market Analysis..."
                  className="w-full p-4 rounded-xl text-sm bg-zinc-50 dark:bg-[#262626] border border-zinc-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
                />

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                      Desired Format:
                    </span>
                    <select
                      value={universalFormat}
                      onChange={(e) => setUniversalFormat(e.target.value)}
                      className="text-xs p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 focus:outline-none cursor-pointer"
                    >
                      <option value="auto">Auto-detect from prompt</option>
                      <option value="docx">Microsoft Word (.docx)</option>
                      <option value="pdf">PDF Document (.pdf)</option>
                      <option value="pptx">PowerPoint Presentation (.pptx)</option>
                      <option value="xlsx">Excel Spreadsheet (.xlsx)</option>
                    </select>
                  </div>

                  <button
                    onClick={() => handleUniversalCreate()}
                    disabled={universalLoading || !universalPrompt.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-black font-bold text-xs hover:opacity-95 disabled:opacity-50 transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
                  >
                    {universalLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Synthesizing Document &amp; Visuals...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Create Digital Document</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Quick Starters */}
              <div className="pt-2 flex flex-wrap gap-2">
                {[
                  'Class 11 Biology: The Living World & Taxonomy',
                  'Grade 10 Chemistry: Periodic Table & Chemical Bonding',
                  'Executive Pitch Deck: AI Automation Architecture',
                  'Q4 Student Marks and Performance Spreadsheet',
                ].map((starter) => (
                  <button
                    key={starter}
                    onClick={() => {
                      setUniversalPrompt(starter);
                      handleUniversalCreate(starter);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-white/5 transition-colors cursor-pointer"
                  >
                    {starter}
                  </button>
                ))}
              </div>

              {universalError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{universalError}</span>
                </div>
              )}
            </div>

            {/* Universal Creation Result */}
            {universalResult && (
              <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl p-6 border border-emerald-500/30 shadow-md space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-white/5 pb-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                      Document Ready
                    </span>
                    <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                      {universalResult.file?.name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    {universalResult.preview && (
                      <button
                        onClick={() => openPreviewModal(universalResult.preview)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview &amp; Edit</span>
                      </button>
                    )}

                    <a
                      href={universalResult.downloadUrl}
                      download
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-black text-xs font-bold hover:bg-emerald-400 transition-colors shadow-md"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download File</span>
                    </a>
                  </div>
                </div>

                {/* Preview Cards */}
                {universalResult.preview?.sections && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Synthesized Sections ({universalResult.preview.sections.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {universalResult.preview.sections.map((sec: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl border border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-[#252525] space-y-1.5"
                        >
                          <p className="text-xs font-bold text-zinc-900 dark:text-white">{sec.title}</p>
                          <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2">
                            {sec.content}
                          </p>
                          {sec.callouts && sec.callouts.length > 0 && (
                            <div className="pt-1 flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                              <span>✓ Includes {sec.callouts.length} callout box</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: ACADEMIC ASSIGNMENT MAKER                                          */}
        {/* ========================================================================= */}
        {activeTab === 'assignment' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl p-6 border border-zinc-200 dark:border-white/10 shadow-sm space-y-5">
              <div className="space-y-1">
                <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-emerald-500" />
                  <span>AI Academic Assignment Maker</span>
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Curriculum-aligned assignment generator configured for Maharashtra State Board, CBSE, ICSE, and College departments.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="sm:col-span-2 md:col-span-3">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Assignment Topic *
                  </label>
                  <input
                    type="text"
                    value={asgnTopic}
                    onChange={(e) => setAsgnTopic(e.target.value)}
                    placeholder="e.g. Faraday's Laws of Electromagnetic Induction & Applications"
                    className="w-full p-3 rounded-xl text-xs bg-zinc-50 dark:bg-[#262626] border border-zinc-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Education Board
                  </label>
                  <select
                    value={asgnBoard}
                    onChange={(e) => setAsgnBoard(e.target.value)}
                    className="w-full p-2.5 rounded-xl text-xs bg-zinc-50 dark:bg-[#262626] border border-zinc-200 dark:border-white/10 focus:outline-none cursor-pointer"
                  >
                    <option value="Maharashtra State Board">Maharashtra State Board (HSC/SSC)</option>
                    <option value="CBSE">CBSE (Central Board of Secondary Education)</option>
                    <option value="ICSE">ICSE / ISC Board</option>
                    <option value="University / College">University / Autonomous College</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Class / Grade
                  </label>
                  <select
                    value={asgnGrade}
                    onChange={(e) => setAsgnGrade(e.target.value)}
                    className="w-full p-2.5 rounded-xl text-xs bg-zinc-50 dark:bg-[#262626] border border-zinc-200 dark:border-white/10 focus:outline-none cursor-pointer"
                  >
                    <option value="Class 10">Class 10 (Secondary)</option>
                    <option value="Class 11">Class 11 (Junior College)</option>
                    <option value="Class 12">Class 12 (Higher Secondary)</option>
                    <option value="Undergraduate">Undergraduate Degree</option>
                    <option value="Class 8">Class 8</option>
                    <option value="Class 9">Class 9</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={asgnSubject}
                    onChange={(e) => setAsgnSubject(e.target.value)}
                    placeholder="e.g. Physics, Biology, History, Computer Science"
                    className="w-full p-2.5 rounded-xl text-xs bg-zinc-50 dark:bg-[#262626] border border-zinc-200 dark:border-white/10 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Student Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={asgnStudentName}
                    onChange={(e) => setAsgnStudentName(e.target.value)}
                    placeholder="e.g. Ahmadraza"
                    className="w-full p-2.5 rounded-xl text-xs bg-zinc-50 dark:bg-[#262626] border border-zinc-200 dark:border-white/10 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Roll Number / ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={asgnRollNo}
                    onChange={(e) => setAsgnRollNo(e.target.value)}
                    placeholder="e.g. MSB-2026-44"
                    className="w-full p-2.5 rounded-xl text-xs bg-zinc-50 dark:bg-[#262626] border border-zinc-200 dark:border-white/10 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Target Pages
                  </label>
                  <select
                    value={asgnPages}
                    onChange={(e) => setAsgnPages(parseInt(e.target.value, 10))}
                    className="w-full p-2.5 rounded-xl text-xs bg-zinc-50 dark:bg-[#262626] border border-zinc-200 dark:border-white/10 focus:outline-none cursor-pointer"
                  >
                    <option value={2}>2 Pages (Concise)</option>
                    <option value={3}>3 Pages (Standard Academic)</option>
                    <option value={5}>5 Pages (In-depth Report)</option>
                    <option value={8}>8 Pages (Detailed Dissertation)</option>
                  </select>
                </div>

                <div className="sm:col-span-2 md:col-span-3">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Teacher Instructions / Rubric
                  </label>
                  <textarea
                    rows={2}
                    value={asgnInstructions}
                    onChange={(e) => setAsgnInstructions(e.target.value)}
                    placeholder="e.g. Include definition cards, comparison table between theories, real-world examples, and board textbook references..."
                    className="w-full p-2.5 rounded-xl text-xs bg-zinc-50 dark:bg-[#262626] border border-zinc-200 dark:border-white/10 focus:outline-none resize-none"
                  />
                </div>
              </div>

              {asgnError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{asgnError}</span>
                </div>
              )}

              <div className="flex items-center justify-end pt-2">
                <button
                  onClick={handleGenerateAssignment}
                  disabled={asgnLoading || !asgnTopic.trim()}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-black font-bold text-xs hover:opacity-95 disabled:opacity-50 transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  {asgnLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Synthesizing Academic Assignment...</span>
                    </>
                  ) : (
                    <>
                      <GraduationCap className="w-4 h-4" />
                      <span>Generate Full Assignment</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Assignment Result Card */}
            {asgnResult && (
              <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl p-6 border border-emerald-500/30 shadow-md space-y-4 animate-in fade-in duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 dark:border-white/5 pb-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                      Assignment Ready ({asgnResult.assignment?.board})
                    </span>
                    <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                      {asgnResult.assignment?.title}
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => openPreviewModal(asgnResult.assignment)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview &amp; Edit</span>
                    </button>

                    {asgnResult.files?.docx && (
                      <a
                        href={asgnResult.files.docx.url}
                        download
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition-colors shadow-sm"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Word (.docx)</span>
                      </a>
                    )}
                    {asgnResult.files?.pdf && (
                      <a
                        href={asgnResult.files.pdf.url}
                        download
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-500 transition-colors shadow-sm"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download PDF</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Display sections */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Content Hierarchy
                  </h4>
                  <div className="space-y-2">
                    {asgnResult.assignment?.sections?.map((sec: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-[#252525] space-y-1"
                      >
                        <p className="text-xs font-bold text-zinc-900 dark:text-white">{sec.title}</p>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2">
                          {sec.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: POWERPOINT PRESENTATION MAKER                                       */}
        {/* ========================================================================= */}
        {activeTab === 'presentation' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl p-6 border border-zinc-200 dark:border-white/10 shadow-sm space-y-5">
              <div className="space-y-1">
                <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Presentation className="w-4 h-4 text-indigo-500" />
                  <span>AI PowerPoint Presentation Maker</span>
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Build complete, editable PowerPoint (.pptx) decks with topic-matched visuals and speaker notes.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-3">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Presentation Topic *
                  </label>
                  <input
                    type="text"
                    value={presTopic}
                    onChange={(e) => setPresTopic(e.target.value)}
                    placeholder="e.g. Autonomous AI Agents: Architecture, Multi-Model Routing &amp; Enterprise Impact"
                    className="w-full p-3 rounded-xl text-xs bg-zinc-50 dark:bg-[#262626] border border-zinc-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Number of Slides
                  </label>
                  <select
                    value={presSlides}
                    onChange={(e) => setPresSlides(parseInt(e.target.value, 10))}
                    className="w-full p-2.5 rounded-xl text-xs bg-zinc-50 dark:bg-[#262626] border border-zinc-200 dark:border-white/10 focus:outline-none cursor-pointer"
                  >
                    <option value={4}>4 Slides (Quick Overview)</option>
                    <option value={6}>6 Slides (Standard Pitch)</option>
                    <option value={8}>8 Slides (Detailed Talk)</option>
                    <option value={12}>12 Slides (Comprehensive Lecture)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Aspect Ratio
                  </label>
                  <select
                    value={presAspect}
                    onChange={(e) => setPresAspect(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl text-xs bg-zinc-50 dark:bg-[#262626] border border-zinc-200 dark:border-white/10 focus:outline-none cursor-pointer"
                  >
                    <option value="16:9">16:9 (Widescreen - Modern)</option>
                    <option value="4:3">4:3 (Standard)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Target Audience
                  </label>
                  <input
                    type="text"
                    value={presAudience}
                    onChange={(e) => setPresAudience(e.target.value)}
                    placeholder="e.g. Investors, College Instructors, Engineers"
                    className="w-full p-2.5 rounded-xl text-xs bg-zinc-50 dark:bg-[#262626] border border-zinc-200 dark:border-white/10 focus:outline-none"
                  />
                </div>
              </div>

              {presError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{presError}</span>
                </div>
              )}

              <div className="flex items-center justify-end pt-2">
                <button
                  onClick={handleGeneratePresentation}
                  disabled={presLoading || !presTopic.trim()}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs disabled:opacity-50 transition-all cursor-pointer shadow-lg shadow-indigo-500/20"
                >
                  {presLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating Slide Deck...</span>
                    </>
                  ) : (
                    <>
                      <Presentation className="w-4 h-4" />
                      <span>Generate PowerPoint (.pptx)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Presentation Result View */}
            {presResult && (
              <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl p-6 border border-indigo-500/30 shadow-md space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-white/5 pb-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">
                      PowerPoint Deck Ready
                    </span>
                    <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                      {presResult.presentation?.title}
                    </h3>
                  </div>

                  <a
                    href={presResult.downloadUrl}
                    download
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 transition-colors shadow-md"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .pptx</span>
                  </a>
                </div>

                {/* Slide Previewer */}
                {presResult.presentation?.slides && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                      {presResult.presentation.slides.map((s: any, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => setPresActiveSlide(idx)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                            presActiveSlide === idx
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                          }`}
                        >
                          Slide {idx + 1}
                        </button>
                      ))}
                    </div>

                    {/* Active Slide Card */}
                    {presResult.presentation.slides[presActiveSlide] && (
                      <div className="p-6 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-900 text-white space-y-4 min-h-[220px]">
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400">
                            Layout: {presResult.presentation.slides[presActiveSlide].layout}
                          </span>
                          <h4 className="text-xl font-bold">
                            {presResult.presentation.slides[presActiveSlide].title}
                          </h4>
                          {presResult.presentation.slides[presActiveSlide].subtitle && (
                            <p className="text-xs text-zinc-400">
                              {presResult.presentation.slides[presActiveSlide].subtitle}
                            </p>
                          )}
                        </div>

                        {presResult.presentation.slides[presActiveSlide].bulletPoints && (
                          <ul className="space-y-1.5 pl-4 list-disc text-xs text-zinc-300">
                            {presResult.presentation.slides[presActiveSlide].bulletPoints.map(
                              (b: string, bIdx: number) => (
                                <li key={bIdx}>{b}</li>
                              )
                            )}
                          </ul>
                        )}

                        {presResult.presentation.slides[presActiveSlide].imageUrl && (
                          <div className="pt-2">
                            <img
                              src={presResult.presentation.slides[presActiveSlide].imageUrl}
                              alt="Slide Visual"
                              className="max-h-40 rounded-xl object-cover border border-white/10"
                            />
                          </div>
                        )}

                        {presResult.presentation.slides[presActiveSlide].speakerNotes && (
                          <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-[11px] text-zinc-400">
                            <strong className="text-zinc-300 block mb-0.5">Speaker Notes:</strong>
                            {presResult.presentation.slides[presActiveSlide].speakerNotes}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: EXCEL SPREADSHEET MAKER                                            */}
        {/* ========================================================================= */}
        {activeTab === 'spreadsheet' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl p-6 border border-zinc-200 dark:border-white/10 shadow-sm space-y-5">
              <div className="space-y-1">
                <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <TableIcon className="w-4 h-4 text-emerald-500" />
                  <span>AI Excel &amp; Spreadsheet Maker</span>
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Generate true Microsoft Excel (.xlsx) workbooks with styled headers, alternating rows, and real calculation formulas.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-3">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Spreadsheet Topic *
                  </label>
                  <input
                    type="text"
                    value={sheetTopic}
                    onChange={(e) => setSheetTopic(e.target.value)}
                    placeholder="e.g. Annual Student Marks and Term Performance Ledger with Total Formulas"
                    className="w-full p-3 rounded-xl text-xs bg-zinc-50 dark:bg-[#262626] border border-zinc-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Category
                  </label>
                  <select
                    value={sheetCategory}
                    onChange={(e) => setSheetCategory(e.target.value)}
                    className="w-full p-2.5 rounded-xl text-xs bg-zinc-50 dark:bg-[#262626] border border-zinc-200 dark:border-white/10 focus:outline-none cursor-pointer"
                  >
                    <option value="budget">Financial Budget &amp; Expenses</option>
                    <option value="grades">Academic Marks &amp; Grades</option>
                    <option value="attendance">Attendance &amp; Schedule</option>
                    <option value="inventory">Inventory &amp; Supplies</option>
                    <option value="project">Project Tasks &amp; Milestones</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Target Rows
                  </label>
                  <select
                    value={sheetRows}
                    onChange={(e) => setSheetRows(parseInt(e.target.value, 10))}
                    className="w-full p-2.5 rounded-xl text-xs bg-zinc-50 dark:bg-[#262626] border border-zinc-200 dark:border-white/10 focus:outline-none cursor-pointer"
                  >
                    <option value={8}>8 Rows</option>
                    <option value={12}>12 Rows (Standard)</option>
                    <option value={20}>20 Rows (Extended)</option>
                  </select>
                </div>
              </div>

              {sheetError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{sheetError}</span>
                </div>
              )}

              <div className="flex items-center justify-end pt-2">
                <button
                  onClick={handleGenerateSpreadsheet}
                  disabled={sheetLoading || !sheetTopic.trim()}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs disabled:opacity-50 transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  {sheetLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating Spreadsheet...</span>
                    </>
                  ) : (
                    <>
                      <TableIcon className="w-4 h-4" />
                      <span>Generate Excel Workbook (.xlsx)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Spreadsheet Table Preview */}
            {sheetResult && (
              <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl p-6 border border-emerald-500/30 shadow-md space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-white/5 pb-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                      Excel Spreadsheet Ready
                    </span>
                    <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                      {sheetResult.spreadsheet?.title}
                    </h3>
                  </div>

                  <a
                    href={sheetResult.downloadUrl}
                    download
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition-colors shadow-md"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .xlsx</span>
                  </a>
                </div>

                {sheetResult.spreadsheet?.headers && (
                  <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-white/10">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-zinc-900 text-white">
                        <tr>
                          {sheetResult.spreadsheet.headers.map((h: string, hIdx: number) => (
                            <th key={hIdx} className="p-3 font-semibold border-b border-white/10">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-white/5">
                        {sheetResult.spreadsheet.rows?.map((row: any[], rIdx: number) => (
                          <tr
                            key={rIdx}
                            className={rIdx % 2 === 1 ? 'bg-zinc-50 dark:bg-white/5' : ''}
                          >
                            {row.map((val: any, cIdx: number) => (
                              <td
                                key={cIdx}
                                className={`p-3 ${
                                  typeof val === 'string' && val.startsWith('=')
                                    ? 'font-bold text-emerald-600 dark:text-emerald-400 font-mono'
                                    : 'text-zinc-800 dark:text-zinc-200'
                                }`}
                              >
                                {String(val)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: AI TEXT POLISH & IMPROVE                                           */}
        {/* ========================================================================= */}
        {activeTab === 'improve' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl p-6 border border-zinc-200 dark:border-white/10 shadow-sm space-y-4">
              <div className="space-y-1">
                <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-emerald-500" />
                  <span>AI Writing Improvement &amp; Diff Editor</span>
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Polish assignment paragraphs, fix grammar, transform bullet points, or translate into Indian regional languages.
                </p>
              </div>

              <div className="space-y-3">
                <textarea
                  rows={6}
                  value={improveText}
                  onChange={(e) => setImproveText(e.target.value)}
                  placeholder="Paste any document paragraph or notes text here to enhance..."
                  className="w-full p-4 rounded-xl text-sm bg-zinc-50 dark:bg-[#262626] border border-zinc-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                      Action:
                    </span>
                    <select
                      value={improveAction}
                      onChange={(e) => setImproveAction(e.target.value)}
                      className="text-xs p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 focus:outline-none cursor-pointer"
                    >
                      <option value="academic_tone">Academic &amp; Formal Tone</option>
                      <option value="fix_grammar">Fix Grammar &amp; Spelling</option>
                      <option value="simplify">Simplify &amp; Clarify</option>
                      <option value="expand">Expand with Depth &amp; Examples</option>
                      <option value="bullet_points">Convert to Structured Bullets</option>
                      <option value="paragraphs">Convert Bullets to Flowing Prose</option>
                      <option value="summarize">Executive Summary</option>
                      <option value="translate_hindi">Translate to Hindi</option>
                      <option value="translate_marathi">Translate to Marathi</option>
                    </select>
                  </div>

                  <button
                    onClick={handleAiImprove}
                    disabled={improveLoading || !improveText.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400 disabled:opacity-50 transition-all cursor-pointer shadow-md"
                  >
                    {improveLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Polishing Text...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Improve Text</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {improveError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{improveError}</span>
                </div>
              )}
            </div>

            {/* Before / After Diff Cards */}
            {improvedResult && (
              <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl p-6 border border-zinc-200 dark:border-white/10 shadow-sm space-y-4 animate-in fade-in duration-300">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Transformation Result
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-[#252525] border border-zinc-200 dark:border-white/5 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-zinc-500">Original</span>
                    <p className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                      {improveText}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
                      Enhanced Output
                    </span>
                    <p className="text-xs text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap leading-relaxed font-medium">
                      {improvedResult}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: MY FILES LIBRARY                                                   */}
        {/* ========================================================================= */}
        {activeTab === 'files' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl p-6 border border-zinc-200 dark:border-white/10 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-emerald-500" />
                    <span>My Generated Files ({myFiles.length})</span>
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Access and download your persisted assignments, PowerPoint decks, and Excel spreadsheets.
                  </p>
                </div>

                <button
                  onClick={loadMyFiles}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
              </div>

              {/* Search & Filter */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={fileSearch}
                    onChange={(e) => setFileSearch(e.target.value)}
                    placeholder="Search files by name..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-[#252525] border border-zinc-200 dark:border-white/10 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  {['all', 'docx', 'pdf', 'pptx', 'xlsx'].map((f) => (
                    <button
                      key={f}
                      onClick={() => setFileFilter(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                        fileFilter === f
                          ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Files Table / List */}
              {filesLoading ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-2 text-zinc-400">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                  <span className="text-xs">Loading files...</span>
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                    <FolderOpen className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                      No files found
                    </p>
                    <p className="text-xs text-zinc-500">
                      Create an assignment, PowerPoint deck, or spreadsheet to see it saved here.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-zinc-200 dark:divide-white/5 border border-zinc-200 dark:border-white/10 rounded-xl overflow-hidden">
                  {filteredFiles.map((file) => {
                    const isDocx = file.name.endsWith('.docx');
                    const isPdf = file.name.endsWith('.pdf');
                    const isPptx = file.name.endsWith('.pptx');
                    const isXlsx = file.name.endsWith('.xlsx');

                    return (
                      <div
                        key={file.id}
                        className="p-4 flex items-center justify-between gap-4 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-xs ${
                              isDocx
                                ? 'bg-blue-600'
                                : isPdf
                                ? 'bg-red-600'
                                : isPptx
                                ? 'bg-orange-600'
                                : isXlsx
                                ? 'bg-emerald-600'
                                : 'bg-zinc-600'
                            }`}
                          >
                            {isDocx
                              ? 'DOC'
                              : isPdf
                              ? 'PDF'
                              : isPptx
                              ? 'PPT'
                              : isXlsx
                              ? 'XLS'
                              : 'FILE'}
                          </div>

                          <div className="min-w-0">
                            <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                              {file.name}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                              <span>{(file.size / 1024).toFixed(1)} KB</span>
                              <span>•</span>
                              <span>{new Date(file.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <a
                            href={file.url}
                            download
                            className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-emerald-500 hover:text-black transition-colors text-zinc-700 dark:text-zinc-300 cursor-pointer"
                            title="Download file"
                          >
                            <Download className="w-4 h-4" />
                          </a>

                          <button
                            onClick={() => handleDeleteFile(file.id)}
                            className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-red-500 hover:text-white transition-colors text-zinc-700 dark:text-zinc-300 cursor-pointer"
                            title="Delete file"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* IMAGE REVIEW PANEL MODAL (Interactive Review, Replace, Regenerate)        */}
      {/* ========================================================================= */}
      {reviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1e1e1e] rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-zinc-200 dark:border-white/10 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-100 dark:border-white/10 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">
                  Step 2 · Visual Review &amp; Approval
                </span>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Review Document Visuals ({reviewImages.length})
                </h3>
              </div>
              <button
                onClick={() => setReviewModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Images List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                These topic-matched visuals were generated specifically for your document sections. You can approve, regenerate, or replace any image before final file compilation.
              </p>

              {reviewImages.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-500">
                  No images currently attached. Click &quot;Add Image&quot; below if you would like to include a visual.
                </div>
              ) : (
                <div className="space-y-4">
                  {reviewImages.map((img, idx) => (
                    <div
                      key={img.id || idx}
                      className="p-4 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#252525] flex flex-col sm:flex-row items-start gap-4"
                    >
                      {/* Image Thumbnail */}
                      <div className="w-full sm:w-44 h-28 rounded-xl overflow-hidden bg-black/10 shrink-0 relative flex items-center justify-center border border-zinc-200 dark:border-white/10">
                        {img.status === 'failed' || !img.url ? (
                          <div className="p-2 text-center text-red-500 text-[10px] space-y-1">
                            <AlertCircle className="w-5 h-5 mx-auto" />
                            <span>Generation failed</span>
                          </div>
                        ) : (
                          <img
                            src={img.url}
                            alt={img.caption || 'Document visual'}
                            className="w-full h-full object-cover"
                          />
                        )}

                        {regeneratingImgId === img.id && (
                          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white text-[10px] gap-1">
                            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                            <span>Synthesizing...</span>
                          </div>
                        )}
                      </div>

                      {/* Info & Action Controls */}
                      <div className="flex-1 space-y-2 min-w-0 w-full">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold uppercase text-indigo-500">
                            Placement: {img.placement || 'Below heading'} (Section {img.sectionIndex + 1})
                          </span>
                          <p className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                            {img.caption || img.prompt}
                          </p>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2">
                            Prompt: {img.prompt}
                          </p>
                        </div>

                        {/* Replacing prompt input */}
                        {replacingImgId === img.id && (
                          <div className="pt-2 flex items-center gap-2">
                            <input
                              type="text"
                              value={customPromptInput}
                              onChange={(e) => setCustomPromptInput(e.target.value)}
                              placeholder="Enter custom image prompt..."
                              className="flex-1 p-2 text-xs rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 focus:outline-none"
                            />
                            <button
                              onClick={() => handleReplaceImagePrompt(img.id)}
                              className="px-3 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-500 cursor-pointer"
                            >
                              Generate
                            </button>
                            <button
                              onClick={() => setReplacingImgId(null)}
                              className="px-2 py-2 text-xs text-zinc-400 hover:text-white cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleRegenerateImage(img)}
                            disabled={regeneratingImgId === img.id}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 cursor-pointer"
                          >
                            <RotateCw className="w-3 h-3" />
                            <span>Regenerate</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setReplacingImgId(img.id);
                              setCustomPromptInput(img.prompt || '');
                            }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Replace Prompt</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemoveImage(img.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-500 hover:bg-red-500/10 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Image Block */}
              {isAddingNewImage ? (
                <div className="p-4 rounded-2xl border border-dashed border-indigo-500/40 bg-indigo-500/5 space-y-3">
                  <span className="text-xs font-bold text-zinc-900 dark:text-white block">
                    Add Topic Diagram or Illustration
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newImagePromptInput}
                      onChange={(e) => setNewImagePromptInput(e.target.value)}
                      placeholder="e.g. Detailed botanical diagram of leaf cross-section with labelled stomata"
                      className="flex-1 p-2.5 text-xs rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 focus:outline-none"
                    />
                    <button
                      onClick={handleAddNewImage}
                      disabled={regeneratingImgId === 'new' || !newImagePromptInput.trim()}
                      className="px-4 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-500 disabled:opacity-50 cursor-pointer"
                    >
                      {regeneratingImgId === 'new' ? 'Generating...' : 'Generate Visual'}
                    </button>
                    <button
                      onClick={() => setIsAddingNewImage(false)}
                      className="px-2.5 py-2.5 text-xs text-zinc-400 hover:text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingNewImage(true)}
                  className="w-full py-2.5 border border-dashed border-zinc-300 dark:border-white/20 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-indigo-500 hover:border-indigo-500 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Another Topic Image</span>
                </button>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-zinc-100 dark:border-white/10 bg-zinc-50 dark:bg-[#181818] flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-xs text-zinc-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={skipReviewStep}
                  onChange={(e) => toggleSkipReview(e.target.checked)}
                  className="rounded text-indigo-600 w-3.5 h-3.5"
                />
                <span>Don&apos;t ask for review next time</span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleApproveAndCompile('pdf')}
                  disabled={compilingFinal}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-red-600 text-white hover:bg-red-500 cursor-pointer disabled:opacity-50"
                >
                  Compile PDF
                </button>

                <button
                  type="button"
                  onClick={() => handleApproveAndCompile('docx')}
                  disabled={compilingFinal}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {compilingFinal ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Compiling Document...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve &amp; Compile Word (.docx)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* IN-LINE DOCUMENT PREVIEW & SECTION EDITOR MODAL                           */}
      {/* ========================================================================= */}
      {previewModalOpen && activePreviewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1e1e1e] rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-zinc-200 dark:border-white/10 overflow-hidden">
            <div className="p-5 border-b border-zinc-100 dark:border-white/10 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                  Document Preview &amp; In-line Editor
                </span>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white truncate max-w-md">
                  {editingTitle || activePreviewDoc.title}
                </h3>
              </div>
              <button
                onClick={() => setPreviewModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Document Title Editor */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  Document Title
                </label>
                <input
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  className="w-full p-3 text-sm font-bold rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 focus:outline-none"
                />
              </div>

              {/* Sections Editor */}
              <div className="space-y-4">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  Editable Sections ({editingSections.length})
                </label>

                {editingSections.map((sec, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#252525] space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={sec.title}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditingSections((prev) =>
                            prev.map((s, i) => (i === idx ? { ...s, title: val } : s))
                          );
                        }}
                        className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-white bg-transparent border-b border-transparent hover:border-zinc-300 dark:hover:border-zinc-600 focus:outline-none focus:border-emerald-500 flex-1"
                      />
                      <span className="text-[10px] text-zinc-400">Section {idx + 1}</span>
                    </div>

                    <textarea
                      rows={4}
                      value={sec.content}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditingSections((prev) =>
                          prev.map((s, i) => (i === idx ? { ...s, content: val } : s))
                        );
                      }}
                      className="w-full p-3 text-xs rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 focus:outline-none resize-none leading-relaxed"
                    />

                    {/* Section Callout Card */}
                    {sec.callouts && sec.callouts.length > 0 && (
                      <div className="space-y-2">
                        {sec.callouts.map((c: any, cIdx: number) => (
                          <div
                            key={cIdx}
                            className="p-3 rounded-xl bg-emerald-500/10 border-l-4 border-emerald-500 text-xs space-y-1"
                          >
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase text-[10px]">
                              {c.title || 'Callout'}
                            </span>
                            <p className="text-zinc-800 dark:text-zinc-200">{c.text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer with Re-Compile & Download */}
            <div className="p-5 border-t border-zinc-100 dark:border-white/10 bg-zinc-50 dark:bg-[#181818] flex items-center justify-between">
              <button
                onClick={() => setPreviewModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
              >
                Close Preview
              </button>

              <button
                onClick={async () => {
                  setCompilingFinal(true);
                  try {
                    const res = await api.documents.compileFinal({
                      title: editingTitle || activePreviewDoc.title,
                      subtitle: activePreviewDoc.subtitle,
                      format: 'docx',
                      sections: editingSections,
                      references: activePreviewDoc.references,
                      theme: selectedTheme,
                      engagementLevel,
                    });
                    if (res.success) {
                      showToast('Document updated and downloaded!');
                      setPreviewModalOpen(false);
                      window.open(res.downloadUrl, '_blank');
                      loadMyFiles();
                    }
                  } catch (err: any) {
                    showToast(`Update failed: ${err.message}`);
                  } finally {
                    setCompilingFinal(false);
                  }
                }}
                disabled={compilingFinal}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400 transition-colors shadow-md cursor-pointer disabled:opacity-50"
              >
                {compilingFinal ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Updated Document (.docx)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
