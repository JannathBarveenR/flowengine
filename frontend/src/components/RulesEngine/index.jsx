import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';
import { ruleApi } from '../../services/api';
import { TypeTag, LoadingState, PageHeader } from '../common';

const OPERATOR_DOCS = [
  { cat: 'Comparison', ops: '==  !=  <  >  <=  >=' },
  { cat: 'Logical', ops: '&& (AND)   || (OR)' },
  { cat: 'String Functions', ops: "contains(field, 'val')   startsWith(field, 'val')   endsWith(field, 'val')" },
  { cat: 'Special', ops: 'DEFAULT — matches everything (use as fallback)' },
];

export default function RulesEngine() {
  const { workflows, fetchWorkflows, steps: stepsMap, fetchSteps, rules: rulesMap } = useStore();
  const [wfId, setWfId] = useState('');
  const [testDataStr, setTestDataStr] = useState('{\n  "amount": 250,\n  "country": "US",\n  "department": "Finance",\n  "priority": "High"\n}');
  const [traceResult, setTraceResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [singleCond, setSingleCond] = useState("amount > 100 && priority == 'High'");
  const [singleData, setSingleData] = useState('{"amount": 250, "priority": "High"}');
  const [singleResult, setSingleResult] = useState(null);

  useEffect(() => {
    fetchWorkflows().catch(() => {});
  }, []);

  useEffect(() => {
    if (wfId) fetchSteps(wfId).catch(() => {});
  }, [wfId]);

  const steps = stepsMap[wfId] || [];

  const handleTrace = async () => {
    let data;
    try { data = JSON.parse(testDataStr); } catch { toast.error('Invalid test data JSON'); return; }
    if (!wfId) { toast.error('Select a workflow'); return; }
    setRunning(true);
    setTraceResult(null);
    try {
      // Fetch rules for all steps
      const allRules = {};
      for (const step of steps) {
        const r = await useStore.getState().fetchRules(step.id);
        allRules[step.id] = r;
      }
      // Simulate locally
      const wf = workflows.find(w => w.id === wfId);
      const result = [];
      let currentId = wf.start_step_id;
      let iter = 0;
      while (currentId && iter < 20) {
        iter++;
        const step = steps.find(s => s.id === currentId);
        if (!step) break;
        const stepRules = (allRules[step.id] || []).sort((a, b) => a.priority - b.priority);
        const evaluated = [];
        let nextId = null;
        let matched = null;
        for (const r of stepRules) {
          let res = false;
          try {
            const testRes = await ruleApi.test(r.condition, data);
            res = testRes.result;
          } catch {}
          evaluated.push({ rule: r.condition, result: res });
          if (res && !matched) { matched = r; nextId = r.next_step_id; }
        }
        const nextStep = steps.find(s => s.id === nextId);
        result.push({ step_name: step.name, step_type: step.step_type, evaluated_rules: evaluated, selected_next_step: nextStep?.name || null });
        currentId = nextId;
      }
      setTraceResult(result);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRunning(false);
    }
  };

  const handleSingleTest = async () => {
    let data;
    try { data = JSON.parse(singleData); } catch { toast.error('Invalid JSON'); return; }
    try {
      const res = await ruleApi.test(singleCond, data);
      setSingleResult(res.result);
    } catch (err) { toast.error(err.message); }
  };

  return (
    <div className="page-content">
      <PageHeader
        title="Rule Engine"
        subtitle="Test conditions and trace workflow execution paths"
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Single condition tester */}
        <div className="card">
          <div className="card-header"><span className="card-title">Condition Tester</span></div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label">Condition</label>
              <input
                className="form-input"
                value={singleCond}
                onChange={e => { setSingleCond(e.target.value); setSingleResult(null); }}
                style={{ fontFamily: 'var(--mono)', fontSize: 13 }}
                placeholder="amount > 100 && priority == 'High'"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Test Data (JSON)</label>
              <input
                className="form-input"
                value={singleData}
                onChange={e => setSingleData(e.target.value)}
                style={{ fontFamily: 'var(--mono)', fontSize: 12 }}
              />
            </div>
            <button className="btn btn-primary btn-sm" onClick={handleSingleTest}>▶ Evaluate</button>
            {singleResult !== null && (
              <div style={{
                marginTop: 12, padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                background: singleResult ? 'var(--accent-light)' : 'var(--danger-light)',
                color: singleResult ? 'var(--accent-dark)' : 'var(--danger)',
                fontWeight: 600, fontSize: 14
              }}>
                {singleResult ? '✓ MATCHES' : '✗ DOES NOT MATCH'}
              </div>
            )}
          </div>
        </div>

        {/* Operator reference */}
        <div className="card">
          <div className="card-header"><span className="card-title">Operator Reference</span></div>
          <div className="card-body">
            {OPERATOR_DOCS.map(d => (
              <div key={d.cat} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.04em' }}>{d.cat}</div>
                <code style={{ fontSize: 12, background: 'var(--surface2)', border: '1px solid var(--border)', padding: '6px 10px', borderRadius: 4, display: 'block', fontFamily: 'var(--mono)', color: 'var(--text2)' }}>
                  {d.ops}
                </code>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Full workflow tracer */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><span className="card-title">Workflow Trace</span></div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr auto', gap: 12, alignItems: 'flex-end' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Workflow</label>
              <select className="form-select" value={wfId} onChange={e => setWfId(e.target.value)}>
                <option value="">Select workflow...</option>
                {workflows.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Input Data (JSON)</label>
              <input
                className="form-input"
                value={testDataStr}
                onChange={e => setTestDataStr(e.target.value)}
                style={{ fontFamily: 'var(--mono)', fontSize: 12 }}
              />
            </div>
            <button className="btn btn-primary" onClick={handleTrace} disabled={running || !wfId}>
              {running ? 'Tracing...' : '▶ Run Trace'}
            </button>
          </div>
        </div>
      </div>

      {traceResult && (
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>
            Trace Results — {traceResult.length} step{traceResult.length !== 1 ? 's' : ''} executed
          </div>
          {traceResult.map((log, i) => (
            <div key={i} style={{
              display: 'flex', gap: 0, marginBottom: 8, alignItems: 'stretch'
            }}>
              <div style={{
                width: 4, background: 'var(--accent)', borderRadius: '4px 0 0 4px', flexShrink: 0
              }} />
              <div className="card" style={{ flex: 1, borderRadius: '0 var(--radius) var(--radius) 0', borderLeft: 'none' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="flex items-center gap-3">
                    <div className="progress-dot done" style={{ fontSize: 12 }}>{i + 1}</div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{log.step_name}</div>
                      <TypeTag type={log.step_type} />
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                    {log.selected_next_step ? `→ ${log.selected_next_step}` : '→ End'}
                  </div>
                </div>
                <div style={{ padding: '10px 16px' }}>
                  {log.evaluated_rules.map((r, j) => (
                    <div key={j} className={`rule-eval-row ${r.result ? 'match' : 'no-match'}`}>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 12, flex: 1 }}>{r.rule}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: r.result ? 'var(--accent)' : 'var(--text3)' }}>
                        {r.result ? '✓ matched' : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
