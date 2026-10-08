// Converted from app/Region/Inverted/DarkWorld/DeathMountain/West.php (alttp_vt_randomizer, MIT)
import { West as Parent_Standard_DarkWorld_DeathMountain_West } from '../../../Standard/DarkWorld/DeathMountain/West.js';
import { Item, Location, Region, Boss, Shop, LocationCollection, ShopCollection, ItemCollection } from '../../../../core/index.js';

export class West extends Parent_Standard_DarkWorld_DeathMountain_West {

    
    constructor(world) {
        super(world);

        this.shops.removeItem("Dark Death Mountain Fairy");
    }

    
    initalize() {
        this.locations.get("Spike Cave").setRequirements((locations, items) => {
            return items.has("Hammer")
                && items.canLiftRocks()
                && (
                    (items.canExtendMagic()
                        && items.has("Cape")) || (
                        (!this.world.config("region.cantTakeDamage", false)
                            || items.canExtendMagic()) &&
                        items.has("CaneOfByrna")));
        });

        this.can_enter = (locations, items) => {
            return items.canFly(this.world)
                || (items.canLiftRocks()
                    && items.has("Lamp", this.world.config("item.require.Lamp", 1))) || (this.world.config("canBootsClip", false)
                    && items.has("PegasusBoots")) || (this.world.config("canOWYBA", false)
                    && items.hasABottle()) ||
                this.world.config("canOneFrameClipOW", false);
        };

        return this;
    }
}
