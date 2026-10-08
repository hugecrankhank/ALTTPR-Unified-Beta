// Converted from app/Region/Standard/SwampPalace.php (alttp_vt_randomizer, MIT)
import { Item, Location, Region, Boss, Shop, LocationCollection, ShopCollection, ItemCollection, __eq } from '../../core/index.js';

export class SwampPalace extends Region {
    __init_props() {
        super.__init_props?.();
        this.name = "Swamp Palace";
        this.music_addresses = [
        0x155B7,
    ];
        this.map_reveal = 0x0400;
        this.region_items = [
        "BigKey",
        "BigKeyD2",
        "Compass",
        "CompassD2",
        "Key",
        "KeyD2",
        "Map",
        "MapD2",
        "Crystal2"
    ];
    }

    
    constructor(world) {
        super(world);

        this.boss = Boss.get("Arrghus", world);

        this.locations = new LocationCollection([
            new Location.Chest("Swamp Palace - Entrance", [0xEA9D], null, this),
            new Location.BigChest("Swamp Palace - Big Chest", [0xE989], null, this),
            new Location.Chest("Swamp Palace - Big Key Chest", [0xEAA6], null, this),
            new Location.Chest("Swamp Palace - Map Chest", [0xE986], null, this),
            new Location.Chest("Swamp Palace - West Chest", [0xEAA3], null, this),
            new Location.Chest("Swamp Palace - Compass Chest", [0xEAA0], null, this),
            new Location.Chest("Swamp Palace - Flooded Room - Left", [0xEAA9], null, this),
            new Location.Chest("Swamp Palace - Flooded Room - Right", [0xEAAC], null, this),
            new Location.Chest("Swamp Palace - Waterfall Room", [0xEAAF], null, this),
            new Location.Drop("Swamp Palace - Boss", [0x180154], null, this),

            new Location.Prize.Crystal("Swamp Palace - Prize", [null, 0x120A0, 0x53E88, 0x53E89, 0x180055, 0x180079, 0xC701], null, this),
        ]);
        this.locations.setChecksForWorld(world.id);
        this.prize_location = this.locations.get("Swamp Palace - Prize");
    }

    
    initalize() { let mire, hera;
        mire = (locations, items) => {
            return this.world.config("canOneFrameClipUW", false)
                && items.has("KeyD6", 3)
                && this.world.getRegion("Misery Mire").canEnter(locations, items);
        };

        hera = (locations, items) => {
            return this.world.config("canOneFrameClipUW", false)
                && this.world.getRegion("Tower of Hera").canEnter(locations, items)
                && items.has("BigKeyP3");
        };

        this.locations.get("Swamp Palace - Entrance").setFillRules((item, locations, items) => {
            return this.world.config("canOneFrameClipUW", false)
                || this.world.config("region.wildKeys", false)
                || __eq(item, Item.get("KeyD2", this.world));
        });

        this.locations.get("Swamp Palace - Big Chest").setRequirements((locations, items) => {
            return (items.has("KeyD2") || mire(locations, items))
                && (items.has("Hammer")
                    || mire(locations, items) || hera(locations, items))
                && (items.has("BigKeyD2")
                    || (mire(locations, items) && items.has("BigKeyD6"))
                    || (hera(locations, items) && items.has("BigKeyP3")));
        }).setAlwaysAllow((item, items) => {
            return this.world.config("accessibility") !== "locations" && __eq(item, Item.get("BigKeyD2", this.world));
        }).setFillRules((item, locations, items) => {
            return this.world.config("accessibility") !== "locations" || !__eq(item, Item.get("BigKeyD2", this.world));
        });

        this.locations.get("Swamp Palace - Big Key Chest").setRequirements((locations, items) => {
            return (items.has("KeyD2") || mire(locations, items))
                && (items.has("Hammer")
                    || mire(locations, items) || hera(locations, items));
        });

        this.locations.get("Swamp Palace - Map Chest").setRequirements((locations, items) => {
            return items.canBombThings()
                && (items.has("KeyD2") || mire(locations, items));
        });

        this.locations.get("Swamp Palace - West Chest").setRequirements((locations, items) => {
            return (items.has("KeyD2") || mire(locations, items))
                && (items.has("Hammer")
                    || mire(locations, items) || hera(locations, items));
        });

        this.locations.get("Swamp Palace - Compass Chest").setRequirements((locations, items) => {
            return (items.has("KeyD2") || mire(locations, items))
                && (items.has("Hammer")
                    || mire(locations, items) || hera(locations, items));
        });

        this.locations.get("Swamp Palace - Flooded Room - Left").setRequirements((locations, items) => {
            return items.has("Hookshot")
                && (items.has("KeyD2") || mire(locations, items))
                && (items.has("Hammer")
                    || mire(locations, items) || hera(locations, items));
        });

        this.locations.get("Swamp Palace - Flooded Room - Right").setRequirements((locations, items) => {
            return items.has("Hookshot")
                && (items.has("KeyD2") || mire(locations, items))
                && (items.has("Hammer")
                    || mire(locations, items) || hera(locations, items));
        });

        this.locations.get("Swamp Palace - Waterfall Room").setRequirements((locations, items) => {
            return items.has("Hookshot")
                && (items.has("KeyD2") || mire(locations, items))
                && (items.has("Hammer")
                    || mire(locations, items) || hera(locations, items));
        });

        this.can_complete = (locations, items) => {
            return this.locations.get("Swamp Palace - Boss").canAccess(items);
        };

        this.locations.get("Swamp Palace - Boss").setRequirements((locations, items) => {
            return items.has("Hookshot")
                && (items.has("KeyD2") || mire(locations, items))
                && (items.has("Hammer")
                    || mire(locations, items) || hera(locations, items))
                && this.boss.canBeat(items, locations)
                && (!this.world.config("region.wildCompasses", false) || items.has("CompassD2") || this.locations.get("Swamp Palace - Boss").hasItem(Item.get("CompassD2", this.world)))
                && (!this.world.config("region.wildMaps", false) || items.has("MapD2") || this.locations.get("Swamp Palace - Boss").hasItem(Item.get("MapD2", this.world)));
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
                && (__eq(item, Item.get("CompassD2", this.world)) || __eq(item, Item.get("MapD2", this.world)));
        });

        this.can_enter = (locations, items) => {
            return items.has("RescueZelda")
                && (this.world.config("itemPlacement") !== "basic"
                    || ((this.world.config("mode.weapons") === "swordless" || items.hasSword()) && items.hasHealth(7) && items.hasABottle()))
                && items.has("Flippers")
                && this.world.getRegion("South Dark World").canEnter(locations, items)
                && ((items.has("MoonPearl")
                    && items.has("MagicMirror"))
                    || (this.world.config("canOneFrameClipUW", false)
                        && (items.has("BigKeyP3") || items.has("BigKeyD6")) && mire(locations, items)
                        && locations.get("Old Man").canAccess(items)
                        && ((items.has("PegasusBoots")
                            && this.world.config("canBootsClip", false))
                            || (this.world.config("canSuperSpeed", false)
                                && items.canSpinSpeed())
                            || this.world.config("canOneFrameClipOW", false))));
        };

        this.prize_location.setRequirements(this.can_complete);

        return this;
    }
}
