const { getDb, dbGet, dbAll, saveDb } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

function parseStep(s) {
  if (!s) return null;
  return { ...s, order: s.step_order, metadata: typeof s.metadata === 'string' ? JSON.parse(s.metadata || '{}') : s.metadata };
}

class StepModel {
  static async findByWorkflow(workflowId) {
    const db = await getDb();
    const steps = dbAll(db, `SELECT * FROM steps WHERE workflow_id = ? ORDER BY step_order`, [workflowId]);
    return steps.map(s => {
      const rules = dbAll(db, `SELECT r.*, s2.name as next_step_name FROM rules r LEFT JOIN steps s2 ON s2.id = r.next_step_id WHERE r.step_id = ? ORDER BY r.priority`, [s.id]);
      return { ...parseStep(s), rules };
    });
  }

  static async findById(id) {
    const db = await getDb();
    return parseStep(dbGet(db, `SELECT * FROM steps WHERE id = ?`, [id]));
  }

  static async create({ workflow_id, name, step_type, order, metadata }) {
    const db = await getDb();
    const id = uuidv4();
    db.run(
      `INSERT INTO steps (id,workflow_id,name,step_type,step_order,metadata) VALUES (?,?,?,?,?,?)`,
      [id, workflow_id, name, step_type, order || 1, JSON.stringify(metadata || {})]
    );
    saveDb();
    return this.findById(id);
  }

  static async update(id, { name, step_type, order, metadata }) {
    const db = await getDb();
    db.run(
      `UPDATE steps SET name=COALESCE(?,name), step_type=COALESCE(?,step_type),
       step_order=COALESCE(?,step_order), metadata=COALESCE(?,metadata), updated_at=datetime('now')
       WHERE id=?`,
      [name||null, step_type||null, order||null, metadata ? JSON.stringify(metadata) : null, id]
    );
    saveDb();
    return this.findById(id);
  }

  static async delete(id) {
    const db = await getDb();
    db.run(`DELETE FROM rules WHERE step_id = ?`, [id]);
    db.run(`DELETE FROM steps WHERE id = ?`, [id]);
    saveDb();
    return true;
  }

  static async findWithRulesByWorkflow(workflowId) {
    const db = await getDb();
    const steps = dbAll(db, `SELECT * FROM steps WHERE workflow_id = ? ORDER BY step_order`, [workflowId]).map(parseStep);
    const rulesByStep = {};
    for (const step of steps) {
      rulesByStep[step.id] = dbAll(db, `SELECT * FROM rules WHERE step_id = ? ORDER BY priority`, [step.id]);
    }
    return { steps, rulesByStep };
  }
}

module.exports = StepModel;
