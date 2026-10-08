// Laravel config() lookup (Illuminate\Support\Arr::get semantics) over the
// randomizer's static config files.
import data from '../data/config.js';

export function arrGet(arr, key, def = null) {
  if (key == null) return arr;
  if (arr != null && typeof arr === 'object' && Object.prototype.hasOwnProperty.call(arr, key)) return arr[key];
  if (!String(key).includes('.')) return def;
  for (const seg of String(key).split('.')) {
    if (arr != null && typeof arr === 'object' && Object.prototype.hasOwnProperty.call(arr, seg)) arr = arr[seg];
    else return def;
  }
  return arr;
}

export function config(key, def = null) {
  return arrGet(data, key, def);
}
