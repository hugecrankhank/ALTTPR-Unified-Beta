<?php
// Minimal bootstrap to run the official ALttPR (VT) randomizer core without
// Laravel. Provides the few framework helpers it uses, and replaces the
// randomness source with a deterministic PRNG that the JS port mirrors.

namespace Illuminate\Contracts\Support {
    interface Arrayable { public function toArray(); }
}

namespace Illuminate\Support {
    class Arr {
        public static function first($array, ?callable $callback = null, $default = null) {
            if ($callback === null) {
                foreach ($array as $v) return $v;
                return $default;
            }
            foreach ($array as $k => $v) if ($callback($v, $k)) return $v;
            return $default;
        }
        public static function only($array, $keys) {
            $keys = (array) $keys; $out = [];
            foreach ($keys as $k) {
                $v = self::get($array, $k, '__missing__');
                if ($v !== '__missing__') self::set($out, $k, $v);
            }
            return $out;
        }
        public static function except($array, $keys) {
            foreach ((array) $keys as $k) self::forget($array, $k);
            return $array;
        }
        public static function flatten($array, $depth = INF) {
            $result = [];
            foreach ($array as $item) {
                if (!is_array($item)) $result[] = $item;
                else {
                    $values = $depth === 1 ? array_values($item) : static::flatten($item, $depth - 1);
                    foreach ($values as $v) $result[] = $v;
                }
            }
            return $result;
        }
        public static function dot($array, $prepend = '') {
            $results = [];
            foreach ($array as $key => $value) {
                if (is_array($value) && !empty($value)) $results = array_merge($results, static::dot($value, $prepend . $key . '.'));
                else $results[$prepend . $key] = $value;
            }
            return $results;
        }
        public static function get($array, $key, $default = null) {
            if ($key === null) return $array;
            if (is_array($array) && array_key_exists($key, $array)) return $array[$key];
            if (strpos((string) $key, '.') === false) return $default;
            foreach (explode('.', $key) as $seg) {
                if (is_array($array) && array_key_exists($seg, $array)) $array = $array[$seg];
                else return $default;
            }
            return $array;
        }
        public static function set(&$array, $key, $value) {
            $keys = explode('.', $key);
            while (count($keys) > 1) {
                $k = array_shift($keys);
                if (!isset($array[$k]) || !is_array($array[$k])) $array[$k] = [];
                $array = &$array[$k];
            }
            $array[array_shift($keys)] = $value;
        }
        public static function forget(&$array, $key) {
            if (array_key_exists($key, $array)) { unset($array[$key]); return; }
            $parts = explode('.', $key); $orig = &$array;
            while (count($parts) > 1) {
                $p = array_shift($parts);
                if (isset($array[$p]) && is_array($array[$p])) $array = &$array[$p]; else return;
            }
            unset($array[array_shift($parts)]);
        }
    }
}

namespace Illuminate\Support\Facades {
    class Log { public static function __callStatic($n, $a) {} }
}

namespace {
    class Log { public static function __callStatic($n, $a) {} }

    define('VT_ROOT', getenv('VT_DIR') ?: __DIR__ . '/../../../../alttp_vt_randomizer');

    function env($k, $d = null) { return $d; }
    function base_path($p = '') { return VT_ROOT . '/' . $p; }
    function storage_path($p = '') { return VT_ROOT . '/storage/' . $p; }
    function public_path($p = '') { return VT_ROOT . '/public/' . $p; }

    $GLOBALS['__config'] = [];
    foreach (['alttp', 'item', 'logic'] as $f) {
        $GLOBALS['__config'][$f] = require VT_ROOT . "/config/$f.php";
    }
    function config($key = null, $default = null) {
        if (is_array($key)) {
            foreach ($key as $k => $v) \Illuminate\Support\Arr::set($GLOBALS['__config'], $k, $v);
            return null;
        }
        return \Illuminate\Support\Arr::get($GLOBALS['__config'], $key, $default);
    }
    function head($a) { return reset($a); }
    function last($a) { return end($a); }
    function __($key = null, $replace = [], $locale = null) {
        static $files = [];
        $parts = explode('.', $key, 2);
        if (count($parts) < 2) return $key;
        $f = VT_ROOT . '/resources/lang/en/' . $parts[0] . '.php';
        if (!array_key_exists($parts[0], $files)) $files[$parts[0]] = is_file($f) ? require $f : [];
        $v = \Illuminate\Support\Arr::get($files[$parts[0]], $parts[1], null);
        if ($v === null) return $key;
        if (is_string($v)) foreach ($replace as $k => $r) $v = str_replace(':' . $k, $r, $v);
        return $v;
    }
    class __Cache { public function rememberForever($k, $cb) { static $c = []; return $c[$k] ??= $cb(); } }
    function cache() { static $c; return $c ??= new __Cache; }

    // ── deterministic PRNG (mulberry32 + rejection sampling); mirrored in JS ──
    $GLOBALS['__rng_state'] = 0;
    $GLOBALS['__rng_calls'] = 0;
    function vt_seed(int $s) { $GLOBALS['__rng_state'] = $s & 0xFFFFFFFF; $GLOBALS['__rng_calls'] = 0; }
    function imul32(int $a, int $b): int {
        $a &= 0xFFFFFFFF; $b &= 0xFFFFFFFF;
        $al = $a & 0xFFFF; $ah = $a >> 16;
        $lo = ($al * $b) & 0xFFFFFFFF;
        $hi = (($ah * $b) & 0xFFFF) << 16;
        return ($lo + $hi) & 0xFFFFFFFF;
    }
    function vt_next32(): int {
        $GLOBALS['__rng_state'] = ($GLOBALS['__rng_state'] + 0x6D2B79F5) & 0xFFFFFFFF;
        $t = $GLOBALS['__rng_state'];
        $t = imul32($t ^ ($t >> 15), $t | 1);
        $t ^= ($t + imul32($t ^ ($t >> 7), $t | 61)) & 0xFFFFFFFF;
        $t &= 0xFFFFFFFF;
        return ($t ^ ($t >> 14)) & 0xFFFFFFFF;
    }
    function get_random_int($min = 0, $max = 0x7FFFFFFF) {
        $min = (int) $min; $max = (int) $max;
        if ($min > $max) throw new \ValueError('get_random_int(): Argument #1 ($min) must be less than or equal to argument #2 ($max)');
        $GLOBALS['__rng_calls']++;
        $range = $max - $min + 1;
        $limit = intdiv(0x100000000, $range) * $range;
        do { $r = vt_next32(); } while ($r >= $limit);
        return $min + ($r % $range);
    }

    // load VT helpers except number.php's get_random_int
    require VT_ROOT . '/app/Helpers/array.php';
    require VT_ROOT . '/app/Helpers/str.php';
    $num = file_get_contents(VT_ROOT . '/app/Helpers/number.php');
    $num = preg_replace('/function get_random_int\(.*?\n}\n/s', '', $num);
    eval('?>' . $num);

    spl_autoload_register(function ($cls) {
        if (strncmp($cls, 'ALttP\\', 6) !== 0) return;
        $f = VT_ROOT . '/app/' . str_replace('\\', '/', substr($cls, 6)) . '.php';
        if (is_file($f)) require $f;
    });
}

namespace ALttP {
    // DB-less stand-in for the Eloquent Seed model.
    if (!class_exists('ALttP\\Seed', false)) {
        class Seed {
            public $id = 1; public $hash = 'local'; public $patch; public $logic; public $game_mode; public $build;
            public $created_at = null;
            public function save() { return true; }
            public function hashArray() { return hash_array($this->id); }
        }
    }
}
