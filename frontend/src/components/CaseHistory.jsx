import { useEffect } from 'react';

const CAT_ICONS = {
  consumer: '🛒', police: '🚔', employment: '💼',
  landlord: '🏠', cyber: '💻', rti: '📋',
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function CaseHistory({ cases, loadingCases, activeCaseId, onLoad, onDelete, onLoadCases }) {
  useEffect(() => { onLoadCases(); }, []);

  if (loadingCases) {
    return (
      <div className="case-history">
        <div className="case-history-label">Saved Cases</div>
        <div className="case-empty">Loading…</div>
      </div>
    );
  }

  if (!cases.length) {
    return (
      <div className="case-history">
        <div className="case-history-label">Saved Cases</div>
        <div className="case-empty">No saved cases yet.<br/>Save a conversation to revisit it later.</div>
      </div>
    );
  }

  return (
    <div className="case-history">
      <div className="case-history-label">Saved Cases</div>
      {cases.map(c => (
        <div
          key={c.id}
          className={`case-item ${activeCaseId === c.id ? 'active' : ''}`}
          onClick={() => onLoad(c.id)}
        >
          <div className="case-item-top">
            <span className="case-icon">{CAT_ICONS[c.category] || '📁'}</span>
            <span className="case-title">{c.title}</span>
          </div>
          <div className="case-item-bottom">
            <span className="case-time">{timeAgo(c.updated_at)}</span>
            <button
              className="case-delete"
              onClick={e => { e.stopPropagation(); onDelete(c.id); }}
              title="Delete case"
            >×</button>
          </div>
        </div>
      ))}
    </div>
  );
}
