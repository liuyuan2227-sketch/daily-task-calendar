import type { AppData } from '../types';

export const STORAGE_KEY = 'daily-task-closure-calendar:data';
const CURRENT_VERSION = 1;

const emptyData: AppData = {
  version: CURRENT_VERSION,
  tasks: [],
  reviews: [],
};

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData;

    const parsed = JSON.parse(raw) as Partial<AppData>;
    return {
      version: CURRENT_VERSION,
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      reviews: Array.isArray(parsed.reviews) ? parsed.reviews : [],
    };
  } catch {
    return emptyData;
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...data,
      version: CURRENT_VERSION,
    }),
  );
}

export function hasLocalData(): boolean {
  const data = loadData();
  return data.tasks.length > 0 || data.reviews.length > 0;
}

export function getMigrationKey(userId: string): string {
  return `daily-task-closure-calendar:migrated:${userId}`;
}
