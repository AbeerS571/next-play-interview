import { useBoard } from '../context/BoardContext';
import { colorVar } from '../lib/colors';
import { PRIORITIES } from './Pickers.jsx';

export default function FilterBar({ filters, onChange, onClear, shown, total }) {
  const { members, labels, membersById, labelsById } = useBoard();
  const active = Object.values(filters).some(Boolean);

  // Each dropdown takes the color of what's selected in it
  const priorityColor = filters.priority && `var(--priority-${filters.priority})`;
  const assigneeColor =
    filters.assignee === 'unassigned' ? 'var(--field)' : membersById[filters.assignee] && colorVar(membersById[filters.assignee].color);
  const labelColor = labelsById[filters.label] && colorVar(labelsById[filters.label].color);

  return (
    <div className="filter-bar">
      <label className="search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value })}
          placeholder="Search tasks…"
          aria-label="Search tasks by title"
        />
      </label>

      <select
        className={`filter-select ${filters.priority ? 'is-set' : ''}`}
        style={priorityColor ? { backgroundColor: priorityColor } : undefined}
        value={filters.priority}
        onChange={(e) => onChange({ priority: e.target.value })}
        aria-label="Filter by priority"
      >
        <option value="">All priorities</option>
        {PRIORITIES.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>

      <select
        className={`filter-select ${filters.assignee ? 'is-set' : ''}`}
        style={assigneeColor ? { backgroundColor: assigneeColor } : undefined}
        value={filters.assignee}
        onChange={(e) => onChange({ assignee: e.target.value })}
        aria-label="Filter by assignee"
      >
        <option value="">All assignees</option>
        <option value="unassigned">Unassigned</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>

      <select
        className={`filter-select ${filters.label ? 'is-set' : ''}`}
        style={labelColor ? { backgroundColor: labelColor } : undefined}
        value={filters.label}
        onChange={(e) => onChange({ label: e.target.value })}
        aria-label="Filter by label"
      >
        <option value="">All labels</option>
        {labels.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>

      {active && (
        <>
          <span className="filter-count">
            {shown} of {total}
          </span>
          <button type="button" className="link-button" onClick={onClear}>
            Clear filters
          </button>
        </>
      )}
    </div>
  );
}
