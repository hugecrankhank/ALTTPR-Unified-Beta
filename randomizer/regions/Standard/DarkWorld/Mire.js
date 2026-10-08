// Converted from app/Region/Standard/DarkWorld/Mire.php (alttp_vt_randomizer, MIT)
import { Item, Location, Region, Boss, Shop, LocationCollection, ShopCollection, ItemCollection } from '../../../core/index.js';

export class Mire extends Region {
    __init_props() {
        super.__init_props?.();
        this.name = "Dark World";
    }

    
    constructor(world) {
        super(world);

        this.locations = new LocationCollection([
            new Location.Chest("Mire Shed - Left", [0xEA73], null, this),
            new Location.Chest("Mire Shed - Right", [0xEA76], null, this),
        ]);
        this.locations.setChecksForWorld(world.id);
        this.shops = new ShopCollection([
            new Shop.TakeAny("Dark Desert Fairy", 0x83, 0xC1, 0x0112, 0x56, this, {[0xDBBC8]: [0x58]
}),
            new Shop.TakeAny("Dark Desert Hint", 0x83, 0xC1, 0x0112, 0x62, this, {[0xDBBD4]: [0x58]
}),
        ]);
    }

    
    initalize() {
        this.shops.get("Dark Desert Fairy").setRequirements((locations, items) => {
            return items.has("MoonPearl")
                || ((this.world.config("canOWYBA", false) && items.hasABottle())
                    && (this.world.config("canOneFrameClipOW", false) || items.hasBottle(2)
                        || (items.has("MagicMirror") && items.has("BugCatchingNet") && this.world.config("canBunnyRevive", false))
                        || (this.world.config("canBootsClip", false) && items.has("PegasusBoots"))));
        });

        this.shops.get("Dark Desert Hint").setRequirements((locations, items) => {
            return items.has("MoonPearl")
                || ((this.world.config("canOWYBA", false) && items.hasABottle())
                    && (this.world.config("canOneFrameClipOW", false) || items.hasBottle(2)
                        || (items.has("MagicMirror") && items.has("BugCatchingNet") && this.world.config("canBunnyRevive", false))
                        || (this.world.config("canBootsClip", false) && items.has("PegasusBoots"))));
        });

        this.locations.get("Mire Shed - Left").setRequirements((locations, items) => {
            return items.has("MoonPearl")
                || ((this.world.config("canOWYBA", false) && items.hasABottle())
                    && (this.world.config("canOneFrameClipOW", false) || items.hasBottle(2)
                        || (items.has("MagicMirror") && items.has("BugCatchingNet") && this.world.config("canBunnyRevive", false))
                        || (this.world.config("canBootsClip", false) && items.has("PegasusBoots"))))
                || (this.world.config("canSuperBunny", false)
                    && items.has("MagicMirror"));
        });

        this.locations.get("Mire Shed - Right").setRequirements((locations, items) => {
            return items.has("MoonPearl")
                || ((this.world.config("canOWYBA", false) && items.hasABottle())
                    && (this.world.config("canOneFrameClipOW", false) || items.hasBottle(2)
                        || (items.has("MagicMirror") && items.has("BugCatchingNet") && this.world.config("canBunnyRevive", false))
                        || (this.world.config("canBootsClip", false) && items.has("PegasusBoots"))))
                || (this.world.config("canSuperBunny", false)
                    && items.has("MagicMirror"));
        });

        this.can_enter = (locations, items) => {
            return items.has("RescueZelda")
                && ((items.canLiftDarkRocks() && (items.canFly(this.world)
                    || (this.world.config("canBootsClip", false) && items.has("PegasusBoots"))))
                    || this.world.config("canOneFrameClipOW", false)
                    || ((((items.has("MoonPearl") || (this.world.config("canBunnyRevive", false) && items.canBunnyRevive(this.world)))
                        && (this.world.config("canBootsClip", false) && items.has("PegasusBoots")))
                        || (this.world.config("canMirrorWrap", false) && items.has("MagicMirror")))
                        && this.world.getRegion("South Dark World").canEnter(locations, items))
                    || (this.world.config("canOWYBA", false) && items.hasABottle()));
        };

        return this;
    }
}
