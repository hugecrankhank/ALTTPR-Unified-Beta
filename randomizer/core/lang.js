// Minimal stand-in for Laravel's __() translation helper (English only).
import data from '../data/lang-en.js';

function arrGet(arr, key) {
  if (arr == null) return undefined;
  if (Object.prototype.hasOwnProperty.call(arr, key)) return arr[key];
  if (!key.includes('.')) return undefined;
  for (const seg of key.split('.')) {
    if (arr != null && typeof arr === 'object' && Object.prototype.hasOwnProperty.call(arr, seg)) arr = arr[seg];
    else return undefined;
  }
  return arr;
}

export function lang(key) {
  const i = key.indexOf('.');
  if (i < 0) return key;
  const group = data[key.slice(0, i)];
  const v = arrGet(group, key.slice(i + 1));
  return v === undefined || v === null ? key : v;
}
