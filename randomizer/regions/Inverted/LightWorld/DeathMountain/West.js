// Converted from app/Region/Inverted/LightWorld/DeathMountain/West.php (alttp_vt_randomizer, MIT)
import { West as Parent_Standard_LightWorld_DeathMountain_West } from '../../../Standard/LightWorld/DeathMountain/West.js';
import { Item, Location, Region, Boss, Shop, LocationCollection, ShopCollection, ItemCollection } from '../../../../core/index.js';

export class West extends Parent_Standard_LightWorld_DeathMountain_West {

    
    constructor(world) {
        super(world);

        this.locations.removeItem("Ether Tablet");
        this.locations.removeItem("Spectacle Rock");
    }

    
    initalize() {
        this.locations.get("Old Man").setRequirements((locations, items) => {
            return items.has("Lamp", this.world.config("item.require.Lamp", 1));
        });

        this.can_enter = (locations, items) => {
            return items.canFly(this.world)
                || (items.canLiftRocks()
                    && items.has("Lamp", this.world.config("item.require.Lamp", 1))) || (this.world.config("canBootsClip", false)
                    && items.has("PegasusBoots")) ||
                this.world.config("canOneFrameClipOW", false)
                || (this.world.config("canOWYBA", false)
                    && items.hasABottle());
        };

        return this;
    }
}
