import { forwardRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { useBoard } from '../context/BoardContext';
import { formatDueDate, getUrgency } from '../lib/dates';
import { AvatarStack } from './Avatar.jsx';
import { LabelChip } from './Pickers.jsx';

const TITLE_COLORS = {
  todo: 'var(--todo-title)',
  in_progress: 'var(--in_progress-title)',
  in_review: 'var(--in_review-title)',
  done: 'var(--done-title)',
};

function ClockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.2" />
      <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3 2 20h20L12 3Z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M12 10v4M12 17.5v.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

// Also used for the copy that follows the cursor while dragging (DragOverlay in BoardPage)
export const TaskCardView = forwardRef(function TaskCardView(
  { task, onDelete, onOpen, className = '', ...rest },
  ref
) {
  const { membersById, labelsById } = useBoard();
  const titleColor = TITLE_COLORS[task.status] || 'var(--ink)';
  const urgency = getUrgency(task);
  const assignees = task.assignee_ids.map((id) => membersById[id]).filter(Boolean);
  const labels = task.label_ids.map((id) => labelsById[id]).filter(Boolean);

  return (
    <article
      ref={ref}
      className={`card ${urgency ? `card--${urgency.level}` : ''} ${className}`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && onOpen) onOpen();
      }}
      {...rest}
    >
      {labels.length > 0 && (
        <div className="card-labels">
          {labels.map((l) => (
            <LabelChip key={l.id} label={l} small />
          ))}
        </div>
      )}

      <div className="card-top">
        <h3 style={{ color: titleColor }}>{task.title}</h3>
        {onDelete && (
          <button
            className="delete"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.id);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label={`Delete ${task.title}`}
          >
            ×
          </button>
        )}
      </div>

      {task.description && <p>{task.description}</p>}

      <div className="card-meta">
        <div className="card-meta-left">
          <span className={`priority priority--${task.priority}`}>{task.priority}</span>
          {urgency ? (
            <span className={`urgency urgency--${urgency.level}`} title={formatDueDate(task.due_date, true)}>
              {urgency.level === 'overdue' ? <AlertIcon /> : <ClockIcon />}
              {urgency.label}
            </span>
          ) : (
            task.due_date && <span className="due">Due {formatDueDate(task.due_date)}</span>
          )}
        </div>
        <AvatarStack members={assignees} />
      </div>
    </article>
  );
});

export default function TaskCard({ task, onDelete }) {
  const { openTask } = useBoard();
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({ id: task.id });

  return (
    <TaskCardView
      ref={setNodeRef}
      task={task}
      onDelete={onDelete}
      onOpen={() => openTask(task.id)}
      className={isDragging ? 'card--placeholder' : ''}
      {...attributes}
      {...listeners}
    />
  );
}
