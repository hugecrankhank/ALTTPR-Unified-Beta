// Port of the text-writing Location subclasses (app/Location/{Pedestal,Drop/*,Dig/*,Npc/*}.php)
import { Location } from './location.js';
import { Item } from './item.js';
import { __eq } from './php.js';

Location.Pedestal = class Pedestal extends Location {

    setItem(item = null) {
        if (__eq(item, Item.get("MasterSword", this.region.getWorld()))) {
            item = Item.get("L2Sword", this.region.getWorld());
        }

        return super.setItem(item);
    }

    writeItem(rom, item = null) {
        super.writeItem(rom, item);

        rom.setCredit("pedestal", this.getItemCreditsText());
        rom.setText("mastersword_pedestal_translated", this.getItemPedestalText());

        return this;
    }

    getItemCreditsText() {
        switch (this.item.getTarget().getRawName()) {
            case "BigKeyA2":
                return "la key of evils bane";
        }

        switch (this.item.getTarget().constructor) {
            case Item.Key:
            case Item.BigKey:
                return "and the key";
            case Item.Map:
                return "and the map";
            case Item.Compass:
                return "and the compass";
            case Item.Egg:
                return "and the egg";
        }

        switch (this.item.getTarget().getRawName()) {
            case "L1Sword":
            case "L1SwordAndShield":
                return "the plastic sword";
            case "L2Sword":
            case "MasterSword":
                return "and the master sword";
            case "L3Sword":
                return "the tempered sword";
            case "L4Sword":
                return "and the butter sword";
            case "BlueShield":
                return "the useless shield";
            case "RedShield":
                return "near useless shield";
            case "MirrorShield":
                return "and the ditto shield";
            case "FireRod":
                return "and the rage rod";
            case "IceRod":
                return "and the freeze ray";
            case "Hammer":
                return "and m c hammer";
            case "Hookshot":
                return "and the tickle beam";
            case "Bow":
            case "BowAndArrows":
            case "ProgressiveBow":
                return "the stick and twine";
            case "BowAndSilverArrows":
                return "the stick and shine";
            case "Boomerang":
                return "the backlash stick";
            case "RedBoomerang":
                return "and the rebound rod";
            case "Powder":
                return "and the magic sack";
            case "Bombos":
                return "and the swirly coin";
            case "Ether":
                return "and the bolt coin";
            case "Quake":
                return "and the wavy coin";
            case "Lamp":
                return "and the flashlight";
            case "Shovel":
                return "and the flute scoop";
            case "CaneOfSomaria":
                return "the walking stick";
            case "CaneOfByrna":
                return "and the blue bat";
            case "Cape":
                return "the camouflage cape";
            case "MagicMirror":
                return "the face reflector";
            case "PowerGlove":
                return "and the grey mittens";
            case "TitansMitt":
                return "and the golden glove";
            case "BookOfMudora":
                return "and the story book";
            case "Flippers":
                return "the water airfoil";
            case "MoonPearl":
                return "and the jaw breaker";
            case "BugCatchingNet":
                return "and the surprise net";
            case "BlueMail":
                return "and the banana hat";
            case "RedMail":
                return "and the eggplant hat";
            case "PieceOfHeart":
                return "and the broken heart";
            case "BossHeartContainer":
            case "HeartContainer":
            case "HeartContainerNoAnimation":
                return "and the full heart";
            case "Bomb":
                return "and the explosion";
            case "ThreeBombs":
                return "the explosions";
            case "TenBombs":
                return "the many explosions";
            case "Mushroom":
                return "and the legal drugs";
            case "Bottle":
                return "and the terrarium";
            case "BottleWithRedPotion":
                return "and the red goo";
            case "BottleWithGreenPotion":
                return "and the green goo";
            case "BottleWithBluePotion":
                return "and the blue goo";
            case "BottleWithGoldBee":
                return "and the beetor";
            case "BottleWithBee":
                return "and the mad friend";
            case "BottleWithFairy":
                return "and the fairy friend";
            case "Heart":
                return "and the tiny heart";
            case "Arrow":
                return "the vampire skewer";
            case "TenArrows":
                return "the vampire skewers";
            case "SmallMagic":
                return "and the tiny pouch";
            case "OneRupee":
            case "FiveRupees":
                return "the pocket change";
            case "TwentyRupees":
            case "TwentyRupees2":
            case "FiftyRupees":
                return "and the couch cash";
            case "OneHundredRupees":
                return "and the rupee stash";
            case "ThreeHundredRupees":
                return "and the rupee hoard";
            case "OcarinaInactive":
            case "OcarinaActive":
                return "and the duck call";
            case "PegasusBoots":
                return "and the sprint shoes";
            case "BombUpgrade5":
            case "BombUpgrade10":
            case "BombUpgrade50":
                return "and the bomb booster";
            case "ArrowUpgrade5":
            case "ArrowUpgrade10":
            case "ArrowUpgrade70":
                return "and the arrow boost";
            case "SilverArrowUpgrade":
                return "and the razer blade";
            case "HalfMagic":
            case "QuarterMagic":
                return "and the magic saver";
            case "Rupoor":
                return "and the toll-booth";
            case "RedClock":
                return "and the ruby clock";
            case "BlueClock":
                return "the sapphire clock";
            case "GreenClock":
                return "the emerald clock";
            case "ProgressiveSword":
                return "the unknown sword";
            case "ProgressiveShield":
                return "the unknown shield";
            case "ProgressiveArmor":
                return "the unknown hat";
            case "ProgressiveGlove":
                return "the magic hand cover";
            case "singleRNG":
            case "multiRNG":
                return "the whatever";
            case "Triforce":
                return "and the triforce";
            case "PowerStar":
                return "and the power star";
            case "TriforcePiece":
                return "the triforce piece";
            case "Nothing":
            default:
                return "and nothing";
        }
    }

    getItemPedestalText() { let item;
        item = (this.region.getWorld().config("rom.genericKeys", false) && this.item instanceof Item.Key)
            ? Item.get("KeyGK", this.region.getWorld())
            : this.item;

        switch (item.getTarget().getRawName()) {
            case "BigKeyA2":
                return "The Big Key\nof evil's bane";
            case "BigKeyD7":
                return "The big key\nof terrapins";
            case "BigKeyD4":
                return "The Big Key\nof rogues";
            case "BigKeyP3":
                return "The big key\nto moldorm's\nheart";
            case "BigKeyD5":
                return "A frozen\nbig key\nrests here";
            case "BigKeyD3":
                return "The big key\nof the dark\nforest";
            case "BigKeyD6":
                return "The big key\nto Vitreous";
            case "BigKeyD1":
                return "Hammeryump\nwith this\nbig key";
            case "BigKeyD2":
                return "The Big key\nto the swamp";
            case "BigKeyA1":
                return "Okay, this big\nkey doesn't\nreally exist";
            case "BigKeyP2":
                return "Sand spills\nout of this\nbig key";
            case "BigKeyP1":
                return "The big key\nof the east";
            case "BigKeyH1":
            case "BigKeyH2":
                return "You should\nhave got this\nfrom a guard";
            case "KeyA2":
                return "The small key\nof evil's bane";
            case "KeyD7":
                return "The small key\nof terrapins";
            case "KeyD4":
                return "The small key\nof rogues";
            case "KeyP3":
                return "The key\nto moldorm's\nbasement";
            case "KeyD5":
                return "A frozen\nsmall key\nrests here";
            case "KeyD3":
                return "The small key\nof the dark\nforest";
            case "KeyD6":
                return "The small key\nto Vitreous";
            case "KeyD1":
                return "A small key\nthat steals\nlight";
            case "KeyD2":
                return "Access to\nthe swamp\nis granted";
            case "KeyA1":
                return "Agahnim\nhalfway\nunlocked";
            case "KeyP2":
                return "Sand spills\nout of this\nsmall key";
            case "KeyP1":
                return "Okay, this\nkey doesn't\nreally exist";
            case "KeyH1":
            case "KeyH2":
                return "The key to\nthe castle";
        }

        switch (item.getTarget().constructor) {
            case Item.Key:
                return "A small key\nto the Kingdom";
            case Item.BigKey:
                return "A big key\nto the Kingdom";
            case Item.Map:
                return "You can now\nfind your way\nhome!";
            case Item.Compass:
                return "Now you know\nwhere the boss\nhides!";
            case Item.Egg:
                return "Egg-cited\nfor this";
        }

        switch (item.getTarget().getRawName()) {
            case "L1Sword":
            case "L1SwordAndShield":
                return "A pathetic\nsword rests\nhere!";
            case "L2Sword":
            case "MasterSword":
                return "I thought this\nwas meant to\nbe randomized?";
            case "L3Sword":
                return "I stole the\nblacksmith's\njob!";
            case "L4Sword":
                return "The butter\nsword rests\nhere!";
            case "BlueShield":
                return "Now you can\ndefend against\npebbles!";
            case "RedShield":
                return "Now you can\ndefend against\nfireballs!";
            case "MirrorShield":
                return "Now you can\ndefend against\nlasers!";
            case "FireRod":
                return "I'm the hot\nrod. I make\nthings burn!";
            case "IceRod":
                return "I'm the cold\nrod. I make\nthings freeze!";
            case "Hammer":
                return "stop\nhammer time!";
            case "Hookshot":
                return "BOING!!!\nBOING!!!\nBOING!!!";
            case "Bow":
            case "ProgressiveBow":
                return "You have\nchosen the\narcher class.";
            case "BowAndArrows":
                return "You are now an\naverage archer";
            case "BowAndSilverArrows":
                return "You are now a\nmaster archer!";
            case "Boomerang":
                return "No matter what\nyou do, blue\nreturns to you";
            case "RedBoomerang":
                return "No matter what\nyou do, red\nreturns to you";
            case "Powder":
                return "you can turn\nanti-faeries\ninto faeries";
            case "Bombos":
                return "Burn, baby,\nburn! Fear my\nring of fire!";
            case "Ether":
                return "This magic\ncoin freezes\neverything!";
            case "Quake":
                return "Maxing out the\nRichter scale\nis what I do!";
            case "Lamp":
                return "Baby, baby,\nbaby.\nLight my way!";
            case "Shovel":
                return "Can\n   You\n      Dig it?";
            case "CaneOfSomaria":
                return "I make blocks\nto hold down\nswitches!";
            case "CaneOfByrna":
                return "Use this to\nbecome\ninvincible!";
            case "Cape":
                return "Wear this to\nbecome\ninvisible!";
            case "MagicMirror":
                return "Isn't your\nreflection so\npretty?";
            case "PowerGlove":
                return "Now you can\nlift weak\nstuff!";
            case "TitansMitt":
                return "Now you can\nlift heavy\nstuff!";
            case "BookOfMudora":
                return "This is a\nparadox?!";
            case "Flippers":
                return "fancy a swim?";
            case "MoonPearl":
                return "  Bunny Link\n      be\n     gone!";
            case "BugCatchingNet":
                return "Let's catch\nsome bees and\nfaeries!";
            case "BlueMail":
                return "Now you're a\nblue elf!";
            case "RedMail":
                return "Now you're a\nred elf!";
            case "PieceOfHeart":
                return "Just a little\npiece of love!";
            case "BossHeartContainer":
            case "HeartContainer":
            case "HeartContainerNoAnimation":
                return "Maximum health\nincreased!\nYeah!";
            case "Bomb":
                return "I make things\ngo BOOM! But\njust once.";
            case "ThreeBombs":
                return "I make things\ngo triple\nBOOM!!!";
            case "TenBombs":
                return "I make things\ngo BOOM!\nso many times!";
            case "Mushroom":
                return "I'm a fun guy!\n\nI'm a funghi!";
            case "Bottle":
                return "Now you can\nstore potions\nand stuff!";
            case "BottleWithRedPotion":
                return "You see red\ngoo in a\nbottle?";
            case "BottleWithGreenPotion":
                return "You see green\ngoo in a\nbottle?";
            case "BottleWithBluePotion":
                return "You see blue\ngoo in a\nbottle?";
            case "BottleWithGoldBee":
            case "BottleWithBee":
                return "Release me\nso I can go\nbzzzzz!";
            case "BottleWithFairy":
                return "If you die\nI will revive\nyou!";
            case "Heart":
                return "I'm a lonely\nheart.";
            case "Arrow":
                return "a lonely arrow\nsits here.";
            case "TenArrows":
                return "This will give\nyou ten shots\nwith your bow!";
            case "SmallMagic":
                return "A tiny magic\nrefill rests\nhere";
            case "OneRupee":
            case "FiveRupees":
                return "Just pocket\nchange. Move\nright along.";
            case "TwentyRupees":
            case "TwentyRupees2":
            case "FiftyRupees":
                return "Just couch\ncash. Move\nright along.";
            case "OneHundredRupees":
                return "A rupee stash!\nHell yeah!";
            case "ThreeHundredRupees":
                return "A rupee hoard!\nHell yeah!";
            case "OcarinaInactive":
            case "OcarinaActive":
                return "Save the duck\nand fly to\nfreedom!";
            case "PegasusBoots":
                return "Gotta go fast!";
            case "BombUpgrade5":
            case "BombUpgrade10":
            case "BombUpgrade50":
                return "increase bomb\nstorage, low\nlow price";
            case "ArrowUpgrade5":
            case "ArrowUpgrade10":
            case "ArrowUpgrade70":
                return "increase arrow\nstorage, low\nlow price";
            case "SilverArrowUpgrade":
                return "Do you fancy\nsilver tipped\narrows?";
            case "HalfMagic":
                return "Your magic\npower has been\ndoubled!";
            case "QuarterMagic":
                return "Your magic\npower has been\nquadrupled!";
            case "PendantOfCourage":
                return "Courage for\nthose who\nalready had it";
            case "PendantOfWisdom":
                return "Wisdom for\nthose who\nalready had it";
            case "PendantOfPower":
                return "Power for\nthose who\nalready had it";
            case "Rupoor":
                return "This is not\nreally worth\nyour time";
            case "RedClock":
                return "like the sands\nthrough a red\nhourglass";
            case "BlueClock":
                return "sapphire sand\ntrickles down";
            case "GreenClock":
                return "tick tock\ntick tock";
            case "ProgressiveSword":
                return "a better copy\nof your sword\nfor your time";
            case "ProgressiveShield":
                return "have a better\ndefense in\nfront of you";
            case "ProgressiveArmor":
                return "time for a\nchange of\nclothes?";
            case "ProgressiveGlove":
                return "a way to lift\nheavier things";
            case "singleRNG":
            case "multiRNG":
                return "who knows? you\nprobably don't\nneed this.";
            case "Triforce":
                return "\n   YOU WIN!";
            case "PowerStar":
                return "Aim for the\nmoon. You may\nhit a 'star'";
            case "TriforcePiece":
                return "a yellow\ntriangle\nyou need this";
            case "Nothing":
            default:
                return "Don't waste\nyour time!";
        }
    }
};

Location.Drop.Bombos = class Bombos extends Location {

    writeItem(rom, item = null) {
        super.writeItem(rom, item);

        rom.setText("tablet_bombos_book", this.getItemText());

        return this;
    }

    getItemText() { let item;
        item = (this.region.getWorld().config("rom.genericKeys", false) && this.item instanceof Item.Key)
            ? Item.get("KeyGK", this.region.getWorld())
            : this.item;

        switch (item.getTarget().getRawName()) {
            case "BigKeyA2":
                return "The big key\nof evil's bane";
            case "BigKeyD7":
                return "The big key\nof terrapins";
            case "BigKeyD4":
                return "The big key\nof rogues";
            case "BigKeyP3":
                return "The big key\nto moldorm's\nheart";
            case "BigKeyD5":
                return "A frozen\nbig key\nrests here";
            case "BigKeyD3":
                return "The big key\nof the dark\nforest";
            case "BigKeyD6":
                return "The big key\nto Vitreous";
            case "BigKeyD1":
                return "Hammeryump\nwith this\nbig key";
            case "BigKeyD2":
                return "The big key\nto the swamp";
            case "BigKeyA1":
                return "Okay, this big\nkey doesn't\nreally exist";
            case "BigKeyP2":
                return "Sand spills\nout of this\nbig key";
            case "BigKeyP1":
                return "The big key\nof the east";
            case "BigKeyH1":
            case "BigKeyH2":
                return "You should\nhave got this\nfrom a guard";
            case "KeyA2":
                return "The small key\nof evil's bane";
            case "KeyD7":
                return "The small key\nof terrapins";
            case "KeyD4":
                return "The small key\nof rogues";
            case "KeyP3":
                return "The key\nto moldorm's\nbasement";
            case "KeyD5":
                return "A frozen\nsmall key\nrests here";
            case "KeyD3":
                return "The small key\nof the dark\nforest";
            case "KeyD6":
                return "The small key\nto Vitreous";
            case "KeyD1":
                return "A small key\nthat steals\nlight";
            case "KeyD2":
                return "Access to\nthe swamp\nis granted";
            case "KeyA1":
                return "Agahnim\nhalfway\nunlocked";
            case "KeyP2":
                return "Sand spills\nout of this\nsmall key";
            case "KeyP1":
                return "Okay, this\nkey doesn't\nreally exist";
            case "KeyH1":
            case "KeyH2":
                return "The key to\nthe castle";
        }

        switch (item.getTarget().constructor) {
            case Item.Key:
                return "A small key\nto the Kingdom";
            case Item.BigKey:
                return "A big key\nto the Kingdom";
            case Item.Map:
                return "You can now\nfind your way\nhome!";
            case Item.Compass:
                return "Now you know\nwhere the boss\nhides!";
            case Item.Egg:
                return "Egg-cited\nfor this";
        }

        switch (item.getTarget().getRawName()) {
            case "L1Sword":
            case "L1SwordAndShield":
                return "A pathetic\nsword rests\nhere!";
            case "L2Sword":
            case "MasterSword":
                return "Look at me!\nI am the\npedestal!";
            case "L3Sword":
                return "I stole the\nblacksmith's\njob!";
            case "L4Sword":
                return "The butter\nsword rests\nhere!";
            case "BlueShield":
                return "Now you can\ndefend against\npebbles!";
            case "RedShield":
                return "Now you can\ndefend against\nfireballs!";
            case "MirrorShield":
                return "Now you can\ndefend against\nlasers!";
            case "FireRod":
                return "I'm the hot\nrod. I make\nthings burn!";
            case "IceRod":
                return "I'm the cold\nrod. I make\nthings freeze!";
            case "Hammer":
                return "stop\nhammer time!";
            case "Hookshot":
                return "BOING!!!\nBOING!!!\nBOING!!!";
            case "Bow":
            case "ProgressiveBow":
                return "You have\nchosen the\narcher class.";
            case "BowAndArrows":
                return "You are now an\naverage archer";
            case "BowAndSilverArrows":
                return "You are now a\nmaster archer!";
            case "Boomerang":
                return "No matter what\nyou do, blue\nreturns to you";
            case "RedBoomerang":
                return "No matter what\nyou do, red\nreturns to you";
            case "Powder":
                return "you can turn\nanti-faeries\ninto faeries";
            case "Bombos":
                return "Burn, baby,\nburn! Fear my\nring of fire!";
            case "Ether":
                return "This magic\ncoin freezes\neverything!";
            case "Quake":
                return "Maxing out the\nRichter scale\nis what I do!";
            case "Lamp":
                return "Baby, baby,\nbaby.\nLight my way!";
            case "Shovel":
                return "Can\n   You\n      Dig it?";
            case "CaneOfSomaria":
                return "I make blocks\nto hold down\nswitches!";
            case "CaneOfByrna":
                return "Use this to\nbecome\ninvincible!";
            case "Cape":
                return "Wear this to\nbecome\ninvisible!";
            case "MagicMirror":
                return "Isn't your\nreflection so\npretty?";
            case "PowerGlove":
                return "Now you can\nlift weak\nstuff!";
            case "TitansMitt":
                return "Now you can\nlift heavy\nstuff!";
            case "BookOfMudora":
                return "This is a\nparadox?!";
            case "Flippers":
                return "fancy a swim?";
            case "MoonPearl":
                return "  Bunny Link\n      be\n     gone!";
            case "BugCatchingNet":
                return "Let's catch\nsome bees and\nfaeries!";
            case "BlueMail":
                return "Now you're a\nblue elf!";
            case "RedMail":
                return "Now you're a\nred elf!";
            case "PieceOfHeart":
                return "Just a little\npiece of love!";
            case "BossHeartContainer":
            case "HeartContainer":
            case "HeartContainerNoAnimation":
                return "Maximum health\nincreased!\nYeah!";
            case "Bomb":
                return "I make things\ngo BOOM! But\njust once.";
            case "ThreeBombs":
                return "I make things\ngo triple\nBOOM!!!";
            case "TenBombs":
                return "I make things\ngo BOOM!\nso many times!";
            case "Mushroom":
                return "I'm a fun guy!\n\nI'm a funghi!";
            case "Bottle":
                return "Now you can\nstore potions\nand stuff!";
            case "BottleWithRedPotion":
                return "You see red\ngoo in a\nbottle?";
            case "BottleWithGreenPotion":
                return "You see green\ngoo in a\nbottle?";
            case "BottleWithBluePotion":
                return "You see blue\ngoo in a\nbottle?";
            case "BottleWithGoldBee":
            case "BottleWithBee":
                return "Release me\nso I can go\nbzzzzz!";
            case "BottleWithFairy":
                return "If you die\nI will revive\nyou!";
            case "Heart":
                return "I'm a lonely\nheart.";
            case "Arrow":
                return "a lonely arrow\nsits here.";
            case "TenArrows":
                return "This will give\nyou ten shots\nwith your bow!";
            case "SmallMagic":
                return "A tiny magic\nrefill rests\nhere";
            case "OneRupee":
            case "FiveRupees":
                return "Just pocket\nchange. Move\nright along.";
            case "TwentyRupees":
            case "TwentyRupees2":
            case "FiftyRupees":
                return "Just couch\ncash. Move\nright along.";
            case "OneHundredRupees":
                return "A rupee stash!\nHell yeah!";
            case "ThreeHundredRupees":
                return "A rupee hoard!\nHell yeah!";
            case "OcarinaInactive":
            case "OcarinaActive":
                return "Save the duck\nand fly to\nfreedom!";
            case "PegasusBoots":
                return "Gotta go fast!";
            case "BombUpgrade5":
            case "BombUpgrade10":
            case "BombUpgrade50":
                return "increase bomb\nstorage, low\nlow price";
            case "ArrowUpgrade5":
            case "ArrowUpgrade10":
            case "ArrowUpgrade70":
                return "increase arrow\nstorage, low\nlow price";
            case "SilverArrowUpgrade":
                return "Do you fancy\nsilver tipped\narrows?";
            case "HalfMagic":
                return "Your magic\npower has been\ndoubled!";
            case "QuarterMagic":
                return "Your magic\npower has been\nquadrupled!";
            case "PendantOfCourage":
                return "Courage for\nthose who\nalready had it";
            case "PendantOfWisdom":
                return "Wisdom for\nthose who\nalready had it";
            case "PendantOfPower":
                return "Power for\nthose who\nalready had it";
            case "Rupoor":
                return "This is not\nreally worth\nyour time";
            case "RedClock":
                return "like the sands\nthrough a red\nhourglass";
            case "BlueClock":
                return "sapphire sand\ntrickles down";
            case "GreenClock":
                return "tick tock\ntick tock";
            case "ProgressiveSword":
                return "a better copy\nof your sword\nfor your time";
            case "ProgressiveShield":
                return "have a better\ndefense in\nfront of you";
            case "ProgressiveArmor":
                return "time for a\nchange of\nclothes?";
            case "ProgressiveGlove":
                return "a way to lift\nheavier things";
            case "singleRNG":
            case "multiRNG":
                return "who knows? you\nprobably don't\nneed this.";
            case "Triforce":
                return "\n   YOU WIN!";
            case "PowerStar":
                return "Aim for the\nmoon. You may\nhit a 'star'";
            case "TriforcePiece":
                return "a yellow\ntriangle\nyou need this";
            case "Nothing":
            default:
                return "Don't waste\nyour time!";
        }
    }
};

Location.Drop.Ether = class Ether extends Location {

    writeItem(rom, item = null) {
        super.writeItem(rom, item);

        rom.setText("tablet_ether_book", this.getItemText());

        return this;
    }

    getItemText() { let item;
        item = (this.region.getWorld().config("rom.genericKeys", false) && this.item instanceof Item.Key)
            ? Item.get("KeyGK", this.region.getWorld())
            : this.item;

        switch (item.getTarget().getRawName()) {
            case "BigKeyA2":
                return "The big key\nof evil's bane";
            case "BigKeyD7":
                return "The big key\nof terrapins";
            case "BigKeyD4":
                return "The big key\nof rogues";
            case "BigKeyP3":
                return "The big key\nto moldorm's\nheart";
            case "BigKeyD5":
                return "A frozen\nbig key\nrests here";
            case "BigKeyD3":
                return "The big key\nof the dark\nforest";
            case "BigKeyD6":
                return "The big key\nto Vitreous";
            case "BigKeyD1":
                return "Hammeryump\nwith this\nbig key";
            case "BigKeyD2":
                return "The big key\nto the swamp";
            case "BigKeyA1":
                return "Okay, this big\nkey doesn't\nreally exist";
            case "BigKeyP2":
                return "Sand spills\nout of this\nbig key";
            case "BigKeyP1":
                return "The big key\nof the east";
            case "BigKeyH1":
            case "BigKeyH2":
                return "You should\nhave got this\nfrom a guard";
            case "KeyA2":
                return "The small key\nof evil's bane";
            case "KeyD7":
                return "The small key\nof terrapins";
            case "KeyD4":
                return "The small key\nof rogues";
            case "KeyP3":
                return "The key\nto moldorm's\nbasement";
            case "KeyD5":
                return "A frozen\nsmall key\nrests here";
            case "KeyD3":
                return "The small key\nof the dark\nforest";
            case "KeyD6":
                return "The small key\nto Vitreous";
            case "KeyD1":
                return "A small key\nthat steals\nlight";
            case "KeyD2":
                return "Access to\nthe swamp\nis granted";
            case "KeyA1":
                return "Agahnim\nhalfway\nunlocked";
            case "KeyP2":
                return "Sand spills\nout of this\nsmall key";
            case "KeyP1":
                return "Okay, this\nkey doesn't\nreally exist";
            case "KeyH1":
            case "KeyH2":
                return "The key to\nthe castle";
        }

        switch (item.getTarget().constructor) {
            case Item.Key:
                return "A small key\nto the Kingdom";
            case Item.BigKey:
                return "A big key\nto the Kingdom";
            case Item.Map:
                return "You can now\nfind your way\nhome!";
            case Item.Compass:
                return "Now you know\nwhere the boss\nhides!";
            case Item.Egg:
                return "Egg-cited\nfor this";
        }

        switch (item.getTarget().getRawName()) {
            case "L1Sword":
            case "L1SwordAndShield":
                return "A pathetic\nsword rests\nhere!";
            case "L2Sword":
            case "MasterSword":
                return "Look at me!\nI am the\npedestal!";
            case "L3Sword":
                return "I stole the\nblacksmith's\njob!";
            case "L4Sword":
                return "The butter\nsword rests\nhere!";
            case "BlueShield":
                return "Now you can\ndefend against\npebbles!";
            case "RedShield":
                return "Now you can\ndefend against\nfireballs!";
            case "MirrorShield":
                return "Now you can\ndefend against\nlasers!";
            case "FireRod":
                return "I'm the hot\nrod. I make\nthings burn!";
            case "IceRod":
                return "I'm the cold\nrod. I make\nthings freeze!";
            case "Hammer":
                return "stop\nhammer time!";
            case "Hookshot":
                return "BOING!!!\nBOING!!!\nBOING!!!";
            case "Bow":
            case "ProgressiveBow":
                return "You have\nchosen the\narcher class.";
            case "BowAndArrows":
                return "You are now an\naverage archer";
            case "BowAndSilverArrows":
                return "You are now a\nmaster archer!";
            case "Boomerang":
                return "No matter what\nyou do, blue\nreturns to you";
            case "RedBoomerang":
                return "No matter what\nyou do, red\nreturns to you";
            case "Powder":
                return "you can turn\nanti-faeries\ninto faeries";
            case "Bombos":
                return "Burn, baby,\nburn! Fear my\nring of fire!";
            case "Ether":
                return "This magic\ncoin freezes\neverything!";
            case "Quake":
                return "Maxing out the\nRichter scale\nis what I do!";
            case "Lamp":
                return "Baby, baby,\nbaby.\nLight my way!";
            case "Shovel":
                return "Can\n   You\n      Dig it?";
            case "CaneOfSomaria":
                return "I make blocks\nto hold down\nswitches!";
            case "CaneOfByrna":
                return "Use this to\nbecome\ninvincible!";
            case "Cape":
                return "Wear this to\nbecome\ninvisible!";
            case "MagicMirror":
                return "Isn't your\nreflection so\npretty?";
            case "PowerGlove":
                return "Now you can\nlift weak\nstuff!";
            case "TitansMitt":
                return "Now you can\nlift heavy\nstuff!";
            case "BookOfMudora":
                return "This is a\nparadox?!";
            case "Flippers":
                return "fancy a swim?";
            case "MoonPearl":
                return "  Bunny Link\n      be\n     gone!";
            case "BugCatchingNet":
                return "Let's catch\nsome bees and\nfaeries!";
            case "BlueMail":
                return "Now you're a\nblue elf!";
            case "RedMail":
                return "Now you're a\nred elf!";
            case "PieceOfHeart":
                return "Just a little\npiece of love!";
            case "BossHeartContainer":
            case "HeartContainer":
            case "HeartContainerNoAnimation":
                return "Maximum health\nincreased!\nYeah!";
            case "Bomb":
                return "I make things\ngo BOOM! But\njust once.";
            case "ThreeBombs":
                return "I make things\ngo triple\nBOOM!!!";
            case "TenBombs":
                return "I make things\ngo BOOM!\nso many times!";
            case "Mushroom":
                return "I'm a fun guy!\n\nI'm a funghi!";
            case "Bottle":
                return "Now you can\nstore potions\nand stuff!";
            case "BottleWithRedPotion":
                return "You see red\ngoo in a\nbottle?";
            case "BottleWithGreenPotion":
                return "You see green\ngoo in a\nbottle?";
            case "BottleWithBluePotion":
                return "You see blue\ngoo in a\nbottle?";
            case "BottleWithGoldBee":
            case "BottleWithBee":
                return "Release me\nso I can go\nbzzzzz!";
            case "BottleWithFairy":
                return "If you die\nI will revive\nyou!";
            case "Heart":
                return "I'm a lonely\nheart.";
            case "Arrow":
                return "a lonely arrow\nsits here.";
            case "TenArrows":
                return "This will give\nyou ten shots\nwith your bow!";
            case "SmallMagic":
                return "A tiny magic\nrefill rests\nhere";
            case "OneRupee":
            case "FiveRupees":
                return "Just pocket\nchange. Move\nright along.";
            case "TwentyRupees":
            case "TwentyRupees2":
            case "FiftyRupees":
                return "Just couch\ncash. Move\nright along.";
            case "OneHundredRupees":
                return "A rupee stash!\nHell yeah!";
            case "ThreeHundredRupees":
                return "A rupee hoard!\nHell yeah!";
            case "OcarinaInactive":
            case "OcarinaActive":
                return "Save the duck\nand fly to\nfreedom!";
            case "PegasusBoots":
                return "Gotta go fast!";
            case "BombUpgrade5":
            case "BombUpgrade10":
            case "BombUpgrade50":
                return "increase bomb\nstorage, low\nlow price";
            case "ArrowUpgrade5":
            case "ArrowUpgrade10":
            case "ArrowUpgrade70":
                return "increase arrow\nstorage, low\nlow price";
            case "SilverArrowUpgrade":
                return "Do you fancy\nsilver tipped\narrows?";
            case "HalfMagic":
                return "Your magic\npower has been\ndoubled!";
            case "QuarterMagic":
                return "Your magic\npower has been\nquadrupled!";
            case "PendantOfCourage":
                return "Courage for\nthose who\nalready had it";
            case "PendantOfWisdom":
                return "Wisdom for\nthose who\nalready had it";
            case "PendantOfPower":
                return "Power for\nthose who\nalready had it";
            case "Rupoor":
                return "This is not\nreally worth\nyour time";
            case "RedClock":
                return "like the sands\nthrough a red\nhourglass";
            case "BlueClock":
                return "sapphire sand\ntrickles down";
            case "GreenClock":
                return "tick tock\ntick tock";
            case "ProgressiveSword":
                return "a better copy\nof your sword\nfor your time";
            case "ProgressiveShield":
                return "have a better\ndefense in\nfront of you";
            case "ProgressiveArmor":
                return "time for a\nchange of\nclothes?";
            case "ProgressiveGlove":
                return "a way to lift\nheavier things";
            case "singleRNG":
            case "multiRNG":
                return "who knows? you\nprobably don't\nneed this.";
            case "Triforce":
                return "\n   YOU WIN!";
            case "PowerStar":
                return "Aim for the\nmoon. You may\nhit a 'star'";
            case "TriforcePiece":
                return "a yellow\ntriangle\nyou need this";
            case "Nothing":
            default:
                return "Don't waste\nyour time!";
        }
    }
};

Location.Dig.HauntedGrove = class HauntedGrove extends Location.Dig {

    writeItem(rom, item = null) {
        super.writeItem(rom, item);

        rom.setCredit("grove", this.getItemCreditsText());

        return this;
    }

    getItemCreditsText() {
        switch (this.item.getTarget().constructor) {
            case Item.Key:
            case Item.BigKey:
                return "key boy picks locks again";
            case Item.Map:
                return "map boy navigates again";
            case Item.Compass:
                return "compass boy finds boss again";
            case Item.Egg:
                return "egg boy paints again";
        }

        switch (this.item.getTarget().getRawName()) {
            case "ProgressiveSword":
            case "L1Sword":
            case "L1SwordAndShield":
            case "L2Sword":
            case "MasterSword":
            case "L3Sword":
            case "L4Sword":
                return "sword boy fights again";
            case "ProgressiveShield":
            case "BlueShield":
            case "RedShield":
            case "MirrorShield":
                return "shield boy defends again";
            case "FireRod":
                return "firestarter boy burns again";
            case "IceRod":
                return "ice-cube boy freezes again";
            case "Hammer":
                return "stop, hammer time";
            case "Hookshot":
                return "beam boy tickles again";
            case "Bow":
            case "BowAndArrows":
            case "BowAndSilverArrows":
            case "ProgressiveBow":
                return "archer boy shoots again";
            case "Boomerang":
                return "throwing boy plays fetch again";
            case "RedBoomerang":
                return "magical boy plays fetch again";
            case "Powder":
                return "magic boy plays marbles again";
            case "Bombos":
                return "medallion boy melts room again";
            case "Ether":
                return "medallion boy sees floor again";
            case "Quake":
                return "medallion boy shakes dirt again";
            case "Lamp":
                return "illuminated boy can see again";
            case "Shovel":
                return "shovel boy digs again";
            case "CaneOfSomaria":
                return "cane boy makes blocks again";
            case "CaneOfByrna":
                return "cane boy encircles again";
            case "Cape":
                return "dapper boy hides again";
            case "MagicMirror":
                return "narcissistic boy is happy again";
            case "ProgressiveGlove":
            case "PowerGlove":
                return "body-building boy lifts again";
            case "TitansMitt":
                return "body-building boy has gold again";
            case "BookOfMudora":
                return "book-worm boy can read again";
            case "Flippers":
                return "swimming boy swims again";
            case "MoonPearl":
                return "moon boy plays ball again";
            case "BugCatchingNet":
                return "wrong boy catches bees again";
            case "BlueMail":
                return "tailor boy banana hatted again";
            case "RedMail":
                return "tailor boy fears nothing again";
            case "PieceOfHeart":
                return "life boy feels some love again";
            case "BossHeartContainer":
            case "HeartContainer":
            case "HeartContainerNoAnimation":
                return "life boy feels love again";
            case "Bomb":
                return "'splosion boy explodes again";
            case "ThreeBombs":
                return "'splosion boy explodes again";
            case "TenBombs":
                return "'splosion boy explodes again";
            case "Mushroom":
                return "shroom boy sells drugs again";
            case "Bottle":
                return "bottle boy has terrarium again";
            case "BottleWithRedPotion":
                return "bottle boy has red goo again";
            case "BottleWithGreenPotion":
                return "bottle boy has green goo again";
            case "BottleWithBluePotion":
                return "bottle boy has blue goo again";
            case "BottleWithGoldBee":
                return "bottle boy has beetor again";
            case "BottleWithBee":
                return "bottle boy has mad bee again";
            case "BottleWithFairy":
                return "bottle boy has friend again";
            case "Heart":
                return "loving boy has affection again";
            case "Arrow":
                return "archer boy sews again";
            case "TenArrows":
                return "archer boy sews again";
            case "SmallMagic":
                return "magic boy summons again";
            case "OneRupee":
            case "FiveRupees":
            case "TwentyRupees":
            case "TwentyRupees2":
            case "FiftyRupees":
                return "destitute boy has lunch again";
            case "OneHundredRupees":
                return "affluent boy goes drinking again";
            case "ThreeHundredRupees":
                return "fat-cat boy is rich again";
            case "OcarinaInactive":
            case "OcarinaActive":
                return "ocarina boy plays again";
            case "PegasusBoots":
                return "gotta-go-fast boy runs again";
            case "BombUpgrade5":
            case "BombUpgrade10":
            case "BombUpgrade50":
                return "upgrade boy explodes more again";
            case "ArrowUpgrade5":
            case "ArrowUpgrade10":
            case "ArrowUpgrade70":
                return "upgrade boy sews more again";
            case "SilverArrowUpgrade":
                return "archer boy shines again";
            case "HalfMagic":
            case "QuarterMagic":
                return "magic boy saves magic again";
            case "Rupoor":
                return "affluent boy steals rupees";
            case "RedClock":
                return "moment boy travels time again";
            case "BlueClock":
                return "moment boy time travels again";
            case "GreenClock":
                return "moment boy adjusts time again";
            case "ProgressiveArmor":
                return "tailor boy has threads again";
            case "singleRNG":
            case "multiRNG":
                return "unknown boy somethings again";
            case "Triforce":
                return "greedy boy wins game again";
            case "PowerStar":
                return "mario powers up again";
            case "TriforcePiece":
                return "wise boy has triangle again";
            case "Nothing":
            default:
                return "empty boy does nothing again";
        }
    }
};

Location.Npc.BugCatchingKid = class BugCatchingKid extends Location.Npc {

    writeItem(rom, item = null) {
        super.writeItem(rom, item);

        rom.setCredit("kakariko2", this.getItemCreditsText());

        return this;
    }

    getItemCreditsText() {
        switch (this.item.getTarget().constructor) {
            case Item.Key:
            case Item.BigKey:
                return "the key-holding kid";
            case Item.Map:
                return "the cartographer kid";
            case Item.Compass:
                return "the navigating kid";
            case Item.Egg:
                return "the decorating kid";
        }

        switch (this.item.getTarget().getRawName()) {
            case "ProgressiveSword":
            case "L1Sword":
            case "L1SwordAndShield":
            case "L2Sword":
            case "MasterSword":
            case "L3Sword":
            case "L4Sword":
                return "sword-wielding kid";
            case "ProgressiveShield":
            case "BlueShield":
            case "RedShield":
            case "MirrorShield":
                return "shield-wielding kid";
            case "FireRod":
                return "fire-starting kid";
            case "IceRod":
                return "the ice-bending kid";
            case "Hammer":
                return "hammer-smashing kid";
            case "Hookshot":
                return "tickle-monster kid";
            case "Bow":
            case "BowAndArrows":
            case "BowAndSilverArrows":
            case "ProgressiveBow":
                return "arrow-slinging kid";
            case "Boomerang":
                return "the bat-throwing kid";
            case "RedBoomerang":
                return "the bat-throwing kid";
            case "Powder":
                return "the sack-holding kid";
            case "Bombos":
                return "coin-collecting kid";
            case "Ether":
                return "coin-collecting kid";
            case "Quake":
                return "coin-collecting kid";
            case "Lamp":
                return "light-shining kid";
            case "Shovel":
                return "archaeologist kid";
            case "CaneOfSomaria":
                return "the block-making kid";
            case "CaneOfByrna":
                return "the spark-making kid";
            case "Cape":
                return "red riding-hood kid";
            case "MagicMirror":
                return "the narcissistic kid";
            case "ProgressiveGlove":
            case "PowerGlove":
            case "TitansMitt":
                return "body-building kid";
            case "BookOfMudora":
                return "the scholarly kid";
            case "Flippers":
                return "the swimming kid";
            case "MoonPearl":
                return "fortune-telling kid";
            case "BugCatchingNet":
                return "the bug-catching kid";
            case "ProgressiveArmor":
            case "BlueMail":
                return "the protected kid";
            case "RedMail":
                return "well-protected kid";
            case "PieceOfHeart":
            case "BossHeartContainer":
            case "HeartContainer":
            case "HeartContainerNoAnimation":
                return "the life-giving kid";
            case "Bomb":
            case "ThreeBombs":
            case "TenBombs":
                return "the bomb-holding kid";
            case "Mushroom":
                return "the drug-dealing kid";
            case "Bottle":
                return "the terrarium kid";
            case "BottleWithRedPotion":
            case "BottleWithGreenPotion":
            case "BottleWithBluePotion":
                return "potion-slinging kid";
            case "BottleWithGoldBee":
            case "BottleWithBee":
                return "the bug-caught kid";
            case "BottleWithFairy":
                return "fairy-catching kid";
            case "Heart":
                return "affection-giving kid";
            case "Arrow":
            case "TenArrows":
                return "stick-collecting kid";
            case "SmallMagic":
                return "magic-slinging kid";
            case "OneRupee":
            case "FiveRupees":
                return "poverty-struck kid";
            case "TwentyRupees":
            case "TwentyRupees2":
            case "FiftyRupees":
                return "the piggy-bank kid";
            case "OneHundredRupees":
                return "the kind-of-rich kid";
            case "ThreeHundredRupees":
                return "the really-rich kid";
            case "OcarinaInactive":
            case "OcarinaActive":
                return "the duck-call kid";
            case "PegasusBoots":
                return "the running-man kid";
            case "BombUpgrade5":
            case "BombUpgrade10":
            case "BombUpgrade50":
                return "boom-enlarging kid";
            case "ArrowUpgrade5":
            case "ArrowUpgrade10":
            case "ArrowUpgrade70":
                return "quiver-enlarging kid";
            case "SilverArrowUpgrade":
                return "arrow-sharpening kid";
            case "HalfMagic":
            case "QuarterMagic":
                return "the magic-saving kid";
            case "Rupoor":
                return "the toll-booth kid";
            case "RedClock":
                return "the ruby-time kid";
            case "BlueClock":
                return "the indigo-time kid";
            case "GreenClock":
                return "the emerald-time kid";
            case "singleRNG":
            case "multiRNG":
                return "the something kid";
            case "Triforce":
                return "the game-winning kid";
            case "PowerStar":
                return "the starry-eyed kid";
            case "TriforcePiece":
                return "triforce-holding kid";
            case "Nothing":
            default:
                return "nothing-having kid";
        }
    }
};

Location.Npc.Uncle = class Uncle extends Location {

    writeItem(rom, item = null) {
        super.writeItem(rom, item);
        rom.setCredit("house", this.getItemCreditsText());
        return this;
    }

    getItemCreditsText() {
        switch (this.item.getTarget().constructor) {
            case Item.Key:
            case Item.BigKey:
                return "your uncle picks locks";
            case Item.Map:
                return "your uncle finds treasure";
            case Item.Compass:
                return "your uncle navigates";
            case Item.Egg:
                return "your uncle likes coloring";
        }

        switch (this.item.getTarget().getRawName()) {
            case "L1Sword":
            case "L1SwordAndShield":
            case "L2Sword":
            case "MasterSword":
            case "L3Sword":
            case "L4Sword":
            case "ProgressiveSword":
                return "your uncle recovers";
            case "BlueShield":
            case "RedShield":
            case "MirrorShield":
            case "ProgressiveShield":
                return "your uncle protects";
            case "FireRod":
                return "your uncle starts fires";
            case "IceRod":
                return "your uncle is cold as ice";
            case "Hammer":
                return "stop...   hammer time";
            case "Hookshot":
                return "your uncle is BOING";
            case "Bow":
            case "BowAndArrows":
            case "BowAndSilverArrows":
            case "ProgressiveBow":
                return "your uncle, robin hood";
            case "Boomerang":
            case "RedBoomerang":
                return "your uncle is stunning";
            case "Powder":
                return "your uncle and his sack";
            case "Bombos":
            case "Ether":
            case "Quake":
                return "your uncle collects coins";
            case "Lamp":
                return "your uncle has night vision";
            case "Shovel":
                return "your uncle digs it";
            case "CaneOfSomaria":
                return "your uncle makes blocks";
            case "CaneOfByrna":
                return "your uncle sparks";
            case "Cape":
                return "your uncle can hide";
            case "MagicMirror":
                return "your uncle is vain";
            case "PowerGlove":
            case "TitansMitt":
            case "ProgressiveGlove":
                return "your uncle goes back to the gym";
            case "BookOfMudora":
                return "your uncle can read";
            case "Flippers":
                return "your uncle swims";
            case "MoonPearl":
                return "your uncle shoots marbles";
            case "BugCatchingNet":
                return "your uncle catches bees";
            case "BlueMail":
            case "RedMail":
            case "ProgressiveArmor":
                return "your uncle tailors";
            case "PieceOfHeart":
            case "BossHeartContainer":
            case "HeartContainer":
            case "HeartContainerNoAnimation":
                return "your uncle is healthy";
            case "Bomb":
            case "ThreeBombs":
            case "TenBombs":
                return "your uncle believes";
            case "Mushroom":
                return "your uncle deals drugs";
            case "Bottle":
                return "your uncle likes turtles";
            case "BottleWithRedPotion":
            case "BottleWithGreenPotion":
            case "BottleWithBluePotion":
                return "your uncle helps out";
            case "BottleWithGoldBee":
                return "your uncle has beetor";
            case "BottleWithBee":
                return "your uncle likes arthropods";
            case "BottleWithFairy":
                return "your uncle has a friend";
            case "Heart":
                return "your uncle is creepy";
            case "Arrow":
                return "your uncle believes in you";
            case "TenArrows":
                return "your uncle sews";
            case "SmallMagic":
                return "your uncle is magic";
            case "OneRupee":
            case "FiveRupees":
                return "your uncle is cheap";
            case "TwentyRupees":
            case "TwentyRupees2":
            case "FiftyRupees":
                return "your uncle likes cash";
            case "OneHundredRupees":
            case "ThreeHundredRupees":
                return "your uncle is rich";
            case "OcarinaInactive":
            case "OcarinaActive":
                return "your uncle trains ducks";
            case "PegasusBoots":
                return "your uncle goes fast";
            case "BombUpgrade5":
            case "BombUpgrade10":
            case "BombUpgrade50":
                return "your uncle has the bomb bag";
            case "ArrowUpgrade5":
            case "ArrowUpgrade10":
            case "ArrowUpgrade70":
                return "your uncle has the quiver";
            case "SilverArrowUpgrade":
                return "your uncle shaves";
            case "HalfMagic":
            case "QuarterMagic":
                return "your uncle is magical";
            case "Rupoor":
                return "your uncle collects";
            case "RedClock":
            case "BlueClock":
            case "GreenClock":
                return "your uncle keeps time";
            case "singleRNG":
            case "multiRNG":
                return "your uncle recovers";
            case "Triforce":
                return "your uncle wins the game";
            case "PowerStar":
            case "TriforcePiece":
                return "your uncle is important";
            case "Nothing":
            default:
                return "your uncle does nothing";
        }
    }
};

Location.Npc.Witch = class Witch extends Location.Npc {

    writeItem(rom, item = null) {
        super.writeItem(rom, item);

        rom.setCredit("witch", this.getItemCreditsText());

        return this;
    }

    getItemCreditsText() {
        switch (this.item.getTarget().constructor) {
            case Item.Key:
            case Item.BigKey:
                return "keys, keys, keys";
            case Item.Map:
                return "shrooms find secrets";
            case Item.Compass:
                return "shrooms for navigation";
            case Item.Egg:
                return "shrooms for eggs";
        }

        switch (this.item.getTarget().getRawName()) {
            case "L1Sword":
            case "L1SwordAndShield":
                return "fungus for slasher";
            case "L2Sword":
            case "MasterSword":
                return "fungus for blue slasher";
            case "L3Sword":
                return "fungus for red slasher";
            case "L4Sword":
                return "cap churned to butter";
            case "BlueShield":
                return "fungus for shield";
            case "RedShield":
                return "fungus for fire shield";
            case "MirrorShield":
                return "fungus for shiny shield";
            case "FireRod":
                return "fungus for rage-rod";
            case "IceRod":
                return "fungus for ice-rod";
            case "Hammer":
                return "stop...   hammer time";
            case "Hookshot":
                return "witch and tickle boy";
            case "Bow":
            case "BowAndArrows":
            case "BowAndSilverArrows":
            case "ProgressiveBow":
                return "witch and robin hood";
            case "Boomerang":
                return "fungus for puma-stick";
            case "RedBoomerang":
                return "fungus for return-stick";
            case "Powder":
                return "the witch and assistant";
            case "Bombos":
                return "shrooms for swirly-coin";
            case "Ether":
                return "shrooms for bolt-coin";
            case "Quake":
                return "shrooms for wavy-coin";
            case "Lamp":
                return "fungus for illumination";
            case "Shovel":
                return "can you dig it";
            case "CaneOfSomaria":
                return "twizzle-stick for trade";
            case "CaneOfByrna":
                return "spark-stick for trade";
            case "Cape":
                return "hood from a hood";
            case "MagicMirror":
                return "trades looking-glass";
            case "PowerGlove":
                return "fungus for gloves";
            case "TitansMitt":
                return "fungus for bling-gloves";
            case "BookOfMudora":
                return "drugs for literacy";
            case "Flippers":
                return "shrooms let you swim";
            case "MoonPearl":
                return "shrooms for moon rock";
            case "BugCatchingNet":
                return "fungus for butterflies";
            case "BlueMail":
                return "the clothing store";
            case "RedMail":
                return "the nice clothing store";
            case "PieceOfHeart":
            case "BossHeartContainer":
            case "HeartContainer":
            case "HeartContainerNoAnimation":
                return "fungus for life";
            case "Bomb":
            case "ThreeBombs":
            case "TenBombs":
                return "blend fungus into bombs";
            case "Mushroom":
                return "my name is error";
            case "Bottle":
                return "first taste is not free";
            case "BottleWithRedPotion":
            case "BottleWithGreenPotion":
            case "BottleWithBluePotion":
                return "free samples";
            case "BottleWithGoldBee":
            case "BottleWithBee":
                return "insects for trade";
            case "BottleWithFairy":
                return "shrooms for friends";
            case "Heart":
                return "trading for transplant";
            case "Arrow":
                return "fungus for arrow";
            case "TenArrows":
                return "fungus for arrows";
            case "SmallMagic":
                return "fungus for magic";
            case "OneRupee":
            case "FiveRupees":
                return "buying cheap drugs";
            case "TwentyRupees":
            case "TwentyRupees2":
            case "FiftyRupees":
                return "the witch buying drugs";
            case "OneHundredRupees":
                return "buying good drugs";
            case "ThreeHundredRupees":
                return "buying the best drugs";
            case "OcarinaInactive":
            case "OcarinaActive":
                return "duck-calls for trade";
            case "PegasusBoots":
                return "shrooms for speed";
            case "BombUpgrade5":
            case "BombUpgrade10":
            case "BombUpgrade50":
                return "the shroom goes boom";
            case "ArrowUpgrade5":
            case "ArrowUpgrade10":
            case "ArrowUpgrade70":
                return "witch and more arrows";
            case "SilverArrowUpgrade":
                return "arrow-honing service";
            case "HalfMagic":
            case "QuarterMagic":
                return "mekalekahi mekahiney ho";
            case "Rupoor":
                return "witch stole your rupees";
            case "RedClock":
                return "shrooms for ruby time";
            case "BlueClock":
                return "fungus for blue time";
            case "GreenClock":
                return "shrooms for green time";
            case "ProgressiveSword":
                return "fungus for some slasher";
            case "ProgressiveShield":
                return "fungus for some shield";
            case "ProgressiveArmor":
                return "the clothing store";
            case "ProgressiveGlove":
                return "fungus for gloves";
            case "singleRNG":
            case "multiRNG":
                return "fungus for something";
            case "Triforce":
                return "mushrooms win the game";
            case "PowerStar":
                return "the powder or the stars";
            case "TriforcePiece":
                return "hoarding for ganon";
            case "Nothing":
            default:
                return "mushrooms go poof";
        }
    }
};

Location.Npc.Zora = class Zora extends Location.Npc {

    writeItem(rom, item = null) {
        super.writeItem(rom, item);

        rom.setCredit("zora", this.getItemCreditsText());

        return this;
    }

    getItemCreditsText() {
        switch (this.item.getTarget().constructor) {
            case Item.Key:
            case Item.BigKey:
                return "advancement for sale";
            case Item.Map:
                return "the world for sale";
            case Item.Compass:
                return "bearings for sale";
            case Item.Egg:
                return "Eggs for sale";
        }

        switch (this.item.getTarget().getRawName()) {
            case "L1Sword":
            case "L1SwordAndShield":
                return "sword for sale";
            case "L2Sword":
            case "MasterSword":
                return "glow sword for sale";
            case "L3Sword":
                return "flame sword for sale";
            case "L4Sword":
                return "butter for sale";
            case "BlueShield":
                return "bad defense for sale";
            case "RedShield":
                return "red shield for sale";
            case "MirrorShield":
                return "face shield for sale";
            case "FireRod":
                return "rage rod for sale";
            case "IceRod":
                return "ice cream for sale";
            case "Hammer":
                return "m c hammer for sale";
            case "Hookshot":
                return "tickle beam for sale";
            case "Bow":
            case "ProgressiveBow":
                return "arrow sling for sale";
            case "BowAndArrows":
                return "point stick for sale";
            case "BowAndSilverArrows":
                return "you got lucky";
            case "Boomerang":
                return "bent stick for sale";
            case "RedBoomerang":
                return "air foil for sale";
            case "Powder":
                return "sack for sale";
            case "Bombos":
                return "swirly coin for sale";
            case "Ether":
                return "bolt coin for sale";
            case "Quake":
                return "wavy coin for sale";
            case "Lamp":
                return "candle for sale";
            case "Shovel":
                return "dirt spade for sale";
            case "CaneOfSomaria":
                return "block stick for sale";
            case "CaneOfByrna":
                return "shiny stick for sale";
            case "Cape":
                return "red hood for sale";
            case "MagicMirror":
                return "your face for sale";
            case "PowerGlove":
                return "lift glove for sale";
            case "TitansMitt":
                return "carry glove for sale";
            case "BookOfMudora":
                return "moon runes for sale";
            case "Flippers":
                return "finger webs for sale";
            case "MoonPearl":
                return "lunar orb for sale";
            case "BugCatchingNet":
                return "stick web for sale";
            case "BlueMail":
                return "banana hat for sale";
            case "RedMail":
                return "purple hat for sale";
            case "PieceOfHeart":
                return "little love for sale";
            case "BossHeartContainer":
            case "HeartContainer":
            case "HeartContainerNoAnimation":
                return "love for sale";
            case "Bomb":
                return "firecracker for sale";
            case "ThreeBombs":
                return "fireworks for sale";
            case "TenBombs":
                return "boom boom for sale";
            case "Mushroom":
                return "legal drugs for sale";
            case "Bottle":
                return "terrarium for sale";
            case "BottleWithRedPotion":
                return "red goo for sale";
            case "BottleWithGreenPotion":
                return "green goo for sale";
            case "BottleWithBluePotion":
                return "blue goo for sale";
            case "BottleWithGoldBee":
                return "beetor for sale";
            case "BottleWithBee":
                return "mad friend for sale";
            case "BottleWithFairy":
                return "friend for sale";
            case "Heart":
                return "affection for sale";
            case "Arrow":
                return "sewing needle for sale";
            case "TenArrows":
                return "sewing kit for sale";
            case "SmallMagic":
                return "alchemy for sale";
            case "OneRupee":
            case "FiveRupees":
            case "TwentyRupees":
            case "TwentyRupees2":
            case "FiftyRupees":
                return "life lesson for sale";
            case "OneHundredRupees":
                return "fair trade for sale";
            case "ThreeHundredRupees":
                return "good return for sale";
            case "OcarinaInactive":
            case "OcarinaActive":
                return "duck call for sale";
            case "PegasusBoots":
                return "sprint shoe for sale";
            case "BombUpgrade5":
            case "BombUpgrade10":
            case "BombUpgrade50":
                return "bomb boost for sale";
            case "ArrowUpgrade5":
            case "ArrowUpgrade10":
            case "ArrowUpgrade70":
                return "arrow boost for sale";
            case "SilverArrowUpgrade":
                return "sharp arrow for sale";
            case "HalfMagic":
            case "QuarterMagic":
                return "wizardry for sale";
            case "Rupoor":
                return "double loss for sale";
            case "RedClock":
                return "ruby clock for sale";
            case "BlueClock":
                return "blue clock for sale";
            case "GreenClock":
                return "green clock for sale";
            case "ProgressiveSword":
                return "some sword for sale";
            case "ProgressiveShield":
                return "some shield for sale";
            case "ProgressiveArmor":
                return "unknown hat for sale";
            case "ProgressiveGlove":
                return "some glove for sale";
            case "singleRNG":
            case "multiRNG":
                return "some item for sale";
            case "Triforce":
                return "game win for sale";
            case "PowerStar":
                return "power star for sale";
            case "TriforcePiece":
                return "triangle for sale";
            case "Nothing":
            default:
                return "Nothing, so stupid";
        }
    }
};
