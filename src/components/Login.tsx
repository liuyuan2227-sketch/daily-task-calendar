import { useState } from 'react';

interface LoginProps {
  isConfigured: boolean;
  onEnter: (name: string) => Promise<void>;
}

export default function Login({ isConfigured, onEnter }: LoginProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('请输入你的名字');
      return;
    }

    try {
      setLoading(true);
      await onEnter(name.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : '进入失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <section className="w-full max-w-md rounded-[2rem] border border-white/70 bg-white/95 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
        <p className="mb-2 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 ring-1 ring-blue-100">多人在线版</p>
        <h1 className="text-3xl font-black text-slate-950">每日任务闭环日历</h1>
        <p className="mt-2 text-sm text-slate-500">输入名字即可进入。默认看大家进度，也可以进入自己的独立看板。</p>

        {!isConfigured && (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Supabase 环境变量未配置。请复制 .env.example 为 .env，并填写 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY。
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-bold text-slate-700">你的名字</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              placeholder="例如：刘源"
            />
          </div>

          {error && <div className="rounded-2xl bg-slate-100 p-3 text-sm font-bold text-slate-700">{error}</div>}

          <button
            type="submit"
            disabled={!isConfigured || loading}
            className="w-full rounded-2xl bg-slate-950 px-4 py-3 font-black text-white shadow-lg shadow-slate-300 hover:bg-slate-800 disabled:bg-slate-300"
          >
            {loading ? '进入中...' : '进入任务日历'}
          </button>
        </form>
      </section>
    </main>
  );
}
