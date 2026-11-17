// Save and load: cash, story progress and the best haul, in localStorage. A save
// is small on purpose — the game is a sandbox, not a ledger — and a corrupt or
// missing save just starts a fresh story.
import { SAVE_KEY } from './config.js';

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return null;
    return {
      cash: Number.isFinite(data.cash) ? data.cash : 0,
      missionIndex: Number.isInteger(data.missionIndex) ? data.missionIndex : 0,
      storyDone: data.storyDone === true,
      bestCash: Number.isFinite(data.bestCash) ? data.bestCash : 0,
    };
  } catch {
    return null;
  }
}

export function writeSave(world) {
  try {
    const data = {
      cash: world.player.cash,
      missionIndex: world.missions.index,
      storyDone: world.missions.done,
      bestCash: Math.max(world.player.cash, world.player.bestCash),
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // Storage can be off (private windows): the run then lasts this visit only.
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // Nothing to clear.
  }
}
