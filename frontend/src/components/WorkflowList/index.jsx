import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useStore } from '../../store';
import { StatusBadge, LoadingState, EmptyState, ConfirmModal, PageHeader } from '../common';

export default function WorkflowList() {
  const navigate = useNavigate();
  const { workflows, workflowTotal, workflowLoading, fetchWorkflows, deleteWorkflow } = useStore();
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchWorkflows({ search, page, limit: 15 }).catch((err) => toast.error('Failed to load: ' + err.message));
  }, [search, page]);

  const handleDelete = async () => {
    try { await deleteWorkflow(deleteTarget.id); toast.success('Deleted'); setDeleteTarget(null); }
    catch (err) { toast.error(err.message); }
  };

  return (
    <div className="page-content">
      <PageHeader title="Workflows" subtitle="Create, manage and execute automation workflows"
        actions={<button className="btn btn-primary" onClick={() => navigate('/workflows/new')}>+ New Workflow</button>} />
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2,minmax(140px,200px))' }}>
        <div className="stat-card"><div className="stat-label">Total Workflows</div><div className="stat-value">{workflowTotal}</div></div>
        <div className="stat-card"><div className="stat-label">Active</div><div className="stat-value green">{workflows.filter(w => w.is_active).length}</div></div>
      </div>
      <div className="card">
        <div className="card-header">
          <div className="search-bar">
            <span style={{ color: 'var(--text3)', fontSize: 14 }}>🔍</span>
            <input placeholder="Search workflows..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/workflows/new')}>+ New Workflow</button>
        </div>
        {workflowLoading ? <LoadingState text="Loading..." /> : workflows.length === 0 ? (
          <EmptyState icon="⚡" title="No workflows yet" sub="Create your first workflow"
            action={<button className="btn btn-primary" onClick={() => navigate('/workflows/new')}>Create Workflow</button>} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Name</th><th>Version</th><th>Steps</th><th>Status</th><th>Updated</th><th>Actions</th></tr></thead>
              <tbody>
                {workflows.map(wf => (
                  <tr key={wf.id}>
                    <td><div className="font-600">{wf.name}</div>{wf.description && <div className="text-sm text-muted">{wf.description}</div>}</td>
                    <td><span className="badge badge-purple">v{wf.version}</span></td>
                    <td><span className="badge badge-gray">{wf.step_count || 0} steps</span></td>
                    <td><StatusBadge status={wf.is_active ? 'active' : 'inactive'} /></td>
                    <td className="text-sm text-muted">{new Date(wf.updated_at).toLocaleDateString()}</td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-sm" onClick={() => navigate(`/workflows/${wf.id}/edit`)}>Edit</button>
                        <button className="btn btn-sm btn-primary" onClick={() => navigate(`/workflows/${wf.id}/execute`)}>▶ Execute</button>
                        <button className="btn btn-sm btn-danger" onClick={() => setDeleteTarget(wf)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {workflowTotal > 15 && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
            <button className="btn btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <span style={{ fontSize: 13, color: 'var(--text2)', alignSelf: 'center' }}>Page {page}</span>
            <button className="btn btn-sm" disabled={page >= Math.ceil(workflowTotal / 15)} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        )}
      </div>
      {deleteTarget && <ConfirmModal title="Delete Workflow" message={`Delete "${deleteTarget.name}"? This cannot be undone.`} danger onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />}
    </div>
  );
}
