import { supabase } from '../lib/supabase';

export async function fetchMembers() {
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function createMember({ name, color, avatar_url = null }) {
  const { data, error } = await supabase
    .from('team_members')
    .insert({ name, color, avatar_url: avatar_url || null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteMember(id) {
  const { error } = await supabase.from('team_members').delete().eq('id', id);
  if (error) throw error;
}
