#!/usr/bin/env python3
if __name__ == '__main__':
    from source.meta.check_requirements import check_requirements
    check_requirements(console=True)

import logging
import os
import sys

import RaceRandom as random
import source.classes.diags as diagnostics
from CLI import get_args_priority, parse_cli
from Fill import FillError
from Main import EnemizerError, main
from Rom import get_sprite_from_name
from source.classes.BabelFish import BabelFish
from Utils import close_console, is_bundled


def start():
    args = parse_cli(None)

    # print diagnostics
    # usage: py DungeonRandomizer.py --diags
    if args.diags:
        diags = diagnostics.output()
        print("\n".join(diags))
        sys.exit(0)

    if is_bundled() and len(sys.argv) == 1:
        # for the bundled builds, if we have no arguments, the user
        # probably wants the gui. Users of the bundled build who want the command line
        # interface shouuld specify at least one option, possibly setting a value to a
        # default if they like all the defaults
        from Gui import guiMain
        close_console()
        guiMain()
        sys.exit(0)

    # ToDo: Validate files further than mere existance
    if not args.jsonout and not os.path.isfile(args.rom):
        input('Could not find valid base rom for patching at expected path %s. Please run with -h to see help for further information. \nPress Enter to exit.' % args.rom)
        sys.exit(1)
    if any([sprite is not None and not os.path.isfile(sprite) and not get_sprite_from_name(sprite) for sprite in args.sprite.values()]):
        if not args.jsonout:
            input('Could not find link sprite sheet at given location. \nPress Enter to exit.')
            sys.exit(1)
        else:
            raise IOError('Cannot find sprite file at %s' % args.sprite)

    # set up logger
    loglevel = {'error': logging.ERROR, 'info': logging.INFO, 'warning': logging.WARNING, 'debug': logging.DEBUG}[args.loglevel]
    logging.basicConfig(format='%(message)s', level=loglevel)

    priority = get_args_priority(None, None, args)
    lang = "en"
    if "load" in priority and "lang" in priority["load"]:
        lang = priority["load"].lang
    fish = BabelFish(lang=lang)

    if args.gui:
        from Gui import guiMain
        guiMain(args)
    else:
        count = args.count or 1
        tries = args.tries or 1
        random.seed(None)
        seed = args.seed or random.randint(0, 999999999)
        failures = []
        attempts = 0
        logger = logging.getLogger('')
        for seednum in range(count):
            for trynum in range(tries):
                try:
                    attempts += 1
                    main(seed=seed, args=args, fish=fish)
                    logger.info('%s %s', fish.translate("cli","cli","finished.run"), seednum + 1)
                    logger.info('')
                    seed = random.randint(0, 999999999)
                    break
                except (FillError, EnemizerError, Exception, RuntimeError) as err:
                    failures.append((err, seed))
                    logger.exception('Attempt %d - %s: %s', trynum, fish.translate("cli","cli","generation.failed"), err)
                    logger.info('')
                seed = random.randint(0, 999999999)

        if count > 1 or tries > 1:
            for fail in failures:
                logger.info('seed %9s failed with: %s', fail[1], fail[0])
            if len(failures) > 0:
                logger.info('')
            fail_rate = 100 * len(failures) / attempts
            success_rate = 100 * (attempts - len(failures)) / attempts
            logger.info('Generation failure rate: %6.2f%%', fail_rate)
            logger.info('Generation success rate: %6.2f%%', success_rate)

        if len(failures) == attempts:
            sys.exit(1)


if __name__ == '__main__':
    start()
