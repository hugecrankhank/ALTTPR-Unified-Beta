from dataclasses import dataclass, field
from typing import List

import RaceRandom as random


def _load_entries():
    entries = []
    with open("data/damage_table.bin", 'rb') as stream:
        for sprite in range(0x100):
            entries.append([])
            for pair in range(8):
                byte = stream.read(1)[0]
                entries[sprite].append(byte >> 4)
                entries[sprite].append(byte & 0x0F)
    return entries

@dataclass
class DamageTable:
    _entries: List[int] = field(default_factory=_load_entries)

    def randomize_sword_subclasses(self):
        for sprite in range(0xD8):
            for dclass in range(1, 6):
                if self._entries[sprite][dclass] > 0:
                    self._entries[sprite][dclass] = random.randint(1, 7)

    def get_bytes(self):
        values = []
        for sprite in range(0x100):
            for dclass in range(0, 16, 2):
                cur = self._entries[sprite][dclass] & 0xF
                nex = self._entries[sprite][dclass + 1] & 0xF
                values.append((cur << 4) | nex)
        return values


if __name__ == '__main__':
    def print_table(table):
        bytelist = table.get_bytes()
        for sprite in range(0x100):
            for byte in range(8):
                print(format(bytelist.pop(0), "02X"), end=" ")
            print()
        print()

    dmg = DamageTable()
    print_table(dmg)
    dmg.randomize_sword_subclasses()
    print_table(dmg)
