const DB_NAME = 'carnet-terrain-demo';
const STORE_NAME = 'entries';
let deferredPrompt = null;

const form = document.getElementById('entryForm');
const entriesEl = document.getElementById('entries');
const flashEl = document.getElementById('flash');
const netBadge = document.getElementById('netBadge');
const installBtn = document.getElementById('installBtn');

function showFlash(message) {
  flashEl.textContent = message;
  window.setTimeout(() => {
    if (flashEl.textContent === message) flashEl.textContent = '';
  }, 2500);
}

function updateNetworkBadge() {
  const online = navigator.onLine;
  netBadge.textContent = online ? 'En ligne' : 'Hors ligne';
  netBadge.className = `badge ${online ? 'online' : 'offline'}`;
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch((error) => {
      console.error('Service worker non enregistré', error);
    });
  }
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredPrompt = event;
  installBtn.classList.remove('hidden');
});

installBtn.addEventListener('click', async () => {
  if (!deferredPrompt) {
    showFlash('Utilisez “Ajouter à l’écran d’accueil” si ce bouton ne s’affiche pas.');
    return;
  }
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installBtn.classList.add('hidden');
});

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore(mode, action) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const result = action(store);

    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
  });
}

async function saveEntry(entry) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getEntries() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve((req.result || []).sort((a, b) => b.id - a.id));
    req.onerror = () => reject(req.error);
  });
}

async function deleteEntry(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function clearEntries() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function formatDateForInput(date = new Date()) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function toCsv(entries) {
  const headers = ['id', 'date', 'operateur', 'site', 'echantillon', 'valeur', 'unite', 'commentaire', 'synchronise'];
  const lines = entries.map((entry) => [
    entry.id,
    entry.entryDate,
    entry.operator,
    entry.site,
    entry.sample,
    entry.value,
    entry.unit,
    entry.comment,
    entry.synced ? 'oui' : 'non'
  ].map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(','));

  return [headers.join(','), ...lines].join('\n');
}

function downloadText(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function renderEntries() {
  const entries = await getEntries();

  document.getElementById('countAll').textContent = String(entries.length);
  document.getElementById('countPending').textContent = String(entries.filter((item) => !item.synced).length);
  document.getElementById('countSynced').textContent = String(entries.filter((item) => item.synced).length);

  if (!entries.length) {
    entriesEl.innerHTML = '<div class="empty">Aucune saisie enregistrée pour le moment.</div>';
    return;
  }

  entriesEl.innerHTML = entries.map((entry) => `
    <article class="entry">
      <div class="entry-top">
        <div>
          <h3>${escapeHtml(entry.site)} · ${escapeHtml(entry.sample)}</h3>
          <p><strong>${escapeHtml(entry.value)} ${escapeHtml(entry.unit)}</strong> — ${escapeHtml(entry.operator)}</p>
          <p>${escapeHtml(entry.entryDate)}</p>
          <p>${escapeHtml(entry.comment || 'Sans commentaire')}</p>
        </div>
        <span class="pill ${entry.synced ? 'synced' : 'pending'}">${entry.synced ? 'Synchronisé' : 'En attente'}</span>
      </div>
      <div class="actions">
        <button class="btn secondary js-sync" data-id="${entry.id}" type="button">Marquer synchronisé</button>
        <button class="btn danger js-delete" data-id="${entry.id}" type="button">Supprimer</button>
      </div>
    </article>
  `).join('');
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const entry = {
    id: Date.now(),
    entryDate: document.getElementById('entryDate').value,
    operator: document.getElementById('operator').value.trim(),
    site: document.getElementById('site').value.trim(),
    sample: document.getElementById('sample').value.trim(),
    value: document.getElementById('value').value,
    unit: document.getElementById('unit').value.trim(),
    comment: document.getElementById('comment').value.trim(),
    synced: false,
    createdAt: new Date().toISOString()
  };

  await saveEntry(entry);
  form.reset();
  document.getElementById('entryDate').value = formatDateForInput();
  document.getElementById('unit').value = 'mg/L';
  await renderEntries();
  showFlash('Saisie enregistrée dans le téléphone.');
});

document.getElementById('reloadBtn').addEventListener('click', renderEntries);

document.getElementById('exportCsvBtn').addEventListener('click', async () => {
  const entries = await getEntries();
  if (!entries.length) {
    showFlash('Aucune donnée à exporter.');
    return;
  }
  downloadText('carnet-terrain.csv', toCsv(entries), 'text/csv;charset=utf-8');
});

document.getElementById('exportJsonBtn').addEventListener('click', async () => {
  const entries = await getEntries();
  if (!entries.length) {
    showFlash('Aucune donnée à exporter.');
    return;
  }
  downloadText('carnet-terrain.json', JSON.stringify(entries, null, 2), 'application/json;charset=utf-8');
});

document.getElementById('clearBtn').addEventListener('click', async () => {
  const ok = window.confirm('Supprimer toutes les saisies locales ?');
  if (!ok) return;
  await clearEntries();
  await renderEntries();
  showFlash('Mémoire locale vidée.');
});

entriesEl.addEventListener('click', async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  const id = Number(target.dataset.id);
  if (!id) return;

  if (target.classList.contains('js-delete')) {
    await deleteEntry(id);
    await renderEntries();
    showFlash('Saisie supprimée.');
    return;
  }

  if (target.classList.contains('js-sync')) {
    const entries = await getEntries();
    const item = entries.find((entry) => entry.id === id);
    if (!item) return;
    item.synced = true;
    await saveEntry(item);
    await renderEntries();
    showFlash('Statut de synchronisation mis à jour.');
  }
});

window.addEventListener('online', updateNetworkBadge);
window.addEventListener('offline', updateNetworkBadge);

updateNetworkBadge();
registerServiceWorker();
document.getElementById('entryDate').value = formatDateForInput();
renderEntries();
