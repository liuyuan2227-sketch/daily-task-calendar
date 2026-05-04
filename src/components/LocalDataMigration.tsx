import { useState } from 'react';
import type { AppData } from '../types';
import { getMigrationKey, hasLocalData, loadData } from '../utils/storage';
import { importLocalData } from '../utils/supabaseData';

interface LocalDataMigrationProps {
  userId: string;
  onMigrated: () => Promise<void> | void;
  onMessage: (message: string) => void;
}

export default function LocalDataMigration({ userId, onMigrated, onMessage }: LocalDataMigrationProps) {
  const migrationKey = getMigrationKey(userId);
  const [visible, setVisible] = useState(() => hasLocalData() && localStorage.getItem(migrationKey) !== 'true');
  const [loading, setLoading] = useState(false);

  if (!visible) return null;

  const data: AppData = loadData();

  async function handleImport() {
    if (!window.confirm('确定把当前浏览器里的旧本地数据导入到当前登录账号吗？不会删除本地数据。')) return;

    try {
      setLoading(true);
      await importLocalData(userId, data.tasks, data.reviews);
      localStorage.setItem(migrationKey, 'true');
      setVisible(false);
      await onMigrated();
      onMessage('本地数据已导入当前账号');
    } catch (error) {
      onMessage(error instanceof Error ? error.message : '本地数据导入失败');
    } finally {
      setLoading(false);
    }
  }

  function handleSkip() {
    localStorage.setItem(migrationKey, 'true');
    setVisible(false);
    onMessage('已跳过本地数据导入');
  }

  return (
    <section className="mb-5 rounded-3xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-black text-amber-900">检测到旧版本地数据</h2>
          <p className="mt-1 text-sm text-amber-700">
            本地共有 {data.tasks.length} 个任务、{data.reviews.length} 条复盘。可以导入到当前账号，数据会自动绑定当前用户。
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleImport}
            disabled={loading}
            className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-black text-white hover:bg-amber-700 disabled:bg-amber-300"
          >
            {loading ? '导入中...' : '导入当前账号'}
          </button>
          <button
            type="button"
            onClick={handleSkip}
            className="rounded-xl bg-white px-4 py-2 text-sm font-black text-amber-700 hover:bg-amber-100"
          >
            跳过
          </button>
        </div>
      </div>
    </section>
  );
}
