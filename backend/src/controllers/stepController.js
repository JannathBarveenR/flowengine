const StepModel = require('../models/Step');
const WorkflowModel = require('../models/Workflow');
const logger = require('../config/logger');

// GET /workflows/:workflow_id/steps
exports.list = async (req, res) => {
  try {
    const steps = await StepModel.findByWorkflow(req.params.workflow_id);
    res.json({ success: true, steps });
  } catch (err) {
    logger.error('list steps error', { err: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /workflows/:workflow_id/steps
exports.create = async (req, res) => {
  try {
    const { name, step_type, order, metadata } = req.body;
    const { workflow_id } = req.params;

    if (!name) return res.status(400).json({ success: false, error: 'name is required' });
    if (!step_type || !['task','approval','notification'].includes(step_type)) {
      return res.status(400).json({ success: false, error: 'step_type must be task, approval, or notification' });
    }

    const step = await StepModel.create({ workflow_id, name, step_type, order, metadata });

    // Set as start_step if workflow has none
    const wf = await WorkflowModel.findById(workflow_id);
    if (!wf.start_step_id) {
      await WorkflowModel.update(workflow_id, { start_step_id: step.id });
    }

    logger.info('Step created', { stepId: step.id, workflowId: workflow_id });
    res.status(201).json({ success: true, step });
  } catch (err) {
    logger.error('create step error', { err: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
};

// PUT /steps/:id
exports.update = async (req, res) => {
  try {
    const { name, step_type, order, metadata } = req.body;
    const step = await StepModel.update(req.params.id, { name, step_type, order, metadata });
    if (!step) return res.status(404).json({ success: false, error: 'Step not found' });
    res.json({ success: true, step });
  } catch (err) {
    logger.error('update step error', { err: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE /steps/:id
exports.remove = async (req, res) => {
  try {
    const deleted = await StepModel.delete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Step not found' });
    res.json({ success: true, message: 'Step deleted' });
  } catch (err) {
    logger.error('delete step error', { err: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
};
