import { useBoard } from '../context/BoardContext';
import { colorVar } from '../lib/colors';
import Avatar from './Avatar.jsx';

export function LabelChip({ label, onRemove, small = false }) {
  return (
    <span className={`label-chip ${small ? 'label-chip--small' : ''}`} style={{ background: colorVar(label.color) }}>
      {label.name}
      {onRemove && (
        <button type="button" className="chip-remove" onClick={onRemove} aria-label={`Remove ${label.name}`}>
          ×
        </button>
      )}
    </span>
  );
}

function toggle(ids, id) {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
}

export function AssigneePicker({ value, onChange }) {
  const { members } = useBoard();

  if (members.length === 0) {
    return <p className="picker-empty">No team members yet. Add them in the sidebar.</p>;
  }

  return (
    <div className="picker">
      {members.map((m) => {
        const selected = value.includes(m.id);
        return (
          <button
            key={m.id}
            type="button"
            className={`picker-option ${selected ? 'is-selected' : ''}`}
            aria-pressed={selected}
            onClick={() => onChange(toggle(value, m.id))}
          >
            <Avatar member={m} size={22} />
            {m.name}
          </button>
        );
      })}
    </div>
  );
}

export function LabelPicker({ value, onChange }) {
  const { labels } = useBoard();

  if (labels.length === 0) {
    return <p className="picker-empty">No labels yet. Create them in the sidebar.</p>;
  }

  return (
    <div className="picker">
      {labels.map((l) => {
        const selected = value.includes(l.id);
        return (
          <button
            key={l.id}
            type="button"
            className={`picker-option picker-option--label ${selected ? 'is-selected' : ''}`}
            aria-pressed={selected}
            onClick={() => onChange(toggle(value, l.id))}
          >
            <span className="label-dot" style={{ background: colorVar(l.color) }} />
            {l.name}
          </button>
        );
      })}
    </div>
  );
}

export function ColorSwatches({ options, value, onChange }) {
  return (
    <div className="swatches" role="radiogroup" aria-label="Color">
      {options.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          aria-label={c}
          className={`swatch ${value === c ? 'is-selected' : ''}`}
          style={{ background: colorVar(c) }}
          onClick={() => onChange(c)}
        />
      ))}
    </div>
  );
}

export const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export function PriorityPicker({ value, onChange }) {
  return (
    <div className="priority-picker" role="radiogroup" aria-label="Priority">
      {PRIORITIES.map((p) => (
        <button
          key={p.value}
          type="button"
          role="radio"
          aria-checked={value === p.value}
          className={`priority-option priority--${p.value} ${value === p.value ? 'is-active' : ''}`}
          onClick={() => onChange(p.value)}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
