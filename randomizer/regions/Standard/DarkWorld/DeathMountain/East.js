// Converted from app/Region/Standard/DarkWorld/DeathMountain/East.php (alttp_vt_randomizer, MIT)
import { Item, Location, Region, Boss, Shop, LocationCollection, ShopCollection, ItemCollection } from '../../../../core/index.js';

export class East extends Region {
    __init_props() {
        super.__init_props?.();
        this.name = "Dark World";
    }

    
    constructor(world) {
        super(world);

        this.locations = new LocationCollection([
            new Location.Chest("Superbunny Cave - Top", [0xEA7C], null, this),
            new Location.Chest("Superbunny Cave - Bottom", [0xEA7F], null, this),
            new Location.Chest("Hookshot Cave - Top Right", [0xEB51], null, this),
            new Location.Chest("Hookshot Cave - Top Left", [0xEB54], null, this),
            new Location.Chest("Hookshot Cave - Bottom Left", [0xEB57], null, this),
            new Location.Chest("Hookshot Cave - Bottom Right", [0xEB5A], null, this),
        ]);
        this.locations.setChecksForWorld(world.id);
        this.shops = new ShopCollection([
            new Shop("Dark World Death Mountain Shop", 0x03, 0xC1, 0x0112, 0x6E, this),
        ]);

        this.shops.get("Dark World Death Mountain Shop").clearInventory()
            .addInventory(0, Item.get("RedPotion", world), 150)
            .addInventory(1, Item.get("Heart", world), 10)
            .addInventory(2, Item.get("TenBombs", world), 50);
    }

    
    initalize() {
        this.locations.get("Superbunny Cave - Top").setRequirements((locations, items) => {
            return this.world.config("canSuperBunny", false) || items.has("MoonPearl")
                || ((this.world.config("canOWYBA", false) && items.hasABottle())
                    && ((this.world.config("canBootsClip", false) && items.has("PegasusBoots"))
                        || this.world.config("canOneFrameClipOW", false)));
        });

        this.locations.get("Superbunny Cave - Bottom").setRequirements((locations, items) => {
            return this.world.config("canSuperBunny", false) || items.has("MoonPearl")
                || ((this.world.config("canOWYBA", false) && items.hasABottle())
                    && ((this.world.config("canBootsClip", false) && items.has("PegasusBoots"))
                        || this.world.config("canOneFrameClipOW", false)));
        });

        this.locations.get("Hookshot Cave - Top Right").setRequirements((locations, items) => {
            return items.has("Hookshot")
                && ((items.has("MoonPearl") || (this.world.config("canOWYBA", false) && items.hasABottle()))
                    && (items.canLiftRocks() || this.world.config("canOneFrameClipOW", false)
                        || (this.world.config("canBootsClip", false) && items.has("PegasusBoots"))));
        });

        this.locations.get("Hookshot Cave - Top Left").setRequirements((locations, items) => {
            return items.has("Hookshot")
                && ((items.has("MoonPearl") || (this.world.config("canOWYBA", false) && items.hasABottle()))
                    && (items.canLiftRocks() || this.world.config("canOneFrameClipOW", false)
                        || (this.world.config("canBootsClip", false) && items.has("PegasusBoots"))));
        });

        this.locations.get("Hookshot Cave - Bottom Left").setRequirements((locations, items) => {
            return items.has("Hookshot")
                && ((items.has("MoonPearl") || (this.world.config("canOWYBA", false) && items.hasABottle()))
                    && (items.canLiftRocks() || this.world.config("canOneFrameClipOW", false)
                        || (this.world.config("canBootsClip", false) && items.has("PegasusBoots"))));
        });

        this.locations.get("Hookshot Cave - Bottom Right").setRequirements((locations, items) => {
            return (items.has("Hookshot") || (this.world.config("itemPlacement") !== "basic" && items.has("PegasusBoots")))
                && ((items.has("MoonPearl") || (this.world.config("canOWYBA", false) && items.hasABottle()))
                    && (items.canLiftRocks() || this.world.config("canOneFrameClipOW", false)
                        || (this.world.config("canBootsClip", false) && items.has("PegasusBoots"))));
        });

        this.can_enter = (locations, items) => {
            return items.has("RescueZelda")
                && ((items.canLiftDarkRocks()
                    && this.world.getRegion("East Death Mountain").canEnter(locations, items))
                    || (this.world.config("canBootsClip", false) && items.has("PegasusBoots")
                        && (items.has("MoonPearl") || items.has("Hammer")
                            || (this.world.config("canOWYBA", false) && items.hasABottle())))
                    || this.world.config("canOneFrameClipOW", false)
                    || (this.world.getRegion("West Death Mountain").canEnter(locations, items)
                        && (this.world.config("canMirrorClip", false) || this.world.config("canMirrorWrap", false))
                        && items.has("MagicMirror")));
        };

        return this;
    }
}
