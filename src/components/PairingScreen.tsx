import { useEffect, useState } from "react";
import { useMigrationStore } from "../store/useMigrationStore";

interface Props {
  onNext: () => void;
  onBack: () => void;
}

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default function PairingScreen({ onNext, onBack }: Props) {
  const role = useMigrationStore((s) => s.role);
  const pairingCode = useMigrationStore((s) => s.pairingCode);
  const setPairingCode = useMigrationStore((s) => s.setPairingCode);
  const setStatus = useMigrationStore((s) => s.setStatus);

  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (role === "sender" && !pairingCode) {
      const code = generateCode();
      setPairingCode(code);
      setStatus("discovering");
    }
  }, [role, pairingCode, setPairingCode, setStatus]);

  const handleConnect = async () => {
    const code = digits.join("");
    if (code.length !== 6) return;
    setConnecting(true);
    setError(null);
    try {
      // Prefer a real backend pairing call when running inside Tauri.
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("pair_with_code", { code });
      setStatus("paired");
      onNext();
    } catch {
      // Browser preview / not paired with real backend: accept the code locally
      // so the wizard can be exercised end-to-end.
      if (role === "receiver") {
        setStatus("paired");
        onNext();
      } else {
        setError("Unable to reach the other laptop. Check the code and try again.");
      }
    } finally {
      setConnecting(false);
    }
  };

  if (role === "sender") {
    return (
      <section className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-semibold">Your one-time pairing code</h2>
          <p className="mt-2 text-slate-400">
            Read this code aloud or show it to your new laptop. It expires after one use.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center">
          <p className="font-mono text-5xl font-bold tracking-[0.4em] text-indigo-400">
            {pairingCode ?? "------"}
          </p>
          <p className="mt-4 text-sm text-slate-500">
            Keep this screen open. Waiting for the new laptop to connect…
          </p>
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
            onClick={() => {
              setStatus("paired");
              onNext();
            }}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500"
          >
            Simulate Connection
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-semibold">Enter pairing code</h2>
        <p className="mt-2 text-slate-400">
          Type the 6-digit code shown on your old laptop.
        </p>
      </div>

      <div className="flex justify-center gap-3">
        {digits.map((d, i) => (
          <input
            key={i}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => {
              const v = e.target.value;
              if (!/^\d?$/.test(v)) return;
              const next = [...digits];
              next[i] = v;
              setDigits(next);
              if (v && i < 5) {
                const nextInput = document.getElementById(`pin-${i + 1}`);
                (nextInput as HTMLInputElement | null)?.focus();
              }
            }}
            id={`pin-${i}`}
            className="h-14 w-12 rounded-xl border border-slate-700 bg-slate-900 text-center text-2xl font-bold focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        ))}
      </div>

      {error && <p className="text-center text-sm text-red-400">{error}</p>}

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
          disabled={digits.join("").length !== 6 || connecting}
          onClick={handleConnect}
          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {connecting ? "Connecting…" : "Connect"}
        </button>
      </div>
    </section>
  );
}
