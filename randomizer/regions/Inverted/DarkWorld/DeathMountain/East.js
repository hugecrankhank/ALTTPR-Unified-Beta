// Converted from app/Region/Inverted/DarkWorld/DeathMountain/East.php (alttp_vt_randomizer, MIT)
import { East as Parent_Standard_DarkWorld_DeathMountain_East } from '../../../Standard/DarkWorld/DeathMountain/East.js';
import { Item, Location, Region, Boss, Shop, LocationCollection, ShopCollection, ItemCollection } from '../../../../core/index.js';

export class East extends Parent_Standard_DarkWorld_DeathMountain_East {

    
    initalize() {
        this.locations.get("Hookshot Cave - Top Right").setRequirements((locations, items) => {
            return items.has("Hookshot")
                && (items.canLiftRocks()
                    || (items.has("MagicMirror")
                        && items.canBombThings()
                        && this.world.getRegion("East Death Mountain").canEnter(locations, items)) || (this.world.config("canBootsClip", false)
                        && items.has("PegasusBoots")) ||
                    this.world.config("canOneFrameClipOW", false));
        });

        this.locations.get("Hookshot Cave - Top Left").setRequirements((locations, items) => {
            return items.has("Hookshot")
                && (items.canLiftRocks()
                    || (items.has("MagicMirror")
                        && items.canBombThings()
                        && this.world.getRegion("East Death Mountain").canEnter(locations, items)) || (this.world.config("canBootsClip", false)
                        && items.has("PegasusBoots")) ||
                    this.world.config("canOneFrameClipOW", false));
        });

        this.locations.get("Hookshot Cave - Bottom Left").setRequirements((locations, items) => {
            return items.has("Hookshot")
                && (items.canLiftRocks()
                    || (items.has("MagicMirror")
                        && items.canBombThings()
                        && this.world.getRegion("East Death Mountain").canEnter(locations, items)) || (this.world.config("canBootsClip", false)
                        && items.has("PegasusBoots")) ||
                    this.world.config("canOneFrameClipOW", false));
        });

        this.locations.get("Hookshot Cave - Bottom Right").setRequirements((locations, items) => {
            return (items.has("Hookshot")
                || items.has("PegasusBoots")) && (items.canLiftRocks()
                || (items.has("MagicMirror")
                    && items.canBombThings()
                    && this.world.getRegion("East Death Mountain").canEnter(locations, items)) || (this.world.config("canBootsClip", false)
                    && items.has("PegasusBoots")) ||
                this.world.config("canOneFrameClipOW", false));
        });

        this.can_enter = (locations, items) => {
            return (this.world.getRegion("West Dark World Death Mountain").canEnter(locations, items)
                && (!this.world.config("region.cantTakeDamage", false)
                    || items.has("CaneOfByrna")
                    || items.has("Cape")
                    || (this.world.config("canBootsClip", false)
                        && items.has("PegasusBoots")) ||
                    this.world.config("canOneFrameClipOW", false))) || (items.has("MagicMirror")
                && items.has("MoonPearl")
                && items.has("Hookshot")
                && this.world.getRegion("West Death Mountain").canEnter(locations, items));
        };

        return this;
    }
}
