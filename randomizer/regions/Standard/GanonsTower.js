// Converted from app/Region/Standard/GanonsTower.php (alttp_vt_randomizer, MIT)
import { Item, Location, Region, Boss, Shop, LocationCollection, ShopCollection, ItemCollection, in_array, sprintf, __eq } from '../../core/index.js';

export class GanonsTower extends Region {
    __init_props() {
        super.__init_props?.();
        this.name = "Ganons Tower";
        this.boss_bottom = null;
        this.boss_middle = null;
        this.boss_top = null;
        this.music_addresses = [
        0x155C9,
    ];
        this.region_items = [
        "BigKey",
        "BigKeyA2",
        "Compass",
        "CompassA2",
        "Key",
        "KeyA2",
        "Map",
        "MapA2",
    ];
    }

    
    constructor(world) {
        super(world);

        this.boss = Boss.get("Agahnim2", world);
        this.boss_top = Boss.get("Moldorm", world);
        this.boss_middle = Boss.get("Lanmolas", world);
        this.boss_bottom = Boss.get("Armos Knights", world);

        this.locations = new LocationCollection([
            new Location.Dash("Ganon's Tower - Bob's Torch", [0x180161], null, this),
            new Location.Chest("Ganon's Tower - DMs Room - Top Left", [0xEAB8], null, this),
            new Location.Chest("Ganon's Tower - DMs Room - Top Right", [0xEABB], null, this),
            new Location.Chest("Ganon's Tower - DMs Room - Bottom Left", [0xEABE], null, this),
            new Location.Chest("Ganon's Tower - DMs Room - Bottom Right", [0xEAC1], null, this),
            new Location.Chest("Ganon's Tower - Randomizer Room - Top Left", [0xEAC4], null, this),
            new Location.Chest("Ganon's Tower - Randomizer Room - Top Right", [0xEAC7], null, this),
            new Location.Chest("Ganon's Tower - Randomizer Room - Bottom Left", [0xEACA], null, this),
            new Location.Chest("Ganon's Tower - Randomizer Room - Bottom Right", [0xEACD], null, this),
            new Location.Chest("Ganon's Tower - Firesnake Room", [0xEAD0], null, this),
            new Location.Chest("Ganon's Tower - Map Chest", [0xEAD3], null, this),
            new Location.BigChest("Ganon's Tower - Big Chest", [0xEAD6], null, this),
            new Location.Chest("Ganon's Tower - Hope Room - Left", [0xEAD9], null, this),
            new Location.Chest("Ganon's Tower - Hope Room - Right", [0xEADC], null, this),
            new Location.Chest("Ganon's Tower - Bob's Chest", [0xEADF], null, this),
            new Location.Chest("Ganon's Tower - Tile Room", [0xEAE2], null, this),
            new Location.Chest("Ganon's Tower - Compass Room - Top Left", [0xEAE5], null, this),
            new Location.Chest("Ganon's Tower - Compass Room - Top Right", [0xEAE8], null, this),
            new Location.Chest("Ganon's Tower - Compass Room - Bottom Left", [0xEAEB], null, this),
            new Location.Chest("Ganon's Tower - Compass Room - Bottom Right", [0xEAEE], null, this),
            new Location.Chest("Ganon's Tower - Big Key Chest", [0xEAF1], null, this),
            new Location.Chest("Ganon's Tower - Big Key Room - Left", [0xEAF4], null, this),
            new Location.Chest("Ganon's Tower - Big Key Room - Right", [0xEAF7], null, this),
            new Location.Chest("Ganon's Tower - Mini Helmasaur Room - Left", [0xEAFD], null, this),
            new Location.Chest("Ganon's Tower - Mini Helmasaur Room - Right", [0xEB00], null, this),
            new Location.Chest("Ganon's Tower - Pre-Moldorm Chest", [0xEB03], null, this),
            new Location.Chest("Ganon's Tower - Moldorm Chest", [0xEB06], null, this),
            new Location.Prize.Event("Agahnim 2", [], null, this),
        ]);
        this.locations.setChecksForWorld(world.id);
        this.prize_location = this.locations.get("Agahnim 2");
        this.prize_location.setItem(Item.get("DefeatAgahnim2", world));
    }

    
    getBoss(level) {
        switch (level) {
            case "":
                return this.boss;
            case "top":
                return this.boss_top;
            case "middle":
                return this.boss_middle;
            case "bottom":
                return this.boss_bottom;
        }

        throw new Error(sprintf("Unknown Boss Location %s", level));
    }

    
    setBoss(boss, level = null) {
        switch (level) {
            case null:
                this.boss = boss;
                break;
            case "top":
                this.boss_top = boss;
                break;
            case "middle":
                this.boss_middle = boss;
                break;
            case "bottom":
                this.boss_bottom = boss;
                break;
            default:
                throw new Error(sprintf("Unknown Boss Location %s", level));
        }

        return this;
    }

    
    canPlaceBoss(boss, level = "top") {
        if (
            this.name != "Ice Palace" && this.world.config("mode.weapons") == "swordless"
            && boss.getName() == "Kholdstare"
        ) {
            return false;
        }

        if (level == "top") {
            return !in_array(boss.getName(), [
                "Agahnim",
                "Agahnim2",
                "Armos Knights",
                "Arrghus",
                "Blind",
                "Ganon",
                "Lanmolas",
                "Trinexx",
            ]);
        }

        if (level == "middle") {
            return !in_array(boss.getName(), [
                "Agahnim",
                "Agahnim2",
                "Blind",
                "Ganon",
            ]);
        }

        return !in_array(boss.getName(), [
            "Agahnim",
            "Agahnim2",
            "Ganon",
        ]);
    }

    
    initalize() {
        this.locations.get("Ganon's Tower - Bob's Torch").setRequirements((locations, items) => {
            return items.has("PegasusBoots");
        });

        this.locations.get("Ganon's Tower - DMs Room - Top Left").setRequirements((locations, items) => {
            return items.has("Hammer") && items.has("Hookshot");
        });

        this.locations.get("Ganon's Tower - DMs Room - Top Right").setRequirements((locations, items) => {
            return items.has("Hammer") && items.has("Hookshot");
        });

        this.locations.get("Ganon's Tower - DMs Room - Bottom Left").setRequirements((locations, items) => {
            return items.has("Hammer") && items.has("Hookshot");
        });

        this.locations.get("Ganon's Tower - DMs Room - Bottom Right").setRequirements((locations, items) => {
            return items.has("Hammer") && items.has("Hookshot");
        });

        this.locations.get("Ganon's Tower - Randomizer Room - Top Left").setRequirements((locations, items) => {
            return items.has("Hammer") && items.has("Hookshot")
                && ((locations.itemInLocations(Item.get("BigKeyA2", this.world), [
                    "Ganon's Tower - Randomizer Room - Top Right",
                    "Ganon's Tower - Randomizer Room - Bottom Left",
                    "Ganon's Tower - Randomizer Room - Bottom Right",
                ]) && items.has("KeyA2", 3))
                    || items.has("KeyA2", 4));
        });

        this.locations.get("Ganon's Tower - Randomizer Room - Top Right").setRequirements((locations, items) => {
            return items.has("Hammer") && items.has("Hookshot")
                && ((locations.itemInLocations(Item.get("BigKeyA2", this.world), [
                    "Ganon's Tower - Randomizer Room - Top Left",
                    "Ganon's Tower - Randomizer Room - Bottom Left",
                    "Ganon's Tower - Randomizer Room - Bottom Right",
                ]) && items.has("KeyA2", 3))
                    || items.has("KeyA2", 4));
        });

        this.locations.get("Ganon's Tower - Randomizer Room - Bottom Left").setRequirements((locations, items) => {
            return items.has("Hammer") && items.has("Hookshot")
                && ((locations.itemInLocations(Item.get("BigKeyA2", this.world), [
                    "Ganon's Tower - Randomizer Room - Top Right",
                    "Ganon's Tower - Randomizer Room - Top Left",
                    "Ganon's Tower - Randomizer Room - Bottom Right",
                ]) && items.has("KeyA2", 3))
                    || items.has("KeyA2", 4));
        });

        this.locations.get("Ganon's Tower - Randomizer Room - Bottom Right").setRequirements((locations, items) => {
            return items.has("Hammer") && items.has("Hookshot")
                && ((locations.itemInLocations(Item.get("BigKeyA2", this.world), [
                    "Ganon's Tower - Randomizer Room - Top Right",
                    "Ganon's Tower - Randomizer Room - Top Left",
                    "Ganon's Tower - Randomizer Room - Bottom Left",
                ]) && items.has("KeyA2", 3))
                    || items.has("KeyA2", 4));
        });

        this.locations.get("Ganon's Tower - Firesnake Room").setRequirements((locations, items) => {
            return items.has("Hammer") && items.has("Hookshot")
                && (((locations.itemInLocations(Item.get("BigKeyA2", this.world), [
                    "Ganon's Tower - Randomizer Room - Top Right",
                    "Ganon's Tower - Randomizer Room - Top Left",
                    "Ganon's Tower - Randomizer Room - Bottom Left",
                    "Ganon's Tower - Randomizer Room - Bottom Right",
                ]) || locations.get("Ganon's Tower - Firesnake Room").hasItem(Item.get("KeyA2", this.world))) && items.has("KeyA2", 2))
                    || items.has("KeyA2", 3));
        });

        this.locations.get("Ganon's Tower - Map Chest").setRequirements((locations, items) => {
            return items.has("Hammer") && (items.has("Hookshot") || (this.world.config("itemPlacement") !== "basic" && items.has("PegasusBoots")))
                && (in_array(locations.get("Ganon's Tower - Map Chest").getItem(), [Item.get("BigKeyA2", this.world), Item.get("KeyA2", this.world)])
                    ? items.has("KeyA2", 3) : items.has("KeyA2", 4));
        }).setAlwaysAllow((item, items) => {
            return this.world.config("accessibility") !== "locations" && __eq(item, Item.get("KeyA2", this.world)) && items.has("KeyA2", 3);
        }).setFillRules((item, locations, items) => {
            return this.world.config("accessibility") !== "locations" || !__eq(item, Item.get("KeyA2", this.world));
        });

        this.locations.get("Ganon's Tower - Big Chest").setRequirements((locations, items) => {
            return items.has("BigKeyA2") && items.has("KeyA2", 3)
                && ((items.has("Hammer") && items.has("Hookshot")) || (items.has("FireRod") && items.has("CaneOfSomaria")));
        }).setFillRules((item, locations, items) => {
            return !__eq(item, Item.get("BigKeyA2", this.world));
        });

        this.locations.get("Ganon's Tower - Bob's Chest").setRequirements((locations, items) => {
            return ((items.has("Hammer") && items.has("Hookshot"))
                || (items.has("FireRod") && items.has("CaneOfSomaria")))
                && items.has("KeyA2", 3)
                && (this.world.config("itemPlacement") != "basic" || (items.has("FireRod") || (items.has("Ether") && items.hasSword(1))));
        });

        this.locations.get("Ganon's Tower - Tile Room").setRequirements((locations, items) => {
            return items.has("CaneOfSomaria");
        });

        this.locations.get("Ganon's Tower - Compass Room - Top Left").setRequirements((locations, items) => {
            return items.has("FireRod") && items.has("CaneOfSomaria")
                && ((locations.itemInLocations(Item.get("BigKeyA2", this.world), [
                    "Ganon's Tower - Compass Room - Top Right",
                    "Ganon's Tower - Compass Room - Bottom Left",
                    "Ganon's Tower - Compass Room - Bottom Right",
                ]) && items.has("KeyA2", 3))
                    || items.has("KeyA2", 4));
        });

        this.locations.get("Ganon's Tower - Compass Room - Top Right").setRequirements((locations, items) => {
            return items.has("FireRod") && items.has("CaneOfSomaria")
                && ((locations.itemInLocations(Item.get("BigKeyA2", this.world), [
                    "Ganon's Tower - Compass Room - Top Left",
                    "Ganon's Tower - Compass Room - Bottom Left",
                    "Ganon's Tower - Compass Room - Bottom Right",
                ]) && items.has("KeyA2", 3))
                    || items.has("KeyA2", 4));
        });

        this.locations.get("Ganon's Tower - Compass Room - Bottom Left").setRequirements((locations, items) => {
            return items.has("FireRod") && items.has("CaneOfSomaria")
                && ((locations.itemInLocations(Item.get("BigKeyA2", this.world), [
                    "Ganon's Tower - Compass Room - Top Right",
                    "Ganon's Tower - Compass Room - Top Left",
                    "Ganon's Tower - Compass Room - Bottom Right",
                ]) && items.has("KeyA2", 3))
                    || items.has("KeyA2", 4));
        });

        this.locations.get("Ganon's Tower - Compass Room - Bottom Right").setRequirements((locations, items) => {
            return items.has("FireRod") && items.has("CaneOfSomaria")
                && ((locations.itemInLocations(Item.get("BigKeyA2", this.world), [
                    "Ganon's Tower - Compass Room - Top Right",
                    "Ganon's Tower - Compass Room - Top Left",
                    "Ganon's Tower - Compass Room - Bottom Left",
                ]) && items.has("KeyA2", 3))
                    || items.has("KeyA2", 4));
        });

        this.locations.get("Ganon's Tower - Big Key Chest").setRequirements((locations, items) => {
            return ((items.has("Hammer") && items.has("Hookshot"))
                || (items.has("FireRod") && items.has("CaneOfSomaria")))
                && items.has("KeyA2", 3)
                && this.boss_bottom.canBeat(items, locations);
        });

        this.locations.get("Ganon's Tower - Big Key Room - Left").setRequirements((locations, items) => {
            return ((items.has("Hammer") && items.has("Hookshot"))
                || (items.has("FireRod") && items.has("CaneOfSomaria")))
                && items.has("KeyA2", 3)
                && this.boss_bottom.canBeat(items, locations);
        });

        this.locations.get("Ganon's Tower - Big Key Room - Right").setRequirements((locations, items) => {
            return ((items.has("Hammer") && items.has("Hookshot"))
                || (items.has("FireRod") && items.has("CaneOfSomaria")))
                && items.has("KeyA2", 3)
                && this.boss_bottom.canBeat(items, locations);
        });

        this.locations.get("Ganon's Tower - Mini Helmasaur Room - Left").setRequirements((locations, items) => {
            return items.canShootArrows(this.world) && items.canLightTorches()
                && items.has("BigKeyA2") && items.has("KeyA2", 3)
                && this.boss_middle.canBeat(items, locations);
        }).setFillRules((item, locations, items) => {
            return !__eq(item, Item.get("BigKeyA2", this.world));
        });

        this.locations.get("Ganon's Tower - Mini Helmasaur Room - Right").setRequirements((locations, items) => {
            return items.canShootArrows(this.world) && items.canLightTorches()
                && items.has("BigKeyA2") && items.has("KeyA2", 3)
                && this.boss_middle.canBeat(items, locations);
        }).setFillRules((item, locations, items) => {
            return !__eq(item, Item.get("BigKeyA2", this.world));
        });

        this.locations.get("Ganon's Tower - Pre-Moldorm Chest").setRequirements((locations, items) => {
            return items.canShootArrows(this.world) && items.canLightTorches()
                && items.has("BigKeyA2") && items.has("KeyA2", 3)
                && this.boss_middle.canBeat(items, locations);
        }).setFillRules((item, locations, items) => {
            return !__eq(item, Item.get("BigKeyA2", this.world));
        });

        this.locations.get("Ganon's Tower - Moldorm Chest").setRequirements((locations, items) => {
            return items.has("Hookshot")
                && items.canShootArrows(this.world) && items.canLightTorches()
                && items.has("BigKeyA2") && items.has("KeyA2", 4)
                && this.boss_middle.canBeat(items, locations)
                && this.boss_top.canBeat(items, locations);
        }).setFillRules((item, locations, items) => {
            return !__eq(item, Item.get("KeyA2", this.world)) && !__eq(item, Item.get("BigKeyA2", this.world));
        });

        this.can_complete = (locations, items) => {
            return this.canEnter(locations, items)
                && this.locations.get("Ganon's Tower - Moldorm Chest").canAccess(items)
                && this.boss.canBeat(items, locations);
        };

        this.prize_location.setRequirements(this.can_complete);

        this.can_enter = (locations, items) => {
            return items.has("RescueZelda")
                && (this.world.config("itemPlacement") !== "basic"
                    || ((this.world.config("mode.weapons") === "swordless" || items.hasSword(2)) && items.hasHealth(12) && (items.hasBottle(2) || items.hasArmor())))
                && (((items.has("MoonPearl") || (this.world.config("canOWYBA", false) && items.hasABottle()))
                    && ((((items.has("Crystal1")
                        + items.has("Crystal2")
                        + items.has("Crystal3")
                        + items.has("Crystal4")
                        + items.has("Crystal5")
                        + items.has("Crystal6")
                        + items.has("Crystal7")) >= this.world.config("crystals.tower", 7))
                        && this.world.getRegion("East Dark World Death Mountain").canEnter(locations, items))
                        || (((this.world.config("canBootsClip", false) && items.has("PegasusBoots"))
                            || (this.world.config("canSuperSpeed", false) && items.has("PegasusBoots")
                                && items.has("Hookshot")))
                            && this.world.getRegion("West Dark World Death Mountain").canEnter(locations, items))))
                    || (this.world.config("canOneFrameClipOW", false)
                        && (this.world.config("canDungeonRevive", false) || items.has("MoonPearl")
                            || (this.world.config("canOWYBA", false) && items.hasABottle()))));
        };

        return this;
    }
}
