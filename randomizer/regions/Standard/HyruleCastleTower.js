// Converted from app/Region/Standard/HyruleCastleTower.php (alttp_vt_randomizer, MIT)
import { Item, Location, Region, Boss, Shop, LocationCollection, ShopCollection, ItemCollection } from '../../core/index.js';

export class HyruleCastleTower extends Region {
    __init_props() {
        super.__init_props?.();
        this.name = "Castle Tower";
        this.region_items = [
        "BigKey",
        "BigKeyA1",
        "Compass",
        "CompassA1",
        "Key",
        "KeyA1",
        "Map",
        "MapA1",
    ];
    }

    
    constructor(world) {
        super(world);

        this.locations = new LocationCollection([
            new Location.Chest("Castle Tower - Room 03", [0xEAB5], null, this),
            new Location.Chest("Castle Tower - Dark Maze", [0xEAB2], null, this),
            new Location.Prize.Event("Agahnim", [], null, this),
        ]);
        this.locations.setChecksForWorld(world.id);
        this.prize_location = this.locations.get("Agahnim");
        this.prize_location.setItem(Item.get("DefeatAgahnim", world));
    }

    
    initalize() {
        this.locations.get("Castle Tower - Dark Maze").setRequirements((locations, items) => {
            return items.has("Lamp", this.world.config("item.require.Lamp", 1)) && items.has("KeyA1");
        });

        this.can_complete = (locations, items) => {
            return this.canEnter(locations, items) && items.has("KeyA1", 2)
                && items.has("Lamp", this.world.config("item.require.Lamp", 1)) && (items.hasSword()
                    || (this.world.config("mode.weapons") == "swordless" && (items.has("Hammer") || items.has("BugCatchingNet"))));
        };

        this.prize_location.setRequirements(this.can_complete);

        this.can_enter = (locations, items) => {
            return items.canKillMostThings(this.world, 8)
                && items.has("RescueZelda")
                && (items.has("Cape")
                    || items.hasSword(2)
                    || (this.world.config("mode.weapons") == "swordless" && items.has("Hammer")));
        };

        return this;
    }
}
