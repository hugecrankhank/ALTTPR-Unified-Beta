// Converted from app/Region/Standard/LightWorld/NorthEast.php (alttp_vt_randomizer, MIT)
import { Item, Location, Region, Boss, Shop, LocationCollection, ShopCollection, ItemCollection } from '../../../core/index.js';

export class NorthEast extends Region {
    __init_props() {
        super.__init_props?.();
        this.name = "Light World";
    }

    
    constructor(world) {
        super(world);

        this.locations = new LocationCollection([
            new Location.Chest("Sahasrahla's Hut - Left", [0xEA82], null, this),
            new Location.Chest("Sahasrahla's Hut - Middle", [0xEA85], null, this),
            new Location.Chest("Sahasrahla's Hut - Right", [0xEA88], null, this),
            new Location.Npc("Sahasrahla", [0x2F1FC], null, this),
            new Location.Npc.Zora("King Zora", [0xEE1C3], null, this),
            new Location.Npc.Witch("Potion Shop", [0x180014], null, this),
            new Location.Standing("Zora's Ledge", [0x180149], null, this),
            new Location.Chest("Waterfall Fairy - Left", [0xE9B0], null, this),
            new Location.Chest("Waterfall Fairy - Right", [0xE9D1], null, this),
        ]);

        this.shops = new ShopCollection([
            new Shop.TakeAny("Long Fairy Cave", 0x83, 0xA0, 0x0112, 0x55, this, {[0xDBBC7]: [0x58]
}),
            new Shop.TakeAny("Lake Hylia Fairy", 0x83, 0xA0, 0x0112, 0x5E, this, {[0xDBBD0]: [0x58]
}),
        ]);

        this.locations.setChecksForWorld(world.id);
    }

    
    initalize() {
        this.locations.get("Sahasrahla").setRequirements((locations, items) => {
            return items.has("PendantOfCourage");
        });

        this.locations.get("King Zora").setRequirements((locations, items) => {
            return this.world.config("canFakeFlipper", false)
                || ((this.world.config("canWaterWalk", false) || this.world.config("canBootsClip", false))
                    && items.has("PegasusBoots"))
                || this.world.config("canOneFrameClipOW", false)
                || items.canLiftRocks() || items.has("Flippers");
        });

        this.locations.get("Potion Shop").setRequirements((locations, items) => {
            return items.has("Mushroom");
        });

        this.locations.get("Zora's Ledge").setRequirements((locations, items) => {
            return  items.has("Flippers")
                || (items.has("PegasusBoots")
                    && (this.world.config("canWaterWalk", false)
                        && (this.world.config("canFakeFlipper", false)
                            || (this.world.config("canSuperSpeed", false) && items.canSpinSpeed())
                            || this.world.config("canBootsClip", false)
                            || this.world.config("canOneFrameClipOW", false))));
        });

        this.locations.get("Waterfall Fairy - Left").setRequirements((locations, items) => {
            return items.has("Flippers")
                || (this.world.config("canWaterWalk", false) && (items.has("PegasusBoots")
                    || (items.has("MoonPearl") && this.world.config("canFakeFlipper", false))));
        });

        this.locations.get("Waterfall Fairy - Right").setRequirements((locations, items) => {
            return items.has("Flippers")
                || (this.world.config("canWaterWalk", false) && (items.has("PegasusBoots")
                    || (items.has("MoonPearl") && this.world.config("canFakeFlipper", false))));
        });

        this.can_enter = (locations, items) => {
            return items.has("RescueZelda");
        };

        return this;
    }
}
