// Converted from app/Region/Inverted/LightWorld/NorthEast.php (alttp_vt_randomizer, MIT)
import { NorthEast as Parent_Standard_LightWorld_NorthEast } from '../../Standard/LightWorld/NorthEast.js';
import { Item, Location, Region, Boss, Shop, LocationCollection, ShopCollection, ItemCollection, in_array } from '../../../core/index.js';

export class NorthEast extends Parent_Standard_LightWorld_NorthEast {

    constructor(world) {
        super(world);

        this.locations.addItem(new Location.Prize.Event("Ganon", [], null, this));

        this.prize_location = this.locations.get("Ganon");
        this.prize_location.setItem(Item.get("DefeatGanon", world));
    }
    
    initalize() {
        this.locations.get("Sahasrahla's Hut - Left").setRequirements((locations, items) => {
            return ((items.has("MoonPearl")
                || (this.world.config("canOWYBA", false)
                    && items.hasABottle()))
                && items.canBombThings())
                || (this.world.config("canSuperBunny", false)
                    && items.has("PegasusBoots")
                    && (items.has("MagicMirror")
                        || !this.world.config("region.cantTakeDamage", false)));
        });

        this.locations.get("Sahasrahla's Hut - Middle").setRequirements((locations, items) => {
            return ((items.has("MoonPearl")
                || (this.world.config("canOWYBA", false)
                    && items.hasABottle()))
                && items.canBombThings())
                || (this.world.config("canSuperBunny", false)
                    && items.has("PegasusBoots")
                    && (items.has("MagicMirror")
                        || !this.world.config("region.cantTakeDamage", false)));
        });

        this.locations.get("Sahasrahla's Hut - Right").setRequirements((locations, items) => {
            return ((items.has("MoonPearl")
                || (this.world.config("canOWYBA", false)
                    && items.hasABottle()))
                && items.canBombThings())
                || (this.world.config("canSuperBunny", false)
                    && items.has("PegasusBoots")
                    && (items.has("MagicMirror")
                        || !this.world.config("region.cantTakeDamage", false)));
        });

        this.locations.get("Sahasrahla").setRequirements((locations, items) => {
            return items.has("PendantOfCourage");
        });

        this.locations.get("King Zora").setRequirements((locations, items) => {
            return (items.has("MoonPearl")
                || (this.world.config("canOWYBA", false)
                    && items.hasABottle())) && (items.canLiftRocks()
                || (this.world.config("canFakeFlipper", false)
                    || items.has("Flippers")) || (
                    (this.world.config("canBootsClip", false)
                        || this.world.config("canWaterWalk", false)) &&
                    items.has("PegasusBoots")) || (this.world.config("canSuperSpeed", false)
                    && items.canSpinSpeed()
                    && this.world.getRegion("East Death Mountain").canEnter(locations, items))) ||
                this.world.config("canOneFrameClipOW", false);
        });

        this.locations.get("Potion Shop").setRequirements((locations, items) => {
            return (items.has("MoonPearl")
                || (this.world.config("canOWYBA", false)
                    && items.hasABottle())
                || (this.world.config("canBunnyRevive", false)
                    && items.canBunnyRevive(this.world))
                || this.world.config("canOneFrameClipOW", false)) &&
                items.has("Mushroom");
        });

        this.locations.get("Zora's Ledge").setRequirements((locations, items) => {
            return (items.has("MoonPearl")
                || (this.world.config("canBunnyRevive", false)
                    && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                    && items.hasABottle())) && (items.has("Flippers")
                    || (this.world.config("canWaterWalk", false)
                        && ((this.world.config("canFakeFlipper", false)
                            && this.world.config("canWaterWalk", false)
                            && items.has("MoonPearl")
                            && this.world.config("canOneFrameClipOW", false))
                        || ((this.world.config("canBootsClip", false)
                            || this.world.config("canOneFrameClipOW", false)
                            || (this.world.config("canSuperSpeed", false)
                                && items.canSpinSpeed()))
                                && items.has("PegasusBoots")))));
        });

        this.locations.get("Waterfall Fairy - Left").setRequirements((locations, items) => {
            return (items.has("MoonPearl")
                || (this.world.config("canBunnyRevive", false)
                    && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                    && items.hasABottle())) && (this.world.config("canFakeFlipper", false)
                || (this.world.config("canWaterWalk", false)
                    && (items.has("PegasusBoots")
                        || items.has("MoonPearl"))) ||
                items.has("Flippers")
                || (this.world.getRegion("East Death Mountain").canEnter(locations, items)
                    && (
                        (this.world.config("canBootsClip", false)
                            && items.has("PegasusBoots")) || (this.world.config("canSuperSpeed", false)
                            && items.canSpinSpeed()) ||
                        this.world.config("canOneFrameClipOW", false))));
        });

        this.locations.get("Waterfall Fairy - Right").setRequirements((locations, items) => {
            return (items.has("MoonPearl")
                || (this.world.config("canBunnyRevive", false)
                    && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                    && items.hasABottle())) && (this.world.config("canFakeFlipper", false)
                || (this.world.config("canWaterWalk", false)
                    && (items.has("PegasusBoots")
                        || items.has("MoonPearl"))) ||
                items.has("Flippers")
                || (this.world.getRegion("East Death Mountain").canEnter(locations, items)
                    && (
                        (this.world.config("canBootsClip", false)
                            && items.has("PegasusBoots")) || (this.world.config("canSuperSpeed", false)
                            && items.canSpinSpeed()) ||
                        this.world.config("canOneFrameClipOW", false))));
        });

        this.prize_location.setRequirements((locations, items) => {
            if (
                this.world.config("goal") == "dungeons"
                && (!items.has("PendantOfCourage")
                    || !items.has("PendantOfWisdom")
                    || !items.has("PendantOfPower")
                    || !items.has("DefeatAgahnim")
                    || !items.has("Crystal1")
                    || !items.has("Crystal2")
                    || !items.has("Crystal3")
                    || !items.has("Crystal4")
                    || !items.has("Crystal5")
                    || !items.has("Crystal6")
                    || !items.has("Crystal7")
                    || !items.has("DefeatAgahnim2"))
            ) {
                return false;
            }

            if (
                in_array(this.world.config("goal"), ["ganon", "fast_ganon"])
                && ((items.has("Crystal1")
                    + items.has("Crystal2")
                    + items.has("Crystal3")
                    + items.has("Crystal4")
                    + items.has("Crystal5")
                    + items.has("Crystal6")
                    + items.has("Crystal7")) < this.world.config("crystals.ganon", 7))
            ) {
                return false;
            }

            return (items.has("MoonPearl")
                || (this.world.config("canBunnyRevive", false)
                    && items.canBunnyRevive(this.world)) || (this.world.config("canOWYBA", false)
                    && items.hasABottle()) || (     // Invis Ganon fight sounds fun for logic :)
                    this.world.config("canSuperBunny", false)
                    && this.world.config("canDungeonRevive", false) // Just so it's not in logic for everyone. Don't care, just think it's better like this.
                    && this.world.getRegion("Ganons Tower").canEnter(locations, items) //Bunny Beam Storage from GT
                    && items.has("CaneOfSomaria")
                    && items.has("MagicMirror")
                    && items.hasABottle() // Magic should be easily fine, but it's easy to miss when Invisible, even with lamp. FRod when Requires a bunch of Bottles anyway.
                )) && (items.has("DefeatAgahnim2")
                || this.world.config("goal") === "fast_ganon")
                && (!this.world.config("region.requireBetterBow", false)
                    || items.canShootArrows(this.world, 2)) && (
                    (this.world.config("mode.weapons") == "swordless"
                        && items.has("Hammer") && (items.has("Lamp", this.world.config("item.require.Lamp", 1))
                            || (items.has("FireRod") && ((items.canExtendMagic(this.world, 2)
                                && items.has("MoonPearl")) || items.canExtendMagic(this.world, 3)))))
                    || (!this.world.config("region.requireBetterSword", false)
                        && items.hasSword(2)
                            && (items.has("Lamp", this.world.config("item.require.Lamp", 1))
                                || (items.has("FireRod")
                                    && ((items.canExtendMagic(this.world, 3)
                                        && items.has("MoonPearl")) ||
                                    items.canExtendMagic(this.world, 4))))) || (items.hasSword(3)
                        && (items.has("Lamp", this.world.config("item.require.Lamp", 1))
                            || (items.has("FireRod")
                                && ((items.canExtendMagic(this.world, 2)
                                    && items.has("MoonPearl")) ||
                                items.canExtendMagic(this.world, 3))))));
        });

        this.can_enter = (locations, items) => {
            return items.has("DefeatAgahnim")
                || (items.has("MoonPearl")
                    && ((items.has("Hammer")
                            && items.canLiftRocks()) ||
                            items.canLiftDarkRocks()))
                || (items.canFly(this.world) && items.canLiftDarkRocks())
                    // Glitched Access from DeathMountain
                || (this.world.config("canOWYBA", false)
                    && (items.hasABottle(2)
                        || (items.hasABottle()
                            && items.has("Lamp", this.world.config("item.require.Lamp", 1)))))
                || (this.world.getRegion("West Death Mountain").canEnter(locations, items)
                    && (items.has("MoonPearl") || items.has("MagicMirror"))
                    && (
                        (this.world.config("canSuperSpeed", false)
                            && items.canSpinSpeed()) || (this.world.config("canBootsClip", false)
                            && items.has("PegasusBoots"))))
                || this.world.config("canOneFrameClipOW", false);
        };

        return this;
    }
}
