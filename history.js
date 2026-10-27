export function createHistory({ backend, getState, onChange }) {
  const cards = new Map(), selected = new Map(), busy = new Set(), errors = new Map();
  let generation = 0;
  function view(id) { return selected.get(id)?.note || getState().notes[id]; }
  function isPast(id) { return selected.has(id); }
  function latest(id) {
    selected.get(id)?.stop(); selected.delete(id); errors.delete(id); onChange();
  }
  async function move(id, direction) {
    const state = getState(), note = view(id), epoch = generation;
    if (!note || busy.has(id) || state.editing || state.saving) return;
    if (!state.connected) { errors.set(id, 'Reconnect to browse older notes.'); onChange(); return; }
    busy.add(id); errors.delete(id); onChange();
    try {
      const next = await backend.getAdjacent(id, note.id, direction);
      if (epoch !== generation) return;
      if (!next) { errors.set(id, direction === 'older' ? 'This is the earliest note.' : 'You’re caught up. Tap Latest.'); return; }
      selected.get(id)?.stop();
      if (next.id === getState().notes[id]?.id) { selected.delete(id); return; }
      const pin = { note: next, stop: () => {} };
      selected.set(id, pin);
      pin.stop = backend.watchNote(id, next.id, value => {
        if (epoch !== generation || selected.get(id) !== pin) return;
        if (value) pin.note = { ...value, hasOlder: next.hasOlder };
        else { errors.set(id, 'This note is unavailable. Tap Latest.'); }
        onChange();
      }, () => { if (epoch === generation) { errors.set(id, 'Couldn’t update this older note. Try Latest.'); onChange(); } });
    } catch { if (epoch === generation) errors.set(id, 'Couldn’t load history. Try again.'); }
    finally { if (epoch === generation) { busy.delete(id); onChange(); } }
  }
  function attach(card, id) {
    const nav = document.createElement('div'); nav.className = 'note-history';
    nav.innerHTML = '<button class="earlier quiet">Earlier notes</button><div class="history-controls" hidden><button class="older quiet" aria-label="Older note">‹ Older</button><button class="latest quiet">Latest</button><button class="newer quiet" aria-label="Newer note">Newer ›</button></div><p class="history-status" role="status"></p>';
    nav.querySelector('.earlier').addEventListener('click', () => move(id, 'older'));
    nav.querySelector('.older').addEventListener('click', () => move(id, 'older'));
    nav.querySelector('.newer').addEventListener('click', () => move(id, 'newer'));
    nav.querySelector('.latest').addEventListener('click', () => { if (!busy.has(id)) latest(id); });
    card.append(nav); cards.set(id, nav);
  }
  function render() {
    const state = getState();
    for (const [id, nav] of cards) {
      const past = isPast(id), note = view(id);
      nav.hidden = !state.ready || state.editing === id;
      nav.querySelector('.earlier').hidden = past || !note?.hasOlder;
      nav.querySelector('.history-controls').hidden = !past;
      for (const button of nav.querySelectorAll('button')) button.disabled = busy.has(id) || state.saving;
      nav.querySelector('.older').disabled ||= !note?.hasOlder;
      nav.querySelector('.history-status').textContent = busy.has(id) ? 'Loading…' : errors.get(id) || '';
    }
  }
  function reset() { generation++; for (const pin of selected.values()) pin.stop(); selected.clear(); busy.clear(); errors.clear(); }
  return { view, isPast, latest, attach, render, reset };
}
