import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import { getDatabase, ref, onValue, set, serverTimestamp } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-database.js';
import { firebaseConfig, sharedEmail } from './config.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app); // Firebase persists sign-in when browser storage permits.
const db = getDatabase(app);
export const watchAuth = callback => onAuthStateChanged(auth, callback);
export const login = password => signInWithEmailAndPassword(auth, sharedEmail, password);
export const logout = () => signOut(auth);
export const watchNotes = (callback, failure) => onValue(ref(db, 'messages'), snapshot => callback(snapshot.val() || {}), failure);
export const watchConnection = callback => onValue(ref(db, '.info/connected'), snapshot => callback(snapshot.val() === true));
export const saveNote = (person, text) => set(ref(db, `messages/${person}`), { text, updatedAt: serverTimestamp() });
