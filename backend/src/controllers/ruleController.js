const RuleModel = require('../models/Rule');
const { evaluateCondition } = require('../services/ruleEngine');
const logger = require('../config/logger');

// GET /steps/:step_id/rules
exports.list = async (req, res) => {
  try {
    const rules = await RuleModel.findByStep(req.params.step_id);
    res.json({ success: true, rules });
  } catch (err) {
    logger.error('list rules error', { err: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /steps/:step_id/rules
exports.create = async (req, res) => {
  try {
    const { condition, next_step_id, priority } = req.body;
    const { step_id } = req.params;

    if (!condition) return res.status(400).json({ success: false, error: 'condition is required' });

    // Validate condition syntax (test with empty data)
    if (condition !== 'DEFAULT') {
      try {
        evaluateCondition(condition, {});
      } catch {
        return res.status(400).json({ success: false, error: 'Invalid condition syntax' });
      }
    }

    const rule = await RuleModel.create({ step_id, condition, next_step_id, priority });
    logger.info('Rule created', { ruleId: rule.id, stepId: step_id });
    res.status(201).json({ success: true, rule });
  } catch (err) {
    logger.error('create rule error', { err: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
};

// PUT /rules/:id
exports.update = async (req, res) => {
  try {
    const { condition, next_step_id, priority } = req.body;
    const rule = await RuleModel.update(req.params.id, { condition, next_step_id, priority });
    if (!rule) return res.status(404).json({ success: false, error: 'Rule not found' });
    res.json({ success: true, rule });
  } catch (err) {
    logger.error('update rule error', { err: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE /rules/:id
exports.remove = async (req, res) => {
  try {
    const deleted = await RuleModel.delete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Rule not found' });
    res.json({ success: true, message: 'Rule deleted' });
  } catch (err) {
    logger.error('delete rule error', { err: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /rules/reorder
exports.reorder = async (req, res) => {
  try {
    const { updates } = req.body; // [{id, priority}]
    if (!Array.isArray(updates)) return res.status(400).json({ success: false, error: 'updates must be an array' });
    await RuleModel.reorder(updates);
    res.json({ success: true, message: 'Rules reordered' });
  } catch (err) {
    logger.error('reorder rules error', { err: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /rules/test — Test a condition against sample data
exports.test = async (req, res) => {
  try {
    const { condition, data } = req.body;
    if (!condition) return res.status(400).json({ success: false, error: 'condition is required' });
    const result = evaluateCondition(condition, data || {});
    res.json({ success: true, result, condition, data });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
