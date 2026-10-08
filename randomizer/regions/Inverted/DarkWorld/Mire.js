// Converted from app/Region/Inverted/DarkWorld/Mire.php (alttp_vt_randomizer, MIT)
import { Mire as Parent_Standard_DarkWorld_Mire } from '../../Standard/DarkWorld/Mire.js';
import { Item, Location, Region, Boss, Shop, LocationCollection, ShopCollection, ItemCollection } from '../../../core/index.js';

export class Mire extends Parent_Standard_DarkWorld_Mire {

    
    initalize() {
        this.can_enter = (locations, items) => {
            return items.canFly(this.world)
                || (items.has("MagicMirror")
                    && this.world.getRegion("South Light World").canEnter(locations, items)) || (this.world.config("canBootsClip", false)
                    && items.has("PegasusBoots")) || (this.world.config("canOWYBA", false)
                    && items.hasABottle()) ||
                this.world.config("canOneFrameClipOW", false);
        };

        return this;
    }
}
