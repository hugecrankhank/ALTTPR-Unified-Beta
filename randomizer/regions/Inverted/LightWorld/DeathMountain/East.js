// Converted from app/Region/Inverted/LightWorld/DeathMountain/East.php (alttp_vt_randomizer, MIT)
import { East as Parent_Standard_LightWorld_DeathMountain_East } from '../../../Standard/LightWorld/DeathMountain/East.js';
import { Item, Location, Region, Boss, Shop, LocationCollection, ShopCollection, ItemCollection } from '../../../../core/index.js';

export class East extends Parent_Standard_LightWorld_DeathMountain_East {

    
    constructor(world) {
        super(world);

        this.locations.addItem(new Location.Drop.Ether("Ether Tablet", [0x180016], null, this));
        this.locations.addItem(new Location.Standing("Spectacle Rock", [0x180140], null, this));
    }

    
    initalize() {
        this.shops.get("Light World Death Mountain Shop").setRequirements((locations, items) => {
            return ((items.has("MoonPearl")
                || (this.world.config("canOWYBA", false)
                    && items.hasABottle(2))) && (items.has("Hookshot")
                || (this.world.config("canSuperSpeed", false)
                    && items.canSpinSpeed())) || (this.world.config("canOWYBA", false)
                && items.hasABottle()
                && (((this.world.config("canBootsClip", false)
                    && items.has("PegasusBoots")) ||
                    this.world.config("canOneFrameClipOW", false)))))
                && items.canBombThings();
        });

        this.locations.get("Spiral Cave").setRequirements((locations, items) => {
            return (items.has("MoonPearl")) || (this.world.config("canOWYBA", false)
                && items.hasABottle(2) && (items.has("Hookshot") 
                    || this.world.config("canSuperSpeed", false)
                    && items.canSpinSpeed())) 
                || (this.world.config("canSuperBunny", false) && items.has("MagicMirror")
                && items.hasSword()) 
                || ((this.world.config("canOWYBA", false)
                    && items.hasABottle())
                && ((this.world.config("canBootsClip", false)
                    && items.has("PegasusBoots")) 
                    || this.world.config("canOneFrameClipOW", false)));
        });

        this.locations.get("Mimic Cave").setRequirements((locations, items) => {
            return items.has("Hammer")
                && (items.has("MoonPearl")
                    || ((this.world.config("canOWYBA", false)
                        && items.hasABottle()) && (
                        (this.world.config("canBootsClip", false)
                            && items.has("PegasusBoots")) ||
                        this.world.config("canOneFrameClipOW", false))));
        });

        this.locations.get("Paradox Cave Lower - Far Left").setRequirements((locations, items) => {
            return items.has("MoonPearl")
                || (this.world.config("canOWYBA", false)
                    && items.hasABottle(2) && (items.has("Hookshot")
                        || (this.world.config("canSuperSpeed", false)
                        && items.canSpinSpeed()))) || (this.world.config("canOWYBA", false)
                && items.hasABottle()
                && ((this.world.config("canBootsClip", false)
                    && items.has("PegasusBoots"))
                    || this.world.config("canOneFrameClipOW", false)));
        });

        this.locations.get("Paradox Cave Lower - Left").setRequirements((locations, items) => {
            return items.has("MoonPearl")
                || (this.world.config("canOWYBA", false)
                    && items.hasABottle(2) && (items.has("Hookshot")
                        || (this.world.config("canSuperSpeed", false)
                        && items.canSpinSpeed()))) || (this.world.config("canOWYBA", false)
                && items.hasABottle()
                && ((this.world.config("canBootsClip", false)
                    && items.has("PegasusBoots"))
                    || this.world.config("canOneFrameClipOW", false)));
        });

        this.locations.get("Paradox Cave Lower - Right").setRequirements((locations, items) => {
            return items.has("MoonPearl")
                || (this.world.config("canOWYBA", false)
                    && items.hasABottle(2) && (items.has("Hookshot")
                        || (this.world.config("canSuperSpeed", false)
                        && items.canSpinSpeed()))) || (this.world.config("canOWYBA", false)
                && items.hasABottle()
                && ((this.world.config("canBootsClip", false)
                    && items.has("PegasusBoots"))
                    || this.world.config("canOneFrameClipOW", false)));
        });

        this.locations.get("Paradox Cave Lower - Far Right").setRequirements((locations, items) => {
            return items.has("MoonPearl")
                || (this.world.config("canOWYBA", false)
                    && items.hasABottle(2) && (items.has("Hookshot")
                        || (this.world.config("canSuperSpeed", false)
                        && items.canSpinSpeed()))) || (this.world.config("canOWYBA", false)
                && items.hasABottle()
                && ((this.world.config("canBootsClip", false)
                    && items.has("PegasusBoots"))
                    || this.world.config("canOneFrameClipOW", false)));
        });

        this.locations.get("Paradox Cave Lower - Middle").setRequirements((locations, items) => {
            return items.has("MoonPearl")
                || (this.world.config("canOWYBA", false)
                    && items.hasABottle(2) && (items.has("Hookshot")
                        || (this.world.config("canSuperSpeed", false)
                        && items.canSpinSpeed()))) || (this.world.config("canOWYBA", false)
                && items.hasABottle()
                && ((this.world.config("canBootsClip", false)
                    && items.has("PegasusBoots"))
                    || this.world.config("canOneFrameClipOW", false)));
        });

        this.locations.get("Paradox Cave Upper - Left").setRequirements((locations, items) => {
            return items.canBombThings()
                && (items.has("MoonPearl")
                    || (this.world.config("canOWYBA", false)
                        && items.hasABottle(2) && (items.has("Hookshot")
                            || (this.world.config("canSuperSpeed", false)
                                && items.canSpinSpeed())))
                    || (this.world.config("canOWYBA", false) && items.hasABottle()
                    && ((this.world.config("canBootsClip", false)
                        && items.has("PegasusBoots"))
                        || this.world.config("canOneFrameClipOW", false))));
        });

        this.locations.get("Paradox Cave Upper - Right").setRequirements((locations, items) => {
            return items.canBombThings()
                && (items.has("MoonPearl")
                    || (this.world.config("canOWYBA", false)
                        && items.hasABottle(2) && (items.has("Hookshot")
                            || (this.world.config("canSuperSpeed", false)
                                && items.canSpinSpeed())))
                    || (this.world.config("canOWYBA", false) && items.hasABottle()
                    && ((this.world.config("canBootsClip", false)
                        && items.has("PegasusBoots"))
                        || this.world.config("canOneFrameClipOW", false))));
        });

        this.locations.get("Ether Tablet").setRequirements((locations, items) => {
            return items.has("BookOfMudora")
                && ((this.world.config("mode.weapons") == "swordless"
                    && items.has("Hammer"))
                    || items.hasSword(2)) && ((items.has("MoonPearl")
                    && (items.has("Hammer")
                    || (this.world.config("canBootsClip", false)
                        && items.has("PegasusBoots")) || (this.world.config("canSuperSpeed", false)
                        && items.canSpinSpeed())
                        || (this.world.config("canOWYBA", false)
                            && items.hasABottle()
                            && this.world.config("canBootsClip", false)
                            && items.has("PegasusBoots"))))
                    || this.world.config("canOneFrameClipOW", false)
                );
        });

        this.locations.get("Spectacle Rock").setRequirements((locations, items) => {
            return (items.has("MoonPearl")
                && (items.has("Hammer")
                    || (this.world.config("canSuperSpeed", false)
                        && items.canSpinSpeed()) || (this.world.config("canBootsClip", false)
                        && items.has("PegasusBoots")))) || (this.world.config("canOWYBA", false)
                && items.hasABottle()
                && this.world.config("canBootsClip", false)
                && items.has("PegasusBoots")) ||
                this.world.config("canOneFrameClipOW", false);
        });

        this.can_enter = (locations, items) => {
            return (items.canLiftDarkRocks()
                && this.world.getRegion("East Dark World Death Mountain").canEnter(locations, items)) || (this.world.getRegion("West Death Mountain").canEnter(locations, items)
                && (
                    ((items.has("MoonPearl")
                        || (this.world.config("canOWYBA", false)
                            && items.hasABottle(2))) && (items.has("Hookshot")
                        || (this.world.config("canBootsClip", false)
                            && items.has("PegasusBoots")) || (this.world.config("canSuperSpeed", false)
                            && items.canSpinSpeed()))) 
                    || (this.world.config("canMirrorWrap", false)
                        && items.has("MagicMirror")) ||
                    this.world.config("canOneFrameClipOW", false)));
        };

        return this;
    }
}
