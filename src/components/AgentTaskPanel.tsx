import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Play,
  RotateCcw,
  Ban,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  HelpCircle,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Search,
  FileCode,
  Layers,
  Wand2,
  Database,
  ArrowRight,
} from 'lucide-react';
import { AgentTask, AgentStep, Project } from '../types/index.ts';
import { api } from '../services/api.ts';

interface AgentTaskPanelProps {
  activeProject?: Project | null;
  onNavigateToCreator?: () => void;
}

export const AgentTaskPanel: React.FC<AgentTaskPanelProps> = ({
  activeProject,
  onNavigateToCreator,
}) => {
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<AgentTask | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [goalInput, setGoalInput] = useState('');
  const [isPlanning, setIsPlanning] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);

  // Consequential confirmation modal
  const [confirmModalTask, setConfirmModalTask] = useState<AgentTask | null>(null);

  useEffect(() => {
    loadTasks();
  }, [activeProject]);

  const loadTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.agent.getTasks(activeProject?.id);
      setTasks(data);
      if (data.length > 0) {
        // Automatically select the active or most recent task
        const active = data.find((t) => t.status === 'running' || t.status === 'planned');
        setSelectedTask(active || data[0]);
      } else {
        setSelectedTask(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load agent tasks.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlanTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalInput.trim()) return;

    setIsPlanning(true);
    setError(null);
    try {
      const newTask = await api.agent.createTask({
        goal: goalInput.trim(),
        projectId: activeProject?.id,
      });
      setTasks([newTask, ...tasks]);
      setSelectedTask(newTask);
      setGoalInput('');

      // If task does not require confirmation, offer auto-execution
      if (!newTask.requires_confirmation) {
        handleExecute(newTask.id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create plan.');
    } finally {
      setIsPlanning(false);
    }
  };

  const handleExecute = async (taskId: string) => {
    setIsExecuting(true);
    setError(null);
    try {
      const res = await api.agent.executeTask(taskId);
      setSelectedTask(res.task);
      setTasks(tasks.map((t) => (t.id === taskId ? res.task : t)));
    } catch (err: any) {
      setError(err.message || 'Execution error.');
      // Refresh task state to show failure step
      const updated = await api.agent.getTasks(activeProject?.id);
      setTasks(updated);
      const cur = updated.find((t) => t.id === taskId);
      if (cur) setSelectedTask(cur);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleConfirmAction = async (task: AgentTask) => {
    try {
      const res = await api.agent.confirmTask(task.id);
      setConfirmModalTask(null);
      setSelectedTask(res.task);
      setTasks(tasks.map((t) => (t.id === task.id ? res.task : t)));
      // Run execution immediately after approval
      handleExecute(task.id);
    } catch (err: any) {
      setError(err.message || 'Confirmation failed.');
    }
  };

  const handleCancel = async (taskId: string) => {
    try {
      const res = await api.agent.cancelTask(taskId);
      setSelectedTask(res.task);
      setTasks(tasks.map((t) => (t.id === taskId ? res.task : t)));
    } catch (err: any) {
      setError(err.message || 'Failed to cancel task.');
    }
  };

  const handleRetry = async (taskId: string) => {
    try {
      const res = await api.agent.retryTask(taskId);
      setSelectedTask(res.task);
      setTasks(tasks.map((t) => (t.id === taskId ? res.task : t)));
      handleExecute(taskId);
    } catch (err: any) {
      setError(err.message || 'Retry failed.');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await api.agent.deleteTask(taskId);
      const remaining = tasks.filter((t) => t.id !== taskId);
      setTasks(remaining);
      setSelectedTask(remaining[0] || null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete task.');
    }
  };

  const getStatusBadge = (status: AgentTask['status']) => {
    switch (status) {
      case 'planned':
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-blue-500 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
            <Clock className="w-3 h-3" />
            Planned
          </span>
        );
      case 'running':
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-500 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 animate-pulse">
            <Cpu className="w-3 h-3 animate-spin" />
            Running
          </span>
        );
      case 'completed':
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Completed
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-red-500 dark:text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
            <AlertCircle className="w-3 h-3" />
            Failed
          </span>
        );
      case 'cancelled':
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-500/10 px-2 py-0.5 rounded-full border border-zinc-500/20">
            <Ban className="w-3 h-3" />
            Cancelled
          </span>
        );
    }
  };

  const getToolIcon = (toolName?: string) => {
    switch (toolName) {
      case 'web_search':
        return <Search className="w-3.5 h-3.5 text-blue-400" />;
      case 'project_analysis':
        return <Layers className="w-3.5 h-3.5 text-amber-400" />;
      case 'content_synthesizer':
        return <Wand2 className="w-3.5 h-3.5 text-purple-400" />;
      case 'asset_generator':
        return <Sparkles className="w-3.5 h-3.5 text-emerald-400" />;
      case 'memory_ops':
        return <Database className="w-3.5 h-3.5 text-pink-400" />;
      default:
        return <Cpu className="w-3.5 h-3.5 text-zinc-400" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-50 dark:bg-[#141414]">
      {/* Top Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-white/10 bg-white dark:bg-[#1b1b1b] flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              Hynex Autonomous Agent & Task Hub
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Server-Validated Sandbox
              </span>
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Autonomous multi-step execution with safety gates, persistent recovery, and authorized tool registry.
            </p>
          </div>
        </div>

        {activeProject && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs">
            <span className="text-zinc-400">Linked Project:</span>
            <span className="font-semibold text-zinc-900 dark:text-white">{activeProject.title}</span>
          </div>
        )}
      </div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Column: Tasks List & Goal Creation */}
        <div className="w-full md:w-80 border-r border-zinc-200 dark:border-white/10 bg-white dark:bg-[#181818] flex flex-col h-full overflow-hidden">
          {/* New Goal Input */}
          <form onSubmit={handlePlanTask} className="p-3 border-b border-zinc-200 dark:border-white/10">
            <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              New Agent Objective:
            </label>
            <div className="space-y-2">
              <textarea
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                placeholder="e.g. Audit project scenes, conduct web lore research, and synthesize missing scene prompts..."
                rows={2}
                className="w-full p-2.5 text-xs rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#202020] text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
              <button
                type="submit"
                disabled={isPlanning || !goalInput.trim()}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-all"
              >
                {isPlanning ? (
                  <>
                    <Cpu className="w-3.5 h-3.5 animate-spin" />
                    <span>Decomposing Goal...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Plan Objective</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Task History List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            <div className="px-2 py-1 text-[11px] font-medium text-zinc-400">
              Task Registry ({tasks.length})
            </div>

            {loading ? (
              <div className="text-center py-6 text-xs text-zinc-400">Loading tasks...</div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-8 px-4 text-xs text-zinc-400">
                No active agent tasks. Enter an objective above to plan autonomous operations.
              </div>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                    selectedTask?.id === task.id
                      ? 'border-purple-500 bg-purple-500/10 shadow-2xs'
                      : 'border-zinc-200 dark:border-white/5 bg-zinc-50/50 dark:bg-[#1f1f1f] hover:border-zinc-300 dark:hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-semibold text-xs text-zinc-900 dark:text-white line-clamp-1">
                      {task.title}
                    </span>
                    {getStatusBadge(task.status)}
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2">
                    {task.goal}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-400">
                    <span>{task.steps.length} step(s)</span>
                    <span>{new Date(task.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Execution Panel */}
        <div className="flex-1 flex flex-col h-full overflow-y-auto p-4 md:p-6 bg-zinc-100/50 dark:bg-[#141414]">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-500 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!selectedTask ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="p-4 rounded-2xl bg-zinc-200/50 dark:bg-white/5 text-zinc-400 mb-3">
                <Cpu className="w-10 h-10" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">No Task Selected</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mt-1">
                Select a planned task from the registry or create a new objective to view tool execution in real time.
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-w-4xl mx-auto w-full">
              {/* Task Header Card */}
              <div className="p-5 rounded-2xl bg-white dark:bg-[#1e1e1e] border border-zinc-200 dark:border-white/10 shadow-xs space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                        {selectedTask.title}
                      </h2>
                      {getStatusBadge(selectedTask.status)}
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-300">
                      {selectedTask.goal}
                    </p>
                  </div>

                  {/* Execution Actions */}
                  <div className="flex items-center gap-2">
                    {selectedTask.requires_confirmation && !selectedTask.is_confirmed ? (
                      <button
                        onClick={() => setConfirmModalTask(selectedTask)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Review & Confirm</span>
                      </button>
                    ) : selectedTask.status === 'planned' || selectedTask.status === 'failed' ? (
                      <button
                        onClick={() => handleExecute(selectedTask.id)}
                        disabled={isExecuting}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>{selectedTask.status === 'failed' ? 'Retry Execution' : 'Execute Plan'}</span>
                      </button>
                    ) : null}

                    {selectedTask.status === 'running' && (
                      <button
                        onClick={() => handleCancel(selectedTask.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Cancel Task</span>
                      </button>
                    )}

                    {selectedTask.status === 'failed' && (
                      <button
                        onClick={() => handleRetry(selectedTask.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-200 dark:bg-white/10 text-zinc-800 dark:text-white text-xs font-semibold"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset Plan</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteTask(selectedTask.id)}
                      className="p-1.5 rounded-lg border border-zinc-200 dark:border-white/10 text-zinc-400 hover:text-red-500 hover:bg-red-500/10"
                      title="Delete task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Consequential action alert banner */}
                {selectedTask.requires_confirmation && !selectedTask.is_confirmed && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between text-xs text-amber-600 dark:text-amber-400">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>
                        This task requires user authorization before executing consequential changes.
                      </span>
                    </div>
                    <button
                      onClick={() => setConfirmModalTask(selectedTask)}
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-medium"
                    >
                      Authorize
                    </button>
                  </div>
                )}
              </div>

              {/* Execution Steps */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 px-1">
                  Execution Pipeline ({selectedTask.steps.length} Steps)
                </h3>

                {selectedTask.steps.map((step: AgentStep) => {
                  const isExpanded = expandedStepId === step.id;
                  return (
                    <div
                      key={step.id}
                      className="rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#1e1e1e] overflow-hidden shadow-2xs"
                    >
                      <div
                        onClick={() => setExpandedStepId(isExpanded ? null : step.id)}
                        className="p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-300">
                            {step.step_number}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-zinc-900 dark:text-white">
                                {step.title}
                              </span>
                              <div className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-white/5 text-zinc-500">
                                {getToolIcon(step.tool_name)}
                                <span>{step.tool_name}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {step.status === 'completed' && (
                            <span className="text-emerald-500 text-xs flex items-center gap-1 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Passed
                            </span>
                          )}
                          {step.status === 'running' && (
                            <span className="text-amber-500 text-xs flex items-center gap-1 font-semibold animate-pulse">
                              <Cpu className="w-3.5 h-3.5 animate-spin" />
                              Executing
                            </span>
                          )}
                          {step.status === 'failed' && (
                            <span className="text-red-500 text-xs flex items-center gap-1 font-semibold">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Error
                            </span>
                          )}
                          {step.status === 'pending' && (
                            <span className="text-zinc-400 text-xs flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              Pending
                            </span>
                          )}
                          {step.status === 'skipped' && (
                            <span className="text-zinc-400 text-xs">Skipped</span>
                          )}

                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-zinc-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-zinc-400" />
                          )}
                        </div>
                      </div>

                      {/* Expanded Tool Details */}
                      {isExpanded && (
                        <div className="p-4 border-t border-zinc-100 dark:border-white/5 bg-zinc-50/50 dark:bg-[#181818] space-y-3 text-xs">
                          {/* Tool Input */}
                          <div>
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                              Validated Tool Input
                            </span>
                            <pre className="mt-1 p-2.5 rounded-lg bg-zinc-900 text-zinc-200 font-mono text-[11px] overflow-x-auto border border-white/5">
                              {JSON.stringify(step.tool_input, null, 2)}
                            </pre>
                          </div>

                          {/* Tool Output / Result */}
                          {step.tool_output && (
                            <div>
                              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">
                                Verified Output
                              </span>
                              <pre className="mt-1 p-2.5 rounded-lg bg-zinc-900 text-emerald-400 font-mono text-[11px] overflow-x-auto border border-emerald-500/20">
                                {JSON.stringify(step.tool_output, null, 2)}
                              </pre>
                            </div>
                          )}

                          {/* Step Error */}
                          {step.error && (
                            <div>
                              <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">
                                Error Diagnostic
                              </span>
                              <div className="mt-1 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
                                {step.error}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Task Result Summary */}
              {selectedTask.result && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Task Execution Summary</span>
                  </div>
                  <p className="text-xs text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed">
                    {selectedTask.result}
                  </p>
                  {onNavigateToCreator && (
                    <button
                      onClick={onNavigateToCreator}
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                    >
                      <span>Open in Creator Studio</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Consequential Action Confirmation Modal */}
      {confirmModalTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#1e1e1e] border border-amber-500/30 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Authorization Required
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Consequential Operation Gate
                </p>
              </div>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-700 dark:text-amber-300">
              {confirmModalTask.confirmation_action?.description ||
                'This task will execute significant changes to your persistent assets or memories.'}
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              HYNEX AI strictly protects user data isolation and requires affirmative approval before proceeding with impactful actions.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmModalTask(null)}
                className="px-3 py-1.5 rounded-lg bg-zinc-200 dark:bg-white/10 text-zinc-700 dark:text-zinc-200 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmAction(confirmModalTask)}
                className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold"
              >
                Approve & Execute
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
