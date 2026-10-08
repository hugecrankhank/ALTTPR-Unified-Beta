// Converted from app/Region/Inverted/ThievesTown.php (alttp_vt_randomizer, MIT)
import { ThievesTown as Parent_Standard_ThievesTown } from '../Standard/ThievesTown.js';
import { Item, Location, Region, Boss, Shop, LocationCollection, ShopCollection, ItemCollection } from '../../core/index.js';

export class ThievesTown extends Parent_Standard_ThievesTown {

    
    initalize() {
        super.initalize();

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
