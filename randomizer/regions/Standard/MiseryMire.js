// Converted from app/Region/Standard/MiseryMire.php (alttp_vt_randomizer, MIT)
import { Item, Location, Region, Boss, Shop, LocationCollection, ShopCollection, ItemCollection, __eq } from '../../core/index.js';

export class MiseryMire extends Region {
    __init_props() {
        super.__init_props?.();
        this.name = "Misery Mire";
        this.music_addresses = [
        0x155B9,
    ];
        this.map_reveal = 0x0100;
        this.region_items = [
        "BigKey",
        "BigKeyD6",
        "Compass",
        "CompassD6",
        "Key",
        "KeyD6",
        "Map",
        "MapD6",
        "Crystal6",
    ];
    }

    
    constructor(world) {
        super(world);

        this.boss = Boss.get("Vitreous", world);

        this.locations = new LocationCollection([
            new Location.BigChest("Misery Mire - Big Chest", [0xEA67], null, this),
            new Location.Chest("Misery Mire - Main Lobby", [0xEA5E], null, this),
            new Location.Chest("Misery Mire - Big Key Chest", [0xEA6D], null, this),
            new Location.Chest("Misery Mire - Compass Chest", [0xEA64], null, this),
            new Location.Chest("Misery Mire - Bridge Chest", [0xEA61], null, this),
            new Location.Chest("Misery Mire - Map Chest", [0xEA6A], null, this),
            new Location.Chest("Misery Mire - Spike Chest", [0xE9DA], null, this),
            new Location.Drop("Misery Mire - Boss", [0x180158], null, this),

            new Location.Prize.Crystal("Misery Mire - Prize", [null, 0x120A2, 0x53E84, 0x53E85, 0x180057, 0x180077, 0xC703], null, this),
        ]);
        this.locations.setChecksForWorld(world.id);
        this.prize_location = this.locations.get("Misery Mire - Prize");
    }

    
    initalize() {
        this.locations.get("Misery Mire - Big Chest").setRequirements((locations, items) => {
            return items.has("BigKeyD6");
        });

        this.locations.get("Misery Mire - Spike Chest").setRequirements((locations, items) => {
            return !this.world.config("region.cantTakeDamage", false)
                || items.has("CaneOfByrna") || items.has("Cape");
        });

        this.locations.get("Misery Mire - Main Lobby").setRequirements((locations, items) => {
            return items.has("KeyD6") || items.has("BigKeyD6");
        });

        this.locations.get("Misery Mire - Map Chest").setRequirements((locations, items) => {
            return items.has("KeyD6") || items.has("BigKeyD6");
        });

        this.locations.get("Misery Mire - Big Key Chest").setRequirements((locations, items) => {
            return items.canLightTorches()
                && (((locations.get("Misery Mire - Compass Chest").hasItem(Item.get("BigKeyD6", this.world))
                    || locations.get("Misery Mire - Big Key Chest").hasItem(Item.get("BigKeyD6", this.world))) 
                        && items.has("KeyD6", 2))
                    || items.has("KeyD6", 3));
        });

        this.locations.get("Misery Mire - Compass Chest").setRequirements((locations, items) => {
            return items.canLightTorches()
                && (((locations.get("Misery Mire - Big Key Chest").hasItem(Item.get("BigKeyD6", this.world))
                    || locations.get("Misery Mire - Compass Chest").hasItem(Item.get("BigKeyD6", this.world))) 
                        && items.has("KeyD6", 2))
                    || items.has("KeyD6", 3));
        });

        this.can_complete = (locations, items) => {
            return this.locations.get("Misery Mire - Boss").canAccess(items);
        };

        this.locations.get("Misery Mire - Boss").setRequirements((locations, items) => {
            return this.canEnter(locations, items)
                && items.has("CaneOfSomaria") && items.has("Lamp", this.world.config("item.require.Lamp", 1))
                && items.has("BigKeyD6")
                && this.boss.canBeat(items, locations)
                && (!this.world.config("region.wildCompasses", false) || items.has("CompassD6") || this.locations.get("Misery Mire - Boss").hasItem(Item.get("CompassD6", this.world)))
                && (!this.world.config("region.wildMaps", false) || items.has("MapD6") || this.locations.get("Misery Mire - Boss").hasItem(Item.get("MapD6", this.world)));
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
                && (__eq(item, Item.get("CompassD6", this.world)) || __eq(item, Item.get("MapD6", this.world)));
        });

        this.can_enter = (locations, items) => {
            return items.has("RescueZelda")
                && (this.world.config("itemPlacement") !== "basic"
                    || ((this.world.config("mode.weapons") === "swordless" || items.hasSword(2)) && items.hasHealth(12) && (items.hasBottle(2) || items.hasArmor())))
                && (((locations.get("Misery Mire Medallion").hasItem(Item.get("Bombos", this.world)) && items.has("Bombos"))
                    || (locations.get("Misery Mire Medallion").hasItem(Item.get("Ether", this.world)) && items.has("Ether"))
                    || (locations.get("Misery Mire Medallion").hasItem(Item.get("Quake", this.world)) && items.has("Quake")))
                    && (this.world.config("mode.weapons") == "swordless" || items.hasSword()))
                && (items.has("MoonPearl")
                    || (items.hasABottle()
                        && ((items.has("BugCatchingNet") && this.world.config("canBunnyRevive", false)
                            && ((items.canLiftDarkRocks() && (items.canFly(this.world) || (this.world.config("canBootsClip", false) && items.has("PegasusBoots"))))
                                || (this.world.config("canOWYBA", false) && items.has("MagicMirror"))
                                || this.world.config("canOneFrameClipOW", false)))
                            || (this.world.config("canOWYBA", false)
                                && ((this.world.config("canBootsClip", false) && items.has("PegasusBoots"))
                                    || this.world.config("canOneFrameClipOW", false)
                                    || items.hasBottle(2))))))
                && ((this.world.config("itemPlacement") !== "basic" && items.has("PegasusBoots"))
                    || items.has("Hookshot"))
                && items.canKillMostThings(this.world, 8)
                && this.world.getRegion("Mire").canEnter(locations, items);
        };

        this.prize_location.setRequirements(this.can_complete);

        return this;
    }
}
