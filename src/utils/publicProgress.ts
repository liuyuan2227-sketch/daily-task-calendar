import type { DayReview, Task } from '../types';
import { supabase } from '../lib/supabase';
import { mapReview, mapTask } from './supabaseData';

export interface PublicUserProgress {
  userId: string;
  name: string;
  totalTasks: number;
  completedTasks: number;
  postponedTasks: number;
  unfinishedTasks: number;
  completionRate: number;
  reviewedDays: number;
}

export async function fetchPublicTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .is('workspace_id', null)
    .order('date', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return ((data ?? []) as Parameters<typeof mapTask>[0][]).map(mapTask);
}

export async function fetchPublicReviews(): Promise<DayReview[]> {
  const { data, error } = await supabase
    .from('day_reviews')
    .select('*')
    .is('workspace_id', null)
    .order('date', { ascending: true });

  if (error) throw error;
  return ((data ?? []) as Parameters<typeof mapReview>[0][]).map(mapReview);
}

export async function fetchPublicUsers(): Promise<Record<string, string>> {
  const { data, error } = await supabase.from('public_profiles').select('id,display_name,email').is('deleted_at', null);
  if (error) throw error;

  return Object.fromEntries(
    ((data ?? []) as { id: string; display_name: string | null; email: string | null }[]).map((profile) => [
      profile.id,
      profile.display_name || profile.email || '未知用户',
    ]),
  );
}

export async function findProfileByName(name: string): Promise<{ id: string; displayName: string } | undefined> {
  const { data, error } = await supabase
    .from('public_profiles')
    .select('id,display_name')
    .eq('display_name', name)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return undefined;
  return { id: data.id as string, displayName: (data.display_name as string | null) ?? name };
}

export function calculatePublicProgress(
  tasks: Task[],
  reviews: DayReview[],
  users: Record<string, string>,
): PublicUserProgress[] {
  const userIds = Array.from(
    new Set([
      ...tasks.map((task) => task.userId).filter((userId): userId is string => Boolean(userId) && Boolean(users[userId as string])),
      ...reviews.map((review) => review.userId).filter((userId): userId is string => Boolean(userId) && Boolean(users[userId as string])),
      ...Object.keys(users),
    ]),
  );

  return userIds
    .map((userId) => {
      const userTasks = tasks.filter((task) => task.userId === userId);
      const totalTasks = userTasks.length;
      const completedTasks = userTasks.filter((task) => task.status === 'completed').length;
      const postponedTasks = userTasks.filter((task) => task.status === 'postponed').length;
      const unfinishedTasks = userTasks.filter((task) => task.status === 'todo' || task.status === 'in_progress').length;
      const reviewedDays = reviews.filter((review) => review.userId === userId && review.content.trim()).length;

      return {
        userId,
        name: users[userId] ?? '未知用户',
        totalTasks,
        completedTasks,
        postponedTasks,
        unfinishedTasks,
        completionRate: totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0,
        reviewedDays,
      };
    })
    .sort((a, b) => b.completionRate - a.completionRate || b.completedTasks - a.completedTasks);
}
