import { useDraggable } from '@dnd-kit/core';

export default function TaskCard({ task, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  const style = {
    transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <article ref={setNodeRef} style={style} className="card" {...listeners} {...attributes}>
      <div className="card-top">
        <h3>{task.title}</h3>
        <button
          className="delete"
          onClick={() => onDelete(task.id)}
          aria-label={`Delete ${task.title}`}
        >
          ×
        </button>
      </div>
      {task.description && <p>{task.description}</p>}
    </article>
  );
}
