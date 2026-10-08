// Converted from app/Region/Standard/LightWorld/NorthWest.php (alttp_vt_randomizer, MIT)
import { Item, Location, Region, Boss, Shop, LocationCollection, ShopCollection, ItemCollection } from '../../../core/index.js';

export class NorthWest extends Region {
    __init_props() {
        super.__init_props?.();
        this.name = "Light World";
    }

    
    constructor(world) {
        super(world);

        this.locations = new LocationCollection([
            new Location.Pedestal("Master Sword Pedestal", [0x289B0], null, this),
            new Location.Chest("King's Tomb", [0xE97A], null, this),
            new Location.Chest("Kakariko Tavern", [0xE9CE], null, this),
            new Location.Chest("Chicken House", [0xE9E9], null, this),
            new Location.Chest("Kakariko Well - Top", [0xEA8E], null, this),
            new Location.Chest("Kakariko Well - Left", [0xEA91], null, this),
            new Location.Chest("Kakariko Well - Middle", [0xEA94], null, this),
            new Location.Chest("Kakariko Well - Right", [0xEA97], null, this),
            new Location.Chest("Kakariko Well - Bottom", [0xEA9A], null, this),
            new Location.Chest("Blind's Hideout - Top", [0xEB0F], null, this),
            new Location.Chest("Blind's Hideout - Left", [0xEB12], null, this),
            new Location.Chest("Blind's Hideout - Right", [0xEB15], null, this),
            new Location.Chest("Blind's Hideout - Far Left", [0xEB18], null, this),
            new Location.Chest("Blind's Hideout - Far Right", [0xEB1B], null, this),
            new Location.Chest("Pegasus Rocks", [0xEB3F], null, this),
            new Location.Npc("Bottle Merchant", [0x2EB18], null, this),
            new Location.Npc("Magic Bat", [0x180015], null, this),
            new Location.Npc.BugCatchingKid("Sick Kid", [0x339CF], null, this),
            new Location.Standing("Lost Woods Hideout", [0x180000], null, this),
            new Location.Standing("Lumberjack Tree", [0x180001], null, this),
            new Location.Standing("Graveyard Ledge", [0x180004], null, this),
            new Location.Standing("Mushroom", [0x180013], null, this),
        ]);
        this.locations.setChecksForWorld(world.id);
        this.shops = new ShopCollection([
            new Shop("Light World Kakariko Shop", 0x03, 0xA0, 0x011F, 0x46, this),
            // Single entrance caves with no items in them ;)
            new Shop.TakeAny("Fortune Teller (Light)", 0x83, 0xA0, 0x011F, 0x65, this, {[0xDBBD7]: [0x46]
}),
            new Shop.TakeAny("Bush Covered House", 0x83, 0xA0, 0x011F, 0x44, this, {[0xDBBB6]: [0x46]
}),
            new Shop.TakeAny("Lost Woods Gamble", 0x83, 0xA0, 0x0112, 0x3C, this, {[0xDBBAE]: [0x58]
}),
            new Shop.TakeAny("Lumberjack House", 0x83, 0xA0, 0x011F, 0x76, this, {[0xDBBE8]: [0x46]
}),
            new Shop.TakeAny("Snitch Lady East", 0x83, 0xA0, 0x011F, 0x3E, this, {[0xDBBB0]: [0x46]
}),
            new Shop.TakeAny("Snitch Lady West", 0x83, 0xA0, 0x011F, 0x3F, this, {[0xDBBB1]: [0x46]
}),
            new Shop.TakeAny("Bomb Hut", 0x83, 0xA0, 0x011F, 0x4A, this, {[0xDBBBC]: [0x46]
}),
        ]);

        this.shops.get("Light World Kakariko Shop").clearInventory()
            .addInventory(0, Item.get("RedPotion", world), 150)
            .addInventory(1, Item.get("Heart", world), 10)
            .addInventory(2, Item.get("TenBombs", world), 50);
    }

    
    initalize() {
        this.shops.get("Bomb Hut").setRequirements((locations, items) => {
            return items.canBombThings();
        });

        this.locations.get("Master Sword Pedestal").setRequirements((locations, items) => {
            return (this.world.config("itemPlacement") !== "basic" || items.has("BookOfMudora"))
                && items.has("PendantOfPower")
                && items.has("PendantOfWisdom")
                && items.has("PendantOfCourage");
        });

        this.locations.get("King's Tomb").setRequirements((locations, items) => {
            return items.has("PegasusBoots")
                && (this.world.config("canBootsClip", false)
                    || items.canLiftDarkRocks()
                    || this.world.config("canOneFrameClipOW", false)
                    || (this.world.config("canSuperSpeed", false) && items.canSpinSpeed())
                    || (items.has("MagicMirror") && this.world.getRegion("North West Dark World").canEnter(locations, items)
                        && (items.has("MoonPearl") || (items.hasABottle() && this.world.config("canOWYBA", false))
                            || (this.world.config("canBunnyRevive", false) && items.canBunnyRevive(this.world)))));
        });

        this.locations.get("Pegasus Rocks").setRequirements((locations, items) => {
            return items.has("PegasusBoots");
        });

        this.locations.get("Magic Bat").setRequirements((locations, items) => {
            return items.has("Powder")
                && (items.has("Hammer")
                    || (((this.world.config("canBootsClip", false) && items.has("PegasusBoots"))
                        || this.world.config("canOneFrameClipOW", false)) && this.world.config("canTransitionWrapped", false)
                        && (items.has("Flippers") || this.world.config("canFakeFlipper", false)))
                    || (items.has("MagicMirror")
                        && ((this.world.config("canMirrorWrap", false) && this.world.getRegion("North West Dark World").canEnter(locations, items))
                            || ((items.has("MoonPearl") || (items.hasABottle() && this.world.config("canOWYBA", false))
                                || (this.world.config("canBunnyRevive", false) && items.canBunnyRevive(this.world)))
                                && ((items.canLiftDarkRocks() && this.world.getRegion("North West Dark World").canEnter(locations, items))
                                    || (this.world.config("canSuperSpeed", false) && items.canSpinSpeed()
                                        && (items.has("Flippers") || this.world.config("canFakeFlipper", false))
                                        && this.world.getRegion("North East Dark World").canEnter(locations, items)))))));
        });

        this.locations.get("Sick Kid").setRequirements((locations, items) => {
            return items.hasABottle();
        });

        this.locations.get("Lumberjack Tree").setRequirements((locations, items) => {
            return items.has("DefeatAgahnim") && items.has("PegasusBoots");
        });

        this.locations.get("Graveyard Ledge").setRequirements((locations, items) => {
            return (this.world.config("canBootsClip", false) && items.has("PegasusBoots"))
                || (this.world.config("canSuperSpeed", false) && items.canSpinSpeed())
                || this.world.config("canOneFrameClipOW", false)
                || (items.has("MagicMirror") && this.world.getRegion("North West Dark World").canEnter(locations, items)
                    && (items.has("MoonPearl") || (items.hasABottle() && this.world.config("canOWYBA", false))
                        || (this.world.config("canBunnyRevive", false) && items.canBunnyRevive(this.world))));
        });

        this.can_enter = (locations, items) => {
            return items.has("RescueZelda");
        };

        return this;
    }
}
