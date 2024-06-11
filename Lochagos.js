/*
 * Copyright (C) 2024 Cobalt-II
 * Licensed under GNU General Public License v3.0
 */

// wat file here
let watfile = ``;
// specific func here
let func = ``;

watfile = watfile.split('\n');
let symbols = [];

function readimport(o) {
    let paramslength = 0;
    let result = o.indexOf('result') > -1 ? 1 : 0;
    if (o.indexOf('param') > -1) {
        let c = o.slice(o.indexOf('param') + 5, o.indexOf(')', o.indexOf('param')));
        paramslength = c.length / 4;
    };
    symbols.push([o.slice(o.indexOf('$'), o.indexOf(';') - 2), paramslength, result]);
};

function readfunc(o) {
    let paramslength = o.split('param').length - 1;
    let result = o.indexOf('result') > -1 ? 1 : 0;
    let pos;
    if (o.indexOf('r') > -1) pos = o.indexOf('r') - 2;
    if (o.indexOf('p') > -1) pos = o.indexOf('p') - 2;
    if (o.indexOf('r') === -1 && o.indexOf('p') === -1) pos = o.length;
    symbols.push([o.slice(o.indexOf('$'), pos), paramslength, result]);
};

for (let count = 0; count < watfile.length; count++) {
    if (watfile[count].includes(`func $func`)) readfunc(watfile[count]);
    if (watfile[count].includes(`import "`)) readimport(watfile[count]);
};

let stack = [];
func = func.split('\n');
let lines = false;
let params = [];
let valueparams = [];
let pos = 1;
let result;

while (!lines) {
    if (func[0].indexOf('(', pos) > -1) {
        params.push([func[0].indexOf('(', pos) + 1, func[0].indexOf(')', pos)]);
        pos = func[0].indexOf(')', pos) + 1;
    } else {
        lines = true;
    }
};

for (let count = 0; count < params.length; count++) {
    let o = func[0].slice(params[count][0], params[count][1]);
    if (o[0] === 'p') valueparams.push(o.slice(o.length - 3, o.length));
    if (o[0] === 'r') result = o.slice(o.length - 3, o.length);
};

lines = false;
let count = 1;
while (!lines) {
    let o = `${func[count]}`;
    if (o[o.length - 1] === ')') o = o.slice(0, o.length - 1);
    if (o.includes('local') && !o.includes('get')) {
        valueparams.push(o.slice(o.length - 3, o.length));
        count++;
    } else {
        lines = true;
    }
};

lines = [];

function operation(c, l) {
    for (let count = 0; count < l; count++) stack.pop();
    stack.push(c);
};

function checkNumeric(o) {
    let types = ['f32.', 'f64.', 'i32.', 'i64.'];
    for (let count in types)
        if (o.includes(types[count])) return types[count].slice(0, types[count].length - 1);
    return false;
};

function doLocal(o, b) {
    let c = o.match(/\d/g);
    c = c.join('');
    if (o.includes('get')) {
        if (!b) {
            stack.push(`var${c}`);
        } else {
            stack.push(`global${c}`);
        };
    }
    if (o.includes('set')) {
        if (!b) {
            lines.push(`var${c} = ${stack[stack.length - 1]};`);
        } else {
            lines.push(`global${c} = ${stack[stack.length - 1]};`);
        };
        stack.pop();
    }
    if (o.includes('tee')) {
        lines.push(`var${c} = ${stack[stack.length - 1]};`);
        stack.pop();
        stack.push(`var${c}`);
    }
};

function searchsymbols(k) {
    for (let count = 0; count < symbols.length; count++) {
        if (symbols[count][0] === k) return symbols[count];
    };
    return -1;
};

let c;
let loops = [];

function getOffset(b, d) {
    let offset;
    if (b.includes('offset')) {
        let p1 = b.indexOf('=', d) + 1;
        let p2 = b.length;
        if (b.indexOf(' ', p1) > -1) p2 = b.indexOf(' ', p1);
        offset = b.slice(p1, p2);
    }
    if (!offset) return 0;
    return offset;
};

function getStackArguments(length) {
    let text = '';
    let pos = stack.length - length;
    for (let count = length; count > 0; count--) {
        text += `${stack[pos]}${count > 1 ? ',' : ''}`;
        stack.splice(pos, 1);
    }
    return text;
};

function doNumeric(a, b, d, type) {
    switch (a) {
        case 'const':
            stack.push(b.slice(d, b.length));
            break;
        case 'add':
            c = `(${stack[stack.length - 2]} + ${stack[stack.length - 1]})`;
            operation(c, 2);
            break;
        case 'sub':
            c = `(${stack[stack.length - 2]} - ${stack[stack.length - 1]})`;
            operation(c, 2);
            break;
        case 'mul':
            c = `(${stack[stack.length - 2]} * ${stack[stack.length - 1]})`;
            operation(c, 2);
            break;
        case 'div':
        case 'div_s':
            c = `(${stack[stack.length - 2]} / ${stack[stack.length - 1]})`;
            operation(c, 2);
            break;
        case 'div_u':
            c = `(unsigned(${stack[stack.length - 2]}, '${type}') / ${stack[stack.length - 1]})`;
            operation(c, 2);
            break;
        case 'rem_s':
            c = `(${stack[stack.length - 2]} % ${stack[stack.length - 1]})`;
            operation(c, 2);
            break;
        case 'rem_u':
            c = `(unsigned(${stack[stack.length - 2]}, '${type}') % ${stack[stack.length - 1]})`;
            operation(c, 2);
            break;
        case 'eq':
            c = `(${stack[stack.length - 2]} === ${stack[stack.length - 1]} ? 1 : 0)`;
            operation(c, 2);
            break;
        case 'eqz':
            c = `(!${stack[stack.length - 1]} ? 1 : 0)`;
            operation(c, 1);
            break;
        case 'ne':
            c = `(${stack[stack.length - 2]} !== ${stack[stack.length - 1]} ? 1 : 0)`;
            operation(c, 2);
            break;
        case 'gt':
        case 'gt_s':
            c = `(${stack[stack.length - 2]} > ${stack[stack.length - 1]})`;
            operation(c, 2);
            break;
        case 'gt_u':
            c = `(unsigned(${stack[stack.length - 2]}, '${type}') > ${stack[stack.length - 1]})`;
            operation(c, 2);
            break;
        case 'lt':
        case 'lt_s':
            c = `(${stack[stack.length - 2]} < ${stack[stack.length - 1]})`;
            operation(c, 2);
            break;
        case 'lt_u':
            c = `(unsigned(${stack[stack.length - 2]}, '${type}') < ${stack[stack.length - 1]})`;
            operation(c, 2);
            break;
        case 'ge':
        case 'ge_s':
            c = `(${stack[stack.length - 2]} >= ${stack[stack.length - 1]})`;
            operation(c, 2);
            break;
        case 'ge_u':
            c = `(unsigned(${stack[stack.length - 2]}, '${type}') >= ${stack[stack.length - 1]})`;
            operation(c, 2);
            break;
        case 'le':
        case 'le_s':
            c = `(${stack[stack.length - 2]} <= ${stack[stack.length - 1]})`;
            operation(c, 2);
            break;
        case 'le_u':
            c = `(unsigned(${stack[stack.length - 2]}, '${type}') <= ${stack[stack.length - 1]})`;
            operation(c, 2);
            break;
        case 'min':
            c = `(${stack[stack.length - 2]} < ${stack[stack.length - 1]} ? ${stack[stack.length - 2]} : ${stack[stack.length - 1]})`;
            operation(c, 2);
            break;
        case 'max':
            c = `(${stack[stack.length - 2]} > ${stack[stack.length - 1]} ? ${stack[stack.length - 2]} : ${stack[stack.length - 1]})`;
            operation(c, 2);
            break;
        case 'nearest':
            c = `(Math.round(${stack[stack.length - 1]}))`;
            operation(c, 1);
            break;
        case 'ceil':
            c = `(Math.ceil(${stack[stack.length - 1]}))`;
            operation(c, 1);
            break;
        case 'trunc':
        case 'trunc_f32_s':
        case 'trunc_f64_s':
            c = `(Math.trunc(${stack[stack.length - 1]}))`;
            operation(c, 1);
            break;
        case 'trunc_f32_u':
        case 'trunc_f64_u':
            c = `(unsigned(Math.trunc(${stack[stack.length - 1]}), '${type}'))`;
            operation(c, 1);
            break;
        case 'abs':
            c = `(Math.abs(${stack[stack.length - 1]}))`;
            operation(c, 1);
            break;
        case 'neg':
            c = `(${-stack[stack.length - 1]})`;
            operation(c, 1);
            break;
        case 'sqrt':
            c = `(Math.sqrt(${stack[stack.length - 1]}))`;
            operation(c, 1);
            break;
        case 'copysign':
            c = `(Math.sign(${stack[stack.length - 1]}) * ${stack[stack.length - 2]})`;
            operation(c, 2);
            break;
        case 'and':
            c = `(${stack[stack.length - 2]} & ${stack[stack.length - 1]})`;
            operation(c, 2);
            break;
        case 'or':
            c = `(${stack[stack.length - 2]} | ${stack[stack.length - 1]})`;
            operation(c, 2);
            break;
        case 'xor':
            c = `(${stack[stack.length - 2]} ^ ${stack[stack.length - 1]})`;
            operation(c, 2);
            break;
        case 'shl':
            c = `(${stack[stack.length - 2]} << ${stack[stack.length - 1]})`;
            operation(c, 2);
            break;
        case 'shr_s':
            c = `(${stack[stack.length - 2]} >> ${stack[stack.length - 1]})`;
            operation(c, 2);
            break;
        case 'shr_u':
            c = `(${stack[stack.length - 2]} >>> ${stack[stack.length - 1]})`;
            operation(c, 2);
            break;
        case 'rotl':
            c = `(rotl(${stack[stack.length - 2]}, ${stack[stack.length - 1]}))`;
            operation(c, 2);
            break;
        case 'rotr':
            c = `(rotr(${stack[stack.length - 2]}, ${stack[stack.length - 1]}))`;
            operation(c, 2);
            break;
        case 'extend_i32_u':
            c = `unsigned(${stack[stack.length - 1]}, 'i32')`;
            operation(c, 1);
            break;
        case 'wrap_i64':
            c = `(Number(BigInt.asIntN(32, BigInt(${stack[stack.length - 1]}))))`;
            operation(c, 1);
            break;
        case 'demote_f64':
            c = `(Math.fround(${stack[stack.length - 1]}))`;
            operation(c, 1);
            break;
        case 'reinterpret_f32':
            lines.push(`view.setFloat32(0, ${stack[stack.length - 1]});`);
            c = `(view.getInt32(0))`;
            operation(c, 1);
            break;
        case 'reinterpret_f64':
            lines.push(`view.setFloat64(0, ${stack[stack.length - 1]});`);
            c = `(view.getBigInt64(0))`;
            operation(c, 1);
            break;
        case 'reinterpret_i32':
            lines.push(`view.setInt32(0, ${stack[stack.length - 1]});`);
            c = `(view.getFloat32(0))`;
            operation(c, 1);
            break;
        case 'reinterpret_i64':
            lines.push(`view.setBigInt64(0, ${stack[stack.length - 1]});`);
            c = `(view.getFloat64(0))`;
            operation(c, 1);
            break;
        case 'load':
            c = `(${type}[${stack[stack.length - 1]} + ${getOffset(b, d)}])`;
            operation(c, 1);
            break;
        case 'load8_s':
            c = `(i8[${stack[stack.length - 1]} + ${getOffset(b, d)}])`;
            operation(c, 1);
            break;
        case 'load8_u':
            c = `(u8[${stack[stack.length - 1]} + ${getOffset(b, d)}])`;
            operation(c, 1);
            break;
        case 'load16_s':
            c = `(i16[${stack[stack.length - 1]} + ${getOffset(b, d)}])`;
            operation(c, 1);
            break;
        case 'load16_u':
            c = `(u16[${stack[stack.length - 1]} + ${getOffset(b, d)}])`;
            operation(c, 1);
            break;
        case 'load32_s':
            c = `(i32[${stack[stack.length - 1]} + ${getOffset(b, d)}])`;
            operation(c, 1);
            break;
        case 'load32_u':
            c = `(u32[${stack[stack.length - 1]} + ${getOffset(b, d)}])`;
            operation(c, 1);
            break;
        case 'store':
            lines.push(`${type}[${stack[stack.length - 2]} + ${getOffset(b, d)}] = ${stack[stack.length - 1]};`);
            stack.pop();
            stack.pop();
            break;
        case 'store8':
            lines.push(`i8[${stack[stack.length - 2]} + ${getOffset(b, d)}] = ${stack[stack.length - 1]} & 255;`);
            stack.pop();
            stack.pop();
            break;
        case 'store16':
            lines.push(`i16[${stack[stack.length - 2]} + ${getOffset(b, d)}] = ${stack[stack.length - 1]} & 65535;`);
            stack.pop();
            stack.pop();
            break;
        case 'store32':
            lines.push(`i32[${stack[stack.length - 2]} + ${getOffset(b, d)}] = ${stack[stack.length - 1]} & 4294967295;`);
            stack.pop();
            stack.pop();
            break;
        case 'clz':
            c = `(clz64(BigInt(${stack[stack.length - 1]})))`;
            if (type !== 'i64') c = `(Math.clz32(${stack[stack.length - 1]}))`;
            operation(c, 1);
            break;
        case 'ctz':
            c = `(ctz(${stack[stack.length - 1]}), '${type}')`;
            operation(c, 1);
            break;
        case 'popcnt':
            c = `(popcount(${stack[stack.length - 1]}))`;
            operation(c, 1);
            break;
    }
};

while (count < func.length) {
    let o = `${func[count]}`;
    if (checkNumeric(o)) {
        let c = o.indexOf('.') + 1;
        let d = o.indexOf(' ', c);
        if (d === -1) d = o.length;
        doNumeric(o.slice(c, d), o, d, checkNumeric(o));
    }
    if (o.includes('local')) doLocal(o, 0);
    if (o.includes('global')) doLocal(o, 1);
    if (o.includes('return')) {
        lines.push(`return ${stack[stack.length - 1]};`);
        stack.pop();
    };
    if (o.includes('drop')) stack.pop();
    if (o.includes('unreachable')) lines.push(`throw Error('unreachable');`);
    if (o.includes('select')) {
        c = `(${stack[stack.length - 1]} ? ${stack[stack.length - 3]} : ${stack[stack.length - 2]})`;
        operation(c, 3);
    };
    if (o.includes('if') && !o.includes('br')) {
        if (!o.includes("result")) {
        lines.push(`if (${stack[stack.length - 1]}) {`);
        } else {
        let type;
        let options = ["i32", "f32", "i64", "f64"];
        for (let count in options) if (o.includes(options[count])) type = options[count]; 
        lines.push(`if (typeOfValue(${stack[stack.length - 1]}) === "${type}") {`);  
        }
        stack.pop();
    };
    if (o.includes('end') && !o.includes('extend')) {
        lines.push(`};`);
        if (o.includes('$')) lines.push(`${o.slice(o.indexOf('$'), o.length)}();`);
    };
    if (o.includes('else')) lines.push(`} else {`);
    if (o.includes('memory.grow')) {
        lines.push(`memory.grow(${stack[stack.length - 1]});`);
        stack.pop();
    };
    if (o.includes('memory.size')) stack.push(`memory.size`);
    if (o.includes('loop') || o.includes('block')) {
        let namepos = o.length;
        if (o.indexOf('(') > -1) namepos = o.indexOf('(');
        c = o.slice(o.indexOf('$'), namepos);
        if (o.includes('loop')) loops.push(c);
        lines.push(`function ${c}() {`);
    };
    if (o.includes('br') && !o.includes('br_')) {
        c = o.slice(o.indexOf('$'), o.length);
        if (loops.indexOf(c) > -1) {
            lines.push(`${c}();`);
        } else {
            lines.push(`br_${c};`);
        }
    };
    if (o.includes('br_if')) {
        c = o.slice(o.indexOf('$'), o.length);
        if (loops.indexOf(c) > -1) {
            lines.push(`if (${stack[stack.length - 1]}) ${c}();`);
            stack.pop();
        } else {
            lines.push(`if (${stack[stack.length - 1]}) br_${c};`);
            stack.pop();
        }
    };
    if (o.includes('call') && !o.includes('call_indirect')) {
        c = `${o.slice(o.indexOf('$'), o.length)}`;
        let p = searchsymbols(c);
        let text = getStackArguments(p[1]);
        if (p[2]) {
            stack.push(c + `(` + text + `)`);
        } else {
            lines.push(c + `(` + text + `);`);
        };
    };
    if (o.includes('call_indirect')) {
        let length;
        if (o.includes('param')) length = o.slice(o.indexOf('param') + 5, o.indexOf(')', o.indexOf('param'))).length / 4;
        let text = getStackArguments(length);
        c = `table.get(${stack[stack.length - 1]})(${text})`;
        stack.pop();
        if (o.includes('result')) {
            stack.push(c);
        } else {
            lines.push(c + ';');
        };
    };
    if (o.includes('br_table')) {
        let values = [];
        let counter;
        let h;
        let k = 0;
        while (!counter) {
            k = o.indexOf('$', k + 1);
            h = o.indexOf(' ', k);
            if (h === -1) h = o.length;
            if (k > -1) {
                values.push(o.slice(k, h));
            } else {
                counter = 1;
            };
        };
        lines.push(`br_table_[${values}][${stack[stack.length - 1]}]`);
        stack.pop();
    };
    count++;
};
let paramstring = '';
for (let count = 0; count < params.length; count++) {
    paramstring += `var${count}${count < params.length - 1 ? ',' : ''}`;
};
for (let count = valueparams.length - 1; count > params.length - 1; count--) {
    lines.unshift(`var var${count};`);
};
lines.unshift(`function func (${paramstring}) {`);
for (let count = 0; count < valueparams.length; count++) lines.unshift(`/* var${count} type ${valueparams[count]} */`);
if (result) lines.unshift(`/* return as ${result} */`);
lines.push('};');
console.log(lines.join(''));
