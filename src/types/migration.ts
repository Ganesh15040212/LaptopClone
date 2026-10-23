// Core domain types for the LaptopClone P2P migration desktop app.

export type MigrationRole = "sender" | "receiver";

export type Category =
  | "documents"
  | "desktop"
  | "downloads"
  | "pictures"
  | "apps"
  | "developer"
  | "browser";

export interface ScannedItem {
  id: string;
  name: string;
  category: Category;
  sizeBytes: number;
  selected: boolean;
  path: string;
}

export interface TransferMetrics {
  currentFile: string;
  bytesTransferred: number;
  totalBytes: number;
  speedMBps: number;
  etaSeconds: number;
}

export interface PeerDevice {
  id: string;
  name: string;
  ip: string;
  port: number;
  paired: boolean;
}

export type ConnectionStatus =
  | "idle"
  | "discovering"
  | "paired"
  | "scanning"
  | "transferring"
  | "completed"
  | "error";

// Convenience alias kept for callers that prefer a "lifecycle" naming.
export type ConnectionLifecycle = ConnectionStatus;
