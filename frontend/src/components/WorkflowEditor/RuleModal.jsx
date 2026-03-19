import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Modal, FormGroup } from '../common';
import { ruleApi } from '../../services/api';

const CONDITION_HINTS = [
  "amount > 100",
  "amount <= 100",
  "country == 'US'",
  "country != 'US'",
  "priority == 'High'",
  "department == 'HR'",
  "amount > 100 && country == 'US'",
  "amount > 100 && priority == 'High'",
  "DEFAULT",
];

export default function RuleModal({ stepId, rule, steps, onSave, onClose }) {
  const [condition, setCondition] = useState(rule?.condition || '');
  const [nextStepId, setNextStepId] = useState(rule?.next_step_id || '');
  const [priority, setPriority] = useState(rule?.priority || 1);
  const [testing, setTesting] = useState(false);
  const [testData, setTestData] = useState('{"amount": 250, "country": "US", "priority": "High"}');
  const [testResult, setTestResult] = useState(null);

  const handleSave = () => {
    if (!condition.trim()) { toast.error('Condition is required'); return; }
    onSave(stepId, {
      id: rule?.id,
      condition,
      next_step_id: nextStepId || null,
      priority: parseInt(priority)
    });
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      let data;
      try { data = JSON.parse(testData); } catch { toast.error('Invalid test data JSON'); setTesting(false); return; }
      const res = await ruleApi.test(condition, data);
      setTestResult(res.result);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Modal
      title={rule ? 'Edit Rule' : 'Add Rule'}
      onClose={onClose}
      maxWidth={600}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Save Rule</button>
        </>
      }
    >
      <FormGroup label="Condition" required hint='Use && for AND, || for OR. Use single quotes for strings. Write "DEFAULT" to match everything.'>
        <input
          className="form-input"
          value={condition}
          onChange={e => { setCondition(e.target.value); setTestResult(null); }}
          placeholder="amount > 100 && country == 'US'"
          style={{ fontFamily: 'var(--mono)', fontSize: 13 }}
        />
        <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap' }}>
          {CONDITION_HINTS.map(h => (
            <span key={h} className="hint-chip" onClick={() => setCondition(h)}>{h}</span>
          ))}
        </div>
      </FormGroup>

      {/* Live tester */}
      <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.04em' }}>
          Test Condition
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="form-input"
            value={testData}
            onChange={e => setTestData(e.target.value)}
            style={{ fontFamily: 'var(--mono)', fontSize: 12, flex: 1 }}
            placeholder='{"amount": 100}'
          />
          <button className="btn btn-sm" onClick={handleTest} disabled={testing || !condition}>
            {testing ? '...' : '▶ Test'}
          </button>
        </div>
        {testResult !== null && (
          <div style={{
            marginTop: 8, padding: '6px 10px', borderRadius: 4, fontSize: 13, fontWeight: 600,
            background: testResult ? 'var(--accent-light)' : 'var(--danger-light)',
            color: testResult ? 'var(--accent-dark)' : 'var(--danger)'
          }}>
            {testResult ? '✓ Condition MATCHES' : '✗ Condition does NOT match'}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 12 }}>
        <FormGroup label="Next Step" hint="Leave empty to end the workflow">
          <select className="form-select" value={nextStepId} onChange={e => setNextStepId(e.target.value)}>
            <option value="">— End Workflow —</option>
            {steps.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </FormGroup>
        <FormGroup label="Priority" hint="1 = highest">
          <input className="form-input" type="number" min="1" value={priority} onChange={e => setPriority(e.target.value)} />
        </FormGroup>
      </div>
    </Modal>
  );
}
