import React from 'react';

const TYPE_COLORS = {
  task: { fill: '#eff4fd', stroke: '#2563a8', text: '#185FA5' },
  approval: { fill: '#f0ecfb', stroke: '#6b4fa8', text: '#6b4fa8' },
  notification: { fill: '#e8f5ef', stroke: '#1a7f5a', text: '#0f5c3f' },
};

export default function FlowDiagram({ steps, rules }) {
  const sorted = [...steps].sort((a, b) => a.order - b.order);
  if (sorted.length === 0) {
    return (
      <div className="card">
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>
          No steps to visualize
        </div>
      </div>
    );
  }

  const NODE_W = 140, NODE_H = 52, COL_GAP = 180, ROW_GAP = 90;
  const PER_ROW = 3;
  const pos = {};
  sorted.forEach((s, i) => {
    const col = i % PER_ROW, row = Math.floor(i / PER_ROW);
    pos[s.id] = { x: 20 + col * COL_GAP, y: 20 + row * ROW_GAP };
  });

  const totalCols = Math.min(sorted.length, PER_ROW);
  const totalRows = Math.ceil(sorted.length / PER_ROW);
  const svgW = Math.max(400, 20 + totalCols * COL_GAP + NODE_W);
  const svgH = 20 + totalRows * ROW_GAP + NODE_H + 10;

  const edges = [];
  sorted.forEach(step => {
    const stepRules = (rules[step.id] || []).sort((a, b) => a.priority - b.priority);
    const seen = new Set();
    stepRules.forEach(r => {
      if (r.next_step_id && !seen.has(r.next_step_id) && pos[r.next_step_id]) {
        seen.add(r.next_step_id);
        const from = pos[step.id], to = pos[r.next_step_id];
        const fx = from.x + NODE_W / 2, fy = from.y + NODE_H;
        const tx = to.x + NODE_W / 2, ty = to.y;
        const isDefault = r.condition === 'DEFAULT';
        edges.push({ fx, fy, tx, ty, label: isDefault ? '' : `P${r.priority}` });
      }
    });
  });

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Workflow Flow Diagram</span>
        <div className="flex gap-2">
          {Object.entries(TYPE_COLORS).map(([k, v]) => (
            <div key={k} className="flex items-center gap-2" style={{ fontSize: 11, color: 'var(--text2)' }}>
              <div style={{ width: 10, height: 10, background: v.fill, border: `1.5px solid ${v.stroke}`, borderRadius: 2 }} />
              {k}
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: 16, overflowX: 'auto' }}>
        <svg width={svgW} height={svgH} style={{ display: 'block' }}>
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="var(--border2)" />
            </marker>
          </defs>

          {edges.map((e, i) => {
            const cx1 = e.fx, cy1 = e.fy + 25;
            const cx2 = e.tx, cy2 = e.ty - 25;
            return (
              <g key={i}>
                <path
                  d={`M${e.fx},${e.fy} C${cx1},${cy1} ${cx2},${cy2} ${e.tx},${e.ty}`}
                  fill="none" stroke="var(--border2)" strokeWidth="1.5"
                  markerEnd="url(#arrow)"
                />
                {e.label && (
                  <text
                    x={(e.fx + e.tx) / 2 + 6}
                    y={(e.fy + e.ty) / 2}
                    fontSize="10" fill="var(--text3)"
                    fontFamily="var(--mono)"
                  >
                    {e.label}
                  </text>
                )}
              </g>
            );
          })}

          {sorted.map(step => {
            const p = pos[step.id];
            const c = TYPE_COLORS[step.step_type] || TYPE_COLORS.task;
            const label = step.name.length > 16 ? step.name.slice(0, 15) + '…' : step.name;
            return (
              <g key={step.id}>
                <rect
                  x={p.x} y={p.y}
                  width={NODE_W} height={NODE_H}
                  rx="8" ry="8"
                  fill={c.fill}
                  stroke={c.stroke}
                  strokeWidth="1.5"
                />
                <text x={p.x + NODE_W / 2} y={p.y + 22}
                  textAnchor="middle" fontSize="12" fontWeight="600"
                  fill={c.text} fontFamily="DM Sans, system-ui"
                >
                  {label}
                </text>
                <text x={p.x + NODE_W / 2} y={p.y + 38}
                  textAnchor="middle" fontSize="10"
                  fill={c.text} fontFamily="DM Mono, monospace"
                  opacity="0.75"
                >
                  {step.step_type}
                </text>
                <text x={p.x + 8} y={p.y + 14}
                  fontSize="9" fill={c.stroke}
                  fontFamily="DM Sans" fontWeight="700"
                >
                  {step.order}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
