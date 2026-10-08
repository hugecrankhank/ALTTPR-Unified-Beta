// Converted from app/Region/Inverted/HyruleCastleEscape.php (alttp_vt_randomizer, MIT)
import { HyruleCastleEscape as Parent_Open_HyruleCastleEscape } from '../Open/HyruleCastleEscape.js';
import { Item, Location, Region, Boss, Shop, LocationCollection, ShopCollection, ItemCollection } from '../../core/index.js';

export class HyruleCastleEscape extends Parent_Open_HyruleCastleEscape {

    
    initalize() {
        super.initalize();
        
        this.locations.get("Sewers - Secret Room - Left").setRequirements((locations, items) => {
            return (items.canLiftRocks() && (items.has("MoonPearl")
                || (this.world.config("canBunnyRevive", false) && items.canBunnyRevive(this.world))
                || (this.world.config("canOWYBA", false) && items.hasABottle())))
                || (items.has("Lamp", this.world.config("item.require.Lamp", 1)) && items.has("KeyH2")
                && (this.world.config("canDungeonRevive", false) || items.hasSword()
                    || (this.world.config("canBunnyRevive", false) && items.canBunnyRevive(this.world))
                    || (this.world.config("canOWYBA", false) && items.hasABottle())
                    || items.has("MoonPearl")));
        });

        this.locations.get("Sewers - Secret Room - Middle").setRequirements((locations, items) => {
            return (items.canLiftRocks() && (items.has("MoonPearl")
                || (this.world.config("canBunnyRevive", false) && items.canBunnyRevive(this.world))
                || (this.world.config("canOWYBA", false) && items.hasABottle())))
                || (items.has("Lamp", this.world.config("item.require.Lamp", 1)) && items.has("KeyH2")
                && (this.world.config("canDungeonRevive", false) || items.hasSword()
                    || (this.world.config("canBunnyRevive", false) && items.canBunnyRevive(this.world))
                    || (this.world.config("canOWYBA", false) && items.hasABottle())
                    || items.has("MoonPearl")));
        });

        this.locations.get("Sewers - Secret Room - Right").setRequirements((locations, items) => {
            return (items.canLiftRocks() && (items.has("MoonPearl")
                || (this.world.config("canBunnyRevive", false) && items.canBunnyRevive(this.world))
                || (this.world.config("canOWYBA", false) && items.hasABottle())))
                || (items.has("Lamp", this.world.config("item.require.Lamp", 1)) && items.has("KeyH2")
                && (this.world.config("canDungeonRevive", false) || items.hasSword()
                    || (this.world.config("canBunnyRevive", false) && items.canBunnyRevive(this.world))
                    || (this.world.config("canOWYBA", false) && items.hasABottle())
                    || items.has("MoonPearl")));
        });

        this.locations.get("Hyrule Castle - Boomerang Chest").setRequirements((locations, items) => {
            return items.has("KeyH2") && (this.world.config("canDungeonRevive", false) || items.hasSword()
                || (this.world.config("canBunnyRevive", false) && items.canBunnyRevive(this.world))
                || (this.world.config("canOWYBA", false) && items.hasABottle())
                || items.has("MoonPearl"));
        });

        this.locations.get("Hyrule Castle - Zelda's Cell").setRequirements((locations, items) => {
            return items.has("KeyH2") && (this.world.config("canDungeonRevive", false) || items.hasSword()
                || (this.world.config("canBunnyRevive", false) && items.canBunnyRevive(this.world))
                || (this.world.config("canOWYBA", false) && items.hasABottle())
                || items.has("MoonPearl"));
        });

        this.locations.get("Sanctuary").setRequirements((locations, items) => {
            return (items.has("KeyH2") && items.has("Lamp", this.world.config("item.require.Lamp", 1)))
                || ((items.has("MoonPearl")
                    || (this.world.config("canSuperBunny", false)
                        && items.has("MagicMirror"))
                    || (this.world.config("canOWYBA", false)
                        && items.hasABottle())
                    || (this.world.config("canBunnyRevive", false)
                        && items.canBunnyRevive(this.world)))
                    && this.world.getRegion("North West Light World").canEnter(locations, items));
        });

        this.locations.get("Secret Passage").setRequirements((locations, items) => {
            return (
                (this.world.config("canMirrorClip", false)
                    && this.world.config("canSuperBunny", false)
                    && items.has("MagicMirror")
                    && (
                        (this.world.config("canBootsClip", false)
                            && items.has("PegasusBoot")) || (this.world.config("canSuperSpeed", false)
                            && items.canSpinSpeed()) ||
                        this.world.config("canOneFrameClipOW", false)) &&
                    this.world.getRegion("West Death Mountain").canEnter(locations, items)) || (this.world.config("canBunnyRevive", false)
                    && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                    && items.hasABottle()) ||
                items.has("MoonPearl")) &&
                this.world.getRegion("North East Light World").canEnter(locations, items);
        }).setFillRules((item, locations, items) => {
            return !((!this.world.config("region.wildKeys", false) && item instanceof Item.Key)
                || (!this.world.config("region.wildBigKeys", false) && item instanceof Item.BigKey)
                || (!this.world.config("region.wildMaps", false) && item instanceof Item.Map)
                || (!this.world.config("region.wildCompasses", false) && item instanceof Item.Compass));
        });

        this.locations.get("Link's Uncle").setRequirements((locations, items) => {
            return (
                (this.world.config("canMirrorClip", false)
                    && items.has("MagicMirror")
                    && (
                        (this.world.config("canBootsClip", false)
                            && items.has("PegasusBoot")) || (this.world.config("canSuperSpeed", false)
                            && items.canSpinSpeed()) ||
                        this.world.config("canOneFrameClipOW", false)) &&
                    this.world.getRegion("West Death Mountain").canEnter(locations, items)) || (this.world.config("canBunnyRevive", false)
                    && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                    && items.hasABottle()) ||
                items.has("MoonPearl")) &&
                this.world.getRegion("North East Light World").canEnter(locations, items);
        }).setFillRules((item, locations, items) => {
            return this.locations.get("Sanctuary").canAccess(this.world.collectItems())
                && !((!this.world.config("region.wildKeys", false) && item instanceof Item.Key)
                    || (!this.world.config("region.wildBigKeys", false) && item instanceof Item.BigKey)
                    || (!this.world.config("region.wildMaps", false) && item instanceof Item.Map)
                    || (!this.world.config("region.wildCompasses", false) && item instanceof Item.Compass));
        });

        this.can_enter = (locations, items) => {
            return (this.world.config("canDungeonRevive", false)
                || (this.world.config("canSuperBunny", false)
                    && items.has("MagicMirror")) || (this.world.config("canBunnyRevive", false)
                    && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                    && items.hasABottle()) ||
                items.has("MoonPearl")) &&
                this.world.getRegion("North East Light World").canEnter(locations, items);
        };

        return this;
    }
}
