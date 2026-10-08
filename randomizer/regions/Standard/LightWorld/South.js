// Converted from app/Region/Standard/LightWorld/South.php (alttp_vt_randomizer, MIT)
import { Item, Location, Region, Boss, Shop, LocationCollection, ShopCollection, ItemCollection } from '../../../core/index.js';

export class South extends Region {
    __init_props() {
        super.__init_props?.();
        this.name = "Light World";
    }

    
    constructor(world) {
        super(world);

        this.locations = new LocationCollection([
            new Location.Chest("Floodgate Chest", [0xE98C], null, this),
            new Location.Chest("Link's House", [0xE9BC], null, this),
            new Location.Chest("Aginah's Cave", [0xE9F2], null, this),
            new Location.Chest("Mini Moldorm Cave - Far Left", [0xEB42], null, this),
            new Location.Chest("Mini Moldorm Cave - Left", [0xEB45], null, this),
            new Location.Chest("Mini Moldorm Cave - Right", [0xEB48], null, this),
            new Location.Chest("Mini Moldorm Cave - Far Right", [0xEB4B], null, this),
            new Location.Chest("Ice Rod Cave", [0xEB4E], null, this),
            new Location.Npc("Hobo", [0x33E7D], null, this),
            new Location.Drop.Bombos("Bombos Tablet", [0x180017], null, this),
            new Location.Standing("Cave 45", [0x180003], null, this),
            new Location.Standing("Checkerboard Cave", [0x180005], null, this),
            new Location.Npc("Mini Moldorm Cave - NPC", [0x180010], null, this),
            new Location.Dash("Library", [0x180012], null, this),
            new Location.Standing("Maze Race", [0x180142], null, this),
            new Location.Standing("Desert Ledge", [0x180143], null, this),
            new Location.Standing("Lake Hylia Island", [0x180144], null, this),
            new Location.Standing("Sunken Treasure", [0x180145], null, this),
            new Location.Dig.HauntedGrove("Flute Spot", [0x18014A], null, this),
        ]);
        this.locations.setChecksForWorld(world.id);
        this.shops = new ShopCollection([
            new Shop("Light World Lake Hylia Shop", 0x03, 0xA0, 0x0112, 0x58, this),
            new Shop.Upgrade("Capacity Upgrade", 0x12, 0x04, 0x0115, 0x5D, this),
            // Single entrance caves with no items in them ;)
            new Shop.TakeAny("20 Rupee Cave", 0x83, 0xA0, 0x0112, 0x7B, this, {[0xDBBED]: [0x58]
}),
            new Shop.TakeAny("50 Rupee Cave", 0x83, 0xA0, 0x0112, 0x79, this, {[0xDBBEB]: [0x58]
}),
            new Shop.TakeAny("Bonk Fairy (Light)", 0x83, 0xA0, 0x0112, 0x77, this, {[0xDBBE9]: [0x58]
}),
            new Shop.TakeAny("Desert Fairy", 0x83, 0xA0, 0x0112, 0x72, this, {[0xDBBE4]: [0x58]
}),
            new Shop.TakeAny("Good Bee Cave", 0x83, 0xA0, 0x0112, 0x6B, this, {[0xDBBDD]: [0x58]
}),
            new Shop.TakeAny("Lake Hylia Fortune Teller", 0x83, 0xA0, 0x011F, 0x73, this, {[0xDBBE5]: [0x46]
}),
            new Shop.TakeAny("Light Hype Fairy", 0x83, 0xA0, 0x0112, 0x6C, this, {[0xDBBDE]: [0x58]
}),
            new Shop.TakeAny("Kakariko Gamble Game", 0x83, 0xA0, 0x011F, 0x67, this, {[0xDBBD9]: [0x46]
}),
        ]);

        this.shops.get("Capacity Upgrade").clearInventory()
            .addInventory(0, Item.get("BombUpgrade5", world), 100, 7)
            .addInventory(1, Item.get("ArrowUpgrade5", world), 100, 7);

        this.shops.get("Light World Lake Hylia Shop").clearInventory()
            .addInventory(0, Item.get("RedPotion", world), 150)
            .addInventory(1, Item.get("Heart", world), 10)
            .addInventory(2, Item.get("TenBombs", world), 50);
    }

    
    initalize() {
        this.shops.get("20 Rupee Cave").setRequirements((locations, items) => {
            return items.canLiftRocks();
        });

        this.shops.get("50 Rupee Cave").setRequirements((locations, items) => {
            return items.canLiftRocks();
        });

        this.shops.get("Bonk Fairy (Light)").setRequirements((locations, items) => {
            return items.has("PegasusBoots");
        });

        this.shops.get("Light Hype Fairy").setRequirements((locations, items) => {
            return items.canBombThings();
        });

        this.shops.get("Capacity Upgrade").setRequirements((locations, items) => {
            return (this.world.config("canWaterWalk", false) && items.has("PegasusBoots"))
                || this.world.config("canFakeFlipper", false) || items.has("Flippers");
        });

        this.locations.get("Aginah's Cave").setRequirements((locations, items) => {
            return items.canBombThings();
        });
        
        this.locations.get("Mini Moldorm Cave - Far Left").setRequirements((locations, items) => {
            return items.canBombThings() && items.canKillMostThings(this.world);
        });
        
        this.locations.get("Mini Moldorm Cave - Left").setRequirements((locations, items) => {
            return items.canBombThings() && items.canKillMostThings(this.world);
        });

        this.locations.get("Mini Moldorm Cave - Right").setRequirements((locations, items) => {
            return items.canBombThings() && items.canKillMostThings(this.world);
        });

        this.locations.get("Mini Moldorm Cave - Far Right").setRequirements((locations, items) => {
            return items.canBombThings() && items.canKillMostThings(this.world);
        });

        this.locations.get("Mini Moldorm Cave - NPC").setRequirements((locations, items) => {
            return items.canBombThings() && items.canKillMostThings(this.world);
        });

        this.locations.get("Hobo").setRequirements((locations, items) => {
            return (this.world.config("canWaterWalk", false) && items.has("PegasusBoots"))
                || this.world.config("canFakeFlipper", false) || items.has("Flippers");
        });

        this.locations.get("Bombos Tablet").setRequirements((locations, items) => {
            return items.has("BookOfMudora") && (items.hasSword(2)
                || (this.world.config("mode.weapons") == "swordless" && items.has("Hammer")))
                && (this.world.config("canOneFrameClipOW", false)
                    || (this.world.config("canBootsClip", false) && items.has("PegasusBoots"))
                    || (items.has("MagicMirror") && this.world.getRegion("South Dark World").canEnter(locations, items)));
        });

        this.locations.get("Cave 45").setRequirements((locations, items) => {
            return this.world.config("canOneFrameClipOW", false)
                || (this.world.config("canBootsClip", false) && items.has("PegasusBoots"))
                || (items.has("MagicMirror") && this.world.getRegion("South Dark World").canEnter(locations, items));
        });

        this.locations.get("Checkerboard Cave").setRequirements((locations, items) => {
            return items.canLiftRocks()
                && (this.world.config("canOneFrameClipOW", false)
                    || (this.world.config("canBootsClip", false) && items.has("PegasusBoots"))
                    || (items.has("MagicMirror") && this.world.getRegion("Mire").canEnter(locations, items)));
        });

        this.locations.get("Library").setRequirements((locations, items) => {
            return items.has("PegasusBoots");
        });

        this.locations.get("Desert Ledge").setRequirements((locations, items) => {
            return this.world.getRegion("Desert Palace").canEnter(locations, items);
        });

        this.locations.get("Lake Hylia Island").setRequirements((locations, items) => {
            return this.world.config("canOneFrameClipOW", false)
                || (this.world.config("canBootsClip", false) && items.has("PegasusBoots"))
                || (items.has("MagicMirror") && this.world.config("canWaterWalk", false) && items.has("PegasusBoots")
                    && (items.has("MoonPearl") || (this.world.config("canOWYBA", false) && items.hasABottle()))
                    && this.world.getRegion("North West Dark World").canEnter(locations, items))
                || (items.has("Flippers") && items.has("MagicMirror")
                    && (this.world.config("canBunnySurf", false)
                        || items.has("MoonPearl") || (this.world.config("canOWYBA", false) && items.hasABottle()))
                    && this.world.getRegion("North East Dark World").canEnter(locations, items));
        });

        this.locations.get("Flute Spot").setRequirements((locations, items) => {
            return items.has("Shovel");
        });

        this.can_enter = (locations, items) => {
            return items.has("RescueZelda");
        };

        return this;
    }
}
