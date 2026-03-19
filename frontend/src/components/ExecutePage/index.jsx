import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { workflowApi } from '../../services/api';
import { useStore } from '../../store';
import { StatusBadge, TypeTag, LoadingState, PageHeader } from '../common';

export default function ExecutePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { executeWorkflow } = useStore();

  const [workflow, setWorkflow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [inputData, setInputData] = useState({});
  const [result, setResult] = useState(null);
  const [expandedLogs, setExpandedLogs] = useState({});

  useEffect(() => {
    workflowApi.get(id)
      .then(res => { setWorkflow(res.workflow); setLoading(false); })
      .catch(() => { toast.error('Workflow not found'); navigate('/'); });
  }, [id]);

  if (loading) return <LoadingState />;

  const schema = workflow?.input_schema || {};

  const handleFieldChange = (key, value, type) => {
    setInputData(d => ({ ...d, [key]: type === 'number' ? (parseFloat(value) || value) : value }));
  };

  const handleRun = async () => {
    // Validate required fields
    for (const [key, def] of Object.entries(schema)) {
      if (def.required && (!inputData[key] && inputData[key] !== 0)) {
        toast.error(`Field "${key}" is required`);
        return;
      }
    }
    setRunning(true);
    setResult(null);
    try {
      const exec = await executeWorkflow(id, { data: inputData, triggered_by: 'web-user' });
      setResult(exec);
      setExpandedLogs({});
      toast.success('Workflow executed!');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRunning(false);
    }
  };

  const toggleLog = (i) => setExpandedLogs(e => ({ ...e, [i]: !e[i] }));

  return (
    <div className="page-content">
      <PageHeader
        title={`Execute: ${workflow.name}`}
        subtitle={`Version ${workflow.version} · ${(workflow.steps || []).length} steps`}
        actions={
          <button className="btn" onClick={() => navigate(`/workflows/${id}/edit`)}>← Back to Editor</button>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: result ? '1fr 1.4fr' : '1fr', gap: 20, maxWidth: result ? '100%' : 520 }}>
        {/* Input Form */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Input Data</span>
            <span className="badge badge-purple">v{workflow.version}</span>
          </div>
          <div className="card-body">
            {Object.keys(schema).length === 0 ? (
              <p style={{ color: 'var(--text3)', fontSize: 13 }}>This workflow has no input schema defined.</p>
            ) : (
              Object.entries(schema).map(([key, def]) => (
                <div className="form-group" key={key}>
                  <label className="form-label">
                    {key}
                    {def.required && <span className="form-required"> *</span>}
                    <span style={{ fontWeight: 400, color: 'var(--text3)', marginLeft: 4 }}>({def.type})</span>
                  </label>
                  {def.allowed_values ? (
                    <select
                      className="form-select"
                      value={inputData[key] || ''}
                      onChange={e => handleFieldChange(key, e.target.value, def.type)}
                    >
                      <option value="">Select...</option>
                      {def.allowed_values.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  ) : (
                    <input
                      className="form-input"
                      type={def.type === 'number' ? 'number' : 'text'}
                      value={inputData[key] || ''}
                      onChange={e => handleFieldChange(key, e.target.value, def.type)}
                      placeholder={`Enter ${key}`}
                    />
                  )}
                </div>
              ))
            )}

            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
              onClick={handleRun}
              disabled={running}
            >
              {running ? (
                <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Running...</>
              ) : '▶ Start Execution'}
            </button>
          </div>
        </div>

        {/* Result */}
        {result && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span style={{ fontWeight: 700, fontSize: 15 }}>Result</span>
              <StatusBadge status={result.status} />
              <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{result.id}</span>
            </div>

            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 16 }}>
              {[
                ['Steps Run', (result.logs || []).length],
                ['Status', result.status],
                ['Version', `v${result.workflow_version}`],
              ].map(([l, v]) => (
                <div className="stat-card" key={l}>
                  <div className="stat-label">{l}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>{v}</div>
                </div>
              ))}
            </div>

            <div>
              {(result.logs || []).map((log, i) => {
                const open = expandedLogs[i];
                const isDone = log.status === 'completed';
                return (
                  <div className="exec-log" key={i}>
                    <div className="exec-log-header" onClick={() => toggleLog(i)}>
                      <div className="flex items-center gap-3">
                        <div className={`progress-dot ${isDone ? 'done' : 'failed'}`}>{i + 1}</div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{log.step_name}</div>
                          <div style={{ marginTop: 3 }}><TypeTag type={log.step_type} /></div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {log.selected_next_step && (
                          <span style={{ fontSize: 12, color: 'var(--text2)' }}>→ {log.selected_next_step}</span>
                        )}
                        <StatusBadge status={log.status} />
                        <span style={{ fontSize: 12, color: 'var(--text3)' }}>{open ? '▲' : '▼'}</span>
                      </div>
                    </div>
                    {open && (
                      <div className="exec-log-body">
                        <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                          Rules Evaluated
                        </div>
                        {(log.evaluated_rules || []).map((r, j) => (
                          <div key={j} className={`rule-eval-row ${r.result ? 'match' : 'no-match'}`}>
                            <span style={{ fontFamily: 'var(--mono)', fontSize: 12, flex: 1 }}>{r.rule}</span>
                            <span style={{ fontWeight: 700, fontSize: 12, color: r.result ? 'var(--accent-dark)' : 'var(--text3)' }}>
                              {r.result ? '✓ match' : '—'}
                            </span>
                          </div>
                        ))}
                        <div style={{ marginTop: 10, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                          {log.selected_next_step && (
                            <div style={{ fontSize: 12 }}>
                              <span style={{ color: 'var(--text2)' }}>Next: </span>
                              <span style={{ color: 'var(--info)', fontWeight: 600 }}>{log.selected_next_step}</span>
                            </div>
                          )}
                          {log.approver_id && (
                            <div style={{ fontSize: 12 }}>
                              <span style={{ color: 'var(--text2)' }}>Approver: </span>
                              <span style={{ fontFamily: 'var(--mono)' }}>{log.approver_id}</span>
                            </div>
                          )}
                          {log.error_message && (
                            <div style={{ fontSize: 12, color: 'var(--danger)' }}>{log.error_message}</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
