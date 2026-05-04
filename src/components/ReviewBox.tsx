import type { DayReview } from '../types';

interface ReviewBoxProps {
  review?: DayReview;
  isClosed: boolean;
  onChange: (content: string) => void;
}

export default function ReviewBox({ review, isClosed, onChange }: ReviewBoxProps) {
  const hasContent = Boolean(review?.content.trim());

  return (
    <section className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-black text-slate-900">每日复盘</h3>
          <p className="mt-0.5 text-xs text-slate-500">记录完成事项、未完成原因和明天改进点。</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${hasContent ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
          {hasContent ? '已保存' : '待填写'}
        </span>
      </div>

      <textarea
        value={review?.content ?? ''}
        onChange={(event) => onChange(event.target.value)}
        rows={6}
        placeholder={'今天完成了什么？\n还有哪些没完成，原因是什么？\n明天准备怎么调整？'}
        className="w-full resize-none rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
      />

      {isClosed && (
        <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          今日闭环完成：所有任务都已经完成或延期处理。
        </div>
      )}
    </section>
  );
}
