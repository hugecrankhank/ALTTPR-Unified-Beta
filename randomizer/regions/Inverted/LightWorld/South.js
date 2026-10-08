// Converted from app/Region/Inverted/LightWorld/South.php (alttp_vt_randomizer, MIT)
import { South as Parent_Standard_LightWorld_South } from '../../Standard/LightWorld/South.js';
import { Item, Location, Region, Boss, Shop, LocationCollection, ShopCollection, ItemCollection } from '../../../core/index.js';

export class South extends Parent_Standard_LightWorld_South {

    
    constructor(world) {
        super(world);

        this.locations.removeItem("Link's House");
        this.locations.addItem(new Location.Prize.Event("Bomb Merchant", [], null, this));

        this.locations.get("Bomb Merchant").setItem(Item.get("BigRedBomb", world));
    }

    
    initalize() {
        this.shops.get("20 Rupee Cave").setRequirements((locations, items) => {
            return (items.has("MoonPearl")
                || (this.world.config("canBunnyRevive", false)
                    && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                    && items.hasABottle())) &&
                items.canLiftRocks();
        });

        this.shops.get("50 Rupee Cave").setRequirements((locations, items) => {
            return (items.has("MoonPearl")
                || (this.world.config("canBunnyRevive", false)
                    && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                    && items.hasABottle())) &&
                items.canLiftRocks();
        });

        this.shops.get("Bonk Fairy (Light)").setRequirements((locations, items) => {
            return (items.has("MoonPearl")
                || (this.world.config("canBunnyRevive", false)
                    && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                    && items.hasABottle())) &&
                items.has("PegasusBoots");
        });

        this.shops.get("Light Hype Fairy").setRequirements((locations, items) => {
            return (items.has("MoonPearl")
                || (this.world.config("canBunnyRevive", false)
                    && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                    && items.hasABottle())) &&
                items.canBombThings();
        });

        this.shops.get("Capacity Upgrade").setRequirements((locations, items) => {
            return (items.has("MoonPearl")
                || (this.world.config("canOWYBA", false)
                    && items.hasABottle())) && (
                (this.world.config("canFakeFlipper", false)
                    || items.has("Flippers")) || (this.world.config("canWaterWalk", false)
                    && items.has("PegasusBoots"))) || (this.world.config("canBunnyRevive", false)
                && items.canBunnyRevive(this.world));
        });

        this.locations.get("Floodgate Chest").setRequirements((locations, items) => {
            return (items.has("MoonPearl")
                || (this.world.config("canSuperBunny", false)
                    && items.has("MagicMirror")) || (this.world.config("canBunnyRevive", false)
                    && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                    && items.hasABottle()));
        });

        this.locations.get("Bomb Merchant").setRequirements((locations, items) => {
            return (items.has("MoonPearl")
                || this.world.config("canSuperBunny", false)) &&
                items.has("Crystal5") && items.has("Crystal6");
        });

        this.locations.get("Aginah's Cave").setRequirements((locations, items) => {
            return (items.has("MoonPearl")
                || (this.world.config("canOWYBA", false)
                    && items.hasABottle()) || (this.world.config("canBunnyRevive", false)
                    && items.canBunnyRevive(this.world))) &&
                items.canBombThings();
        });

        this.locations.get("Mini Moldorm Cave - Far Left").setRequirements((locations, items) => {
            return (items.has("MoonPearl")
                || (this.world.config("canBunnyRevive", false)
                    && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                    && items.hasABottle())) &&
                items.canBombThings() && items.canKillMostThings(this.world);
        });

        this.locations.get("Mini Moldorm Cave - Left").setRequirements((locations, items) => {
            return (items.has("MoonPearl")
                || (this.world.config("canBunnyRevive", false)
                    && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                    && items.hasABottle())) &&
                items.canBombThings() && items.canKillMostThings(this.world);
        });

        this.locations.get("Mini Moldorm Cave - Right").setRequirements((locations, items) => {
            return (items.has("MoonPearl")
                || (this.world.config("canBunnyRevive", false)
                    && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                    && items.hasABottle())) &&
                items.canBombThings() && items.canKillMostThings(this.world);
        });

        this.locations.get("Mini Moldorm Cave - Far Right").setRequirements((locations, items) => {
            return (items.has("MoonPearl")
                || (this.world.config("canBunnyRevive", false)
                    && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                    && items.hasABottle())) &&
                items.canBombThings() && items.canKillMostThings(this.world);
        });

        this.locations.get("Ice Rod Cave").setRequirements((locations, items) => {
            return ((items.has("MoonPearl")
                || (this.world.config("canBunnyRevive", false)
                    && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                    && items.hasABottle())) &&
                items.canBombThings()) || (items.has("BigRedBomb")
                && this.world.config("canSuperBunny", false)
                && items.has("MagicMirror"));
        });

        this.locations.get("Hobo").setRequirements((locations, items) => {
            return (items.has("MoonPearl")
                || (this.world.config("canBunnyRevive", false)
                    && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                    && items.hasABottle())) && (
                (this.world.config("canFakeFlipper", false)
                    || items.has("Flippers")) || (this.world.config("canWaterWalk", false)
                    && items.has("PegasusBoots")));
        });

        this.locations.get("Bombos Tablet").setRequirements((locations, items) => {
            return items.has("BookOfMudora")
                && (items.hasSword(2)
                    || (this.world.config("mode.weapons") == "swordless"
                        && items.has("Hammer")));
        });

        this.locations.get("Cave 45").setRequirements((locations, items) => {
            return items.has("MoonPearl")
                || (this.world.config("canSuperBunny", false)
                    && items.has("MagicMirror")) || (this.world.config("canOWYBA", false)
                    && items.hasABottle()) || (this.world.config("canBunnyRevive", false)
                    && items.canBunnyRevive(this.world));
        });

        this.locations.get("Checkerboard Cave").setRequirements((locations, items) => {
            return (items.has("MoonPearl")
                || (this.world.config("canBunnyRevive", false)
                    && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                    && items.hasABottle()))
                && items.canLiftRocks();
        });

        this.locations.get("Mini Moldorm Cave - NPC").setRequirements((locations, items) => {
            return (items.has("MoonPearl")
                || (this.world.config("canBunnyRevive", false)
                    && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                    && items.hasABottle())) &&
                items.canBombThings() && items.canKillMostThings(this.world);
        });

        this.locations.get("Library").setRequirements((locations, items) => {
            return (items.has("MoonPearl")
                || (this.world.config("canBunnyRevive", false)
                    && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                    && items.hasABottle()) || (this.world.config("canSuperBunny", false)
                    && items.has("MagicMirror"))) 
                && items.has("PegasusBoots");
        });

        this.locations.get("Maze Race").setRequirements((locations, items) => {
            return (items.has("MoonPearl")
                && (items.has("PegasusBoots")
                    || items.canBombThings())) ||
                this.world.config("canOneFrameClipOW", false);
        });

        this.locations.get("Desert Ledge").setRequirements((locations, items) => {
            return ((items.has("MoonPearl")
                || this.world.config("canDungeonRevive", false) || (this.world.config("canSuperBunny", false)
                    && items.has("MagicMirror")) || (this.world.config("canOWYBA", false)
                    && items.hasABottle())) && this.world.getRegion("Desert Palace").canEnter(locations, items))
                ||
                this.world.config("canOneFrameClipOW", false)
                || (this.world.config("canBootsClip", false)
                    && items.has("PegasusBoots"));
        });

        this.locations.get("Lake Hylia Island").setRequirements((locations, items) => {
            return ((items.has("MoonPearl")
                || (this.world.config("canBunnyRevive", false)
                    && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                    && items.hasABottle())) && (items.has("Flippers")
                    || (this.world.config("canBootsClip", false)
                        && items.has("PegasusBoots")) || (this.world.config("canSuperSpeed", false)
                        && items.canSpinSpeed()))) 
                || this.world.config("canOneFrameClipOW", false);
        });

        this.locations.get("Sunken Treasure").setRequirements((locations, items) => {
            return items.has("MoonPearl")
                || (this.world.config("canSuperBunny", false)
                    && items.has("MagicMirror")) || (this.world.config("canBunnyRevive", false)
                    && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                    && items.hasABottle());
        });

        this.locations.get("Flute Spot").setRequirements((locations, items) => {
            return (items.has("MoonPearl")
                || (this.world.config("canOWYBA", false)
                    && items.hasABottle()) || (this.world.config("canBunnyRevive", false)
                    && items.canBunnyRevive(this.world))) && items.has("Shovel");
        });

        this.can_enter = (locations, items) => {
            return this.world.getRegion("North East Light World").canEnter(locations, items);
        };

        return this;
    }
}
