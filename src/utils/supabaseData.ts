import type { CheckinRecord, CheckinTask, DayReview, Task, TaskPriority, TaskStatus, TaskType } from '../types';
import { supabase } from '../lib/supabase';

export interface TaskRow {
  id: string;
  user_id: string;
  workspace_id: string | null;
  title: string;
  description: string | null;
  date: string;
  status: TaskStatus;
  priority: TaskPriority;
  type?: TaskType | null;
  tags: string[];
  postponed_from: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface ReviewRow {
  id: string;
  user_id: string;
  workspace_id: string | null;
  date: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface CheckinTaskRow {
  id: string;
  user_id: string;
  title: string;
  priority: TaskPriority;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface CheckinRecordRow {
  id: string;
  checkin_task_id: string;
  user_id: string;
  date: string;
  completed_at: string;
  created_at: string;
}

export function mapTask(row: TaskRow): Task {
  return {
    id: row.id,
    userId: row.user_id,
    workspaceId: row.workspace_id,
    title: row.title,
    description: row.description,
    date: row.date,
    status: row.status,
    priority: row.priority,
    type: row.type ?? 'daily',
    tags: row.tags ?? [],
    postponedFrom: row.postponed_from ?? undefined,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapReview(row: ReviewRow): DayReview {
  return {
    id: row.id,
    userId: row.user_id,
    workspaceId: row.workspace_id,
    date: row.date,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapCheckinTask(row: CheckinTaskRow): CheckinTask {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    priority: row.priority,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
  };
}

export function mapCheckinRecord(row: CheckinRecordRow): CheckinRecord {
  return {
    id: row.id,
    checkinTaskId: row.checkin_task_id,
    userId: row.user_id,
    date: row.date,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}

export async function fetchTasks(userId?: string): Promise<Task[]> {
  let query = supabase
    .from('tasks')
    .select('*')
    .is('workspace_id', null)
    .neq('type', 'checkin')
    .order('date', { ascending: true })
    .order('created_at', { ascending: true });

  if (userId) query = query.eq('user_id', userId);

  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as TaskRow[]).map(mapTask);
}

export async function createTask(userId: string, input: Pick<Task, 'title' | 'date' | 'priority' | 'status' | 'type'>): Promise<Task> {
  const now = new Date().toISOString();
  const row = {
    user_id: userId,
    workspace_id: null,
    title: input.title,
    date: input.date,
    priority: input.priority,
    type: input.type ?? 'daily',
    status: input.status,
    tags: [],
    updated_at: now,
    completed_at: input.status === 'completed' ? now : null,
  };

  const { data, error } = await supabase.from('tasks').insert(row).select('*').single();

  if (error) {
    if (isMissingTypeColumnError(error)) {
      const { type, ...rowWithoutType } = row;
      const { data: fallbackData, error: fallbackError } = await supabase.from('tasks').insert(rowWithoutType).select('*').single();
      if (fallbackError) throw fallbackError;
      return mapTask({ ...(fallbackData as TaskRow), type });
    }
    throw error;
  }

  return mapTask(data as TaskRow);
}

export async function updateTaskRow(id: string, patch: Partial<Task>): Promise<void> {
  const now = new Date().toISOString();
  const rowPatch: Record<string, unknown> = { updated_at: now };

  if (patch.title !== undefined) rowPatch.title = patch.title;
  if (patch.date !== undefined) rowPatch.date = patch.date;
  if (patch.priority !== undefined) rowPatch.priority = patch.priority;
  if (patch.type !== undefined) rowPatch.type = patch.type;
  if (patch.status !== undefined) {
    rowPatch.status = patch.status;
    rowPatch.completed_at = patch.status === 'completed' ? now : null;
  }
  if (patch.postponedFrom !== undefined) rowPatch.postponed_from = patch.postponedFrom;

  const { error } = await supabase.from('tasks').update(rowPatch).eq('id', id).is('workspace_id', null);
  if (error) {
    if (patch.type !== undefined && isMissingTypeColumnError(error)) return;
    throw error;
  }
}

export async function deleteTaskRow(id: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', id).is('workspace_id', null);
  if (error) throw error;
}

export async function postponeTaskRow(targetUserId: string, sourceTask: Task): Promise<void> {
  const now = new Date().toISOString();
  const tomorrow = getTomorrow(sourceTask.date);

  await updateTaskRow(sourceTask.id, { status: 'postponed' });

  const { data: existing, error: existingError } = await supabase
    .from('tasks')
    .select('id')
    .eq('user_id', targetUserId)
    .is('workspace_id', null)
    .eq('date', tomorrow)
    .eq('title', sourceTask.title)
    .eq('postponed_from', sourceTask.date)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return;

  const insertRow = {
    user_id: targetUserId,
    workspace_id: null,
    title: sourceTask.title,
    description: sourceTask.description ?? null,
    date: tomorrow,
    status: 'todo',
    priority: sourceTask.priority,
    type: sourceTask.type ?? 'daily',
    tags: sourceTask.tags ?? [],
    postponed_from: sourceTask.date,
    updated_at: now,
  };

  const { error } = await supabase.from('tasks').insert(insertRow);

  if (error) {
    if (isMissingTypeColumnError(error)) {
      const { type, ...rowWithoutType } = insertRow;
      const { error: fallbackError } = await supabase.from('tasks').insert(rowWithoutType);
      if (fallbackError) throw fallbackError;
      return;
    }
    throw error;
  }
}

export async function fetchCheckinTasks(userId?: string): Promise<CheckinTask[]> {
  let query = supabase
    .from('checkin_tasks')
    .select('*')
    .is('archived_at', null)
    .order('created_at', { ascending: true });

  if (userId) query = query.eq('user_id', userId);

  const { data, error } = await query;
  if (error) {
    if (isMissingCheckinTableError(error)) return [];
    throw error;
  }
  return ((data ?? []) as CheckinTaskRow[]).map(mapCheckinTask);
}

export async function fetchCheckinRecords(userId?: string): Promise<CheckinRecord[]> {
  let query = supabase.from('checkin_records').select('*').order('date', { ascending: true });

  if (userId) query = query.eq('user_id', userId);

  const { data, error } = await query;
  if (error) {
    if (isMissingCheckinTableError(error)) return [];
    throw error;
  }
  return ((data ?? []) as CheckinRecordRow[]).map(mapCheckinRecord);
}

export async function createCheckinTask(userId: string, title: string, priority: TaskPriority): Promise<CheckinTask> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('checkin_tasks')
    .insert({ user_id: userId, title, priority, updated_at: now })
    .select('*')
    .single();

  if (error) throw error;
  return mapCheckinTask(data as CheckinTaskRow);
}

export async function updateCheckinTaskRow(id: string, patch: Partial<Pick<CheckinTask, 'title' | 'priority'>>): Promise<void> {
  const rowPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) rowPatch.title = patch.title;
  if (patch.priority !== undefined) rowPatch.priority = patch.priority;

  const { error } = await supabase.from('checkin_tasks').update(rowPatch).eq('id', id);
  if (error) throw error;
}

export async function deleteCheckinTaskRow(id: string): Promise<void> {
  const { error } = await supabase.from('checkin_tasks').update({ archived_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function setCheckinRecord(userId: string, checkinTaskId: string, date: string, checked: boolean): Promise<CheckinRecord | undefined> {
  if (!checked) {
    const { error } = await supabase.from('checkin_records').delete().eq('checkin_task_id', checkinTaskId).eq('date', date);
    if (error) throw error;
    return undefined;
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('checkin_records')
    .upsert(
      {
        checkin_task_id: checkinTaskId,
        user_id: userId,
        date,
        completed_at: now,
      },
      { onConflict: 'checkin_task_id,date' },
    )
    .select('*')
    .single();
  if (error) throw error;
  return mapCheckinRecord(data as CheckinRecordRow);
}

export async function fetchReviews(userId?: string): Promise<DayReview[]> {
  let query = supabase
    .from('day_reviews')
    .select('*')
    .is('workspace_id', null)
    .order('date', { ascending: true });

  if (userId) query = query.eq('user_id', userId);

  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as ReviewRow[]).map(mapReview);
}

export async function upsertReview(userId: string, date: string, content: string): Promise<DayReview> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('day_reviews')
    .upsert(
      {
        user_id: userId,
        workspace_id: null,
        date,
        content,
        updated_at: now,
      },
      { onConflict: 'user_id,workspace_id,date' },
    )
    .select('*')
    .single();

  if (error) throw error;
  return mapReview(data as ReviewRow);
}

export async function importLocalData(userId: string, tasks: Task[], reviews: DayReview[]): Promise<void> {
  const taskRows = tasks.map((task) => ({
    user_id: userId,
    workspace_id: null,
    title: task.title,
    description: task.description ?? null,
    date: task.date,
    status: task.status,
    priority: task.priority,
    type: task.type ?? 'daily',
    tags: task.tags ?? [],
    postponed_from: task.postponedFrom ?? null,
    completed_at: task.status === 'completed' ? (task.completedAt ?? task.updatedAt ?? new Date().toISOString()) : null,
  }));

  const reviewRows = reviews.map((review) => ({
    user_id: userId,
    workspace_id: null,
    date: review.date,
    content: review.content,
  }));

  if (taskRows.length > 0) {
    const { error } = await supabase.from('tasks').insert(taskRows);
    if (error) throw error;
  }

  if (reviewRows.length > 0) {
    const { error } = await supabase.from('day_reviews').upsert(reviewRows, { onConflict: 'user_id,workspace_id,date' });
    if (error) throw error;
  }
}

export async function deleteBoard(userId: string): Promise<void> {
  const now = new Date().toISOString();
  const { error: profileError } = await supabase.from('public_profiles').update({ deleted_at: now, updated_at: now }).eq('id', userId);
  if (profileError) throw profileError;
}

function isMissingTypeColumnError(error: { code?: string; message?: string }): boolean {
  return error.code === 'PGRST204' || Boolean(error.message?.includes("'type' column") || error.message?.includes('type column'));
}

function isMissingCheckinTableError(error: { code?: string; message?: string }): boolean {
  return error.code === '42P01' || error.code === 'PGRST205' || Boolean(error.message?.includes('checkin_tasks') || error.message?.includes('checkin_records'));
}

function getTomorrow(dateString: string): string {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
