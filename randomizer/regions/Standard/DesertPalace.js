// Converted from app/Region/Standard/DesertPalace.php (alttp_vt_randomizer, MIT)
import { Item, Location, Region, Boss, Shop, LocationCollection, ShopCollection, ItemCollection, in_array, __eq } from '../../core/index.js';

export class DesertPalace extends Region {
    __init_props() {
        super.__init_props?.();
        this.name = "Desert Palace";
        this.music_addresses = [
        0x1559B,
        0x1559C,
        0x1559D,
        0x1559E,
    ];
        this.map_reveal = 0x1000;
        this.region_items = [
        "BigKey",
        "BigKeyP2",
        "Compass",
        "CompassP2",
        "Key",
        "KeyP2",
        "Map",
        "MapP2",
        "MapP2",
        "PendantOfPower"
    ];
    }

    
    constructor(world) {
        super(world);

        // set a default boss
        this.boss = Boss.get("Lanmolas", world);

        this.locations = new LocationCollection([
            new Location.BigChest("Desert Palace - Big Chest", [0xE98F], null, this),
            new Location.Chest("Desert Palace - Map Chest", [0xE9B6], null, this),
            new Location.Dash("Desert Palace - Torch", [0x180160], null, this),
            new Location.Chest("Desert Palace - Big Key Chest", [0xE9C2], null, this),
            new Location.Chest("Desert Palace - Compass Chest", [0xE9CB], null, this),
            new Location.Drop("Desert Palace - Boss", [0x180151], null, this),

            new Location.Prize.Pendant("Desert Palace - Prize", [null, 0x1209E, 0x53E7A, 0x53E7B, 0x180053, 0x180072, 0xC6FF], null, this),
        ]);
        this.locations.setChecksForWorld(world.id);
        this.prize_location = this.locations.get("Desert Palace - Prize");
    }

    
    initalize() {
        this.locations.get("Desert Palace - Big Chest").setRequirements((locations, items) => {
            return items.has("BigKeyP2");
        });

        this.locations.get("Desert Palace - Big Key Chest").setRequirements((locations, items) => {
            return items.has("KeyP2") && items.canKillMostThings(this.world);
        });

        this.locations.get("Desert Palace - Compass Chest").setRequirements((locations, items) => {
            return items.has("KeyP2");
        });

        this.locations.get("Desert Palace - Torch").setRequirements((locations, items) => {
            return items.has("PegasusBoots");
        });

        this.can_complete = (locations, items) => {
            return this.locations.get("Desert Palace - Boss").canAccess(items);
        };

        this.locations.get("Desert Palace - Boss").setRequirements((locations, items) => {
            return this.canEnter(locations, items)
                && (items.canLiftRocks()
                    || (this.world.config("canBootsClip", false) && items.has("PegasusBoots"))
                    || (this.world.config("canSuperSpeed", false) && items.canSpinSpeed())
                    || this.world.config("canOneFrameClipOW", false)
                    || (items.has("MagicMirror") && this.world.getRegion("Mire").canEnter(locations, items)))
                && items.canLightTorches()
                && items.has("BigKeyP2") && items.has("KeyP2")
                && this.boss.canBeat(items, locations)
                && (!this.world.config("region.wildCompasses", false) || items.has("CompassP2") || this.locations.get("Desert Palace - Boss").hasItem(Item.get("CompassP2", this.world)))
                && (!this.world.config("region.wildMaps", false) || items.has("MapP2") || this.locations.get("Desert Palace - Boss").hasItem(Item.get("MapP2", this.world)));
        }).setFillRules((item, locations, items) => {
            if (
                !this.world.config("region.bossNormalLocation", true)
                && (item instanceof Item.Key || item instanceof Item.BigKey
                    || item instanceof Item.Map || item instanceof Item.Compass)
            ) {
                return false;
            }
            return !in_array(item, [Item.get("KeyP2", this.world), Item.get("BigKeyP2", this.world)]);
        }).setAlwaysAllow((item, items) => {
            return this.world.config("region.bossNormalLocation", true)
                && (__eq(item, Item.get("CompassP2", this.world)) || __eq(item, Item.get("MapP2", this.world)));
        });

        this.can_enter = (locations, items) => {
            return items.has("RescueZelda")
                && (items.has("BookOfMudora")
                    || (this.world.config("canBootsClip", false) && items.has("PegasusBoots"))
                    || this.world.config("canOneFrameClipOW", false)
                    || (items.has("MagicMirror") && this.world.getRegion("Mire").canEnter(locations, items)));
        };

        this.prize_location.setRequirements(this.can_complete);

        return this;
    }
}
