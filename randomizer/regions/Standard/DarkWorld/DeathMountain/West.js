// Converted from app/Region/Standard/DarkWorld/DeathMountain/West.php (alttp_vt_randomizer, MIT)
import { Item, Location, Region, Boss, Shop, LocationCollection, ShopCollection, ItemCollection } from '../../../../core/index.js';

export class West extends Region {
    __init_props() {
        super.__init_props?.();
        this.name = "Dark World";
    }

    
    constructor(world) {
        super(world);

        this.locations = new LocationCollection([
            new Location.Chest("Spike Cave", [0xEA8B], null, this),
        ]);
        this.locations.setChecksForWorld(world.id);
        this.shops = new ShopCollection([
            new Shop.TakeAny("Dark Death Mountain Fairy", 0x83, 0xC1, 0x0112, 0x70, this, {[0xDBBE2]: [0x58]
}),
        ]);
    }

    
    initalize() {
        this.shops.get("Dark Death Mountain Fairy").setRequirements((locations, items) => {
            return items.has("MoonPearl")
                || (this.world.config("canOWYBA", false) && items.hasABottle()
                    && ((items.has("PegasusBoots") && this.world.config("canBootsClip", false))
                        || this.world.config("canOneFrameClipOW", false)));
        });

        this.locations.get("Spike Cave").setRequirements((locations, items) => {
            return (items.has("MoonPearl")
                    || (this.world.config("canOWYBA", false) && items.hasABottle()
                        && ((items.has("PegasusBoots") && this.world.config("canBootsClip", false))
                            || this.world.config("canOneFrameClipOW", false))
                        && ((items.has("Cape") && items.canExtendMagic(null, 3))
                            || ((!this.world.config("region.cantTakeDamage", false) || items.canExtendMagic(null, 3))
                                && items.has("CaneOfByrna")))))
                && items.has("Hammer") && items.canLiftRocks()
                && ((items.canExtendMagic() && items.has("Cape"))
                    || ((!this.world.config("region.cantTakeDamage", false) || items.canExtendMagic()) && items.has("CaneOfByrna")));
        });

        this.can_enter = (locations, items) => {
            return (items.has("RescueZelda") 
            && this.world.getRegion("West Death Mountain").canEnter(locations, items));
        };

        return this;
    }
}
