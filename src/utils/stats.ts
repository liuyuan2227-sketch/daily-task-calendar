import type { DayReview, Task } from '../types';

export interface TaskStats {
  totalTasks: number;
  completedTasks: number;
  postponedTasks: number;
  completionRate: number;
}

export interface MonthStats extends TaskStats {
  reviewedDays: number;
}

export interface WeekStats extends TaskStats {
  startDate: string;
  endDate: string;
}

function calculateTaskStats(tasks: Task[]): TaskStats {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task) => task.status === 'completed').length;
  const postponedTasks = tasks.filter((task) => task.status === 'postponed').length;

  return {
    totalTasks,
    completedTasks,
    postponedTasks,
    completionRate: totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0,
  };
}

export function calculateMonthStats(tasks: Task[], reviews: DayReview[], monthDate: Date): MonthStats {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const monthTasks = tasks.filter((task) => {
    const date = new Date(`${task.date}T00:00:00`);
    return date.getFullYear() === year && date.getMonth() === month;
  });
  const reviewedDays = reviews.filter((review) => {
    const date = new Date(`${review.date}T00:00:00`);
    return date.getFullYear() === year && date.getMonth() === month && review.content.trim();
  }).length;

  return {
    ...calculateTaskStats(monthTasks),
    reviewedDays,
  };
}

export function calculateWeekStats(tasks: Task[], selectedDate: string): WeekStats {
  const date = new Date(`${selectedDate}T00:00:00`);
  const day = (date.getDay() + 6) % 7;
  const start = new Date(date);
  start.setDate(date.getDate() - day);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const startDate = formatDate(start);
  const endDate = formatDate(end);
  const weekTasks = tasks.filter((task) => task.date >= startDate && task.date <= endDate);

  return {
    ...calculateTaskStats(weekTasks),
    startDate,
    endDate,
  };
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
