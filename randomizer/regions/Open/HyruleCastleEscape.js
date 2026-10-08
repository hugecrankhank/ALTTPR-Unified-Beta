// Converted from app/Region/Open/HyruleCastleEscape.php (alttp_vt_randomizer, MIT)
import { HyruleCastleEscape as Parent_Standard_HyruleCastleEscape } from '../Standard/HyruleCastleEscape.js';
import { Item, Location, Region, Boss, Shop, LocationCollection, ShopCollection, ItemCollection } from '../../core/index.js';

export class HyruleCastleEscape extends Parent_Standard_HyruleCastleEscape {

    
    initalize() {
        this.locations.get("Sewers - Secret Room - Left").setRequirements((locations, items) => {
            return items.canLiftRocks() || (
                (items.has("Lamp", this.world.config("item.require.Lamp", 1))
                    || (this.world.config("itemPlacement") === "advanced" && items.has("FireRod")))
                && items.has("KeyH2") && items.canKillMostThings(this.world));
        });

        this.locations.get("Sewers - Secret Room - Middle").setRequirements((locations, items) => {
            return items.canLiftRocks() || (
                (items.has("Lamp", this.world.config("item.require.Lamp", 1))
                    || (this.world.config("itemPlacement") === "advanced" && items.has("FireRod")))
                && items.has("KeyH2") && items.canKillMostThings(this.world));
        });

        this.locations.get("Sewers - Secret Room - Right").setRequirements((locations, items) => {
            return items.canLiftRocks() || (
                (items.has("Lamp", this.world.config("item.require.Lamp", 1))
                    || (this.world.config("itemPlacement") === "advanced" && items.has("FireRod")))
                && items.has("KeyH2") && items.canKillMostThings(this.world));
        });

        this.locations.get("Sewers - Dark Cross").setRequirements((locations, items) => {
            return items.has("Lamp", this.world.config("item.require.Lamp", 1))
                || (this.world.config("itemPlacement") === "advanced" && items.has("FireRod"));
        });

        this.locations.get("Hyrule Castle - Boomerang Chest").setRequirements((locations, items) => {
            return items.has("KeyH2") && items.canKillMostThings(this.world);
        });

        this.locations.get("Hyrule Castle - Zelda's Cell").setRequirements((locations, items) => {
            return items.has("KeyH2") && items.canKillMostThings(this.world);
        });

        this.locations.get("Secret Passage").setFillRules((item, locations, items) => {
            return !((!this.world.config("region.wildKeys", false) && item instanceof Item.Key)
                || (!this.world.config("region.wildBigKeys", false) && item instanceof Item.BigKey)
                || (!this.world.config("region.wildMaps", false) && item instanceof Item.Map)
                || (!this.world.config("region.wildCompasses", false) && item instanceof Item.Compass));
        });

        this.locations.get("Link's Uncle").setFillRules((item, locations, items) => {
            return this.locations.get("Sanctuary").canAccess(this.world.collectItems())
                && !((!this.world.config("region.wildKeys", false) && item instanceof Item.Key)
                    || (!this.world.config("region.wildBigKeys", false) && item instanceof Item.BigKey)
                    || (!this.world.config("region.wildMaps", false) && item instanceof Item.Map)
                    || (!this.world.config("region.wildCompasses", false) && item instanceof Item.Compass));
        });

        return this;
    }
}
