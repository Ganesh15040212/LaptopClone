import { useEffect } from "react";
import { useMigrationStore } from "../store/useMigrationStore";

interface Props {
  onBack: () => void;
}

function formatEta(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function TransferDashboard({ onBack }: Props) {
  const metrics = useMigrationStore((s) => s.metrics);
  const updateProgress = useMigrationStore((s) => s.updateProgress);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    import("@tauri-apps/api/event")
      .then(({ listen }) => {
        const promise = listen("transfer-progress", (event: { payload: unknown }) => {
          const payload = event.payload as {
            bytesTransferred?: number;
            speedMBps?: number;
            speed_mbps?: number;
            currentFile?: string;
            current_file?: string;
          };
          updateProgress({
            bytesTransferred: payload.bytesTransferred,
            speedMBps: payload.speedMBps ?? payload.speed_mbps,
            currentFile: payload.currentFile ?? payload.current_file,
          });
        });
        promise.then((fn) => {
          unlisten = fn as () => void;
        });
      })
      .catch(() => {
        /* Tauri runtime not available (browser preview). */
      });

    return () => {
      unlisten?.();
    };
  }, [updateProgress]);

  const percent =
    metrics.totalBytes > 0
      ? Math.min(100, (metrics.bytesTransferred / metrics.totalBytes) * 100)
      : 0;

  const eta = metrics.speedMBps > 0
    ? (metrics.totalBytes - metrics.bytesTransferred) / (metrics.speedMBps * 1_000_000)
    : metrics.etaSeconds;

  return (
    <section className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-semibold">Transfer in progress</h2>
          <p className="mt-2 text-slate-400">
            {metrics.currentFile || "Waiting for files..."}
          </p>
        </div>
        <p className="text-4xl font-bold text-indigo-400">{percent.toFixed(1)}%</p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="mb-2 flex justify-between text-sm text-slate-400">
          <span>{(metrics.bytesTransferred / 1_000_000_000).toFixed(2)} GB</span>
          <span>{(metrics.totalBytes / 1_000_000_000).toFixed(2)} GB</span>
        </div>
        <div className="h-4 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <p className="text-xs uppercase tracking-wider text-slate-500">Speed</p>
          <p className="mt-2 text-3xl font-bold text-emerald-400">
            {metrics.speedMBps.toFixed(1)}
            <span className="ml-1 text-base font-medium text-slate-400">MB/s</span>
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <p className="text-xs uppercase tracking-wider text-slate-500">ETA</p>
          <p className="mt-2 text-3xl font-bold text-indigo-400">
            {formatEta(eta)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <p className="text-xs uppercase tracking-wider text-slate-500">Current File</p>
          <p className="mt-2 truncate text-sm font-medium text-slate-200">
            {metrics.currentFile || "—"}
          </p>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800"
        >
          Back
        </button>
      </div>
    </section>
  );
}
