import { useMigrationStore } from "../store/useMigrationStore";

interface Props {
  onNext: () => void;
}

export default function RoleSelection({ onNext }: Props) {
  const setRole = useMigrationStore((s) => s.setRole);

  const choose = (role: "sender" | "receiver") => {
    setRole(role);
    onNext();
  };

  return (
    <section className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-semibold">Choose your role</h2>
        <p className="mt-2 text-slate-400">
          Select which laptop you are using right now.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <button
          type="button"
          onClick={() => choose("sender")}
          className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-left shadow-lg transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:border-indigo-500 hover:shadow-indigo-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/20 text-2xl">
            💻
          </div>
          <h3 className="text-xl font-semibold">This is my Old Laptop</h3>
          <p className="mt-2 text-sm text-slate-400">
            Send files, apps, and settings to your new machine.
          </p>
          <span className="mt-6 inline-block text-sm font-medium text-indigo-400 group-hover:translate-x-1 transition-transform">
            Start as sender →
          </span>
        </button>

        <button
          type="button"
          onClick={() => choose("receiver")}
          className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-left shadow-lg transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:border-emerald-500 hover:shadow-emerald-500/20 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20 text-2xl">
            🆕
          </div>
          <h3 className="text-xl font-semibold">This is my New Laptop</h3>
          <p className="mt-2 text-sm text-slate-400">
            Receive and restore your data on this device.
          </p>
          <span className="mt-6 inline-block text-sm font-medium text-emerald-400 group-hover:translate-x-1 transition-transform">
            Start as receiver →
          </span>
        </button>
      </div>
    </section>
  );
}
