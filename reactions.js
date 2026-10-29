const emojis = [['heart', '❤️', 'Love'], ['laugh', '😂', 'Laugh'], ['like', '👍', 'Like'], ['wow', '😮', 'Wow'], ['hug', '🤗', 'Hug'], ['paw', '🐾', 'Paw']];

const reactionText = value => typeof value === 'string' ? emojis.find(([key]) => key === value)?.[1] || '' : value?.text || '';

export function createReactions({ people, backend, getState, dialogId = 'reaction-title', onPendingChange = () => {} }) {
  const cards = new Map(), pending = new Set();
  let generation = 0, viewing = null;
  const dialog = document.createElement('dialog'); dialog.className = 'reaction-dialog';
  dialog.setAttribute('aria-labelledby', dialogId);
  dialog.innerHTML = '<h2 id="reaction-title"></h2><p class="reaction-names"></p><form method="dialog"><button>Close</button></form>';
  dialog.querySelector('h2').id = dialogId;
  document.body.append(dialog);
  dialog.addEventListener('click', event => { if (event.target === dialog) { const box = dialog.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close(); } });
  dialog.addEventListener('close', () => { viewing = null; });
  function current(id) {
    const note = getState().notes[id];
    return people.filter(([person]) => reactionText(note?.reactions?.[person]));
  }
  function showNames() {
    if (!viewing) return;
    const [id, noteId, key] = viewing, note = getState().notes[id];
    if (note?.id !== noteId) { dialog.close(); viewing = null; return; }
    const emoji = key, label = '';
    dialog.querySelector('h2').textContent = `${emoji} ${label}`;
    const names = current(id).filter(([person]) => reactionText(note.reactions[person]) === key).map(([, name]) => name);
    dialog.querySelector('.reaction-names').textContent = names.length ? names.join(', ') : 'No reactions to this note yet.';
  }
  function attach(card, id) {
    const area = document.createElement('div'); area.className = 'reactions';
    area.innerHTML = '<div class="reaction-list" aria-label="Reactions"></div><details class="reaction-picker"><summary>React <span aria-hidden="true">☺</span></summary><div class="emoji-options"></div><form class="custom-reaction"><label>Emoji or short reaction<input class="reaction-input" maxlength="32" placeholder="Paste an emoji or type cool!" required></label><button type="submit">Send</button><button type="button" class="quiet remove-reaction">Remove mine</button></form><p class="reaction-hint">One per person · up to 32 characters.</p></details><p class="reaction-status" role="status"></p>';
    card.append(area); cards.set(id, area);
    async function save(value) {
        const state = getState(), person = state.chosen, note = state.notes[id], epoch = generation;
        if (!state.ready || !note?.text || !person || state.saving) return;
        const slot = `${id}/${note.id}/${person}`, status = area.querySelector('.reaction-status');
        if (pending.has(slot)) return;
        if (!state.connected) { status.textContent = 'Reconnect to react.'; return; }
        pending.add(slot); onPendingChange(); status.textContent = 'Saving reaction…'; render();
        const stillHere = () => epoch === generation && getState().notes[id]?.id === note.id;
        const slow = setTimeout(() => { if (stillHere() && pending.has(slot)) status.textContent = 'Still saving. Keep this page open.'; }, 8000);
        try {
          await backend.saveReaction(id, note.id, person, value);
          if (stillHere()) { status.textContent = value ? 'Reaction saved ✓' : 'Reaction removed'; area.querySelector('details').open = false; }
        } catch { if (stillHere()) status.textContent = 'Couldn’t save reaction. Try again.'; }
        finally { clearTimeout(slow); if (epoch === generation) { pending.delete(slot); render(); onPendingChange(); } }
    }
    area.querySelector('.custom-reaction').addEventListener('submit', event => { event.preventDefault(); const text = area.querySelector('input').value.trim(); if (text && text.length <= 32) save({ text }); });
    area.querySelector('.remove-reaction').addEventListener('click', () => save(null));
    for (const [key, emoji, label] of emojis) {
      const button = document.createElement('button'); button.className = 'emoji-option'; button.textContent = emoji;
      button.dataset.emoji = key; button.setAttribute('aria-label', label); button.title = label;
      button.addEventListener('click', () => { const mine = reactionText(getState().notes[id]?.reactions?.[getState().chosen]); save(mine === emoji ? null : { text: emoji }); });
      area.querySelector('.emoji-options').append(button);
    }
  }
  function render() {
    const state = getState();
    for (const [id, area] of cards) {
      const note = state.notes[id], members = current(id);
      area.hidden = !state.ready || !note?.text;
      if (area.dataset.note !== note?.id) { area.dataset.note = note?.id || ''; area.querySelector('details').open = false; area.querySelector('.reaction-status').textContent = ''; area.querySelector('input').value = ''; }
      const list = area.querySelector('.reaction-list');
      const signature = JSON.stringify([note?.id, state.chosen, members.map(([person]) => [person, note.reactions[person]])]);
      if (list.dataset.signature !== signature) {
        list.dataset.signature = signature; list.replaceChildren();
        for (const key of new Set(members.map(([person]) => reactionText(note.reactions[person])))) {
          const emoji = key, label = key;
          const reactors = members.filter(([person]) => reactionText(note.reactions[person]) === key);
          if (!reactors.length) continue;
          const chip = document.createElement('button'); chip.className = 'reaction-chip';
          chip.classList.toggle('mine', reactors.some(([person]) => person === state.chosen));
          chip.textContent = `${emoji} ${reactors.length}`; chip.setAttribute('aria-label', `${label}: ${reactors.length}. See who reacted`);
          chip.addEventListener('click', () => { viewing = [id, note.id, key]; showNames(); dialog.showModal(); }); list.append(chip);
        }
      }
      for (const control of area.querySelectorAll('.custom-reaction input, .custom-reaction button')) control.disabled = !state.ready || !state.connected || state.saving || pending.has(`${id}/${note?.id}/${state.chosen}`);
      area.querySelector('.remove-reaction').hidden = !note?.reactions?.[state.chosen];
      for (const button of area.querySelectorAll('.emoji-option')) {
        button.setAttribute('aria-pressed', String(reactionText(note?.reactions?.[state.chosen]) === emojis.find(([key]) => key === button.dataset.emoji)?.[1]));
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
