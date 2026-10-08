// Converted from app/Region/Inverted/SwampPalace.php (alttp_vt_randomizer, MIT)
import { SwampPalace as Parent_Standard_SwampPalace } from '../Standard/SwampPalace.js';
import { Item, Location, Region, Boss, Shop, LocationCollection, ShopCollection, ItemCollection, __eq } from '../../core/index.js';

export class SwampPalace extends Parent_Standard_SwampPalace {

    
    initalize() { let mire, hera;
        super.initalize();

        mire = (locations, items) => {
            return this.world.config("canOneFrameClipUW", false)
                && ((locations.itemInLocations(Item.get("BigKeyD6", this.world), [
                    "Misery Mire - Compass Chest",
                    "Misery Mire - Big Key Chest",
                ]) &&
                    items.has("KeyD6", 2)) || items.has("KeyD6", 3))
                && this.world.getRegion("Misery Mire").canEnter(locations, items);
        };

        hera = (locations, items) => {
            return this.world.config("canOneFrameClipUW", false)
                && this.world.getRegion("Tower of Hera").canEnter(locations, items)
                && (items.has("BigKeyP3")
                    || (mire(locations, items) && items.has("BigKeyD6")));
        };

        this.locations.get("Swamp Palace - Entrance").setFillRules((item, locations, items) => {
            return this.world.config("region.wildKeys", false) || __eq(item, Item.get("KeyD2", this.world))
                || mire(locations, items);
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

        this.locations.get("Swamp Palace - Boss").setRequirements((locations, items) => {
            return items.has("Hookshot")
                && (items.has("KeyD2") || mire(locations, items))
                && (items.has("Hammer")
                    || mire(locations, items) || hera(locations, items))
                && this.boss.canBeat(items, locations)
                && (!this.world.config("region.wildCompasses", false)
                    || items.has("CompassD2")
                    || this.locations.get("Swamp Palace - Boss").hasItem(Item.get("CompassD2", this.world))) && (!this.world.config("region.wildMaps", false)
                    || items.has("MapD2")
                    || this.locations.get("Swamp Palace - Boss").hasItem(Item.get("MapD2", this.world)));
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
            return items.has("Flippers")
                && (this.world.config("itemPlacement") !== "basic"
                    || ((this.world.config("mode.weapons") === "swordless"
                        || items.hasSword())
                        && items.hasHealth(7)
                        && items.hasBottle()))
                && ((items.has("MoonPearl")
                    || (this.world.config("canOWYBA", false)
                        && items.hasABottle())
                    || (this.world.config("canBunnyRevive", false)
                        && items.canBunnyRevive(this.world)))
                    || (this.world.config("canSuperBunny", false)
                        && items.has("MagicMirror")))
                && (items.has("MagicMirror")
                    || (this.world.config("canOneFrameClipUW", false)
                        && items.has("MoonPearl")
                        && (items.has("BigKeyP3") || items.has("BigKeyD6")) && mire(locations, items)
                        && locations.get("Old Man").canAccess(items)
                        && ((items.has("PegasusBoots") && this.world.config("canBootsClip", false))
                            || (this.world.config("canSuperSpeed", false) && items.canSpinSpeed())
                            || this.world.config("canOneFrameClipOW", false))))
                && this.world.getRegion("South Light World").canEnter(locations, items);
        };

        return this;
    }
}
