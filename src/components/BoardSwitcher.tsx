import type { PublicUserProgress } from '../utils/publicProgress';

interface BoardSwitcherProps {
  users: PublicUserProgress[];
  selectedUserId?: string;
  currentUserId: string;
  onSelectUser: (userId: string) => void;
  onDeleteUser: (userId: string) => void;
}

export default function BoardSwitcher({ users, selectedUserId, currentUserId, onSelectUser, onDeleteUser }: BoardSwitcherProps) {
  return (
    <section className="mb-1.5 rounded-xl border border-white/70 bg-white/95 px-3 py-1.5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur">
      <div className="mb-1.5 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-semibold text-slate-400">Board Switcher</p>
          <h2 className="text-base font-black text-slate-950">选择看板</h2>
          <p className="text-[11px] text-slate-500">切换成员看板，协助编辑任务和复盘。</p>
        </div>
        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-black text-blue-700 ring-1 ring-blue-100">
          {users.length} 个看板
        </span>
      </div>

      <div className="grid gap-1.5 md:grid-cols-3 xl:grid-cols-5">
        {users.map((user) => (
          <div
            key={user.userId}
            className={`rounded-lg border px-2 py-1.5 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
              selectedUserId === user.userId ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-100' : 'border-slate-200 bg-white'
            }`}
          >
            <button type="button" onClick={() => onSelectUser(user.userId)} className="w-full text-left">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-black text-slate-900">{user.name}</p>
                  <p className="text-[10px] font-bold text-slate-400">{user.userId === currentUserId ? '我的看板' : '成员看板'}</p>
                </div>
                <span className="rounded-full bg-slate-950 px-1.5 py-0.5 text-[10px] font-black text-white">{user.completionRate}%</span>
              </div>
              <div className="mt-1 h-0.5 rounded-full bg-slate-100">
                <div className="h-0.5 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500" style={{ width: `${user.completionRate}%` }} />
              </div>
              <div className="mt-0.5 flex justify-between text-[10px] font-bold text-slate-500">
                <span>任务 {user.totalTasks}</span>
                <span>完成 {user.completedTasks}</span>
                <span>延期 {user.postponedTasks}</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => onDeleteUser(user.userId)}
              className="mt-1 w-full rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-black text-rose-600 hover:bg-rose-100"
            >
              删除看板
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
