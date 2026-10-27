import React, { useState } from 'react';
import {
  Share2,
  X,
  Copy,
  Check,
  Globe,
  Lock,
  Sparkles,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { SharedPage } from '../types/index.ts';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'image' | 'video' | 'project' | 'workflow' | 'mini_app';
  targetId: string;
  defaultTitle: string;
  defaultDescription?: string;
  publicData: any;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  targetType,
  targetId,
  defaultTitle,
  defaultDescription = '',
  publicData,
}) => {
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState(defaultDescription);
  const [allowRemix, setAllowRemix] = useState(true);
  const [visibility, setVisibility] = useState<'public' | 'link'>('link');
  const [loading, setLoading] = useState(false);
  const [sharedPage, setSharedPage] = useState<SharedPage | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handlePublish = async () => {
    if (!title.trim()) return;
    setLoading(true);
    try {
      const res = await api.share.publish({
        target_type: targetType,
        target_id: targetId,
        title: title.trim(),
        description: description.trim(),
        public_data: publicData,
        visibility,
        allow_remix: allowRemix,
      });
      setSharedPage(res.page);
    } catch (err: any) {
      alert(err.message || 'Failed to create share link');
    } finally {
      setLoading(false);
    }
  };

  const getShareUrl = () => {
    if (!sharedPage) return '';
    return `${window.location.origin}#share=${sharedPage.id}`;
  };

  const handleCopy = () => {
    const url = getShareUrl();
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#10141e] border border-cyan-500/30 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">Share-to-Create</h2>
              <p className="text-xs text-slate-400">Publish and let others view or remix your creation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {!sharedPage ? (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Public Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Description (Optional)</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              <div className="pt-2 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowRemix}
                    onChange={(e) => setAllowRemix(e.target.checked)}
                    className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-slate-700 focus:ring-cyan-500"
                  />
                  <span className="text-xs text-slate-200">
                    Allow Community Remixing (Viewers can clone into their own workspace)
                  </span>
                </label>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setVisibility('link')}
                    className={`flex-1 p-2.5 rounded-lg border text-left text-xs transition-colors ${
                      visibility === 'link'
                        ? 'border-cyan-500 bg-cyan-950/30 text-white'
                        : 'border-slate-800 bg-slate-900 text-slate-400'
                    }`}
                  >
                    <div className="font-semibold flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" /> Anyone with Link
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Only people who have the link can view</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVisibility('public')}
                    className={`flex-1 p-2.5 rounded-lg border text-left text-xs transition-colors ${
                      visibility === 'public'
                        ? 'border-cyan-500 bg-cyan-950/30 text-white'
                        : 'border-slate-800 bg-slate-900 text-slate-400'
                    }`}
                  >
                    <div className="font-semibold flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5" /> Community Feed
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Discoverable in the template library</div>
                  </button>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={handlePublish}
                  disabled={loading || !title.trim()}
                  className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  Generate Share Link
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-1">
                <Check className="w-8 h-8 text-emerald-400 mx-auto" />
                <h3 className="font-bold text-sm text-white">Your creation is ready to share!</h3>
                <p className="text-xs text-slate-400">
                  Data has been sanitized and isolated for secure public viewing.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Shareable Link</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getShareUrl()}
                    className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-300 font-mono select-all focus:outline-none"
                  />
                  <button
                    onClick={handleCopy}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
