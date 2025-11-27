import type { PaperBlueprint } from '@/lib/papers/types';
import { createSupabaseServiceClient } from '@/lib/supabase/clients';

export async function savePaperBlueprint(blueprint: PaperBlueprint): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from('papers')
    .upsert({
      id: blueprint.id,
      session_id: blueprint.sessionId,
      type: blueprint.type,
      created_by: blueprint.createdBy ?? null,
      created_at: blueprint.createdAt ? new Date(blueprint.createdAt).toISOString() : new Date().toISOString(),
      metadata: blueprint.metadata ?? {},
      blueprint: blueprint.blueprint ?? {},
    });
  if (error) throw error;
}

export async function loadPaperBlueprint(id: string): Promise<PaperBlueprint | null> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('papers')
    .select('*')
    .eq('id', id)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  if (!data) return null;
  return mapPaper(data);
}

export async function listPapersByType(type: string): Promise<PaperBlueprint[]> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('papers')
    .select('*')
    .eq('type', type)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapPaper);
}

function mapPaper(row: any): PaperBlueprint {
  return {
    id: row.id,
    sessionId: row.session_id ?? row.id,
    type: row.type,
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at ?? new Date().toISOString(),
    metadata: row.metadata ?? {},
    blueprint: row.blueprint ?? {},
  };
}
