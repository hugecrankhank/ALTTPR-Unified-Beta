// Converted from app/Region/Standard/EasternPalace.php (alttp_vt_randomizer, MIT)
import { Item, Location, Region, Boss, Shop, LocationCollection, ShopCollection, ItemCollection, __eq } from '../../core/index.js';

export class EasternPalace extends Region {
    __init_props() {
        super.__init_props?.();
        this.name = "Eastern Palace";
        this.music_addresses = [
        0x1559A,
    ];
        this.map_reveal = 0x2000;
        this.region_items = [
        "BigKey",
        "BigKeyP1",
        "Compass",
        "CompassP1",
        "Key",
        "KeyP1",
        "Map",
        "MapP1",
        "PendantOfWisdom"
    ];
    }

    
    constructor(world) {
        super(world);

        // set a default boss
        this.boss = Boss.get("Armos Knights", world);

        this.locations = new LocationCollection([
            new Location.Chest("Eastern Palace - Compass Chest", [0xE977], null, this),
            new Location.BigChest("Eastern Palace - Big Chest", [0xE97D], null, this),
            new Location.Chest("Eastern Palace - Cannonball Chest", [0xE9B3], null, this),
            new Location.Chest("Eastern Palace - Big Key Chest", [0xE9B9], null, this),
            new Location.Chest("Eastern Palace - Map Chest", [0xE9F5], null, this),
            new Location.Drop("Eastern Palace - Boss", [0x180150], null, this),

            new Location.Prize.Pendant("Eastern Palace - Prize", [null, 0x1209D, 0x53E76, 0x53E77, 0x180052, 0x180070, 0xC6FE], null, this),
        ]);
        this.locations.setChecksForWorld(world.id);
        this.prize_location = this.locations.get("Eastern Palace - Prize");
    }

    
    initalize() {
        this.locations.get("Eastern Palace - Big Chest").setRequirements((locations, items) => {
            return items.has("BigKeyP1");
        });

        this.locations.get("Eastern Palace - Big Key Chest").setRequirements((locations, items) => {
            return items.has("Lamp", this.world.config("item.require.Lamp", 1));
        });

        this.can_complete = (locations, items) => {
            return this.locations.get("Eastern Palace - Boss").canAccess(items);
        };

        this.locations.get("Eastern Palace - Boss").setRequirements((locations, items) => {
            return items.canShootArrows(this.world)
                && (items.has("Lamp", this.world.config("item.require.Lamp", 1))
                    || (this.world.config("itemPlacement") === "advanced" && items.has("FireRod")))
                && items.has("BigKeyP1")
                && this.boss.canBeat(items, locations)
                && (!this.world.config("region.wildCompasses", false) || items.has("CompassP1") || this.locations.get("Eastern Palace - Boss").hasItem(Item.get("CompassP1", this.world)))
                && (!this.world.config("region.wildMaps", false) || items.has("MapP1") || this.locations.get("Eastern Palace - Boss").hasItem(Item.get("MapP1", this.world)));
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
                && (__eq(item, Item.get("CompassP1", this.world)) || __eq(item, Item.get("MapP1", this.world)));
        });

        this.can_enter = (locations, items) => {
            return items.has("RescueZelda");
        };

        this.prize_location.setRequirements(this.can_complete);

        return this;
    }
}
