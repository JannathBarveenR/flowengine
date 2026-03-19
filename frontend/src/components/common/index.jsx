import React from 'react';

export function StatusBadge({ status }) {
  const map = {
    completed: 'badge-success',
    failed: 'badge-danger',
    pending: 'badge-warn',
    in_progress: 'badge-info',
    canceled: 'badge-gray',
    active: 'badge-success',
    inactive: 'badge-gray',
  };
  const dot = {
    completed: '●', failed: '●', pending: '○', in_progress: '◌', canceled: '×',
  };
  return (
    <span className={`badge ${map[status] || 'badge-gray'}`}>
      <span style={{ fontSize: 8 }}>{dot[status] || '●'}</span>
      {status?.replace('_', ' ')}
    </span>
  );
}

export function TypeTag({ type }) {
  const map = { task: 'tag-task', approval: 'tag-approval', notification: 'tag-notification' };
  const icons = { task: '⚙', approval: '✓', notification: '🔔' };
  return (
    <span className={`tag ${map[type] || ''}`}>
      {icons[type]} {type}
    </span>
  );
}

export function Spinner({ size = 18 }) {
  return (
    <div className="spinner" style={{ width: size, height: size }} />
  );
}

export function LoadingState({ text = 'Loading...' }) {
  return (
    <div className="loading-overlay">
      <Spinner /> <span>{text}</span>
    </div>
  );
}

export function EmptyState({ icon = '📭', title = 'Nothing here yet', sub = '', action }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <div className="empty-state-title">{title}</div>
      {sub && <div className="empty-state-sub">{sub}</div>}
      {action}
    </div>
  );
}

export function Modal({ title, onClose, children, footer, maxWidth = 560 }) {
  React.useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth }}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

export function FormGroup({ label, required, hint, children }) {
  return (
    <div className="form-group">
      {label && (
        <label className="form-label">
          {label} {required && <span className="form-required">*</span>}
        </label>
      )}
      {children}
      {hint && <div className="form-hint">{hint}</div>}
    </div>
  );
}

export function ConfirmModal({ title, message, onConfirm, onClose, danger }) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
            Confirm
          </button>
        </>
      }
    >
      <p style={{ color: 'var(--text2)', fontSize: 14 }}>{message}</p>
    </Modal>
  );
}

export function JsonEditor({ value, onChange, label, hint, minHeight = 100 }) {
  const [error, setError] = React.useState('');
  const handleChange = (e) => {
    const v = e.target.value;
    onChange(v);
    try { JSON.parse(v); setError(''); }
    catch (err) { setError('Invalid JSON: ' + err.message.split('\n')[0]); }
  };
  return (
    <FormGroup label={label} hint={hint}>
      <textarea
        className="form-input form-textarea mono"
        value={value}
        onChange={handleChange}
        style={{ minHeight, fontFamily: 'var(--mono)', fontSize: 12 }}
      />
      {error && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>{error}</div>}
    </FormGroup>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-.3px' }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 8 }}>{actions}</div>}
    </div>
  );
}
