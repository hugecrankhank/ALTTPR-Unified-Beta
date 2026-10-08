// Converted from app/Region/Inverted/TurtleRock.php (alttp_vt_randomizer, MIT)
import { TurtleRock as Parent_Standard_TurtleRock } from '../Standard/TurtleRock.js';
import { Item, Location, Region, Boss, Shop, LocationCollection, ShopCollection, ItemCollection, __eq } from '../../core/index.js';

export class TurtleRock extends Parent_Standard_TurtleRock {

    canReachTop(locations, items) {
        return items.has("CaneOfSomaria")
            && (this.enterTop(locations, items)
                || (this.enterMiddle(locations, items)
                    && items.has("KeyD7", 4)) || (this.enterBottom(locations, items)
                    && items.has("Lamp", this.world.config("item.require.Lamp", 1))
                    && items.has("KeyD7", 4)));
    }

    canReachMiddle(locations, items) {
        return this.enterMiddle(locations, items)
            || (this.enterTop(locations, items)
                && items.has("KeyD7", this.accountForWastingKeyOnTrinexDoor(2, 3))) || (this.enterBottom(locations, items)
                && items.has("Lamp", this.world.config("item.require.Lamp", 1))
                && items.has("CaneOfSomaria"));
    }

    canReachBottom(locations, items) {
        return this.enterBottom(locations, items)
            || (
                (this.enterTop(locations, items)
                    || this.enterMiddle(locations, items))
                && items.has("Lamp", this.world.config("item.require.Lamp", 1))
                && items.has("CaneOfSomaria")
                && items.has("BigKeyD7")
                && items.has("KeyD7", 3));
    }

    // If it can be conclusively proven that bottom is not externally reachable
    accountForWastingKeyOnTrinexDoor(withoutWaste, withWaste) {
        if (this.world.config("turtlerock.wastekey", false)) {
            return withoutWaste;
        }
        return withWaste;
    }

    enterTop(locations, items) {
        return ((locations.get("Turtle Rock Medallion").hasItem(Item.get("Bombos", this.world))
            && items.has("Bombos")) || (locations.get("Turtle Rock Medallion").hasItem(Item.get("Ether", this.world))
            && items.has("Ether")) || (locations.get("Turtle Rock Medallion").hasItem(Item.get("Quake", this.world))
            && items.has("Quake"))) && (this.world.config("mode.weapons") == "swordless"
            || items.hasSword())
            && items.has("CaneOfSomaria")
            && this.world.getRegion("East Dark World Death Mountain").canEnter(locations, items);
    }

    enterMiddle(locations, items) {
        return this.world.getRegion("East Death Mountain").canEnter(locations, items)
            && items.has("MagicMirror")
            || (this.world.getRegion("East Dark World Death Mountain").canEnter(locations, items)
                && this.world.config("canSuperSpeed", false)
                && items.canSpinSpeed());
    }

    enterBottom(locations, items) {
        return items.has("MagicMirror")
            && this.world.getRegion("East Death Mountain").canEnter(locations, items);
    }

    
    initalize() {
        this.locations.get("Turtle Rock - Chain Chomps").setRequirements((locations, items) => {
            return (this.enterTop(locations, items)
                && items.has("CaneOfSomaria")
                && items.has("KeyD7", this.accountForWastingKeyOnTrinexDoor(1, 2))) ||
                this.enterMiddle(locations, items);
        });

        this.locations.get("Turtle Rock - Roller Room - Left").setRequirements((locations, items) => {
            return items.has("FireRod")
                && this.canReachTop(locations, items);
        });

        this.locations.get("Turtle Rock - Roller Room - Right").setRequirements((locations, items) => {
            return items.has("FireRod")
                && this.canReachTop(locations, items);
        });

        this.locations.get("Turtle Rock - Compass Chest").setRequirements((locations, items) => {
            return this.canReachTop(locations, items);
        });

        this.locations.get("Turtle Rock - Big Chest").setRequirements((locations, items) => {
            return items.has("BigKeyD7")
                && this.canReachMiddle(locations, items)
                && (items.has("Hookshot")
                    || items.has("CaneOfSomaria"));
        }).setFillRules((item, locations, items) => {
            return !__eq(item, Item.get("BigKeyD7", this.world));
        });

        this.locations.get("Turtle Rock - Big Key Chest").setRequirements((locations, items) => {
            // TODO: It only needs 2 keys if it has the big key and there is no possible external bottom access.
            return this.canReachMiddle(locations, items)
                && (items.has("KeyD7", 4)
                    || this.locations.get("Turtle Rock - Big Key Chest").hasItem(Item.get("KeyD7", this.world)));
        }).setAlwaysAllow((item, items) => {
            return __eq(item, Item.get("KeyD7", this.world));
        }).setFillRules((item, locations, items) => {
            return this.world.config("accessibility") !== "locations" || !__eq(item, Item.get("KeyD7", this.world));
        });

        this.locations.get("Turtle Rock - Crystaroller Room").setRequirements((locations, items) => {
            return (items.has("BigKeyD7")
                && this.canReachMiddle(locations, items)) || (this.enterBottom(locations, items)
                && items.has("Lamp", this.world.config("item.require.Lamp", 1))
                && items.has("CaneOfSomaria"));
        });

        this.locations.get("Turtle Rock - Eye Bridge - Bottom Left").setRequirements((locations, items) => {
            return this.canReachBottom(locations, items)
                && (this.world.config("itemPlacement") !== "basic"
                    || items.has("Cape")
                    || items.has("CaneOfByrna")
                    || (this.world.config("item.overflow.count.Shield", 3) >= 3
                        && items.canBlockLasers()));
        });

        this.locations.get("Turtle Rock - Eye Bridge - Bottom Right").setRequirements((locations, items) => {
            return this.canReachBottom(locations, items)
                && (this.world.config("itemPlacement") !== "basic"
                    || items.has("Cape")
                    || items.has("CaneOfByrna")
                    || (this.world.config("item.overflow.count.Shield", 3) >= 3
                        && items.canBlockLasers()));
        });

        this.locations.get("Turtle Rock - Eye Bridge - Top Left").setRequirements((locations, items) => {
            return this.canReachBottom(locations, items)
                && (this.world.config("itemPlacement") !== "basic"
                    || items.has("Cape")
                    || items.has("CaneOfByrna")
                    || (this.world.config("item.overflow.count.Shield", 3) >= 3
                        && items.canBlockLasers()));
        });

        this.locations.get("Turtle Rock - Eye Bridge - Top Right").setRequirements((locations, items) => {
            return this.canReachBottom(locations, items)
                && (this.world.config("itemPlacement") !== "basic"
                    || items.has("Cape")
                    || items.has("CaneOfByrna")
                    || (this.world.config("item.overflow.count.Shield", 3) >= 3
                        && items.canBlockLasers()));
        });

        this.can_complete = (locations, items) => {
            return this.locations.get("Turtle Rock - Boss").canAccess(items);
        };

        this.locations.get("Turtle Rock - Boss").setRequirements((locations, items) => {
            return this.canReachBottom(locations, items)
                && items.has("KeyD7", 4)
                && items.has("BigKeyD7")
                && items.has("CaneOfSomaria")
                && this.boss.canBeat(items, locations)
                && (!this.world.config("region.wildCompasses", false)
                    || items.has("CompassD7")
                    || this.locations.get("Turtle Rock - Boss").hasItem(Item.get("CompassD7", this.world)))
                && (!this.world.config("region.wildMaps", false)
                    || items.has("MapD7")
                    || this.locations.get("Turtle Rock - Boss").hasItem(Item.get("MapD7", this.world)));
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
                && (__eq(item, Item.get("CompassD7", this.world)) || __eq(item, Item.get("MapD7", this.world)));
        });

        this.can_enter = (locations, items) => {
            return (this.world.config("itemPlacement") !== "basic"
                || (
                    (this.world.config("mode.weapons") === "swordless"
                        || items.hasSword(2))
                    && items.hasHealth(12)
                    && (items.hasBottle(2)
                        || items.hasArmor()))) && (this.enterTop(locations, items)
                || this.enterMiddle(locations, items)
                || this.enterBottom(locations, items));
        };

        this.prize_location.setRequirements(this.can_complete);

        return this;
    }
}
