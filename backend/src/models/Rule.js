const { getDb, dbGet, dbAll, saveDb } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class RuleModel {
  static async findByStep(stepId) {
    const db = await getDb();
    return dbAll(db,
      `SELECT r.*, s.name as next_step_name FROM rules r
       LEFT JOIN steps s ON s.id = r.next_step_id
       WHERE r.step_id = ? ORDER BY r.priority`,
      [stepId]
    );
  }

  static async findById(id) {
    const db = await getDb();
    return dbGet(db, `SELECT * FROM rules WHERE id = ?`, [id]);
  }

  static async create({ step_id, condition, next_step_id = null, priority }) {
    const db = await getDb();
    const id = uuidv4();
    db.run(
      `INSERT INTO rules (id,step_id,condition,next_step_id,priority) VALUES (?,?,?,?,?)`,
      [id, step_id, condition, next_step_id || null, priority || 1]
    );
    saveDb();
    return this.findById(id);
  }

  static async update(id, { condition, next_step_id, priority }) {
    const db = await getDb();
    db.run(
      `UPDATE rules SET condition=COALESCE(?,condition), next_step_id=COALESCE(?,next_step_id),
       priority=COALESCE(?,priority), updated_at=datetime('now') WHERE id=?`,
      [condition||null, next_step_id||null, priority||null, id]
    );
    saveDb();
    return this.findById(id);
  }

  static async delete(id) {
    const db = await getDb();
    db.run(`DELETE FROM rules WHERE id = ?`, [id]);
    saveDb();
    return true;
  }

  static async reorder(updates) {
    const db = await getDb();
    for (const { id, priority } of updates) {
      db.run(`UPDATE rules SET priority=?, updated_at=datetime('now') WHERE id=?`, [priority, id]);
    }
    saveDb();
    return true;
  }
}

module.exports = RuleModel;
