import { create } from 'zustand';
import { workflowApi, stepApi, ruleApi, executionApi } from '../services/api';

export const useStore = create((set, get) => ({
  // ── Workflows ───────────────────────────────────────────────────────────────
  workflows: [],
  workflowTotal: 0,
  workflowLoading: false,

  fetchWorkflows: async (params = {}) => {
    set({ workflowLoading: true });
    try {
      const res = await workflowApi.list(params);
      set({ workflows: res.workflows, workflowTotal: res.total, workflowLoading: false });
    } catch (err) {
      set({ workflowLoading: false });
      throw err;
    }
  },

  createWorkflow: async (data) => {
    const res = await workflowApi.create(data);
    set((s) => ({ workflows: [res.workflow, ...s.workflows] }));
    return res.workflow;
  },

  updateWorkflow: async (id, data) => {
    const res = await workflowApi.update(id, data);
    set((s) => ({ workflows: s.workflows.map((w) => (w.id === id ? res.workflow : w)) }));
    return res.workflow;
  },

  deleteWorkflow: async (id) => {
    await workflowApi.delete(id);
    set((s) => ({ workflows: s.workflows.filter((w) => w.id !== id) }));
  },

  executeWorkflow: async (id, data) => {
    const res = await workflowApi.execute(id, data);
    // Add to executions list
    set((s) => ({ executions: [res.execution, ...s.executions] }));
    return res.execution;
  },

  // ── Steps ───────────────────────────────────────────────────────────────────
  steps: {},          // { workflowId: [step, ...] }
  stepsLoading: false,

  fetchSteps: async (workflowId) => {
    set({ stepsLoading: true });
    try {
      const res = await stepApi.list(workflowId);
      set((s) => ({ steps: { ...s.steps, [workflowId]: res.steps }, stepsLoading: false }));
    } catch (err) {
      set({ stepsLoading: false });
      throw err;
    }
  },

  createStep: async (workflowId, data) => {
    const res = await stepApi.create(workflowId, data);
    set((s) => ({
      steps: { ...s.steps, [workflowId]: [...(s.steps[workflowId] || []), res.step] }
    }));
    return res.step;
  },

  updateStep: async (workflowId, stepId, data) => {
    const res = await stepApi.update(stepId, data);
    set((s) => ({
      steps: {
        ...s.steps,
        [workflowId]: (s.steps[workflowId] || []).map((s2) => (s2.id === stepId ? res.step : s2))
      }
    }));
    return res.step;
  },

  deleteStep: async (workflowId, stepId) => {
    await stepApi.delete(stepId);
    set((s) => ({
      steps: { ...s.steps, [workflowId]: (s.steps[workflowId] || []).filter((s2) => s2.id !== stepId) }
    }));
  },

  // ── Rules ───────────────────────────────────────────────────────────────────
  rules: {},          // { stepId: [rule, ...] }

  fetchRules: async (stepId) => {
    const res = await ruleApi.list(stepId);
    set((s) => ({ rules: { ...s.rules, [stepId]: res.rules } }));
    return res.rules;
  },

  createRule: async (stepId, data) => {
    const res = await ruleApi.create(stepId, data);
    set((s) => ({ rules: { ...s.rules, [stepId]: [...(s.rules[stepId] || []), res.rule] } }));
    return res.rule;
  },

  updateRule: async (stepId, ruleId, data) => {
    const res = await ruleApi.update(ruleId, data);
    set((s) => ({
      rules: { ...s.rules, [stepId]: (s.rules[stepId] || []).map((r) => (r.id === ruleId ? res.rule : r)) }
    }));
    return res.rule;
  },

  deleteRule: async (stepId, ruleId) => {
    await ruleApi.delete(ruleId);
    set((s) => ({ rules: { ...s.rules, [stepId]: (s.rules[stepId] || []).filter((r) => r.id !== ruleId) } }));
  },

  reorderRules: async (stepId, updates) => {
    await ruleApi.reorder(updates);
    set((s) => ({
      rules: {
        ...s.rules,
        [stepId]: (s.rules[stepId] || []).map((r) => {
          const u = updates.find((x) => x.id === r.id);
          return u ? { ...r, priority: u.priority } : r;
        }).sort((a, b) => a.priority - b.priority)
      }
    }));
  },

  // ── Executions ──────────────────────────────────────────────────────────────
  executions: [],
  executionTotal: 0,
  executionLoading: false,

  fetchExecutions: async (params = {}) => {
    set({ executionLoading: true });
    try {
      const res = await executionApi.list(params);
      set({ executions: res.executions, executionTotal: res.total, executionLoading: false });
    } catch (err) {
      set({ executionLoading: false });
      throw err;
    }
  },

  cancelExecution: async (id) => {
    const res = await executionApi.cancel(id);
    set((s) => ({ executions: s.executions.map((e) => (e.id === id ? res.execution : e)) }));
    return res.execution;
  },

  retryExecution: async (id) => {
    const res = await executionApi.retry(id);
    set((s) => ({ executions: s.executions.map((e) => (e.id === id ? res.execution : e)) }));
    return res.execution;
  },
}));
