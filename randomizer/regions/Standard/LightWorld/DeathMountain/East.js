// Converted from app/Region/Standard/LightWorld/DeathMountain/East.php (alttp_vt_randomizer, MIT)
import { Item, Location, Region, Boss, Shop, LocationCollection, ShopCollection, ItemCollection } from '../../../../core/index.js';

export class East extends Region {
    __init_props() {
        super.__init_props?.();
        this.name = "Death Mountain";
    }

    
    constructor(world) {
        super(world);

        this.locations = new LocationCollection([
            new Location.Chest("Spiral Cave", [0xE9BF], null, this),
            new Location.Chest("Mimic Cave", [0xE9C5], null, this),
            new Location.Chest("Paradox Cave Lower - Far Left", [0xEB2A], null, this),
            new Location.Chest("Paradox Cave Lower - Left", [0xEB2D], null, this),
            new Location.Chest("Paradox Cave Lower - Right", [0xEB30], null, this),
            new Location.Chest("Paradox Cave Lower - Far Right", [0xEB33], null, this),
            new Location.Chest("Paradox Cave Lower - Middle", [0xEB36], null, this),
            new Location.Chest("Paradox Cave Upper - Left", [0xEB39], null, this),
            new Location.Chest("Paradox Cave Upper - Right", [0xEB3C], null, this),
            new Location.Standing("Floating Island", [0x180141], null, this),
        ]);
        this.locations.setChecksForWorld(world.id);
        this.shops = new ShopCollection([
            new Shop("Light World Death Mountain Shop", 0x43, 0xA0, 0x00FF, 0x00, this),

            new Shop.TakeAny("Hookshot Fairy", 0x83, 0xA0, 0x0112, 0x50, this, {[0xDBBC2]: [0x58]
}),
        ]);

        this.shops.get("Light World Death Mountain Shop").clearInventory()
            .addInventory(0, Item.get("RedPotion", world), 150)
            .addInventory(1, Item.get("Heart", world), 10)
            .addInventory(2, Item.get("TenBombs", world), 50);
    }

    
    initalize() {
        this.shops.get("Light World Death Mountain Shop").setRequirements((locations, items) => {
            return items.canBombThings();
        });

        this.locations.get("Mimic Cave").setRequirements((locations, items) => {
            return items.has("Hammer") && items.has("MagicMirror")
                && (this.world.config("canMirrorClip", false)
                    || (this.world.config("canBootsClip", false) && items.has("PegasusBoots")
                        && (items.has("MoonPearl") || (this.world.config("canOWYBA", false) && items.has("Bottle"))))
                    || (this.world.config("canSuperSpeed", false) && items.canSpinSpeed() && items.has("MoonPearl")
                        && this.world.getRegion("East Dark World Death Mountain").canEnter(locations, items))
                    || this.world.config("canOneFrameClipOW", false)
                    || (items.has("KeyD7", 2) && this.world.getRegion("Turtle Rock").canEnter(locations, items)));
        });

        this.locations.get("Floating Island").setRequirements((locations, items) => {
            return (this.world.config("canBootsClip", false) && items.has("PegasusBoots"))
                || (this.world.config("canOWYBA", false) && items.has("Bottle"))
                || this.world.config("canOneFrameClipOW", false)
                || (items.has("MagicMirror")
                    && ((items.has("MoonPearl") && items.canBombThings() && items.canLiftRocks())
                        || this.world.config("canMirrorWrap", false))
                    && this.world.getRegion("East Dark World Death Mountain").canEnter(locations, items));
        });

        this.can_enter = (locations, items) => {
            return items.has("RescueZelda")
                && (this.world.config("canOneFrameClipOW", false)
                    || (this.world.config("canBootsClip", false) && items.has("PegasusBoots"))
                    || (this.world.config("canSuperSpeed", false) && items.canSpinSpeed())
                    || ((((this.world.config("canMirrorClip", false) || this.world.config("canMirrorWrap", false))
                        && items.has("MagicMirror")) || items.has("Hookshot"))
                        && this.world.getRegion("West Death Mountain").canEnter(locations, items))
                    || (items.has("Hammer") && this.world.getRegion("Tower of Hera").canEnter(locations, items)));
        };

        return this;
    }
}
