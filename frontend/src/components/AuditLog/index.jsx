import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';
import { StatusBadge, LoadingState, EmptyState, PageHeader } from '../common';
import { executionApi } from '../../services/api';

const STATUSES = ['all', 'completed', 'failed', 'pending', 'in_progress', 'canceled'];

export default function AuditLog() {
  const { executions, executionTotal, executionLoading, fetchExecutions, cancelExecution, retryExecution } = useStore();
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    fetchExecutions({ status: filter === 'all' ? undefined : filter, page, limit: 15 })
      .catch(() => toast.error('Failed to load executions'));
  }, [filter, page]);

  const handleCancel = async (id) => {
    try { await cancelExecution(id); toast.success('Execution canceled'); }
    catch (err) { toast.error(err.message); }
  };

  const handleRetry = async (id) => {
    try { await retryExecution(id); toast.success('Retrying execution...'); }
    catch (err) { toast.error(err.message); }
  };

  const stats = [
    { label: 'Total', value: executionTotal, cls: '' },
    { label: 'Completed', value: executions.filter(e => e.status === 'completed').length, cls: 'green' },
    { label: 'Failed', value: executions.filter(e => e.status === 'failed').length, cls: 'red' },
    { label: 'In Progress', value: executions.filter(e => e.status === 'in_progress').length, cls: 'blue' },
  ];

  return (
    <div className="page-content">
      <PageHeader
        title="Audit Log"
        subtitle="Complete history of all workflow executions"
      />

      <div className="stats-grid">
        {stats.map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-label">{s.label}</div>
            <div className={`stat-value ${s.cls}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="filter-pills">
            {STATUSES.map(s => (
              <div
                key={s}
                className={`filter-pill${filter === s ? ' active' : ''}`}
                onClick={() => { setFilter(s); setPage(1); }}
              >
                {s}
              </div>
            ))}
          </div>
        </div>

        {executionLoading ? (
          <LoadingState text="Loading executions..." />
        ) : executions.length === 0 ? (
          <EmptyState icon="📋" title="No executions found" sub="Run a workflow to see execution history here" />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Execution ID</th>
                    <th>Workflow</th>
                    <th>Version</th>
                    <th>Status</th>
                    <th>Steps</th>
                    <th>Triggered By</th>
                    <th>Started</th>
                    <th>Duration</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {executions.map(exec => {
                    const duration = exec.started_at && exec.ended_at
                      ? Math.round((new Date(exec.ended_at) - new Date(exec.started_at)) / 1000) + 's'
                      : '—';
                    const isExpanded = expandedId === exec.id;
                    return (
                      <React.Fragment key={exec.id}>
                        <tr>
                          <td>
                            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text2)' }}>
                              {exec.id.slice(0, 8)}…
                            </span>
                          </td>
                          <td style={{ fontWeight: 600 }}>{exec.workflow_name || exec.workflow_id.slice(0, 8)}</td>
                          <td><span className="badge badge-purple">v{exec.workflow_version}</span></td>
                          <td><StatusBadge status={exec.status} /></td>
                          <td><span className="badge badge-gray">{(exec.logs || []).length} steps</span></td>
                          <td className="text-sm text-muted">{exec.triggered_by}</td>
                          <td className="text-sm text-muted">
                            {exec.started_at ? new Date(exec.started_at).toLocaleString() : '—'}
                          </td>
                          <td className="text-sm text-muted">{duration}</td>
                          <td>
                            <div className="flex gap-2">
                              <button
                                className="btn btn-xs"
                                onClick={() => setExpandedId(isExpanded ? null : exec.id)}
                              >
                                {isExpanded ? '▲ Hide' : '▼ Logs'}
                              </button>
                              {exec.status === 'failed' && (
                                <button className="btn btn-xs btn-primary" onClick={() => handleRetry(exec.id)}>
                                  Retry
                                </button>
                              )}
                              {['pending', 'in_progress'].includes(exec.status) && (
                                <button className="btn btn-xs btn-danger" onClick={() => handleCancel(exec.id)}>
                                  Cancel
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={9} style={{ background: 'var(--surface2)', padding: 0 }}>
                              <div style={{ padding: '14px 20px' }}>
                                <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 10, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                                  Execution Logs · {exec.id}
                                </div>
                                {/* Input data */}
                                <div style={{ marginBottom: 12 }}>
                                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 4 }}>INPUT DATA</div>
                                  <code style={{ fontSize: 11, background: 'var(--surface)', border: '1px solid var(--border)', padding: '6px 10px', borderRadius: 4, display: 'block', fontFamily: 'var(--mono)' }}>
                                    {JSON.stringify(exec.data || {}, null, 2)}
                                  </code>
                                </div>
                                {/* Step logs */}
                                {(exec.logs || []).map((log, i) => (
                                  <div key={i} className="exec-log" style={{ marginBottom: 8 }}>
                                    <div className="exec-log-header" style={{ cursor: 'default' }}>
                                      <div className="flex items-center gap-3">
                                        <div className={`progress-dot ${log.status === 'completed' ? 'done' : 'failed'}`} style={{ fontSize: 12 }}>{i + 1}</div>
                                        <div>
                                          <div style={{ fontWeight: 600, fontSize: 13 }}>{log.step_name}</div>
                                          <span className={`tag tag-${log.step_type}`}>{log.step_type}</span>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        {log.selected_next_step && <span style={{ fontSize: 12, color: 'var(--text2)' }}>→ {log.selected_next_step}</span>}
                                        <StatusBadge status={log.status} />
                                      </div>
                                    </div>
                                    <div className="exec-log-body">
                                      {(log.evaluated_rules || []).map((r, j) => (
                                        <div key={j} className={`rule-eval-row ${r.result ? 'match' : 'no-match'}`}>
                                          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, flex: 1 }}>{r.rule}</span>
                                          <span style={{ fontSize: 11, fontWeight: 700, color: r.result ? 'var(--accent)' : 'var(--text3)' }}>
                                            {r.result ? '✓' : '—'}
                                          </span>
                                        </div>
                                      ))}
                                      {log.approver_id && <div style={{ fontSize: 12, marginTop: 6 }}>Approver: <code style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{log.approver_id}</code></div>}
                                      {log.error_message && <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 6 }}>{log.error_message}</div>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {executionTotal > 15 && (
              <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
                <button className="btn btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                <span style={{ fontSize: 13, color: 'var(--text2)', alignSelf: 'center' }}>Page {page} of {Math.ceil(executionTotal / 15)}</span>
                <button className="btn btn-sm" disabled={page >= Math.ceil(executionTotal / 15)} onClick={() => setPage(p => p + 1)}>Next →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
