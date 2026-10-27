import React, { useState } from 'react';
import {
  ShieldCheck,
  X,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ExternalLink,
  Loader2,
  Search,
  Sparkles,
  FileCheck,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { TruthCheckReport, ClaimVerification } from '../types/index.ts';

interface TruthCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialText?: string;
  messageId?: string;
}

export const TruthCheckModal: React.FC<TruthCheckModalProps> = ({
  isOpen,
  onClose,
  initialText = '',
  messageId,
}) => {
  const [textToVerify, setTextToVerify] = useState(initialText);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<TruthCheckReport | null>(null);
  const [summary, setSummary] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialText) {
      setTextToVerify(initialText);
      handleVerify(initialText);
    }
  }, [initialText]);

  const handleVerify = async (text: string) => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.truthCheck.verify({ text: text.trim(), messageId });
      setReport(res.report);
      setSummary(res.summary);
    } catch (err: any) {
      setError(err.message || 'TruthCheck verification failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const getStatusBadge = (status: ClaimVerification['status']) => {
    switch (status) {
      case 'supported':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Supported
          </span>
        );
      case 'contradicted':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            Contradicted
          </span>
        );
      case 'inconclusive':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            Inconclusive
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            Unverified
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#121620] border border-cyan-500/30 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">Hynex TruthCheck</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium tracking-wider uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Grounded Intelligence
                </span>
              </div>
              <p className="text-xs text-slate-400">Empirical factual verification with live Google Search Grounding</p>
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* Target Text Input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Content to Audit
            </label>
            <div className="relative">
              <textarea
                value={textToVerify}
                onChange={(e) => setTextToVerify(e.target.value)}
                placeholder="Paste AI answer, claim, or statement to verify against live web sources..."
                rows={3}
                className="w-full px-4 py-3 bg-slate-900/80 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors resize-none"
              />
              <button
                onClick={() => handleVerify(textToVerify)}
                disabled={loading || !textToVerify.trim()}
                className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-md transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Auditing...
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    Verify Facts
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-300 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Loading state skeleton */}
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 animate-spin" />
                <Sparkles className="w-6 h-6 text-cyan-400 absolute inset-0 m-auto animate-pulse" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-slate-200">Cross-referencing live external evidence...</p>
                <p className="text-xs text-slate-400 mt-1">Grounding claims via Google Search & authoritative web records</p>
              </div>
            </div>
          )}

          {/* Report Results */}
          {!loading && report && (
            <div className="space-y-6 animate-fade-in">
              {/* Score & Summary Banner */}
              <div className="p-5 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800/80 border border-cyan-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-1">
                    Audit Assessment
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed">{summary}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0 bg-slate-950/60 px-4 py-3 rounded-xl border border-slate-700/50">
                  <div className="text-right">
                    <div className="text-[10px] uppercase font-semibold text-slate-400">Credibility</div>
                    <div className="text-2xl font-black text-cyan-400">{report.overall_score}%</div>
                  </div>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-cyan-500/10 border border-cyan-500/30">
                    <FileCheck className="w-5 h-5 text-cyan-400" />
                  </div>
                </div>
              </div>

              {/* Verified Claims Breakdown */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Extracted Claims & Evidence ({report.claim_verifications.length})
                </h3>

                <div className="space-y-3">
                  {report.claim_verifications.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="font-medium text-sm text-white leading-snug">
                          "{item.claim}"
                        </div>
                        {getStatusBadge(item.status)}
                      </div>

                      <div className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-lg border border-slate-800/80">
                        <span className="font-semibold text-slate-400">Evidence: </span>
                        {item.evidence}
                      </div>

                      {item.uncertainty && (
                        <div className="text-[11px] text-amber-300/90 flex items-center gap-1.5">
                          <HelpCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>Uncertainty: {item.uncertainty}</span>
                        </div>
                      )}

                      {/* Sources */}
                      {item.sources && item.sources.length > 0 && (
                        <div className="pt-2 border-t border-slate-800/80 flex flex-wrap gap-2 items-center">
                          <span className="text-[11px] font-medium text-slate-400">Sources:</span>
                          {item.sources.map((src, sIdx) => (
                            <a
                              key={sIdx}
                              href={src.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 hover:underline bg-cyan-950/30 px-2 py-0.5 rounded border border-cyan-800/40 transition-colors"
                            >
                              <span>{src.title || new URL(src.url).hostname}</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
