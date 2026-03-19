const { getDb, dbGet, dbAll, saveDb } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

function parse(e) {
  if (!e) return null;
  return {
    ...e,
    data: typeof e.data === 'string' ? JSON.parse(e.data || '{}') : e.data,
    logs: typeof e.logs === 'string' ? JSON.parse(e.logs || '[]') : e.logs,
  };
}

class ExecutionModel {
  static async findAll({ workflowId, status, limit = 20, offset = 0 } = {}) {
    const db = await getDb();
    let where = [], params = [];
    if (workflowId) { where.push('e.workflow_id = ?'); params.push(workflowId); }
    if (status)     { where.push('e.status = ?');      params.push(status); }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = dbAll(db,
      `SELECT e.*, w.name as workflow_name FROM executions e
       LEFT JOIN workflows w ON w.id = e.workflow_id
       ${clause} ORDER BY e.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const ct = dbGet(db, `SELECT COUNT(*) as c FROM executions e ${clause}`, params);
    return { executions: rows.map(parse), total: ct ? ct.c : 0 };
  }

  static async findById(id) {
    const db = await getDb();
    return parse(dbGet(db,
      `SELECT e.*, w.name as workflow_name FROM executions e
       LEFT JOIN workflows w ON w.id = e.workflow_id WHERE e.id = ?`,
      [id]
    ));
  }

  static async create({ workflow_id, workflow_version, data, triggered_by }) {
    const db = await getDb();
    const id = uuidv4();
    db.run(
      `INSERT INTO executions (id,workflow_id,workflow_version,status,data,triggered_by,started_at)
       VALUES (?,?,?,'in_progress',?,?,datetime('now'))`,
      [id, workflow_id, workflow_version, JSON.stringify(data || {}), triggered_by || 'system']
    );
    saveDb();
    return this.findById(id);
  }

  static async updateStatus(id, { status, logs, current_step_id, ended_at }) {
    const db = await getDb();
    db.run(
      `UPDATE executions SET status=COALESCE(?,status), logs=COALESCE(?,logs),
       current_step_id=?, ended_at=COALESCE(?,ended_at), updated_at=datetime('now') WHERE id=?`,
      [status||null, logs ? JSON.stringify(logs) : null, current_step_id||null, ended_at||null, id]
    );
    saveDb();
    return this.findById(id);
  }

  static async cancel(id) {
    const e = await this.findById(id);
    if (!e || !['pending','in_progress'].includes(e.status)) return null;
    const db = await getDb();
    db.run(`UPDATE executions SET status='canceled', ended_at=datetime('now'), updated_at=datetime('now') WHERE id=?`, [id]);
    saveDb();
    return this.findById(id);
  }

  static async incrementRetry(id) {
    const db = await getDb();
    db.run(`UPDATE executions SET retries=retries+1, updated_at=datetime('now') WHERE id=?`, [id]);
    saveDb();
    return this.findById(id);
  }
}

module.exports = ExecutionModel;
