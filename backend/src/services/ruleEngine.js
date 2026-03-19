const { Parser } = require('expr-eval');
const logger = require('../config/logger');

const parser = new Parser({
  operators: {
    logical: true,
    comparison: true,
    'in': true,
  }
});

/**
 * Evaluate a single rule condition against input data.
 * Supports: ==, !=, <, >, <=, >=, &&, ||, contains(), startsWith(), endsWith()
 */
function evaluateCondition(condition, data) {
  if (condition === 'DEFAULT') return true;

  try {
    // Replace string function helpers before parsing
    let expr = condition;

    // contains(field, "value") → string includes check
    expr = expr.replace(/contains\((\w+),\s*["']([^"']+)["']\)/g, (_, field, val) => {
      const fieldVal = String(data[field] || '').toLowerCase();
      return fieldVal.includes(val.toLowerCase()) ? 'true' : 'false';
    });

    // startsWith(field, "prefix")
    expr = expr.replace(/startsWith\((\w+),\s*["']([^"']+)["']\)/g, (_, field, val) => {
      const fieldVal = String(data[field] || '').toLowerCase();
      return fieldVal.startsWith(val.toLowerCase()) ? 'true' : 'false';
    });

    // endsWith(field, "suffix")
    expr = expr.replace(/endsWith\((\w+),\s*["']([^"']+)["']\)/g, (_, field, val) => {
      const fieldVal = String(data[field] || '').toLowerCase();
      return fieldVal.endsWith(val.toLowerCase()) ? 'true' : 'false';
    });

    // Replace string comparisons: field == 'val' → 'actualval' == 'val'
    expr = expr.replace(/(\w+)\s*(==|!=)\s*["']([^"']+)["']/g, (_, field, op, val) => {
      const fieldVal = String(data[field] !== undefined ? data[field] : '');
      return `"${fieldVal}" ${op} "${val}"`;
    });

    // Replace numeric/boolean field references
    expr = expr.replace(/\b([a-zA-Z_]\w*)\b/g, (match) => {
      if (['true', 'false', 'and', 'or', 'not', 'AND', 'OR'].includes(match)) return match;
      if (data[match] !== undefined) {
        const v = data[match];
        if (typeof v === 'string') return `"${v}"`;
        return String(v);
      }
      return match;
    });

    // Normalize logical operators
    expr = expr.replace(/&&/g, ' and ').replace(/\|\|/g, ' or ');

    const result = parser.evaluate(expr);
    return Boolean(result);
  } catch (err) {
    logger.warn(`Rule evaluation error for condition "${condition}": ${err.message}`);
    return false;
  }
}

/**
 * Evaluate all rules for a step, returning the first matching rule's next_step_id.
 * Rules must be sorted by priority (ascending) before calling this.
 */
function evaluateRules(rules, data) {
  const evaluatedRules = [];
  let selectedRule = null;

  for (const rule of rules) {
    const result = evaluateCondition(rule.condition, data);
    evaluatedRules.push({
      rule_id: rule.id,
      rule: rule.condition,
      result,
    });

    if (result && !selectedRule) {
      selectedRule = rule;
    }
  }

  return {
    evaluatedRules,
    selectedRule,
    nextStepId: selectedRule ? selectedRule.next_step_id : null,
  };
}

/**
 * Execute a full workflow simulation, returning execution logs.
 * Supports looping with configurable max iterations.
 */
async function runWorkflow({ workflow, steps, rulesByStep, inputData, maxIterations = 20 }) {
  const logs = [];
  let currentStepId = workflow.start_step_id;
  let iterations = 0;
  const visitedCounts = {};

  while (currentStepId && iterations < maxIterations) {
    iterations++;
    visitedCounts[currentStepId] = (visitedCounts[currentStepId] || 0) + 1;

    // Loop protection
    if (visitedCounts[currentStepId] > 3) {
      logger.warn(`Loop detected at step ${currentStepId}, breaking`);
      break;
    }

    const step = steps.find(s => s.id === currentStepId);
    if (!step) {
      logger.error(`Step ${currentStepId} not found`);
      break;
    }

    const stepRules = (rulesByStep[step.id] || []).sort((a, b) => a.priority - b.priority);
    const startTime = new Date().toISOString();

    let logEntry = {
      step_id: step.id,
      step_name: step.name,
      step_type: step.step_type,
      status: 'completed',
      evaluated_rules: [],
      selected_next_step: null,
      selected_next_step_id: null,
      approver_id: null,
      error_message: null,
      started_at: startTime,
      ended_at: null,
    };

    try {
      if (stepRules.length === 0) {
        logEntry.error_message = 'No rules defined for this step';
        logEntry.status = 'failed';
        logs.push({ ...logEntry, ended_at: new Date().toISOString() });
        break;
      }

      const { evaluatedRules, selectedRule, nextStepId } = evaluateRules(stepRules, inputData);
      logEntry.evaluated_rules = evaluatedRules;

      if (!selectedRule) {
        logEntry.error_message = 'No matching rule found (missing DEFAULT?)';
        logEntry.status = 'failed';
        logs.push({ ...logEntry, ended_at: new Date().toISOString() });
        break;
      }

      const nextStep = steps.find(s => s.id === nextStepId);
      logEntry.selected_next_step = nextStep?.name || null;
      logEntry.selected_next_step_id = nextStepId;

      // Simulate approval step — attach approver metadata
      if (step.step_type === 'approval') {
        logEntry.approver_id = step.metadata?.assignee_email || 'auto-approved';
      }

      logs.push({ ...logEntry, ended_at: new Date().toISOString() });
      currentStepId = nextStepId;

    } catch (err) {
      logEntry.status = 'failed';
      logEntry.error_message = err.message;
      logs.push({ ...logEntry, ended_at: new Date().toISOString() });
      break;
    }
  }

  const finalStatus = logs.length > 0 && logs[logs.length - 1].status === 'failed'
    ? 'failed'
    : 'completed';

  return { logs, status: finalStatus };
}

module.exports = { evaluateCondition, evaluateRules, runWorkflow };
