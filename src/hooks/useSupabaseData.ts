import { useEffect, useState } from 'react';
import type { CheckinRecord, CheckinTask, DayReview, Task, TaskPriority, TaskType } from '../types';
import { supabase } from '../lib/supabase';
import {
  createCheckinTask,
  createTask,
  deleteCheckinTaskRow,
  deleteTaskRow,
  fetchCheckinRecords,
  fetchCheckinTasks,
  fetchReviews,
  fetchTasks,
  mapCheckinRecord,
  mapCheckinTask,
  mapReview,
  mapTask,
  postponeTaskRow,
  setCheckinRecord,
  updateCheckinTaskRow,
  updateTaskRow,
  upsertReview,
} from '../utils/supabaseData';

export function useSupabaseData(boardUserId: string | undefined) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reviews, setReviews] = useState<DayReview[]>([]);
  const [checkinTasks, setCheckinTasks] = useState<CheckinTask[]>([]);
  const [checkinRecords, setCheckinRecords] = useState<CheckinRecord[]>([]);
  const [loading, setLoading] = useState(true);

  async function reload() {
    if (!boardUserId) return;
    setLoading(true);
    try {
      const [nextTasks, nextReviews, nextCheckinTasks, nextCheckinRecords] = await Promise.all([
        fetchTasks(boardUserId),
        fetchReviews(boardUserId),
        fetchCheckinTasks(boardUserId),
        fetchCheckinRecords(boardUserId),
      ]);
      setTasks(nextTasks);
      setReviews(nextReviews);
      setCheckinTasks(nextCheckinTasks);
      setCheckinRecords(nextCheckinRecords);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!boardUserId) {
      setTasks([]);
      setReviews([]);
      setCheckinTasks([]);
      setCheckinRecords([]);
      setLoading(false);
      return;
    }

    void reload();

    const channel = supabase
      .channel(`board-data:${boardUserId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${boardUserId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setTasks((current) => current.filter((task) => task.id !== (payload.old as { id: string }).id));
            return;
          }

          const nextTask = mapTask(payload.new as Parameters<typeof mapTask>[0]);
          if (nextTask.workspaceId || nextTask.type === 'checkin') return;
          setTasks((current) => {
            const exists = current.some((task) => task.id === nextTask.id);
            return exists
              ? current.map((task) => (task.id === nextTask.id ? nextTask : task))
              : [...current, nextTask];
          });
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'day_reviews', filter: `user_id=eq.${boardUserId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setReviews((current) => current.filter((review) => review.id !== (payload.old as { id: string }).id));
            return;
          }

          const nextReview = mapReview(payload.new as Parameters<typeof mapReview>[0]);
          if (nextReview.workspaceId) return;
          setReviews((current) => {
            const exists = current.some((review) => review.id === nextReview.id || review.date === nextReview.date);
            return exists
              ? current.map((review) => (review.id === nextReview.id || review.date === nextReview.date ? nextReview : review))
              : [...current, nextReview];
          });
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'checkin_tasks', filter: `user_id=eq.${boardUserId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setCheckinTasks((current) => current.filter((task) => task.id !== (payload.old as { id: string }).id));
            return;
          }

          const nextTask = mapCheckinTask(payload.new as Parameters<typeof mapCheckinTask>[0]);
          setCheckinTasks((current) => {
            if (nextTask.archivedAt) return current.filter((task) => task.id !== nextTask.id);
            const exists = current.some((task) => task.id === nextTask.id);
            return exists
              ? current.map((task) => (task.id === nextTask.id ? nextTask : task))
              : [...current, nextTask];
          });
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'checkin_records', filter: `user_id=eq.${boardUserId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setCheckinRecords((current) => current.filter((record) => record.id !== (payload.old as { id: string }).id));
            return;
          }

          const nextRecord = mapCheckinRecord(payload.new as Parameters<typeof mapCheckinRecord>[0]);
          setCheckinRecords((current) => {
            const exists = current.some((record) => record.id === nextRecord.id || (record.checkinTaskId === nextRecord.checkinTaskId && record.date === nextRecord.date));
            return exists
              ? current.map((record) => (record.id === nextRecord.id || (record.checkinTaskId === nextRecord.checkinTaskId && record.date === nextRecord.date) ? nextRecord : record))
              : [...current, nextRecord];
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [boardUserId]);

  async function addTask(title: string, date: string, priority: TaskPriority, type: TaskType) {
    if (!boardUserId) return;
    if (type === 'checkin') {
      await createCheckinTask(boardUserId, title, priority);
      return;
    }
    await createTask(boardUserId, { title, date, priority, type: 'daily', status: 'todo' });
  }

  async function updateTask(id: string, patch: Partial<Task>) {
    await updateTaskRow(id, patch);
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, ...patch, updatedAt: new Date().toISOString() } : task)));
  }

  async function deleteTask(id: string) {
    await deleteTaskRow(id);
    setTasks((current) => current.filter((task) => task.id !== id));
  }

  async function postponeTask(task: Task) {
    if (!boardUserId) return;
    await postponeTaskRow(boardUserId, task);
    await reload();
  }

  async function updateReview(date: string, content: string) {
    if (!boardUserId) return;
    const nextReview = await upsertReview(boardUserId, date, content);
    setReviews((current) => {
      const exists = current.some((review) => review.id === nextReview.id || review.date === nextReview.date);
      return exists
        ? current.map((review) => (review.id === nextReview.id || review.date === nextReview.date ? nextReview : review))
        : [...current, nextReview];
    });
  }

  async function updateCheckinTask(id: string, patch: Partial<Pick<CheckinTask, 'title' | 'priority'>>) {
    await updateCheckinTaskRow(id, patch);
    setCheckinTasks((current) => current.map((task) => (task.id === id ? { ...task, ...patch, updatedAt: new Date().toISOString() } : task)));
  }

  async function deleteCheckinTask(id: string) {
    await deleteCheckinTaskRow(id);
    setCheckinTasks((current) => current.filter((task) => task.id !== id));
    setCheckinRecords((current) => current.filter((record) => record.checkinTaskId !== id));
  }

  async function toggleCheckin(checkinTaskId: string, date: string, checked: boolean) {
    if (!boardUserId) return;
    const nextRecord = await setCheckinRecord(boardUserId, checkinTaskId, date, checked);
    setCheckinRecords((current) => {
      const rest = current.filter((record) => !(record.checkinTaskId === checkinTaskId && record.date === date));
      return nextRecord ? [...rest, nextRecord] : rest;
    });
  }

  return {
    tasks,
    reviews,
    checkinTasks,
    checkinRecords,
    loading,
    reload,
    addTask,
    updateTask,
    deleteTask,
    postponeTask,
    updateReview,
    updateCheckinTask,
    deleteCheckinTask,
    toggleCheckin,
  };
}
