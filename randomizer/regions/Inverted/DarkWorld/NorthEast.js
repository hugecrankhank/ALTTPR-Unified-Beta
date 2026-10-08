// Converted from app/Region/Inverted/DarkWorld/NorthEast.php (alttp_vt_randomizer, MIT)
import { NorthEast as Parent_Standard_DarkWorld_NorthEast } from '../../Standard/DarkWorld/NorthEast.js';
import { Item, Location, Region, Boss, Shop, LocationCollection, ShopCollection, ItemCollection } from '../../../core/index.js';

export class NorthEast extends Parent_Standard_DarkWorld_NorthEast {

    
    constructor(world) {
        super(world);

        this.locations.removeItem("Ganon");
    }

    
    initalize() {
        this.shops.get("Dark World Potion Shop").setRequirements((locations, items) => {
            return items.canFly(this.world)
                || items.has("Hammer")
                || items.has("Flippers")
                || (items.has("MagicMirror")
                    && this.world.getRegion("North East Light World").canEnter(locations, items)
                    && items.has("MoonPearl")) || (this.world.config("canOWYBA", false)
                    && items.hasABottle()) || (this.world.config("canBootsClip", false)
                    && items.has("PegasusBoots")) || (this.world.config("canSuperSpeed", false)
                    && items.canSpinSpeed()) || (this.world.config("canOneFrameClipOW", false)
                    || ( //Quirn-Jump
                        !this.world.config("region.cantTakeDamage", false)
                        && this.world.config("canFakeFlipper", false)) || (this.world.config("canBunnyRevive", false)
                        && items.canBunnyRevive(this.world))) || (this.world.config("canWaterWalk", false)
                    && items.has("PegasusBoots"));
        });

        this.locations.get("Catfish").setRequirements((locations, items) => {
            return items.canLiftRocks()
                || (this.world.config("canBootsClip", false)
                    && items.has("PegasusBoots")) ||
                this.world.config("canOneFrameClipOW", false)
                || (items.has("MagicMirror") && this.world.getRegion("South Light World").canEnter(locations, items)
                    && (items.has("MoonPearl") || 
                        (this.world.config("canOWYBA", false) && items.hasABottle()))
                    && (items.has("Flippers") || this.world.config("canFakeFlipper", false)
                        || (this.world.config("canWaterWalk", false) && items.has("PegasusBoots"))));
        });

        this.locations.get("Pyramid Fairy - Sword").setRequirements((locations, items) => {
            return items.hasSword()
                && items.has("BigRedBomb")
                && items.has("MagicMirror");
        });

        this.locations.get("Pyramid Fairy - Bow").setRequirements((locations, items) => {
            return items.canShootArrows(this.world)
                && items.has("BigRedBomb")
                && items.has("MagicMirror");
        });

        if (this.world.config("region.swordsInPool", true)) {
            this.locations.get("Pyramid Fairy - Left").setRequirements((locations, items) => {
                return items.has("BigRedBomb")
                    && items.has("MagicMirror");
            });

            this.locations.get("Pyramid Fairy - Right").setRequirements((locations, items) => {
                return items.has("BigRedBomb")
                    && items.has("MagicMirror");
            });
        }

        this.can_enter = (locations, items) => {
            return items.canFly(this.world)
                || items.has("Hammer")
                || items.has("Flippers")
                || (items.has("MagicMirror")
                    && this.world.getRegion("North East Light World").canEnter(locations, items)) || (this.world.config("canOWYBA", false)
                    && items.hasABottle()) || (this.world.config("canBootsClip", false)
                    && items.has("PegasusBoots")) || (this.world.config("canWaterWalk", false)
                    && items.has("PegasusBoots")) || (this.world.config("canSuperSpeed", false)
                    && items.canSpinSpeed()) || (!this.world.config("region.cantTakeDamage", false)
                    && this.world.config("canFakeFlipper", false)) || (this.world.config("canBunnyRevive", false)
                    && items.canBunnyRevive(this.world)) ||
                this.world.config("canOneFrameClipOW", false);
        };

        return this;
    }
}
