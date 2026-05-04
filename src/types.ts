export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'postponed';

export type TaskPriority = 'high' | 'medium' | 'low';

export type TaskType = 'daily' | 'checkin';

export interface Task {
  id: string;
  userId?: string;
  workspaceId?: string | null;
  title: string;
  description?: string | null;
  date: string;
  status: TaskStatus;
  priority: TaskPriority;
  type?: TaskType;
  tags?: string[];
  postponedFrom?: string;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DayReview {
  id?: string;
  userId?: string;
  workspaceId?: string | null;
  date: string;
  content: string;
  createdAt?: string;
  updatedAt: string;
}

export interface CheckinTask {
  id: string;
  userId?: string;
  title: string;
  priority: TaskPriority;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
}

export interface CheckinRecord {
  id: string;
  checkinTaskId: string;
  userId?: string;
  date: string;
  completedAt: string;
  createdAt: string;
}

export interface AppData {
  version: number;
  tasks: Task[];
  reviews: DayReview[];
}

export interface CalendarDayStats {
  date: string;
  totalTasks: number;
  completedTasks: number;
  postponedTasks: number;
  completionRate: number;
}
