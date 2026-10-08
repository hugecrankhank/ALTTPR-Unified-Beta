// ── Entrance reachability logic (ported subset of alttptracker-main/js/chests.js) ──
// Supports both Open and Inverted game modes in entrance shuffle.
// Public API: EntLogic.checkEntranceAvailability(name, items, prizes) -> "available" | "unavailable"
// where `name` matches a key in logic_entrances (see ref_logic_entrances.js).

(function (window) {
  "use strict";

  function getEntranceLogic() {
    return window.logic_entrances || {};
  }

  var items, prizes;

  // ── small helpers ──────────────────────────────────────────────────────────
  function melee() { return items.sword > 0 || items.hammer; }
  function melee_bow() { return melee() || items.bow > 1; }
  function cane() { return items.somaria || items.byrna; }
  function rod() { return items.firerod || items.icerod; }
  function canHitSwitch() { return items.bomb || melee_bow() || cane() || rod() || items.boomerang > 0 || items.hookshot; }
  function canHitRangedSwitch() { return items.bomb || items.bow > 0 || items.boomerang > 0 || items.somaria || rod(); }
  function activeFlute() { return items.flute > 1 || (items.flute > 0 && canReachLightWorld()); }
  function activeFluteInverted() { return items.flute > 1 || (items.flute > 0 && canReachInvertedLightWorld()); }

  function pendantCheck(type) {
    var pendant_count = 0;
    var green_pendant = false;
    for (var k = 0; k < 10; k++) {
      if ((prizes[k] === 1 || prizes[k] === 2) && items["boss" + k]) pendant_count++;
      if (prizes[k] === 1 && items["boss" + k]) green_pendant = true;
    }
    if (type === "green") return green_pendant;
    if (type === "all") return pendant_count === 3;
    return false;
  }
  function crystalCheck() {
    var crystal_count = 0;
    for (var k = 0; k < 10; k++) {
      if ((prizes[k] === 3 || prizes[k] === 4) && items["boss" + k]) crystal_count++;
    }
    return crystal_count;
  }

  // ── connector / synthetic region helpers ──────────────────────────────────
  function hasFoundEntranceName(name) {
    var conns = window._entConnections;
    if (conns && conns.length) {
      for (var i = 0; i < conns.length; i++) {
        if (conns[i][0] === name || conns[i][1] === name) return true;
      }
    }
    var foundNames = window._entSyntheticFoundEntrances;
    if (foundNames && foundNames.length && foundNames.indexOf(name) !== -1) return true;
    return false;
  }
  // hasFoundRegion(entranceNames): returns true if the player has found (via connector or
  // label) any entrance whose name appears in the provided list.  Used by
  // canReachUpperWestDeathMountain / canReachLowerWestDeathMountain to infer region access.
  function hasFoundRegion(names) {
    if (!names || !names.length) return false;
    for (var i = 0; i < names.length; i++) {
      if (hasFoundEntranceName(names[i])) return true;
    }
    return false;
  }

  // Authoritative set of south LW entrances (from entrances_data.json world:"light",
  // excluding Death Mountain entrances). Positive list — anything NOT here is DW/DM/dungeon.
  var LW_ENTRANCES = window.ALL_LW_ENTRANCES || {
    '20 Rupee Cave':1,'50 Rupee Cave':1,'Agahnims Tower':1,'Aginahs Cave':1,
    'Bat Cave Cave':1,'Bat Cave Drop':1,'Blacksmiths Hut':1,'Blinds Hideout':1,
    'Bonk Fairy (Light)':1,'Bonk Rock Cave':1,'Bush Covered House':1,'Capacity Upgrade':1,
    'Cave 45':1,'Checkerboard Cave':1,'Chicken House':1,'Dam':1,
    'Desert Fairy':1,'Desert Palace Entrance (East)':1,'Desert Palace Entrance (North)':1,
    'Desert Palace Entrance (South)':1,'Desert Palace Entrance (West)':1,'Eastern Palace':1,
    'Elder House (East)':1,'Elder House (West)':1,
    'Fortune Teller (Light)':1,'Good Bee Cave':1,'Graveyard Cave':1,
    'Hyrule Castle Entrance (East)':1,'Hyrule Castle Entrance (South)':1,
    'Hyrule Castle Entrance (West)':1,'Hyrule Castle Secret Entrance Drop':1,
    'Hyrule Castle Secret Entrance Stairs':1,'Ice Rod Cave':1,
    'Kakariko Gamble Game':1,'Kakariko Shop':1,'Kakariko Well Cave':1,'Kakariko Well Drop':1,
    'Kings Grave':1,'Lake Hylia Fairy':1,'Lake Hylia Fortune Teller':1,'Lake Hylia Shop':1,
    'Library':1,'Light Hype Fairy':1,'Light World Bomb Hut':1,'Links House':1,
    'Long Fairy Cave':1,'Lost Woods Gamble':1,'Lost Woods Hideout Drop':1,
    'Lost Woods Hideout Stump':1,'Lumberjack House':1,'Lumberjack Tree Cave':1,
    'Lumberjack Tree Tree':1,'Mini Moldorm Cave':1,'North Fairy Cave':1,
    'North Fairy Cave Drop':1,'Potion Shop':1,'Sahasrahlas Hut':1,
    'Sanctuary':1,'Sanctuary Grave':1,'Sick Kids House':1,
    'Snitch Lady (East)':1,'Snitch Lady (West)':1,
    'Tavern (Front)':1,'Tavern North':1,'Two Brothers House (East)':1,
    'Two Brothers House (West)':1,'Waterfall of Wishing':1,
  };
  // In inverted, checks if any connector endpoint or labeled entrance is a
  // known south LW entrance. Uses positive LW_ENTRANCES list — avoids false
  // positives from DW/DM entrances missing from a negative exclusion list.
  function hasFoundLightWorldEntrance() {
    var conns = window._entConnections;
    if (conns && conns.length) {
      for (var i = 0; i < conns.length; i++) {
        if (LW_ENTRANCES[conns[i][0]] || LW_ENTRANCES[conns[i][1]]) return true;
      }
    }
    var labels = window._entLabels;
    if (labels) {
      var names = Object.keys(labels);
      for (var j = 0; j < names.length; j++) {
        if (LW_ENTRANCES[names[j]]) return true;
      }
    }
    return false;
  }

  // Physically-enclosed LW entrances: a connector here does NOT grant free
  // LW overworld access because the player is trapped without extra items.
  // DP North is surrounded by rocks (needs gloves to escape).
  // DP East has no overworld access at all (interior-only exit in vanilla).
  // Bush Covered House is behind bushes (bunny can't cut them).
  // Kings Grave is under heavy rocks (bunny can't lift them).
  var LW_ENCLOSED_ENTRANCES = {
    'Desert Palace Entrance (North)': true,
    'Desert Palace Entrance (East)':  true,
    'Bush Covered House':             true,
    'Kings Grave':                    true,
  };

  // Like hasFoundLightWorldEntrance() but only counts entrances the player
  // can freely walk away from as a bunny — excludes enclosed entrances.
  // Also recognises label text that identifies a LW pass-through building:
  //   "Sanc" = Sanctuary, "Link" = Link's House, "Mount" = Mountain cave
  // A DW entrance labelled with one of these lets the player walk out to the LW.
  var _LW_PASSTHROUGH_LABELS = ['sanc', 'link', 'mount'];
  function _isLwPassthroughLabel(text) {
    if (!text) return false;
    var lv = text.toLowerCase().trim();
    for (var _li = 0; _li < _LW_PASSTHROUGH_LABELS.length; _li++) {
      if (lv.indexOf(_LW_PASSTHROUGH_LABELS[_li]) === 0) return true;
    }
    return false;
  }

  function hasFoundOpenLightWorldEntrance() {
    var conns = window._entConnections;
    if (conns && conns.length) {
      for (var i = 0; i < conns.length; i++) {
        if ((LW_ENTRANCES[conns[i][0]] && !LW_ENCLOSED_ENTRANCES[conns[i][0]]) ||
            (LW_ENTRANCES[conns[i][1]] && !LW_ENCLOSED_ENTRANCES[conns[i][1]])) return true;
      }
    }
    var labels = window._entLabels;
    if (labels) {
      var names = Object.keys(labels);
      for (var j = 0; j < names.length; j++) {
        if (LW_ENTRANCES[names[j]] && !LW_ENCLOSED_ENTRANCES[names[j]]) return true;
        // Label text identifies a LW pass-through building on any entrance
        if (_isLwPassthroughLabel(labels[names[j]])) return true;
      }
    }
    return false;
  }

  // ── canReach* — Open mode ─────────────────────────────────────────────────
  function canReachLightWorld() { return true; } // Open mode: always reachable

  function canReachUpperWestDeathMountain() {
    // Flute + mirror: flute warps to Death Mountain (Lower West DM), mirror used to
    // navigate the DW DM side and reach the Upper West DM (Spectacle Rock / Hera) area.
    // Mirror is required in entrance shuffle — flute alone only lands you on Lower West DM.
    if (items.flute >= 1 && items.mirror) return true;
    if (hasFoundEntranceName("Tower of Hera") || (hasFoundEntranceName("Paradox Cave (Top)") && items.hammer)) return true;
    if (items.mirror && hasFoundRegion([
      "Spectacle Rock Cave", "Spectacle Rock Cave Peak", "Spectacle Rock Cave (Bottom)",
      "Old Man Cave (East)", "Death Mountain Return Cave (East)",
      "Old Man House (Bottom)", "Old Man House (Top)",
      "Ganons Tower", "Hookshot Cave Back Entrance", "Hookshot Cave",
      "Superbunny Cave (Top)", "Turtle Rock", "Spike Cave", "Dark Death Mountain Fairy",
    ])) return true;
    if (items.hookshot && items.mirror && hasFoundRegion([
      "Paradox Cave (Top)", "Paradox Cave (Middle)", "Paradox Cave (Bottom)",
      "Spiral Cave", "Spiral Cave (Bottom)", "Hookshot Fairy",
      "Fairy Ascension Cave (Top)", "Fairy Ascension Cave (Bottom)",
      "Superbunny Cave (Bottom)", "Dark Death Mountain Shop",
      "Turtle Rock Isolated Ledge Entrance",
      "Dark Death Mountain Ledge (West)", "Dark Death Mountain Ledge (East)",
    ])) return true;
    return false;
  }
  function canReachLowerWestDeathMountain() {
    if (items.flute >= 1) return true;
    if (canReachUpperWestDeathMountain()) return true;
    if (hasFoundRegion([
      "Spectacle Rock Cave", "Spectacle Rock Cave Peak", "Spectacle Rock Cave (Bottom)",
      "Old Man Cave (East)", "Death Mountain Return Cave (East)",
      "Old Man House (Bottom)", "Old Man House (Top)", "Tower of Hera",
    ])) return true;
    if (items.hookshot && hasFoundRegion([
      "Paradox Cave (Top)", "Paradox Cave (Middle)", "Paradox Cave (Bottom)",
      "Spiral Cave", "Spiral Cave (Bottom)", "Hookshot Fairy",
      "Fairy Ascension Cave (Top)", "Fairy Ascension Cave (Bottom)",
    ])) return true;
    if (items.mirror && items.hookshot && hasFoundRegion([
      "Turtle Rock Isolated Ledge Entrance",
      "Dark Death Mountain Ledge (West)", "Dark Death Mountain Ledge (East)",
      "Superbunny Cave (Bottom)", "Dark Death Mountain Shop",
    ])) return true;
    if (items.mirror && hasFoundRegion([
      "Spike Cave", "Dark Death Mountain Fairy", "Ganons Tower",
      "Hookshot Cave Back Entrance", "Hookshot Cave", "Superbunny Cave (Top)", "Turtle Rock",
    ])) return true;
    return false;
  }
  function canReachUpperEastDeathMountain() {
    if (hasFoundEntranceName("Paradox Cave (Top)") || (canReachUpperWestDeathMountain() && items.hammer)) return true;
    if (items.flute >= 1 && items.mirror && items.hammer) return true;
    return false;
  }
  function canReachLowerEastDeathMountain() {
    if (items.flute >= 1 && items.hookshot) return true;
    if (items.hookshot && canReachLowerWestDeathMountain()) return true;
    if (canReachUpperWestDeathMountain() && items.hammer) return true;
    if (canReachUpperEastDeathMountain()) return true;
    return false;
  }
  function canReachUpperDarkDeathMountain() {
    // Entrance shuffle: a connector/label on any Upper Dark DM entrance (including the
    // isolated east ledge — Superbunny Cave Top, Turtle Rock, Hookshot Cave) grants full
    // Upper Dark DM access. Walking from the isolated east ledge to the Hookshot Cave /
    // GT area is possible without hookshot. Matches ref_chests.js.
    if (hasFoundRegion(["Ganons Tower", "Hookshot Cave Back Entrance", "Hookshot Cave",
                         "Superbunny Cave (Top)", "Turtle Rock"])) return true;
    // Titan's Mitt + Upper East DM → walk across to Upper Dark DM
    if (items.hammer && items.glove === 2 && canReachUpperEastDeathMountain()) return true;
    return false;
  }
  function canReachLowerWestDarkDeathMountain() {
    return canReachLowerWestDeathMountain() || canReachUpperDarkDeathMountain();
  }
  function canReachLowerEastDarkDeathMountain() {
    return canReachUpperDarkDeathMountain() || (canReachLowerEastDeathMountain() && items.glove === 2);
  }
  function canLeaveNorthEastDarkWorldSouth() {
    return items.moonpearl && (items.glove || items.hammer || items.flippers);
  }
  function canLeaveNorthEastDarkWorldWest() {
    return items.moonpearl && items.hookshot;
  }
  function canLeaveSouthEastDarkWorld() {
    return items.moonpearl && items.flippers;
  }
  function canReachEastDarkWorld() {
    if (items.agahnim) return true;
    if (items.moonpearl && items.glove && items.hammer) return true;
    if (items.moonpearl && items.glove > 1 && items.flippers) return true;
    if ((items.hammer || items.flippers) && items.moonpearl && canReachSouthDarkWorld(true)) return true;
    if (canLeaveSouthEastDarkWorld() && canReachSouthEastDarkWorld(true)) return true;
    // Connector/label found an East DW entrance — player is physically there.
    var _synthEDW = window._entSyntheticFoundRegions || [];
    if (_synthEDW.indexOf('East Dark World') !== -1) return true;
    return false;
  }
  function canReachNorthEastDarkWorld() {
    if (canReachEastDarkWorld() && items.moonpearl && (items.flippers || items.glove > 0 || items.hammer)) return true;
    return false;
  }
  function canReachWestDarkWorld(toEastDarkWorld) {
    if (items.moonpearl && (items.glove === 2 || (items.glove && items.hammer))) return true;
    if (!toEastDarkWorld) {
      if (canLeaveNorthEastDarkWorldWest() && canReachNorthEastDarkWorld()) return true;
    }
    return false;
  }
  function canReachSouthDarkWorld(toEastDarkWorld) {
    if (items.moonpearl && (items.glove === 2 || (items.glove && items.hammer))) return true;
    if (!toEastDarkWorld) {
      if (items.moonpearl && items.hammer && canReachEastDarkWorld()) return true;
    }
    if (canReachWestDarkWorld(toEastDarkWorld)) return true;
    // Connector/label found a South DW entrance — player is physically there.
    var _synthSDW = window._entSyntheticFoundRegions || [];
    if (_synthSDW.indexOf('South Dark World') !== -1) return true;
    return false;
  }
  function canReachSouthEastDarkWorld(toEastDarkWorld) {
    if (!toEastDarkWorld) {
      if (items.flippers && items.moonpearl && canReachEastDarkWorld()) return true;
    }
    return false;
  }
  function canReachSouthWestDarkWorld() {
    if (items.flute >= 1 && items.glove >= 2) return true;
    return false;
  }
  function canReachHyruleCastleBalcony() {
    if (canReachEastDarkWorld() && items.mirror) return true;
    // Connector-found East Dark World + mirror → player can climb the pyramid and
    // mirror to the HC Balcony area. Check _entSyntheticFoundRegions directly so
    // this works regardless of whether refreshSyntheticRegions ran after mirror toggle.
    var _synth = window._entSyntheticFoundRegions || [];
    if (items.mirror && _synth.indexOf('East Dark World') !== -1) return true;
    return false;
  }

  // ── canReach* — Inverted mode ─────────────────────────────────────────────
  function canReachInvertedLightWorld() {
    if (!items.moonpearl) return false;
    if (items.glove >= 2 || (items.glove && items.hammer)) return true;
    if (items.agahnim) return true;
    // Open LW connector (freely walkable, not rock-enclosed) + moonpearl = LW access
    if (hasFoundOpenLightWorldEntrance()) return true;
    // Bush Covered House: moonpearl (checked above) lets you become human and cut the bushes
    var _bchConns = window._entConnections;
    if (_bchConns && _bchConns.length) {
      for (var _bchI = 0; _bchI < _bchConns.length; _bchI++) {
        if (_bchConns[_bchI][0] === 'Bush Covered House' ||
            _bchConns[_bchI][1] === 'Bush Covered House') return true;
      }
    }
    // DP North is rock-enclosed — needs moonpearl (checked above) + at least Power Glove
    if (items.glove >= 1) {
      var _dpnConns = window._entConnections;
      if (_dpnConns && _dpnConns.length) {
        for (var _dpnI = 0; _dpnI < _dpnConns.length; _dpnI++) {
          if (_dpnConns[_dpnI][0] === 'Desert Palace Entrance (North)' ||
              _dpnConns[_dpnI][1] === 'Desert Palace Entrance (North)') return true;
        }
      }
    }
    return false;
  }

  function canReachInvertedLightWorldBunny() {
    if (canReachInvertedLightWorld()) return true;
    // Flute to the Mire and Titan's Mitts through its portal: in the Light
    // World as a bunny, no pearl needed — inverted 1.0 and 2.0 (Chris, Sep 2026).
    if (items.flute >= 1 && items.glove >= 2) return true;
    if (items.agahnim) return true;
    if (hasFoundOpenLightWorldEntrance()) return true;
    return false;
  }

  // In inverted, the Dark World is the "home" world — always accessible
  function canReachInvertedWestDarkWorld()     { return true; }
  function canReachInvertedSouthDarkWorld()    { return true; }

  function canReachInvertedEastDarkWorld() {
    if (activeFluteInverted()) return true;
    if (canReachInvertedSouthDarkWorld() && (items.flippers || items.hammer)) return true;
    if (items.mirror && canReachInvertedLightWorldBunny()) return true;
    return false;
  }

  function canReachInvertedNorthEastDarkWorld() {
    if (activeFluteInverted()) return true;
    if (items.mirror && canReachInvertedLightWorld()) return true;
    if (items.flippers && (canReachInvertedWestDarkWorld() || canReachInvertedSouthDarkWorld() || canReachInvertedEastDarkWorld())) return true;
    if ((items.hammer || items.glove) && canReachInvertedEastDarkWorld()) return true;
    return false;
  }

  function canReachInvertedSouthWestDarkWorld() {
    if (activeFluteInverted()) return true;
    if (items.mirror && canReachInvertedLightWorldBunny()) return true;
    return false;
  }

  function canReachInvertedSouthEastDarkWorld() {
    if (activeFluteInverted()) return true;
    if (items.flippers && canReachInvertedSouthDarkWorld()) return true;
    if (items.mirror && canReachInvertedLightWorldBunny()) return true;
    return false;
  }

  function canReachInvertedDarkDeathMountain() {
    if (activeFluteInverted()) return true;
    if (hasFoundEntranceName("Ganons Tower") || hasFoundEntranceName("Spike Cave") ||
        hasFoundEntranceName("Hookshot Cave") || hasFoundEntranceName("Hookshot Cave Back Entrance") ||
        hasFoundEntranceName("Superbunny Cave (Top)") || hasFoundEntranceName("Turtle Rock")) return true;
    if (items.mirror) {
      if (hasFoundEntranceName("Tower of Hera") || hasFoundEntranceName("Spectacle Rock Cave") ||
          hasFoundEntranceName("Old Man Cave (East)") || hasFoundEntranceName("Death Mountain Return Cave (East)") ||
          hasFoundEntranceName("Old Man House (Bottom)") || hasFoundEntranceName("Old Man House (Top)") ||
          hasFoundEntranceName("Paradox Cave (Top)")) return true;
      if (items.moonpearl && items.hookshot &&
          (hasFoundEntranceName("Paradox Cave (Middle)") || hasFoundEntranceName("Paradox Cave (Bottom)") ||
           hasFoundEntranceName("Spiral Cave") || hasFoundEntranceName("Mimic Cave"))) return true;
    }
    return false;
  }

  function canReachInvertedLowerWestDeathMountain() {
    if (canReachInvertedDarkDeathMountain()) return true;
    if (hasFoundEntranceName("Tower of Hera") || hasFoundEntranceName("Spectacle Rock Cave") ||
        hasFoundEntranceName("Old Man Cave (East)") || hasFoundEntranceName("Death Mountain Return Cave (East)") ||
        hasFoundEntranceName("Old Man House (Bottom)") || hasFoundEntranceName("Old Man House (Top)")) return true;
    if (items.moonpearl && items.hookshot &&
        (hasFoundEntranceName("Paradox Cave (Top)") || hasFoundEntranceName("Paradox Cave (Middle)") ||
         hasFoundEntranceName("Paradox Cave (Bottom)") || hasFoundEntranceName("Spiral Cave") ||
         hasFoundEntranceName("Mimic Cave"))) return true;
    if (items.moonpearl && items.hammer && hasFoundEntranceName("Paradox Cave (Top)")) return true;
    return false;
  }

  function canReachInvertedUpperWestDeathMountain() {
    if (hasFoundEntranceName("Tower of Hera")) return true;
    if (items.moonpearl && items.hammer && hasFoundEntranceName("Paradox Cave (Top)")) return true;
    if (canReachInvertedDarkDeathMountain() && items.glove > 1 && items.hammer && items.moonpearl) return true;
    return false;
  }

  function canReachInvertedUpperEastDeathMountain() {
    if (hasFoundEntranceName("Paradox Cave (Top)")) return true;
    if (hasFoundEntranceName("Tower of Hera") && items.hammer && items.moonpearl) return true;
    if (canReachInvertedDarkDeathMountain() && items.glove > 1 && items.hammer && items.moonpearl) return true;
    return false;
  }

  function canReachInvertedLowerEastDeathMountain() {
    if (canReachInvertedUpperEastDeathMountain()) return true;
    if (hasFoundEntranceName("Paradox Cave (Middle)") || hasFoundEntranceName("Paradox Cave (Bottom)") ||
        hasFoundEntranceName("Spiral Cave") || hasFoundEntranceName("Mimic Cave")) return true;
    if (items.moonpearl && items.hookshot && canReachInvertedLowerWestDeathMountain()) return true;
    if (items.glove === 2 && canReachInvertedDarkDeathMountain()) return true;
    return false;
  }

  function canReachInvertedLowerEastDarkDeathMountain() {
    if (canReachInvertedDarkDeathMountain()) return true;
    if (items.mirror && canReachInvertedLowerWestDeathMountain()) return true;
    return false;
  }

  function canReachInvertedHyruleCastleBalcony() {
    if (hasFoundEntranceName("Hyrule Castle Entrance (West)") || hasFoundEntranceName("Hyrule Castle Entrance (East)") ||
        hasFoundEntranceName("Agahnims Tower")) return true;
    if (items.agahnim && items.mirror) return true;
    return false;
  }

  // ── bigRequirementSwitch ──────────────────────────────────────────────────
  function bigRequirementSwitch(requirement) {
    switch (requirement) {
      case "agahnim": return !!items.agahnim;
      case "agahnim2": return !!items.agahnim2;
      case "boots": return !!items.boots;
      case "bow": return items.bow > 1;
      case "bombs": return !!items.bomb;
      case "book": return !!items.book;
      case "bottle": return !!items.bottle;
      case "byrna": return !!items.byrna;
      case "cape": return !!items.cape;
      case "flippers": return !!items.flippers;
      case "flute": return activeFlute();
      case "firerod": return !!items.firerod;
      case "glove": return items.glove > 0;
      case "hammer": return !!items.hammer;
      case "halfmagic": return !!items.magic;
      case "hookshot": return !!items.hookshot;
      case "lantern": return !!items.lantern;
      case "melee": return melee();
      case "melee_bow": return melee_bow();
      case "moonpearl": return !!items.moonpearl;
      case "mushroom": return !!items.mushroom;
      case "net": return !!items.net;
      case "mitts": return items.glove > 1;
      case "mirror": return !!items.mirror;
      case "shovel": return !!items.shovel;
      case "icerod": return !!items.icerod;
      case "mirrorshield": return items.shield > 2;
      case "powder": return !!items.powder;
      case "somaria": return !!items.somaria;
      case "sword": return items.sword > 0;
      case "swordbeams": return items.sword > 1;
      case "greenpendant": return pendantCheck("green");

      case "canKillMostEnemies": return items.sword > 0 || items.hammer || items.bow > 1 || items.somaria || items.byrna || items.firerod;
      case "canKillOrExplodeMostEnemies": return items.sword > 0 || items.hammer || items.bow > 1 || items.somaria || items.byrna || items.firerod || items.bomb;
      case "canFightAgahnim": return items.sword > 0 || items.hammer || items.net;
      case "canLightFires": return !!items.lantern || !!items.firerod;
      case "canDarkRoomNavigate": return !!items.lantern;
      case "canTorchRoomNavigate": return !!items.lantern || !!items.firerod;
      case "canDefeatCurtains": return items.sword > 0;
      case "canKillWizzrobes": return items.sword > 0 || items.hammer || items.bow > 1 || items.byrna || items.somaria || (items.icerod && (items.bomb || items.hookshot)) || items.firerod;
      case "canCrossMireGap": return !!items.boots || !!items.hookshot;
      case "canBurnThings": return !!items.firerod || (items.bombos && items.sword > 0);
      case "canBurnThingsMaybeSwordless": return !!items.firerod || (items.bombos && items.sword > 0);
      case "canHitSwitch": return canHitSwitch();
      case "canDestroyEnergyBarrier": return items.sword > 1;
      case "canBreakTablets": return items.sword > 1;
      case "canPullPedestal": return pendantCheck("all");
      case "canOpenBonkWalls": return !!items.boots || !!items.bomb;
      case "canHitRangedSwitch": return canHitRangedSwitch();
      case "canGetBonkableItem": return !!items.boots || (items.sword > 0 && items.quake);
      case "gtleft": return !!items.hammer && !!items.hookshot && canHitRangedSwitch();
      case "gtright": return !!items.somaria && !!items.firerod;
      case "canCrossEnergyBarrier": return items.sword > 1 || !!items.cape;
      case "canOpenGT": return crystalCheck() >= 7;

      case "canExitTurtleRockWestAndEnterEast": return !!items.bomb;
      case "canExitTurtleRockBack": return !!items.bomb;
      case "canOnlyReachTurtleRockMain": return true;

      case "never": return false;
      default: return true;
    }
  }

  // ── evaluator ─────────────────────────────────────────────────────────────
  function stateOfAllEntrance(requirements) {
    if (requirements.allOf) {
      for (var i = 0; i < requirements.allOf.length; i++) {
        if (!stateOfEntrance(requirements.allOf[i])) return false;
      }
    }
    if (requirements.anyOf) {
      for (var j = 0; j < requirements.anyOf.length; j++) {
        if (stateOfEntrance(requirements.anyOf[j])) return true;
      }
      return false;
    }
    return true;
  }

  // Open-mode region functions
  var REGION_FUNCS_OPEN = {
    "South Dark World":               canReachSouthDarkWorld,
    "East Dark World":                canReachEastDarkWorld,
    "West Dark World":                canReachWestDarkWorld,
    "North East Dark World":          canReachNorthEastDarkWorld,
    "South West Dark World":          canReachSouthWestDarkWorld,
    "South East Dark World":          canReachSouthEastDarkWorld,
    "Hyrule Castle Balcony":          canReachHyruleCastleBalcony,
    "Lower West Death Mountain":      canReachLowerWestDeathMountain,
    "Lower East Death Mountain":      canReachLowerEastDeathMountain,
    "Upper West Death Mountain":      canReachUpperWestDeathMountain,
    "Upper East Death Mountain":      canReachUpperEastDeathMountain,
    "Lower East Dark Death Mountain": canReachLowerEastDarkDeathMountain,
    "Lower West Dark Death Mountain": canReachLowerWestDarkDeathMountain,
    "Upper Dark Death Mountain":      canReachUpperDarkDeathMountain,
  };

  // Inverted-mode region functions (region names are prefixed "Inverted " in logic_entrances)
  var REGION_FUNCS_INVERTED = {
    "Inverted Light World":                     canReachInvertedLightWorld,
    "Inverted Light World Bunny":               canReachInvertedLightWorldBunny,
    "Inverted West Dark World":                 canReachInvertedWestDarkWorld,
    "Inverted South Dark World":                canReachInvertedSouthDarkWorld,
    "Inverted East Dark World":                 canReachInvertedEastDarkWorld,
    "Inverted North East Dark World":           canReachInvertedNorthEastDarkWorld,
    "Inverted South West Dark World":           canReachInvertedSouthWestDarkWorld,
    "Inverted South East Dark World":           canReachInvertedSouthEastDarkWorld,
    "Inverted Dark Death Mountain":             canReachInvertedDarkDeathMountain,
    "Inverted Lower West Death Mountain":       canReachInvertedLowerWestDeathMountain,
    "Inverted Upper West Death Mountain":       canReachInvertedUpperWestDeathMountain,
    "Inverted Upper East Death Mountain":       canReachInvertedUpperEastDeathMountain,
    "Inverted Lower East Death Mountain":       canReachInvertedLowerEastDeathMountain,
    "Inverted Lower East Dark Death Mountain":  canReachInvertedLowerEastDarkDeathMountain,
    "Inverted Hyrule Castle Balcony":           canReachInvertedHyruleCastleBalcony,
  };

  function stateOfEntrance(requirement) {
    if (typeof requirement === "object") return stateOfAllEntrance(requirement);

    if (requirement.indexOf("canReach|") === 0) {
      var region = requirement.split("|")[1];

      // Synthetic "found" regions from labeled/connected markers
      var foundRegions = window._entSyntheticFoundRegions;
      if (foundRegions && foundRegions.indexOf(region) !== -1) return true;

      // Try inverted REGION_FUNCS first (they have "Inverted" prefix), then open
      var fn = REGION_FUNCS_INVERTED[region] || REGION_FUNCS_OPEN[region];
      return fn ? fn() : false;
    }

    if (requirement.indexOf("hasFoundEntrance|") === 0) {
      return hasFoundEntranceName(requirement.split("|")[1]);
    }
    if (requirement.indexOf("hasFoundMapEntry|") === 0) {
      return false;
    }

    return bigRequirementSwitch(requirement);
  }

  // ── public API ────────────────────────────────────────────────────────────
  function checkEntranceAvailability(name, itemsObj, prizesObj) {
    items = itemsObj || {};
    prizes = prizesObj || [];
    var logic = getEntranceLogic();


    // Agahnim's Tower — inverted requires moonpearl + sword2/cape + balcony access
    if (name === "Agahnims Tower") {
      var _atInv = !!(window.trackerSettings && window.trackerSettings.inverted);
      if (_atInv) {
        if (!items.moonpearl) return "unavailable";
        if (!(items.sword >= 2 || items.cape)) return "unavailable";
        // Balcony reachable via connector to any HC entrance, or vanilla: agahnim + mirror
        var _atHCNames = {'Agahnims Tower':1,'Hyrule Castle Entrance (West)':1,'Hyrule Castle Entrance (East)':1,'Hyrule Castle Entrance (South)':1};
        var _atConns = (window._entConnections && window._entConnections.length)
          ? window._entConnections
          : (function() { try { return JSON.parse(localStorage.getItem('ent-connections') || '[]'); } catch(e) { return []; } })();
        var _atBalcony = _atConns.some(function(c) { return _atHCNames[c[0]] || _atHCNames[c[1]]; }) ||
          (items.agahnim && items.mirror);
        return _atBalcony ? "available" : "unavailable";
      }
    }

    // Pyramid Hole — always requires Aga2 (it's a drop, not a walkable entrance)
    if (name === "Pyramid Hole") {
      return items.agahnim2 ? "available" : "unavailable";
    }
    // Pyramid Exit — use ref_logic_entrances.js (same as Hyrule Castle Entrance (South)):
    // Open: always available; Inverted: canReach|Inverted Light World Bunny

    var def = logic[name];
    if (!def) return "available";

    // Pick Inverted or Open requirements based on current game mode
    var isInverted = !!(window.trackerSettings && window.trackerSettings.inverted);
    var requirements = isInverted ? (def.Inverted || def.Open) : (def.Open || def.Inverted);
    if (!requirements) return "available";
    return stateOfAllEntrance(requirements) ? "available" : "unavailable";
  }

  window.EntLogic = {
    checkEntranceAvailability: checkEntranceAvailability,
    hasFoundLightWorldEntrance: hasFoundLightWorldEntrance,
    isKnownDWEntrance: function(name) { return !!DW_ENTRANCES[name]; },
  };
})(window);
