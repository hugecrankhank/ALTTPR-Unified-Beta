// Converted from app/Region/Inverted/LightWorld/NorthWest.php (alttp_vt_randomizer, MIT)
import { NorthWest as Parent_Standard_LightWorld_NorthWest } from '../../Standard/LightWorld/NorthWest.js';
import { Item, Location, Region, Boss, Shop, LocationCollection, ShopCollection, ItemCollection } from '../../../core/index.js';

export class NorthWest extends Parent_Standard_LightWorld_NorthWest {

    
    initalize() {
        this.shops.get("Bush Covered House").setRequirements((locations, items) => {
            return items.has("MoonPearl")
                || (this.world.config("canBunnyRevive", false)
                    && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                    && items.hasABottle());
        });

        this.shops.get("Bomb Hut").setRequirements((locations, items) => {
            return items.has("MoonPearl")
                || (this.world.config("canBunnyRevive", false)
                    && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                    && items.hasABottle()) &&
                items.canBombThings();
        });

        // Bunny can pull pedestal
        this.locations.get("Master Sword Pedestal").setRequirements((locations, items) => {
            return items.has("PendantOfPower")
                && items.has("PendantOfWisdom")
                && items.has("PendantOfCourage");
        });

        this.locations.get("King's Tomb").setRequirements((locations, items) => {
            return items.has("PegasusBoots")
                && (items.has("MoonPearl")
                    || (this.world.config("canBunnyRevive", false)
                        && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                        && items.hasABottle())) && (items.canLiftDarkRocks()
                    || (this.world.config("canMirrorClip", false)
                        && items.has("MagicMirror")
                        && items.has("MoonPearl")
                        && (this.world.config("canBootsClip", false)
                            && items.has("PegasusBoots")) ||
                        this.world.config("canOneFrameClipOW", false)
                        || (this.world.getRegion("East Death Mountain").canEnter(locations, items)
                            && (this.world.config("canSuperSpeed", false)
                                && items.canSpinSpeed()
                                && (items.has("MoonPearl")
                                    || (this.world.config("canOWYBA", false)
                                        && items.hasABottle(2)))))));
        });

        this.locations.get("Kakariko Tavern").setRequirements((locations, items) => {
            return items.has("MoonPearl")
                || (this.world.config("canSuperBunny", false)
                    && (items.has("MagicMirror") || !this.world.config("cantTakeDamage", false))) 
                    || (this.world.config("canOWYBA", false)
                    && items.hasABottle()) || (this.world.config("canBunnyRevive", false)
                    && items.canBunnyRevive(this.world));
        });

        this.locations.get("Chicken House").setRequirements((locations, items) => {
            return items.has("MoonPearl")
                || (this.world.config("canOWYBA", false)
                    && items.hasABottle()) || (this.world.config("canBunnyRevive", false)
                    && items.canBunnyRevive(this.world));
        });

        this.locations.get("Kakariko Well - Top").setRequirements((locations, items) => {
            return items.canBombThings()
                && (items.has("MoonPearl")
                    || (this.world.config("canOWYBA", false)
                        && items.hasABottle()) || (this.world.config("canBunnyRevive", false)
                        && items.canBunnyRevive(this.world)));
        });

        this.locations.get("Kakariko Well - Left").setRequirements((locations, items) => {
            return items.has("MoonPearl")
                || this.world.config("canSuperBunny", false)
                || (this.world.config("canOWYBA", false)
                    && items.hasABottle()) || (this.world.config("canBunnyRevive", false)
                    && items.canBunnyRevive(this.world));
        });

        this.locations.get("Kakariko Well - Middle").setRequirements((locations, items) => {
            return items.has("MoonPearl")
                || this.world.config("canSuperBunny", false)
                || (this.world.config("canOWYBA", false)
                    && items.hasABottle()) || (this.world.config("canBunnyRevive", false)
                    && items.canBunnyRevive(this.world));
        });

        this.locations.get("Kakariko Well - Right").setRequirements((locations, items) => {
            return items.has("MoonPearl")
                || this.world.config("canSuperBunny", false)
                || (this.world.config("canOWYBA", false)
                    && items.hasABottle()) || (this.world.config("canBunnyRevive", false)
                    && items.canBunnyRevive(this.world));
        });

        this.locations.get("Kakariko Well - Bottom").setRequirements((locations, items) => {
            return items.has("MoonPearl")
                || this.world.config("canSuperBunny", false)
                || (this.world.config("canOWYBA", false)
                    && items.hasABottle()) || (this.world.config("canBunnyRevive", false)
                    && items.canBunnyRevive(this.world));
        });

        this.locations.get("Blind's Hideout - Top").setRequirements((locations, items) => {
            return items.canBombThings()
                && (items.has("MoonPearl")
                    || (this.world.config("canOWYBA", false)
                        && items.hasABottle()) || (this.world.config("canBunnyRevive", false)
                        && items.canBunnyRevive(this.world)));
        });

        this.locations.get("Blind's Hideout - Left").setRequirements((locations, items) => {
            return items.has("MoonPearl")
                || (this.world.config("canSuperBunny", false)
                    && items.has("MagicMirror")) || (this.world.config("canOWYBA", false)
                    && items.hasABottle()) || (this.world.config("canBunnyRevive", false)
                    && items.canBunnyRevive(this.world));
        });

        this.locations.get("Blind's Hideout - Right").setRequirements((locations, items) => {
            return items.has("MoonPearl")
                || (this.world.config("canSuperBunny", false)
                    && items.has("MagicMirror")) || (this.world.config("canOWYBA", false)
                    && items.hasABottle()) || (this.world.config("canBunnyRevive", false)
                    && items.canBunnyRevive(this.world));
        });

        this.locations.get("Blind's Hideout - Far Left").setRequirements((locations, items) => {
            return items.has("MoonPearl")
                || (this.world.config("canSuperBunny", false)
                    && items.has("MagicMirror")) || (this.world.config("canOWYBA", false)
                    && items.hasABottle()) || (this.world.config("canBunnyRevive", false)
                    && items.canBunnyRevive(this.world));
        });

        this.locations.get("Blind's Hideout - Far Right").setRequirements((locations, items) => {
            return items.has("MoonPearl")
                || (this.world.config("canSuperBunny", false)
                    && items.has("MagicMirror")) || (this.world.config("canOWYBA", false)
                    && items.hasABottle()) || (this.world.config("canBunnyRevive", false)
                    && items.canBunnyRevive(this.world));
        });

        this.locations.get("Pegasus Rocks").setRequirements((locations, items) => {
            return items.has("PegasusBoots")
                && (items.has("MoonPearl")
                    || (this.world.config("canOWYBA", false)
                        && items.hasABottle()) || (this.world.config("canBunnyRevive", false)
                        && items.canBunnyRevive(this.world)));
        });

        this.locations.get("Magic Bat").setRequirements((locations, items) => {
            return items.has("Powder")
                && (items.has("MoonPearl")
                    || (this.world.config("canOWYBA", false)
                        && items.hasABottle()) || (this.world.config("canBunnyRevive", false)
                        && items.canBunnyRevive(this.world))) && (items.has("Hammer")
                    || (
                        (this.world.config("canBootsClip", false)
                            && items.has("PegasusBoots")) ||
                        this.world.config("canOneFrameClipOW", false)) && (this.world.config("canFakeFlipper", false)
                        || items.has("Flippers")));
        });

        this.locations.get("Sick Kid").setRequirements((locations, items) => {
            return items.hasABottle();
        });

        this.locations.get("Lumberjack Tree").setRequirements((locations, items) => {
            return items.has("DefeatAgahnim")
                && (items.has("PegasusBoots")
                    && (items.has("MoonPearl")
                        || (this.world.config("canBunnyRevive", false)
                            && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                            && items.hasABottle())) ||
                    this.world.config("canOneFrameClipOW", false)
                    || (this.world.config("canMirrorWrap", false)
                        && items.has("MagicMirror")));
        });

        this.locations.get("Graveyard Ledge").setRequirements((locations, items) => {
            return (items.has("MoonPearl")
                || (this.world.config("canBunnyRevive", false)
                    && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                    && items.hasABottle())) &&
                items.canBombThings();
        });

        this.locations.get("Mushroom").setRequirements((locations, items) => {
            return items.has("MoonPearl")
                || (this.world.config("canBunnyRevive", false)
                    && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                    && items.hasABottle());
        });

        this.locations.get("Lost Woods Hideout").setRequirements((locations, items) => {
            return items.has("MoonPearl")
                || (this.world.config("canBunnyRevive", false)
                    && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                    && items.hasABottle());
        });

        this.can_enter = (locations, items) => {
            return this.world.getRegion("North East Light World").canEnter(locations, items);
        };

        return this;
    }
}
