// Converted from app/Rom.php (alttp_vt_randomizer, MIT)
import { Credits } from './credits.js';
import { Text } from './text.js';
import { InitialSram } from './initial-sram.js';
import { Shop } from './shop.js';
import { __values, count, array_merge, array_pop, array_slice, array_pad, min, max, php_empty, snes_to_pc } from './php.js';

// PHP pack() for the formats used here; returns a binary string.
export function pack(fmt, ...args) {
    const code = fmt[0];
    const vals = fmt.endsWith('*') ? args : args.slice(0, 1);
    let s = '';
    for (let v of vals) {
        v = Math.trunc(Number(v)) || 0;
        switch (code) {
            case 'C': case 'c': s += String.fromCharCode(v & 0xFF); break;
            case 'S': case 'v': case 's': s += String.fromCharCode(v & 0xFF, (v >> 8) & 0xFF); break;
            case 'n': s += String.fromCharCode((v >> 8) & 0xFF, v & 0xFF); break;
            case 'L': case 'V': case 'l':
                s += String.fromCharCode(v & 0xFF, (v >>> 8) & 0xFF, (v >>> 16) & 0xFF, (v >>> 24) & 0xFF); break;
            case 'N': s += String.fromCharCode((v >>> 24) & 0xFF, (v >>> 16) & 0xFF, (v >>> 8) & 0xFF, v & 0xFF); break;
            default: throw new Error('pack: unsupported format ' + fmt);
        }
    }
    return s;
}
const bytesOf = (bin) => Array.from(bin, (c) => c.charCodeAt(0));
const utf8bytes = (s) => [...new TextEncoder().encode(String(s))];
function base64_decode(b64) {
    const bin = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('latin1');
    return bin;
}
export class Rom {
    __init_props() {
                this.credits = null;
        this.text = null;
                this.write_log = [];
        this.initial_sram = null;
    }

    static BUILD = "2024-02-18";
    static HASH = "edc01f3db798ae4dfe21101311598d44";
    static SIZE = 2097152;

    


    


    
    constructor() {
        this.__init_props();
        this.data = new Uint8Array(Rom.SIZE);
        this.written = new Uint8Array(Rom.SIZE);
        this.credits = new Credits();
        this.text = new Text();
        this.text.removeUnwanted();
        this.initial_sram = new InitialSram();
    }

    


    


    


    
    updateChecksum() {
        let sum = 0x1FE;
        for (let i = 0; i < Rom.SIZE; i++) {
            if (i >= 0x7FDC && i < 0x7FE0) continue;
            sum += this.data[i];
        }
        const checksum = sum & 0xFFFF;
        const inverse = checksum ^ 0xFFFF;
        this.write(0x7FDC, pack("S*", inverse, checksum));
        return this;
    }

    
    setSubstitutions(substitutions = []) {
        substitutions = array_merge(substitutions, [0xFF, 0xFF, 0xFF, 0xFF]);

        this.write(0x184000, pack("C*", ...substitutions));

        return this;
    }

    
    setHeartBeepSpeed(setting) { let byte;
        switch (setting) {
            case "off":
                byte = 0x00;
                break;
            case "half":
                byte = 0x40;
                break;
            case "quarter":
                byte = 0x80;
                break;
            case "double":
                byte = 0x10;
                break;
            case "normal":
            default:
                byte = 0x20;
        }

        this.write(0x180033, pack("C", byte));

        return this;
    }

    
    setRupoorValue(value = 10) {
        this.write(0x180036, pack("v*", value));

        return this;
    }

    
    setByrnaCaveSpikeDamage(dmg_value = 0x08) {
        this.write(0x180195, pack("C*", dmg_value));

        return this;
    }

    
    setCaneOfByrnaSpikeCaveUsage(normal = 0x04, half = 0x02, quarter = 0x01) {
        this.write(0x18016B, pack("C*", normal, half, quarter));

        return this;
    }

    
    setCaneOfByrnaInvulnerability(enable = true) {
        this.write(0x18004F, pack("C*", enable ? 0x01 : 0x00));

        return this;
    }

    
    setCapeSpikeCaveUsage(normal = 0x04, half = 0x08, quarter = 0x10) {
        this.write(0x18016E, pack("C*", normal, half, quarter));

        return this;
    }

    
    setCapeRegularMagicUsage(normal = 0x04, half = 0x08, quarter = 0x10) {
        this.write(0x3ADA7, pack("C*", normal, half, quarter));

        return this;
    }

    
    setClockMode(mode = "off", restart = false) { let compass_override, bytes;
        compass_override = true;
        switch (mode) {
            case "stopwatch":
                bytes = [0x02, 0x01];
                break;
            case "countdown-ohko":
                bytes = [0x01, 0x02];
                restart = true;
                break;
            case "countdown-continue":
                bytes = [0x01, 0x01];
                break;
            case "countdown-stop":
                bytes = [0x01, 0x00];
                break;
            case "countdown-end":
                bytes = [0x01, 0x03];
                restart = false;
                break;
            case "off":
            default:
                bytes = [0x00, 0x00];
                compass_override = false;
                break;
        }

        // @TODO: temporarly disable compass mode while this is enabled since they occupy the same region of the hud.
        if (compass_override) {
            this.setCompassMode("off");
        }

        bytes = array_merge(bytes, [restart ? 0x01 : 0x00]);

        this.write(0x180190, pack("C*", ...bytes));

        return this;
    }

    
    enableTriforceTurnIn(enable = true) {
        this.write(0x180194, pack("C", enable ? 0x01 : 0x00));
    }

    
    enableHudItemCounter(enable = false) {
        this.write(0x180039, pack("C", enable ? 0x01 : 0x00));
    }

    
    setStartingTime(seconds = 0) {
        this.write(0x18020C, pack("l*", seconds * 60));

        return this;
    }

    
    setRedClock(seconds = 0) {
        this.write(0x180200, pack("l*", seconds * 60));

        return this;
    }

    
    setBlueClock(seconds = 0) {
        this.write(0x180204, pack("l*", seconds * 60));

        return this;
    }

    
    setGreenClock(seconds = 0) {
        this.write(0x180208, pack("l*", seconds * 60));

        return this;
    }

    
    setDiggingGameRng(digs = 15) {
        this.write(0x180020, pack("C", digs));
        this.write(0xEFD95, pack("C", digs));

        return this;
    }

    
    setCapacityUpgradeFills(fills) {
        this.write(0x180080, pack("C*", ...array_slice(fills, 0, 4)));

        return this;
    }

    
    setBottleFills(fills) {
        this.write(0x180084, pack("C*", ...array_slice(fills, 0, 2)));

        return this;
    }

    
    setGoalRequiredCount(goal = 0) {
        this.write(0x180167, pack("v", goal));

        return this;
    }

    
    setGoalIcon(goal_icon = "triforce") { let byte;
        switch (goal_icon) {
            case "triforce":
                byte = pack("S*", 0x280E);
                break;
            case "star":
            default:
                byte = pack("S*", 0x280D);
                break;
        }
        this.write(0x180165, byte);

        return this;
    }

    
    setLimitProgressiveSword(limit = 4, item = 0x36) {
        this.write(0x180090, pack("C*", limit, item));

        return this;
    }

    
    setLimitProgressiveShield(limit = 3, item = 0x36) {
        this.write(0x180092, pack("C*", limit, item));

        return this;
    }

    
    setLimitProgressiveArmor(limit = 2, item = 0x36) {
        this.write(0x180094, pack("C*", limit, item));

        return this;
    }

    
    setLimitBottle(limit = 4, item = 0x36) {
        this.write(0x180096, pack("C*", limit, item));

        return this;
    }

    
    setLimitProgressiveBow(limit = 2, item = 0x36) {
        this.write(0x180098, pack("C*", limit, item));

        return this;
    }

    
    setGanonInvincible(setting = "no") { let byte;
        switch (setting) {
            case "crystals":
                byte = pack("C*", 0x03);
                break;
            case "dungeons":
                byte = pack("C*", 0x02);
                break;
            case "yes":
                byte = pack("C*", 0x01);
                break;
            case "crystals_only":
                byte = pack("C", 0x04);
                break;
            case "triforce_pieces":
                byte = pack("C", 0x05);
                break;
            case "lightspeed":
                // light world only, pull ped, kill aga 1
                byte = pack("C", 0x06);
                break;
            case "crystals_bosses":
                byte = pack("C", 0x07);
                break;
            case "bosses_only":
                byte = pack("C", 0x08);
                break;
            case "dungeons_no_agahnim":
                // all dungeons, aga 1 not required
                byte = pack("C", 0x09);
                break;
            case "completionist":
                // 100% collection rate, all dungeons
                byte = pack("C", 0x0B);
                break;
            case "no":
            default:
                byte = pack("C*", 0x00);
                break;
        }
        this.write(0x1801A8, byte);

        return this;
    }

    
    setHeartColors(color) { let byte;
        switch (color) {
            case "blue":
                byte = 0x01;
                break;
            case "green":
                byte = 0x02;
                break;
            case "yellow":
                byte = 0x03;
                break;
            case "red":
            default:
                byte = 0x00;
        }
        this.write(0x187020, pack("C*", byte));

        return this;
    }

    
    setText(key, string, ...flags) {
        this.text.setString(key, string, ...flags);

        return this;
    }

    
    writeText() {
        this.write(0xE0000, pack("C*", ...this.text.getByteArray()));
        return this;
    }

    
    setCredit(key, string, ...flags) {
        this.credits.updateCreditLine(key, 0, string);

        return this;
    }

    
    writeCredits() { let data;
        data = this.credits.getBinaryData();

        this.write(0x181500, pack("C*", ...data["data"]));
        this.write(0x76CC0, pack("S*", ...data["pointers"]));

        return this;
    }

    
    setMenuSpeed(menu_speed = "normal") { let fast, speed;
        fast = false;
        switch (menu_speed) {
            case "instant":
                speed = pack("C*", 0xE8);
                fast = true;
                break;
            case "fast":
                speed = pack("C*", 0x10);
                break;
            case "normal":
            default:
                speed = pack("C*", 0x08);
                break;
            case "slow":
                speed = pack("C*", 0x04);
                break;
        }
        this.write(0x180048, speed);
        this.write(0x6DD9A, pack("C*", fast ? 0x20 : 0x11));
        this.write(0x6DF2A, pack("C*", fast ? 0x20 : 0x12));
        this.write(0x6E0E9, pack("C*", fast ? 0x20 : 0x12));

        return this;
    }

    
    setQuickSwap(enable = false) {
        this.write(0x18004B, pack("C*", enable ? 0x01 : 0x00));

        return this;
    }

    
    setSmithyFreeTravel(enable = false) {
        this.write(0x18004C, pack("C*", enable ? 0x01 : 0x00));

        return this;
    }

    
    setProgrammable1(custom) {
        switch (custom) {
            case "bees":
                this.write(0x1D8000, pack(
                    "C*",
                    0xA9,
                    0x79,
                    0x22,
                    0x5D,
                    0xF6,
                    0x1D,
                    0x30,
                    0x14,
                    0xA5,
                    0x22,
                    0x99,
                    0x10,
                    0x0D,
                    0xA5,
                    0x23,
                    0x99,
                    0x30,
                    0x0D,
                    0xA5,
                    0x20,
                    0x99,
                    0x00,
                    0x0D,
                    0xA5,
                    0x21,
                    0x99,
                    0x20,
                    0x0D,
                    0x6B
                ));
                this.write(0x180061, pack("C*", 0x00, 0x80, 0x3B));

                break;
        }

        return this;
    }

    
    setRandomizerSeedType(setting) { let byte;
        switch (setting) {
            case "OverworldGlitches":
                byte = 0x02;
                break;
            case "MajorGlitches":
            case "HybridMajorGlitches":
                byte = 0x01;
                break;
            case "off":
                byte = 0xFF;
                break;
            case "NoGlitches":
            default:
                byte = 0x00;
        }

        this.write(0x180210, pack("C", byte));

        return this;
    }

    
    setGameType(setting) { let byte;
        switch (setting) {
            case "enemizer":
                byte = 0b00000101;

                break;
            case "entrance":
                byte = 0b00000110;

                break;
            case "room":
                byte = 0b00001000;

                break;
            case "item":
            default:
                byte = 0b00000100;
        }

        this.write(0x180211, pack("C", byte));

        return this;
    }

    
    setPlandomizerAuthor(name) {
        this.write(0x180220, utf8bytes(name).slice(0, 31));

        return this;
    }

    
    setTournamentType(setting) { let bytes;
        switch (setting) {
            case "standard":
                bytes = [0x01, 0x00];

                break;
            case "none":
            default:
                bytes = [0x00, 0x01];
        }

        this.write(0x180213, pack("C*", ...bytes));

        return this;
    }

    
    setStartScreenHash(bytes) {
        this.write(0x180215, pack("C*", ...array_pad(array_slice(bytes, 0, 5), 5, 0x00)));

        return this;
    }

    
    removeUnclesShield() {
        this.write(0x6D253, pack("C*", 0x00, 0x00, 0xf6, 0xff, 0x00, 0x0E));
        this.write(0x6D25B, pack("C*", 0x00, 0x00, 0xf6, 0xff, 0x00, 0x0E));
        this.write(0x6D283, pack("C*", 0x00, 0x00, 0xf6, 0xff, 0x00, 0x0E));
        this.write(0x6D28B, pack("C*", 0x00, 0x00, 0xf7, 0xff, 0x00, 0x0E));
        this.write(0x6D2CB, pack("C*", 0x00, 0x00, 0xf6, 0xff, 0x02, 0x0E));
        this.write(0x6D2FB, pack("C*", 0x00, 0x00, 0xf7, 0xff, 0x02, 0x0E));
        this.write(0x6D313, pack("C*", 0x00, 0x00, 0xe4, 0xff, 0x08, 0x0E));

        return this;
    }

    
    removeUnclesSword() {
        this.write(0x6D263, pack("C*", 0x00, 0x00, 0xf6, 0xff, 0x00, 0x0E));
        this.write(0x6D26B, pack("C*", 0x00, 0x00, 0xf6, 0xff, 0x00, 0x0E));
        this.write(0x6D293, pack("C*", 0x00, 0x00, 0xf6, 0xff, 0x00, 0x0E));
        this.write(0x6D29B, pack("C*", 0x00, 0x00, 0xf7, 0xff, 0x00, 0x0E));
        this.write(0x6D2B3, pack("C*", 0x00, 0x00, 0xf6, 0xff, 0x02, 0x0E));
        this.write(0x6D2BB, pack("C*", 0x00, 0x00, 0xf6, 0xff, 0x02, 0x0E));
        this.write(0x6D2E3, pack("C*", 0x00, 0x00, 0xf7, 0xff, 0x02, 0x0E));
        this.write(0x6D2EB, pack("C*", 0x00, 0x00, 0xf7, 0xff, 0x02, 0x0E));
        this.write(0x6D31B, pack("C*", 0x00, 0x00, 0xe4, 0xff, 0x08, 0x0E));
        this.write(0x6D323, pack("C*", 0x00, 0x00, 0xe4, 0xff, 0x08, 0x0E));

        return this;
    }

    
    setStunnedSpritePrize(sprite = 0xD9) {
        this.write(0x37993, pack("C*", sprite));

        return this;
    }

    
    setPowderedSpriteFairyPrize(sprite = 0xE3) {
        this.write(0x36DD0, pack("C*", sprite));

        return this;
    }

    
    setPullTreePrizes(low = 0xD9, mid = 0xDA, high = 0xDB) {
        this.write(0xEFBD4, pack("C*", low, mid, high));

        return this;
    }


    
    setRupeeCrabPrizes(main = 0xD9, final = 0xDB) {
        this.write(0x329C8, pack("C*", main));
        this.write(0x329C4, pack("C*", final));

        return this;
    }

    
    setFishSavePrize(prize = 0xDB) {
        this.write(0xE82CC, pack("C*", prize));

        return this;
    }

    
    setOverworldBonkPrizes(prizes = []) { let addresses, item;
        addresses = [
            0x4CF6C, 0x4CFBA, 0x4CFE0, 0x4CFFB, 0x4D018, 0x4D01B, 0x4D028, 0x4D03C,
            0x4D059, 0x4D07A, 0x4D09E, 0x4D0A8, 0x4D0AB, 0x4D0AE, 0x4D0BE, 0x4D0DD,
            0x4D16A, 0x4D1E5, 0x4D1EE, 0x4D20B, 0x4CBBF, 0x4CBBF, 0x4CC17, 0x4CC1A,
            0x4CC4A, 0x4CC4D, 0x4CC53, 0x4CC69, 0x4CC6F, 0x4CC7C, 0x4CCEF, 0x4CD51,
            0x4CDC0, 0x4CDC3, 0x4CDC6, 0x4CE37, 0x4D2DE, 0x4D32F, 0x4D355, 0x4D367,
            0x4D384, 0x4D387, 0x4D397, 0x4D39E, 0x4D3AB, 0x4D3AE, 0x4D3D1, 0x4D3D7,
            0x4D3F8, 0x4D416, 0x4D420, 0x4D423, 0x4D42D, 0x4D449, 0x4D48C, 0x4D4D9,
            0x4D4DC, 0x4D4E3, 0x4D504, 0x4D507, 0x4D55E, 0x4D56A,
        ];

        for (const address of __values(addresses)) {
            item = array_pop(prizes);
            this.write(address, pack("C*", item ?? 0x03));
        }

        return this;
    }

    
    setOverworldDigPrizes(prizes = []) {
        this.write(0x180100, pack("C*", ...prizes));

        return this;
    }

    
    setupCustomShops(shops) { let shop_data, items_data, shop_id, sram_offset;
        shops = shops.filter((shop) => {
            return shop.getActive();
        });

        shop_data = [];
        items_data = [];
        shop_id = 0x00;
        sram_offset = 0x00;
        for (const shop of __values(shops)) {
            if (shop_id == shops.count() - 1) {
                shop_id = 0xFF;
            }
            shop.writeExtraData(this);
            // @TODO: make this clever and reuse when inv is the exact same. (except take any's)
            shop_data = array_merge(shop_data, [shop_id], shop.getBytes(sram_offset));
            sram_offset += (shop instanceof Shop.TakeAny) ? 1 : count(shop.getInventory());

            if (sram_offset > 36) {
                throw new Error("Exceeded SRAM indexing for shops");
            }

            for (const item of __values(shop.getInventory())) {
                items_data = array_merge(
                    items_data,
                    [shop_id, item["id"]],
                    bytesOf(pack("S", item["price"] ?? 0)),
                    [item["max"] ?? 0, item["replace_id"] ?? 0xFF],
                    bytesOf(pack("S", item["replace_price"] ?? 0))
                );
            }
            ++shop_id;
        }
        this.write(0x184800, pack("C*", ...shop_data));

        items_data = array_merge(items_data, [0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
        this.write(0x184900, pack("C*", ...items_data));

        return this;
    }

    
    setRupeeArrow(enable = false) {
        this.write(0x30052, pack("C*", enable ? 0xDB : 0xE2)); // fish bottle merchant
        this.write(0x301FC, pack("C*", enable ? 0xDA : 0xE1)); // replace Pot rupees
        this.write(0xECB4E, enable ? pack("C*", 0xA9, 0x00, 0xEA, 0xEA) : pack("C*", 0xAF, 0x77, 0xF3, 0x7E)); // thief
        this.write(0xF0D96, enable ? pack("C*", 0xA9, 0x00, 0xEA, 0xEA) : pack("C*", 0xAF, 0x77, 0xF3, 0x7E)); // pikit
        this.write(0x180175, pack("C*", enable ? 0x01 : 0x00)); // enable mode
        this.write(0x180176, pack("S*", enable ? 0x0A : 0x00)); // wood cost
        this.write(0x180178, pack("S*", enable ? 0x32 : 0x00)); // silver cost
        this.write(0xEDA5, enable ? pack("C*", 0x35, 0x41) : pack("C*", 0x43, 0x44)); // DW chest game

        return this;
    }

    
    setMapRevealSahasrahla(reveals = 0x0000) {
        this.write(0x18017A, pack("S*", reveals));

        return this;
    }

    
    setMapRevealBombShop(reveals = 0x0000) {
        this.write(0x18017C, pack("S*", reveals));

        return this;
    }

    
    setRestrictFairyPonds(enable = true) {
        this.write(0x18017E, pack("C*", enable ? 0x01 : 0x00));

        return this;
    }

    
    setEscapeAssist(flags = 0x00) {
        this.write(0x18004D, pack("C*", flags));

        return this;
    }

    
    setEscapeFills(flags = 0x00, rupees = 300) {
        this.write(0x18004E, pack("C*", flags));
        this.write(0x180183, pack("S*", rupees));

        return this;
    }

    
    setUncleSpawnRefills(magic = 0x00, bombs = 0x00, arrows = 0x00) {
        this.write(0x180185, pack("C*", magic, bombs, arrows));

        return this;
    }

    
    setZeldaSpawnRefills(magic = 0x00, bombs = 0x00, arrows = 0x00) {
        this.write(0x180188, pack("C*", magic, bombs, arrows));

        return this;
    }

    
    setMantleSpawnRefills(magic = 0x00, bombs = 0x00, arrows = 0x00) {
        this.write(0x18018B, pack("C*", magic, bombs, arrows));

        return this;
    }

    
    setChancePrizes(prizes = null) {
        if (!prizes) {
            prizes = [
                // high stakes game
                0x47, 0x34, 0x46, 0x34, 0x46, 0x46, 0x34, 0x47,
                0x46, 0x47, 0x34, 0x46, 0x47, 0x34, 0x46, 0x47,
                // low stakes game
                0x34, 0x47, 0x41, 0x47, 0x41, 0x41, 0x47, 0x34,
                0x41, 0x34, 0x47, 0x41, 0x34, 0x47, 0x41, 0x34,
            ];
        }

        this.write(0xEED5, pack("C*", ...prizes)); // 32 bytes

        return this;
    }

    
    setGenericKeys(enable = false) {
        this.write(0x180172, pack("C*", enable ? 0x01 : 0x00));

        return this;
    }

    
    setSmithyQuickItemGive(enable = true) {
        this.write(0x180029, pack("C*", enable ? 0x01 : 0x00));

        return this;
    }

    
    setPyramidFairyChests(enable = true) {
        this.write(0x1FC16, enable
            ? pack("C*", 0xB1, 0xC6, 0xF9, 0xC9, 0xC6, 0xF9)
            : pack("C*", 0xA8, 0xB8, 0x3D, 0xD0, 0xB8, 0x3D));

        return this;
    }

    
    setHammerTablet(enable = false) {
        this.write(0x180044, pack("C*", enable ? 0x01 : 0x00));

        return this;
    }

    
    setHammerBarrier(enable = false) {
        this.write(0x18005D, pack("C*", enable ? 0x01 : 0x00));

        return this;
    }

    
    setCatchableFairies(enable = true) {
        this.write(0x34FD6, pack("C*", enable ? 0xF0 : 0x80));

        return this;
    }


    
    setStunItems(flags = 0x03) {
        this.write(0x180180, pack("C*", flags));

        return this;
    }

    
    setSilversOnlyAtGanon(enable = false) {
        this.write(0x180181, pack("C*", enable ? 0x01 : 0x00));

        return this;
    }

    
    setSilversEquip(setting) { let byte;
        switch (setting) {
            case "both":
                byte = 0x03;
                break;
            case "ganon":
                byte = 0x02;
                break;
            case "off":
                byte = 0x00;
                break;
            case "collection":
            default:
                byte = 0x01;
        }

        this.write(0x180182, pack("C*", byte));

        return this;
    }

    
    setCatchableBees(enable = true) {
        this.write(0xF5D73, pack("C*", enable ? 0xF0 : 0x80));
        this.write(0xF5F10, pack("C*", enable ? 0xF0 : 0x80));

        return this;
    }

    
    setWishingWellChests(enable = false) {
        // set item table to proper room
        this.write(0xE9AE, enable ? pack("C*", 0x14, 0x01) : pack("C*", 0x05, 0x00));
        this.write(0xE9CF, enable ? pack("C*", 0x14, 0x01) : pack("C*", 0x3D, 0x01));

        // room 276 remodel
        this.write(0x1F714, enable
            ? (base64_decode(
                "4QAQrA0pmgFYmA8RsWH8TYEg2gIs4WH8voFhsWJU2gL9jYNE4WL9HoMxpckxpGkxwCJNpGkxxvlJxvkQmaBcmaILmGAN6MBV6MALk"  + 
                    "gBzmGD+aQCYo2H+a4H+q4WpyGH+roH/aQLYo2L/a4P/K4fJyGL/LoP+oQCqIWH+poH/IQLKIWL/JoO7I/rDI/q7K/rDK/q7U/rDU/"  + 
                    "qwoD2YE8CYUsCIAGCQAGDoAGDwAGCYysDYysDYE8DYUsD8vYX9HYf/////8P+ALmEOgQ7//w=="
            ) || "")
            : (base64_decode(
                "4QAQrA0pmgFYmA8RsGH8TQEg0gL8vQUs4WH8voFhsGJU0gL9jQP9HQdE4WL9HoMxpckxpGkxwCJNpGkouD1QuD0QmaBcmaILmGAN4"  + 
                    "cBV4cALkgBzmGD+aQCYo2H+a4H+q4WpyGH+roH/aQLYo2L/a4P/K4fJyGL/LoP+oQCqIWH+poH/IQLKIWL/JoO7I/rDI/q7K/rDK/"  + 
                    "q7U/rDU/qwoD2YE8CYUsCIAGCQAGDoAGDwAGCYysDYysDYE8DYUsD/////8P+ALmEOgQ7//w=="
            ) || ""));

        return this;
    }

    
    setHyliaFairyShop(enable = false) {
        this.write(0x01F810, enable
            ? pack("C*", 0x1A, 0x1E, 0x01, 0x1A, 0x1E, 0x01)
            : pack("C*", 0xFC, 0x94, 0xE4, 0xFD, 0x34, 0xE4));

        return this;
    }

    
    setWishingWellUpgrade(enable = false) {
        this.write(0x348DB, pack("C*", enable ? 0x0C : 0x2A));
        this.write(0x348EB, pack("C*", enable ? 0x04 : 0x05));

        return this;
    }

    setGameState(state = null) {
        this.setFixFakeWorld(false);
        switch (state) {
            case "open":
            case "retro":
                return this.setOpenMode(true);
            case "inverted":
                return this.setInvertedMode(true);
            case "standard":
                return this.setStandardMode();
            default:
                return this;
        }
    }

    
    setOpenMode(enable = true) {
        this.setSewersLampCone(!enable);
        this.initial_sram.preOpenCastleGate();
        this.initial_sram.setProgressIndicator(0x02);
        this.initial_sram.setProgressFlags(0x14);
        this.initial_sram.setStartingEntrance(0x01);

        return this;
    }

    
    setStandardMode() {
        this.setSewersLampCone(true);
        this.initial_sram.setProgressIndicator(0x00);
        this.initial_sram.setProgressFlags(0x00);
        this.initial_sram.setStartingEntrance(0x00);

        return this;
    }

    
    setInvertedMode(enable = true) {
        // this mode is based on open mode ;)
        this.setOpenMode(enable);

        this.write(snes_to_pc(0x30804A), pack("C*", 0x01)); // ; main toggle
        this.write(snes_to_pc(0x0283E0), pack("C*", 0xF0)); // ; residual portal
        this.write(snes_to_pc(0x02B34D), pack("C*", 0xF0)); // ; residual portal
        this.write(snes_to_pc(0x06DB78), pack("C*", 0x8B)); // ; residual portal
        this.write(snes_to_pc(0x05AF79), pack("C*", 0xF0)); // ; vortex
        this.write(snes_to_pc(0x0DB3C5), pack("C*", 0xC6)); // ; vortex
        this.write(snes_to_pc(0x07A3F4), pack("C*", 0xF0)); // ; duck
        this.write(snes_to_pc(0x07A3F4), pack("C*", 0xF0)); // ; duck
        this.write(snes_to_pc(0x02E849), pack("S*", 0x0043, 0x0056, 0x0058, 0x006C, 0x006F, 0x0070, 0x007B, 0x007F, 0x001B)); // ; Dark World Flute Spots
        this.write(snes_to_pc(0x02E8D5), pack("S*", 0x07C8)); // ; nudge flute spot 3 out of gargoyle statue
        this.write(snes_to_pc(0x02E8F7), pack("S*", 0x01F8)); // ; nudge flute spot 3 out of gargoyle statue
        this.write(snes_to_pc(0x07A943), pack("C*", 0xF0)); // ; Dark to light world mirror
        this.write(snes_to_pc(0x07A96D), pack("C*", 0xD0)); // ; residual portal?
        this.write(snes_to_pc(0x08D40C), pack("C*", 0xD0)); // ; morph poof
        this.setFixFakeWorld(enable); // ; ER's Fix fake worlds fix. Currently needed for inverted

        // remove diggable light world portals
        this.write(snes_to_pc(0x1BC428), pack("C*", 0x00));
        this.write(snes_to_pc(0x1BC43A), pack("C*", 0x00));
        this.write(snes_to_pc(0x1BC590), pack("C*", 0x00));
        this.write(snes_to_pc(0x1BC5A1), pack("C*", 0x00));
        this.write(snes_to_pc(0x1BC5B1), pack("C*", 0x00));
        this.write(snes_to_pc(0x1BC5C7), pack("C*", 0x00));

        this.write(0x15B8C, pack("C", 0x6C)); // update link's house exit to be dark world (All the other exit table values can be reused)
        this.write(0xDBB73 + 0x00, pack("C", 0x53)); // entering links house door leads to bomb shop
        this.write(0xDBB73 + 0x52, pack("C", 0x01)); // entering bomb shop leads to links house

        // swap GT and AT entrances
        this.write(0xDBB73 + 0x23, pack("C", 0x37)); // entering AT Door Leads to GT
        this.write(0xDBB73 + 0x36, pack("C", 0x24)); // entering GT Door Leads to AT
        this.write(0x15AEE + 2 * 0x38, pack("S*", 0x00e0)); // exiting AT leads to GT
        this.write(0x15AEE + 2 * 0x25, pack("S*", 0x000c)); // exiting GT leads to AT

        // Bumper Cave (Bottom) => Old Man Cave (West)
        this.write(0xDBB73 + 0x15, pack("C", 0x06));
        this.write(0x15AEE + 2 * 0x17, pack("S*", 0x00F0));

        // Old Man Cave (West) => Bumper Cave (Bottom)
        this.write(0xDBB73 + 0x05, pack("C", 0x16));
        this.write(0x15AEE + 2 * 0x07, pack("S*", 0x00FB));

        // Death Mountain Return Cave (West) => Bumper Cave (Top)
        this.write(0xDBB73 + 0x2D, pack("C", 0x17));
        this.write(0x15AEE + 2 * 0x2F, pack("S*", 0x00EB));

        // Old Man Cave (East) => Death Mountain Return Cave (West)
        this.write(0xDBB73 + 0x06, pack("C", 0x2E));
        this.write(0x15AEE + 2 * 0x08, pack("S*", 0x00e6));

        // Bumper Cave (Top) => Dark Death Mountain Fairy
        this.write(0xDBB73 + 0x16, pack("C", 0x5E));

        // fix trock doors for reverse entrances
        this.write(0xFED31, pack("C", 0x0E)); // preopen bombable exit
        this.write(0xFEE41, pack("C", 0x0E)); // preopen bombable exit

        // Dark Death Mountain Healer Fairy => Old Man Cave (East)
        this.write(0xDBB73 + 0x6F, pack("C", 0x07));
        this.write(0x15AEE + 2 * 0x18, pack("S*", 0x00f1));
        this.write(0x15B8C + 0x18, pack("C", 0x43));
        this.write(0x15BDB + 2 * 0x18, pack("S*", 0x1400));
        this.write(0x15C79 + 2 * 0x18, pack("S*", 0x0294));
        this.write(0x15D17 + 2 * 0x18, pack("S*", 0x0600));
        this.write(0x15DB5 + 2 * 0x18, pack("S*", 0x02e8));
        this.write(0x15E53 + 2 * 0x18, pack("S*", 0x0678));
        this.write(0x15EF1 + 2 * 0x18, pack("S*", 0x0303));
        this.write(0x15F8F + 2 * 0x18, pack("S*", 0x0685));
        this.write(0x1602D + 0x18, pack("C", 0x0a));
        this.write(0x1607C + 0x18, pack("C", 0xf6));
        this.write(0x160CB + 2 * 0x18, pack("S*", 0x0000));
        this.write(0x16169 + 2 * 0x18, pack("S*", 0x0000));

        // Pyramid Exit <= Houlihan
        this.write(0x15AEE + 2 * 0x3D, pack("S*", 0x0003));
        this.write(0x15B8C + 0x3D, pack("C", 0x5b));
        this.write(0x15BDB + 2 * 0x3D, pack("S*", 0x0b0e));
        this.write(0x15C79 + 2 * 0x3D, pack("S*", 0x075a));
        this.write(0x15D17 + 2 * 0x3D, pack("S*", 0x0674));
        this.write(0x15DB5 + 2 * 0x3D, pack("S*", 0x07a8));
        this.write(0x15E53 + 2 * 0x3D, pack("S*", 0x06e8));
        this.write(0x15EF1 + 2 * 0x3D, pack("S*", 0x07c7));
        this.write(0x15F8F + 2 * 0x3D, pack("S*", 0x06f3));
        this.write(0x1602D + 0x3D, pack("C", 0x06));
        this.write(0x1607C + 0x3D, pack("C", 0xfa));
        this.write(0x160CB + 2 * 0x3D, pack("S*", 0x0000));
        this.write(0x16169 + 2 * 0x3D, pack("S*", 0x0000));

        // Change sanc spawn point to dark sanc
        this.write(snes_to_pc(0x02D8D4), pack("S*", 0x112));
        this.write(snes_to_pc(0x02D8E8), pack("C*", 0x22, 0x22, 0x22, 0x23, 0x04, 0x04, 0x04, 0x05));
        this.write(snes_to_pc(0x02D91A), pack("S*", 0x0400));
        this.write(snes_to_pc(0x02D928), pack("S*", 0x222e));
        this.write(snes_to_pc(0x02D936), pack("S*", 0x229a));
        this.write(snes_to_pc(0x02D944), pack("S*", 0x0480));
        this.write(snes_to_pc(0x02D952), pack("S*", 0x00a5));
        this.write(snes_to_pc(0x02D960), pack("S*", 0x007F));
        this.write(snes_to_pc(0x02D96D), pack("C", 0x14));
        this.write(snes_to_pc(0x02D974), pack("C", 0x00));
        this.write(snes_to_pc(0x02D97B), pack("C", 0xFF));
        this.write(snes_to_pc(0x02D982), pack("C", 0x00));
        this.write(snes_to_pc(0x02D989), pack("C", 0x02));
        this.write(snes_to_pc(0x02D990), pack("C", 0x00));
        this.write(snes_to_pc(0x02D998), pack("S*", 0x0000));
        this.write(snes_to_pc(0x02D9A6), pack("S*", 0x005A));
        this.write(snes_to_pc(0x02D9B3), pack("C", 0x12));

        // Write dark sanc exit data to StartingAreaExitTable table
        this.write(0x180250, pack("S*", 0x0112)  +  pack("C", 0x53)
             +  pack("S*", 0x001e, 0x0400, 0x06e2, 0x0446, 0x0758, 0x046d, 0x075f)
             +  pack("C*", 0x00, 0x00, 0x00));

        // Write to StartingAreaExitOffset table to indicate that dark sanc spawn uses first row in table
        this.write(0x180240, pack("C*", 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00));

        this.write(snes_to_pc(0x308350), pack("C*", 0x00, 0x00, 0x01)); // Death mountain cave should start on overworld

        // Change old man spawn point to End of old man cave
        this.write(snes_to_pc(0x02D8DE), pack("S*", 0x00F1));
        this.write(snes_to_pc(0x02D910), pack("C*", 0x1F, 0x1E, 0x1F, 0x1F, 0x03, 0x02, 0x03, 0x03));
        this.write(snes_to_pc(0x02D924), pack("S*", 0x0300));
        this.write(snes_to_pc(0x02D932), pack("S*", 0x1F10));
        this.write(snes_to_pc(0x02D940), pack("S*", 0x1FC0));
        this.write(snes_to_pc(0x02D94E), pack("S*", 0x0378));
        this.write(snes_to_pc(0x02D95C), pack("S*", 0x0187));
        this.write(snes_to_pc(0x02D96A), pack("S*", 0x017F));
        this.write(snes_to_pc(0x02D972), pack("C", 0x06));
        this.write(snes_to_pc(0x02D979), pack("C", 0x00));
        this.write(snes_to_pc(0x02D980), pack("C", 0xFF));
        this.write(snes_to_pc(0x02D987), pack("C", 0x00));
        this.write(snes_to_pc(0x02D98E), pack("C", 0x22));
        this.write(snes_to_pc(0x02D995), pack("C", 0x12));
        this.write(snes_to_pc(0x02D9A2), pack("S*", 0x0000));
        this.write(snes_to_pc(0x02D9B0), pack("S*", 0x0007));
        this.write(snes_to_pc(0x02D9B8), pack("C", 0x12));

        // Write to StartingAreaOverworldDoor table to indicate the overworld door being used for
        // the single entrance spawn point
        this.write(0x180247, pack("C*", 0x00, 0x5A, 0x00, 0x00, 0x00, 0x00, 0x00));

        // aga tower exit/ pyramid spawn (now hyrule castle ledge spawn)
        this.write(0x15AEE + 2 * 0x06, pack("S", 0x0020));
        this.write(0x15B8C + 0x06, pack("C", 0x1B));
        this.write(0x15BDB + 2 * 0x06, pack("S", 0x00AE));
        this.write(0x15C79 + 2 * 0x06, pack("S", 0x0610));
        this.write(0x15D17 + 2 * 0x06, pack("S", 0x077E));
        this.write(0x15DB5 + 2 * 0x06, pack("S", 0x0672));
        this.write(0x15E53 + 2 * 0x06, pack("S", 0x07F8));
        this.write(0x15EF1 + 2 * 0x06, pack("S", 0x067D));
        this.write(0x15F8F + 2 * 0x06, pack("S", 0x0803));
        this.write(0x1602D + 0x06, pack("C", 0x00));
        this.write(0x1607C + 0x06, pack("C", 0xf2));
        this.write(0x160CB + 2 * 0x06, pack("S", 0x0000));
        this.write(0x16169 + 2 * 0x06, pack("S", 0x0000));

        // move flute spot 9 (notice that the values of this match the 2nd, 3rd etc value of hyrule castle spawn)
        this.write(snes_to_pc(0x02E87B), pack("S", 0x00ae));
        this.write(snes_to_pc(0x02E89D), pack("S", 0x0610));
        this.write(snes_to_pc(0x02E8BF), pack("S", 0x077e));
        this.write(snes_to_pc(0x02E8E1), pack("S", 0x0672));
        this.write(snes_to_pc(0x02E903), pack("S", 0x07f8));
        this.write(snes_to_pc(0x02E925), pack("S", 0x067d));
        this.write(snes_to_pc(0x02E947), pack("S", 0x0803));
        this.write(snes_to_pc(0x02E969), pack("S", 0x0000));
        this.write(snes_to_pc(0x02E98B), pack("S", 0xFFF2));

        this.write(snes_to_pc(0x1AF696), pack("C", 0xF0)); // Bat X position (sprite_retreat_bat.asm:130)
        this.write(snes_to_pc(0x1AF6B2), pack("C", 0x33)); // Bat Delay (sprite_retreat_bat.asm:136)

        // New Hole Mask Position
        this.write(snes_to_pc(0x1AF730), pack(
            "C*",
            0x6A,
            0x9E,
            0x0C,
            0x00,
            0x7A,
            0x9E,
            0x0C,
            0x00,
            0x8A,
            0x9E,
            0x0C,
            0x00,
            0x6A,
            0xAE,
            0x0C,
            0x00,
            0x7A,
            0xAE,
            0x0C,
            0x00,
            0x8A,
            0xAE,
            0x0C,
            0x00,
            0x67,
            0x97,
            0x0C,
            0x00,
            0x8D,
            0x97,
            0x0C,
            0x00
        ));

        // redefine some map16 tiles
        this.write(snes_to_pc(0x0FF1C8), pack(
            "S*",
            0x190F,
            0x190F,
            0x190F,
            0x194C,
            0x190F,
            0x194B,
            0x190F,
            0x195C,
            0x594B,
            0x194C,
            0x19EE,
            0x19EE,
            0x194B,
            0x19EE,
            0x19EE,
            0x19EE,
            0x594B,
            0x190F,
            0x595C,
            0x190F,
            0x190F,
            0x195B,
            0x190F,
            0x190F,
            0x19EE,
            0x19EE,
            0x195C,
            0x19EE,
            0x19EE,
            0x19EE,
            0x19EE,
            0x595C,
            0x595B,
            0x190F,
            0x190F,
            0x190F
        ));

        // Redefine more map16 tiles
        this.write(snes_to_pc(0x0FA480), pack("S*", 0x190F, 0x196B, 0x9D04, 0x9D04, 0x196B, 0x190F, 0x9D04, 0x9D04));

        // update pyramid hole entrances
        this.write(snes_to_pc(0x1bb810), pack("S*", 0x00BE, 0x00C0, 0x013E));
        this.write(snes_to_pc(0x1bb836), pack("S*", 0x001B, 0x001B, 0x001B));

        // add an extra pyramid hole entrance
        this.write(snes_to_pc(0x308300), pack("S", 0x0140)); // ExtraHole_Map16
        this.write(snes_to_pc(0x308320), pack("S", 0x001B)); // ExtraHole_Area
        this.write(snes_to_pc(0x308340), pack("C", 0x7B)); // ExtraHole_Entrance

        // prioritize retreat Bat and use 3rd sprite group
        this.write(snes_to_pc(0x1af504), pack("S", 0x148B));
        this.write(snes_to_pc(0x1af50c), pack("S", 0x149B));
        this.write(snes_to_pc(0x1af514), pack("S", 0x14A4));
        this.write(snes_to_pc(0x1af51c), pack("S", 0x1489));
        this.write(snes_to_pc(0x1af524), pack("S", 0x14AC));
        this.write(snes_to_pc(0x1af52c), pack("S", 0x54AC));
        this.write(snes_to_pc(0x1af534), pack("S", 0x148C));
        this.write(snes_to_pc(0x1af53c), pack("S", 0x548C));
        this.write(snes_to_pc(0x1af544), pack("S", 0x1484));
        this.write(snes_to_pc(0x1af54c), pack("S", 0x5484));
        this.write(snes_to_pc(0x1af554), pack("S", 0x14A2));
        this.write(snes_to_pc(0x1af55c), pack("S", 0x54A2));
        this.write(snes_to_pc(0x1af564), pack("S", 0x14A0));
        this.write(snes_to_pc(0x1af56c), pack("S", 0x54A0));
        this.write(snes_to_pc(0x1af574), pack("S", 0x148E));
        this.write(snes_to_pc(0x1af57c), pack("S", 0x548E));
        this.write(snes_to_pc(0x1af584), pack("S", 0x14AE));
        this.write(snes_to_pc(0x1af58c), pack("S", 0x54AE));

        // Make retreat bat gfx available in Hyrule castle.
        this.write(snes_to_pc(0x00DB9D), pack("C", 0x1A)); // sprite set 1, section 3
        this.write(snes_to_pc(0x00DC09), pack("C", 0x1A)); // sprite set 27, section 3

        // use new castle hole graphics (The values are the SNES address of the graphics: 31e000)
        this.write(snes_to_pc(0x00D009), pack("C", 0x31));
        this.write(snes_to_pc(0x00D0e8), pack("C", 0xE0));
        this.write(snes_to_pc(0x00D1c7), pack("C", 0x00));
        this.write(snes_to_pc(0x1BE8DA), pack("S", 0x39AD)); // add color for shading for castle hole

        this.write(0x180169, pack("C", 0x02)); // lock aga door
        this.write(0xF6E58, pack("C", 0x80)); // don't allow "whirlpool" under castle gate

        // Turtle rock tail
        this.write(0x0086E, pack("C*", 0x5C, 0x00, 0xA0, 0xA1)); // JML.l $A1A000 (a.k.a. JML.l InvertedTileAttributeLookup)

        // Add warps under rocks, etc.
        this.write(snes_to_pc(0x1BC67A), pack("C*", 0x2E, 0x0B, 0x82)); // Replace a rupee under bush to add a warp on map 80 (top of kak)
        this.write(snes_to_pc(0x1BC81E), pack("C*", 0x94, 0x1D, 0x82)); // Replace a heart under bush to add a warp on map 120 (mire)
        this.write(snes_to_pc(0x1BC655), pack("C*", 0x4A, 0x1D, 0x82)); // Replace a bomb :( under bush to add a warp on map 78 (DM)
        this.write(snes_to_pc(0x1BC80D), pack("C*", 0xB2, 0x0B, 0x82)); // map 111
        this.write(snes_to_pc(0x1BC3DF), pack("C*", 0xD8, 0xD1)); // new pointer for map 115 no items to replace
        this.write(snes_to_pc(0x1BD1D8), pack("C*", 0xA8, 0x02, 0x82, 0xFF, 0xFF)); // new data for map115
        this.write(snes_to_pc(0x1BC85A), pack("C*", 0x50, 0x0F, 0x82));

        // move pyramid exit overworld door
        this.write(0xDB96F + 2 * 0x35, pack("S", 0x001B));
        this.write(0xDBA71 + 2 * 0x35, pack("S", 0x06A4));
        this.write(0xDBB73 + 0x35, pack("C", 0x36));

        // Remove Hyrule Castle Gate warp
        this.write(snes_to_pc(0x09D436), pack("C", 0xF3)); // replace whirlpool with (harmless) SpritePositionTarget Overlord

        // Pyramid exits to new hyrule castle area
        this.write(0x15AEE + 2 * 0x37, pack("S", 0x0010));
        this.write(0x15B8C + 0x37, pack("C", 0x1B));
        this.write(0x15BDB + 2 * 0x37, pack("S", 0x0418));
        this.write(0x15C79 + 2 * 0x37, pack("S", 0x0679));
        this.write(0x15D17 + 2 * 0x37, pack("S", 0x06B4));
        this.write(0x15DB5 + 2 * 0x37, pack("S", 0x06C6));
        this.write(0x15E53 + 2 * 0x37, pack("S", 0x0728));
        this.write(0x15EF1 + 2 * 0x37, pack("S", 0x06E6));
        this.write(0x15F8F + 2 * 0x37, pack("S", 0x0733));
        this.write(0x1602D + 0x37, pack("C", 0x07));
        this.write(0x1607C + 0x37, pack("C", 0xf9));
        this.write(0x160CB + 2 * 0x37, pack("S", 0x0000));
        this.write(0x16169 + 2 * 0x37, pack("S", 0x0000));
        this.write(snes_to_pc(0x1BC387), pack("C*", 0xDD, 0xD1)); // New pointer for map 71 no items to replace
        this.write(snes_to_pc(0x1BD1DD), pack("C*", 0xA4, 0x06, 0x82, 0x9E, 0x06, 0x82, 0xFF, 0xFF)); // new data for map 71

        this.write(0x180089, pack("C", 0x01)); // open TR main entrance on exiting

        this.write(snes_to_pc(0x0ABFBB), pack("C", 0x90)); // move mirror portal indicator to correct map (0xB0 normally)

        this.write(snes_to_pc(0x0280A6), pack("C", 0xD0)); // Spawn logic

        this.write(snes_to_pc(0x06B2AB), pack("C*", 0xF0, 0xE1, 0x05)); // frog pickup on contact

        this.text.setString("sign_path_to_death_mountain", "→ Bumper Cave\nYou need Cape and Mirror, but not Hookshot");
        this.text.setString("sign_bumper_cave", "Cave to lost, old man.\nGood luck.");
        this.text.setString("sign_east_of_bomb_shop", "\n← Your House");
        this.text.setString("sign_east_of_links_house", "\n← Bomb Shoppe");
        this.text.setString("kiki_leaving_screen", "{NOTEXT}", false);
        this.text.setString("dark_sanctuary", "{NOTEXT}", false);
        this.text.setString("dark_sanctuary_yes", "{NOTEXT}", false);
        this.text.setString("dark_sanctuary_no", "If you want that healing you're gonna need 20 rupees.");

        this.text.setString("menu_start_2", "{MENU}\n{SPEED0}\n≥@'s House\n Dark Chapel\n{CHOICE3}", false);
        this.text.setString("menu_start_3", "{MENU}\n{SPEED0}\n≥@'s House\n Dark Chapel\n Dark Mountain\n{CHOICE2}", false);

        this.text.setString("intro_main", "{INTRO}\n Episode  III\n{PAUSE3}\n A Link to\n   the Past\n"
             +  "{PAUSE3}\nInverted\n  Randomizer\n{PAUSE3}\nAfter mostly disregarding what happened in the first two games,\n"
             +  "{PAUSE3}\nLink has been transported to the Dark World\n{PAUSE3}\nWhile he was slumbering,\n"
             +  "{PAUSE3}\nWhatever will happen?\n{PAUSE3}\n{CHANGEPIC}\nGanon has moved around all the items in Hyrule.\n"
             +  "{PAUSE7}\nYou will have to find all the items necessary to beat Ganon.\n"
             +  "{PAUSE7}\nThis is your chance to be a hero.\n{PAUSE3}\n{CHANGEPIC}\n"
             +  "You must get the 7 crystals to beat Ganon.\n{PAUSE9}\n{CHANGEPIC}", false);

        return this;
    }

    
    setMapMode(require_map = false) {
        this.write(0x18003B, pack("C*", require_map ? 0x01 : 0x00));

        return this;
    }

    
    setCompassMode(setting = "off") { let byte;
        switch (setting) {
            case "on":
                byte = 0x02;
                break;
            case "pickup":
                byte = 0x01;
                break;
            case "off":
            default:
                byte = 0x00;
        }

        this.write(0x18003C, pack("C", byte));

        return this;
    }

    
    setBallNChainDungeon(dungeon_id) {
        this.write(0x186FFF, pack("C", dungeon_id));

        return this;
    }

    
    setCompassCountTotals(totals = []) { let default_, compass_counts;
        default_ = [0x08, 0x08, 0x06, 0x06, 0x02, 0x0A, 0x0E, 0x08, 0x08, 0x08, 0x06, 0x08, 0x0C, 0x1B, 0x00, 0x00];
        compass_counts = php_empty(totals) ? default_ : totals;
        this.write(0x187000, pack("C*", ...compass_counts));

        return this;
    }

    
    setFreeItemTextMode(bit_field = 0x00) {
        this.write(0x18016A, pack("C*", bit_field));

        return this;
    }

    
    setFreeItemMenu(flags = 0x00) {
        this.write(0x180045, pack("C*", flags));

        return this;
    }

    
    setSwordlessMode(enable = false) {
        this.write(0x18003F, pack("C*", enable ? 0x01 : 0x00)); // Hammer Ganon
        this.write(0x180041, pack("C*", enable ? 0x01 : 0x00)); // Swordless Medallions
        this.setHammerTablet(enable);
        this.setHammerBarrier(false);
        if (enable === true) {
            this.initial_sram.setSwordlessCurtains();
        }

        return this;
    }

    
    setSewersLampCone(enable = true) {
        this.write(0x180038, pack("C*", enable ? 0x01 : 0x00));

        return this;
    }


    
    setMirrorlessSaveAndQuitToLightWorld(enable = true) {
        this.write(0x1800A0, pack("C*", enable ? 0x01 : 0x00));

        return this;
    }

    
    setMysteryMasking(enable = true) {
        if (enable) {
            this.text.setString("intro_main", "{INTRO}\n Episode  III\n{PAUSE3}\n A Link to\n   the Past\n"
                 +  "{PAUSE3}\n  Randomizer\n{PAUSE3}\nAfter mostly disregarding what happened in the first two games.\n"
                 +  "{PAUSE3}\nLink awakens to his uncle leaving the house.\n{PAUSE3}\nHe just runs out the door,\n"
                 +  "{PAUSE3}\ninto the rainy night.\n{PAUSE3}\n{CHANGEPIC}\nGanon has moved around all the items in Hyrule.\n"
                 +  "{PAUSE7}\nYou will have to find all the items necessary to beat Ganon.\n"
                 +  "{PAUSE7}\nThis is your chance to be a hero.\n{PAUSE3}\n{CHANGEPIC}\n"
                 +  "You must get the 7 crystals to beat Ganon.\n{PAUSE9}\n{CHANGEPIC}", false);
        }

        return this;
    }

    
    setSaveAndQuitFromBossRoom(enable = false) {
        this.write(0x180042, pack("C*", enable ? 0x01 : 0x00));

        return this;
    }

    
    setSwampWaterLevel(enable = true) {
        this.write(0x1800A1, pack("C*", enable ? 0x01 : 0x00));

        return this;
    }

    
    setPreAgahnimDarkWorldDeathInDungeon(enable = true) {
        this.write(0x1800A2, pack("C*", enable ? 0x01 : 0x00));

        return this;
    }

    
    setWorldOnAgahnimDeath(enable = true) {
        this.write(0x1800A3, pack("C*", enable ? 0x01 : 0x00));

        return this;
    }

    
    setSQEGFix(enable = true) {
        this.write(0x1800A4, pack("C*", enable ? 0x01 : 0x00));

        return this;
    }

    
    setAllowAccidentalMajorGlitch(enable = true) {
        this.write(0x180358, pack("C*", enable ? 0x01 : 0x00));

        return this;
    }

    
    setLockAgahnimDoorInEscape(enable = true) {
        this.write(0x180169, pack("C*", enable ? 0x01 : 0x00));

        return this;
    }

    
    setFixFakeWorld(enable = false) {
        this.write(0x180174, pack("C*", enable ? 0x01 : 0x00));

        return this;
    }

    
    setGanonAgahnimRng(setting = "table") { let byte;
        switch (setting) {
            case "none":
                byte = 0x01;
                break;
            case "vanilla":
            case "table":
            default:
                byte = 0x00;
        }

        this.write(0x180086, pack("C", byte));

        return this;
    }

    
    setTowerCrystalRequirement(crystals = 7) {
        this.write(0x18019A, pack("C", max(min(crystals, 7), 0)));

        return this;
    }

    
    setGanonCrystalRequirement(crystals = 7) {
        this.write(0x1801A6, pack("C", max(min(crystals, 7), 0)));

        return this;
    }

    
    setPseudoBoots(enable = false) {
        this.write(0x18008E, pack("C*", enable ? 0x01 : 0x00));

        return this;
    }

    
    setSeedString(seed) {
        this.write(0x7FC0, utf8bytes(seed).slice(0, 21));

        return this;
    }

    
    writeRNGBlock(random) { let string, i;
        string = "";
        for (i = 0; i < 1024; i++) {
            string += pack("C*", random());
        }
        this.write(0x178000, string);

        return this;
    }

    
    setWarningFlags(flags) {
        this.write(0x180212, pack("C*", flags));

        return this;
    }

    
    muteMusic(enable = true) {
        this.write(0x18021A, pack("C", enable ? 0x01 : 0x00));

        return this;
    }

    
    writeInitialSram() {
        this.write(0x183000, pack("C*", ...this.initial_sram.getInitialSram()));

        return this;
    }

    
    setTotalItemCount(count) {
        this.write(0x180196, pack("v", count));

        return this;
    }

    
    setZeldaMirrorFix(enable = true) {
        this.write(0x159A8, pack("C*", enable ? 0x04 : 0x02));

        return this;
    }

    
    enableFastRom(enable = true) {
        this.write(0x187032, pack("C*", enable ? 0x01 : 0x00));

        return this;
    }

    
    applyPatch(patch) {
        for (const part of patch) {
            for (const [address, data] of Object.entries(part)) {
                this.write(Number(address), data, false);
            }
        }
        return this;
    }

    


    
    rummageTable() {
        throw new Error("tournament rummage table not supported");
    }

    


    
    // data: binary string (from pack) or array of byte values
    write(offset, data, log = true) {
        offset = Number(offset);
        if (typeof data === 'string') {
            for (let i = 0; i < data.length; i++) {
                const b = data.charCodeAt(i);
                if (b > 0xFF) throw new Error('non-binary string written to ROM');
                this.data[offset + i] = b;
                this.written[offset + i] = 1;
            }
        } else {
            for (let i = 0; i < data.length; i++) {
                this.data[offset + i] = Number(data[i]) & 0xFF;
                this.written[offset + i] = 1;
            }
        }
        return this;
    }

    
    // merged write log as [{offset: [bytes...]}, ...] (like patch_merge_minify)
    getWriteLog() {
        const out = [];
        let i = 0;
        while (i < Rom.SIZE) {
            if (!this.written[i]) { i++; continue; }
            const start = i;
            while (i < Rom.SIZE && this.written[i]) i++;
            out.push({ [start]: Array.from(this.data.subarray(start, i)) });
        }
        return out;
    }

    
    read(offset, length = 1) {
        if (length === 1) return this.data[offset];
        return Array.from(this.data.subarray(offset, offset + length));
    }

    
    readByte(offset) {
        return this.data[offset] ?? 0x00;
    }

    

}
