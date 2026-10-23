import { create } from "zustand";
import type {
  ConnectionStatus,
  MigrationRole,
  PeerDevice,
  ScannedItem,
  TransferMetrics,
} from "../types";

interface MigrationStoreState {
  role: MigrationRole | null;
  // Connection lifecycle (kept in sync across both aliases for compatibility).
  status: ConnectionStatus;
  connectionStatus: ConnectionStatus;
  peers: PeerDevice[];
  pairedPeer: PeerDevice | null;
  peer: PeerDevice | null;
  scannedItems: ScannedItem[];
  metrics: TransferMetrics;
}

interface MigrationStoreActions {
  setRole: (role: MigrationRole) => void;
  setStatus: (status: ConnectionStatus) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setPeers: (peers: PeerDevice[]) => void;
  setPairedPeer: (peer: PeerDevice | null) => void;
  setPeer: (peer: PeerDevice | null) => void;
  setScannedItems: (items: ScannedItem[]) => void;
  toggleItem: (id: string) => void;
  updateProgress: (metrics: Partial<TransferMetrics>) => void;
  reset: () => void;
}

export type MigrationStore = MigrationStoreState & MigrationStoreActions;

const initialMetrics: TransferMetrics = {
  currentFile: "",
  bytesTransferred: 0,
  totalBytes: 0,
  speedMBps: 0,
  etaSeconds: 0,
};

export const useMigrationStore = create<MigrationStore>()((set) => ({
  role: null,
  status: "idle",
  connectionStatus: "idle",
  peers: [],
  pairedPeer: null,
  peer: null,
  scannedItems: [],
  metrics: { ...initialMetrics },

  setRole: (role) => set({ role }),

  setStatus: (status) => set({ status, connectionStatus: status }),

  setConnectionStatus: (status) => set({ status, connectionStatus: status }),

  setPeers: (peers) => set({ peers }),

  setPairedPeer: (peer) => set({ pairedPeer: peer, peer }),

  setPeer: (peer) => set({ peer, pairedPeer: peer }),

  setScannedItems: (items) => set({ scannedItems: items }),

  toggleItem: (id) =>
    set((state) => ({
      scannedItems: state.scannedItems.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item
      ),
    })),

  updateProgress: (metrics) =>
    set((state) => ({
      metrics: { ...state.metrics, ...metrics },
    })),

  reset: () =>
    set({
      role: null,
      status: "idle",
      connectionStatus: "idle",
      peers: [],
      pairedPeer: null,
      peer: null,
      scannedItems: [],
      metrics: { ...initialMetrics },
    }),
}));
