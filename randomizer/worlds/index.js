// World definitions (port of app/World/{Standard,Open,Inverted,Retro}.php, alttp_vt_randomizer, MIT)
import { World } from '../core/world.js';
import { East as Inverted_DarkWorld_DeathMountain_East } from '../regions/Inverted/DarkWorld/DeathMountain/East.js';
import { West as Inverted_DarkWorld_DeathMountain_West } from '../regions/Inverted/DarkWorld/DeathMountain/West.js';
import { Mire as Inverted_DarkWorld_Mire } from '../regions/Inverted/DarkWorld/Mire.js';
import { NorthEast as Inverted_DarkWorld_NorthEast } from '../regions/Inverted/DarkWorld/NorthEast.js';
import { NorthWest as Inverted_DarkWorld_NorthWest } from '../regions/Inverted/DarkWorld/NorthWest.js';
import { South as Inverted_DarkWorld_South } from '../regions/Inverted/DarkWorld/South.js';
import { DesertPalace as Inverted_DesertPalace } from '../regions/Inverted/DesertPalace.js';
import { EasternPalace as Inverted_EasternPalace } from '../regions/Inverted/EasternPalace.js';
import { GanonsTower as Inverted_GanonsTower } from '../regions/Inverted/GanonsTower.js';
import { HyruleCastleEscape as Inverted_HyruleCastleEscape } from '../regions/Inverted/HyruleCastleEscape.js';
import { HyruleCastleTower as Inverted_HyruleCastleTower } from '../regions/Inverted/HyruleCastleTower.js';
import { IcePalace as Inverted_IcePalace } from '../regions/Inverted/IcePalace.js';
import { East as Inverted_LightWorld_DeathMountain_East } from '../regions/Inverted/LightWorld/DeathMountain/East.js';
import { West as Inverted_LightWorld_DeathMountain_West } from '../regions/Inverted/LightWorld/DeathMountain/West.js';
import { NorthEast as Inverted_LightWorld_NorthEast } from '../regions/Inverted/LightWorld/NorthEast.js';
import { NorthWest as Inverted_LightWorld_NorthWest } from '../regions/Inverted/LightWorld/NorthWest.js';
import { South as Inverted_LightWorld_South } from '../regions/Inverted/LightWorld/South.js';
import { MiseryMire as Inverted_MiseryMire } from '../regions/Inverted/MiseryMire.js';
import { PalaceOfDarkness as Inverted_PalaceOfDarkness } from '../regions/Inverted/PalaceOfDarkness.js';
import { SkullWoods as Inverted_SkullWoods } from '../regions/Inverted/SkullWoods.js';
import { SwampPalace as Inverted_SwampPalace } from '../regions/Inverted/SwampPalace.js';
import { ThievesTown as Inverted_ThievesTown } from '../regions/Inverted/ThievesTown.js';
import { TowerOfHera as Inverted_TowerOfHera } from '../regions/Inverted/TowerOfHera.js';
import { TurtleRock as Inverted_TurtleRock } from '../regions/Inverted/TurtleRock.js';
import { HyruleCastleEscape as Open_HyruleCastleEscape } from '../regions/Open/HyruleCastleEscape.js';
import { East as Standard_DarkWorld_DeathMountain_East } from '../regions/Standard/DarkWorld/DeathMountain/East.js';
import { West as Standard_DarkWorld_DeathMountain_West } from '../regions/Standard/DarkWorld/DeathMountain/West.js';
import { Mire as Standard_DarkWorld_Mire } from '../regions/Standard/DarkWorld/Mire.js';
import { NorthEast as Standard_DarkWorld_NorthEast } from '../regions/Standard/DarkWorld/NorthEast.js';
import { NorthWest as Standard_DarkWorld_NorthWest } from '../regions/Standard/DarkWorld/NorthWest.js';
import { South as Standard_DarkWorld_South } from '../regions/Standard/DarkWorld/South.js';
import { DesertPalace as Standard_DesertPalace } from '../regions/Standard/DesertPalace.js';
import { EasternPalace as Standard_EasternPalace } from '../regions/Standard/EasternPalace.js';
import { Fountains as Standard_Fountains } from '../regions/Standard/Fountains.js';
import { GanonsTower as Standard_GanonsTower } from '../regions/Standard/GanonsTower.js';
import { HyruleCastleEscape as Standard_HyruleCastleEscape } from '../regions/Standard/HyruleCastleEscape.js';
import { HyruleCastleTower as Standard_HyruleCastleTower } from '../regions/Standard/HyruleCastleTower.js';
import { IcePalace as Standard_IcePalace } from '../regions/Standard/IcePalace.js';
import { East as Standard_LightWorld_DeathMountain_East } from '../regions/Standard/LightWorld/DeathMountain/East.js';
import { West as Standard_LightWorld_DeathMountain_West } from '../regions/Standard/LightWorld/DeathMountain/West.js';
import { NorthEast as Standard_LightWorld_NorthEast } from '../regions/Standard/LightWorld/NorthEast.js';
import { NorthWest as Standard_LightWorld_NorthWest } from '../regions/Standard/LightWorld/NorthWest.js';
import { South as Standard_LightWorld_South } from '../regions/Standard/LightWorld/South.js';
import { Medallions as Standard_Medallions } from '../regions/Standard/Medallions.js';
import { MiseryMire as Standard_MiseryMire } from '../regions/Standard/MiseryMire.js';
import { PalaceOfDarkness as Standard_PalaceOfDarkness } from '../regions/Standard/PalaceOfDarkness.js';
import { SkullWoods as Standard_SkullWoods } from '../regions/Standard/SkullWoods.js';
import { SwampPalace as Standard_SwampPalace } from '../regions/Standard/SwampPalace.js';
import { ThievesTown as Standard_ThievesTown } from '../regions/Standard/ThievesTown.js';
import { TowerOfHera as Standard_TowerOfHera } from '../regions/Standard/TowerOfHera.js';
import { TurtleRock as Standard_TurtleRock } from '../regions/Standard/TurtleRock.js';

export class Standard extends World {
  static isStandard = true;
  buildRegions() {
    return {
      'North East Light World': new Standard_LightWorld_NorthEast(this),
      'North West Light World': new Standard_LightWorld_NorthWest(this),
      'South Light World': new Standard_LightWorld_South(this),
      'Escape': new Standard_HyruleCastleEscape(this),
      'Eastern Palace': new Standard_EasternPalace(this),
      'Desert Palace': new Standard_DesertPalace(this),
      'West Death Mountain': new Standard_LightWorld_DeathMountain_West(this),
      'East Death Mountain': new Standard_LightWorld_DeathMountain_East(this),
      'Tower of Hera': new Standard_TowerOfHera(this),
      'Hyrule Castle Tower': new Standard_HyruleCastleTower(this),
      'East Dark World Death Mountain': new Standard_DarkWorld_DeathMountain_East(this),
      'West Dark World Death Mountain': new Standard_DarkWorld_DeathMountain_West(this),
      'North East Dark World': new Standard_DarkWorld_NorthEast(this),
      'North West Dark World': new Standard_DarkWorld_NorthWest(this),
      'South Dark World': new Standard_DarkWorld_South(this),
      'Mire': new Standard_DarkWorld_Mire(this),
      'Palace of Darkness': new Standard_PalaceOfDarkness(this),
      'Swamp Palace': new Standard_SwampPalace(this),
      'Skull Woods': new Standard_SkullWoods(this),
      'Thieves Town': new Standard_ThievesTown(this),
      'Ice Palace': new Standard_IcePalace(this),
      'Misery Mire': new Standard_MiseryMire(this),
      'Turtle Rock': new Standard_TurtleRock(this),
      'Ganons Tower': new Standard_GanonsTower(this),
      'Medallions': new Standard_Medallions(this),
      'Fountains': new Standard_Fountains(this),
    };
  }
}

export class Open extends World {
  buildRegions() {
    return {
      'North East Light World': new Standard_LightWorld_NorthEast(this),
      'North West Light World': new Standard_LightWorld_NorthWest(this),
      'South Light World': new Standard_LightWorld_South(this),
      'Escape': new Open_HyruleCastleEscape(this),
      'Eastern Palace': new Standard_EasternPalace(this),
      'Desert Palace': new Standard_DesertPalace(this),
      'West Death Mountain': new Standard_LightWorld_DeathMountain_West(this),
      'East Death Mountain': new Standard_LightWorld_DeathMountain_East(this),
      'Tower of Hera': new Standard_TowerOfHera(this),
      'Hyrule Castle Tower': new Standard_HyruleCastleTower(this),
      'East Dark World Death Mountain': new Standard_DarkWorld_DeathMountain_East(this),
      'West Dark World Death Mountain': new Standard_DarkWorld_DeathMountain_West(this),
      'North East Dark World': new Standard_DarkWorld_NorthEast(this),
      'North West Dark World': new Standard_DarkWorld_NorthWest(this),
      'South Dark World': new Standard_DarkWorld_South(this),
      'Mire': new Standard_DarkWorld_Mire(this),
      'Palace of Darkness': new Standard_PalaceOfDarkness(this),
      'Swamp Palace': new Standard_SwampPalace(this),
      'Skull Woods': new Standard_SkullWoods(this),
      'Thieves Town': new Standard_ThievesTown(this),
      'Ice Palace': new Standard_IcePalace(this),
      'Misery Mire': new Standard_MiseryMire(this),
      'Turtle Rock': new Standard_TurtleRock(this),
      'Ganons Tower': new Standard_GanonsTower(this),
      'Medallions': new Standard_Medallions(this),
      'Fountains': new Standard_Fountains(this),
    };
  }
}

export class Inverted extends World {
  static isInverted = true;
  buildRegions() {
    return {
      'North East Light World': new Inverted_LightWorld_NorthEast(this),
      'North West Light World': new Inverted_LightWorld_NorthWest(this),
      'South Light World': new Inverted_LightWorld_South(this),
      'Escape': new Inverted_HyruleCastleEscape(this),
      'Eastern Palace': new Inverted_EasternPalace(this),
      'Desert Palace': new Inverted_DesertPalace(this),
      'West Death Mountain': new Inverted_LightWorld_DeathMountain_West(this),
      'East Death Mountain': new Inverted_LightWorld_DeathMountain_East(this),
      'Tower of Hera': new Inverted_TowerOfHera(this),
      'Hyrule Castle Tower': new Inverted_HyruleCastleTower(this),
      'East Dark World Death Mountain': new Inverted_DarkWorld_DeathMountain_East(this),
      'West Dark World Death Mountain': new Inverted_DarkWorld_DeathMountain_West(this),
      'North East Dark World': new Inverted_DarkWorld_NorthEast(this),
      'North West Dark World': new Inverted_DarkWorld_NorthWest(this),
      'South Dark World': new Inverted_DarkWorld_South(this),
      'Mire': new Inverted_DarkWorld_Mire(this),
      'Palace of Darkness': new Inverted_PalaceOfDarkness(this),
      'Swamp Palace': new Inverted_SwampPalace(this),
      'Skull Woods': new Inverted_SkullWoods(this),
      'Thieves Town': new Inverted_ThievesTown(this),
      'Ice Palace': new Inverted_IcePalace(this),
      'Misery Mire': new Inverted_MiseryMire(this),
      'Turtle Rock': new Inverted_TurtleRock(this),
      'Ganons Tower': new Inverted_GanonsTower(this),
      'Medallions': new Standard_Medallions(this),
      'Fountains': new Standard_Fountains(this),
    };
  }
}

export class Retro extends Open {
  constructor(id = 0, config = {}) {
    super(id, { ...config, 'rom.rupeeBow': true, 'rom.genericKeys': true, 'region.takeAnys': true, 'region.wildKeys': true });
    if (this.config('difficulty') !== 'custom') {
      const c = this.config_;
      switch (this.config('item.pool')) {
        case 'hard':
        case 'expert':
          c['item.count.KeyD1'] = 0;
          c['item.count.KeyA2'] = 0;
          c['item.count.KeyD7'] = 0;
          c['item.count.KeyD2'] = 0;
          c['item.count.TwentyRupees2'] = 15 + this.config('item.count.TwentyRupees2', 0);
          break;
        case 'crowd_control':
        case 'normal':
          c['item.count.KeyD1'] = 0;
          c['item.count.KeyA2'] = 0;
          c['item.count.TwentyRupees2'] = 10 + this.config('item.count.TwentyRupees2', 0);
      }
    }
  }
}

World.types = { Standard, Open, Inverted, Retro };
export { World };
