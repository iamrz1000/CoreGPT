import React, { useState, useEffect } from 'react';
import {
  GitFork,
  X,
  Play,
  Plus,
  CheckCircle2,
  PauseCircle,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { WorkflowDef, WorkflowExecution } from '../types/index.ts';

interface WorkflowRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
}

export const WorkflowRecorderModal: React.FC<WorkflowRecorderModalProps> = ({
  isOpen,
  onClose,
  projectId,
}) => {
  const [workflows, setWorkflows] = useState<WorkflowDef[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowDef | null>(null);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [currentExecution, setCurrentExecution] = useState<WorkflowExecution | null>(null);
  const [inputValues, setInputValues] = useState<Record<string, any>>({});
  const [isEditing, setIsEditing] = useState(false);

  // Workflow Edit State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState<WorkflowDef['steps']>([]);
  const [inputs, setInputs] = useState<WorkflowDef['inputs']>([]);
  const [workflowError, setWorkflowError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadWorkflows();
    }
  }, [isOpen, projectId]);

  const loadWorkflows = async () => {
    setLoading(true);
    try {
      const res = await api.workflows.list(projectId);
      setWorkflows(res.workflows);
      if (res.workflows.length > 0 && !selectedWorkflow) {
        selectWorkflow(res.workflows[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const selectWorkflow = (wf: WorkflowDef) => {
    setSelectedWorkflow(wf);
    setName(wf.name);
    setDescription(wf.description);
    setSteps(wf.steps);
    setInputs(wf.inputs);
    setCurrentExecution(null);
    setIsEditing(false);

    const defaults: Record<string, any> = {};
    wf.inputs?.forEach((inp) => {
      defaults[inp.key] = inp.default_value || '';
    });
    setInputValues(defaults);
  };

  const handleCreateNew = () => {
    setSelectedWorkflow(null);
    setName('New Multi-Step Automation');
    setDescription('Chains web research, copy generation, and factual truth verification.');
    setInputs([
      { key: 'topic', label: 'Research Topic / Theme', type: 'text', default_value: 'Artificial General Intelligence' },
      { key: 'target_length', label: 'Target Length (words)', type: 'number', default_value: '500' },
    ]);
    setSteps([
      {
        id: 'step_1',
        step_number: 1,
        title: 'Deep Web Fact Search',
        tool: 'search_web',
        config: { query: 'Latest developments in {{topic}}' },
      },
      {
        id: 'step_2',
        step_number: 2,
        title: 'Draft Executive Briefing',
        tool: 'generate_text',
        config: { prompt: 'Write an executive summary based on findings: {{step_1}}' },
        dependencies: ['step_1'],
      },
      {
        id: 'step_3',
        step_number: 3,
        title: 'Factual Accuracy TruthCheck',
        tool: 'truth_check',
        config: {},
        dependencies: ['step_2'],
        requires_approval: true,
      },
    ]);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      if (selectedWorkflow) {
        const res = await api.workflows.update(selectedWorkflow.id, {
          name,
          description,
          inputs,
          steps,
        });
        setSelectedWorkflow(res.workflow);
      } else {
        const res = await api.workflows.create({
          name,
          description,
          project_id: projectId,
          inputs,
          steps,
        });
        setSelectedWorkflow(res.workflow);
      }
      setIsEditing(false);
      setWorkflowError(null);
      await loadWorkflows();
    } catch (err: any) {
      setWorkflowError(err.message || 'Failed to save workflow');
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async (approvedStepIds: string[] = []) => {
    if (!selectedWorkflow) return;
    setExecuting(true);
    setWorkflowError(null);
    try {
      const res = await api.workflows.execute(selectedWorkflow.id, {
        inputs: inputValues,
        approved_steps: approvedStepIds,
      });
      setCurrentExecution(res.execution);
    } catch (err: any) {
      setWorkflowError(err.message || 'Execution failed');
    } finally {
      setExecuting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0e121a] border border-cyan-500/30 rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <GitFork className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">Workflow Recorder & Runner</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Orchestrator
                </span>
              </div>
              <p className="text-xs text-slate-400">Build, chain, and automate multi-tool creative pipelines with approval gates</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2-Column Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Workflows List */}
          <div className="w-64 border-r border-slate-800/80 bg-slate-950/40 p-4 flex flex-col justify-between shrink-0">
            <div className="space-y-2 overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Workflows</span>
                <button
                  onClick={handleCreateNew}
                  className="p-1 rounded bg-blue-600/30 text-blue-300 hover:bg-blue-600/50 transition-colors"
                  title="Create Workflow"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {workflows.map((w) => (
                <div
                  key={w.id}
                  onClick={() => selectWorkflow(w)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    selectedWorkflow?.id === w.id
                      ? 'bg-blue-600/15 border-blue-500/40 text-white'
                      : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-900 text-slate-300'
                  }`}
                >
                  <div className="font-semibold text-xs truncate">{w.name}</div>
                  <div className="text-[10px] text-slate-400 mt-1">{w.steps?.length || 0} steps configured</div>
                </div>
              ))}

              {workflows.length === 0 && !loading && (
                <div className="text-xs text-slate-500 py-6 text-center">
                  No workflows found. Click New Workflow to create your first pipeline.
                </div>
              )}
            </div>

            <button
              onClick={handleCreateNew}
              className="w-full mt-4 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
            >
              <Plus className="w-4 h-4" />
              New Workflow
            </button>
          </div>

          {/* Right: Main View / Execution Console */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-900/20">
            {selectedWorkflow || isEditing ? (
              <div className="space-y-6 max-w-3xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-white">{name}</h3>
                    <p className="text-xs text-slate-400">{description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isEditing ? (
                      <>
                        <button
                          onClick={() => setIsEditing(true)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition-colors"
                        >
                          Edit Steps
                        </button>
                        <button
                          onClick={() => handleExecute()}
                          disabled={executing}
                          className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow"
                        >
                          {executing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                          Run Pipeline
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={handleSave}
                        disabled={loading || !name.trim()}
                        className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow"
                      >
                        Save Workflow
                      </button>
                    )}
                  </div>
                </div>

                {workflowError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{workflowError}</span>
                  </div>
                )}

                {/* Dynamic Inputs Form */}
                {inputs && inputs.length > 0 && !isEditing && (
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Workflow Parameters
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {inputs.map((inp) => (
                        <div key={inp.key} className="space-y-1">
                          <label className="text-xs text-slate-300 font-medium">{inp.label}</label>
                          <input
                            type={inp.type === 'number' ? 'number' : 'text'}
                            value={inputValues[inp.key] ?? ''}
                            onChange={(e) =>
                              setInputValues({ ...inputValues, [inp.key]: e.target.value })
                            }
                            className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pipeline Steps Sequence */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Execution Steps ({steps.length})
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {steps.map((st, idx) => {
                      const result = currentExecution?.step_results?.[st.id];
                      const isCurrentStep = currentExecution?.current_step_index === idx;
                      const isPausedHere =
                        currentExecution?.status === 'paused' && currentExecution.current_step_index === idx;

                      return (
                        <div
                          key={st.id}
                          className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center">
                                {st.step_number || idx + 1}
                              </span>
                              <div>
                                <span className="font-semibold text-xs text-white">{st.title}</span>
                                <span className="text-[10px] text-blue-400 ml-2 font-mono">[{st.tool}]</span>
                              </div>
                            </div>

                            {/* Status badge */}
                            {currentExecution && (
                              <div>
                                {result ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                    <CheckCircle2 className="w-3 h-3" /> Completed
                                  </span>
                                ) : isPausedHere ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                    <PauseCircle className="w-3 h-3" /> Waiting Approval
                                  </span>
                                ) : isCurrentStep && executing ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                                    <Loader2 className="w-3 h-3 animate-spin" /> Running
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-500 font-semibold uppercase">Pending</span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Approval Gate Button if paused */}
                          {isPausedHere && (
                            <div className="mt-3 p-3 bg-amber-950/20 border border-amber-500/30 rounded-lg flex items-center justify-between">
                              <span className="text-xs text-amber-200">
                                This step requires manual confirmation before proceeding.
                              </span>
                              <button
                                onClick={() => handleExecute([st.id])}
                                className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded shadow transition-all"
                              >
                                Approve & Resume
                              </button>
                            </div>
                          )}

                          {/* Result output preview if available */}
                          {result && (
                            <div className="mt-2 p-2.5 bg-slate-950 rounded border border-slate-800 text-[11px] text-slate-300 font-mono max-h-36 overflow-y-auto custom-scrollbar">
                              {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 text-slate-500">
                <GitFork className="w-12 h-12 mb-3 text-slate-600" />
                <p className="text-sm font-medium">Select a workflow from the list or create a new automation.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
