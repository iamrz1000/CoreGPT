import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  Plus,
  Trash2,
  CheckCircle2,
  Star,
  Layers,
  Palette,
  Type,
  Maximize2,
  Subtitles,
  Loader2,
  Check,
  AlertCircle,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { CreatorDNA } from '../types/index.ts';

interface CreatorDNAModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreatorDNAModal: React.FC<CreatorDNAModalProps> = ({ isOpen, onClose }) => {
  const [profiles, setProfiles] = useState<CreatorDNA[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<CreatorDNA | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [auditContent, setAuditContent] = useState('');
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<any>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [niche, setNiche] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [language, setLanguage] = useState('en');
  const [writingStyle, setWritingStyle] = useState('');
  const [visualStyle, setVisualStyle] = useState('');
  const [brandColors, setBrandColors] = useState<string[]>(['#3b82f6', '#10b981']);
  const [typography, setTypography] = useState('Modern Sans-Serif');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1' | '4:5'>('16:9');
  const [captionPreferences, setCaptionPreferences] = useState('Minimalist bold subtitles');

  useEffect(() => {
    if (isOpen) {
      loadProfiles();
    }
  }, [isOpen]);

  const loadProfiles = async () => {
    setLoading(true);
    try {
      const res = await api.creatorDna.list();
      setProfiles(res.profiles);
      if (res.profiles.length > 0 && !selectedProfile) {
        const def = res.profiles.find((p) => p.is_default) || res.profiles[0];
        selectProfile(def);
      }
    } catch (err) {
      console.error('Failed to load Creator DNA:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectProfile = (p: CreatorDNA) => {
    setSelectedProfile(p);
    setName(p.name);
    setNiche(p.niche);
    setTargetAudience(p.target_audience);
    setLanguage(p.language);
    setWritingStyle(p.writing_style);
    setVisualStyle(p.visual_style);
    setBrandColors(p.brand_colors || ['#3b82f6', '#10b981']);
    setTypography(p.typography);
    setAspectRatio(p.aspect_ratio);
    setCaptionPreferences(p.caption_preferences);
    setIsEditing(false);
    setAuditResult(null);
  };

  const handleCreateNew = () => {
    setSelectedProfile(null);
    setName('');
    setNiche('Tech & Innovation');
    setTargetAudience('Founders and Builders');
    setLanguage('en');
    setWritingStyle('Concise, authoritative, visionary');
    setVisualStyle('Hyper-modern cyberpunk cinematic, neon blues and dark obsidian');
    setBrandColors(['#06b6d4', '#3b82f6', '#a855f7']);
    setTypography('Inter & Space Grotesk');
    setAspectRatio('16:9');
    setCaptionPreferences('Bold yellow keyword highlights with dark pill background');
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const payload: Partial<CreatorDNA> = {
        name,
        niche,
        target_audience: targetAudience,
        language,
        writing_style: writingStyle,
        visual_style: visualStyle,
        brand_colors: brandColors,
        typography,
        aspect_ratio: aspectRatio,
        caption_preferences: captionPreferences,
      };

      if (selectedProfile) {
        const res = await api.creatorDna.update(selectedProfile.id, payload);
        setSelectedProfile(res.profile);
      } else {
        const res = await api.creatorDna.create({ ...payload, is_default: profiles.length === 0 });
        setSelectedProfile(res.profile);
      }
      setIsEditing(false);
      setActionError(null);
      await loadProfiles();
    } catch (err: any) {
      setActionError(err.message || 'Failed to save Creator DNA profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (p: CreatorDNA) => {
    try {
      await api.creatorDna.update(p.id, { is_default: true });
      await loadProfiles();
    } catch (err: any) {
      setActionError(err.message || 'Failed to set default profile');
    }
  };

  const handleDelete = async (p: CreatorDNA) => {
    if (confirmDeleteId !== p.id) {
      setConfirmDeleteId(p.id);
      return;
    }
    try {
      await api.creatorDna.delete(p.id);
      setConfirmDeleteId(null);
      setSelectedProfile(null);
      await loadProfiles();
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete profile');
    }
  };

  const handleAuditStyle = async () => {
    if (!auditContent.trim() || !selectedProfile) return;
    setAuditLoading(true);
    setActionError(null);
    try {
      const res = await api.creatorDna.checkStyle({
        profile_id: selectedProfile.id,
        content: auditContent,
      });
      setAuditResult(res.result);
    } catch (err: any) {
      setActionError(err.message || 'Style check failed');
    } finally {
      setAuditLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#10141e] border border-cyan-500/30 rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">Hynex Creator DNA</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Style Engine
                </span>
              </div>
              <p className="text-xs text-slate-400">Reusable creator personas, visual identities, and style consistency</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body 2-Column Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar: Profile List */}
          <div className="w-64 border-r border-slate-800/80 bg-slate-950/40 p-4 flex flex-col justify-between shrink-0">
            <div className="space-y-2 overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Profiles</span>
                <button
                  onClick={handleCreateNew}
                  className="p-1 rounded bg-purple-600/30 text-purple-300 hover:bg-purple-600/50 transition-colors"
                  title="Create Profile"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {profiles.map((p) => (
                <div
                  key={p.id}
                  onClick={() => selectProfile(p)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between ${
                    selectedProfile?.id === p.id
                      ? 'bg-purple-600/15 border-purple-500/40 text-white'
                      : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-900 text-slate-300'
                  }`}
                >
                  <div className="truncate pr-2">
                    <div className="font-semibold text-xs truncate flex items-center gap-1.5">
                      {p.name}
                      {p.is_default && <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">{p.niche}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    {p.brand_colors?.[0] && (
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block border border-white/20"
                        style={{ backgroundColor: p.brand_colors[0] }}
                      />
                    )}
                  </div>
                </div>
              ))}

              {profiles.length === 0 && !loading && (
                <div className="text-xs text-slate-500 py-6 text-center">
                  No Creator DNA profiles found. Click + to create your first persona.
                </div>
              )}
            </div>

            <button
              onClick={handleCreateNew}
              className="w-full mt-4 py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
            >
              <Plus className="w-4 h-4" />
              New Persona
            </button>
          </div>

          {/* Right Main Area: Details or Edit */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-900/20">
            {selectedProfile || isEditing ? (
              <div className="space-y-6 max-w-3xl">
                {/* Profile Controls Bar */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {isEditing ? (selectedProfile ? 'Edit Profile' : 'New Creator Profile') : selectedProfile?.name}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {isEditing ? 'Configure DNA attributes' : selectedProfile?.niche}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedProfile && !isEditing && (
                      <>
                        {!selectedProfile.is_default && (
                          <button
                            onClick={() => handleSetDefault(selectedProfile)}
                            className="px-3 py-1.5 rounded-lg border border-amber-500/30 text-amber-300 hover:bg-amber-500/10 text-xs font-medium flex items-center gap-1.5 transition-colors"
                          >
                            <Star className="w-3.5 h-3.5" />
                            Set Default
                          </button>
                        )}
                        <button
                          onClick={() => setIsEditing(true)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(selectedProfile)}
                          className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                            confirmDeleteId === selectedProfile.id
                              ? 'bg-red-600 hover:bg-red-500 text-white shadow-md'
                              : 'text-red-400 hover:bg-red-500/10'
                          }`}
                          title={confirmDeleteId === selectedProfile.id ? 'Click again to permanently delete' : 'Delete Persona'}
                        >
                          <Trash2 className="w-4 h-4" />
                          {confirmDeleteId === selectedProfile.id ? <span>Confirm Delete</span> : null}
                        </button>
                      </>
                    )}
                    {isEditing && (
                      <button
                        onClick={handleSave}
                        disabled={loading || !name.trim()}
                        className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md"
                      >
                        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        Save DNA
                      </button>
                    )}
                  </div>
                </div>

                {actionError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{actionError}</span>
                  </div>
                )}

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Persona / Brand Name</label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Apex Tech Visionary"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white disabled:opacity-75 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Content Niche</label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={niche}
                      onChange={(e) => setNiche(e.target.value)}
                      placeholder="e.g. AI Technology, Fintech, Gaming"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white disabled:opacity-75 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Target Audience</label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value)}
                      placeholder="e.g. Gen Z developers, tech founders"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white disabled:opacity-75 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Default Aspect Ratio</label>
                    <select
                      disabled={!isEditing}
                      value={aspectRatio}
                      onChange={(e) => setAspectRatio(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white disabled:opacity-75 focus:outline-none focus:border-purple-500"
                    >
                      <option value="16:9">16:9 (Landscape / YouTube)</option>
                      <option value="9:16">9:16 (Vertical / Reels / TikTok)</option>
                      <option value="1:1">1:1 (Square / Feed)</option>
                      <option value="4:5">4:5 (Portrait)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-semibold text-slate-300">Writing Style & Tone Directives</label>
                    <textarea
                      disabled={!isEditing}
                      rows={2}
                      value={writingStyle}
                      onChange={(e) => setWritingStyle(e.target.value)}
                      placeholder="e.g. Punchy sentences, no fluff, high signal-to-noise ratio, compelling first 3 seconds hook"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white disabled:opacity-75 focus:outline-none focus:border-purple-500 resize-none"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-semibold text-slate-300">Visual Aesthetic Directives</label>
                    <textarea
                      disabled={!isEditing}
                      rows={2}
                      value={visualStyle}
                      onChange={(e) => setVisualStyle(e.target.value)}
                      placeholder="e.g. 8k cinematic lighting, anamorphic lens flare, deep blues, crisp volumetric fog"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white disabled:opacity-75 focus:outline-none focus:border-purple-500 resize-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Brand Color Hex Codes</label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={brandColors.join(', ')}
                      onChange={(e) =>
                        setBrandColors(
                          e.target.value.split(',').map((c) => c.trim()).filter((c) => c.startsWith('#'))
                        )
                      }
                      placeholder="#3b82f6, #10b981"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white disabled:opacity-75 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Subtitle Style</label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={captionPreferences}
                      onChange={(e) => setCaptionPreferences(e.target.value)}
                      placeholder="e.g. Bold yellow text on black pill"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white disabled:opacity-75 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                {/* Live Consistency Auditor Section */}
                {!isEditing && selectedProfile && (
                  <div className="mt-8 pt-6 border-t border-slate-800 space-y-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <h4 className="text-sm font-bold text-white">Test Content Against DNA</h4>
                    </div>

                    <div className="space-y-2">
                      <textarea
                        value={auditContent}
                        onChange={(e) => setAuditContent(e.target.value)}
                        placeholder="Paste draft copy, script, or image prompt to check style alignment..."
                        rows={3}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500 resize-none"
                      />
                      <button
                        onClick={handleAuditStyle}
                        disabled={auditLoading || !auditContent.trim()}
                        className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow"
                      >
                        {auditLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        Audit Consistency
                      </button>
                    </div>

                    {auditResult && (
                      <div className="p-4 rounded-xl bg-slate-950 border border-purple-500/30 space-y-3 animate-fade-in text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-300">Compliance Score</span>
                          <span className="px-2 py-0.5 rounded font-bold text-purple-300 bg-purple-950 border border-purple-800">
                            {auditResult.compliance_score}%
                          </span>
                        </div>

                        {auditResult.conflicts?.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-amber-400 font-semibold flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" /> Conflicts Found:
                            </span>
                            <ul className="list-disc pl-5 text-slate-300 space-y-0.5">
                              {auditResult.conflicts.map((c: string, i: number) => (
                                <li key={i}>{c}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {auditResult.recommended_rewrites?.length > 0 && (
                          <div className="space-y-1 pt-2 border-t border-slate-800">
                            <span className="text-emerald-400 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Recommended Rewrite:
                            </span>
                            <p className="text-slate-200 bg-slate-900/80 p-2.5 rounded border border-slate-800 leading-relaxed font-mono text-[11px]">
                              {auditResult.recommended_rewrites[0]}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 text-slate-500">
                <Palette className="w-12 h-12 mb-3 text-slate-600" />
                <p className="text-sm font-medium">Select a Creator DNA profile or create a new one.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
