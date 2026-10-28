import React, { useState, useEffect } from 'react';
import {
  Users,
  X,
  UserPlus,
  Trash2,
  MessageSquare,
  CheckCircle2,
  Circle,
  Send,
  Shield,
  Loader2,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { CollabMember, ProjectComment } from '../types/index.ts';

interface CollabModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectTitle: string;
}

export const CollabModal: React.FC<CollabModalProps> = ({
  isOpen,
  onClose,
  projectId,
  projectTitle,
}) => {
  const [members, setMembers] = useState<CollabMember[]>([]);
  const [comments, setComments] = useState<ProjectComment[]>([]);
  const [userRole, setUserRole] = useState<string>('editor');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'members' | 'comments'>('members');

  // Invite Form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'reviewer' | 'viewer'>('editor');
  const [inviting, setInviting] = useState(false);

  // Comment Form
  const [commentText, setCommentText] = useState('');
  const [commenting, setCommenting] = useState(false);
  const [collabError, setCollabError] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && projectId) {
      loadData();
    }
  }, [isOpen, projectId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [mRes, cRes] = await Promise.all([
        api.collab.getMembers(projectId),
        api.collab.getComments(projectId),
      ]);
      setMembers(mRes.members);
      setUserRole(mRes.currentUserRole);
      setComments(cRes.comments);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const res = await api.collab.invite(projectId, inviteEmail.trim(), inviteRole);
      setMembers([res.member, ...members]);
      setInviteEmail('');
      setCollabError(null);
    } catch (err: any) {
      setCollabError(err.message || 'Failed to invite collaborator');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (confirmRemoveId !== memberId) {
      setConfirmRemoveId(memberId);
      return;
    }
    setCollabError(null);
    try {
      await api.collab.removeMember(memberId);
      setMembers(members.filter((m) => m.id !== memberId));
      setConfirmRemoveId(null);
    } catch (err: any) {
      setCollabError(err.message || 'Failed to remove collaborator');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setCommenting(true);
    setCollabError(null);
    try {
      const res = await api.collab.addComment(projectId, commentText.trim());
      setComments([res.comment, ...comments]);
      setCommentText('');
    } catch (err: any) {
      setCollabError(err.message || 'Failed to post comment');
    } finally {
      setCommenting(false);
    }
  };

  const handleToggleResolve = async (comment: ProjectComment) => {
    setCollabError(null);
    try {
      await api.collab.resolveComment(projectId, comment.id, !comment.resolved);
      setComments(
        comments.map((c) => (c.id === comment.id ? { ...c, resolved: !c.resolved } : c))
      );
    } catch (err: any) {
      setCollabError(err.message || 'Failed to update comment');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#10141e] border border-cyan-500/30 rounded-2xl w-full max-w-2xl h-[75vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">Project Collaboration</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Role: {userRole}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-sm">{projectTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 shrink-0">
          <button
            onClick={() => setActiveTab('members')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'members'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            Team Members ({members.length})
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'comments'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Discussions ({comments.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-900/10">
          {activeTab === 'members' ? (
            <div className="space-y-6">
              {/* Invite Form */}
              {(userRole === 'owner' || userRole === 'editor') && (
                <form onSubmit={handleInvite} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5 text-cyan-400" /> Invite Collaborator
                  </span>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="teammate@company.com"
                      className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as any)}
                      className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="editor">Editor (Full edit rights)</option>
                      <option value="reviewer">Reviewer (Comment & review)</option>
                      <option value="viewer">Viewer (Read only)</option>
                    </select>
                    <button
                      type="submit"
                      disabled={inviting || !inviteEmail.trim()}
                      className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow"
                    >
                      {inviting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Invite'}
                    </button>
                  </div>
                </form>
              )}

              {/* Members List */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Project Access List
                </span>
                <div className="space-y-2">
                  {members.map((m) => (
                    <div
                      key={m.id}
                      className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300 text-xs font-bold flex items-center justify-center">
                          {m.email[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-xs text-white">{m.email}</div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                            <span className="capitalize">{m.role}</span>
                            <span>•</span>
                            <span className="capitalize">{m.status}</span>
                          </div>
                        </div>
                      </div>

                      {userRole === 'owner' && (
                        <button
                          onClick={() => handleRemoveMember(m.id)}
                          className="p-1 rounded text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Remove collaborator"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}

                  {members.length === 0 && !loading && (
                    <div className="text-xs text-slate-500 py-6 text-center">
                      No team members invited yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Add Comment Input */}
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Leave a project comment or review note..."
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="submit"
                  disabled={commenting || !commentText.trim()}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-all shadow"
                >
                  {commenting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Post
                </button>
              </form>

              {/* Comments Feed */}
              <div className="space-y-2.5">
                {comments.map((c) => (
                  <div
                    key={c.id}
                    className={`p-3 rounded-xl border transition-all ${
                      c.resolved
                        ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                        : 'bg-slate-900/60 border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-cyan-300">{c.user_name}</span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <button
                        onClick={() => handleToggleResolve(c)}
                        className={`text-[10px] flex items-center gap-1 font-semibold ${
                          c.resolved ? 'text-emerald-400' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {c.resolved ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                        {c.resolved ? 'Resolved' : 'Mark Resolved'}
                      </button>
                    </div>
                    <p className="text-xs text-slate-200 mt-1.5 leading-relaxed">{c.text}</p>
                  </div>
                ))}

                {comments.length === 0 && !loading && (
                  <div className="text-xs text-slate-500 py-8 text-center">
                    No discussions yet. Share feedback or ask questions above.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
