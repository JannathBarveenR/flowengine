const WorkflowModel = require('../models/Workflow');
const StepModel = require('../models/Step');
const ExecutionModel = require('../models/Execution');
const { runWorkflow } = require('../services/ruleEngine');
const logger = require('../config/logger');

// GET /workflows
exports.list = async (req, res) => {
  try {
    const { search = '', page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const result = await WorkflowModel.findAll({ search, limit: parseInt(limit), offset });
    res.json({ success: true, ...result, page: parseInt(page) });
  } catch (err) {
    logger.error('list workflows error', { err: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /workflows/:id
exports.get = async (req, res) => {
  try {
    const workflow = await WorkflowModel.findById(req.params.id);
    if (!workflow) return res.status(404).json({ success: false, error: 'Workflow not found' });
    res.json({ success: true, workflow });
  } catch (err) {
    logger.error('get workflow error', { err: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /workflows
exports.create = async (req, res) => {
  try {
    const { name, description, input_schema } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'name is required' });
    const workflow = await WorkflowModel.create({ name, description, input_schema });
    logger.info('Workflow created', { id: workflow.id, name });
    res.status(201).json({ success: true, workflow });
  } catch (err) {
    logger.error('create workflow error', { err: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
};

// PUT /workflows/:id
exports.update = async (req, res) => {
  try {
    const { name, description, input_schema, start_step_id, is_active } = req.body;
    const workflow = await WorkflowModel.update(req.params.id, { name, description, input_schema, start_step_id, is_active });
    if (!workflow) return res.status(404).json({ success: false, error: 'Workflow not found' });
    logger.info('Workflow updated', { id: workflow.id, version: workflow.version });
    res.json({ success: true, workflow });
  } catch (err) {
    logger.error('update workflow error', { err: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE /workflows/:id
exports.remove = async (req, res) => {
  try {
    const deleted = await WorkflowModel.delete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Workflow not found' });
    res.json({ success: true, message: 'Workflow deleted' });
  } catch (err) {
    logger.error('delete workflow error', { err: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /workflows/:workflow_id/execute
exports.execute = async (req, res) => {
  try {
    const { workflow_id } = req.params;
    const { data = {}, triggered_by = 'api' } = req.body;

    const workflow = await WorkflowModel.findById(workflow_id);
    if (!workflow) return res.status(404).json({ success: false, error: 'Workflow not found' });
    if (!workflow.is_active) return res.status(400).json({ success: false, error: 'Workflow is not active' });
    if (!workflow.start_step_id) return res.status(400).json({ success: false, error: 'Workflow has no start step' });

    // Validate required input fields
    const schema = workflow.input_schema || {};
    for (const [field, def] of Object.entries(schema)) {
      if (def.required && (data[field] === undefined || data[field] === '')) {
        return res.status(400).json({ success: false, error: `Field '${field}' is required` });
      }
      if (def.allowed_values && data[field] && !def.allowed_values.includes(data[field])) {
        return res.status(400).json({ success: false, error: `Field '${field}' must be one of: ${def.allowed_values.join(', ')}` });
      }
    }

    // Create execution record
    const execution = await ExecutionModel.create({
      workflow_id,
      workflow_version: workflow.version,
      data,
      triggered_by
    });

    // Run the workflow engine
    const { steps, rulesByStep } = await StepModel.findWithRulesByWorkflow(workflow_id);
    const { logs, status } = await runWorkflow({ workflow, steps, rulesByStep, inputData: data });

    // Update execution with results
    const updated = await ExecutionModel.updateStatus(execution.id, {
      status,
      logs,
      current_step_id: null,
      ended_at: new Date().toISOString()
    });

    logger.info('Workflow executed', { executionId: execution.id, status });
    res.status(201).json({ success: true, execution: updated });
  } catch (err) {
    logger.error('execute workflow error', { err: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
};
