<?php
// Dump location accessibility for deterministic random item sets.
require __DIR__ . '/boot.php';
use ALttP\World; use ALttP\Item; use ALttP\Support\ItemCollection;
$req = json_decode($argv[1] ?? '{}', true) ?: [];
$n = (int)($argv[2] ?? 50);
vt_seed(777);
$world = World::factory($req['mode'] ?? 'open', array_merge(['logic' => 'NoGlitches', 'itemPlacement' => 'advanced', 'goal' => 'ganon', 'crystals.ganon' => '7', 'crystals.tower' => '7', 'mode.weapons' => 'randomized', 'dungeonItems' => 'standard'], $req['config'] ?? []));
$world->getLocation('Turtle Rock Medallion')->setItem(Item::get('Quake', $world));
$world->getLocation('Misery Mire Medallion')->setItem(Item::get('Ether', $world));
$pool = array_merge($world->getAdvancementItems(), $world->getDungeonPool(), $world->getNiceItems());
$pool = array_values(array_filter($pool, fn($i) => !($i instanceof Item\Bottle) || true));
$prizes = ['Crystal1','Crystal2','Crystal3','Crystal4','Crystal5','Crystal6','Crystal7','PendantOfCourage','PendantOfPower','PendantOfWisdom','RescueZelda','DefeatAgahnim','BigRedBomb','DefeatAgahnim2'];
foreach ($prizes as $p) $pool[] = Item::get($p, $world);
$out = [];
$names = array_keys($world->getLocations()->all());
for ($s = 0; $s < $n; $s++) {
    $take = get_random_int(0, count($pool));
    $items = array_slice(fy_shuffle($pool), 0, $take);
    $ic = new ItemCollection($items);
    $ic->setChecksForWorld($world->id);
    $bits = '';
    foreach ($world->getLocations() as $loc) $bits .= $loc->canAccess($ic) ? '1' : '0';
    $r = '';
    foreach ($world->getRegions() as $reg) $r .= $reg->canEnter($world->getLocations(), $ic) ? '1' : '0';
    $out[] = [$take, $bits, $r, array_map(fn($i) => $i->getName(), $items)];
}
echo json_encode(['names' => $names, 'regions' => array_keys($world->getRegions()), 'rows' => $out]);
