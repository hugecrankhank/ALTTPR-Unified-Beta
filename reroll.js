/*
 * 🎲 Reroll: a new seed with exactly the current Randomizer settings, in one tap
 * from the header (also shown on phones, next to ⚙).
 *
 * It's the Randomizer bar's own Generate & Play with the Seed box emptied, so a
 * new random seed is made with whatever the bar is set to now: the generator
 * (alttpr.com or Kara's branch), Made by, preset and every setting, your sprite,
 * MSU pack and ROM options. Full edition only (Lite has no randomizer).
 */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };

  function reroll() {
    var gen = $('r-generate'), seed = $('r-seed');
    if (!gen || !seed) return;
    if (gen.disabled) return;   // a seed is being made already
    if (window.EJS_emulator &&
        !confirm('Reroll: start a new seed with the same settings?\n\nThe current game will be closed.')) return;
    seed.value = '';
    seed.dispatchEvent(new Event('input', { bubbles: true }));
    seed.dispatchEvent(new Event('change', { bubbles: true }));
    gen.click();
  }

  document.addEventListener('DOMContentLoaded', function () {
    var split = $('rando-split');
    if (!split || !$('r-generate')) return;
    var b = document.createElement('button');
    b.id = 'reroll-btn';
    b.type = 'button';
    b.title = 'Reroll: a new seed with the same settings';
    // a die drawn in the header's own colors (matches the Map button), + label
    b.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" ' +
      'stroke-width="1.9" stroke-linejoin="round"><rect x="3.5" y="3.5" width="17" height="17" rx="3.5"/>' +
      '<g fill="currentColor" stroke="none"><circle cx="8.5" cy="8.5" r="1.6"/><circle cx="15.5" cy="8.5" r="1.6"/>' +
      '<circle cx="12" cy="12" r="1.6"/><circle cx="8.5" cy="15.5" r="1.6"/><circle cx="15.5" cy="15.5" r="1.6"/></g></svg>' +
      '<span class="reroll-lbl">Reroll</span>';
    b.setAttribute('aria-label', 'Reroll');
    b.addEventListener('click', reroll);
    split.parentNode.insertBefore(b, split.nextSibling);
    var st = document.createElement('style');
    st.textContent = '#reroll-btn { white-space: nowrap; display: inline-flex; align-items: center; justify-content: center; gap: 6px; }' +
      '#reroll-btn svg { display: block; flex: none; }';
    document.head.appendChild(st);
  });
})();
