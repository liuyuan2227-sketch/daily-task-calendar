import type { CheckinRecord, CheckinTask, Task } from '../types';
import { formatDate, getDayNumber, getMonthDays, isSameMonth } from '../utils/date';

interface CalendarProps {
  monthDate: Date;
  selectedDate: string;
  today: string;
  tasks: Task[];
  checkinTasks: CheckinTask[];
  checkinRecords: CheckinRecord[];
  onSelectDate: (date: string) => void;
}

function getRate(tasks: Task[]) {
  if (tasks.length === 0) return 0;
  return Math.round((tasks.filter((task) => task.status === 'completed').length / tasks.length) * 100);
}

function getRateClass(rate: number, total: number) {
  if (total === 0) return 'bg-slate-200';
  if (rate === 100) return 'bg-emerald-500';
  if (rate >= 60) return 'bg-sky-500';
  if (rate > 0) return 'bg-amber-500';
  return 'bg-rose-400';
}

function getToneClass(rate: number, total: number, hasPostponed: boolean) {
  if (hasPostponed) return 'text-amber-700 bg-amber-50 border-amber-100';
  if (total === 0) return 'text-slate-400 bg-slate-50 border-slate-100';
  if (rate === 100) return 'text-emerald-700 bg-emerald-50 border-emerald-100';
  if (rate >= 60) return 'text-sky-700 bg-sky-50 border-sky-100';
  return 'text-rose-700 bg-rose-50 border-rose-100';
}

const statusLabels: Record<Task['status'], string> = {
  todo: '待开始',
  in_progress: '进行中',
  completed: '已完成',
  postponed: '已延期',
};

const statusDots: Record<Task['status'], string> = {
  todo: 'bg-slate-400',
  in_progress: 'bg-sky-500',
  completed: 'bg-emerald-500',
  postponed: 'bg-amber-500',
};

export default function Calendar({ monthDate, selectedDate, today, tasks, checkinTasks, checkinRecords, onSelectDate }: CalendarProps) {
  const days = getMonthDays(monthDate);
  const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const selectedDayTasks = tasks.filter((task) => task.date === selectedDate);
  const selectedCompleted = selectedDayTasks.filter((task) => task.status === 'completed').length;
  const selectedPostponed = selectedDayTasks.filter((task) => task.status === 'postponed').length;
  const selectedRate = getRate(selectedDayTasks);

  return (
    <section className="rounded-[2rem] border border-white/70 bg-white/90 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur md:p-6">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-400">Calendar</p>
          <h2 className="text-xl font-black text-slate-900">月度任务概览</h2>
        </div>
        <div className="hidden items-center gap-3 text-xs text-slate-500 sm:flex">
          <span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-emerald-500" />完成</span>
          <span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-sky-500" />推进中</span>
          <span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-amber-500" />延期</span>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-bold text-slate-400 md:gap-2 md:text-sm">
        {weekdays.map((weekday) => (
          <div key={weekday} className="py-2">
            {weekday}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1.5 md:gap-2">
        {days.map((day) => {
          const date = formatDate(day);
          const dayTasks = tasks.filter((task) => task.date === date);
          const completed = dayTasks.filter((task) => task.status === 'completed').length;
          const postponed = dayTasks.filter((task) => task.status === 'postponed').length;
          const checkedCheckinIds = new Set(checkinRecords.filter((record) => record.date === date).map((record) => record.checkinTaskId));
          const checkedCheckins = checkinTasks.filter((task) => checkedCheckinIds.has(task.id)).length;
          const rate = getRate(dayTasks);
          const isToday = date === today;
          const isSelected = date === selectedDate;
          const inMonth = isSameMonth(day, monthDate);
          const toneClass = getToneClass(rate, dayTasks.length, postponed > 0);

          return (
            <div key={date} className="group relative">
              <button
                type="button"
                onClick={() => onSelectDate(date)}
                className={`relative min-h-24 w-full rounded-2xl border p-2 text-left transition hover:-translate-y-0.5 hover:shadow-lg md:min-h-32 md:p-3 ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 shadow-[0_12px_35px_rgba(37,99,235,0.18)] ring-2 ring-blue-100'
                    : `hover:border-slate-300 ${toneClass}`
                } ${inMonth ? 'opacity-100' : 'opacity-35'}`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-black md:text-base ${
                      isToday ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'text-slate-800'
                    }`}
                  >
                    {getDayNumber(date)}
                  </span>
                  {isToday && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black text-blue-700">今天</span>}
                </div>

                <div className="mt-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-500">
                    <span>{dayTasks.length ? '任务' : '空闲'}</span>
                    <span className="font-bold text-slate-700">{completed}/{dayTasks.length}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/80 ring-1 ring-slate-100">
                    <div
                      className={`h-1.5 rounded-full ${getRateClass(rate, dayTasks.length)}`}
                      style={{ width: `${dayTasks.length ? rate : 100}%` }}
                    />
                  </div>
                  <div className="flex min-h-5 items-center justify-between">
                    <span className="font-black text-slate-700">{dayTasks.length ? `${rate}%` : '无任务'}</span>
                    {postponed > 0 && <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-black text-amber-700">延期 {postponed}</span>}
                  </div>
                </div>
              </button>

              <div className="pointer-events-none absolute left-1/2 top-full z-40 mt-2 hidden w-64 -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-2xl shadow-slate-300/60 group-hover:block group-focus-within:block">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-black text-blue-500">{date}</p>
                    <h3 className="text-sm font-black text-slate-950">当天任务情况</h3>
                  </div>
                  <span className="rounded-full bg-slate-950 px-2 py-0.5 text-[11px] font-black text-white">{rate}%</span>
                </div>
                <div className="mb-2 grid grid-cols-4 gap-1 text-center text-[11px]">
                  <div className="rounded-lg bg-slate-50 px-2 py-1">
                    <p className="font-bold text-slate-400">任务</p>
                    <p className="font-black text-slate-900">{dayTasks.length}</p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 px-2 py-1">
                    <p className="font-bold text-emerald-500">完成</p>
                    <p className="font-black text-emerald-700">{completed}</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 px-2 py-1">
                    <p className="font-bold text-amber-500">延期</p>
                    <p className="font-black text-amber-700">{postponed}</p>
                  </div>
                  <div className="rounded-lg bg-violet-50 px-2 py-1">
                    <p className="font-bold text-violet-500">打卡</p>
                    <p className="font-black text-violet-700">{checkedCheckins}/{checkinTasks.length}</p>
                  </div>
                </div>
                <div className="max-h-48 space-y-1.5 overflow-auto">
                  {dayTasks.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-center text-xs font-bold text-slate-400">
                      当天暂无普通任务
                    </div>
                  ) : (
                    dayTasks.map((task) => (
                      <div key={task.id} className="rounded-xl border border-slate-100 bg-slate-50 px-2 py-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`h-2 w-2 shrink-0 rounded-full ${statusDots[task.status]}`} />
                          <span className={`min-w-0 flex-1 truncate text-xs font-black ${task.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                            {task.title}
                          </span>
                          <span className="shrink-0 text-[10px] font-bold text-slate-400">{statusLabels[task.status]}</span>
                        </div>
                      </div>
                    ))
                  )}

                  <div className="pt-1">
                    <p className="mb-1 text-[11px] font-black text-violet-500">每日打卡</p>
                    {checkinTasks.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-violet-100 bg-violet-50 p-2 text-center text-xs font-bold text-violet-400">
                        暂无打卡任务
                      </div>
                    ) : (
                      checkinTasks.map((task) => {
                        const checked = checkedCheckinIds.has(task.id);
                        return (
                          <div key={task.id} className="rounded-xl border border-violet-100 bg-violet-50 px-2 py-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${checked ? 'bg-violet-500 text-white' : 'bg-white text-violet-300 ring-1 ring-violet-200'}`}>
                                {checked ? '✓' : ''}
                              </span>
                              <span className={`min-w-0 flex-1 truncate text-xs font-black ${checked ? 'text-violet-700' : 'text-slate-600'}`}>{task.title}</span>
                              <span className="shrink-0 text-[10px] font-bold text-violet-400">{checked ? '已打卡' : '未打卡'}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <section className="mt-5 rounded-3xl border border-blue-100 bg-blue-50/80 p-4 shadow-inner shadow-blue-50">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black text-blue-500">当前选中日期</p>
            <h3 className="mt-0.5 text-lg font-black text-slate-950">{selectedDate} 任务安排</h3>
          </div>
          <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">{selectedRate}%</span>
        </div>

        <div className="mb-3 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-2xl bg-white p-3">
            <p className="font-bold text-slate-400">任务</p>
            <p className="mt-1 text-xl font-black text-slate-900">{selectedDayTasks.length}</p>
          </div>
          <div className="rounded-2xl bg-white p-3">
            <p className="font-bold text-emerald-500">完成</p>
            <p className="mt-1 text-xl font-black text-emerald-700">{selectedCompleted}</p>
          </div>
          <div className="rounded-2xl bg-white p-3">
            <p className="font-bold text-amber-500">延期</p>
            <p className="mt-1 text-xl font-black text-amber-700">{selectedPostponed}</p>
          </div>
        </div>

        <div className="max-h-56 space-y-2 overflow-auto pr-1">
          {selectedDayTasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-blue-200 bg-white/70 p-5 text-center text-sm font-bold text-blue-500">
              当天暂无任务安排
            </div>
          ) : (
            selectedDayTasks.map((task) => (
              <div key={task.id} className="rounded-2xl border border-blue-100 bg-white px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusDots[task.status]}`} />
                  <span className={`min-w-0 flex-1 truncate text-sm font-black ${task.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                    {task.title}
                  </span>
                  <span className="shrink-0 text-xs font-bold text-slate-400">{statusLabels[task.status]}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </section>
  );
}
