import { useDroppable } from '@dnd-kit/core';
import TaskCard from './TaskCard.jsx';

export default function Column({ id, title, tasks, onDelete }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  let background;
  if (id == 'todo'){
    background = '#FF6F61'
  } else if (id == 'in_progress'){
    background = '#FF9A8B'
  }else if (id == 'in_review'){
    background = '#FFC3A0'
  }else if (id == 'done'){
    background = '#C2E9FB'
  }else{
    background = '#000000'
  }
  
  return (
    <section
  ref={setNodeRef}
  className={`column ${isOver ? 'column--over' : ''}`}
  style={{ backgroundColor: background}}>
      <h2>
        {title} <span className="count">{tasks.length}</span>
      </h2>
      <div className="column-body">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onDelete={onDelete} />
        ))}
        {tasks.length === 0 && <p className="empty">Drop tasks here</p>}
      </div>
    </section>
  );
}
