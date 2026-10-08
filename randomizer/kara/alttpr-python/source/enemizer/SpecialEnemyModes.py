import RaceRandom as random
from source.dungeon.EnemyList import (
    EnemySprite,
    SpriteType,
    enemy_names,
    sprite_translation,
)
from Utils import snes_to_pc

change_idx_1 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 13, 16, 18, 19, 20, 21, 22, 23, 24, 25, 26, 28, 31, 32, 35, 38, 65, 66, 67, 68, 70, 71, 76, 77, 78, 81, 83, 89, 91, 92, 94, 97, 100, 101, 102, 103, 104, 105, 106, 107]


def set_mimic_map(reqs, enemy_map):
    for room_id, sprites in enemy_map.items():
        for idx, sprite in enumerate(sprites):
            subtype = 0 if sprite.sub_type != SpriteType.Overlord else sprite.sub_type
            req = reqs.get((sprite.kind, subtype))

            if isinstance(req, dict):
                if room_id not in req:
                    continue
                req = req[room_id]
            if not req or req.boss:
                continue

            if not sprite.static and not req.static and req.can_randomize:
                if random.random() > 0.1:
                    sprite.kind = EnemySprite.GreenMimic
                else:
                    sprite.kind = EnemySprite.RedMimic

def set_mimics(data_tables):
    reqs = data_tables.sprite_requirements
    sheets = data_tables.sprite_sheets
    uw_enemy_map = data_tables.uw_enemy_table.room_map
    ow_enemy_map = data_tables.ow_enemy_table

    for idx in change_idx_1:
        sheets[idx].sub_groups[1] = 0x2c

    set_mimic_map(reqs, uw_enemy_map)
    set_mimic_map(reqs, ow_enemy_map)


def write_mimic_changes(rom, double = False):
    if double:
        rom.write_bytes(snes_to_pc(0x1EC71B),
           [0x00, 0xE0, 0x20, 0x00, 0x00, 0xE6, 0x1A, 0x00,
            0x00, 0xE6, 0x1A, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0xD0, 0x30, 0x00, 0x00, 0xE0, 0x20, 0x00,
            0x00, 0xE0, 0x20, 0x00, 0x00, 0x00, 0x00, 0x00,

            0x00, 0x00, 0x00, 0x00, 0xE0, 0xF6, 0xF6, 0x00,
            0x20, 0x1A, 0x1A, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0xD0, 0xE0, 0xE0, 0x00,
            0x30, 0x20, 0x20, 0x00, 0x00, 0x00, 0x00, 0x00])
    else:
        rom.write_bytes(snes_to_pc(0x1EC71B),
           [0x00, 0xF0, 0x10, 0x00, 0x00, 0xF3, 0x0D, 0x00,
            0x00, 0xF3, 0x0D, 0x00, 0x00, 0x00, 0x00, 0x00])

    # mimics move during dashes
    rom.write_byte(snes_to_pc(0x3080A5), 0x01)

    # reverse green mimic direction
    rom.write_bytes(snes_to_pc(0x1EC75C), [0x01, 0x00])

    # make red mimics use green palette
    rom.write_byte(snes_to_pc(0x0DB3DD), 0x0D)

    # make zol-dropper drop mimics
    rom.write_byte(snes_to_pc(0x0DB10F), 0x05)
    rom.write_byte(snes_to_pc(0x0DB3E8), 0x1D)
    rom.write_bytes(snes_to_pc(0x1EB1CC), [0x22, 0x89, 0xF5, 0x1D, 0x60])
    rom.write_bytes(snes_to_pc(0x1EB0D9), [0x83, 0x9D, 0x20, 0x0E, 0xFE, 0xA0, 0x0D, 0x9E, 0xAA, 0x0C])
