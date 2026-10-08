// Converted from app/Region/Inverted/DarkWorld/South.php (alttp_vt_randomizer, MIT)
import { South as Parent_Standard_DarkWorld_South } from '../../Standard/DarkWorld/South.js';
import { Item, Location, Region, Boss, Shop, LocationCollection, ShopCollection, ItemCollection } from '../../../core/index.js';

export class South extends Parent_Standard_DarkWorld_South {

    
    constructor(world) {
        super(world);

        this.shops.get("Dark World Lake Hylia Shop").clearInventory()
            .addInventory(0, Item.get("BluePotion", world), 160)
            .addInventory(1, Item.get("BlueShield", world), 50)
            .addInventory(2, Item.get("TenBombs", world), 50);

        this.locations.addItem(new Location.Chest("Link's House", [0xE9BC], null, this));
    }

    
    initalize() {
        this.shops.get("Bonk Fairy (Dark)").setRequirements((locations, items) => {
            return items.has("PegasusBoots");
        });

        this.shops.get("Dark Lake Hylia Ledge Fairy").setRequirements((locations, items) => {
            return items.canBombThings()
                && (items.has("Flippers")
                    || items.canFly(this.world)
                    || (this.world.config("canOWYBA", false)
                        && items.hasABottle()) || (
                        (this.world.config("canBootsClip", false)
                            || this.world.config("canWaterWalk", false))
                        && items.has("PegasusBoots")) ||
                    this.world.config("canOneFrameClipOW", false)
                    || (this.world.config("canFakeFlipper", false)
                        && (
                            (this.world.getRegion("North East Dark World").canEnter(locations, items)
                                && (items.has("Hammer")
                                    || items.canLiftRocks()))
                            || (this.world.config("canBunnyRevive", false)
                                && items.canBunnyRevive(this.world)))
                        || (this.world.getRegion("North West Dark World").canEnter(locations, items)
                            && this.world.config("region.cantTakeDamage", false))));
        });

        this.shops.get("Dark Lake Hylia Ledge Hint").setRequirements((locations, items) => {
            return items.canLiftRocks()
                && (items.has("Flippers")
                    || items.canFly(this.world)
                    || (this.world.config("canOWYBA", false)
                        && items.hasABottle()) || (
                        (this.world.config("canBootsClip", false)
                            || this.world.config("canWaterWalk", false))
                        && items.has("PegasusBoots")) ||
                    this.world.config("canOneFrameClipOW", false)
                    || (this.world.config("canFakeFlipper", false)
                        && (
                            (this.world.getRegion("North East Dark World").canEnter(locations, items)
                                && (items.has("Hammer")
                                    || items.canLiftRocks()))
                            || (this.world.config("canBunnyRevive", false)
                                && items.canBunnyRevive(this.world)))
                        || (this.world.getRegion("North West Dark World").canEnter(locations, items)
                            && this.world.config("region.cantTakeDamage", false))));
        });

        this.shops.get("Dark Lake Hylia Ledge Spike Cave").setRequirements((locations, items) => {
            return items.canLiftRocks()
                && (items.has("Flippers")
                    || items.canFly(this.world)
                    || (this.world.config("canOWYBA", false)
                        && items.hasABottle()) || (
                        (this.world.config("canBootsClip", false)
                            || this.world.config("canWaterWalk", false))
                        && items.has("PegasusBoots")) ||
                    this.world.config("canOneFrameClipOW", false)
                    || (this.world.config("canFakeFlipper", false)
                        && (
                            (this.world.getRegion("North East Dark World").canEnter(locations, items)
                                && (items.has("Hammer")
                                    || items.canLiftRocks())) || (this.world.config("canBunnyRevive", false)
                                && items.canBunnyRevive(this.world)))
                        || (this.world.getRegion("North West Dark World").canEnter(locations, items)
                            && this.world.config("region.cantTakeDamage", false))));
        });

        this.locations.get("Hype Cave - Top").setRequirements((locations, items) => {
            return items.canBombThings();
        });

        this.locations.get("Hype Cave - Middle Right").setRequirements((locations, items) => {
            return items.canBombThings();
        });

        this.locations.get("Hype Cave - Middle Left").setRequirements((locations, items) => {
            return items.canBombThings();
        });

        this.locations.get("Hype Cave - Bottom").setRequirements((locations, items) => {
            return items.canBombThings();
        });

        this.locations.get("Hype Cave - NPC").setRequirements((locations, items) => {
            return items.canBombThings();
        });

        return this;
    }
}
