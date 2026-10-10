# ALTTPR Unified — emulator, auto-tracker and randomizer in your browser

A Link to the Past Randomizer with [Hutch's tracker](https://github.com/hutchch/ALTTPR-Tracker)
autotracking alongside the game, a seed generator (alttpr.com's and
[Kara's branch](#karas-branch)) and layouts for every screen:

- **Phone** (iPhone and other phones): the game on top, then **Items / Keys**,
  **Light World** and **Dark World** buttons to switch the one tracker panel below it,
  sized to fit the screen with no scrolling. The header's controls are behind **⚙**.
  Turned sideways, the game is on the left and the panel on the right.
- **Tablet** and **Stacked** (iPad), **Desktop** with pop-out tracker windows, and **Classic**.

**Layout → Auto** picks Phone on phones, the tablet layouts on tablets (Stacked upright,
Tablet sideways) and Desktop on a computer.

Also available: [ALTTPR Unified Lite](https://github.com/hugecrankhank/ALTTPR-Unified-Lite),
the emulator and tracker only, for older devices.

## Customizer and presets

In the **Randomizer** bar (alttpr.com generator), **Customizer** holds alttpr.com's Customizer menus, each
its own dropdown: Settings, Logic, Starting Equipment, Item Pool, Locations, Prize Pack Pool, Prize Packs
and Game Details. Turn on **Use the customizer when generating** and **Generate & Play** makes a seed from
them, with the same code alttpr.com uses. Tap **?** beside a setting for what it does.

**Presets:** type a name and press **Save preset** to keep the bar's settings and every customizer menu;
pick it from **Presets** later to roll new seeds with it. **Export** saves presets to a file, **Import**
adds them back (or reads a Save file from alttpr.com's own Customizer). Customized seeds can't be shared
as a seed link; share the preset file instead.

## Playing offline

Press **Make available offline** (in the header; behind **⚙** on phones) once while
online. It downloads everything the app needs, including the emulator and both seed
generators (Kara's runs on Python in the browser, about 15 MB), so the app opens and
plays in airplane mode. The button then shows **✓ Available offline**, and after an
update the offline copy refreshes itself the next time you're online.

Works offline: generating seeds (alttpr.com's generator, and Kara's with **Made by →
This browser**; her server falls back to it), the tracker, your base ROM, sprite, MSU
pack, settings and saves. Needs internet: Kara's server and race seeds, alttpr.com seed
links, and browsing the sprite library.

On iPhone/iPad, also **Share → Add to Home Screen** and open it from there: iOS can
clear a website's saved files after a few weeks without use, but not a Home Screen app's.

## Desktop layout and pop-out windows

- **Layout → Auto** picks *Desktop* on a computer with a mouse or trackpad (window
  wider than 900px) and the tablet layouts on touch screens. *Desktop* can also be
  picked directly.
- **Pop out → Items / Dungeons / Light World / Dark World** opens that piece in a
  window of its own. All four can be out at once, each in its own window, or
  combined: tick another piece in a window's options to bring it into that window
  (both worlds in one map window, say). Everything keeps tracking live, and clicks
  work the same everywhere: marking items, cycling prizes, checks, the dungeon hover
  card, menus and settings. The game grows into the space pieces leave; with all
  four out, the main window is just the game.
- **Put a piece back:** untick it in its window's options, close its window, press
  **Dock** there, or click its (green) **Pop out** button again.
- **Window options:** a small ☰ appears in the corner while the mouse moves over a
  pop-out; point at it for the options. Otherwise the window shows only the tracker,
  ready to capture.
  - The pieces in this window, and the ones that could join it.
  - *Arrange* (both worlds): side by side, stacked, or whichever fits best.
  - *Item rows:* how many rows the items wrap onto, or whichever fits best.
  - *Background:* the tracker's own, black, or green/blue/magenta for an OBS
    Chroma Key filter.
  - *Fit:* the pieces grow or shrink with the window.
  - *Clean:* hides the tracker's menu bars, in the window that has them (see below).
  - ⚙ opens the tracker's settings in this window. 📌 keeps the options showing.
- **Menu bars** (the item tracker's bottom bar; the map's top and bottom bars) stay
  in the main window while any piece of that tracker is there, and otherwise go to
  the window with its first piece.
- Each window remembers its size, position and options, and reconnects by itself
  when the main window reloads (a new ROM).
- **Broadcast** and **Timer** open Hutch's own broadcast view (a stream overlay of
  items and dungeons) and timer, connected to the game the same way.
- **Game only** hides everything but the game, edge to edge, for capture. Esc (or
  *Show trackers* at the top right) brings it back.
- **Resize the tracker column** by dragging its left edge; double-click to reset.
- In Desktop the item tracker uses Hutch's tablet arrangement (items in rows, then
  a row of prize counts and dungeons), which is what lets the items and the dungeons
  go to separate windows.

**Capturing in OBS:** add a *Window Capture* per window. They're titled by what
they hold (*ALTTPR Items*, *ALTTPR Dungeons*, *ALTTPR Light World + Dark World*…).
Use a solid background plus a *Chroma Key* filter to drop the background.

Things to know:

- **Allow pop-ups** for the site the first time. If the browser blocks a window, a
  note says so; allow pop-ups from the address bar and click again.
- **Keyboard input goes to the window you last clicked.** After clicking a tracker
  window, click the game before playing on the keyboard. A controller isn't
  affected.
- **Keep the game window at least partly visible.** Browsers slow a fully hidden or
  minimized window down, and the game with it. (The game isn't paused when the
  window is covered.)
- **Closing the main window** leaves the pop-outs showing their last state; open the
  app again and pop pieces out from there.
- Settings, ROMs, sprites and MSU packs are stored separately from the other
  editions, so they can be used side by side.

### How the pieces stay in step

There's only ever one item tracker and one map. Hutch's tracker can't run as two
copies: its autotracking applies only what changed in game memory since its own
last read, so two copies a moment out of step could disagree for good, and each
would send the map its own item list. So both trackers keep running in the main
window, and popping a piece out moves that piece's live page elements into the
pop-out window (`portal.js`). The tracker keeps updating them and their click
handlers keep working, so nothing needs syncing and nothing restarts. To make that
work without touching Hutch's code:

- his `document.getElementById` / `querySelector` lookups are widened to also find
  pieces that are in other windows;
- his stylesheets and the classes on his `<html>` / `<body>` are copied to each
  pop-out and kept current, and the containers a world sat in are recreated around
  it;
- handlers he put on the whole page (closing a menu on an outside click, the
  dungeon hover card, hotkeys) are added to each pop-out too
  (`bridge/sni-shim.js` records them as he registers them);
- a menu, hover card, tooltip or settings panel he opens appears in the window you
  were using when it opened.

### The tablet layouts (from the iPad edition)

- *Tablet:* items on top, Light World left, game in the middle, Dark World right,
  dungeons along the bottom (Hutch's own tablet view, `js/mobile.js` in
  [his tracker](https://github.com/hutchch/ALTTPR-Tracker)). The **−** / **+** at the
  bottom left of the item tracker resize the maps; the game takes the rest.
- *Stacked:* the game with the items and dungeons under it, and both maps at full
  size (side by side when upright, in a column on the right when sideways).
- *Classic:* the randomizer edition's layout.

## The Randomizer bar

The settings bar under the header folds away when a game starts, and again whenever
you go back to playing with it open: a click on the game, a controller button, or a
game key (typing in its boxes doesn't count). **Randomizer** at the top left
brings it back.

## Kara's branch

The arrow on the **Randomizer** button (top left) picks the generator: **Kara's branch** switches the settings to
Kara's: her presets (Default, Boots, CrossKeys, Super Quick, Mimic Hellrule,
CrissCross Boss, Approximate Bunday, wjbCross, BossHunt Keys) and her settings,
including door shuffle, overworld shuffle, entrance shuffle, pottery and drop
shuffle. The main ones are in the bar; the rest are under **More Kara settings**.
Hover a setting for her help text. **Generate & Play** works as usual and uses
the same Base ROM, sprite, MSU-1 pack and ROM options.

**Made by** picks where seeds come from:

- **Kara's server** (the default, with Kara's permission): the app asks
  api.alttpr.gwaa.kiwi for the seed, exactly as her site does, so the seeds are
  the same games her site makes and they open on her site too. **Seed type →
  Race** makes a race seed with her race setting: its spoiler stays on her
  server. **Share seed** copies the seed's alttpr.gwaa.kiwi link, and pasting
  such a link into **Load a seed** plays it here. The ROM is built as her seed
  page builds it: her patch onto your Japanese 1.0 ROM, then the options her page
  offers (sprite, heart beep, quickswap, music off for an MSU pack) with her
  page's defaults for the rest. Nothing else is written to her seeds; menu speed
  is hidden for them because her site doesn't offer it. If her server can't be
  reached, a normal seed is made in the browser instead (with a note), and a
  race seed isn't made at all. Her server only answers this app once her site
  allows its address, `https://hugecrankhank.github.io`.
- **This browser**: her generator runs here, described below. Also used when
  you type a seed number, since her server picks its own.

How making seeds in the browser works:

- Her generator ([alttpr-python](https://git.gwaa.kiwi/alttpr-gwaa-kiwi/alttpr-python),
  MIT, built on Aerinon's Door Randomizer and codemann8's Overworld Randomizer)
  is in `randomizer/kara/alttpr-python`, pinned to the commit in
  `randomizer/kara/index.js`. It runs in the browser on
  [Pyodide](https://pyodide.org) (Python compiled for the web), in a worker so
  the page stays responsive. Nothing goes to Kara's servers or anyone else's.
- The first Kara seed downloads Python (about 15 MB, then cached). Python starts
  in the background as soon as you pick Kara's branch, so it's usually ready by
  the time you press Generate. A normal seed takes several seconds; big shuffles
  (Approximate Bunday, say) can take a minute or more. **Stop** cancels.
- The settings are turned into her generator's options the same way her server
  does it (`randomizer/kara/settings.js`), including the extras it adds (tavern
  shuffle, dungeon counters). Like her server, a random seed that can't be
  finished with those settings is retried with a new random seed, up to five
  times. A seed number you type is used as is.
- The ROM is built the way her generator builds one: your Japanese 1.0 ROM, her
  base patch (`data/base2current.bps` in her code), the seed, then your ROM
  options and sprite.
- **Seed and race links** work as for alttpr.com-style seeds. Kara links look
  like `?gen=kara&seed=…&k=goal:fast_ganon,…`, and opening one switches the bar to
  Kara's branch with the link's settings. The same seed and settings give the
  same game for everyone (checked: same ROM byte for byte, in separate browsers),
  so compare the five-item code as usual. Every seed is made in a fresh Python
  with a fixed hash seed, which is what makes that work.
- Seeds made in the browser are not the same games as seeds made on
  alttpr.gwaa.kiwi with the same number, because Python there runs on a
  different platform. Their race links are honor system (the spoiler is hidden,
  not sealed); for a real race, use **Made by → Kara's server** and **Race**.
- **Tracker.** Hutch's tracker is told what it understands: world state,
  shuffled maps, compasses and keys, universal keys, entrance shuffle, shops,
  pottery, enemy drops, pseudo boots and the mirror scroll. It doesn't follow
  door shuffle, overworld shuffle, flute spots or prize shuffle; the status line
  says so when a seed uses them.
- Only her main generator ("Base") is included, not her Beta, Pikit or April
  2025 ones, or Mystery and multiworld.

Updating to a newer version of her generator: replace `randomizer/kara/alttpr-python`
with the new code (the same files as now), update `KARA_COMMIT` in
`randomizer/kara/index.js`, and run `python3 tools/kara-data.py <her alttpr-frontend>/src/data
randomizer/kara/settings-data.js` if her settings changed. Seed links made before
the update say they came from another build.

## Seed links and races

After **Generate & Play**, two buttons copy a link to that seed:

- **Share seed** — opens the same settings and seed number for whoever clicks it.
- **Race link** — the same, with the spoiler download hidden for them.

Opening a link shows the seed and its settings at the top of the Randomizer bar;
**Play this seed** generates it. Nothing is uploaded: the generator is deterministic,
so the same seed number and settings make the same game in everyone's browser, from
each player's own base ROM. Each player keeps their own sprite, music, heart beep,
menu speed and quickswap.

**Check the code.** Next to the seed number is the five-item code the file select
screen shows (it's read from the ROM, so it works for seed files from alttpr.com
too). Everyone in a race should see the same five items.

Race links run on the honor system: the seed number is in the link, so someone
determined could still work out the spoiler. For a sealed race, generate the seed on
alttpr.com with spoilers off and share that. Links carry a generator version
(`v=`); one made with a different version of this app says so, as the game might
differ (compare codes).

## Loading a seed: paste a link or a number

**Load a seed** (Randomizer bar) takes any of these; paste it and press **Load** or
Enter. Pasting a link anywhere on the page (outside a text box) works too.

- **A seed link from this app** — plays that seed with its settings (as opening the
  link would).
- **A seed number** — plays that number with the settings currently chosen.
- **An alttpr.com seed** — a link like `https://alttpr.com/h/AbC123xyZ9`, or just the
  10-character id. The app downloads the seed and builds the ROM in your browser the
  way alttpr.com's own page does: alttpr.com's base patch for that seed's version onto
  your Japanese 1.0 ROM, then the seed, then your sprite, music and other options
  (quickswap stays off if a race seed locks it). The tracker is set to the seed's
  world state, dungeon items, swords, GT crystals, boss shuffle and enemizer, and the
  five-item code is read from the seed. **Share seed** copies its alttpr.com link.
  Base patches for other versions are downloaded once and kept.

### Loading alttpr.com seeds: the relay

alttpr.com doesn't let web pages on other sites read its seeds, so the app asks a
small relay, and the relay asks alttpr.com. `relay/worker.js` is the whole thing: it
only passes on alttpr.com seeds (the seed, its base ROM version and that version's
base patch), only for this app's pages, and only reads. It keeps each seed for a day,
so a race where everyone loads the same seed asks alttpr.com once.

The app uses a built-in relay (`alttpr-relay.hugecrankhank.workers.dev`, a Cloudflare
Worker on the free plan), so it works with no setup. To use your own instead:

1. Make a free account at [dash.cloudflare.com](https://dash.cloudflare.com).
2. Go to **Workers & Pages → Create → Create Worker**, name it (e.g. `alttpr-relay`)
   and press **Deploy**.
3. Press **Edit code**, replace everything with the contents of `relay/worker.js`, and
   press **Deploy** again.
4. Copy the worker's address (`https://alttpr-relay.<your-name>.workers.dev`).
5. In the app: **Randomizer → ROM options → alttpr.com relay**, paste the address,
   and click elsewhere to save it. Empty that box to go back to the built-in relay.

If you host the app somewhere other than `hugecrankhank.github.io`, add that address
to `ALLOWED` at the top of the worker (the built-in relay only serves that site).

## Sprites

The **Link sprite** setting (Randomizer bar) shows a preview of the current sprite.

- **Library…** browses the [alttpr.com sprite library](https://alttpr.com/en/sprites):
  search by name, author or tag, filter by tag, or pick one at random. Previews and
  sprite files come straight from alttpr.com's file host.
- **File…** uses your own `.zspr` or `.spr`. Its preview is drawn from the file
  (Link's head); click it to see the whole sprite sheet.
- **Default** goes back to Link.

A few sprites in alttpr.com's list (27 of 513 at last check) have no preview picture
on its file host; for those the library draws Link's head from the sprite file instead.
The library's plain *Link* entry has no file there either, so picking it is the same as
**Default**.

The sprite applies to every seed you generate until you change it. The library's list
comes from alttpr.com/sprites, which browsers can't read from other sites, so the
deploy workflow copies it into the site as `sprites.json` on every deploy and once a
week (a copy in the repository is the fallback).

## Run it

It must be served over HTTP (opening `index.html` as a file won't work, because
the browser blocks the tracker frames from talking to the page).

```bash
cd ALTTPR-Unified-Desktop
python3 -m http.server 8080      # or: npx serve .
```

For **Kara's branch** on a local copy, first run `python3 tools/kara-bundle.py`
(packs her generator) and `sh tools/fetch-pyodide.sh` (downloads Pyodide); the
published site does both when it's deployed.

Open http://localhost:8080. Then either:

- **Generate a seed in the app.** Pick settings in the **Randomizer** bar, press
  **Base ROM…** once to choose your own Japanese 1.0 ALttP ROM, then press
  **Generate & Play**. The trackers are set up to match the seed automatically.
- **Play a seed you already have.** Click **Load ROM…** and pick the `.sfc`,
  then set **World** and **Dungeon items** in the top bar to match it.

It also works as a static site (GitHub Pages, Netlify, etc.), which lets you
test from any device.

## How it works

```
index.html  (desktop.js: Desktop layout, pop-outs; tablet.js: tablet layouts)
├── EmulatorJS (snes9x core, from cdn.emulatorjs.org)
├── bridge/sni-bridge.js   ← reads emulator memory, speaks usb2snes addresses
├── <iframe> tracker/itemtracker.html, tracker/map.html   (Hutch, unmodified)
└── pop-out windows: popout.html → portal.html, holding pieces moved from those
        └── bridge/sni-shim.js  ← swaps WebSocket for an in-page fake SNI
```

1. **Finding WRAM.** EmulatorJS doesn't export the core's RAM pointer. The
   bridge takes one save-state snapshot, finds the tagged `RAM:131072:` block
   in it (snes9x's snapshot format), then searches the WASM heap for that
   exact 128 KB block. From then on reads are direct views into live memory.
   It re-verifies every 5 s and relocates if needed; if the heap search ever
   fails it falls back to throttled snapshots (status pill turns yellow).
2. **Fake SNI.** Hutch connects to `ws://localhost:23074` and sends usb2snes
   JSON (`DeviceList`, `Attach`, `GetAddress`). The shim answers those from
   the bridge using SD2SNES address mapping:
   `F50000+` → WRAM, `E00000+` → SRAM, `000000+` → ROM file.
   Because Hutch thinks it's talking to SNI, its tracker code is untouched,
   so upstream tracker updates can be dropped straight into `tracker/`.

In the Desktop layout (`desktop.js`, `portal.js`, `popout.html`), pop-out
windows show pieces of the two trackers that run in the main page; see *How the
pieces stay in step* above. Each pop-out asks the main page once a second what it
holds, which is also how it reconnects after the main page reloads for a new ROM.

Two additions to Hutch's files: seven bottle pictures (`tracker/items/bottle_*.png`:
empty, red, green and blue potion, fairy, bee, good bee) that his item tracker asks
for but his repository doesn't include yet, drawn from his own bottle outline; and,
in `bridge/sni-shim.js`, a guard that skips item updates that would change nothing
(his tracker re-applies every bottle on each memory read, which flickered). If his
repository gains its own bottle pictures, they replace these.

The only change to the Hutch files is one `<script>` line at the top of
`itemtracker.html`, `map.html`, `timer.html` and `broadcast.html`. Opened
outside this app, the shim does nothing and the tracker uses real SNI.

## The randomizer

`randomizer/` is a JavaScript port of the official ALttPR generator
([alttp_vt_randomizer](https://github.com/sporchia/alttp_vt_randomizer), the code
behind alttpr.com, build 2024-02-18) and runs entirely in the browser, in a
Web Worker.

```
randomizer/
├── app.js            ← the settings bar: base ROM, generate, patch, boot, downloads
├── worker.js         ← runs generate() off the main thread
├── generate.js       ← settings + seed → patch + spoiler (mirrors the alttpr.com API)
├── core/             ← Item, Location, Region, World, Randomizer, Rom, Text, …
├── regions/, worlds/ ← No Glitches logic for Standard / Open / Inverted / Retro
├── data/             ← base-patch.bin, config, text strings
├── tools/            ← converters, base-patch builder, PHP reference harness
└── test/             ← parity tests against the PHP original
```

How a seed is made:

1. Your Japanese 1.0 ROM (MD5 `03a63945…`) is stored in IndexedDB the first
   time you pick it. It never leaves the browser.
2. It's expanded to 2 MB and the base patch is applied. The base patch is
   z3randomizer (commit `dcb0a2b`, the version alttpr.com pins) assembled with
   asar; the result is checked against alttpr.com's base ROM MD5 (`edc01f3d…`).
3. The generator places items, writes the seed data, and returns a patch and
   spoiler. Heart beep, menu speed and quickswap are applied, then the checksum.
4. The ROM boots in the emulator and both trackers reload with the seed's
   world state, dungeon item shuffle, sword mode and GT crystal requirement.

**Same seed number + same settings = the same game**, so a seed can be shared
by its number. Some seeds can't be completed by the generator (the original
does this too); random seeds just roll again.

Supported: every alttpr.com option for No Glitches logic (world state, goal,
crystal requirements, swords, item placement, dungeon items, accessibility,
item pool and functionality, hints). Not included: glitched logic, entrance
shuffle, enemizer/boss shuffle, multiworld, tournament/race ROMs.

### Verifying the port

The port keeps the original's structure and order of operations, and the PHP
original can be run with the same seeded random number generator. For the same
settings and seed, both produce the same ROM bytes and the same spoiler:

```bash
git clone https://github.com/sporchia/alttp_vt_randomizer ../alttp_vt_randomizer
export VT_DIR=$PWD/../alttp_vt_randomizer         # needs PHP 8.1+
cd randomizer
node test/compare.mjs '{"mode":"inverted","dungeon_items":"full"}' 1 2 3
node test/logic.mjs '{"mode":"standard"}' 200     # per-location access logic
node test/sweep.mjs one                           # every option, one at a time
node test/sweep.mjs random 100                    # random combinations
```

Regenerating code from the PHP: `python3 tools/convert_regions.py` and
`python3 tools/convert_core.py` (the rest of `core/` is hand-ported).
Rebuilding the base patch: `python3 tools/make_base_patch.py <z3randomizer> data/base-patch.bin`.

## Debugging

In the browser console:

```js
AlttpBridge.status()             // mode: 'live' | 'snapshot' | 'idle'
AlttpBridge.peek(0x7EF340, 32)   // dump inventory bytes ($7EF340+)
```

## Known limits / next steps

- **snes9x core only.** The bridge parses snes9x's state format; bsnes would
  need its own parser (or a custom core build exporting `retro_get_memory_data`).
- **No Glitches only.** The alttpr.com generator covers alttpr.com's No Glitches
  options. Kara's branch adds entrance, door and overworld shuffle; for glitched
  logic, generate elsewhere and use **Load ROM…**.
- **Changing ROMs reloads the page.** EmulatorJS can't swap games in place.
- Save files persist in the browser's IndexedDB (EmulatorJS default).

## Credits

- Tracker: [Hutch-ALTTPR Tracker](https://github.com/hutchch/ALTTPR-Tracker)
  by hutchch, MIT License (see `tracker/LICENSE`).
- Emulator: [EmulatorJS](https://github.com/EmulatorJS/EmulatorJS) (GPL-3.0),
  loaded from its CDN at runtime.
- Randomizer: ported from [alttp_vt_randomizer](https://github.com/sporchia/alttp_vt_randomizer)
  by sporchia (MIT); base patch built from [z3randomizer](https://github.com/KatDevsGames/z3randomizer)
  (MIT). See `randomizer/LICENSE-THIRD-PARTY.md`.
- Kara's branch: [alttpr-python](https://git.gwaa.kiwi/alttpr-gwaa-kiwi/alttpr-python)
  by Kara (karafruit), MIT License (LLCoolDave's original license, carried by every fork since;
  see `randomizer/kara/alttpr-python/LICENSE`), built on
  [ALttPDoorRandomizer](https://github.com/aerinon/ALttPDoorRandomizer) by Aerinon and
  [OverworldShuffle](https://github.com/codemann8/ALttPDoorRandomizer) by codemann8.
  Settings, presets and help text from her [alttpr.gwaa.kiwi](https://alttpr.gwaa.kiwi/generate).
  Runs on [Pyodide](https://pyodide.org) (MPL-2.0), downloaded when the site is deployed.
- No ROMs are included. Use your own legally obtained copy.
