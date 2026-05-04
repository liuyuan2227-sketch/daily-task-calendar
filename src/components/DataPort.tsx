import type { AppData } from '../types';

interface DataPortProps {
  data: AppData;
  onImport: (data: AppData) => Promise<void>;
  onMessage: (message: string) => void;
}

export default function DataPort({ data, onImport, onMessage }: DataPortProps) {
  function handleExport() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `daily-task-export-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    onMessage('已导出当前用户数据');
  }

  async function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!window.confirm('确定导入这个 JSON 文件到当前账号吗？导入数据只会绑定当前登录用户。')) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Partial<AppData>;
      if (!Array.isArray(parsed.tasks) || !Array.isArray(parsed.reviews)) {
        throw new Error('JSON 格式不正确');
      }
      await onImport({ version: 1, tasks: parsed.tasks, reviews: parsed.reviews });
      onMessage('导入成功');
    } catch (error) {
      onMessage(error instanceof Error ? error.message : '导入失败');
    }
  }

  return (
    <div className="flex flex-wrap gap-2 rounded-2xl bg-slate-50 p-2">
      <button
        type="button"
        onClick={handleExport}
        className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-100"
      >
        导出数据
      </button>
      <label className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-100">
        导入数据
        <input type="file" accept="application/json" onChange={handleImport} className="hidden" />
      </label>
    </div>
  );
}
