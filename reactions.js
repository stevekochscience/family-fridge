const emojis = [['heart', '❤️', 'Love'], ['laugh', '😂', 'Laugh'], ['like', '👍', 'Like'], ['wow', '😮', 'Wow'], ['hug', '🤗', 'Hug'], ['paw', '🐾', 'Paw']];

export function createReactions({ people, backend, getState }) {
  const cards = new Map(), pending = new Set();
  let generation = 0, viewing = null;
  const dialog = document.createElement('dialog'); dialog.className = 'reaction-dialog';
  dialog.setAttribute('aria-labelledby', 'reaction-title');
  dialog.innerHTML = '<h2 id="reaction-title"></h2><p class="reaction-names"></p><form method="dialog"><button>Close</button></form>';
  document.body.append(dialog);
  dialog.addEventListener('click', event => { if (event.target === dialog) { const box = dialog.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close(); } });
  dialog.addEventListener('close', () => { viewing = null; });
  function current(id) {
    const note = getState().notes[id];
    return people.filter(([person]) => emojis.some(([key]) => key === note?.reactions?.[person]));
  }
  function showNames() {
    if (!viewing) return;
    const [id, noteId, key] = viewing, note = getState().notes[id];
    if (note?.id !== noteId) { dialog.close(); viewing = null; return; }
    const [, emoji, label] = emojis.find(([value]) => value === key);
    dialog.querySelector('h2').textContent = `${emoji} ${label}`;
    const names = current(id).filter(([person]) => note.reactions[person] === key).map(([, name]) => name);
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
        const state = getState(), person = state.chosen, note = state.notes[id], epoch = generation;
        if (!state.ready || !note?.text || !person || state.saving) return;
        const slot = `${id}/${note.id}/${person}`, status = area.querySelector('.reaction-status');
        if (pending.has(slot)) return;
        if (!state.connected) { status.textContent = 'Reconnect to react.'; return; }
        const value = note.reactions?.[person] === key ? null : key;
        pending.add(slot); status.textContent = 'Saving reaction…'; render();
        const stillHere = () => epoch === generation && getState().notes[id]?.id === note.id;
        const slow = setTimeout(() => { if (stillHere() && pending.has(slot)) status.textContent = 'Still saving. Keep this page open.'; }, 8000);
        try {
          await backend.saveReaction(id, note.id, person, value);
          if (stillHere()) { status.textContent = value ? 'Reaction saved ✓' : 'Reaction removed'; area.querySelector('details').open = false; }
        } catch { if (stillHere()) status.textContent = 'Couldn’t save reaction. Try again.'; }
        finally { clearTimeout(slow); if (epoch === generation) { pending.delete(slot); render(); } }
      });
      area.querySelector('.emoji-options').append(button);
    }
  }
  function render() {
    const state = getState();
    for (const [id, area] of cards) {
      const note = state.notes[id], members = current(id);
      area.hidden = !state.ready || !note?.text;
      if (area.dataset.note !== note?.id) { area.dataset.note = note?.id || ''; area.querySelector('details').open = false; area.querySelector('.reaction-status').textContent = ''; }
      const list = area.querySelector('.reaction-list');
      const signature = JSON.stringify([note?.id, state.chosen, members.map(([person]) => [person, note.reactions[person]])]);
      if (list.dataset.signature !== signature) {
        list.dataset.signature = signature; list.replaceChildren();
        for (const [key, emoji, label] of emojis) {
          const reactors = members.filter(([person]) => note.reactions[person] === key);
          if (!reactors.length) continue;
          const chip = document.createElement('button'); chip.className = 'reaction-chip';
          chip.classList.toggle('mine', reactors.some(([person]) => person === state.chosen));
          chip.textContent = `${emoji} ${reactors.length}`; chip.setAttribute('aria-label', `${label}: ${reactors.length}. See who reacted`);
          chip.addEventListener('click', () => { viewing = [id, note.id, key]; showNames(); dialog.showModal(); }); list.append(chip);
        }
      }
      for (const button of area.querySelectorAll('.emoji-option')) {
        button.setAttribute('aria-pressed', String(note?.reactions?.[state.chosen] === button.dataset.emoji));
        button.disabled = !state.ready || !state.connected || state.saving || pending.has(`${id}/${note?.id}/${state.chosen}`);
      }
    }
    showNames();
  }
  function reset() {
    generation++; pending.clear(); if (dialog.open) dialog.close(); viewing = null;
    for (const area of cards.values()) { area.querySelector('.reaction-status').textContent = ''; area.querySelector('details').open = false; }
  }
  return { attach, render, reset, isPending: () => pending.size > 0 };
}
