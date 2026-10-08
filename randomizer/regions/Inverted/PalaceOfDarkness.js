// Converted from app/Region/Inverted/PalaceOfDarkness.php (alttp_vt_randomizer, MIT)
import { PalaceOfDarkness as Parent_Standard_PalaceOfDarkness } from '../Standard/PalaceOfDarkness.js';
import { Item, Location, Region, Boss, Shop, LocationCollection, ShopCollection, ItemCollection } from '../../core/index.js';

export class PalaceOfDarkness extends Parent_Standard_PalaceOfDarkness {

    
    initalize() {
        super.initalize();

        this.can_enter = (locations, items) => {
            return (this.world.config("itemPlacement") !== "basic"
                || (
                    (this.world.config("mode.weapons") === "swordless"
                        || items.hasSword())
                    && items.hasHealth(7)
                    && items.hasABottle()))
                && (this.world.getRegion("North East Dark World").canEnter(locations, items)
                    || (this.world.config("canOneFrameClipOW", false)
                        && this.world.getRegion("West Death Mountain")));
        };

        return this;
    }
}
