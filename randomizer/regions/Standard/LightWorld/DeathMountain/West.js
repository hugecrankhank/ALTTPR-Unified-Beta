// Converted from app/Region/Standard/LightWorld/DeathMountain/West.php (alttp_vt_randomizer, MIT)
import { Item, Location, Region, Boss, Shop, LocationCollection, ShopCollection, ItemCollection } from '../../../../core/index.js';

export class West extends Region {
    __init_props() {
        super.__init_props?.();
        this.name = "Death Mountain";
    }

    
    constructor(world) {
        super(world);

        this.locations = new LocationCollection([
            new Location.Npc("Old Man", [0xF69FA], null, this),
            new Location.Standing("Spectacle Rock Cave", [0x180002], null, this),
            new Location.Drop.Ether("Ether Tablet", [0x180016], null, this),
            new Location.Standing("Spectacle Rock", [0x180140], null, this),
        ]);
        this.locations.setChecksForWorld(world.id);
    }

    
    initalize() {
        this.locations.get("Old Man").setRequirements((locations, items) => {
            return items.has("Lamp", this.world.config("item.require.Lamp", 1));
        });

        this.locations.get("Ether Tablet").setRequirements((locations, items) => {
            return items.has("BookOfMudora") && (items.hasSword(2)
                || (this.world.config("mode.weapons") == "swordless" && items.has("Hammer")))
                && this.world.getRegion("Tower of Hera").canEnter(locations, items);
        });

        this.locations.get("Spectacle Rock").setRequirements((locations, items) => {
            return items.has("MagicMirror")
                || (this.world.config("canBootsClip", false) && items.has("PegasusBoots"))
                || this.world.config("canOneFrameClipOW", false);
        });

        this.can_enter = (locations, items) => {
            return items.has("RescueZelda")
                && (items.canFly(this.world)
                    || this.world.config("canOneFrameClipOW", false)
                    || (this.world.config("canOWYBA", false) &&  items.hasABottle())
                    || (this.world.config("canBootsClip", false) && items.has("PegasusBoots"))
                    || (this.world.config("canSuperSpeed", false) && items.canSpinSpeed())
                    || (items.canLiftRocks() && items.has("Lamp", this.world.config("item.require.Lamp", 1))));
        };

        return this;
    }
}
