import { supabase } from '../lib/supabase';

// Rows are written by database triggers (002_collaboration.sql)
export async function fetchActivity(taskId) {
  const { data, error } = await supabase
    .from('task_activity')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}
