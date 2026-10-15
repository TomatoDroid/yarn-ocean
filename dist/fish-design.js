// A knitted fish is four yarn colours, a body shape and a short name.
// Designs travel in the URL hash, so sharing never touches a server.

export const YARNS = Object.freeze([
  {name: '柠檬黄', hex: '#f3db0c'},
  {name: '橘子橙', hex: '#f48b12'},
  {name: '珊瑚红', hex: '#e84e42'},
  {name: '玫红', hex: '#df1d4e'},
  {name: '樱花粉', hex: '#dea3ab'},
  {name: '葡萄紫', hex: '#9467a3'},
  {name: '薰衣草', hex: '#ad7bc5'},
  {name: '海蓝', hex: '#0489bf'},
  {name: '湖蓝', hex: '#49abce'},
  {name: '孔雀青', hex: '#287e80'},
  {name: '薄荷绿', hex: '#94c7ac'},
  {name: '草绿', hex: '#18b45c'},
  {name: '深海绿', hex: '#16573e'},
  {name: '可可棕', hex: '#84432b'},
  {name: '奶油白', hex: '#eee0b9'},
  {name: '炭黑', hex: '#242520'},
]);

// short: the knit panel's button; fins: how the fin colour reads in a description;
// span: the model's longest extent, for framing close-ups.
export const KINDS = Object.freeze({
  long: {label: '长身小鱼', short: '长身', code: 'l', rx: .78, ry: .31, rz: .25, scale: .94, fins: '鳍尾'},
  round: {label: '圆脸小鱼', short: '圆脸', code: 'r', rx: .46, ry: .46, rz: .33, scale: .92, fins: '小短鳍'},
  fan: {label: '扇形小鱼', short: '扇形', code: 'f', rx: .44, ry: .56, rz: .18, scale: .98, fins: '鳍尾'},
  puffer: {label: '河豚刺球', short: '河豚', code: 'p', rx: .5, ry: .47, rz: .45, scale: .9, fins: '刺和小鳍', span: 1.75},
  angler: {label: '灯笼鮟鱇', short: '鮟鱇', code: 'a', rx: .62, ry: .48, rz: .42, scale: .9, fins: '鳍和灯杆', span: 2.2},
  eel: {label: '长鳗', short: '长鳗', code: 'e', rx: 1.2, ry: .2, rz: .19, scale: .88, fins: '波浪长鳍', span: 3.1},
  ray: {label: '鳐鱼', short: '鳐鱼', code: 'y', rx: .52, ry: .11, rz: .6, scale: .95, fins: '翅边和长尾', span: 3.2},
});

export const PARTS = Object.freeze([
  {key: 'back', label: '背部'},
  {key: 'belly', label: '肚皮'},
  {key: 'fin', label: '鳍尾'},
  {key: 'accent', label: '嘴巴'},
]);

export const NAME_LIMIT = 8;
export const DEFAULT_NAME = '我的毛线鱼';
const VERSION = '1';
const kindByCode = Object.fromEntries(Object.entries(KINDS).map(([kind, {code}]) => [code, kind]));
const CODE = new RegExp(`^${VERSION}([${Object.keys(kindByCode).join('')}])([0-9a-f]{4})$`);

// Drop control and bidi-override characters, collapse spaces, cap by code point.
export function cleanName(value, fallback = DEFAULT_NAME) {
  const text = String(value ?? '')
    .replace(/[\p{Cc}\p{Cf}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
  const name = Array.from(text).slice(0, NAME_LIMIT).join('').trim();
  return name || fallback;
}

const isYarn = value => Number.isInteger(value) && value >= 0 && value < YARNS.length;

export function isDesign(design) {
  return Boolean(design) && Object.hasOwn(KINDS, design.kind) && PARTS.every(({key}) => isYarn(design[key]));
}

export function sameLook(a, b) {
  return Boolean(a && b) && a.kind === b.kind && PARTS.every(({key}) => a[key] === b[key]);
}

export function sameDesign(a, b) {
  return sameLook(a, b) && a.name === b.name;
}

// Body and belly always contrast a little, so random fish never look like one blob.
export function randomDesign(random = Math.random, name = DEFAULT_NAME) {
  const pick = () => Math.floor(random() * YARNS.length) % YARNS.length;
  const kinds = Object.keys(KINDS);
  const back = pick();
  let belly = pick();
  if (belly === back) belly = (belly + 5) % YARNS.length;
  let fin = pick();
  if (fin === back) fin = (fin + 3) % YARNS.length;
  return {kind: kinds[Math.floor(random() * kinds.length) % kinds.length], back, belly, fin, accent: pick(), name: cleanName(name)};
}

export function encodeDesign(design) {
  if (!isDesign(design)) throw new TypeError('Invalid fish design');
  return VERSION + KINDS[design.kind].code + PARTS.map(({key}) => design[key].toString(16)).join('');
}

export function decodeDesign(code, name) {
  const match = CODE.exec(String(code ?? ''));
  if (!match) return null;
  const [back, belly, fin, accent] = Array.from(match[2], digit => Number.parseInt(digit, 16));
  return {kind: kindByCode[match[1]], back, belly, fin, accent, name: cleanName(name)};
}

// The optional sender's name rides along, so the gift can say who knitted it.
export function designToHash(design, {from = ''} = {}) {
  const params = new URLSearchParams({knit: encodeDesign(design), name: cleanName(design.name)});
  const sender = cleanName(from, '');
  if (sender) params.set('from', sender);
  return '#' + params.toString();
}

export function designFromHash(hash) {
  const params = new URLSearchParams(String(hash ?? '').replace(/^#/, ''));
  return params.has('knit') ? decodeDesign(params.get('knit'), params.get('name')) : null;
}

export function shareFromHash(hash) {
  const params = new URLSearchParams(String(hash ?? '').replace(/^#/, ''));
  const design = params.has('knit') ? decodeDesign(params.get('knit'), params.get('name')) : null;
  return design ? {design, from: cleanName(params.get('from'), '')} : null;
}

export function shareUrl(href, design, options) {
  const url = new URL(href);
  url.search = '';
  url.hash = designToHash(design, options);
  return url.toString();
}

export function describeDesign(design) {
  const yarn = key => YARNS[design[key]].name;
  const mouth = design.kind === 'angler' ? '嘴巴和小灯' : '嘴巴';
  return `${yarn('back')}的背、${yarn('belly')}的肚皮，摆着${yarn('fin')}的${KINDS[design.kind].fins}，${mouth}是${yarn('accent')}。`;
}

// Map a design onto the same definition shape the hand-tuned fish use.
export function designToDefinition(design, {origin = 'mine'} = {}) {
  const kind = KINDS[design.kind];
  const [back, belly, fin, accent] = PARTS.map(({key}) => YARNS[design[key]].hex);
  return {
    name: cleanName(design.name),
    desc: describeDesign(design),
    colors: [back, belly, fin, accent],
    kind: design.kind,
    kindLabel: kind.label,
    span: kind.span,
    rx: kind.rx, ry: kind.ry, rz: kind.rz,
    body: [belly, back, back],
    fin, tail: fin, lip: accent,
    eye: '#fff8e8',
    scale: kind.scale,
    angle: 0,
    custom: origin,
    design: {...design, name: cleanName(design.name)},
  };
}
