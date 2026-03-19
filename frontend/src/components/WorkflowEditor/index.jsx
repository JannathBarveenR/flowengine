import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useStore } from '../../store';
import { workflowApi } from '../../services/api';
import { FormGroup, JsonEditor, TypeTag, EmptyState, LoadingState, PageHeader, ConfirmModal } from '../common';
import FlowDiagram from './FlowDiagram';
import StepModal from './StepModal';
import RuleModal from './RuleModal';

const TABS = ['details', 'steps', 'rules', 'flow'];

export default function WorkflowEditor({ isNew: isNewProp }) {
  const { id } = useParams();
  const isNew = isNewProp === true || !id;
  const navigate = useNavigate();
  const { createWorkflow, updateWorkflow, fetchSteps, createStep, updateStep, deleteStep, steps: stepsMap, createRule, updateRule, deleteRule, fetchRules, rules: rulesMap } = useStore();

  const [workflow, setWorkflow] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [schemaStr, setSchemaStr] = useState('{\n  "amount": {"type": "number", "required": true},\n  "priority": {"type": "string", "required": true, "allowed_values": ["High","Medium","Low"]}\n}');
  const [startStepId, setStartStepId] = useState('');
  const [stepModal, setStepModal] = useState(null);
  const [ruleModal, setRuleModal] = useState(null);
  const [deleteStepTarget, setDeleteStepTarget] = useState(null);
  const [deleteRuleTarget, setDeleteRuleTarget] = useState(null);

  const steps = (!isNew && id) ? (stepsMap[id] || []) : [];
  const rules = rulesMap;
  const sortedSteps = [...steps].sort((a, b) => (a.order || a.step_order || 0) - (b.order || b.step_order || 0));

  useEffect(() => {
    if (isNew || !id) return;
    setLoading(true);
    workflowApi.get(id)
      .then(async (res) => {
        const wf = res.workflow;
        setWorkflow(wf);
        setName(wf.name || '');
        setDesc(wf.description || '');
        setSchemaStr(JSON.stringify(wf.input_schema || {}, null, 2));
        setStartStepId(wf.start_step_id || '');
        await fetchSteps(id);
        for (const step of (wf.steps || [])) await fetchRules(step.id);
      })
      .catch(err => toast.error('Failed to load: ' + err.message))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  const handleSaveDetails = async () => {
    if (!name.trim()) { toast.error('Name is required'); return; }
    let schema;
    try { schema = JSON.parse(schemaStr); } catch { toast.error('Invalid JSON schema'); return; }
    setSaving(true);
    try {
      if (isNew) {
        const wf = await createWorkflow({ name, description: desc, input_schema: schema });
        toast.success('Workflow created!');
        navigate(`/workflows/${wf.id}/edit`);
      } else {
        await updateWorkflow(id, { name, description: desc, input_schema: schema, start_step_id: startStepId || null });
        toast.success('Saved!');
      }
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleSaveStep = async (data) => {
    try {
      if (data.id) { await updateStep(id, data.id, data); toast.success('Step updated'); }
      else { await createStep(id, { ...data, workflow_id: id }); toast.success('Step created'); }
      setStepModal(null);
    } catch (err) { toast.error(err.message); }
  };

  const handleDeleteStep = async () => {
    try { await deleteStep(id, deleteStepTarget.id); toast.success('Deleted'); setDeleteStepTarget(null); }
    catch (err) { toast.error(err.message); }
  };

  const handleSaveRule = async (stepId, data) => {
    try {
      if (data.id) { await updateRule(stepId, data.id, data); toast.success('Rule updated'); }
      else { await createRule(stepId, data); toast.success('Rule created'); }
      setRuleModal(null);
    } catch (err) { toast.error(err.message); }
  };

  const handleDeleteRule = async () => {
    try { await deleteRule(deleteRuleTarget.stepId, deleteRuleTarget.id); toast.success('Deleted'); setDeleteRuleTarget(null); }
    catch (err) { toast.error(err.message); }
  };

  if (loading) return <LoadingState text="Loading workflow..." />;

  return (
    <div className="page-content">
      <PageHeader
        title={isNew ? '✦ New Workflow' : `Edit: ${name}`}
        subtitle={isNew ? 'Define a new automation workflow' : `Version ${workflow?.version || 1}`}
        actions={
          <div className="flex gap-2">
            <button className="btn" onClick={() => navigate('/')}>← Back</button>
            {!isNew && id && <button className="btn btn-primary" onClick={() => navigate(`/workflows/${id}/execute`)}>▶ Execute</button>}
          </div>
        }
      />
      <div className="tabs">
        {TABS.map(t => <div key={t} className={`tab${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)}>{t.charAt(0).toUpperCase() + t.slice(1)}</div>)}
      </div>

      {activeTab === 'details' && (
        <div className="card" style={{ maxWidth: 580 }}>
          <div className="card-body">
            <FormGroup label="Workflow Name" required>
              <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Expense Approval" />
            </FormGroup>
            <FormGroup label="Description">
              <input className="form-input" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Brief description" />
            </FormGroup>
            <JsonEditor label="Input Schema" value={schemaStr} onChange={setSchemaStr} minHeight={180} hint='e.g. { "field": { "type": "string|number", "required": true } }' />
            {!isNew && id && sortedSteps.length > 0 && (
              <FormGroup label="Start Step">
                <select className="form-select" value={startStepId} onChange={e => setStartStepId(e.target.value)}>
                  <option value="">— Select start step —</option>
                  {sortedSteps.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </FormGroup>
            )}
            <button className="btn btn-primary" onClick={handleSaveDetails} disabled={saving}>
              {saving ? 'Saving...' : isNew ? '✓ Create Workflow' : '✓ Save Changes'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'steps' && (
        <div>
          {isNew ? (
            <div className="card"><EmptyState icon="💡" title="Create the workflow first" sub='Fill in Details tab and click "Create Workflow" first' /></div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <span style={{ fontWeight: 600 }}>{sortedSteps.length} steps</span>
                <button className="btn btn-primary btn-sm" onClick={() => setStepModal('new')}>+ Add Step</button>
              </div>
              {sortedSteps.length === 0 ? (
                <div className="card"><EmptyState icon="🔧" title="No steps yet" sub="Add steps to define your workflow"
                  action={<button className="btn btn-primary" onClick={() => setStepModal('new')}>Add First Step</button>} /></div>
              ) : sortedSteps.map(step => (
                <div className="step-card" key={step.id}>
                  <div className="step-card-header">
                    <div className="flex items-center gap-2">
                      <div className="step-order">{step.order || step.step_order}</div>
                      <div><div className="step-name">{step.name}</div><div style={{ marginTop: 4 }}><TypeTag type={step.step_type} /></div></div>
                    </div>
                    <div className="flex gap-2">
                      <button className="btn btn-sm" onClick={() => setStepModal(step)}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => setDeleteStepTarget(step)}>Delete</button>
                    </div>
                  </div>
                  {step.metadata && Object.keys(step.metadata).length > 0 && <div className="step-meta">{JSON.stringify(step.metadata)}</div>}
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {activeTab === 'rules' && (
        <div>
          {isNew || sortedSteps.length === 0 ? (
            <div className="card"><EmptyState icon="⚙" title={isNew ? 'Create workflow first' : 'Add steps first'} sub="You need steps before adding rules" /></div>
          ) : sortedSteps.map(step => {
            const stepRules = (rules[step.id] || []).slice().sort((a, b) => a.priority - b.priority);
            return (
              <div key={step.id} style={{ marginBottom: 24 }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <TypeTag type={step.step_type} />
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{step.name}</span>
                    <span className="badge badge-gray">{stepRules.length} rules</span>
                  </div>
                  <button className="btn btn-sm btn-primary" onClick={() => { fetchRules(step.id); setRuleModal({ stepId: step.id }); }}>+ Add Rule</button>
                </div>
                {stepRules.length === 0 ? (
                  <div style={{ padding: '12px 16px', background: 'var(--warn-light)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--warn)', border: '1px solid rgba(193,127,42,.2)' }}>
                    ⚠ No rules yet — add a DEFAULT rule to avoid workflow failure.
                  </div>
                ) : stepRules.map(rule => {
                  const nextStep = sortedSteps.find(s => s.id === rule.next_step_id);
                  return (
                    <div className="rule-row" key={rule.id}>
                      <div className="rule-priority">{rule.priority}</div>
                      <div className="rule-condition">{rule.condition}</div>
                      <div className="rule-next">→ {nextStep?.name || 'End'}</div>
                      <button className="btn btn-xs" onClick={() => { fetchRules(step.id); setRuleModal({ stepId: step.id, rule }); }}>Edit</button>
                      <button className="btn btn-xs btn-danger" onClick={() => setDeleteRuleTarget({ ...rule, stepId: step.id })}>Del</button>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'flow' && <FlowDiagram steps={sortedSteps} rules={rules} />}

      {stepModal && <StepModal step={stepModal === 'new' ? null : stepModal} onSave={handleSaveStep} onClose={() => setStepModal(null)} />}
      {ruleModal && <RuleModal stepId={ruleModal.stepId} rule={ruleModal.rule} steps={sortedSteps} onSave={handleSaveRule} onClose={() => setRuleModal(null)} />}
      {deleteStepTarget && <ConfirmModal title="Delete Step" message={`Delete "${deleteStepTarget.name}"?`} danger onConfirm={handleDeleteStep} onClose={() => setDeleteStepTarget(null)} />}
      {deleteRuleTarget && <ConfirmModal title="Delete Rule" message="Delete this rule?" danger onConfirm={handleDeleteRule} onClose={() => setDeleteRuleTarget(null)} />}
    </div>
  );
}
