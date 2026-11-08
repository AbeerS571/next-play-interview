import { useEffect, useState } from 'react';
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import Column from '../components/Column.jsx';
import NewTaskForm from '../components/NewTaskForm.jsx';
import { fetchTasks, createTask, moveTask, deleteTask } from '../api/tasks';

// Must match the CHECK constraint on tasks.status in schema.sql
const COLUMNS = [
  { id: 'todo', title: 'To Do' },
  { id: 'in_progress', title: 'In Progress' },
  { id: 'in_review', title: 'In Review' },
  { id: 'done', title: 'Done' },
];

export default function BoardPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Require a small drag distance so clicks on buttons inside cards still work
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  useEffect(() => {
    fetchTasks()
      .then(setTasks)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleAdd(title) {
    const todoCount = tasks.filter((t) => t.status === 'todo').length;
    try {
      const task = await createTask({ title, status: 'todo', position: todoCount + 1 });
      setTasks((prev) => [...prev, task]);
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleDelete(id) {
    const prev = tasks;
    setTasks((t) => t.filter((task) => task.id !== id)); // optimistic
    try {
      await deleteTask(id);
    } catch (e) {
      setTasks(prev); // roll back
      setError(e.message);
    }
  }

  async function handleDragEnd(event) {
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id;
    const newStatus = over.id; // droppable id = column id
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    // Put it at the bottom of the target column
    const newPosition = tasks.filter((t) => t.status === newStatus).length + 1;

    const prev = tasks;
    setTasks((t) =>
      t.map((x) => (x.id === taskId ? { ...x, status: newStatus, position: newPosition } : x))
    ); // optimistic update

    try {
      await moveTask(taskId, newStatus, newPosition);
    } catch (e) {
      setTasks(prev); // roll back on failure
      setError(e.message);
    }
  }

  if (loading) return <p className="status">Loading…</p>;

  return (
    <div className="board-page">
      <header className="board-header">
        <h1>Kanban Board</h1>
        <NewTaskForm onAdd={handleAdd} />
      </header>

      {error && (
        <p className="error" onClick={() => setError(null)}>
          {error} (click to dismiss)
        </p>
      )}

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="board">
          {COLUMNS.map((col) => (
            <Column
              key={col.id}
              id={col.id}
              title={col.title}
              tasks={tasks
                .filter((t) => t.status === col.id)
                .sort((a, b) => a.position - b.position)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}
