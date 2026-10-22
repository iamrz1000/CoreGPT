import React, { useState, useEffect } from 'react';
import { api, ApiError } from '../services/api.ts';
import { AdminAuditLog, AdminStats, AppSetting, User, UserChatHistory } from '../types/index.ts';
import {
  Shield,
  Users,
  Activity,
  MessageSquare,
  Image as ImageIcon,
  Settings,
  History,
  Search,
  Check,
  AlertCircle,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  ShieldAlert,
  Server,
  Lock,
  Trash2,
  Eye,
  EyeOff,
  Key,
  Mail,
  X,
  Bot,
  User as UserIcon,
  AlertTriangle,
} from 'lucide-react';

interface AdminDashboardProps {
  currentUser: User;
  onClose: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser, onClose }) => {
  const [tab, setTab] = useState<'overview' | 'users' | 'settings' | 'audit' | 'setup'>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<Record<string, AppSetting>>({});
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [searchUser, setSearchUser] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // History inspection state
  const [inspectUserHistory, setInspectUserHistory] = useState<UserChatHistory | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [historySearch, setHistorySearch] = useState('');

  // Delete modal state
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reveal password hashes toggle
  const [revealedHashes, setRevealedHashes] = useState<Record<string, boolean>>({});

  // Editable settings state
  const [textQuota, setTextQuota] = useState('20');
  const [imageQuota, setImageQuota] = useState('5');
  const [imageEnabled, setImageEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [defaultModel, setDefaultModel] = useState('gemini-3.8-flash');

  // Setup secret promotion form
  const [setupSecret, setSetupSecret] = useState('');
  const [setupTargetEmail, setSetupTargetEmail] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewData, usersData, settingsData, logsData] = await Promise.all([
        api.admin.overview(),
        api.admin.users(),
        api.admin.settings(),
        api.admin.auditLogs(),
      ]);

      setStats(overviewData);
      setUsers(usersData.users || []);
      setSettings(settingsData.settings || {});
      setAuditLogs(logsData.logs || []);

      if (settingsData.settings?.default_user_daily_quota) {
        setTextQuota(settingsData.settings.default_user_daily_quota.value);
      }
      if (settingsData.settings?.default_image_daily_quota) {
        setImageQuota(settingsData.settings.default_image_daily_quota.value);
      }
      if (settingsData.settings?.image_generation_enabled) {
        setImageEnabled(settingsData.settings.image_generation_enabled.value === 'true');
      }
      if (settingsData.settings?.voice_features_enabled) {
        setVoiceEnabled(settingsData.settings.voice_features_enabled.value === 'true');
      }
      if (settingsData.settings?.default_model) {
        setDefaultModel(settingsData.settings.default_model.value);
      }
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Failed to load administrative data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateUserStatus = async (user: User) => {
    try {
      const newStatus = user.status === 'active' ? 'suspended' : 'active';
      await api.admin.updateUser(user.id, { status: newStatus });
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u))
      );
      setSuccessMsg(`User ${user.email} status updated to ${newStatus}`);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
    }
  };

  const handleUpdateUserRole = async (user: User, newRole: 'user' | 'admin') => {
    try {
      await api.admin.updateUser(user.id, { role: newRole });
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u))
      );
      setSuccessMsg(`User ${user.email} role updated to ${newRole}`);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
    }
  };

  const handleUpdateUserQuota = async (userId: string, val: string) => {
    try {
      const parsed = val === '' ? null : parseInt(val, 10);
      await api.admin.updateUser(userId, { dailyQuotaOverride: parsed });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, dailyQuotaOverride: parsed } : u))
      );
      setSuccessMsg('User quota override updated');
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    try {
      await api.admin.updateSettings({
        default_user_daily_quota: textQuota,
        default_image_daily_quota: imageQuota,
        image_generation_enabled: String(imageEnabled),
        voice_features_enabled: String(voiceEnabled),
        default_model: defaultModel,
      });
      setSuccessMsg('Application settings successfully saved and applied.');
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Failed to update settings.');
    }
  };

  const handleAdminSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await api.admin.setup(setupSecret, setupTargetEmail);
      setSuccessMsg(res.message);
      loadData();
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Admin promotion failed.');
    }
  };

  const handleInspectHistory = async (userId: string) => {
    setHistoryLoading(true);
    setError(null);
    try {
      const history = await api.admin.getUserHistory(userId);
      setInspectUserHistory(history);
      setSelectedConversationId(history.conversations[0]?.id || null);
      setHistorySearch('');
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Failed to load user chat history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    setError(null);
    try {
      const res = await api.admin.deleteUser(userToDelete.id);
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      setSuccessMsg(res.message);
      setUserToDelete(null);
      // Refresh stats
      api.admin.overview().then(setStats).catch(() => {});
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Failed to delete user account.');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleRevealHash = (userId: string) => {
    setRevealedHashes((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(searchUser.toLowerCase()) ||
      u.displayName.toLowerCase().includes(searchUser.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#fbfbfa] dark:bg-[#09090b] transition-colors">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-white/80 dark:bg-[#111114]/80 backdrop-blur-xl shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-zinc-100">
                  Administrative Governance
                </h2>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  EXECUTIVE ACCESS
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Connected as <span className="font-mono text-slate-700 dark:text-zinc-300">{currentUser.email}</span> · Dedicated Root Admin
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="py-1.5 px-3 rounded-lg border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-700 dark:text-zinc-300 text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
              title="Refresh Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={onClose}
              className="py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-medium transition-colors"
            >
              Back to Studio
            </button>
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Nav Tabs */}
        <div className="flex border-b border-slate-200/80 dark:border-white/[0.08] space-x-1 sm:space-x-4">
          <button
            onClick={() => setTab('overview')}
            className={`py-2.5 px-3 text-xs sm:text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${
              tab === 'overview'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200'
            }`}
          >
            <Activity className="w-4 h-4" /> Overview
          </button>
          <button
            onClick={() => setTab('users')}
            className={`py-2.5 px-3 text-xs sm:text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${
              tab === 'users'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200'
            }`}
          >
            <Users className="w-4 h-4" /> Users ({users.length})
          </button>
          <button
            onClick={() => setTab('settings')}
            className={`py-2.5 px-3 text-xs sm:text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${
              tab === 'settings'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200'
            }`}
          >
            <Settings className="w-4 h-4" /> App Settings
          </button>
          <button
            onClick={() => setTab('audit')}
            className={`py-2.5 px-3 text-xs sm:text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${
              tab === 'audit'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200'
            }`}
          >
            <History className="w-4 h-4" /> Audit Logs
          </button>
          <button
            onClick={() => setTab('setup')}
            className={`py-2.5 px-3 text-xs sm:text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${
              tab === 'setup'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200'
            }`}
          >
            <Lock className="w-4 h-4" /> Secret Key Setup
          </button>
        </div>

        {/* TAB: OVERVIEW */}
        {tab === 'overview' && stats && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-5 rounded-xl bg-white dark:bg-[#111114] border border-slate-200/80 dark:border-white/[0.08] shadow-xs">
                <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 text-xs font-medium mb-2">
                  <span>Total Registered</span>
                  <Users className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-semibold font-mono tabular-nums text-slate-900 dark:text-zinc-100">
                  {stats.totalUsers}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 font-mono tabular-nums">{stats.activeUsers} active in 24h</p>
              </div>

              <div className="p-5 rounded-xl bg-white dark:bg-[#111114] border border-slate-200/80 dark:border-white/[0.08] shadow-xs">
                <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 text-xs font-medium mb-2">
                  <span>Messages Today</span>
                  <MessageSquare className="w-4 h-4 text-teal-500" />
                </div>
                <div className="text-2xl font-semibold font-mono tabular-nums text-slate-900 dark:text-zinc-100">
                  {stats.messagesToday}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 font-mono tabular-nums">{stats.totalMessages} all-time</p>
              </div>

              <div className="p-5 rounded-xl bg-white dark:bg-[#111114] border border-slate-200/80 dark:border-white/[0.08] shadow-xs">
                <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 text-xs font-medium mb-2">
                  <span>Images Synthesized</span>
                  <ImageIcon className="w-4 h-4 text-cyan-500" />
                </div>
                <div className="text-2xl font-semibold font-mono tabular-nums text-slate-900 dark:text-zinc-100">
                  {stats.imagesToday}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 font-mono tabular-nums">{stats.totalImages} all-time</p>
              </div>

              <div className="p-5 rounded-xl bg-white dark:bg-[#111114] border border-slate-200/80 dark:border-white/[0.08] shadow-xs">
                <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 text-xs font-medium mb-2">
                  <span>Runtime Health</span>
                  <Server className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400 capitalize">
                  {stats.health}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 font-mono tabular-nums">Uptime: {Math.floor(stats.uptime / 60)}m</p>
              </div>
            </div>

            {/* Provider and Mode Status */}
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                Configured AI Models & Features
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-800">
                  <div className="text-xs font-bold text-slate-800 dark:text-zinc-200">Gemini 3.8 Flash</div>
                  <div className="text-[11px] text-emerald-600 font-medium">Default Chat Engine • Active</div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-800">
                  <div className="text-xs font-bold text-slate-800 dark:text-zinc-200">Gemini 3.1 Flash-Lite Image</div>
                  <div className="text-[11px] text-teal-600 font-medium">Image Studio Engine • Active</div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-800">
                  <div className="text-xs font-bold text-slate-800 dark:text-zinc-200">Gemini 3.8 Flash-Lite TTS</div>
                  <div className="text-[11px] text-cyan-600 font-medium">Voice Speech Engine • Active</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: USERS */}
        {tab === 'users' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  placeholder="Search user by name or email..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
                <span className="font-semibold text-slate-800 dark:text-zinc-200 font-mono">
                  {filteredUsers.length}
                </span>
                <span>registered accounts</span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-zinc-800/60 border-b border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">User / Gmail</th>
                    <th className="py-3 px-4">Password & Auth Status</th>
                    <th className="py-3 px-4">Chat History</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Quota Override</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 text-slate-700 dark:text-zinc-300">
                  {filteredUsers.map((u) => {
                    const isGoogle = u.authType === 'google' || u.email.endsWith('@gmail.com');
                    const isRevealed = !!revealedHashes[u.id];

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                        {/* User / Gmail Column */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-xs shrink-0">
                              {u.displayName[0]?.toUpperCase() || 'U'}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                                <span>{u.displayName}</span>
                                {isGoogle && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                    Gmail
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                                <Mail className="w-3 h-3 shrink-0 text-slate-400" />
                                <span>{u.email}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Password & Security Status Column */}
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              {isGoogle ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                                  <span>Google OAuth 2.0</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                  <Lock className="w-2.5 h-2.5" />
                                  <span>Bcrypt Salted</span>
                                </span>
                              )}
                              <button
                                onClick={() => toggleRevealHash(u.id)}
                                className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 transition-colors"
                                title={isRevealed ? 'Hide Hash Security Digest' : 'View Hash Security Digest'}
                              >
                                {isRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              </button>
                            </div>
                            <div className="text-[10px] font-mono text-slate-500 dark:text-zinc-400">
                              {isRevealed ? (
                                <span className="bg-slate-100 dark:bg-black/40 px-1.5 py-0.5 rounded text-[10px] text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-white/5">
                                  {u.passwordHashPreview || '••••••••'}
                                </span>
                              ) : (
                                <span>••••••••••••</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Chat History Column */}
                        <td className="py-3 px-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-900 dark:text-zinc-100">
                                {u.conversationCount ?? 0}
                              </span>
                              <span className="text-slate-400">chats</span>
                              <span className="text-slate-400">•</span>
                              <span className="font-semibold text-slate-900 dark:text-zinc-100">
                                {u.messageCount ?? 0}
                              </span>
                              <span className="text-slate-400">msgs</span>
                            </div>
                            <button
                              onClick={() => handleInspectHistory(u.id)}
                              disabled={historyLoading}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                              title="Inspect full conversation logs and messages"
                            >
                              <MessageSquare className="w-3 h-3" />
                              <span>Inspect History</span>
                            </button>
                          </div>
                        </td>

                        {/* Role Column */}
                        <td className="py-3 px-4">
                          <select
                            value={u.role}
                            onChange={(e) => handleUpdateUserRole(u, e.target.value as 'user' | 'admin')}
                            disabled={u.id === currentUser.id}
                            className="px-2 py-1 rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs font-medium cursor-pointer disabled:opacity-50"
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>

                        {/* Status Column */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              u.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                            }`}
                          >
                            {u.status}
                          </span>
                        </td>

                        {/* Quota Override */}
                        <td className="py-3 px-4">
                          <input
                            type="number"
                            placeholder="Default (20)"
                            defaultValue={u.dailyQuotaOverride ?? ''}
                            onBlur={(e) => handleUpdateUserQuota(u.id, e.target.value)}
                            className="w-20 px-2 py-1 rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs"
                          />
                        </td>

                        {/* Actions (Suspend & Delete) */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleUpdateUserStatus(u)}
                              disabled={u.id === currentUser.id}
                              className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                                u.status === 'active'
                                  ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                                  : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                              } disabled:opacity-30 disabled:cursor-not-allowed`}
                              title={u.status === 'active' ? 'Suspend Account' : 'Reactivate Account'}
                            >
                              {u.status === 'active' ? 'Suspend' : 'Activate'}
                            </button>

                            <button
                              onClick={() => setUserToDelete(u)}
                              disabled={u.id === currentUser.id}
                              className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                              title={
                                u.id === currentUser.id
                                  ? 'Cannot delete your own administrator account'
                                  : `Permanently delete user ${u.email}`
                              }
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: SETTINGS */}
        {tab === 'settings' && (
          <form onSubmit={handleSaveSettings} className="space-y-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                Daily Message & Image Quotas
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Normal User Daily Message Quota
                  </label>
                  <input
                    type="number"
                    value={textQuota}
                    onChange={(e) => setTextQuota(e.target.value)}
                    min={1}
                    max={500}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Administrators always retain unlimited messages.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Normal User Daily Image Quota
                  </label>
                  <input
                    type="number"
                    value={imageQuota}
                    onChange={(e) => setImageQuota(e.target.value)}
                    min={1}
                    max={100}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Allocated daily generations for Image Studio.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                  Feature Switches
                </h4>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/40">
                  <div>
                    <span className="text-xs font-semibold block text-slate-800 dark:text-zinc-200">
                      Enable Image Generation
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Allows normal users to generate images via Gemini model
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setImageEnabled(!imageEnabled)}
                    className="text-emerald-600"
                  >
                    {imageEnabled ? (
                      <ToggleRight className="w-8 h-8" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-slate-400" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/40">
                  <div>
                    <span className="text-xs font-semibold block text-slate-800 dark:text-zinc-200">
                      Enable Voice & Speech Features
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Enables voice chat mode and text-to-speech audio rendering
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setVoiceEnabled(!voiceEnabled)}
                    className="text-emerald-600"
                  >
                    {voiceEnabled ? (
                      <ToggleRight className="w-8 h-8" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-slate-400" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="py-2.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-all shadow-md shadow-emerald-600/20"
              >
                Save Settings
              </button>
            </div>
          </form>
        )}

        {/* TAB: AUDIT LOGS */}
        {tab === 'audit' && (
          <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
              Security & Administrative Audit Logs ({auditLogs.length})
            </h3>
            <div className="divide-y divide-slate-100 dark:divide-zinc-800">
              {auditLogs.length === 0 ? (
                <p className="text-xs text-slate-400 py-4">No audit events recorded yet.</p>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="py-3 flex items-start justify-between gap-4 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {log.action}
                        </span>
                        <span className="text-slate-500 dark:text-zinc-400">• {log.admin_email}</span>
                      </div>
                      {log.details && (
                        <p className="text-slate-700 dark:text-zinc-300 text-[11px] mt-0.5">
                          {log.details}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB: SETUP */}
        {tab === 'setup' && (
          <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-500" />
              One-Time Administrator Setup
            </h3>
            <p className="text-xs text-slate-600 dark:text-zinc-400">
              If an administrator needs to promote an existing registered account using the configured{' '}
              <code className="text-emerald-600 font-mono">ADMIN_SETUP_SECRET</code> environment key.
            </p>

            <form onSubmit={handleAdminSetupSubmit} className="space-y-3 max-w-md">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Target User Email
                </label>
                <input
                  type="email"
                  required
                  value={setupTargetEmail}
                  onChange={(e) => setSetupTargetEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Admin Setup Secret Key
                </label>
                <input
                  type="password"
                  required
                  value={setupSecret}
                  onChange={(e) => setSetupSecret(e.target.value)}
                  placeholder="Enter ADMIN_SETUP_SECRET"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100"
                />
              </div>

              <button
                type="submit"
                className="py-2.5 px-5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs"
              >
                Promote to Administrator
              </button>
            </form>
          </div>
        )}
      </div>

      {/* MODAL: CHAT HISTORY INSPECTOR */}
      {inspectUserHistory && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
          <div className="w-full max-w-4xl max-h-[88vh] bg-white dark:bg-[#121215] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Top Bar */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50/70 dark:bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-sm">
                  {inspectUserHistory.user.displayName[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                      {inspectUserHistory.user.displayName}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase ${
                        inspectUserHistory.user.role === 'admin'
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                          : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-zinc-300'
                      }`}
                    >
                      {inspectUserHistory.user.role}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    <span className="font-mono text-slate-700 dark:text-zinc-300">{inspectUserHistory.user.email}</span>
                    <span>•</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      {inspectUserHistory.totalConversations} conversations ({inspectUserHistory.totalMessages} messages)
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setInspectUserHistory(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                title="Close Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            {inspectUserHistory.conversations.length === 0 ? (
              <div className="flex-1 p-12 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-3 text-slate-400">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-slate-800 dark:text-zinc-200">No Chat History Recorded</h4>
                <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mt-1">
                  This user has signed in but has not initiated any chat conversations or sent messages yet.
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
                {/* Left: Conversations list */}
                <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-200 dark:border-white/10 flex flex-col bg-slate-50/50 dark:bg-black/20">
                  <div className="p-3 border-b border-slate-200 dark:border-white/10">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        placeholder="Filter chats by title..."
                        value={historySearch}
                        onChange={(e) => setHistorySearch(e.target.value)}
                        className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#18181b] text-slate-900 dark:text-zinc-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-white/[0.04]">
                    {inspectUserHistory.conversations
                      .filter((c) => (c.title || '').toLowerCase().includes(historySearch.toLowerCase()))
                      .map((conv) => {
                        const isSelected = (selectedConversationId || inspectUserHistory.conversations[0]?.id) === conv.id;
                        return (
                          <button
                            key={conv.id}
                            onClick={() => setSelectedConversationId(conv.id)}
                            className={`w-full text-left p-3 transition-colors ${
                              isSelected
                                ? 'bg-emerald-500/10 dark:bg-emerald-500/15 border-l-2 border-emerald-500'
                                : 'hover:bg-slate-100/60 dark:hover:bg-white/[0.04]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="text-xs font-semibold truncate text-slate-900 dark:text-white">
                                {conv.title || 'Untitled Chat'}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-slate-200/80 dark:bg-white/10 text-slate-600 dark:text-zinc-400 shrink-0">
                                {conv.messages?.length || 0} msgs
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span className="truncate max-w-[130px] font-mono">{conv.model}</span>
                              <span>{new Date(conv.updated_at).toLocaleDateString()}</span>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>

                {/* Right: Message Stream */}
                {(() => {
                  const activeConv =
                    inspectUserHistory.conversations.find((c) => c.id === selectedConversationId) ||
                    inspectUserHistory.conversations[0];

                  return (
                    <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-[#121215]">
                      {activeConv ? (
                        <>
                          <div className="p-3 px-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50/40 dark:bg-white/[0.01]">
                            <div>
                              <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {activeConv.title || 'Untitled Chat'}
                              </h4>
                              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                                Model: {activeConv.model} • Started: {new Date(activeConv.created_at).toLocaleString()}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400">
                              {activeConv.messages.length} messages
                            </span>
                          </div>
                          <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {activeConv.messages.length === 0 ? (
                              <div className="text-center py-10 text-xs text-slate-400">
                                No messages in this conversation.
                              </div>
                            ) : (
                              activeConv.messages.map((msg) => (
                                <div
                                  key={msg.id}
                                  className={`flex gap-3 text-xs ${
                                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                                  }`}
                                >
                                  {msg.role !== 'user' && (
                                    <div className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 flex items-center justify-center shrink-0 mt-0.5">
                                      <Bot className="w-4 h-4" />
                                    </div>
                                  )}
                                  <div
                                    className={`max-w-[85%] rounded-2xl p-3.5 space-y-1.5 ${
                                      msg.role === 'user'
                                        ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white rounded-tr-xs'
                                        : 'bg-slate-100 dark:bg-zinc-800/80 text-slate-900 dark:text-zinc-100 border border-slate-200/80 dark:border-white/5 rounded-tl-xs'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-3 text-[10px] opacity-75">
                                      <span className="font-semibold capitalize">{msg.role}</span>
                                      <span className="font-mono">{new Date(msg.created_at).toLocaleTimeString()}</span>
                                    </div>
                                    <div className="whitespace-pre-wrap break-words leading-relaxed text-xs">
                                      {msg.content}
                                    </div>
                                    {msg.image_url && (
                                      <div className="mt-2 rounded-lg overflow-hidden border border-black/10 dark:border-white/10 max-w-xs">
                                        <img src={msg.image_url} alt="Attachment" className="w-full h-auto object-cover" />
                                      </div>
                                    )}
                                  </div>
                                  {msg.role === 'user' && (
                                    <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white flex items-center justify-center shrink-0 mt-0.5">
                                      <UserIcon className="w-4 h-4" />
                                    </div>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
                          Select a conversation from the left to view messages.
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: DELETE USER CONFIRMATION */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-[#121215] border border-red-500/30 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete User Account</h3>
                <p className="text-xs text-red-500">Irreversible Action • Only Admin</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-red-500/5 border border-red-500/15 text-xs text-slate-700 dark:text-zinc-300 space-y-2">
              <p>
                Are you sure you want to permanently delete user{' '}
                <span className="font-semibold text-slate-900 dark:text-white">{userToDelete.displayName}</span> (
                <span className="font-mono text-slate-900 dark:text-white">{userToDelete.email}</span>)?
              </p>
              <p className="text-slate-500 dark:text-zinc-400 text-[11px]">
                This will permanently erase all data associated with this user:
              </p>
              <ul className="list-disc pl-4 text-[11px] text-slate-500 dark:text-zinc-400 space-y-0.5">
                <li>Account profile, credentials, and authentication sessions</li>
                <li>
                  {userToDelete.conversationCount ?? 0} chat conversations &amp; {userToDelete.messageCount ?? 0} messages
                </li>
                <li>Daily usage logs and generated images/videos</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setUserToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteUser}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Deleting User...' : 'Permanently Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
