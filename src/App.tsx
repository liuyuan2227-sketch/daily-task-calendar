import { useEffect, useMemo, useState } from 'react';
import BoardSwitcher from './components/BoardSwitcher';
import Calendar from './components/Calendar';
import DataPort from './components/DataPort';
import LocalDataMigration from './components/LocalDataMigration';
import Login from './components/Login';
import TaskPanel from './components/TaskPanel';
import UserMenu from './components/UserMenu';
import type { AppData, Task, TaskPriority, TaskType } from './types';
import { addMonths, getMonthTitle, getToday } from './utils/date';
import {
  calculatePublicProgress,
  fetchPublicReviews,
  fetchPublicTasks,
  fetchPublicUsers,
  type PublicUserProgress,
} from './utils/publicProgress';
import { calculateMonthStats } from './utils/stats';
import { deleteBoard, importLocalData } from './utils/supabaseData';
import { useAuth } from './hooks/useAuth';
import { useSupabaseData } from './hooks/useSupabaseData';

export default function App() {
  const today = getToday();
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [toast, setToast] = useState('');
  const [selectedBoardUserId, setSelectedBoardUserId] = useState<string>();
  const [publicProgress, setPublicProgress] = useState<PublicUserProgress[]>([]);
  const [publicLoading, setPublicLoading] = useState(false);
  const auth = useAuth();
  const dataStore = useSupabaseData(selectedBoardUserId);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 1800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function showToast(message: string) {
    setToast(message);
  }

  async function loadPublicProgress() {
    if (!auth.user) return;
    setPublicLoading(true);
    const fallbackUsers: Record<string, string> = {
      [auth.user.id]: (auth.user.user_metadata?.display_name as string | undefined) ?? '我的看板',
    };

    try {
      let tasks: Task[] = [];
      let reviews = dataStore.reviews;
      let users = fallbackUsers;

      try {
        [tasks, reviews] = await Promise.all([fetchPublicTasks(), fetchPublicReviews()]);
      } catch {
        tasks = dataStore.tasks;
      }

      try {
        users = { ...fallbackUsers, ...(await fetchPublicUsers()) };
      } catch {
        users = fallbackUsers;
      }

      setPublicProgress(calculatePublicProgress(tasks, reviews, users));
    } finally {
      setPublicLoading(false);
    }
  }

  useEffect(() => {
    if (!auth.user) return;
    void loadPublicProgress();
  }, [auth.user?.id]);

  useEffect(() => {
    if (!auth.user) {
      setSelectedBoardUserId(undefined);
      return;
    }

    const sharedBoardUserId = new URLSearchParams(window.location.search).get('board');
    const preferredBoardUserId = localStorage.getItem('preferred_board_user_id');
    setSelectedBoardUserId((current) => current ?? sharedBoardUserId ?? preferredBoardUserId ?? auth.user?.id);
  }, [auth.user?.id]);

  useEffect(() => {
    if (!auth.user || selectedBoardUserId || publicProgress.length === 0) return;
    setSelectedBoardUserId(publicProgress[0].userId);
  }, [auth.user?.id, selectedBoardUserId, publicProgress]);

  useEffect(() => {
    if (!auth.user) return;
    const timer = window.setInterval(() => void loadPublicProgress(), 5000);
    return () => window.clearInterval(timer);
  }, [auth.user?.id]);

  useEffect(() => {
    if (!auth.user || !selectedBoardUserId) return;
    const url = new URL(window.location.href);
    url.searchParams.set('board', selectedBoardUserId);
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }, [auth.user?.id, selectedBoardUserId]);

  const currentUserName = (auth.user?.user_metadata?.display_name as string | undefined) ?? '我的';
  const selectedBoardUser = publicProgress.find((user) => user.userId === selectedBoardUserId);
  const selectedBoardName = selectedBoardUser?.name ?? (selectedBoardUserId === auth.user?.id ? currentUserName : '成员');
  const boardSwitcherUsers = publicProgress.some((user) => user.userId === auth.user?.id)
    ? publicProgress
    : [
        {
          userId: auth.user?.id ?? '',
          name: currentUserName,
          totalTasks: dataStore.tasks.length,
          completedTasks: dataStore.tasks.filter((task) => task.status === 'completed').length,
          postponedTasks: dataStore.tasks.filter((task) => task.status === 'postponed').length,
          unfinishedTasks: dataStore.tasks.filter((task) => task.status === 'todo' || task.status === 'in_progress').length,
          completionRate: dataStore.tasks.length ? Math.round((dataStore.tasks.filter((task) => task.status === 'completed').length / dataStore.tasks.length) * 100) : 0,
          reviewedDays: dataStore.reviews.filter((review) => review.content.trim()).length,
        },
        ...publicProgress,
      ].filter((user) => user.userId);

  const selectedTasks = useMemo(
    () => dataStore.tasks.filter((task) => task.date === selectedDate),
    [dataStore.tasks, selectedDate],
  );

  const todayTasks = useMemo(
    () => dataStore.tasks.filter((task) => task.date === today),
    [dataStore.tasks, today],
  );

  const selectedReview = dataStore.reviews.find((review) => review.date === selectedDate);
  const selectedCheckinRecords = dataStore.checkinRecords.filter((record) => record.date === selectedDate);
  const monthStats = useMemo(
    () => calculateMonthStats(dataStore.tasks, dataStore.reviews, monthDate),
    [dataStore.tasks, dataStore.reviews, monthDate],
  );
  const todayReview = dataStore.reviews.find((review) => review.date === today);
  const todayCompleted = todayTasks.filter((task) => task.status === 'completed').length;
  const todayUnfinished = todayTasks.filter((task) => task.status === 'todo' || task.status === 'in_progress').length;
  const todayRate = todayTasks.length ? Math.round((todayCompleted / todayTasks.length) * 100) : 0;
  const todayReviewed = Boolean(todayReview?.content.trim());

  async function addTask(title: string, priority: TaskPriority, type: TaskType) {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    try {
      await dataStore.addTask(trimmedTitle, selectedDate, priority, type);
      await loadPublicProgress();
      showToast('任务已添加');
    } catch (error) {
      const message = error instanceof Error ? error.message : '任务添加失败';
      showToast(message.includes('row-level security') ? '任务添加失败：请重新执行 supabase.sql 更新权限' : message);
    }
  }

  async function updateTask(id: string, patch: Partial<Task>) {
    try {
      await dataStore.updateTask(id, patch);
      await loadPublicProgress();
      if (patch.status === 'completed') showToast('已标记完成');
      if (patch.status === 'todo') showToast('已恢复为待开始');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '任务更新失败');
    }
  }

  async function deleteTask(id: string) {
    const task = dataStore.tasks.find((item) => item.id === id);
    if (!task) return;
    if (!window.confirm(`确定删除任务「${task.title}」吗？`)) return;

    try {
      await dataStore.deleteTask(id);
      await loadPublicProgress();
      showToast('任务已删除');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '任务删除失败');
    }
  }

  async function postponeTask(id: string) {
    const sourceTask = dataStore.tasks.find((task) => task.id === id);
    if (!sourceTask || sourceTask.status === 'completed' || sourceTask.status === 'postponed') return;

    try {
      await dataStore.postponeTask(sourceTask);
      await loadPublicProgress();
      showToast('已延期到明天');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '任务延期失败');
    }
  }

  async function updateReview(content: string) {
    try {
      await dataStore.updateReview(selectedDate, content);
      await loadPublicProgress();
      showToast(content.trim() ? '复盘已保存' : '复盘已清空');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '复盘保存失败');
    }
  }

  async function updateCheckinTask(id: string, patch: Parameters<typeof dataStore.updateCheckinTask>[1]) {
    try {
      await dataStore.updateCheckinTask(id, patch);
      showToast('打卡任务已更新');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '打卡任务更新失败');
    }
  }

  async function deleteCheckinTask(id: string) {
    const task = dataStore.checkinTasks.find((item) => item.id === id);
    if (!task) return;
    if (!window.confirm(`确定删除打卡任务「${task.title}」吗？`)) return;

    try {
      await dataStore.deleteCheckinTask(id);
      showToast('打卡任务已删除');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '打卡任务删除失败');
    }
  }

  async function toggleCheckin(id: string, checked: boolean) {
    try {
      await dataStore.toggleCheckin(id, selectedDate, checked);
      showToast(checked ? '今日已打卡' : '已取消打卡');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '打卡失败');
    }
  }

  async function copyShareLink() {
    if (!selectedBoardUserId) return;
    const url = new URL(window.location.href);
    url.searchParams.set('board', selectedBoardUserId);

    try {
      await navigator.clipboard.writeText(url.toString());
      showToast('分享链接已复制，发给别人即可编辑这个看板');
    } catch {
      window.prompt('复制这个链接发给别人：', url.toString());
    }
  }

  async function deleteUserBoard(userId: string) {
    const board = boardSwitcherUsers.find((user) => user.userId === userId);
    if (!board) return;
    if (!window.confirm(`确定删除「${board.name}」的整个看板吗？删除后这个看板不会再显示。`)) return;

    try {
      await deleteBoard(userId);
      localStorage.removeItem('preferred_board_user_id');
      const nextUsers = boardSwitcherUsers.filter((user) => user.userId !== userId);
      setPublicProgress(nextUsers);
      setSelectedBoardUserId(nextUsers[0]?.userId ?? auth.user?.id);
      showToast('看板已删除');
      void loadPublicProgress();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '看板删除失败');
    }
  }

  async function importData(data: AppData) {
    if (!selectedBoardUserId) return;
    await importLocalData(selectedBoardUserId, data.tasks, data.reviews);
    await dataStore.reload();
    await loadPublicProgress();
  }

  if (auth.loading) {
    return <main className="flex min-h-screen items-center justify-center text-lg font-black text-slate-700">加载登录状态...</main>;
  }

  if (!auth.user) {
    return <Login isConfigured={auth.isConfigured} onEnter={auth.enterWithName} />;
  }

  return (
    <main className="min-h-screen p-2 md:p-4">
      {toast && (
        <div className="fixed right-4 top-4 z-50 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white shadow-2xl shadow-slate-300">
          {toast}
        </div>
      )}

      <div className="mx-auto max-w-7xl">
        <header className="mb-1.5 overflow-hidden rounded-xl border border-white/70 bg-white/85 px-3 py-1.5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur md:px-4 md:py-2">
          <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="mb-0.5 inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-black text-blue-700 ring-1 ring-blue-100">多人看板切换</p>
              <h1 className="text-lg font-black tracking-tight text-slate-950 md:text-xl">每日任务闭环日历</h1>
              <p className="text-[11px] text-slate-500">按成员切换看板，并编辑当前成员任务和复盘。</p>
            </div>

            <div className="flex flex-row gap-1.5 md:flex-col">
              <UserMenu name={(auth.user.user_metadata?.display_name as string | undefined) ?? '匿名用户'} onSignOut={auth.signOut} onShare={copyShareLink} />
              <div className="rounded-lg bg-slate-50 px-2 py-1 text-[11px] font-black text-slate-700">
                当前看板：<span className="text-blue-700">{selectedBoardName}</span>
              </div>
            </div>
          </div>
        </header>

        <BoardSwitcher
          users={boardSwitcherUsers}
          selectedUserId={selectedBoardUserId}
          currentUserId={auth.user.id}
          onSelectUser={setSelectedBoardUserId}
          onDeleteUser={deleteUserBoard}
        />

        <LocalDataMigration userId={auth.user.id} onMigrated={dataStore.reload} onMessage={showToast} />

        {publicLoading && boardSwitcherUsers.length === 0 && (
          <div className="mb-5 rounded-3xl bg-white/90 p-5 text-center font-black text-slate-600">正在加载成员看板...</div>
        )}

        <section className="mb-1.5 grid gap-1 md:grid-cols-5">
          <div className="rounded-lg border border-white/70 bg-white/90 px-2.5 py-1 shadow-sm">
            <p className="text-[11px] font-bold text-slate-400">本月总任务</p>
            <p className="text-lg font-black text-slate-900 leading-tight">{monthStats.totalTasks}</p>
            <p className="truncate text-[10px] text-slate-500">{selectedBoardName} 的当前月份任务</p>
          </div>
          <div className="rounded-lg border border-white/70 bg-white/90 px-2.5 py-1 shadow-sm">
            <p className="text-[11px] font-bold text-slate-400">本月已完成</p>
            <p className="text-lg font-black text-emerald-700 leading-tight">{monthStats.completedTasks}</p>
            <p className="text-[10px] text-slate-500">完成率 {monthStats.completionRate}%</p>
          </div>
          <div className="rounded-lg border border-white/70 bg-white/90 px-2.5 py-1 shadow-sm">
            <p className="text-[11px] font-bold text-slate-400">本月完成率</p>
            <p className="text-lg font-black text-blue-700 leading-tight">{monthStats.completionRate}%</p>
            <div className="mt-0.5 h-0.5 rounded-full bg-slate-100">
              <div className="h-0.5 rounded-full bg-blue-500" style={{ width: `${monthStats.completionRate}%` }} />
            </div>
          </div>
          <div className="rounded-lg border border-white/70 bg-white/90 px-2.5 py-1 shadow-sm">
            <p className="text-[11px] font-bold text-slate-400">本月延期</p>
            <p className="text-lg font-black text-amber-700 leading-tight">{monthStats.postponedTasks}</p>
            <p className="truncate text-[10px] text-slate-500">{selectedBoardName} 的延期任务数</p>
          </div>
          <div className="rounded-lg border border-white/70 bg-white/90 px-2.5 py-1 shadow-sm">
            <p className="text-[11px] font-bold text-slate-400">本月复盘</p>
            <p className="text-lg font-black text-violet-700 leading-tight">{monthStats.reviewedDays}</p>
            <p className="truncate text-[10px] text-slate-500">{selectedBoardName} 的已复盘天数</p>
          </div>
        </section>

        <section className="mb-1.5 grid gap-1 md:grid-cols-4">
          <button
            type="button"
            onClick={() => {
              setSelectedDate(today);
              setMonthDate(new Date());
            }}
            className="rounded-lg border border-blue-100 bg-blue-600 px-2.5 py-1 text-left text-white shadow-md shadow-blue-100 md:col-span-1"
          >
            <p className="text-[11px] font-semibold text-blue-100">今日视角</p>
            <p className="text-base font-black leading-tight">{today}</p>
            <p className="text-[10px] text-blue-100">点击回到今天</p>
          </button>
          <div className="rounded-lg border border-white/70 bg-white/90 px-2.5 py-1 shadow-sm">
            <p className="text-[11px] font-bold text-slate-400">今日任务</p>
            <p className="text-lg font-black text-slate-900 leading-tight">{todayTasks.length}</p>
            <p className="text-[10px] text-slate-500">已完成 {todayCompleted} 个</p>
          </div>
          <div className="rounded-lg border border-white/70 bg-white/90 px-2.5 py-1 shadow-sm">
            <p className="text-[11px] font-bold text-slate-400">完成率</p>
            <p className="text-lg font-black text-slate-900 leading-tight">{todayRate}%</p>
            <p className="text-[10px] text-slate-500">剩余 {todayUnfinished} 个未闭环</p>
          </div>
          <div className={`rounded-lg border px-2.5 py-1 shadow-sm ${todayReviewed ? 'border-emerald-100 bg-emerald-50' : 'border-amber-100 bg-amber-50'}`}>
            <p className={`text-[11px] font-bold ${todayReviewed ? 'text-emerald-600' : 'text-amber-600'}`}>复盘状态</p>
            <p className={`text-lg font-black leading-tight ${todayReviewed ? 'text-emerald-800' : 'text-amber-800'}`}>{todayReviewed ? '已复盘' : '待复盘'}</p>
            <p className="truncate text-[10px] text-slate-500">{todayTasks.length === 0 ? '先添加今日计划' : todayUnfinished === 0 ? '今日闭环完成' : `还有 ${todayUnfinished} 个任务`}</p>
          </div>
        </section>

        <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-slate-50 p-1.5">
            <button type="button" onClick={() => setMonthDate((date) => addMonths(date, -1))} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50">上个月</button>
            <div className="min-w-32 text-center text-base font-black text-slate-900">{getMonthTitle(monthDate)}</div>
            <button type="button" onClick={() => setMonthDate((date) => addMonths(date, 1))} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50">下个月</button>
          </div>
          <DataPort data={{ version: 1, tasks: dataStore.tasks, reviews: dataStore.reviews }} onImport={importData} onMessage={showToast} />
        </div>

        {dataStore.loading ? (
          <div className="rounded-3xl bg-white/90 p-8 text-center font-black text-slate-600">正在加载 {selectedBoardName} 的看板数据...</div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
            <Calendar
              monthDate={monthDate}
              selectedDate={selectedDate}
              today={today}
              tasks={dataStore.tasks}
              checkinTasks={dataStore.checkinTasks}
              checkinRecords={dataStore.checkinRecords}
              onSelectDate={setSelectedDate}
            />
            <TaskPanel
              selectedDate={selectedDate}
              today={today}
              tasks={selectedTasks}
              allTasks={dataStore.tasks}
              checkinTasks={dataStore.checkinTasks}
              checkinRecords={selectedCheckinRecords}
              review={selectedReview}
              onAddTask={addTask}
              onUpdateTask={updateTask}
              onDeleteTask={deleteTask}
              onPostponeTask={postponeTask}
              onUpdateReview={updateReview}
              onUpdateCheckinTask={updateCheckinTask}
              onDeleteCheckinTask={deleteCheckinTask}
              onToggleCheckin={toggleCheckin}
            />
          </div>
        )}
      </div>
    </main>
  );
}
