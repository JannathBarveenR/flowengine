const ExecutionModel = require('../models/Execution');
const StepModel = require('../models/Step');
const WorkflowModel = require('../models/Workflow');
const { runWorkflow } = require('../services/ruleEngine');
const logger = require('../config/logger');

// GET /executions
exports.list = async (req, res) => {
  try {
    const { workflow_id, status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const result = await ExecutionModel.findAll({ workflowId: workflow_id, status, limit: parseInt(limit), offset });
    res.json({ success: true, ...result, page: parseInt(page) });
  } catch (err) {
    logger.error('list executions error', { err: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /executions/:id
exports.get = async (req, res) => {
  try {
    const execution = await ExecutionModel.findById(req.params.id);
    if (!execution) return res.status(404).json({ success: false, error: 'Execution not found' });
    res.json({ success: true, execution });
  } catch (err) {
    logger.error('get execution error', { err: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /executions/:id/cancel
exports.cancel = async (req, res) => {
  try {
    const execution = await ExecutionModel.cancel(req.params.id);
    if (!execution) return res.status(404).json({ success: false, error: 'Execution not found or not cancellable' });
    res.json({ success: true, execution });
  } catch (err) {
    logger.error('cancel execution error', { err: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /executions/:id/retry
exports.retry = async (req, res) => {
  try {
    const existing = await ExecutionModel.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Execution not found' });
    if (existing.status !== 'failed') return res.status(400).json({ success: false, error: 'Only failed executions can be retried' });

    const workflow = await WorkflowModel.findById(existing.workflow_id);
    if (!workflow) return res.status(404).json({ success: false, error: 'Workflow not found' });

    // Increment retry count
    await ExecutionModel.incrementRetry(existing.id);

    // Find failed step and re-run from there
    const { steps, rulesByStep } = await StepModel.findWithRulesByWorkflow(existing.workflow_id);
    const failedLog = (existing.logs || []).find(l => l.status === 'failed');
    const retryFromStepId = failedLog?.step_id || workflow.start_step_id;

    const retryWorkflow = { ...workflow, start_step_id: retryFromStepId };
    const { logs: newLogs, status } = await runWorkflow({
      workflow: retryWorkflow,
      steps,
      rulesByStep,
      inputData: existing.data
    });

    // Merge old completed logs with new logs
    const completedLogs = (existing.logs || []).filter(l => l.status === 'completed');
    const mergedLogs = [...completedLogs, ...newLogs];

    const updated = await ExecutionModel.updateStatus(existing.id, {
      status,
      logs: mergedLogs,
      current_step_id: null,
      ended_at: new Date().toISOString()
    });

    logger.info('Execution retried', { executionId: existing.id, status });
    res.json({ success: true, execution: updated });
  } catch (err) {
    logger.error('retry execution error', { err: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
};
