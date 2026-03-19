const { getDb, dbRun, dbGet, dbAll, saveDb } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

function parse(wf) {
  if (!wf) return null;
  return {
    ...wf,
    is_active: Boolean(wf.is_active),
    input_schema: typeof wf.input_schema === 'string' ? JSON.parse(wf.input_schema || '{}') : wf.input_schema,
    step_count: wf.step_count || 0,
  };
}

class WorkflowModel {
  static async findAll({ search = '', limit = 20, offset = 0 } = {}) {
    const db = await getDb();
    let rows, total;
    if (search) {
      rows = dbAll(db,
        `SELECT w.*, (SELECT COUNT(*) FROM steps s WHERE s.workflow_id = w.id) as step_count
         FROM workflows w WHERE w.name LIKE ? OR w.description LIKE ?
         ORDER BY w.updated_at DESC LIMIT ? OFFSET ?`,
        [`%${search}%`, `%${search}%`, limit, offset]
      );
      const ct = dbGet(db, `SELECT COUNT(*) as c FROM workflows WHERE name LIKE ? OR description LIKE ?`, [`%${search}%`, `%${search}%`]);
      total = ct ? ct.c : 0;
    } else {
      rows = dbAll(db,
        `SELECT w.*, (SELECT COUNT(*) FROM steps s WHERE s.workflow_id = w.id) as step_count
         FROM workflows w ORDER BY w.updated_at DESC LIMIT ? OFFSET ?`,
        [limit, offset]
      );
      const ct = dbGet(db, `SELECT COUNT(*) as c FROM workflows`, []);
      total = ct ? ct.c : 0;
    }
    return { workflows: rows.map(parse), total };
  }

  static async findById(id) {
    const db = await getDb();
    const wf = dbGet(db, `SELECT * FROM workflows WHERE id = ?`, [id]);
    if (!wf) return null;
    const steps = dbAll(db, `SELECT * FROM steps WHERE workflow_id = ? ORDER BY step_order`, [id]);
    return {
      ...parse(wf),
      steps: steps.map(s => ({ ...s, order: s.step_order, metadata: JSON.parse(s.metadata || '{}') }))
    };
  }

  static async create({ name, description, input_schema, start_step_id = null }) {
    const db = await getDb();
    const id = uuidv4();
    db.run(
      `INSERT INTO workflows (id,name,description,input_schema,start_step_id) VALUES (?,?,?,?,?)`,
      [id, name, description || null, JSON.stringify(input_schema || {}), start_step_id]
    );
    saveDb();
    return this.findById(id);
  }

  static async update(id, { name, description, input_schema, start_step_id, is_active }) {
    const db = await getDb();
    const wf = dbGet(db, `SELECT * FROM workflows WHERE id = ?`, [id]);
    if (!wf) return null;
    db.run(
      `UPDATE workflows SET
        name = COALESCE(?,name), description = COALESCE(?,description),
        input_schema = COALESCE(?,input_schema), start_step_id = COALESCE(?,start_step_id),
        is_active = COALESCE(?,is_active), version = version+1, updated_at = datetime('now')
       WHERE id = ?`,
      [name||null, description||null, input_schema ? JSON.stringify(input_schema) : null,
       start_step_id||null, is_active !== undefined ? (is_active?1:0) : null, id]
    );
    saveDb();
    return this.findById(id);
  }

  static async delete(id) {
    const db = await getDb();
    // Cascade manually
    const steps = dbAll(db, `SELECT id FROM steps WHERE workflow_id = ?`, [id]);
    for (const s of steps) {
      db.run(`DELETE FROM rules WHERE step_id = ?`, [s.id]);
    }
    db.run(`DELETE FROM steps WHERE workflow_id = ?`, [id]);
    db.run(`DELETE FROM executions WHERE workflow_id = ?`, [id]);
    db.run(`DELETE FROM workflows WHERE id = ?`, [id]);
    saveDb();
    return true;
  }
}

module.exports = WorkflowModel;
