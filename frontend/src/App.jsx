import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/common/Sidebar';
import WorkflowList from './components/WorkflowList';
import WorkflowEditor from './components/WorkflowEditor';
import ExecutePage from './components/ExecutePage';
import AuditLog from './components/AuditLog';
import RulesEngine from './components/RulesEngine';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Sidebar />
        <div className="main-area">
          <Routes>
            <Route path="/" element={<WorkflowList />} />
            <Route path="/workflows/new" element={<WorkflowEditor isNew={true} />} />
            <Route path="/workflows/:id/edit" element={<WorkflowEditor isNew={false} />} />
            <Route path="/workflows/:id/execute" element={<ExecutePage />} />
            <Route path="/rule-engine" element={<RulesEngine />} />
            <Route path="/audit" element={<AuditLog />} />
          </Routes>
        </div>
      </div>
      <Toaster position="top-right" toastOptions={{ style: { background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', fontSize: 13, fontFamily: 'DM Sans, system-ui' }, success: { iconTheme: { primary: '#1a7f5a', secondary: '#fff' } }, error: { iconTheme: { primary: '#d94c3d', secondary: '#fff' } } }} />
    </BrowserRouter>
  );
}
