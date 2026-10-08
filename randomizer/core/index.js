// Barrel for region modules: base classes and PHP helpers.
// Must not import worlds or regions (avoids module cycles).
export { Item, ItemAlias } from './item.js';
export { Location } from './location.js';
import './locations-special.js';
export { Region } from './region.js';
export { Boss } from './boss.js';
export { Shop } from './shop.js';
export { LocationCollection, ShopCollection, ItemCollection } from './collections.js';
export * from './php.js';
