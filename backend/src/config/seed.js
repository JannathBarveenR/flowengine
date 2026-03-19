const { getDb, dbRun, saveDb } = require('./db');
const { v4: uuidv4 } = require('uuid');

const seed = async () => {
  const db = await getDb();

  // Clear tables
  db.run('DELETE FROM executions');
  db.run('DELETE FROM rules');
  db.run('DELETE FROM steps');
  db.run('DELETE FROM workflows');

  // ── Workflow 1: Expense Approval ──────────────────────────────────────────
  const wf1Id = uuidv4();
  const s1 = uuidv4(), s2 = uuidv4(), s3 = uuidv4(), s4 = uuidv4(), s5 = uuidv4();

  db.run(`INSERT INTO workflows (id,name,description,version,is_active,input_schema,start_step_id) VALUES (?,?,?,?,?,?,?)`, [
    wf1Id, 'Expense Approval', 'Multi-level expense approval workflow', 3, 1,
    JSON.stringify({
      amount:     { type: 'number', required: true },
      country:    { type: 'string', required: true },
      department: { type: 'string', required: false },
      priority:   { type: 'string', required: true, allowed_values: ['High','Medium','Low'] }
    }), s1
  ]);

  const steps1 = [
    [s1, wf1Id, 'Manager Approval',     'approval',     1, { assignee_email: 'manager@example.com' }],
    [s2, wf1Id, 'Finance Notification', 'notification', 2, { notification_channel: 'email', template: 'finance_alert' }],
    [s3, wf1Id, 'CEO Approval',         'approval',     3, { assignee_email: 'ceo@example.com' }],
    [s4, wf1Id, 'Task Rejection',       'task',         4, { action: 'reject_and_notify' }],
    [s5, wf1Id, 'Task Completion',      'task',         5, { action: 'complete' }],
  ];
  for (const [id, wid, name, type, order, meta] of steps1) {
    db.run(`INSERT INTO steps (id,workflow_id,name,step_type,step_order,metadata) VALUES (?,?,?,?,?,?)`,
      [id, wid, name, type, order, JSON.stringify(meta)]);
  }

  const rules1 = [
    [s1, "amount > 100 && country == 'US' && priority == 'High'", s2, 1],
    [s1, "amount <= 100 || department == 'HR'",                   s3, 2],
    [s1, "priority == 'Low' && country != 'US'",                  s4, 3],
    [s1, 'DEFAULT',                                                s4, 4],
    [s2, 'DEFAULT', s3, 1],
    [s3, 'DEFAULT', s5, 1],
  ];
  for (const [sid, cond, next, pri] of rules1) {
    db.run(`INSERT INTO rules (id,step_id,condition,next_step_id,priority) VALUES (?,?,?,?,?)`,
      [uuidv4(), sid, cond, next || null, pri]);
  }

  // ── Workflow 2: Employee Onboarding ───────────────────────────────────────
  const wf2Id = uuidv4();
  const t1 = uuidv4(), t2 = uuidv4(), t3 = uuidv4();

  db.run(`INSERT INTO workflows (id,name,description,version,is_active,input_schema,start_step_id) VALUES (?,?,?,?,?,?,?)`, [
    wf2Id, 'Employee Onboarding', 'New hire onboarding process', 1, 1,
    JSON.stringify({
      employee_name: { type: 'string', required: true },
      department:    { type: 'string', required: true },
      role:          { type: 'string', required: true }
    }), t1
  ]);

  const steps2 = [
    [t1, wf2Id, 'HR Notification', 'notification', 1, { notification_channel: 'slack' }],
    [t2, wf2Id, 'Account Setup',   'task',         2, { action: 'provision_accounts' }],
    [t3, wf2Id, 'Manager Intro',   'approval',     3, { assignee_email: 'manager@example.com' }],
  ];
  for (const [id, wid, name, type, order, meta] of steps2) {
    db.run(`INSERT INTO steps (id,workflow_id,name,step_type,step_order,metadata) VALUES (?,?,?,?,?,?)`,
      [id, wid, name, type, order, JSON.stringify(meta)]);
  }

  db.run(`INSERT INTO rules (id,step_id,condition,next_step_id,priority) VALUES (?,?,?,?,?)`, [uuidv4(), t1, 'DEFAULT', t2,   1]);
  db.run(`INSERT INTO rules (id,step_id,condition,next_step_id,priority) VALUES (?,?,?,?,?)`, [uuidv4(), t2, 'DEFAULT', t3,   1]);
  db.run(`INSERT INTO rules (id,step_id,condition,next_step_id,priority) VALUES (?,?,?,?,?)`, [uuidv4(), t3, 'DEFAULT', null, 1]);

  // ── Sample Execution ──────────────────────────────────────────────────────
  db.run(`INSERT INTO executions (id,workflow_id,workflow_version,status,data,logs,triggered_by,started_at,ended_at) VALUES (?,?,?,?,?,?,?,?,?)`, [
    uuidv4(), wf1Id, 3, 'completed',
    JSON.stringify({ amount: 250, country: 'US', department: 'Finance', priority: 'High' }),
    JSON.stringify([
      { step_name:'Manager Approval', step_type:'approval', status:'completed',
        evaluated_rules:[
          { rule:"amount > 100 && country == 'US' && priority == 'High'", result:true },
          { rule:"amount <= 100 || department == 'HR'", result:false }
        ],
        selected_next_step:'Finance Notification', approver_id:'user-001',
        started_at:'2026-02-18T10:00:00Z', ended_at:'2026-02-18T10:00:03Z' },
      { step_name:'Finance Notification', step_type:'notification', status:'completed',
        evaluated_rules:[{ rule:'DEFAULT', result:true }],
        selected_next_step:'CEO Approval',
        started_at:'2026-02-18T10:00:03Z', ended_at:'2026-02-18T10:00:04Z' },
      { step_name:'CEO Approval', step_type:'approval', status:'completed',
        evaluated_rules:[{ rule:'DEFAULT', result:true }],
        selected_next_step:'Task Completion', approver_id:'user-ceo',
        started_at:'2026-02-18T10:01:00Z', ended_at:'2026-02-18T10:05:00Z' }
    ]),
    'user-123', '2026-02-18T10:00:00Z', '2026-02-18T10:05:00Z'
  ]);

  saveDb();
  console.log('✅ Seed complete — 2 workflows + steps + rules + 1 execution created!');
};

seed().catch(console.error);
