import { supabase } from '../lib/supabase';

// All Supabase calls for the tasks table live here.

export async function fetchTasks() {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('position', { ascending: true });
  if (error) throw error;
  console.log('[fetchTasks] rows from Supabase:', data); // debug: check real shape
  return data;
}

export async function createTask({ title, description = '', status = 'todo', position = 0 }) {
  const { data, error } = await supabase
    .from('tasks')
    .insert({ title, description, status, position })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function moveTask(id, status, position) {
  const { error } = await supabase
    .from('tasks')
    .update({ status, position })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteTask(id) {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
}
