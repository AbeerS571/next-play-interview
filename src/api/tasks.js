import { supabase } from '../lib/supabase';

// Flattens the joined rows Supabase returns into simple id arrays
export function normalizeTask(row) {
  const { task_assignees, task_labels, ...task } = row;
  return {
    ...task,
    assignee_ids: (task_assignees ?? []).map((a) => a.member_id),
    label_ids: (task_labels ?? []).map((l) => l.label_id),
  };
}

export async function fetchTasks() {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, task_assignees(member_id), task_labels(label_id)')
    .order('position', { ascending: true });
  if (error) throw error;
  return data.map(normalizeTask);
}

export async function createTask({
  title,
  description = '',
  priority = 'medium',
  due_date = null,
  status = 'todo',
  position = 0,
  assignee_ids = [],
  label_ids = [],
}) {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title,
      description,
      priority,
      due_date: due_date || null,
      status,
      position,
    })
    .select()
    .single();
  if (error) throw error;

  await syncJoinRows('task_assignees', 'member_id', data.id, [], assignee_ids);
  await syncJoinRows('task_labels', 'label_id', data.id, [], label_ids);

  return { ...data, assignee_ids, label_ids };
}

export async function updateTask(id, fields) {
  const { error } = await supabase.from('tasks').update(fields).eq('id', id);
  if (error) throw error;
}

export async function moveTask(id, status, position) {
  return updateTask(id, { status, position });
}

export async function deleteTask(id) {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
}

export function setTaskAssignees(taskId, currentIds, nextIds) {
  return syncJoinRows('task_assignees', 'member_id', taskId, currentIds, nextIds);
}

export function setTaskLabels(taskId, currentIds, nextIds) {
  return syncJoinRows('task_labels', 'label_id', taskId, currentIds, nextIds);
}

async function syncJoinRows(table, column, taskId, currentIds, nextIds) {
  const toAdd = nextIds.filter((id) => !currentIds.includes(id));
  const toRemove = currentIds.filter((id) => !nextIds.includes(id));

  if (toAdd.length) {
    const { error } = await supabase
      .from(table)
      .insert(toAdd.map((id) => ({ task_id: taskId, [column]: id })));
    if (error) throw error;
  }

  if (toRemove.length) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('task_id', taskId)
      .in(column, toRemove);
    if (error) throw error;
  }
}
