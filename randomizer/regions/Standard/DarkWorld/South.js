// Converted from app/Region/Standard/DarkWorld/South.php (alttp_vt_randomizer, MIT)
import { Item, Location, Region, Boss, Shop, LocationCollection, ShopCollection, ItemCollection } from '../../../core/index.js';

export class South extends Region {
    __init_props() {
        super.__init_props?.();
        this.name = "Dark World";
    }

    
    constructor(world) {
        super(world);

        this.locations = new LocationCollection([
            new Location.Chest("Hype Cave - Top", [0xEB1E], null, this),
            new Location.Chest("Hype Cave - Middle Right", [0xEB21], null, this),
            new Location.Chest("Hype Cave - Middle Left", [0xEB24], null, this),
            new Location.Chest("Hype Cave - Bottom", [0xEB27], null, this),
            new Location.Npc("Stumpy", [0x330C7], null, this),
            new Location.Npc("Hype Cave - NPC", [0x180011], null, this),
            new Location.Dig("Digging Game", [0x180148], null, this),
        ]);
        this.locations.setChecksForWorld(world.id);
        this.shops = new ShopCollection([
            new Shop("Dark World Lake Hylia Shop", 0x03, 0xC1, 0x010F, 0x74, this),
            // Single entrance caves with no items in them ;)
            new Shop.TakeAny("Archery Game", 0x83, 0xC1, 0x010F, 0x59, this, {[0xDBBCB]: [0x60]
}),
            new Shop.TakeAny("Bonk Fairy (Dark)", 0x83, 0xC1, 0x0112, 0x78, this, {[0xDBBEA]: [0x58]
}),
            new Shop.TakeAny("Dark Lake Hylia Ledge Fairy", 0x83, 0xC1, 0x0112, 0x81, this, {[0xDBBF3]: [0x58]
}),
            new Shop.TakeAny("Dark Lake Hylia Ledge Hint", 0x83, 0xC1, 0x0112, 0x6A, this, {[0xDBBDC]: [0x58]
}),
            new Shop.TakeAny("Dark Lake Hylia Ledge Spike Cave", 0x83, 0xC1, 0x0112, 0x7C, this, {[0xDBBEE]: [0x58]
}),
        ]);

        this.shops.get("Dark World Lake Hylia Shop").clearInventory()
            .addInventory(0, Item.get("RedPotion", world), 150)
            .addInventory(1, Item.get("BlueShield", world), 50)
            .addInventory(2, Item.get("TenBombs", world), 50);
    }

    
    initalize() {
        this.locations.get("Hype Cave - Top").setRequirements((locations, items) => {
            return items.has("MoonPearl")
                || (this.world.config("canOWYBA", false) && items.hasABottle())
                || (this.world.config("canBunnyRevive", false) && items.canBunnyRevive(this.world));
        });

        this.locations.get("Hype Cave - Middle Right").setRequirements((locations, items) => {
            return items.has("MoonPearl")
                || (this.world.config("canOWYBA", false) && items.hasABottle())
                || (this.world.config("canBunnyRevive", false) && items.canBunnyRevive(this.world));
        });

        this.locations.get("Hype Cave - Middle Left").setRequirements((locations, items) => {
            return items.has("MoonPearl")
                || (this.world.config("canOWYBA", false) && items.hasABottle())
                || (this.world.config("canBunnyRevive", false) && items.canBunnyRevive(this.world));
        });

        this.locations.get("Hype Cave - Bottom").setRequirements((locations, items) => {
            return items.has("MoonPearl")
                || (this.world.config("canOWYBA", false) && items.hasABottle())
                || (this.world.config("canBunnyRevive", false) && items.canBunnyRevive(this.world));
        });

        this.locations.get("Hype Cave - NPC").setRequirements((locations, items) => {
            return items.has("MoonPearl")
                || (this.world.config("canOWYBA", false) && items.hasABottle())
                || (this.world.config("canBunnyRevive", false) && items.canBunnyRevive(this.world));
        });

        this.locations.get("Stumpy").setRequirements((locations, items) => {
            return items.has("MoonPearl")
                || (this.world.config("canOWYBA", false) && items.hasABottle())
                || (this.world.config("canBunnyRevive", false) && items.canBunnyRevive(this.world))
                || (items.has("MagicMirror") && this.world.config("canMirrorWrap", false));
        });

        this.locations.get("Digging Game").setRequirements((locations, items) => {
            return items.has("MoonPearl")
                || (this.world.config("canOWYBA", false) && items.hasABottle())
                || (this.world.config("canBunnyRevive", false) && items.canBunnyRevive(this.world));
        });

        this.shops.get("Bonk Fairy (Dark)").setRequirements((locations, items) => {
            return items.has("PegasusBoots")
                && (items.has("MoonPearl")
                    || (this.world.config("canOWYBA", false) && items.hasABottle())
                    || (this.world.config("canBunnyRevive", false) && items.canBunnyRevive(this.world)));
        });

        this.shops.get("Dark Lake Hylia Ledge Fairy").setRequirements((locations, items) => {
            return (items.canBombThings() || (items.has("PegasusBoots") && this.world.config("canBootsClip", false)))
                && (items.has("Flippers")
                    || (this.world.getRegion("North West Dark World").canEnter(locations, items)
                        && this.world.config("canFakeFlipper", false) && (!this.world.config("region.cantTakeDamage", false)))
                    || (this.world.config("canBunnyRevive", false) && items.canBunnyRevive(this.world)))
                && (items.has("MoonPearl")
                    || (this.world.config("canOWYBA", false) && items.hasABottle())
                    || (this.world.config("canBunnyRevive", false) && items.canBunnyRevive(this.world)));
        });

        this.shops.get("Dark Lake Hylia Ledge Hint").setRequirements((locations, items) => {
            return (items.has("Flippers")
                || (this.world.getRegion("North West Dark World").canEnter(locations, items)
                    && this.world.config("canFakeFlipper", false) && (!this.world.config("region.cantTakeDamage", false)))
                || (this.world.config("canBunnyRevive", false) && items.canBunnyRevive(this.world)))
                && (items.has("MoonPearl")
                    || (this.world.config("canOWYBA", false) && items.hasABottle())
                    || (this.world.config("canBunnyRevive", false) && items.canBunnyRevive(this.world)));
        });

        this.shops.get("Dark Lake Hylia Ledge Spike Cave").setRequirements((locations, items) => {
            return items.canLiftRocks()
                && (items.has("Flippers")
                    || (this.world.getRegion("North West Dark World").canEnter(locations, items)
                        && this.world.config("canFakeFlipper", false) && (!this.world.config("region.cantTakeDamage", false)))
                    || (this.world.config("canBunnyRevive", false) && items.canBunnyRevive(this.world)))
                && (items.has("MoonPearl")
                    || (this.world.config("canOWYBA", false) && items.hasABottle())
                    || (this.world.config("canBunnyRevive", false) && items.canBunnyRevive(this.world)));
        });

        this.can_enter = (locations, items) => {
            return items.has("RescueZelda")
                && ((this.world.config("canOWYBA", false) && items.hasABottle())
                    || ((items.has("MoonPearl") || (this.world.config("canBunnyRevive", false) && items.canBunnyRevive(this.world)))
                        && (this.world.getRegion("North East Dark World").canEnter(locations, items)
                            && (items.has("Hammer")
                                || (this.world.config("canSuperSpeed", false) && items.canSpinSpeed()
                                    && (this.world.config("canFakeFlipper", false) || items.has("Flippers"))))))
                    || this.world.getRegion("North West Dark World").canEnter(locations, items));
        };

        return this;
    }
}
