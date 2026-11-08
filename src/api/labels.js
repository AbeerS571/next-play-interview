import { supabase } from '../lib/supabase';

export async function fetchLabels() {
  const { data, error } = await supabase
    .from('labels')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function createLabel({ name, color }) {
  const { data, error } = await supabase
    .from('labels')
    .insert({ name, color })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteLabel(id) {
  const { error } = await supabase.from('labels').delete().eq('id', id);
  if (error) throw error;
}
