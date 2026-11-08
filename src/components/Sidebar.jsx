import { useState } from 'react';
import { useBoard } from '../context/BoardContext';
import { COLOR_OPTIONS } from '../lib/colors';
import { getUrgency } from '../lib/dates';
import Avatar from './Avatar.jsx';
import { ColorSwatches, LabelChip } from './Pickers.jsx';

export default function Sidebar({
  tasks,
  filters,
  onFilter,
  onAddMember,
  onDeleteMember,
  onAddLabel,
  onDeleteLabel,
}) {
  return (
    <aside className="sidebar">
      <Summary tasks={tasks} />
      <TeamSection
        filters={filters}
        onFilter={onFilter}
        onAdd={onAddMember}
        onDelete={onDeleteMember}
      />
      <LabelsSection
        filters={filters}
        onFilter={onFilter}
        onAdd={onAddLabel}
        onDelete={onDeleteLabel}
      />
    </aside>
  );
}

function Summary({ tasks }) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === 'done').length;
  const overdue = tasks.filter((t) => getUrgency(t)?.level === 'overdue').length;
  const dueSoon = tasks.filter((t) => ['today', 'soon'].includes(getUrgency(t)?.level)).length;
  const percent = total ? Math.round((done / total) * 100) : 0;

  return (
    <section className="sidebar-section">
      <h2 className="sidebar-title">Summary</h2>
      <div className="stats">
        <div className="stat">
          <span className="stat-value">{total}</span>
          <span className="stat-label">Total</span>
        </div>
        <div className="stat stat--done">
          <span className="stat-value">{done}</span>
          <span className="stat-label">Done</span>
        </div>
        <div className={`stat ${overdue ? 'stat--overdue' : ''}`}>
          <span className="stat-value">{overdue}</span>
          <span className="stat-label">Overdue</span>
        </div>
      </div>

      <div className="progress" aria-label={`${percent}% complete`}>
        <div className="progress-bar" style={{ width: `${percent}%` }} />
      </div>
      <p className="progress-text">
        {percent}% complete{dueSoon > 0 && ` · ${dueSoon} due soon`}
      </p>
    </section>
  );
}

function TeamSection({ filters, onFilter, onAdd, onDelete }) {
  const { members } = useBoard();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [avatarUrl, setAvatarUrl] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    await onAdd({ name: name.trim(), color, avatar_url: avatarUrl.trim() || null });
    setName('');
    setAvatarUrl('');
    setColor(COLOR_OPTIONS[(COLOR_OPTIONS.indexOf(color) + 1) % COLOR_OPTIONS.length]);
    setAdding(false);
  }

  return (
    <section className="sidebar-section">
      <div className="sidebar-heading">
        <h2 className="sidebar-title">Team</h2>
        <button type="button" className="sidebar-add" onClick={() => setAdding(!adding)}>
          {adding ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {adding && (
        <form className="sidebar-form" onSubmit={handleSubmit}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" autoFocus />
          <ColorSwatches options={COLOR_OPTIONS} value={color} onChange={setColor} />
          <input
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="Avatar image URL (optional)"
            type="url"
          />
          <button type="submit" className="btn-primary btn-small" disabled={!name.trim()}>
            Add member
          </button>
        </form>
      )}

      {members.length === 0 && !adding && <p className="sidebar-empty">Add people to assign them to tasks.</p>}

      <ul className="sidebar-list">
        {members.map((m) => {
          const active = filters.assignee === m.id;
          return (
            <li key={m.id} className={`sidebar-item ${active ? 'is-active' : ''}`}>
              <button
                type="button"
                className="sidebar-item-main"
                onClick={() => onFilter({ assignee: active ? '' : m.id })}
                title={active ? 'Clear filter' : `Show ${m.name}'s tasks`}
              >
                <Avatar member={m} size={26} />
                <span>{m.name}</span>
              </button>
              <button
                type="button"
                className="sidebar-item-delete"
                onClick={() => onDelete(m.id)}
                aria-label={`Remove ${m.name}`}
              >
                ×
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function LabelsSection({ filters, onFilter, onAdd, onDelete }) {
  const { labels } = useBoard();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState('blue');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    await onAdd({ name: name.trim(), color });
    setName('');
    setAdding(false);
  }

  return (
    <section className="sidebar-section">
      <div className="sidebar-heading">
        <h2 className="sidebar-title">Labels</h2>
        <button type="button" className="sidebar-add" onClick={() => setAdding(!adding)}>
          {adding ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {adding && (
        <form className="sidebar-form" onSubmit={handleSubmit}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Bug, Feature, Design"
            autoFocus
          />
          <ColorSwatches options={COLOR_OPTIONS} value={color} onChange={setColor} />
          <button type="submit" className="btn-primary btn-small" disabled={!name.trim()}>
            Add label
          </button>
        </form>
      )}

      {labels.length === 0 && !adding && <p className="sidebar-empty">Create labels to group tasks.</p>}

      <div className="sidebar-labels">
        {labels.map((l) => {
          const active = filters.label === l.id;
          return (
            <span key={l.id} className={`sidebar-label ${active ? 'is-active' : ''}`}>
              <button
                type="button"
                className="sidebar-label-main"
                onClick={() => onFilter({ label: active ? '' : l.id })}
                title={active ? 'Clear filter' : `Show tasks labeled ${l.name}`}
              >
                <LabelChip label={l} />
              </button>
              <button
                type="button"
                className="sidebar-item-delete"
                onClick={() => onDelete(l.id)}
                aria-label={`Delete label ${l.name}`}
              >
                ×
              </button>
            </span>
          );
        })}
      </div>
    </section>
  );
}
