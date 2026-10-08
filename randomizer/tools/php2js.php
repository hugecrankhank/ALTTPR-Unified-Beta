<?php
// Token-level PHP -> JS converter for the regular subset of the VT randomizer
// codebase (regions, locations, ROM writer). Output is reviewed by hand.
// Usage: php php2js.php input.php > output.js

$src = file_get_contents($argv[1]);
$toks = token_get_all($src);
$N = count($toks);

const JS_RESERVED = ['default', 'new', 'class', 'function', 'var', 'let', 'const', 'delete', 'in', 'of', 'switch',
    'case', 'with', 'yield', 'enum', 'export', 'import', 'super', 'this', 'typeof', 'void', 'arguments', 'eval',
    'package', 'private', 'protected', 'public', 'static', 'interface', 'implements', 'await', 'location', 'name_'];

function tid($t) { return is_array($t) ? $t[0] : null; }
function txt($t) { return is_array($t) ? $t[1] : $t; }

function jsvar($v) {
    $n = substr($v, 1);
    if ($n === 'this') return 'this';
    if (in_array($n, JS_RESERVED, true)) return $n . '_';
    return $n;
}

$used_funcs = [];
$out = '';
$i = 0;
$class_stack = []; // [name, extends, depth, props[], statics[]]
$brace_depth = 0;
$paren_stack = []; // track what a '(' belongs to
$bracket_stack = []; // for '[' : 'lit' | 'objlit' | 'idx' | 'get'
$in_static_method = false;
$method_depth = null;
$pending_props = [];

function next_sig($toks, $i) { // index of next significant token
    $n = count($toks);
    for ($j = $i; $j < $n; $j++) {
        $id = tid($toks[$j]);
        if ($id === T_WHITESPACE || $id === T_COMMENT || $id === T_DOC_COMMENT) continue;
        return $j;
    }
    return $n;
}
function prev_sig_tok($out) { // look at last non-space char sequence of output
    return rtrim($out);
}

// Find matching close for opener at index $i ('(' '[' '{')
function match_close($toks, $i) {
    $open = txt($toks[$i]);
    $close = ['(' => ')', '[' => ']', '{' => '}'][$open];
    $d = 0;
    for ($j = $i; $j < count($toks); $j++) {
        $t = txt($toks[$j]);
        $id = tid($toks[$j]);
        if ($t === '(' || $t === '[' || $t === '{' || $id === T_CURLY_OPEN || $id === T_DOLLAR_OPEN_CURLY_BRACES) $d++;
        if ($t === ')' || $t === ']' || $t === '}') { $d--; if ($d === 0) return $j; }
    }
    return -1;
}

function arr_has_double_arrow($toks, $i, $end) {
    $d = 0;
    for ($j = $i + 1; $j < $end; $j++) {
        $t = txt($toks[$j]);
        if ($t === '(' || $t === '[' || $t === '{') $d++;
        if ($t === ')' || $t === ']' || $t === '}') $d--;
        if ($d === 0 && tid($toks[$j]) === T_DOUBLE_ARROW) return true;
    }
    return false;
}

// Convert a sub-range of tokens to JS (recursive use for strings etc.)
$GLOBALS['stack_arrow_obj'] = [];

function emit_name($name) {
    // qualified names
    $name = ltrim($name, '\\');
    $map = [
        'Exception' => 'Error', 'ErrorException' => 'Error', 'OutOfBoundsException' => 'Error',
        'ALttP\\World\\Inverted' => 'World.Inverted', 'ALttP\\Sprite\\Droppable' => 'Sprite.Droppable',
    ];
    if (isset($map[$name])) return $map[$name];
    $name = preg_replace('/^ALttP\\\\/', '', $name);
    return str_replace('\\', '.', $name);
}

$GET_NAMES = ['locations', 'shops', 'prize_locations', 'crystal_locations', 'pendant_locations', 'region_locations'];

$GLOBALS['DECLS'] = compute_decls($toks);
$i = 0;
$skip_until_semicolon = false;
$last_emitted_kind = 'op'; // 'val' if last token ends an expression
$func_param_mode = 0; // depth of parens in a function signature
$after_func_sig = false;

while ($i < $N) {
    $t = $toks[$i];
    $id = tid($t);
    $s = txt($t);

    if ($id === T_OPEN_TAG) { $i++; continue; }
    if ($id === T_NAMESPACE || $id === T_USE && empty($class_stack)) {
        // skip to ;
        while ($i < $N && txt($toks[$i]) !== ';') $i++;
        $i++;
        continue;
    }
    if ($id === T_DOC_COMMENT) { $i++; continue; }
    if ($id === T_COMMENT) {
        $c = $s;
        if (str_starts_with($c, '#')) $c = '//' . substr($c, 1);
        $out .= $c; $i++; continue;
    }
    if ($id === T_WHITESPACE) { $out .= $s; $i++; continue; }

    // class declaration
    if ($id === T_ABSTRACT || $id === T_FINAL) { $i++; continue; }
    if ($id === T_CLASS) {
        $j = next_sig($toks, $i + 1);
        $cname = txt($toks[$j]);
        $ext = null;
        $k = next_sig($toks, $j + 1);
        if (tid($toks[$k]) === T_EXTENDS) {
            $e = next_sig($toks, $k + 1);
            $ext = emit_name(txt($toks[$e]));
            $k = next_sig($toks, $e + 1);
        }
        if (tid($toks[$k]) === T_IMPLEMENTS) { while (txt($toks[$k]) !== '{') $k++; }
        $out .= "export class $cname" . ($ext ? " extends $ext" : '') . ' ';
        $class_stack[] = ['name' => $cname, 'ext' => $ext, 'depth' => $brace_depth + 1, 'props' => [], 'statics' => []];
        $i = $k; // at '{'
        continue;
    }

    // property / method declarations inside class body (depth == class depth)
    if (!empty($class_stack) && $brace_depth === end($class_stack)['depth']
        && in_array($id, [T_PUBLIC, T_PROTECTED, T_PRIVATE, T_STATIC, T_VAR, T_CONST, T_FUNCTION], true)) {
        // gather modifiers
        $static = false; $j = $i;
        while (in_array(tid($toks[$j]), [T_PUBLIC, T_PROTECTED, T_PRIVATE, T_STATIC, T_VAR, T_WHITESPACE], true)) {
            if (tid($toks[$j]) === T_STATIC) $static = true;
            $j++;
        }
        // optional property type (e.g. ?int, array)
        if (tid($toks[$j]) === T_CONST) {
            $nm = next_sig($toks, $j + 1);
            $eq = next_sig($toks, $nm + 1);
            $semi = $eq; while (txt($toks[$semi]) !== ';') $semi++;
            $expr = convert_range($toks, $eq + 1, $semi);
            $out .= 'static ' . txt($toks[$nm]) . ' = ' . trim($expr) . ';';
            $i = $semi + 1; continue;
        }
        if (tid($toks[$j]) === T_FUNCTION) {
            $nm = next_sig($toks, $j + 1);
            $mname = txt($toks[$nm]);
            $op = next_sig($toks, $nm + 1); // '('
            $cp = match_close($toks, $op);
            $params = convert_params($toks, $op, $cp);
            $k = next_sig($toks, $cp + 1);
            if (txt($toks[$k]) === ':') { // return type
                $k = next_sig($toks, $k + 1);
                while (txt($toks[$k]) !== '{' && txt($toks[$k]) !== ';') $k++;
            }
            if (txt($toks[$k]) === ';') { $i = $k + 1; continue; } // abstract
            if ($mname === '__construct') $mname = 'constructor';
            if ($mname === '__toString') $mname = 'toString';
            $out .= ($static ? 'static ' : '') . "$mname($params) ";
            $i = $k;
            continue;
        }
        // property
        $k = $j;
        while (tid($toks[$k]) !== T_VARIABLE) $k++;
        $pname = substr(txt($toks[$k]), 1);
        $n2 = next_sig($toks, $k + 1);
        $expr = 'null';
        if (txt($toks[$n2]) === '=') {
            $semi = $n2; $d = 0;
            for ($semi = $n2 + 1; $semi < $N; $semi++) {
                $tt = txt($toks[$semi]);
                if ($tt === '(' || $tt === '[' || $tt === '{') $d++;
                if ($tt === ')' || $tt === ']' || $tt === '}') $d--;
                if ($d === 0 && $tt === ';') break;
            }
            $expr = trim(convert_range($toks, $n2 + 1, $semi));
        } else { $semi = $n2; }
        $ci = count($class_stack) - 1;
        if ($static) $class_stack[$ci]['statics'][] = [$pname, $expr];
        else $class_stack[$ci]['props'][] = [$pname, $expr];
        $i = $semi + 1;
        // swallow trailing newline whitespace
        if (isset($toks[$i]) && tid($toks[$i]) === T_WHITESPACE) $i++;
        continue;
    }

    if ($s === '{' || $id === T_CURLY_OPEN) {
        $brace_depth++;
        $out .= '{' . (isset($GLOBALS['DECLS'][$i]) ? ' ' . $GLOBALS['DECLS'][$i] : '');
        // right after class open: emit props
        if (!empty($class_stack) && $brace_depth === end($class_stack)['depth']) {
            $out .= "\n__PROPS_" . end($class_stack)['name'] . "__\n";
        }
        $i++; continue;
    }
    if ($s === '}') {
        if (!empty($class_stack) && $brace_depth === end($class_stack)['depth']) {
            $c = array_pop($class_stack);
            $p = '';
            foreach ($c['statics'] as [$n, $e]) $p .= "    static $n = $e;\n";
            if ($c['props']) {
                $p .= "    __init_props() {\n" . ($c['ext'] ? "        super.__init_props?.();\n" : '');
                foreach ($c['props'] as [$n, $e]) $p .= "        this.$n = $e;\n";
                $p .= "    }\n";
            }
            $out = str_replace('__PROPS_' . $c['name'] . '__', rtrim($p), $out);
        }
        $brace_depth--;
        $out .= '}';
        $i++; continue;
    }

    $res = convert_token($toks, $i);
    $out .= $res[0];
    $i = $res[1];
}

echo "// AUTO-CONVERTED from PHP (alttp_vt_randomizer, MIT) — reviewed by hand.\n";
echo "__IMPORTS__\n";
$out = preg_replace('/\breturn[ \t]*\r?\n\s*(?=[^\s;])/', 'return ', $out);
echo $out;

// ------------------------------------------------------------------------
function convert_params($toks, $op, $cp) {
    // drop type hints, keep names and defaults
    $parts = []; $cur = []; $d = 0;
    for ($j = $op + 1; $j < $cp; $j++) {
        $tt = txt($toks[$j]);
        if ($tt === '(' || $tt === '[') $d++;
        if ($tt === ')' || $tt === ']') $d--;
        if ($d === 0 && $tt === ',') { $parts[] = $cur; $cur = []; continue; }
        $cur[] = $j;
    }
    if ($cur) $parts[] = $cur;
    $res = [];
    foreach ($parts as $p) {
        $name = null; $def = null; $rest = '';
        foreach ($p as $k => $j) {
            if (tid($toks[$j]) === T_ELLIPSIS) $rest = '...';
            if (tid($toks[$j]) === T_VARIABLE && $name === null) $name = $rest . jsvar(txt($toks[$j]));
            if (txt($toks[$j]) === '=' ) { $def = trim(convert_range($toks, $j + 1, end($p) + 1)); break; }
        }
        if ($name === null) continue;
        $res[] = $def !== null ? "$name = $def" : $name;
    }
    return implode(', ', $res);
}

function convert_range($toks, $a, $b) {
    $o = '';
    $i = $a;
    while ($i < $b) {
        $id = tid($toks[$i]);
        if ($id === T_WHITESPACE) { $o .= txt($toks[$i]); $i++; continue; }
        if ($id === T_COMMENT) { $c = txt($toks[$i]); if (str_starts_with($c, '#')) $c = '//' . substr($c, 1); $o .= $c; $i++; continue; }
        if ($id === T_DOC_COMMENT) { $i++; continue; }
        $r = convert_token($toks, $i, $b);
        $o .= $r[0]; $i = $r[1];
    }
    return $o;
}

function last_sig_out($o) { return substr(rtrim($o), -1); }

function convert_token($toks, $i, $limit = null) {
    global $GET_NAMES, $used_funcs;
    static $prev_val = false; // whether previous emitted token ended a value
    $t = $toks[$i]; $id = tid($t); $s = txt($t);
    $N = $limit ?? count($toks);

    switch (true) {
        case $id === T_VARIABLE:
            $prev_val = true;
            return [jsvar($s), $i + 1];
        case $id === T_OBJECT_OPERATOR || $id === T_NULLSAFE_OBJECT_OPERATOR:
            $prev_val = false;
            return [$id === T_NULLSAFE_OBJECT_OPERATOR ? '?.' : '.', $i + 1];
        case $id === T_DOUBLE_COLON: {
            $j = next_sig($toks, $i + 1);
            if (tid($toks[$j]) === T_CLASS) return ['', $j + 1];
            $prev_val = false;
            return ['.', $i + 1];
        }
        case $id === T_CONCAT_EQUAL:
            $prev_val = false;
            return ['+=', $i + 1];
        case $s === '.':
            $prev_val = false;
            return [' + ', $i + 1];
        case $id === T_ELSEIF:
            return ['else if', $i + 1];
        case $id === T_LOGICAL_AND:
            return ['&&', $i + 1];
        case $id === T_LOGICAL_OR:
            return ['||', $i + 1];
        case $id === T_STATIC:
            // static::foo -> this.foo
            $prev_val = true;
            return ['this', $i + 1];
        case $id === T_NEW: {
            $j = next_sig($toks, $i + 1);
            $nm = txt($toks[$j]);
            $prev_val = false;
            if (tid($toks[$j]) === T_STATIC) return ['new this.constructor', $j + 1];
            return ['new ' . emit_name($nm), $j + 1];
        }
        case $id === T_STRING && strtolower($s) === 'parent': {
            $j = next_sig($toks, $i + 1); // ::
            $k = next_sig($toks, $j + 1);
            $m = txt($toks[$k]);
            if ($m === '__construct') return ['super', $k + 1];
            return ['super.' . $m, $k + 1];
        }
        case $id === T_STRING && strtolower($s) === 'self':
            return ['this.constructor', $i + 1];
        case $id === T_NAME_QUALIFIED || $id === T_NAME_FULLY_QUALIFIED:
            $prev_val = true;
            return [emit_name($s), $i + 1];
        case $id === T_STRING: {
            $j = next_sig($toks, $i + 1);
            $lower = strtolower($s);
            if (in_array($lower, ['true', 'false', 'null'])) { $prev_val = true; return [$lower, $i + 1]; }
            if (txt($toks[$j]) === '(' ) {
                // function call; detect method call (prev output '.') handled by caller context
                $used_funcs[$s] = true;
            }
            $prev_val = true;
            return [emit_name($s), $i + 1];
        }
        case $id === T_FUNCTION: {
            // closure
            $op = next_sig($toks, $i + 1);
            $cp = match_close($toks, $op);
            $params = convert_params($toks, $op, $cp);
            $k = next_sig($toks, $cp + 1);
            if (tid($toks[$k]) === T_USE) { $u = next_sig($toks, $k + 1); $k = next_sig($toks, match_close($toks, $u) + 1); }
            if (txt($toks[$k]) === ':') { $k = next_sig($toks, $k + 1); while (txt($toks[$k]) !== '{') $k++; }
            $prev_val = false;
            return ["($params) => ", $k];
        }
        case $id === T_FOREACH: {
            $op = next_sig($toks, $i + 1);
            $cp = match_close($toks, $op);
            // split by 'as'
            for ($a = $op + 1; $a < $cp; $a++) if (tid($toks[$a]) === T_AS) break;
            $expr = trim(convert_range($toks, $op + 1, $a));
            $rest = [];
            for ($b = $a + 1; $b < $cp; $b++) if (tid($toks[$b]) !== T_WHITESPACE) $rest[] = $toks[$b];
            if (count($rest) >= 3 && tid($rest[1]) === T_DOUBLE_ARROW) {
                $k = jsvar(txt($rest[0])); $v = txt($rest[2]) === '&' ? jsvar(txt($rest[3])) : jsvar(txt($rest[2]));
                $used_funcs['__entries'] = true;
                return ["for (const [$k, $v] of __entries($expr))", $cp + 1];
            }
            $v = txt($rest[0]) === '&' ? jsvar(txt($rest[1])) : jsvar(txt($rest[0]));
            $used_funcs['__values'] = true;
            return ["for (const $v of __values($expr))", $cp + 1];
        }
        case $id === T_ISSET: {
            $op = next_sig($toks, $i + 1);
            $cp = match_close($toks, $op);
            $inner = trim(convert_range($toks, $op + 1, $cp));
            $prev_val = true;
            return ["($inner != null)", $cp + 1];
        }
        case $id === T_UNSET: {
            $op = next_sig($toks, $i + 1);
            $cp = match_close($toks, $op);
            $inner = trim(convert_range($toks, $op + 1, $cp));
            return ["__unset($inner)", $cp + 1];
        }
        case $id === T_EMPTY:
            $used_funcs['empty'] = true;
            return ['php_empty', $i + 1];
        case $id === T_THROW:
            return ['throw', $i + 1];
        case $id === T_INSTANCEOF: {
            $j = next_sig($toks, $i + 1);
            return ['instanceof ' . emit_name(txt($toks[$j])), $j + 1];
        }
        case $id === T_CONSTANT_ENCAPSED_STRING: {
            $prev_val = true;
            if ($s[0] === "'") {
                // single-quoted: only \' and \\ are escapes
                $inner = substr($s, 1, -1);
                $inner = str_replace(["\\\\", "\\'"], ["\x01", "'"], $inner);
                $inner = str_replace("\\", "\\\\", $inner);
                $inner = str_replace("\x01", "\\\\", $inner);
                return [json_encode($inner, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), $i + 1];
            }
            return [$s, $i + 1];
        }
        case $s === '"': {
            // interpolated string
            $o = '`'; $j = $i + 1;
            while (txt($toks[$j]) !== '"') {
                $tj = $toks[$j];
                if (tid($tj) === T_ENCAPSED_AND_WHITESPACE) {
                    $o .= str_replace(['`', '${'], ['\\`', '\\${'], $tj[1]);
                    $j++;
                } elseif (tid($tj) === T_VARIABLE) {
                    $v = jsvar($tj[1]); $j++;
                    if (tid($toks[$j]) === T_OBJECT_OPERATOR) { $v .= '.' . txt($toks[$j + 1]); $j += 2; }
                    $o .= '${' . $v . '}';
                } elseif (tid($tj) === T_CURLY_OPEN) {
                    $cl = match_close($toks, $j);
                    $o .= '${' . trim(convert_range($toks, $j + 1, $cl)) . '}';
                    $j = $cl + 1;
                } else { $o .= txt($tj); $j++; }
            }
            $prev_val = true;
            return [$o . '`', $j + 1];
        }
        case $s === '[': {
            // literal or index?
            $cl = match_close($toks, $i);
            // look back at previous significant token
            $p = $i - 1;
            while ($p >= 0 && in_array(tid($toks[$p]), [T_WHITESPACE, T_COMMENT], true)) $p--;
            $pt = $toks[$p]; $ps = txt($pt); $pid = tid($pt);
            $is_index = ($pid === T_VARIABLE || $pid === T_STRING && !in_array(strtolower($ps), ['return', 'case', 'echo']) || $ps === ']' || $ps === ')');
            if ($is_index) {
                $inner = trim(convert_range($toks, $i + 1, $cl));
                // collection lookup -> .get()
                $name = $pid === T_VARIABLE ? substr($ps, 1) : $ps;
                $q = next_sig($toks, $cl + 1);
                $is_assign = txt($toks[$q]) === '=';
                if (in_array($name, $GET_NAMES, true) && !$is_assign) return [".get($inner)", $cl + 1];
                if ($inner === '') return ['[__PUSH__]', $cl + 1];
                return ["[$inner]", $cl + 1];
            }
            if (arr_has_double_arrow($toks, $i, $cl)) {
                // object literal: split by top-level commas
                $items = []; $cur = $i + 1; $d = 0;
                for ($j = $i + 1; $j <= $cl; $j++) {
                    $tt = txt($toks[$j]);
                    if ($j === $cl || ($d === 0 && $tt === ',')) {
                        if ($j > $cur) $items[] = [$cur, $j];
                        $cur = $j + 1; continue;
                    }
                    if ($tt === '(' || $tt === '[' || $tt === '{') $d++;
                    if ($tt === ')' || $tt === ']' || $tt === '}') $d--;
                }
                $parts = [];
                foreach ($items as [$a, $b]) {
                    $da = null; $d = 0;
                    for ($j = $a; $j < $b; $j++) {
                        $tt = txt($toks[$j]);
                        if ($tt === '(' || $tt === '[' || $tt === '{') $d++;
                        if ($tt === ')' || $tt === ']' || $tt === '}') $d--;
                        if ($d === 0 && tid($toks[$j]) === T_DOUBLE_ARROW) { $da = $j; break; }
                    }
                    // preserve leading comments/newlines
                    $lead = '';
                    while ($a < $b && in_array(tid($toks[$a]), [T_WHITESPACE, T_COMMENT], true)) { $lead .= tid($toks[$a]) === T_COMMENT ? txt($toks[$a]) : txt($toks[$a]); $a++; }
                    if ($a >= $b) { $parts[] = rtrim($lead); continue; }
                    if ($da === null) { $parts[] = $lead . trim(convert_range($toks, $a, $b)) . ' /*FIXME-noKey*/'; continue; }
                    $k = trim(convert_range($toks, $a, $da));
                    $v = trim(convert_range($toks, $da + 1, $b));
                    if (!preg_match('/^"[^"]*"$/', $k) && !preg_match('/^[A-Za-z_]\w*$/', $k)) $k = "[$k]";
                    $parts[] = $lead . "$k: $v";
                }
                $prev_val = true;
                return ['{' . implode(',', $parts) . "\n}", $cl + 1];
            }
            $inner = convert_range($toks, $i + 1, $cl);
            $prev_val = true;
            return ['[' . $inner . ']', $cl + 1];
        }
        case $id === T_ARRAY && txt($toks[next_sig($toks, $i + 1)]) === '(':
            return ['/*FIXME-array()*/', $i + 1];
        case $id === T_INT_CAST: return ['__int', $i + 1];
        case $id === T_STRING_CAST: return ['__str', $i + 1];
        case $id === T_BOOL_CAST: return ['!!', $i + 1];
        case $id === T_ARRAY_CAST: return ['__arr', $i + 1];
        case $id === T_DOUBLE_ARROW: return [' /*FIXME=>*/ ', $i + 1];
        case $id === T_LNUMBER || $id === T_DNUMBER:
            $prev_val = true;
            return [$s, $i + 1];
        case $s === '{':
            return ['{' . (isset($GLOBALS['DECLS'][$i]) ? ' ' . $GLOBALS['DECLS'][$i] : ''), $i + 1];
        default:
            return [$s, $i + 1];
    }
}

function compute_decls($toks) {
    $n = count($toks); $decls = [];
    for ($i = 0; $i < $n; $i++) {
        if (tid($toks[$i]) !== T_FUNCTION) continue;
        // params
        $op = $i + 1; while ($op < $n && txt($toks[$op]) !== '(') $op++;
        $cp = match_close($toks, $op);
        $params = [];
        for ($j = $op; $j < $cp; $j++) if (tid($toks[$j]) === T_VARIABLE) $params[jsvar(txt($toks[$j]))] = true;
        $k = $cp + 1;
        while ($k < $n && txt($toks[$k]) !== '{' && txt($toks[$k]) !== ';') {
            if (tid($toks[$k]) === T_USE) { $uo = $k + 1; while (txt($toks[$uo]) !== '(') $uo++; $uc = match_close($toks, $uo);
                for ($j = $uo; $j < $uc; $j++) if (tid($toks[$j]) === T_VARIABLE) $params[jsvar(txt($toks[$j]))] = true; $k = $uc; }
            $k++;
        }
        if ($k >= $n || txt($toks[$k]) !== '{') continue;
        $end = match_close($toks, $k);
        $vars = [];
        for ($j = $k + 1; $j < $end; $j++) {
            if (tid($toks[$j]) === T_FUNCTION) { // skip nested function entirely
                $o2 = $j + 1; while (txt($toks[$o2]) !== '(') $o2++;
                $c2 = match_close($toks, $o2); $b2 = $c2 + 1;
                while (txt($toks[$b2]) !== '{') $b2++;
                $j = match_close($toks, $b2); continue;
            }
            if (tid($toks[$j]) === T_VARIABLE) {
                $nx = next_sig($toks, $j + 1);
                if (txt($toks[$nx]) === '=') { $v = jsvar(txt($toks[$j])); if ($v !== 'this' && !isset($params[$v])) $vars[$v] = true; }
                // destructuring [$a, $b] =
            }
            if (txt($toks[$j]) === '[') {
                $c = match_close($toks, $j); $nx = next_sig($toks, $c + 1);
                $prev = $j - 1; while ($prev > 0 && tid($toks[$prev]) === T_WHITESPACE) $prev--;
                $ps = txt($toks[$prev]);
                if (txt($toks[$nx]) === '=' && ($ps === ';' || $ps === '{' || $ps === '}')) {
                    for ($q = $j; $q < $c; $q++) if (tid($toks[$q]) === T_VARIABLE) { $v = jsvar(txt($toks[$q])); if (!isset($params[$v])) $vars[$v] = true; }
                }
            }
        }
        if ($vars) $decls[$k] = 'let ' . implode(', ', array_keys($vars)) . ';';
    }
    return $decls;
}
