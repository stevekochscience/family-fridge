import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import { getDatabase, ref, onValue, set, runTransaction, push, get, query, orderByKey, endBefore, startAfter, limitToLast, limitToFirst, serverTimestamp } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-database.js';
import { firebaseConfig, sharedEmail } from './config.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const people = ['sam', 'grace', 'lisa', 'steve', 'marshall', 'ideas'];
const entries = snapshot => {
  const result = [];
  snapshot.forEach(child => { result.push({ ...child.val(), id: child.key }); });
  return result;
};
export const watchAuth = callback => onAuthStateChanged(auth, callback);
export const login = password => signInWithEmailAndPassword(auth, sharedEmail, password);
export const logout = () => signOut(auth);
export const watchConnection = callback => onValue(ref(db, '.info/connected'), snapshot => callback(snapshot.val() === true));

// Download only the newest two entries per person, regardless of total history.
export function watchNotes(callback, failure) {
  const notes = {}, loaded = new Set();
  const stops = people.map(person => onValue(query(ref(db, `boards/${person}`), orderByKey(), limitToLast(2)), snapshot => {
    const list = entries(snapshot);
    if (list.length) notes[person] = { ...list.at(-1), hasOlder: list.length > 1 };
    else delete notes[person];
    loaded.add(person);
    if (loaded.size === people.length) callback({ ...notes });
  }, failure));
  return () => stops.forEach(stop => stop());
}
export async function saveNote(person, text, author) {
  const note = push(ref(db, `boards/${person}`));
  await set(note, { text, updatedAt: serverTimestamp(), ...(person === 'ideas' ? { author } : {}) });
}
export async function getAdjacent(person, id, direction) {
  const list = entries(await get(query(ref(db, `boards/${person}`), orderByKey(),
    ...(direction === 'older' ? [endBefore(id), limitToLast(2)] : [startAfter(id), limitToFirst(1)]))));
  if (!list.length) return null;
  return direction === 'older' ? { ...list.at(-1), hasOlder: list.length > 1 } : { ...list[0], hasOlder: true };
}
export const watchNote = (person, id, callback, failure) => onValue(ref(db, `boards/${person}/${id}`), snapshot => callback(snapshot.exists() ? { ...snapshot.val(), id: snapshot.key } : null), failure);
export const saveReaction = (person, noteId, reactor, emoji) => set(ref(db, `boards/${person}/${noteId}/reactions/${reactor}`), emoji);

export const watchPhotos = (callback, failure) => onValue(ref(db, 'photos'), snapshot => callback(snapshot.val()), failure);
export const savePhoto = (person, data) => set(ref(db, `photos/${person}`), data ? { data, updatedAt: serverTimestamp() } : null);

// A transaction checks the displayed photo version before touching reactions.
// If an upload replaces it meanwhile, the old reaction is never transferred.
export async function savePhotoReaction(person, timestamp, reactor, value) {
  const result = await runTransaction(ref(db, 'photos/' + person), photo => {
    if (!photo || photo.updatedAt !== timestamp) return;
    const reactions = { ...photo.reactions };
    if (value) reactions[reactor] = { text: value.text, photoUpdatedAt: timestamp };
    else delete reactions[reactor];
    return { ...photo, reactions: Object.keys(reactions).length ? reactions : null };
  }, { applyLocally: false });
  if (!result.committed) throw new Error('This photo changed. React to the new photo instead.');
}
