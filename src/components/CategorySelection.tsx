import { useMigrationStore } from "../store/useMigrationStore";

interface Props {
  onNext: () => void;
  onBack: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  documents: "Documents",
  desktop: "Desktop",
  downloads: "Downloads",
  pictures: "Pictures",
  apps: "Applications",
  developer: "Developer",
  browser: "Browser Data",
};

export default function CategorySelection({ onNext, onBack }: Props) {
  const scannedItems = useMigrationStore((s) => s.scannedItems);
  const toggleItem = useMigrationStore((s) => s.toggleItem);
  const updateProgress = useMigrationStore((s) => s.updateProgress);

  const selectedBytes = scannedItems
    .filter((item) => item.selected)
    .reduce((sum, item) => sum + item.sizeBytes, 0);
  const totalBytes = scannedItems.reduce((sum, item) => sum + item.sizeBytes, 0);

  const handleStart = () => {
    updateProgress({ totalBytes: selectedBytes, bytesTransferred: 0, currentFile: "" });
    onNext();
  };
  const selectedGB = (selectedBytes / 1_000_000_000).toFixed(1);
  const totalGB = (totalBytes / 1_000_000_000).toFixed(1);

  return (
    <section className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-semibold">Select what to migrate</h2>
          <p className="mt-2 text-slate-400">
            Toggle categories to include in the transfer.
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-indigo-400">{selectedGB} GB</p>
          <p className="text-xs text-slate-500">of {totalGB} GB selected</p>
        </div>
      </div>

      <div className="space-y-3">
        {scannedItems.map((item) => (
          <label
            key={item.id}
            className="flex cursor-pointer items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-4 transition hover:border-slate-700"
          >
            <div className="flex items-center gap-4">
              <input
                type="checkbox"
                checked={item.selected}
                onChange={() => toggleItem(item.id)}
                className="h-5 w-5 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
              />
              <div>
                <p className="font-medium">{CATEGORY_LABELS[item.category] ?? item.name}</p>
                <p className="text-xs text-slate-500">{item.path}</p>
              </div>
            </div>
            <span className="text-sm font-medium text-slate-300">
              {(item.sizeBytes / 1_000_000_000).toFixed(1)} GB
            </span>
          </label>
        ))}
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleStart}
          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500"
        >
          Start Transfer
        </button>
      </div>
    </section>
  );
}
