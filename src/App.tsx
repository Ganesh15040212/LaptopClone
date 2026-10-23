import { useEffect, useState } from "react";
import { useMigrationStore } from "./store/useMigrationStore";
import type { ScannedItem } from "./types";
import RoleSelection from "./components/RoleSelection";
import PinPairing from "./components/PinPairing";
import CategorySelection from "./components/CategorySelection";
import TransferDashboard from "./components/TransferDashboard";

const MOCK_ITEMS: ScannedItem[] = [
  { id: "1", name: "Documents", category: "documents", sizeBytes: 12_500_000_000, selected: true, path: "C:/Users/Me/Documents" },
  { id: "2", name: "Desktop", category: "desktop", sizeBytes: 3_200_000_000, selected: true, path: "C:/Users/Me/Desktop" },
  { id: "3", name: "Downloads", category: "downloads", sizeBytes: 8_900_000_000, selected: false, path: "C:/Users/Me/Downloads" },
  { id: "4", name: "Pictures", category: "pictures", sizeBytes: 25_000_000_000, selected: true, path: "C:/Users/Me/Pictures" },
  { id: "5", name: "Installed Apps", category: "apps", sizeBytes: 15_000_000_000, selected: false, path: "C:/Program Files" },
  { id: "6", name: "Developer", category: "developer", sizeBytes: 6_000_000_000, selected: false, path: "C:/dev" },
  { id: "7", name: "Browser Data", category: "browser", sizeBytes: 2_100_000_000, selected: true, path: "C:/Users/Me/AppData" },
];

export default function App() {
  const [step, setStep] = useState(1);
  const setScannedItems = useMigrationStore((s) => s.setScannedItems);
  const scannedItems = useMigrationStore((s) => s.scannedItems);

  useEffect(() => {
    if (scannedItems.length === 0) {
      setScannedItems(MOCK_ITEMS);
    }
  }, [scannedItems.length, setScannedItems]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">LaptopClone</h1>
          <span className="text-sm text-slate-400">Step {step} of 4</span>
        </header>

        {step === 1 && <RoleSelection onNext={() => setStep(2)} />}
        {step === 2 && <PinPairing onNext={() => setStep(3)} onBack={() => setStep(1)} />}
        {step === 3 && <CategorySelection onNext={() => setStep(4)} onBack={() => setStep(2)} />}
        {step === 4 && <TransferDashboard onBack={() => setStep(3)} />}
      </div>
    </div>
  );
}
