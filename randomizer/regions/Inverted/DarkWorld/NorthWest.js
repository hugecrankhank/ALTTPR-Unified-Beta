// Converted from app/Region/Inverted/DarkWorld/NorthWest.php (alttp_vt_randomizer, MIT)
import { NorthWest as Parent_Standard_DarkWorld_NorthWest } from '../../Standard/DarkWorld/NorthWest.js';
import { Item, Location, Region, Boss, Shop, LocationCollection, ShopCollection, ItemCollection } from '../../../core/index.js';

export class NorthWest extends Parent_Standard_DarkWorld_NorthWest {

    
    initalize() {
        this.shops.get("Dark World Outcasts Shop").setRequirements((locations, items) => {
            return items.has("Hammer");
        });

        this.locations.get("Brewery").setRequirements((locations, items) => {
            return items.canBombThings();
        });

        this.locations.get("Hammer Pegs").setRequirements((locations, items) => {
            return items.has("Hammer")
                && (items.canLiftDarkRocks()
                    || (items.has("MagicMirror")
                        && this.world.getRegion("North West Light World").canEnter(locations, items))
                    || (this.world.config("canBootsClip", false)
                        && items.has("PegasusBoots")) || (
                        ((this.world.config("canFakeFlipper", false)
                            || items.has("Flippers"))
                            && ((this.world.config("canSuperSpeed", false)
                                && items.canSpinSpeed())
                                || this.world.config("canOneFrameClipOW", false)))));
        });

        this.locations.get("Bumper Cave").setRequirements((locations, items) => {
            return (items.canLiftRocks()
                && items.has("Cape")
                && items.has("MoonPearl")
                && items.has("MagicMirror")
                && this.world.getRegion("North West Light World").canEnter(locations, items))
                || (this.world.config("canBootsClip", false)
                    && items.has("PegasusBoots"))
                || this.world.config("canOneFrameClipOW", false);
        });

        this.locations.get("Blacksmith").setRequirements((locations, items) => {
            return (items.canLiftDarkRocks()
                || (items.has("MagicMirror")
                || (
                    (this.world.config("canOWYBA", false)
                        && items.hasABottle()) && (this.world.config("canOneFrameClipOW", false)
                        || (this.world.config("canBootsClip", false)
                            && items.has("PegasusBoots"))))))
                && this.world.getRegion("North West Light World").canEnter(locations, items);
        });

        this.locations.get("Purple Chest").setRequirements((locations, items) => {
            return (items.canLiftDarkRocks()
                || (items.has("MagicMirror")
                || ((this.world.config("canOWYBA", false)
                    && items.hasABottle())
                    && ((this.world.config("canFakeFlipper", false)
                        || items.has("Flippers"))
                        && ((this.world.config("canBootsClip", false)
                            && items.has("PegasusBoots"))
                            || this.world.config("canOneFrameClipOW", false))))
                && this.world.getRegion("North West Light World").canEnter(locations, items)))
                && this.world.getRegion("South Light World").canEnter(locations, items);
        });

        return this;
    }
}
