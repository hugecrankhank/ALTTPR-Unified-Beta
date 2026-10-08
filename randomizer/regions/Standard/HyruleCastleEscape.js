// Converted from app/Region/Standard/HyruleCastleEscape.php (alttp_vt_randomizer, MIT)
import { Item, Location, Region, Boss, Shop, LocationCollection, ShopCollection, ItemCollection } from '../../core/index.js';

export class HyruleCastleEscape extends Region {
    __init_props() {
        super.__init_props?.();
        this.name = "Hyrule Castle";
        this.region_items = [
        "BigKey",
        "BigKeyH2",
        "Compass",
        "CompassH2",
        "Key",
        "KeyH2",
        "Map",
        "MapH2",
    ];
    }

    
    constructor(world) {
        super(world);

        this.locations = new LocationCollection([
            new Location.Chest("Sanctuary", [0xEA79], null, this),
            new Location.Chest("Sewers - Secret Room - Left", [0xEB5D], null, this),
            new Location.Chest("Sewers - Secret Room - Middle", [0xEB60], null, this),
            new Location.Chest("Sewers - Secret Room - Right", [0xEB63], null, this),
            new Location.Chest("Sewers - Dark Cross", [0xE96E], null, this),
            new Location.Chest("Hyrule Castle - Boomerang Chest", [0xE974], null, this),
            new Location.Chest("Hyrule Castle - Map Chest", [0xEB0C], null, this),
            new Location.Chest("Hyrule Castle - Zelda's Cell", [0xEB09], null, this),
            new Location.Npc.Uncle("Link's Uncle", [0x2DF45], null, this),
            new Location.Chest("Secret Passage", [0xE971], null, this),
            new Location.Prize.Event("Zelda", [], null, this),
        ]);
        this.locations.setChecksForWorld(world.id);

        this.prize_location = this.locations.get("Zelda");
        this.prize_location.setItem(Item.get("RescueZelda", world));
    }

    
    initalize() {
        this.locations.get("Sanctuary").setRequirements((locations, items) => {
            return items.canKillEscapeThings(this.world) && items.has("KeyH2");
        });

        this.locations.get("Sewers - Secret Room - Left").setRequirements((locations, items) => {
            return items.canKillEscapeThings(this.world) && items.has("KeyH2");
        });

        this.locations.get("Sewers - Secret Room - Middle").setRequirements((locations, items) => {
            return items.canKillEscapeThings(this.world) && items.has("KeyH2");
        });

        this.locations.get("Sewers - Secret Room - Right").setRequirements((locations, items) => {
            return items.canKillEscapeThings(this.world) && items.has("KeyH2");
        });

        this.locations.get("Sewers - Dark Cross").setRequirements((locations, items) => {
            return items.canKillEscapeThings(this.world);
        });

        this.locations.get("Hyrule Castle - Boomerang Chest").setRequirements((locations, items) => {
            return items.canKillEscapeThings(this.world);
        });

        this.locations.get("Hyrule Castle - Map Chest").setRequirements((locations, items) => {
            return items.canKillEscapeThings(this.world);
        });

        this.locations.get("Hyrule Castle - Zelda's Cell").setRequirements((locations, items) => {
            return items.canKillEscapeThings(this.world);
        });

        this.locations.get("Secret Passage").setRequirements((locations, items) => {
            return items.canKillEscapeThings(this.world);
        }).setFillRules((item, locations, items) => {
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

        this.can_complete = (locations, items) => {
            return this.locations.get("Sanctuary").canAccess(items);
        };

        this.prize_location.setRequirements(this.can_complete);

        return this;
    }
}
