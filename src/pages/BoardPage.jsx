import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import Column from '../components/Column.jsx';
import TaskModal from '../components/TaskModal.jsx';
import TaskDetailPanel from '../components/TaskDetailPanel.jsx';
import Sidebar from '../components/Sidebar.jsx';
import FilterBar from '../components/FilterBar.jsx';
import { TaskCardView } from '../components/TaskCard.jsx';
import { BoardContext } from '../context/BoardContext';
import { supabase } from '../lib/supabase';
import {
  fetchTasks,
  createTask,
  moveTask,
  deleteTask,
  updateTask,
  setTaskAssignees,
  setTaskLabels,
  normalizeTask,
} from '../api/tasks';
import { fetchMembers, createMember, deleteMember } from '../api/team';
import { fetchLabels, createLabel, deleteLabel } from '../api/labels';

// Must match the CHECK constraint on tasks.status in schema.sql
export const COLUMNS = [
  { id: 'todo', title: 'To Do' },
  { id: 'in_progress', title: 'In Progress' },
  { id: 'in_review', title: 'In Review' },
  { id: 'done', title: 'Done' },
];
const COLUMN_IDS = COLUMNS.map((c) => c.id);

const EMPTY_FILTERS = { search: '', priority: '', assignee: '', label: '' };

// Sort inside a column: priority, then soonest due date (none last), then creation order
const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

function compareTasks(a, b) {
  const byPriority = (PRIORITY_RANK[a.priority] ?? 3) - (PRIORITY_RANK[b.priority] ?? 3);
  if (byPriority !== 0) return byPriority;

  if (a.due_date !== b.due_date) {
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return a.due_date < b.due_date ? -1 : 1;
  }

  return a.position - b.position;
}

function columnTasks(list, status) {
  return list.filter((t) => t.status === status).sort(compareTasks);
}

// An id is either a column id or a task id; returns the column it belongs to
function findColumn(list, id) {
  if (COLUMN_IDS.includes(id)) return id;
  return list.find((t) => t.id === id)?.status;
}

function matchesFilters(task, f) {
  if (f.search && !task.title.toLowerCase().includes(f.search.trim().toLowerCase())) return false;
  if (f.priority && task.priority !== f.priority) return false;
  if (f.assignee === 'unassigned' && task.assignee_ids.length > 0) return false;
  if (f.assignee && f.assignee !== 'unassigned' && !task.assignee_ids.includes(f.assignee)) return false;
  if (f.label && !task.label_ids.includes(f.label)) return false;
  return true;
}

export default function BoardPage({ user }) {
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [openTaskId, setOpenTaskId] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [activeId, setActiveId] = useState(null);

  const snapshotRef = useRef(null);
  const activeIdRef = useRef(null); // readable inside the realtime callback

  const sensors = useSensors(
    // 5px before a drag starts, so clicks on cards still work
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    Promise.all([fetchTasks(), fetchMembers(), fetchLabels()])
      .then(([t, m, l]) => {
        setTasks(t);
        setMembers(m);
        setLabels(l);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const mine = { schema: 'public', table: 'tasks', filter: `user_id=eq.${user.id}` };

    const channel = supabase
      .channel(`tasks-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', ...mine }, ({ new: row }) => {
        setTasks((prev) => (prev.some((t) => t.id === row.id) ? prev : [...prev, normalizeTask(row)]));
      })
      .on('postgres_changes', { event: 'UPDATE', ...mine }, ({ new: row }) => {
        if (row.id === activeIdRef.current) return;
        // Merge: realtime rows don't include assignee_ids / label_ids
        setTasks((prev) => prev.map((t) => (t.id === row.id ? { ...t, ...row } : t)));
      })
      // DELETE events can't be filtered by user and only carry the id
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'tasks' }, ({ old }) => {
        setTasks((prev) => prev.filter((t) => t.id !== old.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id]);

  async function handleAdd(fields) {
    const todoCount = tasks.filter((t) => t.status === 'todo').length;
    try {
      const task = await createTask({ ...fields, status: 'todo', position: todoCount + 1 });
      // Realtime may have added it already, without assignees/labels
      setTasks((prev) =>
        prev.some((t) => t.id === task.id)
          ? prev.map((t) => (t.id === task.id ? task : t))
          : [...prev, task]
      );
      setShowModal(false);
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleDelete(id) {
    const prev = tasks;
    setTasks((t) => t.filter((task) => task.id !== id));
    if (openTaskId === id) setOpenTaskId(null);
    try {
      await deleteTask(id);
    } catch (e) {
      setTasks(prev);
      setError(e.message);
    }
  }

  // Update the screen first, save, and roll back on failure
  async function applyTaskChange(id, patch, save) {
    const prev = tasks;
    setTasks((t) => t.map((task) => (task.id === id ? { ...task, ...patch } : task)));
    try {
      await save();
    } catch (e) {
      setTasks(prev);
      setError(e.message);
      throw e;
    }
  }

  function handleUpdateTask(id, fields) {
    return applyTaskChange(id, fields, () => updateTask(id, fields));
  }

  function handleSetAssignees(id, nextIds) {
    const current = tasks.find((t) => t.id === id)?.assignee_ids ?? [];
    return applyTaskChange(id, { assignee_ids: nextIds }, () =>
      setTaskAssignees(id, current, nextIds)
    );
  }

  function handleSetLabels(id, nextIds) {
    const current = tasks.find((t) => t.id === id)?.label_ids ?? [];
    return applyTaskChange(id, { label_ids: nextIds }, () => setTaskLabels(id, current, nextIds));
  }

  async function handleAddMember(fields) {
    try {
      const member = await createMember(fields);
      setMembers((prev) => [...prev, member]);
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleDeleteMember(id) {
    try {
      await deleteMember(id);
      setMembers((prev) => prev.filter((m) => m.id !== id));
      setTasks((prev) =>
        prev.map((t) => ({ ...t, assignee_ids: t.assignee_ids.filter((x) => x !== id) }))
      );
      setFilters((f) => (f.assignee === id ? { ...f, assignee: '' } : f));
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleAddLabel(fields) {
    try {
      const label = await createLabel(fields);
      setLabels((prev) => [...prev, label]);
    } catch (e) {
      setError(e.code === '23505' ? `A label called "${fields.name}" already exists` : e.message);
    }
  }

  async function handleDeleteLabel(id) {
    try {
      await deleteLabel(id);
      setLabels((prev) => prev.filter((l) => l.id !== id));
      setTasks((prev) => prev.map((t) => ({ ...t, label_ids: t.label_ids.filter((x) => x !== id) })));
      setFilters((f) => (f.label === id ? { ...f, label: '' } : f));
    } catch (e) {
      setError(e.message);
    }
  }

  function handleDragStart({ active }) {
    snapshotRef.current = tasks;
    activeIdRef.current = active.id;
    setActiveId(active.id);
  }

  // Move the card into the hovered column while dragging
  function handleDragOver({ active, over }) {
    if (!over) return;
    setTasks((prev) => {
      const from = findColumn(prev, active.id);
      const to = findColumn(prev, over.id);
      if (!from || !to || from === to) return prev;
      return prev.map((t) => (t.id === active.id ? { ...t, status: to } : t));
    });
  }

  // Order inside a column is automatic, so only a status change is saved
  async function handleDragEnd({ active, over }) {
    const snapshot = snapshotRef.current;
    activeIdRef.current = null;
    setActiveId(null);

    if (!over) {
      setTasks(snapshot);
      return;
    }

    const before = snapshot.find((t) => t.id === active.id);
    const after = tasks.find((t) => t.id === active.id);
    if (!before || !after || before.status === after.status) return;

    const position = tasks.filter((t) => t.status === after.status).length;
    setTasks((prev) => prev.map((t) => (t.id === after.id ? { ...t, position } : t)));

    try {
      await moveTask(after.id, after.status, position);
    } catch (e) {
      setTasks(snapshot);
      setError(e.message);
    }
  }

  function handleDragCancel() {
    activeIdRef.current = null;
    setActiveId(null);
    if (snapshotRef.current) setTasks(snapshotRef.current);
  }

  const visibleTasks = tasks.filter((t) => matchesFilters(t, filters));
  const activeTask = tasks.find((t) => t.id === activeId);
  const openTask = tasks.find((t) => t.id === openTaskId);

  const boardContext = useMemo(
    () => ({
      user,
      members,
      labels,
      membersById: Object.fromEntries(members.map((m) => [m.id, m])),
      labelsById: Object.fromEntries(labels.map((l) => [l.id, l])),
      openTask: setOpenTaskId,
    }),
    [user, members, labels]
  );

  if (loading) return <p className="status">Loading…</p>;

  return (
    <BoardContext.Provider value={boardContext}>
      <div className="app-layout">
        <Sidebar
          tasks={tasks}
          filters={filters}
          onFilter={(patch) => setFilters((f) => ({ ...f, ...patch }))}
          onAddMember={handleAddMember}
          onDeleteMember={handleDeleteMember}
          onAddLabel={handleAddLabel}
          onDeleteLabel={handleDeleteLabel}
        />

        <main className="board-page">
          <header className="board-header">
            <h1>Kanban Board</h1>
            <div className="header-actions">
              {/* No sign-out: a signed-out guest can't get back into their board */}
              <span className="guest-badge" title={`Guest ID: ${user.id}`}>
                {user.is_anonymous ? 'Guest session' : user.email}
              </span>
              <button className="btn-primary" onClick={() => setShowModal(true)}>
                + Add task
              </button>
            </div>
          </header>

          <FilterBar
            filters={filters}
            onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))}
            onClear={() => setFilters(EMPTY_FILTERS)}
            shown={visibleTasks.length}
            total={tasks.length}
          />

          {error && (
            <p className="error" onClick={() => setError(null)}>
              {error} (click to dismiss)
            </p>
          )}

          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <div className="board">
              {COLUMNS.map((col) => (
                <Column
                  key={col.id}
                  id={col.id}
                  title={col.title}
                  tasks={columnTasks(visibleTasks, col.id)}
                  onDelete={handleDelete}
                />
              ))}
            </div>

            <DragOverlay>
              {activeTask ? <TaskCardView task={activeTask} className="card--overlay" /> : null}
            </DragOverlay>
          </DndContext>
        </main>
      </div>

      {showModal && <TaskModal onSave={handleAdd} onClose={() => setShowModal(false)} />}

      {openTask && (
        <TaskDetailPanel
          key={openTask.id}
          task={openTask}
          columns={COLUMNS}
          onClose={() => setOpenTaskId(null)}
          onUpdate={handleUpdateTask}
          onSetAssignees={handleSetAssignees}
          onSetLabels={handleSetLabels}
          onDelete={handleDelete}
        />
      )}
    </BoardContext.Provider>
  );
}
