import { supabase } from '../lib/supabase';

export async function fetchComments(taskId) {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function addComment(taskId, body) {
  const { data, error } = await supabase
    .from('comments')
    .insert({ task_id: taskId, body })
    .select()
    .single();
  if (error) throw error;
  return data;
}
