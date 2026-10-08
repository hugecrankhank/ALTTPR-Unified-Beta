// Converted from app/Region/Inverted/DesertPalace.php (alttp_vt_randomizer, MIT)
import { DesertPalace as Parent_Standard_DesertPalace } from '../Standard/DesertPalace.js';
import { Item, Location, Region, Boss, Shop, LocationCollection, ShopCollection, ItemCollection } from '../../core/index.js';

export class DesertPalace extends Parent_Standard_DesertPalace {

    
    initalize() { let main, side, thieves;
        super.initalize();

        main = (locations, items) => {
            return items.has("BookOfMudora")
                && this.world.getRegion("South Light World").canEnter(locations, items);
        };

        side = (locations, items) => {
            return this.world.config("canOneFrameClipOW", false)
                || (
                    (items.has("MoonPearl")
                        || (this.world.config("canOWYBA", false)
                            && items.hasABottle()) || (this.world.config("canBunnyRevive", false)
                            && items.canBunnyRevive(this.world))) && (
                        (this.world.config("canBootsClip", false)
                            && items.has("PegasusBoots")))) &&
                this.world.getRegion("South Light World").canEnter(locations, items);
        };

        thieves = (locations, items) => {
            return this.world.getRegion("Thieves Town").canEnter(locations, items)
                && items.has("KeyD4")
                && items.has("BigKeyD4")
                && this.world.config("canOneFrameClipUW", false);
        };

        this.locations.get("Desert Palace - Big Key Chest").setRequirements((locations, items) => {
            return items.has("KeyP2") && items.canKillMostThings(this.world)
                && (items.has("MoonPearl")
                    || this.world.config("canDungeonRevive", false)
                    || (this.world.config("canBunnyRevive", false)
                        && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                        && items.hasABottle()) || items.hasSword());
        });

        this.locations.get("Desert Palace - Boss").setRequirements((locations, items) => {
            return this.canEnter(locations, items)
                && (
                    (items.has("MoonPearl")
                        || (this.world.config("canBunnyRevive", false)
                            && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                            && items.hasABottle())) || (this.world.config("canOneFrameClipOW", false)
                        && this.world.config("canDungeonRevive", false)))
                && (items.canLiftRocks() || (this.world.config("canBootsClip", false)
                    && items.has("PegasusBoots")) || this.world.config("canOneFrameClipOW", false))
                && items.canLightTorches()
                && items.has("BigKeyP2")
                && items.has("KeyP2")
                && this.boss.canBeat(items, locations)
                && (!this.world.config("region.wildCompasses", false)
                    || items.has("CompassP2")
                    || this.locations.get("Desert Palace - Boss").hasItem(Item.get("CompassP2", this.world)))
                && (!this.world.config("region.wildMaps", false)
                    || items.has("MapP2")
                    || this.locations.get("Desert Palace - Boss").hasItem(Item.get("MapP2", this.world)));
        });

        // Bunny can use Book!
        this.can_enter = (locations, items) => {
            return (this.world.config("canDungeonRevive", false)
                || (this.world.config("canSuperBunny", false)
                    && items.has("MagicMirror")) || (this.world.config("canBunnyRevive", false)
                    && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                    && items.hasABottle()) ||
                items.has("MoonPearl")) && (main(locations, items)
                || side(locations, items)
                || thieves(locations, items));
        };

        return this;
    }
}
