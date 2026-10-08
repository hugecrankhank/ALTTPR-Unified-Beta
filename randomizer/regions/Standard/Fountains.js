// Converted from app/Region/Standard/Fountains.php (alttp_vt_randomizer, MIT)
import { Item, Location, Region, Boss, Shop, LocationCollection, ShopCollection, ItemCollection } from '../../core/index.js';

export class Fountains extends Region {
    __init_props() {
        super.__init_props?.();
        this.name = "Special";
    }

    
    constructor(world) {
        super(world);

        this.locations = new LocationCollection([
            new Location.Fountain("Waterfall Bottle", [0x348FF], null, this),
            new Location.Fountain("Pyramid Bottle", [0x3493B], null, this),
        ]);
    }
}
