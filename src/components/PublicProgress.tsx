import type { PublicUserProgress } from '../utils/publicProgress';

interface PublicProgressProps {
  progress: PublicUserProgress[];
  loading: boolean;
  currentUserId: string;
}

export default function PublicProgress({ progress, loading, currentUserId }: PublicProgressProps) {
  return (
    <section className="rounded-[2rem] border border-white/70 bg-white/95 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-400">Team Progress</p>
          <h2 className="text-2xl font-black text-slate-950">大家的进度</h2>
          <p className="mt-1 text-sm text-slate-500">所有登录用户都能看到整体进度，但只能编辑自己的个人看板。</p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 ring-1 ring-blue-100">
          {progress.length} 位成员
        </span>
      </div>

      {loading ? (
        <div className="rounded-3xl bg-slate-50 p-8 text-center font-black text-slate-500">正在加载大家的进度...</div>
      ) : progress.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
          还没有任何进度数据。
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {progress.map((item) => (
            <article
              key={item.userId}
              className={`rounded-3xl border p-4 ${
                item.userId === currentUserId ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-base font-black text-slate-900">{item.name}</p>
                  <p className="mt-1 text-xs font-bold text-slate-400">{item.userId === currentUserId ? '我的进度' : '成员进度'}</p>
                </div>
                <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">{item.completionRate}%</span>
              </div>

              <div className="mt-4 h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500" style={{ width: `${item.completionRate}%` }} />
              </div>

              <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
                <div className="rounded-2xl bg-slate-50 p-2">
                  <p className="font-bold text-slate-400">任务</p>
                  <p className="mt-1 text-lg font-black text-slate-900">{item.totalTasks}</p>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-2">
                  <p className="font-bold text-emerald-600">完成</p>
                  <p className="mt-1 text-lg font-black text-emerald-800">{item.completedTasks}</p>
                </div>
                <div className="rounded-2xl bg-amber-50 p-2">
                  <p className="font-bold text-amber-600">延期</p>
                  <p className="mt-1 text-lg font-black text-amber-800">{item.postponedTasks}</p>
                </div>
                <div className="rounded-2xl bg-violet-50 p-2">
                  <p className="font-bold text-violet-600">复盘</p>
                  <p className="mt-1 text-lg font-black text-violet-800">{item.reviewedDays}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
