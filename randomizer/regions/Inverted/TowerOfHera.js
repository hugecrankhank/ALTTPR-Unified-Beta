// Converted from app/Region/Inverted/TowerOfHera.php (alttp_vt_randomizer, MIT)
import { TowerOfHera as Parent_Standard_TowerOfHera } from '../Standard/TowerOfHera.js';
import { Item, Location, Region, Boss, Shop, LocationCollection, ShopCollection, ItemCollection, __eq } from '../../core/index.js';

export class TowerOfHera extends Parent_Standard_TowerOfHera {

    
    initalize() { let main, mire;
        super.initalize();

        main = (locations, items) => {
            return (this.world.getRegion("East Death Mountain").canEnter(locations, items)
                && items.has("MoonPearl")
                && items.has("Hammer")) || (this.world.getRegion("West Death Mountain").canEnter(locations, items)
                    && (((items.has("MoonPearl")
                        || (this.world.config("canOWYBA", false) && items.hasBottle(2))
                            || (((this.world.config("canOWYBA", false) && items.hasABottle())
                            || (this.world.config("canBunnyRevive", false) && items.canBunnyRevive(this.world)))
                                && ((this.world.config("canBootsClip", false) && items.has("PegasusBoots"))
                                    || this.world.config("canOneFrameClipOW", false))))
                            && (this.world.config("canOneFrameClipOW", false)
                                || (this.world.config("canSuperSpeed", false) && items.canSpinSpeed())
                                || (this.world.config("canBootsClip", false) && items.has("PegasusBoots"))))
                        || (this.world.config("canOneFrameClipOW", false) && items.hasSword()
                            && this.world.config("canSuperBunny", false) && items.has("MagicMirror"))));
        };

        mire = (locations, items) => {
            return this.world.config("canOneFrameClipUW", false)
                && (
                    (locations.itemInLocations(Item.get("BigKeyD6", this.world), [
                        "Misery Mire - Compass Chest",
                        "Misery Mire - Big Key Chest",
                    ]) &&
                        items.has("KeyD6", 2)) || items.has("KeyD6", 3)) &&
                this.world.getRegion("Misery Mire").canEnter(locations, items);
        };

        this.locations.get("Tower of Hera - Big Key Chest").setRequirements((locations, items) => {
            return items.canLightTorches()
                && ((items.has("KeyP3")
                    && (items.has("MoonPearl") || (this.world.config("canOWYBA", false)
                    && items.hasABottle()) || (this.world.config("canBunnyRevive", false)
                    && items.canBunnyRevive(this.world)))) || mire(locations, items));
        }).setAlwaysAllow((item, items) => {
            return this.world.config("accessibility") !== "locations" && __eq(item, Item.get("KeyP3", this.world));
        }).setFillRules((item, locations, items) => {
            return this.world.config("accessibility") !== "locations" || !__eq(item, Item.get("KeyP3", this.world));
        });

        this.locations.get("Tower of Hera - Compass Chest").setRequirements((locations, items) => {
            return (main(locations, items)
                && items.has("BigKeyP3")) ||
                mire(locations, items);
        });

        this.locations.get("Tower of Hera - Big Chest").setRequirements((locations, items) => {
            return (main(locations, items)
                && items.has("BigKeyP3")) || (mire(locations, items)
                && (items.has("BigKeyP3")
                    || items.has("BigKeyD6")));
        });

        this.locations.get("Tower of Hera - Boss").setRequirements((locations, items) => {
            return main(locations, items)
                && this.boss.canBeat(items, locations)
                && (items.has("BigKeyP3") || (mire(locations, items) && items.has("BigKeyD6")))
                && (!this.world.config("region.wildCompasses", false)
                    || items.has("CompassP3")
                    || this.locations.get("Tower of Hera - Boss").hasItem(Item.get("CompassP3", this.world))) && (!this.world.config("region.wildMaps", false)
                    || items.has("MapP3")
                    || this.locations.get("Tower of Hera - Boss").hasItem(Item.get("MapP3", this.world)));
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
                && (__eq(item, Item.get("CompassP3", this.world)) || __eq(item, Item.get("MapP3", this.world)));
        });

        this.can_enter = (locations, items) => {
            return (main(locations, items)
                || mire(locations, items));
        };

        return this;
    }
}
