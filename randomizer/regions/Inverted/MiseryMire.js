// Converted from app/Region/Inverted/MiseryMire.php (alttp_vt_randomizer, MIT)
import { MiseryMire as Parent_Standard_MiseryMire } from '../Standard/MiseryMire.js';
import { Item, Location, Region, Boss, Shop, LocationCollection, ShopCollection, ItemCollection } from '../../core/index.js';

export class MiseryMire extends Parent_Standard_MiseryMire {

    
    initalize() {
        super.initalize();

        this.can_enter = (locations, items) => {
            return (this.world.config("itemPlacement") !== "basic"
                || (
                    (this.world.config("mode.weapons") === "swordless"
                        || items.hasSword(2))
                    && items.hasHealth(12)
                    && (items.hasBottle(2)
                        || items.hasArmor()))) && (
                (locations.get("Misery Mire Medallion").hasItem(Item.get("Bombos", this.world))
                    && items.has("Bombos")) || (locations.get("Misery Mire Medallion").hasItem(Item.get("Ether", this.world))
                    && items.has("Ether")) || (locations.get("Misery Mire Medallion").hasItem(Item.get("Quake", this.world))
                    && items.has("Quake"))) && (this.world.config("mode.weapons") == "swordless"
                || items.hasSword()) && (items.has("PegasusBoots")
                || items.has("Hookshot"))
                && items.canKillMostThings(this.world, 8)
                && this.world.getRegion("Mire").canEnter(locations, items);
        };

        return this;
    }
}
