import { useRef, useState } from "react";
import type React from "react";

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export default function PinPairing({ onNext, onBack }: Props) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    if (value && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const pin = digits.join("");
  const complete = pin.length === 6;

  return (
    <section className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-semibold">Pair devices</h2>
        <p className="mt-2 text-slate-400">
          Enter the 6-digit PIN shown on the other laptop.
        </p>
      </div>

      <div className="flex justify-center gap-3">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              inputs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className="h-14 w-12 rounded-xl border border-slate-700 bg-slate-900 text-center text-2xl font-bold focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        ))}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/20 text-xl">
            📡
          </div>
          <div>
            <p className="font-medium">Laptop-Alpha</p>
            <p className="text-sm text-slate-400">192.168.1.42 · Paired</p>
          </div>
          <span className="ml-auto rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-400">
            Online
          </span>
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
        <button
          type="button"
          disabled={!complete}
          onClick={onNext}
          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continue
        </button>
      </div>
    </section>
  );
}
