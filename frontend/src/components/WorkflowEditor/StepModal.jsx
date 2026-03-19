import React, { useState } from 'react';
import { Modal, FormGroup, JsonEditor } from '../common';

const STEP_TYPES = ['task', 'approval', 'notification'];

export default function StepModal({ step, onSave, onClose }) {
  const [name, setName] = useState(step?.name || '');
  const [type, setType] = useState(step?.step_type || 'task');
  const [order, setOrder] = useState(step?.order || 1);
  const [metaStr, setMetaStr] = useState(step ? JSON.stringify(step.metadata || {}, null, 2) : '{}');

  const handleSave = () => {
    if (!name.trim()) { alert('Name is required'); return; }
    let metadata;
    try { metadata = JSON.parse(metaStr); } catch { alert('Invalid JSON in metadata'); return; }
    onSave({ id: step?.id, name, step_type: type, order: parseInt(order), metadata });
  };

  const META_HINTS = {
    task: '{"action": "send_email"}',
    approval: '{"assignee_email": "manager@example.com"}',
    notification: '{"notification_channel": "email", "template": "approval_request"}',
  };

  return (
    <Modal
      title={step ? 'Edit Step' : 'Add Step'}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Save Step</button>
        </>
      }
    >
      <FormGroup label="Step Name" required>
        <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Manager Approval" />
      </FormGroup>

      <FormGroup label="Step Type" required>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {STEP_TYPES.map(t => (
            <div
              key={t}
              onClick={() => { setType(t); setMetaStr(META_HINTS[t]); }}
              style={{
                padding: '10px', borderRadius: 'var(--radius-sm)', border: `2px solid ${type === t ? 'var(--accent)' : 'var(--border2)'}`,
                cursor: 'pointer', textAlign: 'center', background: type === t ? 'var(--accent-light)' : 'var(--surface)',
                transition: 'all .15s'
              }}
            >
              <div style={{ fontSize: 20, marginBottom: 4 }}>
                {t === 'task' ? '⚙' : t === 'approval' ? '✅' : '🔔'}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: type === t ? 'var(--accent-dark)' : 'var(--text2)' }}>
                {t}
              </div>
            </div>
          ))}
        </div>
      </FormGroup>

      <FormGroup label="Order">
        <input className="form-input" type="number" min="1" value={order} onChange={e => setOrder(e.target.value)} style={{ width: 100 }} />
      </FormGroup>

      <JsonEditor
        label="Metadata (JSON)"
        value={metaStr}
        onChange={setMetaStr}
        hint="Additional configuration for this step"
        minHeight={90}
      />
    </Modal>
  );
}
