// Converted from app/Region/Inverted/SkullWoods.php (alttp_vt_randomizer, MIT)
import { SkullWoods as Parent_Standard_SkullWoods } from '../Standard/SkullWoods.js';
import { Item, Location, Region, Boss, Shop, LocationCollection, ShopCollection, ItemCollection } from '../../core/index.js';

export class SkullWoods extends Parent_Standard_SkullWoods {

    
    initalize() {
        super.initalize();

        // @TODO: figure out a better way of the moon pearl requirement in Standard Region file.
        this.locations.get("Skull Woods - Bridge Room").setRequirements((locations, items) => {
            return items.has("FireRod");
        });

        this.locations.get("Skull Woods - Boss").setRequirements((locations, items) => {
            return this.canEnter(locations, items)
                && items.has("FireRod")
                && (this.world.config("mode.weapons") == "swordless"
                    || items.hasSword())
                && items.has("KeyD3", 3)
                && this.boss.canBeat(items, locations)
                && (!this.world.config("region.wildCompasses", false)
                    || items.has("CompassD3")
                    || this.locations.get("Skull Woods - Boss").hasItem(Item.get("CompassD3", this.world))) && (!this.world.config("region.wildMaps", false)
                    || items.has("MapD3")
                    || this.locations.get("Skull Woods - Boss").hasItem(Item.get("MapD3", this.world)));
        });

        this.can_enter = (locations, items) => {
            return (this.world.config("itemPlacement") !== "basic"
                || (
                    (this.world.config("mode.weapons") === "swordless"
                        || items.hasSword())
                    && items.hasHealth(7)
                    && items.hasABottle()))
                && this.world.getRegion("North West Dark World").canEnter(locations, items);
        };

        return this;
    }
}
