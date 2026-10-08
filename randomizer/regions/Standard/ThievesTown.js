// Converted from app/Region/Standard/ThievesTown.php (alttp_vt_randomizer, MIT)
import { Item, Location, Region, Boss, Shop, LocationCollection, ShopCollection, ItemCollection, __eq } from '../../core/index.js';

export class ThievesTown extends Region {
    __init_props() {
        super.__init_props?.();
        this.name = "Thieves Town";
        this.music_addresses = [
        0x155C6,
    ];
        this.map_reveal = 0x0010;
        this.region_items = [
        "BigKey",
        "BigKeyD4",
        "Compass",
        "CompassD4",
        "Key",
        "KeyD4",
        "Map",
        "MapD4",
        "Crystal4"
    ];
    }

    
    constructor(world) {
        super(world);

        this.boss = Boss.get("Blind", world);

        this.locations = new LocationCollection([
            new Location.Chest("Thieves' Town - Attic", [0xEA0D], null, this),
            new Location.Chest("Thieves' Town - Big Key Chest", [0xEA04], null, this),
            new Location.Chest("Thieves' Town - Map Chest", [0xEA01], null, this),
            new Location.Chest("Thieves' Town - Compass Chest", [0xEA07], null, this),
            new Location.Chest("Thieves' Town - Ambush Chest", [0xEA0A], null, this),
            new Location.BigChest("Thieves' Town - Big Chest", [0xEA10], null, this),
            new Location.Chest("Thieves' Town - Blind's Cell", [0xEA13], null, this),
            new Location.Drop("Thieves' Town - Boss", [0x180156], null, this),

            new Location.Prize.Crystal("Thieves' Town - Prize", [null, 0x120A6, 0x53E82, 0x53E83, 0x18005B, 0x180076, 0xC707], null, this),
        ]);
        this.locations.setChecksForWorld(world.id);
        this.prize_location = this.locations.get("Thieves' Town - Prize");
    }

    
    initalize() {
        this.locations.get("Thieves' Town - Attic").setRequirements((locations, items) => {
            return items.has("KeyD4") && items.has("BigKeyD4");
        });

        this.locations.get("Thieves' Town - Big Chest").setRequirements((locations, items) => {
            if (locations.get("Thieves' Town - Big Chest").hasItem(Item.get("KeyD4", this.world))) {
                return items.has("Hammer") && items.has("BigKeyD4");
            }

            return items.has("Hammer") && items.has("KeyD4") && items.has("BigKeyD4");
        }).setAlwaysAllow((item, items) => {
            return this.world.config("accessibility") !== "locations" && __eq(item, Item.get("KeyD4", this.world)) && items.has("Hammer");
        }).setFillRules((item, locations, items) => {
            return this.world.config("accessibility") !== "locations" || !__eq(item, Item.get("KeyD4", this.world));
        });

        this.locations.get("Thieves' Town - Blind's Cell").setRequirements((locations, items) => {
            return items.has("BigKeyD4");
        });

        this.can_complete = (locations, items) => {
            return this.locations.get("Thieves' Town - Boss").canAccess(items);
        };

        this.locations.get("Thieves' Town - Boss").setRequirements((locations, items) => {
            return this.canEnter(locations, items)
                && items.has("KeyD4") && items.has("BigKeyD4")
                && this.boss.canBeat(items, locations)
                && (!this.world.config("region.wildCompasses", false) || items.has("CompassD4") || this.locations.get("Thieves' Town - Boss").hasItem(Item.get("CompassD4", this.world)))
                && (!this.world.config("region.wildMaps", false) || items.has("MapD4") || this.locations.get("Thieves' Town - Boss").hasItem(Item.get("MapD4", this.world)));
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
                && (__eq(item, Item.get("CompassD4", this.world)) || __eq(item, Item.get("MapD4", this.world)));
        });

        this.can_enter = (locations, items) => {
            return items.has("RescueZelda")
                && (this.world.config("itemPlacement") !== "basic"
                    || ((this.world.config("mode.weapons") === "swordless" || items.hasSword()) && items.hasHealth(7) && items.hasABottle()))
                && (items.has("MoonPearl")
                    || (items.hasABottle() && this.world.config("canOWYBA", false))
                    || (this.world.config("canBunnyRevive", false) && items.canSpinSpeed()))
                && this.world.getRegion("North West Dark World").canEnter(locations, items);
        };

        this.prize_location.setRequirements(this.can_complete);

        return this;
    }
}
