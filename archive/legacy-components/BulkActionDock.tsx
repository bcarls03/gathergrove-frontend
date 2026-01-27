type Props = {
  count: number;
  max: number;
  busy?: boolean;
  onConnect: () => void;
  onNow: () => void;
  onFuture: () => void;
  onClear: () => void;
};

export default function BulkActionDock({
  count,
  max,
  busy,
  onConnect,
  onNow,
  onFuture,
  onClear,
}: Props) {
  const pct = Math.min(100, Math.round((count / max) * 100));
  const disabledConnect = count === 0 || count > max || !!busy;

  return (
    <div
      className={[
        "fixed left-4 right-4 z-40",
        "bottom-[calc(env(safe-area-inset-bottom,0px)+16px)]",
        "rounded-2xl bg-neutral-800/90 backdrop-blur shadow-2xl",
        "px-3 py-3",
        "transition-all duration-250",
      ].join(" ")}
      role="region"
      aria-label="Bulk actions"
    >
      <div className="flex items-center gap-3">
        {/* Count pill */}
        <div className="min-w-[110px] rounded-xl bg-neutral-700 text-white/90 min-h-[44px] px-4 flex items-center justify-center text-sm font-semibold">
          {count} selected
        </div>

        {/* Connect with progress fill + sublabel */}
        <button
          type="button"
          onClick={() => !disabledConnect && onConnect()}
          disabled={disabledConnect}
          className={[
            "relative min-h-[44px] px-4 rounded-2xl text-sm font-semibold overflow-hidden",
            "flex-1 flex items-center border",
            disabledConnect
              ? "bg-blue-600/40 border-blue-500/30 text-white/70 cursor-not-allowed"
              : "bg-blue-600 border-blue-500 text-white hover:bg-blue-500 active:scale-[0.99] transition",
          ].join(" ")}
          aria-label={`Connect to ${count} households (max ${max})`}
          title={
            count > max
              ? "Max 5 selected"
              : count === 0
              ? "Select up to 5 to Connect"
              : "Connect"
          }
        >
          <span
            aria-hidden
            className="absolute inset-y-0 left-0 bg-white/20 transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
          <span className="relative z-10 flex flex-col items-start leading-tight text-left">
            <span>
              💬 Connect {count > 0 ? `(${count}/${max})` : ""}
            </span>
            <span className="dock-sub text-[11px] font-normal text-white/80 hidden sm:inline">
              Message selected households.
            </span>
          </span>
        </button>

        {/* Happening Now with sublabel */}
        <button
          type="button"
          onClick={onNow}
          className={[
            "min-h-[44px] px-4 rounded-2xl text-sm font-semibold",
            "flex-1 flex items-center text-left border",
            "bg-sky-600 text-white border-sky-500 hover:bg-sky-500 active:scale-[0.99] transition",
          ].join(" ")}
          aria-label="Create Happening Now"
          title="Create a Happening Now post"
        >
          <span className="flex flex-col items-start leading-tight">
            <span>⚡ Happening Now</span>
            <span className="dock-sub text-[11px] font-normal text-white/80 hidden sm:inline">
              Share something everyone can join now.
            </span>
          </span>
        </button>

        {/* Future Event with sublabel */}
        <button
          type="button"
          onClick={onFuture}
          className={[
            "min-h-[44px] px-4 rounded-2xl text-sm font-semibold",
            "flex-1 flex items-center text-left border",
            "bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-500 active:scale-[0.99] transition",
          ].join(" ")}
          aria-label="Create Future Event"
          title="Create a Future Event"
        >
          <span className="flex flex-col items-start leading-tight">
            <span>🗓️ Future Event</span>
            <span className="dock-sub text-[11px] font-normal text-white/80 hidden sm:inline">
              Plan something for later.
            </span>
          </span>
        </button>

        {/* Clear */}
        <button
          type="button"
          onClick={onClear}
          className="ml-auto min-h-[44px] px-4 rounded-2xl text-sm font-semibold bg-neutral-700 text-white/90 border border-neutral-600 hover:bg-neutral-600 transition"
          aria-label="Clear selection"
          title="Clear selection"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
