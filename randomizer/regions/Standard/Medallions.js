// Converted from app/Region/Standard/Medallions.php (alttp_vt_randomizer, MIT)
import { Item, Location, Region, Boss, Shop, LocationCollection, ShopCollection, ItemCollection } from '../../core/index.js';
const Medallion = Location.Medallion;

export class Medallions extends Region {
    __init_props() {
        super.__init_props?.();
        this.name = "Special";
    }

    
    constructor(world) {
        super(world);

        this.locations = new LocationCollection([
            new Medallion("Turtle Rock Medallion", Object.assign([null, 0x180023], {t0: 0x5020, t1: 0x50FF, t2: 0x51DE}), null, this),
            new Medallion("Misery Mire Medallion", Object.assign([null, 0x180022], {m0: 0x4FF2, m1: 0x50D1, m2: 0x51B0}), null, this),
        ]);
    }
}
