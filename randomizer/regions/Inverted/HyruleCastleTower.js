// Converted from app/Region/Inverted/HyruleCastleTower.php (alttp_vt_randomizer, MIT)
import { HyruleCastleTower as Parent_Standard_HyruleCastleTower } from '../Standard/HyruleCastleTower.js';
import { Item, Location, Region, Boss, Shop, LocationCollection, ShopCollection, ItemCollection } from '../../core/index.js';

export class HyruleCastleTower extends Parent_Standard_HyruleCastleTower {

    
    initalize() {
        super.initalize();

        this.can_enter = (locations, items) => {
            return items.canKillMostThings(this.world, 8)
                && this.world.getRegion("West Dark World Death Mountain").canEnter(locations, items);
        };

        return this;
    }
}
