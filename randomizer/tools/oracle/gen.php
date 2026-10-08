<?php
// Usage: php gen.php '<json settings>' <rng seed> [out.json]
// Mirrors RandomizerController::prepSeed for the options the app exposes.
require __DIR__ . '/boot.php';

use ALttP\Randomizer;
use ALttP\Rom;
use ALttP\World;
use ALttP\Support\WorldCollection;

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

$world = World::factory($in('mode', 'standard'), [
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
    'spoil.Hints' => $in('hints', 'on'),
    'logic' => 'NoGlitches',
    'item.pool' => $in('item.pool', 'normal'),
    'item.functionality' => $in('item.functionality', 'normal'),
    'enemizer.bossShuffle' => 'none',
    'enemizer.enemyShuffle' => 'none',
    'enemizer.enemyDamage' => 'default',
    'enemizer.enemyHealth' => 'default',
    'enemizer.potShuffle' => 'off',
]);

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
