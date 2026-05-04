import type { CheckinRecord, CheckinTask, DayReview, Task, TaskPriority, TaskStatus, TaskType } from '../types';
import TaskForm from './TaskForm';
import ReviewBox from './ReviewBox';
import { calculateWeekStats } from '../utils/stats';

interface TaskPanelProps {
  selectedDate: string;
  today: string;
  tasks: Task[];
  allTasks: Task[];
  checkinTasks: CheckinTask[];
  checkinRecords: CheckinRecord[];
  review?: DayReview;
  onAddTask: (title: string, priority: TaskPriority, type: TaskType) => void;
  onUpdateTask: (id: string, patch: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
  onPostponeTask: (id: string) => void;
  onUpdateReview: (content: string) => void;
  onUpdateCheckinTask: (id: string, patch: Partial<Pick<CheckinTask, 'title' | 'priority'>>) => void;
  onDeleteCheckinTask: (id: string) => void;
  onToggleCheckin: (id: string, checked: boolean) => void;
}

const priorityLabels: Record<TaskPriority, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

const priorityClasses: Record<TaskPriority, string> = {
  high: 'bg-rose-100 text-rose-700 ring-rose-200',
  medium: 'bg-amber-100 text-amber-700 ring-amber-200',
  low: 'bg-slate-100 text-slate-600 ring-slate-200',
};

const statusLabels: Record<TaskStatus, string> = {
  todo: '待开始',
  in_progress: '进行中',
  completed: '已完成',
  postponed: '已延期',
};

const statusClasses: Record<TaskStatus, string> = {
  todo: 'bg-slate-100 text-slate-600 ring-slate-200',
  in_progress: 'bg-sky-100 text-sky-700 ring-sky-200',
  completed: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  postponed: 'bg-amber-100 text-amber-700 ring-amber-200',
};

const typeLabels: Record<TaskType, string> = {
  daily: '每日',
  checkin: '打卡',
};

const typeClasses: Record<TaskType, string> = {
  daily: 'bg-blue-100 text-blue-700 ring-blue-200',
  checkin: 'bg-violet-100 text-violet-700 ring-violet-200',
};

export default function TaskPanel({
  selectedDate,
  today,
  tasks,
  allTasks,
  checkinTasks,
  checkinRecords,
  review,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onPostponeTask,
  onUpdateReview,
  onUpdateCheckinTask,
  onDeleteCheckinTask,
  onToggleCheckin,
}: TaskPanelProps) {
  const completed = tasks.filter((task) => task.status === 'completed').length;
  const postponed = tasks.filter((task) => task.status === 'postponed').length;
  const rate = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const unfinishedTasks = tasks.filter((task) => task.status === 'todo' || task.status === 'in_progress');
  const unfinished = unfinishedTasks.length;
  const isClosed = tasks.length > 0 && unfinished === 0;
  const hasReview = Boolean(review?.content.trim());
  const isToday = selectedDate === today;
  const weekStats = calculateWeekStats(allTasks, selectedDate);
  const selectedCheckinIds = new Set(checkinRecords.filter((record) => record.date === selectedDate).map((record) => record.checkinTaskId));
  const checkedCount = checkinTasks.filter((task) => selectedCheckinIds.has(task.id)).length;

  return (
    <aside className="space-y-1.5 rounded-2xl border border-white/70 bg-white/95 p-2 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur lg:sticky lg:top-2 lg:max-h-[calc(100vh-1rem)] lg:overflow-auto">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold text-slate-400">{isToday ? '今日工作台' : '日期工作台'}</p>
          <h2 className="text-sm font-black text-slate-900">{selectedDate}</h2>
        </div>
        {isClosed ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-black text-emerald-700">闭环完成</span>
        ) : tasks.length === 0 ? (
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-black text-blue-700">待计划</span>
        ) : (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-black text-amber-700">剩余 {unfinished}</span>
        )}
      </div>

      <section className="overflow-hidden rounded-xl bg-slate-950 px-2.5 py-1.5 text-white shadow-md shadow-slate-200">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold text-slate-300">当天完成率</p>
            <p className="text-2xl font-black tracking-tight leading-none">{rate}%</p>
          </div>
          <div className="grid grid-cols-4 gap-1 text-center text-[10px]">
            <div className="rounded-md bg-white/10 px-1.5 py-0.5">
              <p className="text-slate-300">完成</p>
              <p className="text-xs font-black">{completed}</p>
            </div>
            <div className="rounded-md bg-white/10 px-1.5 py-0.5">
              <p className="text-slate-300">总数</p>
              <p className="text-xs font-black">{tasks.length}</p>
            </div>
            <div className="rounded-md bg-white/10 px-1.5 py-0.5">
              <p className="text-slate-300">未完</p>
              <p className="text-xs font-black">{unfinished}</p>
            </div>
            <div className="rounded-md bg-white/10 px-1.5 py-0.5">
              <p className="text-slate-300">延期</p>
              <p className="text-xs font-black">{postponed}</p>
            </div>
          </div>
        </div>
        <div className="mt-1 h-1 rounded-full bg-white/15">
          <div className="h-1 rounded-full bg-gradient-to-r from-blue-400 to-emerald-400" style={{ width: `${rate}%` }} />
        </div>
        <p className="mt-0.5 truncate text-[10px] text-slate-300">
          {tasks.length === 0
            ? '今天还没有计划，先添加一个任务。'
            : isClosed
              ? hasReview
                ? '今日闭环完成，且已经填写复盘。'
                : '任务已闭环，建议补充今日复盘。'
              : `还有 ${unfinished} 个任务需要完成或延期。`}
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-slate-50/80 px-2 py-1.5">
        <div className="mb-1 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-[11px] font-black text-slate-900">本周统计</h3>
            <p className="text-[10px] text-slate-500">{weekStats.startDate} 至 {weekStats.endDate}</p>
          </div>
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-black text-blue-700">{weekStats.completionRate}%</span>
        </div>
        <div className="grid grid-cols-3 gap-1 text-center">
          <div className="rounded-md bg-white px-1.5 py-0.5">
            <p className="text-[10px] font-bold text-slate-400">任务数</p>
            <p className="text-sm font-black text-slate-900 leading-tight">{weekStats.totalTasks}</p>
          </div>
          <div className="rounded-md bg-white px-1.5 py-0.5">
            <p className="text-[10px] font-bold text-slate-400">完成数</p>
            <p className="text-sm font-black text-emerald-700 leading-tight">{weekStats.completedTasks}</p>
          </div>
          <div className="rounded-md bg-white px-1.5 py-0.5">
            <p className="text-[10px] font-bold text-slate-400">延期数</p>
            <p className="text-sm font-black text-amber-700 leading-tight">{weekStats.postponedTasks}</p>
          </div>
        </div>
        <div className="mt-1 h-1 rounded-full bg-white">
          <div className="h-1 rounded-full bg-blue-500" style={{ width: `${weekStats.completionRate}%` }} />
        </div>
      </section>

      {unfinished > 0 && (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-black text-amber-900">未完成任务</h3>
              <p className="mt-1 text-sm text-amber-700">处理完这些任务后，今天才能形成闭环。</p>
            </div>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">{unfinished} 个</span>
          </div>
          <div className="mt-3 space-y-2">
            {unfinishedTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between gap-2 rounded-2xl bg-white px-3 py-2 text-sm">
                <span className="min-w-0 truncate font-bold text-slate-800">{task.title}</span>
                <button
                  type="button"
                  onClick={() => onPostponeTask(task.id)}
                  className="shrink-0 rounded-xl bg-amber-100 px-3 py-1.5 text-xs font-black text-amber-700 hover:bg-amber-200"
                >
                  延期明天
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <TaskForm onAdd={onAddTask} />

      <section className="rounded-xl border border-violet-200 bg-violet-50/70 p-2">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-black text-violet-950">今日打卡</h3>
            <p className="text-[10px] text-violet-700">长期事项，只记录每天是否完成。</p>
          </div>
          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-black text-violet-700">{checkedCount}/{checkinTasks.length}</span>
        </div>

        <div className="space-y-1.5">
          {checkinTasks.length === 0 && (
            <div className="rounded-xl border border-dashed border-violet-300 bg-white/70 p-2 text-center text-xs text-violet-700">
              选择“打卡任务”添加背单词、运动这类长期事项。
            </div>
          )}

          {checkinTasks.map((task) => {
            const checked = selectedCheckinIds.has(task.id);
            return (
              <div key={task.id} className={`rounded-lg border p-1.5 ${checked ? 'border-violet-300 bg-white' : 'border-violet-100 bg-white/80'}`}>
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => onToggleCheckin(task.id, !checked)}
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs transition ${
                      checked ? 'border-violet-500 bg-violet-500 text-white' : 'border-violet-300 bg-white hover:border-violet-500'
                    }`}
                    aria-label="切换打卡状态"
                  >
                    {checked ? '✓' : ''}
                  </button>
                  <div className="min-w-0 flex-1">
                    <input
                      value={task.title}
                      onChange={(event) => onUpdateCheckinTask(task.id, { title: event.target.value })}
                      className="w-full rounded-md border border-transparent bg-transparent px-1.5 py-0 text-xs font-bold text-slate-900 outline-none transition focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100"
                    />
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ring-1 ${typeClasses.checkin}`}>打卡</span>
                      <select
                        value={task.priority}
                        onChange={(event) => onUpdateCheckinTask(task.id, { priority: event.target.value as TaskPriority })}
                        className={`rounded-full px-2 py-0.5 text-[11px] font-black outline-none ring-1 ${priorityClasses[task.priority]}`}
                      >
                        <option value="high">{priorityLabels.high}</option>
                        <option value="medium">{priorityLabels.medium}</option>
                        <option value="low">{priorityLabels.low}</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="mt-1 flex justify-end gap-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => onToggleCheckin(task.id, !checked)}
                    className={`rounded-md px-2 py-1 font-bold ${checked ? 'bg-violet-100 text-violet-700 hover:bg-violet-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
                  >
                    {checked ? '取消打卡' : '今日已打卡'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteCheckinTask(task.id)}
                    className="rounded-md bg-slate-100 px-2 py-1 font-bold text-slate-600 hover:bg-rose-100 hover:text-rose-700"
                  >
                    删除
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-black text-slate-900">任务列表</h3>
          <span className="text-xs font-semibold text-slate-400">点击标题可直接编辑</span>
        </div>

        <div className="space-y-3">
          {tasks.length === 0 && (
            <div className="rounded-3xl border border-dashed border-blue-300 bg-blue-50/70 p-8 text-center text-sm text-blue-700">
              <p className="font-black">今天还没有任务计划</p>
              <p className="mt-1">在上方快速添加任务，开始今天的闭环。</p>
            </div>
          )}

          {tasks.map((task) => (
            <div
              key={task.id}
              className={`rounded-3xl border p-4 transition ${
                task.status === 'completed'
                  ? 'border-emerald-100 bg-emerald-50/70'
                  : task.status === 'postponed'
                    ? 'border-amber-100 bg-amber-50/70'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => onUpdateTask(task.id, { status: task.status === 'completed' ? 'todo' : 'completed' })}
                  disabled={task.status === 'postponed'}
                  className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition ${
                    task.status === 'completed'
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : task.status === 'postponed'
                        ? 'border-amber-300 bg-amber-100 text-amber-600'
                        : 'border-slate-300 bg-white hover:border-blue-500'
                  }`}
                  aria-label="切换完成状态"
                >
                  {task.status === 'completed' ? '✓' : task.status === 'postponed' ? '→' : ''}
                </button>
                <div className="min-w-0 flex-1">
                  <input
                    value={task.title}
                    onChange={(event) => onUpdateTask(task.id, { title: event.target.value })}
                    className={`w-full rounded-xl border border-transparent bg-transparent px-2 py-1 text-base font-bold outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100 ${
                      task.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-900'
                    }`}
                  />
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <select
                      value={task.type ?? 'daily'}
                      onChange={(event) => onUpdateTask(task.id, { type: event.target.value as TaskType })}
                      className={`rounded-full px-2.5 py-1 text-xs font-black outline-none ring-1 ${typeClasses[task.type ?? 'daily']}`}
                    >
                      <option value="daily">{typeLabels.daily}</option>
                      <option value="checkin">{typeLabels.checkin}</option>
                    </select>

                    <select
                      value={task.priority}
                      onChange={(event) => onUpdateTask(task.id, { priority: event.target.value as TaskPriority })}
                      className={`rounded-full px-2.5 py-1 text-xs font-black outline-none ring-1 ${priorityClasses[task.priority]}`}
                    >
                      <option value="high">{priorityLabels.high}</option>
                      <option value="medium">{priorityLabels.medium}</option>
                      <option value="low">{priorityLabels.low}</option>
                    </select>

                    <select
                      value={task.status}
                      onChange={(event) => onUpdateTask(task.id, { status: event.target.value as TaskStatus })}
                      className={`rounded-full px-2.5 py-1 text-xs font-black outline-none ring-1 ${statusClasses[task.status]}`}
                    >
                      <option value="todo">{statusLabels.todo}</option>
                      <option value="in_progress">{statusLabels.in_progress}</option>
                      <option value="completed">{statusLabels.completed}</option>
                      <option value="postponed">{statusLabels.postponed}</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap justify-end gap-2 text-sm">
                {task.status !== 'completed' && task.status !== 'postponed' && (
                  <>
                    <button
                      type="button"
                      onClick={() => onUpdateTask(task.id, { status: 'completed' })}
                      className="rounded-xl bg-emerald-100 px-3 py-2 font-bold text-emerald-700 hover:bg-emerald-200"
                    >
                      一键完成
                    </button>
                    <button
                      type="button"
                      onClick={() => onPostponeTask(task.id)}
                      className="rounded-xl bg-amber-100 px-3 py-2 font-bold text-amber-700 hover:bg-amber-200"
                    >
                      延期到明天
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => onDeleteTask(task.id)}
                  className="rounded-xl bg-slate-100 px-3 py-2 font-bold text-slate-600 hover:bg-rose-100 hover:text-rose-700"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <ReviewBox review={review} isClosed={isClosed} onChange={onUpdateReview} />
    </aside>
  );
}
