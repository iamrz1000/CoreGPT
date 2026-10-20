import React, { useState, useEffect } from 'react';
import { api, ApiError } from '../services/api.ts';
import { AdminAuditLog, AdminStats, AppSetting, User } from '../types/index.ts';
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
            <div className="flex items-center justify-between gap-4">
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
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-zinc-800/60 border-b border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Daily Quota Override</th>
                    <th className="py-3 px-4">Registered</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 text-slate-700 dark:text-zinc-300">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-zinc-100">
                          {u.displayName}
                        </div>
                        <div className="text-[10px] text-slate-400">{u.email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={u.role}
                          onChange={(e) => handleUpdateUserRole(u, e.target.value as 'user' | 'admin')}
                          disabled={u.id === currentUser.id}
                          className="px-2 py-1 rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs font-medium cursor-pointer"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
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
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          placeholder="Default (20)"
                          defaultValue={u.dailyQuotaOverride ?? ''}
                          onBlur={(e) => handleUpdateUserQuota(u.id, e.target.value)}
                          className="w-24 px-2 py-1 rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs"
                        />
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-400">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleUpdateUserStatus(u)}
                          disabled={u.id === currentUser.id}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                            u.status === 'active'
                              ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40'
                              : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                          } disabled:opacity-30 disabled:cursor-not-allowed`}
                        >
                          {u.status === 'active' ? 'Suspend' : 'Reactivate'}
                        </button>
                      </td>
                    </tr>
                  ))}
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
    </div>
  );
};
