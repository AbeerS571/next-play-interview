import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import TaskCard from './TaskCard.jsx';

export default function Column({ id, title, tasks, onDelete }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  let background;
  if (id === 'todo') {
    background = 'var(--todo-bg)';
  } else if (id === 'in_progress') {
    background = 'var(--in_progress-bg)';
  } else if (id === 'in_review') {
    background = 'var(--in_review-bg)';
  } else if (id === 'done') {
    background = 'var(--done-bg)';
  } else {
    background = 'var(--surface)';
  }

  return (
    <section
      ref={setNodeRef}
      className={`column ${isOver ? 'column--over' : ''}`}
      style={{ backgroundColor: background }}
    >
      <h2>
        {title} <span className="count">{tasks.length}</span>
      </h2>
      <div className="column-body">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onDelete={onDelete} />
          ))}
        </SortableContext>
        {tasks.length === 0 && <p className="empty">Drop tasks here</p>}
      </div>
    </section>
  );
}
