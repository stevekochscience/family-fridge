import * as backend from './backend.js';
import { sharedUid } from './config.js';

const people = [['sam', 'Sammy'], ['grace', 'Gracie'], ['lisa', 'Lisa'], ['steve', 'Steve'], ['marshall', 'Marshall']];
const $ = selector => document.querySelector(selector);
let chosen = '';
try { chosen = localStorage.getItem('fridge-person') || ''; } catch { /* Storage can be blocked. */ }
if (!people.some(([id]) => id === chosen)) chosen = '';
let notes = {}, editing = '', saving = false, connected = false, ready = false;
let stopNotes = () => {}, stopConnection = () => {};
const cards = new Map();

function show(id) {
  for (const section of ['login', 'choose', 'board']) $(`#${section}`).hidden = section !== id;
}
function errorText(error) {
  if (['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found'].includes(error.code)) return 'That password didn’t open the fridge. Try again.';
  if (error.code === 'auth/too-many-requests') return 'Too many tries. Give it a moment, then try again.';
  if (error.code === 'auth/network-request-failed') return 'Couldn’t connect. Check your internet and try again.';
  return 'Something went wrong. Try again; if it keeps happening, ask Steve to check the setup.';
}
function selectPerson(id) {
  chosen = id;
  try { localStorage.setItem('fridge-person', id); } catch { /* Selection still works for this visit. */ }
  $('#identity').textContent = id === 'marshall' ? 'You’re speaking for Marshall 🐾' : `You’re ${people.find(([key]) => key === id)[1]}`;
  show('board'); render();
}
for (const [id, name] of people) {
  const button = document.createElement('button'); button.className = id; button.textContent = id === 'marshall' ? '🐾 Marshall' : name;
  button.addEventListener('click', () => selectPerson(id)); $('#names').append(button);
  const card = document.createElement('article'); card.className = `note ${id}`; card.setAttribute('aria-label', `${name}’s note`);
  // Only fixed application markup is inserted as HTML. Messages use textContent/value.
  card.innerHTML = `<div class="note-heading"><h3>${name}</h3><span class="yours" hidden>you</span></div><p class="message"></p><form class="editor" hidden><label for="note-${id}">Your note</label><textarea id="note-${id}" maxlength="280"></textarea><p class="counter"></p><div class="actions"><button type="submit">Save</button><button type="button" class="quiet cancel">Cancel</button></div></form><div class="note-bottom"><span class="timestamp"></span><button class="edit" hidden>Edit</button></div><p class="note-status" role="status"></p>`;
  if (id === 'marshall') {
    const ribbon = document.createElement('p'); ribbon.className = 'dog-ribbon'; ribbon.textContent = '🐾 CHIEF CUDDLE OFFICER'; card.prepend(ribbon);
    const teddy = document.createElement('span'); teddy.className = 'teddy'; teddy.textContent = '🧸'; teddy.setAttribute('aria-hidden', 'true'); card.querySelector('h3').prepend(teddy);
    card.querySelector('.yours').textContent = 'your human';
    card.querySelector('label').textContent = 'A note from Marshall';
  }
  const textarea = card.querySelector('textarea');
  textarea.addEventListener('input', () => { card.querySelector('.counter').textContent = `${textarea.value.length}/280`; });
  card.querySelector('.edit').addEventListener('click', () => {
    editing = id; textarea.value = notes[id]?.text || ''; textarea.dispatchEvent(new Event('input'));
    card.querySelector('.note-status').textContent = ''; render(); textarea.focus();
  });
  card.querySelector('.cancel').addEventListener('click', () => { editing = ''; render(); card.querySelector('.edit').focus(); });
  card.querySelector('form').addEventListener('submit', async event => {
    event.preventDefault();
    if (saving || id !== chosen || editing !== id) return;
    if (!connected || !ready) { card.querySelector('.note-status').textContent = 'Not connected. Keep your note here and try again when online.'; return; }
    if (textarea.value.length > 280) return;
    saving = true; card.querySelector('.note-status').textContent = 'Saving…'; render();
    const slow = setTimeout(() => { if (saving) card.querySelector('.note-status').textContent = 'Still waiting for the server. Keep this page open.'; }, 8000);
    try {
      await backend.saveNote(id, textarea.value);
      editing = ''; card.querySelector('.note-status').textContent = 'Saved ✓';
    } catch {
      card.querySelector('.note-status').textContent = 'Couldn’t save. Your draft is still here—try again.';
    } finally { clearTimeout(slow); saving = false; render(); if (!editing) card.querySelector('.edit').focus(); }
  });
  $('#notes').append(card); cards.set(id, card);
}
function render() {
  for (const [id, card] of cards) {
    const note = notes[id]; const mine = id === chosen; const isEditing = editing === id;
    card.querySelector('.yours').hidden = !mine;
    const message = card.querySelector('.message'); message.hidden = isEditing;
    message.textContent = !ready ? 'Opening this note…' : note?.text || (id === 'marshall' ? 'Available for cuddles. Payment accepted in treats.' : 'Nothing on the fridge yet.');
    message.classList.toggle('empty', !note?.text);
    card.querySelector('.editor').hidden = !isEditing;
    const edit = card.querySelector('.edit'); edit.hidden = !mine || isEditing; edit.disabled = !ready;
    card.querySelector('textarea').disabled = saving;
    for (const button of card.querySelectorAll('.editor button')) button.disabled = saving;
    const stamp = card.querySelector('.timestamp');
    stamp.textContent = note?.updatedAt ? `Updated ${new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(note.updatedAt))}` : id === 'marshall' ? 'Very good boy. Very important note.' : 'A little space for you.';
  }
  $('#change').disabled = saving; $('#logout').disabled = saving;
}
$('#login-form').addEventListener('submit', async event => {
  event.preventDefault(); $('#unlock').disabled = true; $('#login-status').textContent = 'Opening…';
  try { await backend.login($('#password').value); $('#password').value = ''; $('#login-status').textContent = ''; }
  catch (error) { $('#login-status').textContent = errorText(error); }
  finally { $('#unlock').disabled = false; }
});
$('#change').addEventListener('click', () => {
  if (editing && !confirm('Discard your unsaved note and switch names?')) return;
  editing = ''; show('choose');
});
$('#logout').addEventListener('click', async () => {
  if (editing && !confirm('Discard your unsaved note and sign out?')) return;
  try { await backend.logout(); } catch { $('#board-status').textContent = 'Couldn’t sign out. Check your connection and try again.'; }
});
window.addEventListener('beforeunload', event => { if (editing || saving) { event.preventDefault(); event.returnValue = ''; } });
backend.watchAuth(user => {
  stopNotes(); stopConnection(); notes = {}; ready = false; connected = false; editing = ''; render();
  $('#boot').hidden = true; $('#board-status').textContent = '';
  $('#logout').hidden = !user;
  if (!user || user.uid !== sharedUid) {
    show('login');
    if (user) { $('#login-status').textContent = 'This account doesn’t have a key to this fridge.'; backend.logout().catch(() => {}); }
    return;
  }
  if (chosen) selectPerson(chosen); else show('choose');
  stopConnection = backend.watchConnection(value => {
    connected = value;
    $('#connection').textContent = value ? '● Connected · updates arrive automatically' : '○ Reconnecting · notes may be out of date';
  });
  stopNotes = backend.watchNotes(value => { notes = value; ready = true; $('#board-status').textContent = ''; render(); }, () => {
    ready = false; notes = {}; render(); $('#board-status').textContent = 'Can’t read the fridge. Ask Steve to check the database rules, then reload.';
  });
});
