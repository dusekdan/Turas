// Versioned JSON export/import. Images (Blobs) are embedded as base64 data URLs
// so a single file fully restores the app on a new device.

import { STORES, getAll, kvGet, kvSet, put, clearStore, openDB } from '../db.js';
import { markEvent } from './achievements.js';

const EXPORT_VERSION = 1;
const KV_KEYS = ['profile', 'badges'];

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

async function dataURLToBlob(url) {
  const res = await fetch(url);
  return res.blob();
}

export async function buildExport() {
  const data = { app: 'turas', version: EXPORT_VERSION, exportedAt: new Date().toISOString(), kv: {}, stores: {} };
  for (const k of KV_KEYS) {
    const v = await kvGet(k);
    if (v !== undefined) data.kv[k] = v;
  }
  for (const s of STORES) {
    if (s === 'kv') continue;
    const rows = await getAll(s);
    if (s === 'images') {
      data.stores.images = await Promise.all(rows.map(async (img) => {
        if (img.blob) {
          const { blob, ...rest } = img;
          return { ...rest, dataUrl: await blobToDataURL(blob) };
        }
        return img;
      }));
    } else {
      data.stores[s] = rows;
    }
  }
  return data;
}

export async function downloadExport() {
  const data = await buildExport();
  const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `turas-backup-${data.exportedAt.slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  await markEvent('exported');
}

/** Replaces all current data with the backup contents. Caller confirms first. */
export async function importBackup(json) {
  if (!json || json.app !== 'turas' || typeof json.version !== 'number') {
    throw new Error('Not a Turas backup file.');
  }
  if (json.version > EXPORT_VERSION) {
    throw new Error('Backup was made by a newer version of Turas. Update the app first.');
  }
  await openDB();
  for (const s of STORES) await clearStore(s);
  for (const [k, v] of Object.entries(json.kv || {})) await kvSet(k, v);
  for (const [store, rows] of Object.entries(json.stores || {})) {
    if (!STORES.includes(store) || store === 'kv') continue;
    for (const row of rows || []) {
      if (store === 'images' && row.dataUrl) {
        const { dataUrl, ...rest } = row;
        rest.blob = await dataURLToBlob(dataUrl);
        await put('images', rest);
      } else {
        await put(store, row);
      }
    }
  }
}
