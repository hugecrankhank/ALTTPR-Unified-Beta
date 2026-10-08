// Converted from app/Region/Standard/TowerOfHera.php (alttp_vt_randomizer, MIT)
import { Item, Location, Region, Boss, Shop, LocationCollection, ShopCollection, ItemCollection, in_array, __eq } from '../../core/index.js';

export class TowerOfHera extends Region {
    __init_props() {
        super.__init_props?.();
        this.name = "Tower Of Hera";
        this.music_addresses = [
        0x155C5,
        0x1107A,
        0x10B8C,
    ];
        this.map_reveal = 0x0020;
        this.region_items = [
        "BigKey",
        "BigKeyP3",
        "Compass",
        "CompassP3",
        "Key",
        "KeyP3",
        "Map",
        "MapP3",
        "PendantOfWisdom"
    ];
    }

    
    constructor(world) {
        super(world);

        // set a default boss
        this.boss = Boss.get("Moldorm", world);

        this.locations = new LocationCollection([
            new Location.Chest("Tower of Hera - Big Key Chest", [0xE9E6], null, this),
            new Location.Standing.HeraBasement("Tower of Hera - Basement Cage", [0x180162], null, this),
            new Location.Chest("Tower of Hera - Map Chest", [0xE9AD], null, this),
            new Location.Chest("Tower of Hera - Compass Chest", [0xE9FB], null, this),
            new Location.BigChest("Tower of Hera - Big Chest", [0xE9F8], null, this),
            new Location.Drop("Tower of Hera - Boss", [0x180152], null, this),

            new Location.Prize.Pendant("Tower of Hera - Prize", [null, 0x120A5, 0x53E78, 0x53E79, 0x18005A, 0x180071, 0xC706], null, this),
        ]);
        this.locations.setChecksForWorld(world.id);
        this.prize_location = this.locations.get("Tower of Hera - Prize");
    }

    
    canPlaceBoss(boss, level = "top") {
        if (
            this.name != "Ice Palace" && this.world.config("mode.weapons") == "swordless"
            && boss.getName() == "Kholdstare"
        ) {
            return false;
        }

        return !in_array(boss.getName(), [
            "Agahnim",
            "Agahnim2",
            "Armos Knights",
            "Arrghus",
            "Blind",
            "Ganon",
            "Lanmolas",
            "Trinexx",
        ]);
    }

    
    initalize() { let main, mire;
        main = (locations, items) => {
            return ((items.has("PegasusBoots") && this.world.config("canBootsClip", false))
                || (this.world.config("canSuperSpeed", false) && items.canSpinSpeed()))
                || this.world.config("canOneFrameClipOW", false)
                || ((items.has("MagicMirror") || (items.has("Hookshot") && items.has("Hammer")))
                    && this.world.getRegion("West Death Mountain").canEnter(locations, items));
        };

        mire = (locations, items) => {
            return this.world.config("canOneFrameClipUW", false)
                && ((locations.itemInLocations(Item.get("BigKeyD6", this.world), [
                    "Misery Mire - Compass Chest",
                    "Misery Mire - Big Key Chest",
                ]) && items.has("KeyD6", 2))
                    || items.has("KeyD6", 3))
                && this.world.getRegion("Misery Mire").canEnter(locations, items);
        };

        this.locations.get("Tower of Hera - Big Key Chest").setRequirements((locations, items) => {
            return items.canLightTorches() && items.has("KeyP3");
        }).setAlwaysAllow((item, items) => {
            return this.world.config("accessibility") !== "locations" && __eq(item, Item.get("KeyP3", this.world));
        }).setFillRules((item, locations, items) => {
            return this.world.config("accessibility") !== "locations" || !__eq(item, Item.get("KeyP3", this.world));
        });

        this.locations.get("Tower of Hera - Compass Chest").setRequirements((locations, items) => {
            return (main(locations, items) && items.has("BigKeyP3"))
                || mire(locations, items);
        });

        this.locations.get("Tower of Hera - Big Chest").setRequirements((locations, items) => {
            return (main(locations, items) && items.has("BigKeyP3"))
                || (mire(locations, items) && (items.has("BigKeyP3") || items.has("BigKeyD6")));
        });

        this.can_complete = (locations, items) => {
            return this.locations.get("Tower of Hera - Boss").canAccess(items);
        };

        this.locations.get("Tower of Hera - Boss").setRequirements((locations, items) => {
            return main(locations, items)
                && this.boss.canBeat(items, locations)
                && (items.has("BigKeyP3") || (mire(locations, items) && items.has("BigKeyD6")))
                && (!this.world.config("region.wildCompasses", false) || items.has("CompassP3") || this.locations.get("Tower of Hera - Boss").hasItem(Item.get("CompassP3", this.world)))
                && (!this.world.config("region.wildMaps", false) || items.has("MapP3") || this.locations.get("Tower of Hera - Boss").hasItem(Item.get("MapP3", this.world)));
        }).setFillRules((item, locations, items) => {
            if (
                !this.world.config("region.bossNormalLocation", true)
                && (item instanceof Item.Key || item instanceof Item.BigKey
                    || item instanceof Item.Map || item instanceof Item.Compass)
            ) {
                return false;
            }

            return true;
        }).setAlwaysAllow((item, items) => {
            return this.world.config("region.bossNormalLocation", true)
                && (__eq(item, Item.get("CompassP3", this.world)) || __eq(item, Item.get("MapP3", this.world)));
        });

        this.can_enter = (locations, items) => {
            return items.has("RescueZelda")
                && (main(locations, items)
                    || mire(locations, items));
        };

        this.prize_location.setRequirements(this.can_complete);

        return this;
    }
}
