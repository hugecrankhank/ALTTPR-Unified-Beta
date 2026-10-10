<?php
// Usage: php custom.php '<json request>' <rng seed> [out.json]
// Mirrors CustomizerController::prepSeed (no Laravel, no enemizer, no seed record).
// `l` is keyed by plain location names, as generate.js's generateCustom takes it.
require __DIR__ . '/boot.php';

use ALttP\Item;
use ALttP\Randomizer;
use ALttP\Rom;
use ALttP\Sprite;
use ALttP\Support\ItemCollection;
use ALttP\Support\WorldCollection;
use ALttP\World;

ini_set('memory_limit', '1024M');
$req = json_decode($argv[1] ?? '{}', true) ?: [];
$seed = (int) ($argv[2] ?? 1);
$out = $argv[3] ?? null;
$in = function ($k, $d) use ($req) { return \Illuminate\Support\Arr::get($req, $k, $d); };

vt_seed($seed);

$crystals_ganon = $in('crystals.ganon', '7');
$crystals_ganon = $crystals_ganon === 'random' ? get_random_int(0, 7) : $crystals_ganon;
$crystals_tower = $in('crystals.tower', '7');
$crystals_tower = $crystals_tower === 'random' ? get_random_int(0, 7) : $crystals_tower;
$logic = [
    'none' => 'NoGlitches',
    'overworld_glitches' => 'OverworldGlitches',
    'hybrid_major_glitches' => 'HybridMajorGlitches',
    'major_glitches' => 'MajorGlitches',
    'no_logic' => 'NoLogic',
][$in('glitches', 'none')];

$custom_data = $req['custom'] ?? [];
$custom_data['spoil.Hints'] = $in('hints', 'on');
$custom_data['item.require.Lamp'] = ($custom_data['item.require.Lamp'] ?? false) ? 0 : 1;
foreach (['region.wildCompasses', 'region.wildMaps', 'region.wildBigKeys', 'region.wildKeys'] as $k) {
    $w[$k] = (int) (bool) ($custom_data[$k] ?? false);
}
if ($custom_data['rom.freeItemMenu'] ?? false) {
    $custom_data['rom.freeItemMenu'] = 0x00 | ($w['region.wildCompasses'] << 3) | ($w['region.wildMaps'] << 2)
        | ($w['region.wildBigKeys'] << 1) | $w['region.wildKeys'];
}
if ($custom_data['rom.freeItemText'] ?? false) {
    $custom_data['rom.freeItemText'] = 0x10 | ($w['region.wildBigKeys'] << 3) | ($w['region.wildMaps'] << 2)
        | ($w['region.wildCompasses'] << 1) | $w['region.wildKeys'];
}

$world = World::factory($in('mode', 'standard'), array_merge([
    'difficulty' => 'custom',
    'itemPlacement' => $in('item_placement', 'basic'),
    'dungeonItems' => $in('dungeon_items', 'standard'),
    'accessibility' => $in('accessibility', 'items'),
    'goal' => $in('goal', 'ganon'),
    'crystals.ganon' => $crystals_ganon,
    'crystals.tower' => $crystals_tower,
    'entrances' => 'none',
    'mode.weapons' => $in('weapons', 'randomized'),
    'tournament' => false,
    'spoilers' => 'on',
    'allow_quickswap' => $in('allow_quickswap', true),
    'override_start_screen' => false,
    'pseudoboots' => $in('pseudoboots', false),
    'logic' => $logic,
    'item.pool' => $in('item.pool', 'normal'),
    'item.functionality' => $in('item.functionality', 'normal'),
    'enemizer.bossShuffle' => 'none',
    'enemizer.enemyShuffle' => 'none',
    'enemizer.enemyDamage' => 'default',
    'enemizer.enemyHealth' => 'default',
    'enemizer.potShuffle' => 'off',
    'ignoreCanKillEscapeThings' => array_key_exists("Link's Uncle", $req['l'] ?? []),
    'customPrizePacks' => true,
], $custom_data));

$locations = $world->getLocations();
foreach ($req['l'] ?? [] as $location => $item) {
    $location .= ':1';
    if (isset($locations[$location])) {
        $place_item = $item === 'BottleWithRandom' ? $world->getBottle() : Item::get(preg_replace('/:\d+$/', '', $item), $world);
        if ($world->config('mode.weapons') === 'swordless' && $place_item instanceof Item\Sword) {
            $place_item = Item::get('TwentyRupees2', $world);
        }
        $locations[$location]->setItem($place_item);
    }
}
$world->setPreCollectedItems(new ItemCollection([
    Item::get('BombUpgrade10', $world),
    Item::get('ArrowUpgrade10', $world),
    Item::get('ArrowUpgrade10', $world),
    Item::get('ArrowUpgrade10', $world),
]));
foreach ($req['eq'] ?? [] as $item) {
    try {
        $place_item = Item::get($item, $world);
        if ($world->config('mode.weapons') === 'swordless' && $place_item instanceof Item\Sword) {
            $place_item = Item::get('TwentyRupees2', $world);
        }
        $world->addPreCollectedItem($place_item);
    } catch (Exception $e) {
    }
}
foreach ($req['drops'] ?? [] as $pack => $items) {
    foreach ($items as $place => $item) {
        if ($item == 'auto_fill') continue;
        $drop = Sprite::get($item);
        if (!$drop instanceof \ALttP\Sprite\Droppable) continue;
        $world->setDrop($pack, $place, $drop);
    }
}

$rom = new Rom();
$rand = new Randomizer([$world]);
$t0 = microtime(true);
$rand->randomize();
$world->writeToRom($rom, false);
$worlds = new WorldCollection($rand->getWorlds());
$winnable = $worlds->isWinnable();
$spoiler = $world->getSpoiler([
    'entry_crystals_ganon' => $in('crystals.ganon', '7'),
    'entry_crystals_tower' => $in('crystals.tower', '7'),
    'worlds' => 1,
    'difficulty' => 'custom',
]);
$patch = patch_merge_minify($rom->getWriteLog());
$res = [
    'winnable' => $winnable,
    'rng_calls' => $GLOBALS['__rng_calls'],
    'ms' => (int) ((microtime(true) - $t0) * 1000),
    'patch' => $patch,
    'spoiler' => $spoiler,
];
$json = json_encode($res, JSON_PRETTY_PRINT);
if ($out) file_put_contents($out, $json); else echo $json;
