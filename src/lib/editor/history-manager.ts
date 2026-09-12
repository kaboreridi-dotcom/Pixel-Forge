/**
 * Pixel Forge — History Manager.
 *
 * Bounded undo/redo stack of DocumentSnapshots. The store calls
 * `push(label)` before committing a mutation; the user can then walk
 * back/forward through the timeline. The stack is capped at
 * MAX_HISTORY entries (oldest dropped).
 *
 * Restoring is asynchronous because snapshots contain PNG data URLs
 * that must be decoded back into canvases.
 */
import { MAX_HISTORY } from "./constants";
import {
  restoreSnapshot,
  snapshotDocument,
} from "./layer-manager";
import type {
  DocumentModel,
  DocumentSnapshot,
  HistoryEntry,
  Selection,
} from "./types";

export interface HistoryState {
  /** Index of the "current" entry in `entries`. -1 if empty. */
  cursor: number;
  entries: HistoryEntry[];
}

export function createHistory(): HistoryState {
  return { cursor: -1, entries: [] };
}

/** Push a new history entry. Truncates any redo tail. */
export function pushHistory(
  state: HistoryState,
  doc: DocumentModel,
  label: string,
  selection: Selection | null,
): HistoryState {
  const snapshot = snapshotDocument(doc);
  const entry: HistoryEntry = { label, snapshot, selection };
  // drop redo tail
  const base = state.entries.slice(0, state.cursor + 1);
  base.push(entry);
  // cap
  const overflow = base.length - MAX_HISTORY;
  const entries = overflow > 0 ? base.slice(overflow) : base;
  return { cursor: entries.length - 1, entries };
}

/** Initialize history with the document's starting state. */
export function initHistory(
  state: HistoryState,
  doc: DocumentModel,
  selection: Selection | null,
): HistoryState {
  return pushHistory({ cursor: -1, entries: [] }, doc, "New Document", selection);
}

export function canUndo(state: HistoryState): boolean {
  return state.cursor > 0;
}

export function canRedo(state: HistoryState): boolean {
  return state.cursor < state.entries.length - 1;
}

export function currentEntry(state: HistoryState): HistoryEntry | null {
  return state.cursor >= 0 ? state.entries[state.cursor] : null;
}

/**
 * Restore the document at a given history cursor.
 * Returns the restored DocumentModel + selection, or null if out of range.
 */
export async function restoreAt(
  state: HistoryState,
  cursor: number,
): Promise<{ doc: DocumentModel; selection: Selection | null; label: string } | null> {
  if (cursor < 0 || cursor >= state.entries.length) return null;
  const entry = state.entries[cursor];
  const doc = await restoreSnapshot(entry.snapshot);
  return {
    doc,
    selection: entry.selection
      ? {
          ...entry.selection,
          mask: entry.selection.mask ? new Uint8Array(entry.selection.mask) : null,
        }
      : null,
    label: entry.label,
  };
}

/** Peek a snapshot without restoring (for thumbnails / labels). */
export function peekSnapshot(
  state: HistoryState,
  cursor: number,
): DocumentSnapshot | null {
  if (cursor < 0 || cursor >= state.entries.length) return null;
  return state.entries[cursor].snapshot;
}

export function historyLabels(state: HistoryState): { label: string; cursor: number }[] {
  return state.entries.map((e, i) => ({ label: e.label, cursor: i }));
}
