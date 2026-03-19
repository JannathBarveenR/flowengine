import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const NAV = [
  { to: '/', label: 'Workflows', icon: '⚡', exact: true },
  { to: '/rule-engine', label: 'Rule Engine', icon: '⚙' },
  { to: '/audit', label: 'Audit Log', icon: '📋' },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">⚡</div>
        <div>
          <div className="sidebar-logo-text">FlowEngine</div>
          <div className="sidebar-logo-sub">Workflow Automation</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Navigation</div>
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <span style={{ fontSize: 15 }}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div style={{ fontWeight: 600, marginBottom: 2 }}>FlowEngine v1.0</div>
        <div>Workflow Automation Platform</div>
      </div>
    </aside>
  );
}
