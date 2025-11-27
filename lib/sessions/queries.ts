import 'server-only';

import { createSupabaseServiceClient } from '@/lib/supabase/clients';
import type {
  Session,
  SessionStats,
  SessionAnalytics,
  SessionType,
} from './types';

const SESSION_TYPES: SessionType[] = ['reading', 'listening', 'writing', 'speaking'];

const createEmptyAnalytics = (): SessionAnalytics =>
  SESSION_TYPES.reduce((acc, type) => {
    acc[type] = {
      count: 0,
      totalDuration: 0,
      averageDuration: 0,
      completionRate: 0,
    };
    return acc;
  }, {} as SessionAnalytics);

function mapSession(row: any): Session {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    status: row.status,
    metadata: row.metadata || {},
    data: row.data || {},
    duration: row.duration || 0,
    startedAt: row.started_at ? new Date(row.started_at) : new Date(),
    endedAt: row.ended_at ? new Date(row.ended_at) : undefined,
  } as Session;
}

export async function saveSession(session: Session): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from('sessions').insert({
    id: session.id,
    user_id: session.userId,
    type: session.type,
    status: session.status,
    metadata: session.metadata ?? {},
    data: session.data ?? {},
    duration: session.duration ?? 0,
    started_at: session.startedAt ?? new Date(),
    ended_at: session.endedAt ?? null,
  });
  if (error) throw error;
}

export async function getSessionById(sessionId: string): Promise<Session | null> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.from('sessions').select('*').eq('id', sessionId).single();
  if (error && error.code !== 'PGRST116') throw error;
  if (!data) return null;
  return mapSession(data);
}

export async function updateSession(session: Session): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from('sessions')
    .update({
      type: session.type,
      status: session.status,
      metadata: session.metadata ?? {},
      data: session.data ?? {},
      duration: session.duration ?? 0,
      started_at: session.startedAt ?? new Date(),
      ended_at: session.endedAt ?? null,
      updated_at: new Date(),
    })
    .eq('id', session.id);
  if (error) throw error;
}

export async function getUserSessions(
  userId: string,
  type?: SessionType,
  limit = 20
): Promise<Session[]> {
  const supabase = createSupabaseServiceClient();
  let query = supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (type) {
    query = query.eq('type', type);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapSession);
}

export async function getActiveSessions(userId: string): Promise<Session[]> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['active', 'paused'])
    .order('started_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapSession);
}

export async function getUserSessionStats(userId: string): Promise<SessionStats> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;

  const sessions = (data || []).map(mapSession);
  const completedSessions = sessions.filter(s => s.status === 'completed');
  const totalDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);

  // streak calculation
  const sortedSessions = completedSessions.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  let streakDays = 0;
  if (sortedSessions.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let currentDate = new Date(sortedSessions[0].startedAt);
    currentDate.setHours(0, 0, 0, 0);
    const dayDiff = Math.floor((today.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
    if (dayDiff <= 1) {
      streakDays = 1;
      for (let i = 1; i < sortedSessions.length; i++) {
        const sessionDate = new Date(sortedSessions[i].startedAt);
        sessionDate.setHours(0, 0, 0, 0);
        const diff = Math.floor((currentDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diff === 1) {
          streakDays++;
          currentDate = sessionDate;
        } else {
          break;
        }
      }
    }
  }

  const lastSession = sessions.length > 0
    ? [...sessions].sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())[0]
    : null;

  return {
    totalSessions: sessions.length,
    completedSessions: completedSessions.length,
    totalDuration,
    averageDuration: sessions.length > 0 ? Math.round(totalDuration / sessions.length) : 0,
    lastSessionDate: lastSession ? lastSession.startedAt : undefined,
    streakDays,
  };
}

export async function getSessionAnalytics(
  userId: string,
  days = 30
): Promise<SessionAnalytics> {
  const supabase = createSupabaseServiceClient();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .gte('started_at', startDate.toISOString());
  if (error) throw error;

  const sessions = (data || []).map(mapSession);
  const analytics: SessionAnalytics = createEmptyAnalytics();

  for (const type of SESSION_TYPES) {
    const typeSessions = sessions.filter(s => s.type === type);
    const completed = typeSessions.filter(s => s.status === 'completed');
    const totalDuration = typeSessions.reduce((sum, s) => sum + (s.duration || 0), 0);

    analytics[type] = {
      count: typeSessions.length,
      totalDuration,
      averageDuration: typeSessions.length > 0 ? Math.round(totalDuration / typeSessions.length) : 0,
      completionRate: typeSessions.length > 0 ? (completed.length / typeSessions.length) * 100 : 0,
    };
  }

  return analytics;
}

export async function deleteSession(sessionId: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from('sessions').delete().eq('id', sessionId);
  if (error) throw error;
}

export async function getSessionsByDateRange(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<Session[]> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .gte('started_at', startDate.toISOString())
    .lte('started_at', endDate.toISOString())
    .order('started_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapSession);
}
