// Converted from app/Region/Inverted/IcePalace.php (alttp_vt_randomizer, MIT)
import { IcePalace as Parent_Standard_IcePalace } from '../Standard/IcePalace.js';
import { Item, Location, Region, Boss, Shop, LocationCollection, ShopCollection, ItemCollection } from '../../core/index.js';

export class IcePalace extends Parent_Standard_IcePalace {

    
    initalize() {
        super.initalize();

        this.can_enter = (locations, items) => {
            return (this.world.config("itemPlacement") !== "basic"
                || (
                    (this.world.config("mode.weapons") === "swordless"
                        || items.hasSword(2))
                    && items.hasHealth(12)
                    && (items.hasBottle(2)
                        || items.hasArmor()))) && (items.canMeltThings(this.world)
                || this.world.config("canOneFrameClipUW", false)) && ((items.has("Flippers")
                || (this.world.config("canFakeFlipper", false)
                    && (this.world.config("canBunnyRevive", false)
                    || (!this.world.config("region.cantTakeDamage", false)
                        && this.world.getRegion("North West Dark World").canEnter(locations, items)) ||
                    items.canFly(this.world)
                    || (this.world.getRegion("North West Dark World").canEnter(locations, items)
                        && (items.has("Hammer")
                            || items.canLiftRocks()))))) || (this.world.config("canBootsClip", false)
                && items.has("PegasusBoots"))
                ||
                this.world.config("canOneFrameClipOW", false)
                || (this.world.config("canSuperSpeed", false)
                    && items.canSpinSpeed()));
        };

        return this;
    }
}
