// Converted from app/Region/Standard/SkullWoods.php (alttp_vt_randomizer, MIT)
import { Item, Location, Region, Boss, Shop, LocationCollection, ShopCollection, ItemCollection, in_array, __eq } from '../../core/index.js';

export class SkullWoods extends Region {
    __init_props() {
        super.__init_props?.();
        this.name = "Skull Woods";
        this.music_addresses = [
        0x155BA,
        0x155BB,
        0x155BC,
        0x155BD,
        0x15608,
        0x15609,
        0x1560A,
        0x1560B,
    ];
        this.map_reveal = 0x0080;
        this.region_items = [
        "BigKey",
        "BigKeyD3",
        "Compass",
        "CompassD3",
        "Key",
        "KeyD3",
        "Map",
        "MapD3",
        "Crystal3",
    ];
    }

    
    constructor(world) {
        super(world);

        this.boss = Boss.get("Mothula", world);

        this.locations = new LocationCollection([
            new Location.BigChest("Skull Woods - Big Chest", [0xE998], null, this),
            new Location.Chest("Skull Woods - Big Key Chest", [0xE99E], null, this),
            new Location.Chest("Skull Woods - Compass Chest", [0xE992], null, this),
            new Location.Chest("Skull Woods - Map Chest", [0xE99B], null, this),
            new Location.Chest("Skull Woods - Bridge Room", [0xE9FE], null, this),
            new Location.Chest("Skull Woods - Pot Prison", [0xE9A1], null, this),
            new Location.Chest("Skull Woods - Pinball Room", [0xE9C8], null, this),
            new Location.Drop("Skull Woods - Boss", [0x180155], null, this),

            new Location.Prize.Crystal("Skull Woods - Prize", [null, 0x120A3, 0x53E7E, 0x53E7F, 0x180058, 0x180074, 0xC704], null, this),
        ]);
        this.locations.setChecksForWorld(world.id);

        this.prize_location = this.locations.get("Skull Woods - Prize");
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
            "Ganon",
            "Trinexx",
        ]);
    }

    
    initalize() {
        this.locations.get("Skull Woods - Pinball Room").setFillRules((item, locations, items) => {
            return !this.world.config("region.forceSkullWoodsKey", false) || __eq(item, Item.get("KeyD3", this.world));
        });

        this.locations.get("Skull Woods - Big Chest").setRequirements((locations, items) => {
            return items.has("BigKeyD3");
        }).setAlwaysAllow((item, items) => {
            return this.world.config("accessibility") !== "locations" && __eq(item, Item.get("BigKeyD3", this.world));
        }).setFillRules((item, locations, items) => {
            return this.world.config("accessibility") !== "locations" || !__eq(item, Item.get("BigKeyD3", this.world));
        });

        this.locations.get("Skull Woods - Bridge Room").setRequirements((locations, items) => {
            return items.has("FireRod") && (items.has("MoonPearl")
                || (this.world.config("canDungeonRevive") && items.has("PegasusBoots")
                    && (items.has("MagicMirror") || items.hasABottle())));
        });

        this.can_complete = (locations, items) => {
            return this.locations.get("Skull Woods - Boss").canAccess(items);
        };

        this.locations.get("Skull Woods - Boss").setRequirements((locations, items) => {
            return this.canEnter(locations, items)
                && items.has("FireRod") && (items.has("MoonPearl")
                || (this.world.config("canDungeonRevive") && items.has("PegasusBoots")
                    && (items.has("MagicMirror") || items.hasABottle())))
                && (this.world.config("mode.weapons") == "swordless" || items.hasSword())
                && items.has("KeyD3", 3)
                && this.boss.canBeat(items, locations)
                && (!this.world.config("region.wildCompasses", false) || items.has("CompassD3") || this.locations.get("Skull Woods - Boss").hasItem(Item.get("CompassD3", this.world)))
                && (!this.world.config("region.wildMaps", false) || items.has("MapD3") || this.locations.get("Skull Woods - Boss").hasItem(Item.get("MapD3", this.world)));
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
                && (__eq(item, Item.get("CompassD3", this.world)) || __eq(item, Item.get("MapD3", this.world)));
        });

        this.can_enter = (locations, items) => {
            return items.has("RescueZelda")
                && (this.world.config("itemPlacement") !== "basic"
                    || ((this.world.config("mode.weapons") === "swordless" || items.hasSword()) && items.hasHealth(7) && items.hasABottle()))
                && (this.world.config("canDungeonRevive", false) || items.has("MoonPearl")
                    || ((items.hasABottle() && this.world.config("canOWYBA", false))
                        || (this.world.config("canBunnyRevive", false) && items.canBunnyRevive(this.world))))
                && this.world.getRegion("North West Dark World").canEnter(locations, items);
        };

        this.prize_location.setRequirements(this.can_complete);

        return this;
    }
}
