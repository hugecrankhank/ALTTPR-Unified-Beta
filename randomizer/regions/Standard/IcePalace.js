// Converted from app/Region/Standard/IcePalace.php (alttp_vt_randomizer, MIT)
import { Item, Location, Region, Boss, Shop, LocationCollection, ShopCollection, ItemCollection, __eq } from '../../core/index.js';

export class IcePalace extends Region {
    __init_props() {
        super.__init_props?.();
        this.name = "Ice Palace";
        this.music_addresses = [
        0x155BF,
    ];
        this.map_reveal = 0x0040;
        this.region_items = [
        "BigKey",
        "BigKeyD5",
        "Compass",
        "CompassD5",
        "Key",
        "KeyD5",
        "Map",
        "MapD5",
        "Crystal5",
    ];
    }

    
    constructor(world) {
        super(world);

        this.boss = Boss.get("Kholdstare", world);

        this.locations = new LocationCollection([
            new Location.Chest("Ice Palace - Big Key Chest", [0xE9A4], null, this),
            new Location.Chest("Ice Palace - Compass Chest", [0xE9D4], null, this),
            new Location.Chest("Ice Palace - Map Chest", [0xE9DD], null, this),
            new Location.Chest("Ice Palace - Spike Room", [0xE9E0], null, this),
            new Location.Chest("Ice Palace - Freezor Chest", [0xE995], null, this),
            new Location.Chest("Ice Palace - Iced T Room", [0xE9E3], null, this),
            new Location.BigChest("Ice Palace - Big Chest", [0xE9AA], null, this),
            new Location.Drop("Ice Palace - Boss", [0x180157], null, this),

            new Location.Prize.Crystal("Ice Palace - Prize", [null, 0x120A4, 0x53E86, 0x53E87, 0x180059, 0x180078, 0xC705], null, this),
        ]);
        this.locations.setChecksForWorld(world.id);
        this.prize_location = this.locations.get("Ice Palace - Prize");
    }

    
    initalize() {
        this.locations.get("Ice Palace - Big Key Chest").setRequirements((locations, items) => {
            return items.has("Hammer") && items.canLiftRocks()
                && (!this.world.config("region.cantTakeDamage", false)
                    || items.has("CaneOfByrna") || items.has("Cape") || items.has("Hookshot"))
                && (this.locations.get("Ice Palace - Spike Room").canAccess(items));
        });

        this.locations.get("Ice Palace - Map Chest").setRequirements((locations, items) => {
            return items.has("Hammer") && items.canLiftRocks()
                && (!this.world.config("region.cantTakeDamage", false)
                    || items.has("CaneOfByrna") || items.has("Cape") || items.has("Hookshot"))
                && (this.locations.get("Ice Palace - Spike Room").canAccess(items));
        });

        this.locations.get("Ice Palace - Spike Room").setRequirements((locations, items) => {
            return (!this.world.config("region.cantTakeDamage", false)
                    || items.has("CaneOfByrna") || items.has("Cape") || items.has("Hookshot"))
                    && ((items.has("Hookshot") || items.has("ShopKey"))
                        || items.has("KeyD5", 1)
                            && locations.itemInLocations(Item.get("BigKeyD5", this.world), 
                            ["Ice Palace - Spike Room", "Ice Palace - Big Key Chest","Ice Palace - Map Chest"]));
        });

        this.locations.get("Ice Palace - Freezor Chest").setRequirements((locations, items) => {
            return items.canMeltThings(this.world);
        });

        this.locations.get("Ice Palace - Big Chest").setRequirements((locations, items) => {
            return items.has("BigKeyD5");
        });

        this.can_complete = (locations, items) => {
            return this.locations.get("Ice Palace - Boss").canAccess(items);
        };

        this.locations.get("Ice Palace - Boss").setRequirements((locations, items) => {
            return this.canEnter(locations, items)
                && items.has("Hammer") && items.canLiftRocks()
                && this.boss.canBeat(items, locations)
                && items.has("BigKeyD5") && (
                    (this.world.config("itemPlacement") !== "basic" && (items.has("CaneOfSomaria") && items.has("KeyD5")
                        || items.has("KeyD5", 2)))
                    || (this.world.config("itemPlacement") === "basic" && items.has("KeyD5", 2)))
                && (!this.world.config("region.wildCompasses", false) || items.has("CompassD5") || this.locations.get("Ice Palace - Boss").hasItem(Item.get("CompassD5", this.world)))
                && (!this.world.config("region.wildMaps", false) || items.has("MapD5") || this.locations.get("Ice Palace - Boss").hasItem(Item.get("MapD5", this.world)));
        }).setFillRules((item, locations, items) => {
            if (
                !this.world.config("region.bossNormalLocation", true)
                && (is_a(item, Item.Key) || is_a(item, Item.BigKey)
                    || is_a(item, Item.Map) || is_a(item, Item.Compass))
            ) {
                return false;
            }
            return true;
        }).setAlwaysAllow((item, items) => {
            return this.world.config("region.bossNormalLocation", true)
                && (__eq(item, Item.get("CompassD5", this.world)) || __eq(item, Item.get("MapD5", this.world)));
        });

        this.can_enter = (locations, items) => {
            return items.has("RescueZelda")
                && (this.world.config("itemPlacement") !== "basic"
                    || ((this.world.config("mode.weapons") === "swordless" || items.hasSword(2)) && items.hasHealth(12) && (items.hasBottle(2) || items.hasArmor())))
                && (items.canMeltThings(this.world) || this.world.config("canOneFrameClipUW", false))
                && (((items.has("MoonPearl") || this.world.config("canDungeonRevive", false))
                    && (items.has("Flippers") || this.world.config("canFakeFlipper", false))
                    && items.canLiftDarkRocks())
                    || (this.world.getRegion("South Dark World").canEnter(locations, items)
                        && (((items.has("MoonPearl")
                            || (items.hasABottle() && this.world.config("canOWYBA", false))
                            || (this.world.config("canBunnyRevive", false) && items.canBunnyRevive(this.world)))
                        && ((this.world.config("canMirrorWrap", false) && items.has("MagicMirror")
                            && ((this.world.config("canBootsClip", false) && items.has("PegasusBoots"))
                                || (this.world.config("canSuperSpeed", false) && items.canSpinSpeed())))
                            || (items.has("Flippers") && this.world.config("canTransitionWrapped", false)
                                && ((this.world.config("canBootsClip", false) && items.has("PegasusBoots"))
                                    || this.world.config("canOneFrameClipOW", false)))))
                        || (this.world.config("canOneFrameClipOW", false)
                            && this.world.config("canMirrorWrap", false) && items.has("MagicMirror")))));
        };

        this.prize_location.setRequirements(this.can_complete);

        return this;
    }
}
