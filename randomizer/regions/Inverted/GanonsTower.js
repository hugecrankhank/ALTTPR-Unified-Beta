// Converted from app/Region/Inverted/GanonsTower.php (alttp_vt_randomizer, MIT)
import { GanonsTower as Parent_Standard_GanonsTower } from '../Standard/GanonsTower.js';
import { Item, Location, Region, Boss, Shop, LocationCollection, ShopCollection, ItemCollection, in_array, __eq } from '../../core/index.js';

export class GanonsTower extends Parent_Standard_GanonsTower {

    
    initalize() {
        super.initalize();

        this.locations.get("Ganon's Tower - DMs Room - Top Left").setRequirements((locations, items) => {
            return items.has("Hammer")
                && items.has("Hookshot")
                && (items.has("MoonPearl") || this.world.config("canDungeonRevive", false)
                    || (
                        (this.world.config("canOneFrameClipOW", false)
                            || (this.world.config("canBootsClip", false)
                                && items.has("PegasusBoots"))) && (
                            (this.world.config("canBunnyRevive", false)
                                && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                                && items.hasABottle()))));
        });

        this.locations.get("Ganon's Tower - DMs Room - Top Right").setRequirements((locations, items) => {
            return items.has("Hammer")
                && items.has("Hookshot")
                && (items.has("MoonPearl") || this.world.config("canDungeonRevive", false)
                    || (
                        (this.world.config("canOneFrameClipOW", false)
                            || (this.world.config("canBootsClip", false)
                                && items.has("PegasusBoots"))) && (
                            (this.world.config("canBunnyRevive", false)
                                && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                                && items.hasABottle()))));
        });

        this.locations.get("Ganon's Tower - DMs Room - Bottom Left").setRequirements((locations, items) => {
            return items.has("Hammer")
                && items.has("Hookshot")
                && (items.has("MoonPearl") || this.world.config("canDungeonRevive", false)
                    || (
                        (this.world.config("canOneFrameClipOW", false)
                            || (this.world.config("canBootsClip", false)
                                && items.has("PegasusBoots"))) && (
                            (this.world.config("canBunnyRevive", false)
                                && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                                && items.hasABottle()))));
        });

        this.locations.get("Ganon's Tower - DMs Room - Bottom Right").setRequirements((locations, items) => {
            return items.has("Hammer")
                && items.has("Hookshot")
                && (items.has("MoonPearl") || this.world.config("canDungeonRevive", false)
                    || (
                        (this.world.config("canOneFrameClipOW", false)
                            || (this.world.config("canBootsClip", false)
                                && items.has("PegasusBoots"))) && (
                            (this.world.config("canBunnyRevive", false)
                                && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                                && items.hasABottle()))));
        });

        this.locations.get("Ganon's Tower - Randomizer Room - Top Left").setRequirements((locations, items) => {
            return items.has("Hammer")
                && items.has("Hookshot")
                && (
                    (locations.itemInLocations(Item.get("BigKeyA2", this.world), [
                        "Ganon's Tower - Randomizer Room - Top Right",
                        "Ganon's Tower - Randomizer Room - Bottom Left",
                        "Ganon's Tower - Randomizer Room - Bottom Right",
                    ])
                        && items.has("KeyA2", 3)) ||
                    items.has("KeyA2", 4)) && (items.has("MoonPearl")
                    || this.world.config("canDungeonRevive", false)
                    || (
                        (this.world.config("canOneFrameClipOW", false)
                            || (this.world.config("canBootsClip", false)
                                && items.has("PegasusBoots"))) && (
                            (this.world.config("canBunnyRevive", false)
                                && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                                && items.hasABottle()))));
        });

        this.locations.get("Ganon's Tower - Randomizer Room - Top Right").setRequirements((locations, items) => {
            return items.has("Hammer")
                && items.has("Hookshot")
                && (
                    (locations.itemInLocations(Item.get("BigKeyA2", this.world), [
                        "Ganon's Tower - Randomizer Room - Top Left",
                        "Ganon's Tower - Randomizer Room - Bottom Left",
                        "Ganon's Tower - Randomizer Room - Bottom Right",
                    ])
                        && items.has("KeyA2", 3)) ||
                    items.has("KeyA2", 4)) && (items.has("MoonPearl")
                    || this.world.config("canDungeonRevive", false)
                    || (
                        (this.world.config("canOneFrameClipOW", false)
                            || (this.world.config("canBootsClip", false)
                                && items.has("PegasusBoots"))) && (
                            (this.world.config("canBunnyRevive", false)
                                && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                                && items.hasABottle()))));
        });

        this.locations.get("Ganon's Tower - Randomizer Room - Bottom Left").setRequirements((locations, items) => {
            return items.has("Hammer")
                && items.has("Hookshot")
                && (
                    (locations.itemInLocations(Item.get("BigKeyA2", this.world), [
                        "Ganon's Tower - Randomizer Room - Top Right",
                        "Ganon's Tower - Randomizer Room - Top Left",
                        "Ganon's Tower - Randomizer Room - Bottom Right",
                    ])
                        && items.has("KeyA2", 3)) ||
                    items.has("KeyA2", 4)) && (items.has("MoonPearl")
                    || this.world.config("canDungeonRevive", false)
                    || (
                        (this.world.config("canOneFrameClipOW", false)
                            || (this.world.config("canBootsClip", false)
                                && items.has("PegasusBoots"))) && (
                            (this.world.config("canBunnyRevive", false)
                                && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                                && items.hasABottle()))));
        });

        this.locations.get("Ganon's Tower - Randomizer Room - Bottom Right").setRequirements((locations, items) => {
            return items.has("Hammer")
                && items.has("Hookshot")
                && (
                    (locations.itemInLocations(Item.get("BigKeyA2", this.world), [
                        "Ganon's Tower - Randomizer Room - Top Right",
                        "Ganon's Tower - Randomizer Room - Top Left",
                        "Ganon's Tower - Randomizer Room - Bottom Left",
                    ])
                        && items.has("KeyA2", 3)) ||
                    items.has("KeyA2", 4)) && (items.has("MoonPearl")
                    || this.world.config("canDungeonRevive", false)
                    || (
                        (this.world.config("canOneFrameClipOW", false)
                            || (this.world.config("canBootsClip", false)
                                && items.has("PegasusBoots"))) && (
                            (this.world.config("canBunnyRevive", false)
                                && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                                && items.hasABottle()))));
        });

        this.locations.get("Ganon's Tower - Firesnake Room").setRequirements((locations, items) => {
            return items.has("Hammer")
                && items.has("Hookshot")
                && (
                    ((locations.itemInLocations(Item.get("BigKeyA2", this.world), [
                        "Ganon's Tower - Randomizer Room - Top Right",
                        "Ganon's Tower - Randomizer Room - Top Left",
                        "Ganon's Tower - Randomizer Room - Bottom Left",
                        "Ganon's Tower - Randomizer Room - Bottom Right",
                    ])
                        ||
                        locations.get("Ganon's Tower - Firesnake Room").hasItem(Item.get("KeyA2", this.world))) &&
                        items.has("KeyA2", 2)) || items.has("KeyA2", 3)) && (items.has("MoonPearl")
                        || this.world.config("canDungeonRevive", false)
                    || (
                        (this.world.config("canOneFrameClipOW", false)
                            || (this.world.config("canBootsClip", false)
                                && items.has("PegasusBoots"))) && (
                            (this.world.config("canBunnyRevive", false)
                                && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                                && items.hasABottle()))));
        });

        this.locations.get("Ganon's Tower - Map Chest").setRequirements((locations, items) => {
            return items.has("Hammer")
                && (items.has("Hookshot")
                    || (this.world.config("itemPlacement") !== "basic"
                        && items.has("PegasusBoots"))) && (in_array(
                    locations.get("Ganon's Tower - Map Chest").getItem(),
                    [
                        Item.get("BigKeyA2", this.world),
                        Item.get("KeyA2", this.world)
                    ]
                )
                    ? items.has("KeyA2", 3) : items.has("KeyA2", 4)) && (items.has("MoonPearl")
                    || this.world.config("canDungeonRevive", false)
                    || (
                        (this.world.config("canOneFrameClipOW", false)
                            || (this.world.config("canBootsClip", false)
                                && items.has("PegasusBoots"))) && (
                            (this.world.config("canBunnyRevive", false)
                                && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                                && items.hasABottle()))));
        }).setAlwaysAllow((item, items) => {
            return this.world.config("accessibility") !== "locations"
                && __eq(item, Item.get("KeyA2", this.world))
                && items.has("KeyA2", 3);
        }).setFillRules((item, locations, items) => {
            return this.world.config("accessibility") !== "locations"
                || !__eq(item, Item.get("KeyA2", this.world));
        });

        this.locations.get("Ganon's Tower - Big Chest").setRequirements((locations, items) => {
            return items.has("BigKeyA2")
                && items.has("KeyA2", 3)
                && (
                    (items.has("Hammer")
                        && items.has("Hookshot")) || (items.has("FireRod")
                        && items.has("CaneOfSomaria"))) && (items.has("MoonPearl")
                    || this.world.config("canDungeonRevive", false)
                    || (
                        (this.world.config("canOneFrameClipOW", false)
                            || (this.world.config("canBootsClip", false)
                                && items.has("PegasusBoots"))) && (
                            (this.world.config("canBunnyRevive", false)
                                && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                                && items.hasABottle()))));
        }).setFillRules((item, locations, items) => {
            return !__eq(item, Item.get("BigKeyA2", this.world));
        });

        this.locations.get("Ganon's Tower - Bob's Chest").setRequirements((locations, items) => {
            return ((items.has("Hammer")
                && items.has("Hookshot")) || (items.has("FireRod")
                && items.has("CaneOfSomaria"))) && items.has("KeyA2", 3)
                && (items.has("MoonPearl") || this.world.config("canDungeonRevive", false)
                    || (
                        (this.world.config("canOneFrameClipOW", false)
                            || (this.world.config("canBootsClip", false)
                                && items.has("PegasusBoots"))) && (
                            (this.world.config("canBunnyRevive", false)
                                && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                                && items.hasABottle()))));
        });

        this.locations.get("Ganon's Tower - Tile Room").setRequirements((locations, items) => {
            return items.has("CaneOfSomaria")
                && (items.has("MoonPearl") || this.world.config("canDungeonRevive", false)
                    || (
                        (this.world.config("canOneFrameClipOW", false)
                            || (this.world.config("canBootsClip", false)
                                && items.has("PegasusBoots"))) && (
                            (this.world.config("canBunnyRevive", false)
                                && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                                && items.hasABottle()))));
        });

        this.locations.get("Ganon's Tower - Compass Room - Top Left").setRequirements((locations, items) => {
            return items.has("FireRod")
                && items.has("CaneOfSomaria")
                && (
                    (locations.itemInLocations(Item.get("BigKeyA2", this.world), [
                        "Ganon's Tower - Compass Room - Top Right",
                        "Ganon's Tower - Compass Room - Bottom Left",
                        "Ganon's Tower - Compass Room - Bottom Right",
                    ])
                        && items.has("KeyA2", 3)) ||
                    items.has("KeyA2", 4)) && (items.has("MoonPearl")
                        || this.world.config("canDungeonRevive", false)
                    || (
                        (this.world.config("canOneFrameClipOW", false)
                            || (this.world.config("canBootsClip", false)
                                && items.has("PegasusBoots"))) && (
                            (this.world.config("canBunnyRevive", false)
                                && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                                && items.hasABottle()))));
        });

        this.locations.get("Ganon's Tower - Compass Room - Top Right").setRequirements((locations, items) => {
            return items.has("FireRod")
                && items.has("CaneOfSomaria")
                && (
                    (locations.itemInLocations(Item.get("BigKeyA2", this.world), [
                        "Ganon's Tower - Compass Room - Top Left",
                        "Ganon's Tower - Compass Room - Bottom Left",
                        "Ganon's Tower - Compass Room - Bottom Right",
                    ])
                        && items.has("KeyA2", 3)) ||
                    items.has("KeyA2", 4)) && (items.has("MoonPearl")
                        || this.world.config("canDungeonRevive", false)
                    || (
                        (this.world.config("canOneFrameClipOW", false)
                            || (this.world.config("canBootsClip", false)
                                && items.has("PegasusBoots"))) && (
                            (this.world.config("canBunnyRevive", false)
                                && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                                && items.hasABottle()))));
        });

        this.locations.get("Ganon's Tower - Compass Room - Bottom Left").setRequirements((locations, items) => {
            return items.has("FireRod")
                && items.has("CaneOfSomaria")
                && (
                    (locations.itemInLocations(Item.get("BigKeyA2", this.world), [
                        "Ganon's Tower - Compass Room - Top Right",
                        "Ganon's Tower - Compass Room - Top Left",
                        "Ganon's Tower - Compass Room - Bottom Right",
                    ]) && items.has("KeyA2", 3)) || items.has("KeyA2", 4)) && (items.has("MoonPearl")
                        || this.world.config("canDungeonRevive", false)
                    || (
                        (this.world.config("canOneFrameClipOW", false)
                            || (this.world.config("canBootsClip", false)
                                && items.has("PegasusBoots"))) && (
                            (this.world.config("canBunnyRevive", false)
                                && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                                && items.hasABottle()))));
        });

        this.locations.get("Ganon's Tower - Compass Room - Bottom Right").setRequirements((locations, items) => {
            return items.has("FireRod")
                && items.has("CaneOfSomaria")
                && (
                    (locations.itemInLocations(Item.get("BigKeyA2", this.world), [
                        "Ganon's Tower - Compass Room - Top Right",
                        "Ganon's Tower - Compass Room - Top Left",
                        "Ganon's Tower - Compass Room - Bottom Left",
                    ]) && items.has("KeyA2", 3)) ||
                    items.has("KeyA2", 4)) && (items.has("MoonPearl")
                        || this.world.config("canDungeonRevive", false)
                    || (
                        (this.world.config("canOneFrameClipOW", false)
                            || (this.world.config("canBootsClip", false)
                                && items.has("PegasusBoots"))) && (
                            (this.world.config("canBunnyRevive", false)
                                && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                                && items.hasABottle()))));
        });

        this.locations.get("Ganon's Tower - Big Key Chest").setRequirements((locations, items) => {
            return ((items.has("Hammer")
                && items.has("Hookshot")) || (items.has("FireRod")
                && items.has("CaneOfSomaria"))) && items.has("KeyA2", 3)
                && this.boss_bottom.canBeat(items, locations)
                && (items.has("MoonPearl")
                    || this.world.config("canDungeonRevive", false)
                    || (
                        (this.world.config("canOneFrameClipOW", false)
                            || (this.world.config("canBootsClip", false)
                                && items.has("PegasusBoots"))) && (
                            (this.world.config("canBunnyRevive", false)
                                && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                                && items.hasABottle()))));
        });

        this.locations.get("Ganon's Tower - Big Key Room - Left").setRequirements((locations, items) => {
            return ((items.has("Hammer")
                && items.has("Hookshot")) || (items.has("FireRod")
                && items.has("CaneOfSomaria"))) && items.has("KeyA2", 3)
                && this.boss_bottom.canBeat(items, locations)
                && (items.has("MoonPearl") || this.world.config("canDungeonRevive", false)
                    || (
                        (this.world.config("canOneFrameClipOW", false)
                            || (this.world.config("canBootsClip", false)
                                && items.has("PegasusBoots"))) && (
                            (this.world.config("canBunnyRevive", false)
                                && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                                && items.hasABottle()))));
        });

        this.locations.get("Ganon's Tower - Big Key Room - Right").setRequirements((locations, items) => {
            return ((items.has("Hammer")
                && items.has("Hookshot")) || (items.has("FireRod")
                && items.has("CaneOfSomaria"))) && items.has("KeyA2", 3)
                && this.boss_bottom.canBeat(items, locations)
                && (items.has("MoonPearl") || this.world.config("canDungeonRevive", false)
                    || (
                        (this.world.config("canOneFrameClipOW", false)
                            || (this.world.config("canBootsClip", false)
                                && items.has("PegasusBoots"))) && (
                            (this.world.config("canBunnyRevive", false)
                                && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                                && items.hasABottle()))));
        });

        this.locations.get("Ganon's Tower - Mini Helmasaur Room - Left").setRequirements((locations, items) => {
            return items.canShootArrows(this.world)
                && items.canLightTorches()
                && items.has("BigKeyA2")
                && items.has("KeyA2", 3)
                && this.boss_middle.canBeat(items, locations)
                && (items.has("MoonPearl") || this.world.config("canDungeonRevive", false)
                    || (
                        (this.world.config("canOneFrameClipOW", false)
                            || (this.world.config("canBootsClip", false)
                                && items.has("PegasusBoots"))) && (
                            (this.world.config("canBunnyRevive", false)
                                && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                                && items.hasABottle()))));
        }).setFillRules((item, locations, items) => {
            return !__eq(item, Item.get("BigKeyA2", this.world));
        });

        this.locations.get("Ganon's Tower - Mini Helmasaur Room - Right").setRequirements((locations, items) => {
            return items.canShootArrows(this.world)
                && items.canLightTorches()
                && items.has("BigKeyA2")
                && items.has("KeyA2", 3)
                && this.boss_middle.canBeat(items, locations)
                && (items.has("MoonPearl") || this.world.config("canDungeonRevive", false)
                    || (
                        (this.world.config("canOneFrameClipOW", false)
                            || (this.world.config("canBootsClip", false)
                                && items.has("PegasusBoots"))) && (
                            (this.world.config("canBunnyRevive", false)
                                && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                                && items.hasABottle()))));
        }).setFillRules((item, locations, items) => {
            return !__eq(item, Item.get("BigKeyA2", this.world));
        });

        this.locations.get("Ganon's Tower - Pre-Moldorm Chest").setRequirements((locations, items) => {
            return items.canShootArrows(this.world)
                && items.canLightTorches()
                && items.has("BigKeyA2")
                && items.has("KeyA2", 3)
                && this.boss_middle.canBeat(items, locations)
                && (items.has("MoonPearl") || this.world.config("canDungeonRevive", false)
                    || (
                        (this.world.config("canOneFrameClipOW", false)
                            || (this.world.config("canBootsClip", false)
                                && items.has("PegasusBoots"))) && (
                            (this.world.config("canBunnyRevive", false)
                                && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                                && items.hasABottle()))));
        }).setFillRules((item, locations, items) => {
            return !__eq(item, Item.get("BigKeyA2", this.world));
        });

        this.locations.get("Ganon's Tower - Moldorm Chest").setRequirements((locations, items) => {
            return items.has("Hookshot")
                && items.canShootArrows(this.world)
                && items.canLightTorches()
                && items.has("BigKeyA2")
                && items.has("KeyA2", 4)
                && this.boss_middle.canBeat(items, locations)
                && this.boss_top.canBeat(items, locations)
                && (items.has("MoonPearl") || this.world.config("canDungeonRevive", false)
                    || (
                        (this.world.config("canOneFrameClipOW", false)
                            || (this.world.config("canBootsClip", false)
                                && items.has("PegasusBoots"))) && (
                            (this.world.config("canBunnyRevive", false)
                                && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                                && items.hasABottle()))));
        }).setFillRules((item, locations, items) => {
            return !__eq(item, Item.get("KeyA2", this.world))
                && !__eq(item, Item.get("BigKeyA2", this.world));
        });

        this.can_complete = (locations, items) => {
            return this.canEnter(locations, items)
                && this.locations.get("Ganon's Tower - Moldorm Chest").canAccess(items)
                && this.boss.canBeat(items, locations);
        };

        this.prize_location.setRequirements(this.can_complete);

        this.can_enter = (locations, items) => {
            return (this.world.config("itemPlacement") !== "basic"
                || (
                    (this.world.config("mode.weapons") === "swordless"
                        || items.hasSword(2))
                    && items.hasHealth(12)
                    && (items.hasBottle(2)
                        || items.hasArmor()))) && (this.world.config("canDungeonRevive", false)
                || (this.world.config("canSuperBunny", false)
                    && items.has("MagicMirror")) ||
                items.has("MoonPearl")
                || (
                    (this.world.config("canOneFrameClipOW", false)
                        || (this.world.config("canBootsClip", false)
                            && items.has("PegasusBoots"))) && (
                        (this.world.config("canBunnyRevive", false)
                            && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                            && items.hasABottle())))) && (items.has("Crystal1")
                + items.has("Crystal2")
                + items.has("Crystal3")
                + items.has("Crystal4")
                + items.has("Crystal5")
                + items.has("Crystal6")
                + items.has("Crystal7"))    >= this.world.config("crystals.tower", 7)
                && this.world.getRegion("North East Light World").canEnter(locations, items);
        };

        return this;
    }
}
