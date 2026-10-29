// Photos are re-encoded locally: no original file or metadata is uploaded.
export async function compressPhoto(file) {
  if (!file || file.size > 20 * 1024 * 1024) throw new Error('Choose a photo smaller than 20 MB.');
  let bitmap;
  try { bitmap = await createImageBitmap(file); }
  catch { throw new Error('This photo format could not be opened. Try a JPEG, PNG, or WebP photo.'); }
  try {
    if (bitmap.width * bitmap.height > 50000000) throw new Error('This photo is too large to process. Choose a smaller version.');
    const canvas = document.createElement('canvas');
    let edge = 1200;
    while (edge >= 240) {
      const ratio = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
      canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
      const context = canvas.getContext('2d');
      context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.82, 0.65, 0.45]) {
        const data = canvas.toDataURL('image/jpeg', quality);
        if (data.length <= 200023) return data;
      }
      edge = Math.floor(edge * 0.75);
    }
    throw new Error('Could not shrink this photo enough. Try a different photo.');
  } finally { bitmap.close(); }
}

export function createAlbum({ backend, people, getState, onChange }) {
  const card = document.createElement('article'); card.className = 'note album';
  card.setAttribute('aria-label', 'Family photo album');
  card.innerHTML = '<h3>📷 Family photo album</h3><p class="album-hint">One little photo each. New uploads replace your previous photo.</p><figure><img class="album-photo" hidden alt=""><figcaption aria-live="polite"></figcaption></figure><p class="album-empty">Opening the album…</p><div class="album-nav"><button class="photo-prev quiet" aria-label="Previous photo">← Previous</button><span class="photo-position"></span><button class="photo-next quiet" aria-label="Next photo">Next →</button></div><div class="album-actions"><button class="photo-choose">Add my photo</button><input class="photo-file" type="file" accept="image/*" hidden><button class="photo-remove quiet" hidden>Remove mine</button></div><div class="photo-draft" hidden><p>Preview — only saved when you tap Save photo.</p><img alt="Your photo preview"><div class="actions"><button class="photo-save">Save photo</button><button class="photo-cancel quiet">Cancel</button></div></div><p class="photo-status" role="status"></p>';
  document.querySelector('#notes').append(card);
  const $ = selector => card.querySelector(selector);
  let photos = {}, selected = '', draft = '', busy = false, loaded = false, epoch = 0, stop = () => {};
  const status = message => { $('.photo-status').textContent = message; };
  function render() {
    const state = getState(), entries = people.filter(([id]) => photos[id]);
    if (!photos[selected]) selected = entries[0]?.[0] || '';
    const photo = photos[selected], name = people.find(([id]) => id === selected)?.[1];
    const img = $('.album-photo'); img.hidden = !photo;
    if (photo) { if (img.getAttribute('src') !== photo.data) img.src = photo.data; img.alt = `${name}’s photo`; }
    else img.removeAttribute('src');
    $('figcaption').textContent = photo ? `${name} · ${new Date(photo.updatedAt).toLocaleDateString()}` : '';
    $('.album-empty').hidden = Boolean(photo);
    $('.album-empty').textContent = loaded ? 'The fridge is waiting for its first photo.' : 'Opening the album…';
    $('.photo-position').textContent = photo ? `${entries.findIndex(([id]) => id === selected) + 1} / ${entries.length}` : '';
    for (const button of card.querySelectorAll('.album-nav button')) button.disabled = entries.length < 2;
    $('.photo-choose').textContent = photos[state.chosen] ? 'Replace my photo' : 'Add my photo';
    $('.photo-remove').hidden = !photos[state.chosen];
    for (const button of card.querySelectorAll('.album-actions button, .photo-save')) button.disabled = busy || !loaded || !state.connected || !state.chosen;
    $('.photo-cancel').disabled = busy;
    $('.photo-draft').hidden = !draft;
    const preview = $('.photo-draft img');
    if (draft) { if (preview.getAttribute('src') !== draft) preview.src = draft; }
    else preview.removeAttribute('src');
  }
  const refresh = () => { render(); onChange(); };
  function move(direction) { const ids = people.filter(([id]) => photos[id]).map(([id]) => id); if (ids.length) selected = ids[(ids.indexOf(selected) + direction + ids.length) % ids.length]; render(); }
  $('.photo-prev').onclick = () => move(-1); $('.photo-next').onclick = () => move(1);
  $('.photo-choose').onclick = () => $('.photo-file').click();
  $('.photo-cancel').onclick = () => { draft = ''; status(''); refresh(); };
  $('.photo-file').onchange = async () => {
    const file = $('.photo-file').files[0]; $('.photo-file').value = '';
    if (!file || busy) return;
    const token = epoch; busy = true; status('Shrinking your photo…'); refresh();
    try { const data = await compressPhoto(file); if (token === epoch) { draft = data; status('Ready to save.'); } }
    catch (error) { if (token === epoch) status(error.message); }
    finally { if (token === epoch) { busy = false; refresh(); } }
  };
  async function save(data) {
    const state = getState(); if (busy || !loaded || !state.connected || !state.chosen) return;
    const token = epoch, person = state.chosen; busy = true; status('Saving photo…'); refresh();
    const timer = setTimeout(() => { if (token === epoch) status('Still saving. Keep this page open.'); }, 8000);
    try { await backend.savePhoto(person, data); if (token === epoch) { draft = ''; if (data) selected = person; status(data ? 'Photo saved ✓' : 'Photo removed'); } }
    catch { if (token === epoch) status('Couldn’t save. Your preview is still here; try again.'); }
    finally { clearTimeout(timer); if (token === epoch) { busy = false; refresh(); } }
  }
  $('.photo-save').onclick = () => { if (draft) save(draft); };
  $('.photo-remove').onclick = () => { if (confirm('Remove your photo from the album?')) save(null); };
  function reset() { epoch++; stop(); stop = () => {}; photos = {}; selected = ''; draft = ''; busy = false; loaded = false; status(''); render(); }
  function start() {
    reset(); const token = epoch;
    stop = backend.watchPhotos(value => { if (token === epoch) { photos = value || {}; loaded = true; render(); } }, () => { if (token === epoch) { photos = {}; loaded = false; render(); status('Couldn’t open the album. Reload to try again.'); } });
  }
  return { start, reset, render, isPending: () => busy || Boolean(draft) };
}
