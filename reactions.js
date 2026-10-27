const emojis = [
  ['heart', '❤️', 'Love'], ['laugh', '😂', 'Laugh'], ['like', '👍', 'Like'],
  ['wow', '😮', 'Wow'], ['hug', '🤗', 'Hug'], ['paw', '🐾', 'Paw']
];

export function createReactions({ people, backend, getState }) {
  const cards = new Map();
  const pending = new Set();
  let values = {}, ready = false, failed = false, stop = () => {}, generation = 0;
  let viewing = null;
  const dialog = document.createElement('dialog');
  dialog.className = 'reaction-dialog';
  dialog.setAttribute('aria-labelledby', 'reaction-title');
  dialog.innerHTML = '<h2 id="reaction-title"></h2><p class="reaction-names"></p><form method="dialog"><button>Close</button></form>';
  document.body.append(dialog);
  dialog.addEventListener('click', event => { if (event.target === dialog) { const box = dialog.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close(); } });
  dialog.addEventListener('close', () => { viewing = null; });

  function current(id) {
    const note = getState().notes[id];
    if (!note?.text || !ready) return [];
    return people.filter(([person]) => {
      const reaction = values[id]?.[person];
      return reaction?.noteUpdatedAt === note.updatedAt && emojis.some(([key]) => key === reaction.emoji);
    });
  }
  function showNames() {
    if (!viewing) return;
    const [id, key] = viewing;
    const [, emoji, label] = emojis.find(([value]) => value === key);
    dialog.querySelector('h2').textContent = `${emoji} ${label}`;
    const names = current(id).filter(([person]) => values[id][person].emoji === key).map(([, name]) => name);
    dialog.querySelector('.reaction-names').textContent = names.length ? names.join(', ') : 'No reactions to this note yet.';
  }
  function attach(card, id) {
    const area = document.createElement('div'); area.className = 'reactions';
    area.innerHTML = '<div class="reaction-list" aria-label="Reactions"></div><details class="reaction-picker"><summary>React <span aria-hidden="true">☺</span></summary><div class="emoji-options"></div><p class="reaction-hint">One per person. Tap yours again to remove.</p></details><p class="reaction-status" role="status"></p>';
    card.append(area); cards.set(id, area);
    for (const [key, emoji, label] of emojis) {
      const button = document.createElement('button'); button.className = 'emoji-option'; button.textContent = emoji;
      button.dataset.emoji = key; button.setAttribute('aria-label', label); button.title = label;
      button.addEventListener('click', async () => {
        const state = getState(); const person = state.chosen; const note = state.notes[id];
        const slot = `${id}/${person}`; const epoch = generation;
        const status = area.querySelector('.reaction-status');
        if (!ready || !state.ready || !note?.text || !person || pending.has(slot)) return;
        if (!state.connected) { status.textContent = 'Reconnect to react.'; return; }
        const mine = values[id]?.[person];
        const value = mine?.noteUpdatedAt === note.updatedAt && mine.emoji === key ? null : { emoji: key, noteUpdatedAt: note.updatedAt };
        pending.add(slot); status.textContent = 'Saving reaction…'; render();
        const slow = setTimeout(() => { if (epoch === generation && pending.has(slot)) status.textContent = 'Still saving. Keep this page open.'; }, 8000);
        try {
          await backend.saveReaction(id, person, value);
          if (epoch === generation) { status.textContent = value ? 'Reaction saved ✓' : 'Reaction removed'; area.querySelector('details').open = false; }
        } catch {
          if (epoch === generation) status.textContent = 'Couldn’t save reaction. The note may have changed—try again.';
        } finally { clearTimeout(slow); if (epoch === generation) { pending.delete(slot); render(); } }
      });
      area.querySelector('.emoji-options').append(button);
    }
  }
  function render() {
    const state = getState();
    for (const [id, area] of cards) {
      area.hidden = !state.ready || !state.notes[id]?.text;
      const members = current(id);
      const list = area.querySelector('.reaction-list');
      const signature = JSON.stringify([state.chosen, members.map(([person]) => [person, values[id][person].emoji])]);
      if (list.dataset.signature !== signature) {
        list.dataset.signature = signature; list.replaceChildren();
        for (const [key, emoji, label] of emojis) {
          const reactors = members.filter(([person]) => values[id][person].emoji === key);
          if (!reactors.length) continue;
          const chip = document.createElement('button'); chip.className = 'reaction-chip';
          chip.classList.toggle('mine', reactors.some(([person]) => person === state.chosen));
          chip.textContent = `${emoji} ${reactors.length}`;
          chip.setAttribute('aria-label', `${label}: ${reactors.length}. See who reacted`);
          chip.addEventListener('click', () => { viewing = [id, key]; showNames(); dialog.showModal(); });
          list.append(chip);
        }
      }
      for (const button of area.querySelectorAll('.emoji-option')) {
        const mine = values[id]?.[state.chosen];
        button.setAttribute('aria-pressed', String(mine?.noteUpdatedAt === state.notes[id]?.updatedAt && mine?.emoji === button.dataset.emoji));
        button.disabled = !ready || !state.connected || state.saving || pending.has(`${id}/${state.chosen}`);
      }
      if (failed) area.querySelector('.reaction-status').textContent = 'Reactions need the updated Firebase rules. Ask Steve to publish them, then reload.';
    }
    showNames();
  }
  function reset() {
    generation++; stop(); stop = () => {}; pending.clear(); values = {}; ready = false; failed = false;
    if (dialog.open) dialog.close();
    for (const area of cards.values()) { area.querySelector('.reaction-status').textContent = ''; area.querySelector('details').open = false; }
    render();
  }
  function listen() {
    stop = backend.watchReactions(value => { values = value; ready = true; failed = false; render(); }, () => { values = {}; ready = false; failed = true; render(); });
  }
  return { attach, render, reset, listen, isPending: () => pending.size > 0 };
}
