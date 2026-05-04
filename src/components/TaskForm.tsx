import { useState } from 'react';
import type { TaskPriority, TaskType } from '../types';

interface TaskFormProps {
  onAdd: (title: string, priority: TaskPriority, type: TaskType) => void;
}

export default function TaskForm({ onAdd }: TaskFormProps) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [type, setType] = useState<TaskType>('daily');

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    onAdd(trimmedTitle, priority, type);
    setTitle('');
    setPriority('medium');
    setType('daily');
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-slate-50/80 p-2">
      <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">快速添加</p>
      <div className="flex flex-col gap-1.5 sm:flex-row lg:flex-col xl:flex-row">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="输入要做的任务..."
          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        <div className="flex gap-1.5">
          <select
            value={type}
            onChange={(event) => setType(event.target.value as TaskType)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold outline-none focus:border-blue-500"
          >
            <option value="daily">每日任务</option>
            <option value="checkin">打卡任务</option>
          </select>
          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value as TaskPriority)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold outline-none focus:border-blue-500"
          >
            <option value="high">高优先级</option>
            <option value="medium">中优先级</option>
            <option value="low">低优先级</option>
          </select>
          <button type="submit" className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-[11px] font-black text-white shadow-md shadow-blue-200 hover:bg-blue-700">
            添加
          </button>
        </div>
      </div>
    </form>
  );
}
