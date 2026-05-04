interface UserMenuProps {
  name?: string;
  onSignOut: () => Promise<void>;
  onShare: () => void;
}

export default function UserMenu({ name, onSignOut, onShare }: UserMenuProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-slate-50 p-1.5">
      <span className="rounded-lg bg-white px-2 py-1.5 text-xs font-bold text-slate-700 shadow-sm">{name}</span>
      <button
        type="button"
        onClick={onShare}
        className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-black text-blue-700 hover:bg-blue-100"
      >
        分享编辑
      </button>
      <button
        type="button"
        onClick={() => void onSignOut()}
        className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-black text-rose-700 hover:bg-rose-100"
      >
        退出
      </button>
    </div>
  );
}
