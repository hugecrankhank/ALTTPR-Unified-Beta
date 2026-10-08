// Converted from app/Region/Inverted/EasternPalace.php (alttp_vt_randomizer, MIT)
import { EasternPalace as Parent_Standard_EasternPalace } from '../Standard/EasternPalace.js';
import { Item, Location, Region, Boss, Shop, LocationCollection, ShopCollection, ItemCollection } from '../../core/index.js';

export class EasternPalace extends Parent_Standard_EasternPalace {

    
    initalize() {
        super.initalize();

        this.locations.get("Eastern Palace - Compass Chest").setRequirements((locations, items) => {
            return items.hasSword()
                || this.world.config("canDungeonRevive", false)
                || (this.world.config("canBunnyRevive", false)
                    && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                    && items.hasABottle()) ||
                items.has("MoonPearl");
        });

        this.locations.get("Eastern Palace - Big Chest").setRequirements((locations, items) => {
            return (items.hasSword()
                || this.world.config("canDungeonRevive", false)
                || (this.world.config("canBunnyRevive", false)
                    && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                    && items.hasABottle()) ||
                items.has("MoonPearl")) &&
                items.has("BigKeyP1");
        });

        this.locations.get("Eastern Palace - Big Key Chest").setRequirements((locations, items) => {
            return (items.hasSword()
                ||
                this.world.config("canDungeonRevive", false)
                || (this.world.config("canBunnyRevive", false)
                    && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                    && items.hasABottle()) ||
                items.has("MoonPearl")) && items.has("Lamp", this.world.config("item.require.Lamp", 1));
        });

        this.locations.get("Eastern Palace - Boss").setRequirements((locations, items) => {
            return items.canShootArrows(this.world)
                && (this.world.config("canDungeonRevive", false)
                    || (this.world.config("canBunnyRevive", false)
                        && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                        && items.hasABottle()) ||
                    items.has("MoonPearl")) && (items.has("Lamp", this.world.config("item.require.Lamp", 1))
                    || (this.world.config("itemPlacement") === "advanced"
                        && items.has("FireRod"))) && items.has("BigKeyP1")
                && this.boss.canBeat(items, locations)
                && (!this.world.config("region.wildCompasses", false)
                    || items.has("CompassP1")
                    || this.locations.get("Eastern Palace - Boss").hasItem(Item.get("CompassP1", this.world))) && (!this.world.config("region.wildMaps", false)
                    || items.has("MapP1")
                    || this.locations.get("Eastern Palace - Boss").hasItem(Item.get("MapP1", this.world)));
        });

        this.can_enter = (locations, items) => {
            return (this.world.config("canDungeonRevive", false)
                || (this.world.config("canSuperBunny", false)
                    && items.has("MagicMirror")) || (this.world.config("canBunnyRevive", false)
                    && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                    && items.hasABottle()) ||
                items.has("MoonPearl")) &&
                this.world.getRegion("North East Light World").canEnter(locations, items);
        };

        return this;
    }
}
