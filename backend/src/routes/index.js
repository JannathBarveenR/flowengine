const express = require('express');
const router = express.Router();

const workflowCtrl = require('../controllers/workflowController');
const stepCtrl = require('../controllers/stepController');
const ruleCtrl = require('../controllers/ruleController');
const execCtrl = require('../controllers/executionController');

// ── Workflows ────────────────────────────────────────────────────────────────
router.get('/workflows', workflowCtrl.list);
router.post('/workflows', workflowCtrl.create);
router.get('/workflows/:id', workflowCtrl.get);
router.put('/workflows/:id', workflowCtrl.update);
router.delete('/workflows/:id', workflowCtrl.remove);

// Execute a workflow
router.post('/workflows/:workflow_id/execute', workflowCtrl.execute);

// ── Steps ────────────────────────────────────────────────────────────────────
router.get('/workflows/:workflow_id/steps', stepCtrl.list);
router.post('/workflows/:workflow_id/steps', stepCtrl.create);
router.put('/steps/:id', stepCtrl.update);
router.delete('/steps/:id', stepCtrl.remove);

// ── Rules ────────────────────────────────────────────────────────────────────
router.get('/steps/:step_id/rules', ruleCtrl.list);
router.post('/steps/:step_id/rules', ruleCtrl.create);
router.put('/rules/:id', ruleCtrl.update);
router.delete('/rules/:id', ruleCtrl.remove);
router.post('/rules/reorder', ruleCtrl.reorder);
router.post('/rules/test', ruleCtrl.test);

// ── Executions ───────────────────────────────────────────────────────────────
router.get('/executions', execCtrl.list);
router.get('/executions/:id', execCtrl.get);
router.post('/executions/:id/cancel', execCtrl.cancel);
router.post('/executions/:id/retry', execCtrl.retry);

module.exports = router;
