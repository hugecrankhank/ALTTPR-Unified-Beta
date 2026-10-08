// Converted from app/Region/Standard/PalaceOfDarkness.php (alttp_vt_randomizer, MIT)
import { Item, Location, Region, Boss, Shop, LocationCollection, ShopCollection, ItemCollection, __eq } from '../../core/index.js';

export class PalaceOfDarkness extends Region {
    __init_props() {
        super.__init_props?.();
        this.name = "Dark Palace";
        this.music_addresses = [
        0x155B8,
    ];
        this.map_reveal = 0x0200;
        this.region_items = [
        "BigKey",
        "BigKeyD1",
        "Compass",
        "CompassD1",
        "Key",
        "KeyD1",
        "Map",
        "MapD1",
        "Crystal1"
    ];
    }

    
    constructor(world) {
        super(world);

        this.boss = Boss.get("Helmasaur King", world);

        this.locations = new LocationCollection([
            new Location.Chest("Palace of Darkness - Shooter Room", [0xEA5B], null, this),
            new Location.Chest("Palace of Darkness - Big Key Chest", [0xEA37], null, this),
            new Location.Chest("Palace of Darkness - The Arena - Ledge", [0xEA3A], null, this),
            new Location.Chest("Palace of Darkness - The Arena - Bridge", [0xEA3D], null, this),
            new Location.Chest("Palace of Darkness - Stalfos Basement", [0xEA49], null, this),
            new Location.Chest("Palace of Darkness - Map Chest", [0xEA52], null, this),
            new Location.BigChest("Palace of Darkness - Big Chest", [0xEA40], null, this),
            new Location.Chest("Palace of Darkness - Compass Chest", [0xEA43], null, this),
            new Location.Chest("Palace of Darkness - Harmless Hellway", [0xEA46], null, this),
            new Location.Chest("Palace of Darkness - Dark Basement - Left", [0xEA4C], null, this),
            new Location.Chest("Palace of Darkness - Dark Basement - Right", [0xEA4F], null, this),
            new Location.Chest("Palace of Darkness - Dark Maze - Top", [0xEA55], null, this),
            new Location.Chest("Palace of Darkness - Dark Maze - Bottom", [0xEA58], null, this),
            new Location.Drop("Palace of Darkness - Boss", [0x180153], null, this),

            new Location.Prize.Crystal("Palace of Darkness - Prize", [null, 0x120A1, 0x53E7C, 0x53E7D, 0x180056, 0x180073, 0xC702], null, this),
        ]);
        this.locations.setChecksForWorld(world.id);
        this.prize_location = this.locations.get("Palace of Darkness - Prize");
    }

    
    initalize() {
        this.locations.get("Palace of Darkness - The Arena - Ledge").setRequirements((locations, items) => {
            return items.canShootArrows(this.world);
        });

        this.locations.get("Palace of Darkness - Big Key Chest").setRequirements((locations, items) => {
            if (locations.get("Palace of Darkness - Big Key Chest").hasItem(Item.get("KeyD1", this.world))) {
                return items.has("KeyD1");
            }

            return (((items.has("Hammer") && items.canShootArrows(this.world) && items.has("Lamp", this.world.config("item.require.Lamp", 1))) || this.world.config("region.wildKeys", false)) ? items.has("KeyD1", 6) : items.has("KeyD1", 5));
        }).setAlwaysAllow((item, items) => {
            return this.world.config("accessibility") !== "locations" && __eq(item, Item.get("KeyD1", this.world)) && items.has("KeyD1", 5);
        }).setFillRules((item, locations, items) => {
            return this.world.config("accessibility") !== "locations" || !__eq(item, Item.get("KeyD1", this.world));
        });

        this.locations.get("Palace of Darkness - The Arena - Bridge").setRequirements((locations, items) => {
            return items.has("KeyD1")
                || (items.canShootArrows(this.world) && items.has("Hammer"));
        });

        this.locations.get("Palace of Darkness - Big Chest").setRequirements((locations, items) => {
            return items.has("Lamp", this.world.config("item.require.Lamp", 1)) && items.has("BigKeyD1")
                && (((items.has("Hammer") && items.canShootArrows(this.world)) || this.world.config("region.wildKeys", false)) ? items.has("KeyD1", 6) : items.has("KeyD1", 5));
        }).setFillRules((item, locations, items) => {
            return !__eq(item, Item.get("KeyD1", this.world));
        });

        this.locations.get("Palace of Darkness - Compass Chest").setRequirements((locations, items) => {
            return ((items.has("Hammer") && items.canShootArrows(this.world) && items.has("Lamp", this.world.config("item.require.Lamp", 1))) || this.world.config("region.wildKeys", false)) ? items.has("KeyD1", 4) : items.has("KeyD1", 3);
        });

        this.locations.get("Palace of Darkness - Harmless Hellway").setRequirements((locations, items) => {
            if (locations.get("Palace of Darkness - Harmless Hellway").hasItem(Item.get("KeyD1", this.world))) {
                return ((items.has("Hammer") && items.canShootArrows(this.world) && items.has("Lamp", this.world.config("item.require.Lamp", 1))) || this.world.config("region.wildKeys", false)) ? items.has("KeyD1", 4) : items.has("KeyD1", 3);
            }

            return (((items.has("Hammer") && items.canShootArrows(this.world) && items.has("Lamp", this.world.config("item.require.Lamp", 1))) || this.world.config("region.wildKeys", false)) ? items.has("KeyD1", 6) : items.has("KeyD1", 5));
        }).setAlwaysAllow((item, items) => {
            return this.world.config("accessibility") !== "locations" && __eq(item, Item.get("KeyD1", this.world)) && items.has("KeyD1", 5);
        }).setFillRules((item, locations, items) => {
            return this.world.config("accessibility") !== "locations" || !__eq(item, Item.get("KeyD1", this.world));
        });

        this.locations.get("Palace of Darkness - Stalfos Basement").setRequirements((locations, items) => {
            return items.has("KeyD1")
                || (items.canShootArrows(this.world) && items.has("Hammer"));
        });

        this.locations.get("Palace of Darkness - Dark Basement - Left").setRequirements((locations, items) => {
            return (items.has("Lamp", this.world.config("item.require.Lamp", 1))
                || (this.world.config("itemPlacement") === "advanced" && items.has("FireRod")))
                && (((items.has("Hammer") && items.canShootArrows(this.world) && items.has("Lamp", this.world.config("item.require.Lamp", 1))) || this.world.config("region.wildKeys", false)) ? items.has("KeyD1", 4) : items.has("KeyD1", 3));
        });

        this.locations.get("Palace of Darkness - Dark Basement - Right").setRequirements((locations, items) => {
            return (items.has("Lamp", this.world.config("item.require.Lamp", 1))
                || (this.world.config("itemPlacement") === "advanced" && items.has("FireRod")))
                && (((items.has("Hammer") && items.canShootArrows(this.world) && items.has("Lamp", this.world.config("item.require.Lamp", 1))) || this.world.config("region.wildKeys", false)) ? items.has("KeyD1", 4) : items.has("KeyD1", 3));
        });

        this.locations.get("Palace of Darkness - Map Chest").setRequirements((locations, items) => {
            return items.canShootArrows(this.world);
        });

        this.locations.get("Palace of Darkness - Dark Maze - Top").setRequirements((locations, items) => {
            return items.has("Lamp", this.world.config("item.require.Lamp", 1)) && (((items.has("Hammer") && items.canShootArrows(this.world)) || this.world.config("region.wildKeys", false)) ? items.has("KeyD1", 6) : items.has("KeyD1", 5));
        }).setFillRules((item, locations, items) => {
            return !__eq(item, Item.get("KeyD1", this.world));
        });

        this.locations.get("Palace of Darkness - Dark Maze - Bottom").setRequirements((locations, items) => {
            return items.has("Lamp", this.world.config("item.require.Lamp", 1)) && (((items.has("Hammer") && items.canShootArrows(this.world)) || this.world.config("region.wildKeys", false)) ? items.has("KeyD1", 6) : items.has("KeyD1", 5));
        }).setFillRules((item, locations, items) => {
            return !__eq(item, Item.get("KeyD1", this.world));
        });

        this.can_complete = (locations, items) => {
            return this.locations.get("Palace of Darkness - Boss").canAccess(items);
        };

        this.locations.get("Palace of Darkness - Boss").setRequirements((locations, items) => {
            return this.canEnter(locations, items)
                && this.boss.canBeat(items, locations)
                && items.has("Hammer") && items.has("Lamp", this.world.config("item.require.Lamp", 1)) && items.canShootArrows(this.world)
                && items.has("BigKeyD1") && items.has("KeyD1", 6)
                && (!this.world.config("region.wildCompasses", false) || items.has("CompassD1") || this.locations.get("Palace of Darkness - Boss").hasItem(Item.get("CompassD1", this.world)))
                && (!this.world.config("region.wildMaps", false) || items.has("MapD1") || this.locations.get("Palace of Darkness - Boss").hasItem(Item.get("MapD1", this.world)));
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
                && (__eq(item, Item.get("CompassD1", this.world)) || __eq(item, Item.get("MapD1", this.world)));
        });

        this.can_enter = (locations, items) => {
            return items.has("RescueZelda")
                && (this.world.config("itemPlacement") !== "basic"
                    || ((this.world.config("mode.weapons") === "swordless" || items.hasSword()) && items.hasHealth(7) && items.hasABottle()))
                && (((items.has("MoonPearl")
                    || ((this.world.config("canOWYBA", false) && items.hasABottle())
                        || (this.world.config("canBunnyRevive", false) && items.canBunnyRevive(this.world))))
                    && this.world.getRegion("North East Dark World").canEnter(locations, items))
                    || (this.world.config("canOneFrameClipUW", false) && this.world.config("canDungeonRevive", false)
                        && this.world.getRegion("West Death Mountain").canEnter(locations, items)));
        };

        this.prize_location.setRequirements(this.can_complete);

        return this;
    }
}
