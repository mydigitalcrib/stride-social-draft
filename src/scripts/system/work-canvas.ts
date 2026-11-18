// Behaviour for experience/WorkCanvas.astro (Our Work, desktop): an endless canvas of case studies, drawn with WebGL.
// The canvas is curved like the inside of a bowl: the further a point is from the middle of the screen, the closer
// it comes, so the tiles towards the edges turn in. Each tile is one sheet (a fine mesh, so it bends smoothly, with no
// seams): it follows the bowl, and like paper it stretches along the way it's moved and its leading edge lifts, the
// more the faster it goes, the light changing across the bend; as it stops it settles flat.
// The tiles are a fixed pool, one per cell of a grid a little bigger than the screen; as the canvas moves, a tile
// that leaves one side comes back in on the other, so it never runs out.
// How it moves: nothing moves the canvas itself. The wheel or trackpad (any direction), a drag and the keyboard all say
// where it should go, and every frame it covers a set share of the
// way there. So it never jumps: a notch of the wheel is a glide, and letting go of a drag is the same glide running
// out; let go while moving, it's thrown, and carries on a little. Left alone, it drifts slowly. A drag isn't a click,
// and a pinch on a trackpad moves nothing.
// Around the pointer the canvas swells, as a sheet does over a hand: the tiles there larger and a little forward, their
// neighbours eased aside; the swell follows the pointer and waits while the canvas is on its way. The tile under the
// pointer plays its footage, if it has some; a press gives a little, the paper dimpling under it (the keyboard's too); a click opens the whole case study over the canvas, without leaving the page (work-preview.ts):
// the tile lifts out of its place, its neighbours easing into the gap, its footage carrying on in the case study, and
// the canvas holds still behind it; closed, the picture lands back in its place and settles. As the canvas first
// appears its tiles are laid down from the middle outwards, each as its picture arrives, so nothing pops. The keyboard
// gets a link per case study (the component), which brings its tile to the middle, ringed and playing its footage;
// the arrow keys walk from tile to tile. Scrolled on to the close, or turned into the list, the canvas sinks back into
// the dark. No notification and no hand camera since 2026-11-18 (the owner: "we're not gonna use it anymore").
// On a screen larger than 1920×1080 all of it grows with the root size (scale.ts), so it keeps its composition beside
// the words around it; its drawing is never more than twice a 1920×1080 screen's at double density, so a 4K or 8K
// screen costs what a laptop's does. It only draws while something is changing.
// Without WebGL the list view opens instead (plain links then: its floating pictures and panel come with the canvas).
import { whenLoaded } from './loaded';
import { deskScale } from './scale';
import { initWorkPreview, type Rect } from './work-preview';
import { initWorkList } from './work-list';
import { clamp, desktop, reduced } from './env';

type Item = { key: string; name: string; meta: string; href: string; video: string };

// Its sizes, px at 1920×1080 and below. On a larger screen each grows with the root size, so the same few large tiles
// fill the screen beside words that have grown as much; the depth grows with them, so the bowl keeps its shape.
const SIZES = {
  cellW: 472, // a tile and the gap to the next
  cellH: 356,
  tileW: 458,
  tileH: 458 * 0.75,
  radius: 14, // its corners
  focal: 1100, // how far the eye is from the screen (the depth of the 3D)
  near: 250, // how much closer the corners of the screen come (the bowl)
  lift: 22, // the tile under the pointer (or the keyboard's) comes forward, on top of the swell...
  pressLift: 14, // ...and goes this much back while it's pressed
  lensR: 472 * 1.4, // how far the swell around the pointer reaches
  lensRise: 30, // how far it comes forward there
  lensCalm: 40, // still to travel at which the swell is half as strong (it waits while the canvas is on its way)
  curlMax: 120,
  drift: 0.12, // per frame, its slow drift when left alone
  moving: 0.6, // per frame: faster than this, it counts as moving (the tiles stop answering the pointer)
  fast: 4, // per frame: caught going faster than this, a press (or a fist) only stops it
  edge: 150, // a tile this far off the screen is still drawn
  wheel: 1, // how far the wheel sends it, for each px it reports
  throwMax: 60, // per frame, the fastest a drag can throw it
  sink: 220, // how far back it goes as the page moves on past it, or the list takes its place
  nudge: 10, // how far an opened tile's neighbours ease into its empty place
  land: 34, // how far forward a tile comes back from its case study, before it settles
  bend: 18, // and how much its outer edge lifts as it lands
  lay: 60, // how far forward each tile starts as the canvas first appears...
  layBend: 26, // ...its outer edge lifted, so it touches down last
};
type Sizes = typeof SIZES;
// Phones and tablets have the same canvas, its tiles in proportion to the screen (a desktop tile is wider than a phone):
// about one and a half across a phone, two across a tablet held upright.
const scaleNow = () => (desktop() ? deskScale() : clamp(window.innerWidth / 820, 0.46, 0.92));
const sized = (s: number) => Object.fromEntries(Object.entries(SIZES).map(([k, v]) => [k, v * s])) as Sizes;
const ASPECT = SIZES.tileW / SIZES.tileH;
const BAND = 0.42; // the share of a tile's height its words are drawn in (from the foot)
const SEG_X = 32; // the sheet's mesh: fine enough for its bends to be smooth
const SEG_Y = 24;
const MAX_PIXELS = 16.6e6; // the most it draws: twice a 1920×1080 screen at double density

const GLIDE = 0.1; // each frame (at 60 a second), the share of the way to where it's been sent that it covers
const DRAG = 1.5; // how far a drag sends it, for each px the pointer moves
const FRICTION = 0.88; // per frame, how quickly a drag's throw dies away
const DRAG_PX = 6; // a press that moves less than this is a click
const THROW_MS = 80; // the last this long of a drag sets the speed it's thrown at
const LENS_PUSH = 0.13; // how much larger the canvas is at the swell's middle (what's around is eased aside)
const DIM = 0.4; // how dim a tile is at rest...
const DIM_OTHERS = 0.62; // ...and while another is under the pointer
// The paper in motion, for each px per frame the canvas moves:
const PAPER = 0.16; // per frame, how quickly the sheets take up the canvas's speed, and let it go
const CURL = 2.4; // px its leading edge lifts
const STRETCH = 0.005; // how much longer it gets along the way (at 1920×1080; a larger screen moves more px)
const STRETCH_MAX = 0.16;
// A press:
const PRESS_IN = 0.35; // per frame, how quickly the paper gives under it...
const PRESS_OUT = 0.3; // ...comes back when it's let go...
const PRESS_DRAG = 0.16; // ...and when it turns into a drag (the curl takes over)
const PRESS_SHOWN = 120; // ms a key's or a fist's press shows before the case study opens
const SPRING = 0.22; // a tile landing (or let go): how strongly it's pulled to its place...
const DAMPING = 0.72; // ...and the share of its speed it keeps each frame (it overshoots a little, once)
// A case study opening and closing:
const HOLD_MS = 440; // ms (not frames: a faster screen too) it goes on drawing as one opens, then holds
const SLOT_SHADOW = 0.12 / 0.42; // how dark the empty place stays, of a tile's shadow
const SLOT_MS = 300; // its shadow fading to that
const LAND_MS = 300; // the landing tile's curl settling
// The canvas's first appearance:
const LAY_MS = 700; // each tile being laid down...
const LAY_AFTER = 40; // ...from this long after the first words are ready...
const LAY_STEP = 0.45; // ...and this many ms later for each px from the middle of the screen
const STEP_MS = 140; // the arrow keys: a tile at a time, at most this often
const LIST_OUT_MS = 160; // the list's lines leaving, before the canvas comes back

const wrap = (v: number, size: number) => ((v % size) + size) % size;
const ease = (t: number) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
// Eases a value towards a target, frame-rate independent (k: the share covered per 60th of a second).
const approach = (v: number, target: number, k: number, dt: number) => v + (target - v) * (1 - Math.pow(1 - k, dt));

const VERTEX = `#version 300 es
in vec2 aUV;
uniform vec2 uView;     // the canvas, px
uniform vec4 uRect;     // the tile, flat: left, top, width, height (px)
uniform float uPad;     // px the quad reaches past the tile (for its shadow, and the focus ring)
uniform vec3 uOffset;   // px: eased into a neighbour's empty place; the shadow a little lower and further back
uniform float uCurve;   // the bowl, 0 to 1 (eased in as the page opens; deeper as the canvas sinks away)
uniform float uNear;
uniform float uFocal;
uniform vec2 uDir;      // the way the canvas is moving
uniform float uCurl;    // px its leading edge lifts
uniform float uStretch; // how much longer it gets along the way
uniform float uLift;    // px it comes forward
uniform vec2 uCursor;   // px: the middle of the swell around the pointer
uniform float uLens;    // the swell, 0 to 1
uniform float uLensR;   // px: how far it reaches
uniform float uPush;    // how much larger the canvas is at its middle
uniform float uRise;    // px it comes forward there
uniform vec3 uBend;     // the tile's own curl (being laid down, or landing): the way its outer edge points, and px
uniform float uPress;   // a press, 0 to 1...
uniform vec2 uPressAt;  // ...and where: px from the tile's middle
uniform float uScale;   // the desktop's scale (the press's size)
out vec2 vPx;           // px from the tile's middle, before it bends
out float vLight;
out float vSheen;

vec2 bowlSlope(vec2 p, out float z) {
  vec2 mid = uView * 0.5;
  vec2 n = (p - mid) / mid;
  vec2 inside = step(abs(n), vec2(1.6));
  n = clamp(n, -1.6, 1.6);
  z = (n.x * n.x * 0.6 + n.y * n.y * 0.4) * uNear * uCurve;
  return vec2(1.2 * n.x, 0.8 * n.y) * inside * uNear * uCurve / mid;
}

void main() {
  vec2 size = uRect.zw;
  vec2 local = (aUV - 0.5) * (size + 2.0 * uPad);
  vPx = local;
  float halfAlong = 0.5 * (abs(uDir.x) * size.x + abs(uDir.y) * size.y);
  float along = clamp(dot(local, uDir) / halfAlong, -1.3, 1.3); // -1 at the trailing edge, 1 at the leading one
  // Stretched along the way it's going...
  vec2 p = uRect.xy + size * 0.5 + local + uDir * dot(local, uDir) * uStretch + uOffset.xy;
  // The swell around the pointer: the canvas larger there, what's around it eased aside.
  vec2 away = p - uCursor;
  float swell = uLens * exp(-dot(away, away) / (uLensR * uLensR));
  p += away * uPush * swell;
  float z;
  vec2 slope = bowlSlope(p, z);
  // ...its leading edge lifting (the trailing one a little), as paper does pushed through the air.
  z += uCurl * (0.6 * along * along + 0.4 * along) + uLift + uOffset.z + uRise * swell;
  slope += uDir * (uCurl * (1.2 * along + 0.4) / halfAlong) - away * (2.0 * uRise * swell / (uLensR * uLensR));
  // Its own curl, the same way: its outer edge (away from the middle of the screen) lifted.
  if (uBend.z > 0.0) {
    float halfOwn = max(0.5 * (abs(uBend.x) * size.x + abs(uBend.y) * size.y), 1.0);
    float own = clamp(dot(local, uBend.xy) / halfOwn, -1.3, 1.3);
    z += uBend.z * (0.6 * own * own + 0.4 * own);
    slope += uBend.xy * (uBend.z * (1.2 * own + 0.4) / halfOwn);
  }
  // A press: the paper giving under it, a soft dimple whose far rim catches the light.
  if (uPress > 0.0) {
    vec2 at = local - uPressAt;
    float r = 120.0 * uScale;
    float dent = uPress * exp(-dot(at, at) / (r * r));
    z -= 16.0 * uScale * dent;
    slope += at * (32.0 * uScale * dent / (r * r));
  }
  // The light: from in front and a little above; turned away, it's darker, and a curl catches a sheen.
  vec3 normal = normalize(vec3(-slope, 1.0));
  vec3 light = normalize(vec3(0.06, -0.12, 1.0));
  vLight = dot(normal, light);
  vSheen = pow(max(dot(reflect(-light, normal), vec3(0.0, 0.0, 1.0)), 0.0), 18.0) * 0.07 * smoothstep(0.02, 0.3, length(slope));
  float s = uFocal / (uFocal - z);
  vec2 screen = uView * 0.5 + (p - uView * 0.5) * s;
  vec2 ndc = screen / uView * 2.0 - 1.0;
  float w = 1.0 / s;
  gl_Position = vec4(ndc.x * w, -ndc.y * w, 0.0, w);
}`;

const FRAGMENT = `#version 300 es
precision highp float;
in vec2 vPx;
in float vLight;
in float vSheen;
uniform vec4 uRect;
uniform float uRadius;
uniform sampler2D uImage;
uniform sampler2D uWords;
uniform sampler2D uFilm;
uniform float uHasImage;  // 0 to 1, as its picture arrives
uniform float uFilmMix;   // 0 to 1, its footage over the picture
uniform vec2 uFilmScale;  // the footage, cropped to the tile
uniform vec2 uShift;      // the picture following the pointer, -1 to 1
uniform float uDim;
uniform float uWordsAlpha;
uniform float uAlpha;
uniform float uFocus;     // the keyboard's ring, 0 to 1...
uniform vec3 uRing;       // ...in the page's lit colour
uniform float uShadow;    // 1: this is its shadow
uniform float uBand;
uniform float uScale;     // the desktop's scale (the shadow's softness, the ring's place)
out vec4 outColor;

const vec3 NAVY = vec3(4.0, 12.0, 28.0) / 255.0;

float box(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  float d = box(vPx, uRect.zw * 0.5, uRadius);
  if (uShadow > 0.5) {
    outColor = vec4(0.0, 0.0, 0.0, (1.0 - smoothstep(-34.0 * uScale, 46.0 * uScale, d)) * 0.42 * uAlpha);
    return;
  }
  float aa = max(fwidth(d), 0.6);
  float inside = 1.0 - smoothstep(-aa, aa, d);
  float ring = uFocus * (1.0 - smoothstep(-aa, aa, abs(d - 5.0 * uScale) - 1.25 * uScale));
  vec2 uv = vPx / uRect.zw + 0.5;
  // The picture, sampled a touch inside its edges so it can follow the pointer; an empty frame until it arrives.
  vec4 pic = texture(uImage, (uv - 0.5) * 0.93 + 0.5 - uShift * 0.03);
  vec3 col = mix(NAVY + 0.05, pic.rgb + NAVY * (1.0 - pic.a), uHasImage);
  if (uFilmMix > 0.0) col = mix(col, texture(uFilm, (uv - 0.5) * uFilmScale + 0.5).rgb, uFilmMix);
  // The shade rising from the foot behind the words, then the dimming.
  float foot = 1.0 - uv.y;
  float g = foot < 0.34 ? mix(0.82, 0.35, foot / 0.34) : mix(0.35, 0.0, clamp((foot - 0.34) / 0.24, 0.0, 1.0));
  col = mix(col, NAVY, g);
  col = mix(col, NAVY, uDim);
  float top = 1.0 - uBand;
  if (uv.y > top) {
    vec4 w = texture(uWords, vec2(uv.x, (uv.y - top) / uBand));
    col = col * (1.0 - w.a * uWordsAlpha) + w.rgb * uWordsAlpha;
  }
  col = col * (0.62 + 0.38 * smoothstep(0.55, 1.0, vLight)) + vSheen;
  float a = inside * uAlpha;
  vec4 tile = vec4(col * a, a);
  vec4 edge = vec4(uRing, 1.0) * ring * uAlpha;
  outColor = tile + edge * (1.0 - tile.a);
}`;

type ItemState = Item & {
  src: string; // its picture, at the size the tiles need
  image: WebGLTexture | null;
  words: WebGLTexture | null;
  wordsAt: number; // when its words were ready (it fades in from then)
  imageAt: number; // when its picture was (it crossfades in from then)
};

type Tile = {
  col: number;
  row: number;
  item: ItemState;
  x: number;
  y: number;
  z: number;
  on: boolean;
  lift: number;
  lv: number; // while it springs (landing, or let go), how fast its lift is changing
  spring: boolean;
  dim: number;
  words: number;
  sx: number;
  sy: number;
  focus: number; // the keyboard's ring, 0 to 1
  press: number; // pressed in, 0 to 1...
  atX: number; // ...and where, px from its middle
  atY: number;
  ox: number; // eased towards a neighbour's empty place
  oy: number;
  born: number; // when it's laid down as the canvas first appears (0: it has been)
  landAt: number; // when it landed back from its case study (0: it has settled)
};

const tileOf = (col: number, row: number, item: ItemState): Tile => ({
  col, row, item, x: 0, y: 0, z: 0, on: false, lift: 0, lv: 0, spring: false, dim: DIM, words: 1, sx: 0, sy: 0,
  focus: 0, press: 0, atX: 0, atY: 0, ox: 0, oy: 0, born: 0, landAt: 0,
});

function initCanvas(root: HTMLElement) {
  const field = root.querySelector<HTMLElement>('[data-canvas-field]');
  const canvas = root.querySelector<HTMLCanvasElement>('[data-canvas-gl]');
  const raw = root.querySelector('[data-canvas-items]')?.textContent;
  if (!field || !canvas || !raw) return;
  let S = scaleNow();
  let G = sized(S);

  // The words at the foot: how tall they are, so the list ends above them (--foot).
  const foot = root.querySelector<HTMLElement>('[data-canvas-foot]');
  const measureFoot = () => foot && root.style.setProperty('--foot', `${Math.round(foot.offsetHeight + (parseFloat(getComputedStyle(foot).bottom) || 0))}px`);
  if (foot) new ResizeObserver(measureFoot).observe(foot);
  measureFoot();

  // How dense the drawing is: the screen's, up to double, and never more than MAX_PIXELS in all (the tiles are
  // photographs dimmed under navy: on a very large screen the difference doesn't show, the cost would).
  const density = (w: number, h: number) => Math.min(2, window.devicePixelRatio || 1, Math.sqrt(MAX_PIXELS / Math.max(1, w * h)));
  // The textures: a little sharper than the screen shows a tile at rest, as it comes closer at the edges (larger on a
  // very large screen, where the tiles are; well within any WebGL 2 card's limit).
  const texW = Math.round(clamp(SIZES.tileW * S * density(window.innerWidth, window.innerHeight) * 1.15, 420, S > 2 ? 1536 : 1024));
  // (Drawn in a tile's own units, so the words grow with it.)
  const k = texW / SIZES.tileW;
  const texH = Math.round(SIZES.tileH * k);
  // The pictures: in a template (never loaded by the page itself); each at the smallest size in its srcset (added by
  // the build) that's as wide as the tiles' textures, or the original.
  const sources = root.querySelector<HTMLTemplateElement>('[data-canvas-sources]')?.content;
  const pick = (img: HTMLImageElement | null | undefined) => {
    if (!img) return '';
    const sizes = (img.getAttribute('srcset') ?? '')
      .split(',')
      .map((c) => c.trim().split(/\s+/))
      .filter((c) => c[0] && /w$/.test(c[1] ?? ''))
      .map((c) => ({ url: c[0], w: parseInt(c[1], 10) }))
      .sort((a, b) => a.w - b.w);
    return (sizes.find((c) => c.w >= texW) ?? sizes[sizes.length - 1])?.url ?? img.getAttribute('src') ?? '';
  };
  const items: ItemState[] = (JSON.parse(raw) as Item[]).map((item) => ({
    ...item,
    src: pick(sources?.querySelector<HTMLImageElement>(`[data-canvas-src="${CSS.escape(item.key)}"]`)),
    image: null,
    words: null,
    wordsAt: 0,
    imageAt: 0,
  }));
  if (!items.length) return;

  /* ---------- Views: the canvas, or the list (also what opens without WebGL) ---------- */
  // Into the list, the canvas sinks back into the dark behind its lines (`away`), then goes (`fieldHidden`); out of it,
  // the lines leave first and the canvas comes back up.
  const list = root.querySelector<HTMLElement>('[data-canvas-list]');
  const views = [...root.querySelectorAll<HTMLButtonElement>('[data-canvas-view]')];
  let asList = false;
  let fieldHidden = false;
  let away = 0;
  let awayTo = 0;
  let listTimer = 0;
  const hideField = (hide: boolean) => {
    fieldHidden = hide;
    root.classList.toggle('is-receded', hide);
  };
  const showList = (on: boolean, instant = reduced()) => {
    if (on === asList) return;
    asList = on;
    awayTo = on ? 1 : 0;
    views.forEach((v) => v.setAttribute('aria-pressed', String((v.dataset.canvasView === 'list') === on)));
    window.clearTimeout(listTimer);
    list?.classList.remove('is-leaving');
    if (on) {
      root.classList.add('is-list');
      if (list) list.hidden = false;
      if (instant) {
        away = 1;
        hideField(true);
      } else run();
      return;
    }
    const back = () => {
      root.classList.remove('is-list');
      list?.classList.remove('is-leaving');
      if (list) list.hidden = true;
      hideField(false);
      run();
    };
    if (instant) {
      away = 0;
      back();
    } else {
      list?.classList.add('is-leaving');
      listTimer = window.setTimeout(back, LIST_OUT_MS);
    }
  };
  views.forEach((b) => b.addEventListener('click', () => showList(b.dataset.canvasView === 'list')));

  // (No multisampling: each tile smooths its own edges, in the shader.)
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
  if (!gl) {
    showList(true, true);
    views.forEach((v) => (v.disabled = v.dataset.canvasView === 'grid'));
    return;
  }

  /* ---------- WebGL: the program, the sheet's mesh, the textures ---------- */
  const uniformNames = [
    'uView', 'uRect', 'uPad', 'uOffset', 'uCurve', 'uNear', 'uFocal', 'uDir', 'uCurl', 'uStretch', 'uLift', 'uRadius',
    'uCursor', 'uLens', 'uLensR', 'uPush', 'uRise', 'uBend', 'uPress', 'uPressAt', 'uScale',
    'uImage', 'uWords', 'uFilm', 'uHasImage', 'uFilmMix', 'uFilmScale', 'uShift', 'uDim', 'uWordsAlpha', 'uAlpha',
    'uFocus', 'uRing', 'uShadow', 'uBand',
  ] as const;
  type U = Record<(typeof uniformNames)[number], WebGLUniformLocation | null>;
  let u = {} as U;
  let vao: WebGLVertexArrayObject | null = null;
  let indexCount = 0;
  let film: WebGLTexture | null = null;
  let blank: WebGLTexture | null = null;
  let aniso: { ext: EXT_texture_filter_anisotropic; max: number } | null = null;
  let lost = false;

  const shader = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
    return s;
  };

  // What depends on the screen's scale (sent again when it changes).
  const sendSizes = () => {
    gl.uniform1f(u.uRadius, G.radius);
    gl.uniform1f(u.uNear, G.near);
    gl.uniform1f(u.uFocal, G.focal);
    gl.uniform1f(u.uLensR, G.lensR);
    gl.uniform1f(u.uRise, G.lensRise);
    gl.uniform1f(u.uScale, S);
  };

  const setup = () => {
    const prog = gl.createProgram()!;
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS) && !gl.isContextLost()) throw new Error(gl.getProgramInfoLog(prog) ?? 'program');
    gl.useProgram(prog);
    u = Object.fromEntries(uniformNames.map((n) => [n, gl.getUniformLocation(prog, n)])) as U;
    // The sheet: a grid of points from (0, 0) to (1, 1), in triangles.
    const uv: number[] = [];
    for (let j = 0; j <= SEG_Y; j++) for (let i = 0; i <= SEG_X; i++) uv.push(i / SEG_X, j / SEG_Y);
    const index: number[] = [];
    for (let j = 0; j < SEG_Y; j++)
      for (let i = 0; i < SEG_X; i++) {
        const a = j * (SEG_X + 1) + i;
        index.push(a, a + 1, a + SEG_X + 1, a + 1, a + SEG_X + 2, a + SEG_X + 1);
      }
    indexCount = index.length;
    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uv), gl.STATIC_DRAW);
    const at = gl.getAttribLocation(prog, 'aUV');
    gl.enableVertexAttribArray(at);
    gl.vertexAttribPointer(at, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(index), gl.STATIC_DRAW);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.DEPTH_TEST);
    gl.uniform1i(u.uImage, 0);
    gl.uniform1i(u.uWords, 1);
    gl.uniform1i(u.uFilm, 2);
    gl.uniform1f(u.uBand, BAND);
    gl.uniform1f(u.uPush, LENS_PUSH);
    sendSizes();
    // The keyboard's ring, in the page's own lit colour.
    const lit = getComputedStyle(root).getPropertyValue('--tone-lit').trim().split(/[\s,/]+/).map(Number);
    const [r, g, b] = lit.length >= 3 && lit.every(Number.isFinite) ? lit : [207, 237, 248];
    gl.uniform3f(u.uRing, r / 255, g / 255, b / 255);
    const ext = gl.getExtension('EXT_texture_filter_anisotropic');
    aniso = ext ? { ext, max: gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT) as number } : null;
    blank = texture(new ImageData(1, 1), false);
    film = texture(new ImageData(1, 1), false);
  };

  // A texture from an image or a canvas: mipmapped, so it stays crisp and still when small or turned.
  const texture = (source: TexImageSource, mips = true, into?: WebGLTexture | null) => {
    const t = into ?? gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    if (mips) {
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.ext.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, aniso.max));
    } else gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    return t;
  };

  /* ---------- What each tile shows: its words, drawn once; its picture, cropped to the tile ---------- */
  const paint = document.createElement('canvas');
  const pen = paint.getContext('2d') as (CanvasRenderingContext2D & { letterSpacing?: string }) | null;
  const css = getComputedStyle(document.documentElement);
  const fontText = css.getPropertyValue('--font-text').trim() || 'system-ui, sans-serif';
  const fontMono = css.getPropertyValue('--font-mono').trim() || 'ui-monospace, monospace';
  let lastArrival = 0; // when words or a picture last arrived (they fade in from then)

  // The client, bottom left; its services stacked on the right, as the cards elsewhere.
  const drawWords = (item: ItemState) => {
    if (!pen) return;
    paint.width = texW;
    paint.height = Math.round(SIZES.tileH * BAND * k);
    const w = paint.width;
    const h = paint.height;
    const pad = 20 * k;
    const foot = 17 * k;
    pen.clearRect(0, 0, w, h);
    pen.textBaseline = 'alphabetic';
    pen.font = `500 ${24 * k}px ${fontText}`;
    pen.letterSpacing = `${-0.48 * k}px`;
    pen.fillStyle = '#fff';
    pen.textAlign = 'left';
    pen.fillText(item.name, pad, h - foot - 4.5 * k);
    const lines = item.meta ? item.meta.split(' · ') : [];
    pen.font = `400 ${9 * k}px ${fontMono}`;
    pen.letterSpacing = `${1.08 * k}px`;
    pen.fillStyle = 'rgb(255 255 255 / 0.72)';
    pen.textAlign = 'right';
    lines.forEach((line, i) => pen.fillText(line.toUpperCase(), w - pad + 1.08 * k, h - foot - 2.5 * k - (lines.length - 1 - i) * 15.5 * k));
    item.words = texture(paint);
    item.wordsAt = lastArrival = performance.now();
  };

  // Uploads wait their turn in the frame loop, a few milliseconds' worth a frame, so the page never stalls on them.
  const queue: (() => void)[] = [];
  const later = (job: () => void) => {
    queue.push(job);
    run();
  };
  const work = () => {
    const start = performance.now();
    while (queue.length && performance.now() - start < 5) queue.shift()!();
  };

  // The picture, cropped to the tile (centred, as object-fit: cover) and sized for the screen (any transparent parts
  // sit on navy, the shader). Its size first (an image that isn't drawn isn't decoded), then the file itself decoded,
  // cropped and resized off the main thread, where the browser can.
  const drawImage = async (item: ItemState) => {
    if (!item.src || !pen) return;
    const img = new Image();
    img.src = item.src;
    try {
      await new Promise((ok, fail) => {
        img.onload = ok;
        img.onerror = fail;
      });
    } catch {
      return;
    }
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    if (!iw || !ih) return;
    const sw = iw / ih > ASPECT ? ih * ASPECT : iw;
    const sh = iw / ih > ASPECT ? ih : iw / ASPECT;
    const sx = (iw - sw) / 2;
    const sy = (ih - sh) / 2;
    let bitmap: ImageBitmap | null = null;
    try {
      const file = await (await fetch(item.src)).blob();
      bitmap = await createImageBitmap(file, sx, sy, sw, sh, { resizeWidth: texW, resizeHeight: texH, resizeQuality: 'high' });
    } catch {
      /* drawn from the image itself, below */
    }
    later(() => {
      if (lost) return;
      if (bitmap) {
        item.image = texture(bitmap);
        bitmap.close();
      } else {
        paint.width = texW;
        paint.height = texH;
        pen.clearRect(0, 0, texW, texH);
        pen.drawImage(img, sx, sy, sw, sh, 0, 0, texW, texH);
        item.image = texture(paint);
      }
      item.imageAt = lastArrival = performance.now();
    });
  };

  const load = async () => {
    // The words wait for the fonts (not long), so they're drawn in the right ones.
    const fonts = Promise.all([document.fonts.load(`500 24px ${fontText}`), document.fonts.load(`400 9px ${fontMono}`)]).catch(() => {});
    await Promise.race([fonts, new Promise((r) => setTimeout(r, 1500))]);
    if (lost) return;
    // Those on the screen first.
    const seen = new Set(tiles.filter((t) => t.on).map((t) => t.item));
    const order = [...items].sort((a, b) => Number(seen.has(b)) - Number(seen.has(a)));
    order.forEach((item) => later(() => drawWords(item)));
    order.forEach((item) => void drawImage(item));
  };

  /* ---------- The canvas: where it is, how it moves ---------- */
  let vw = 0;
  let vh = 0;
  let cols = 7;
  let rows = 5;
  let tiles: Tile[] = [];
  let x = -G.cellW * 0.4; // where the canvas is...
  let y = -G.cellH * 0.3;
  let tx = x; // ...and where it's been sent
  let ty = y;
  let vx = 0; // a drag's throw, px per frame
  let vy = 0;
  let speed = 0; // px per frame, how fast it went last frame
  let curve = 0; // the bowl eases in as the page opens
  // How fast it's moving, as the paper feels it: taken up and let go gently, so the sheets bend and settle smoothly.
  let mx = 0;
  let my = 0;
  let placedX = x;
  let placedY = y;
  // The swell around the pointer: how strong, and where its middle is (on the flat canvas).
  let lens = 0;
  let cx = 0;
  let cy = 0;
  // The bowl's depth this frame, and how far back the whole canvas has sunk (as the page goes on, or for the list).
  let bowlK = 0;
  let sinkZ = 0;
  let sunk = 0; // the page gone on past it, 0 to 1
  let pageTop = 0; // where the section starts on the page (measured with the layout, never while scrolling)
  let hovered: Tile | null = null;
  let focused: Tile | null = null;
  let pressTile: Tile | null = null; // the tile being pressed (the pointer, a key, a fist)
  let lifted: Tile | null = null; // the tile whose case study is open: its place is empty
  let liftedAt = 0;
  let filmTile: Tile | null = null; // the tile whose footage plays
  let laid = false; // the canvas's first appearance has been set going
  const pointer = { x: 0, y: 0, in: false };
  let pressed = false;
  let dragged = false;
  let inView = true;
  let raf = 0;
  let last = 0;
  let held = false; // a preview is open: the canvas holds still behind it...
  let holdUntil = 0; // ...from this moment (performance.now())
  const recede = () => Math.max(sunk, away);

  const layout = () => {
    vw = root.clientWidth;
    vh = root.clientHeight;
    const ratio = density(vw, vh);
    canvas.width = Math.round(vw * ratio);
    canvas.height = Math.round(vh * ratio);
    pageTop = root.getBoundingClientRect().top + window.scrollY;
    measureFoot();
    // On a screen of another scale (the window taken to another display), all of it in proportion, the same tiles in view.
    const s = scaleNow();
    if (s !== S) {
      const by = s / S;
      x *= by;
      y *= by;
      tx *= by;
      ty *= by;
      placedX *= by;
      placedY *= by;
      vx *= by;
      vy *= by;
      mx *= by;
      my *= by;
      S = s;
      G = sized(s);
      sendSizes();
      tiles = [];
    }
    const c = Math.ceil(vw / G.cellW) + 3;
    const r = Math.ceil(vh / G.cellH) + 3;
    if (c === cols && r === rows && tiles.length) return;
    cols = c;
    rows = r;
    hovered = focused = pressTile = lifted = filmTile = previewTile = null;
    tiles = Array.from({ length: cols * rows }, (_, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      return tileOf(col, row, items[(col + row * 3) % items.length]);
    });
  };

  // How far forward a point of the flat canvas is: the bowl, less how far it has all sunk back.
  const bowl = (px: number, py: number) => {
    const nx = clamp((px - vw / 2) / (vw / 2), -1.6, 1.6);
    const ny = clamp((py - vh / 2) / (vh / 2), -1.6, 1.6);
    return (nx * nx * 0.6 + ny * ny * 0.4) * G.near * bowlK - sinkZ;
  };

  // Each tile sits in its cell, shifted by the canvas, wrapped so the grid repeats every cols x rows cells.
  const place = () => {
    const W = cols * G.cellW;
    const H = rows * G.cellH;
    for (const t of tiles) {
      t.x = wrap(t.col * G.cellW + x + G.cellW, W) - G.cellW;
      t.y = wrap(t.row * G.cellH + y + G.cellH, H) - G.cellH;
      t.on = t.x < vw + G.edge && t.x + G.tileW > -G.edge && t.y < vh + G.edge && t.y + G.tileH > -G.edge;
      t.z = bowl(t.x + G.tileW / 2, t.y + G.tileH / 2) + G.lensRise * swellAt(t.x + G.tileW / 2, t.y + G.tileH / 2) + t.lift;
    }
  };

  // How much of the swell reaches a point of the flat canvas.
  const swellAt = (px: number, py: number) => (lens > 0.001 ? lens * Math.exp(-((px - cx) ** 2 + (py - cy) ** 2) / (G.lensR * G.lensR)) : 0);

  // Where a point of the flat canvas is drawn: eased aside by the swell, then through the bowl's perspective (as the
  // vertex shader does it, without the paper's own bend).
  const project = (px: number, py: number, lift: number) => {
    const g = swellAt(px, py);
    const qx = px + (px - cx) * LENS_PUSH * g;
    const qy = py + (py - cy) * LENS_PUSH * g;
    const s = G.focal / (G.focal - bowl(qx, qy) - G.lensRise * g - lift);
    return [vw / 2 + (qx - vw / 2) * s, vh / 2 + (qy - vh / 2) * s];
  };

  // And back: which point of the flat canvas is drawn at a place on the screen (a few rounds, as the depth and the
  // swell both depend on where the point lands).
  const unproject = (sx: number, sy: number, lift: number, swelling = true) => {
    let px = sx;
    let py = sy;
    let qx = sx;
    let qy = sy;
    for (let i = 0; i < 6; i++) {
      const g = swelling ? swellAt(px, py) : 0;
      const s = G.focal / (G.focal - bowl(qx, qy) - G.lensRise * g - lift);
      qx = vw / 2 + (sx - vw / 2) / s;
      qy = vh / 2 + (sy - vh / 2) / s;
      px = cx + (qx - cx) / (1 + LENS_PUSH * g);
      py = cy + (qy - cy) / (1 + LENS_PUSH * g);
    }
    return [px, py];
  };

  // Which tile is at a point on the screen. The one already lifted is tried first, lifted.
  const tileAt = (sx: number, sy: number) => {
    const inside = (t: Tile, [px, py]: number[]) => px >= t.x && px <= t.x + G.tileW && py >= t.y && py <= t.y + G.tileH;
    if (hovered && inside(hovered, unproject(sx, sy, hovered.lift))) return hovered;
    const p = unproject(sx, sy, 0);
    return tiles.find((t) => t.on && t !== hovered && inside(t, p)) ?? null;
  };

  // A point on the screen, in a tile's own px from its middle (where a press lands on it).
  const localOf = (t: Tile, sx: number, sy: number): [number, number] => {
    const [px, py] = unproject(sx, sy, t.lift);
    return [px - (t.x + G.tileW / 2), py - (t.y + G.tileH / 2)];
  };
  const fromMiddle = (t: Tile) => Math.hypot(t.x + G.tileW / 2 - vw / 2, t.y + G.tileH / 2 - vh / 2);
  // A case study's tile nearest the middle of the screen (of those on it, if asked).
  const nearestOf = (key: string, onScreen = false) =>
    tiles.filter((t) => t.item.key === key && (!onScreen || t.on)).sort((p, q) => fromMiddle(p) - fromMiddle(q))[0] ?? null;

  // The tile under the pointer: the cursor shows it can be pressed (global/CursorBuddy reads data-press).
  const setHover = (t: Tile | null) => {
    if (t === hovered) return;
    hovered = t;
    if (t) canvas.dataset.press = '';
    else delete canvas.dataset.press;
  };

  /* ---------- Footage on the tile under the pointer (or the keyboard's) ---------- */
  type Film = HTMLVideoElement & { requestVideoFrameCallback(cb: () => void): number };
  const perFrame = 'requestVideoFrameCallback' in HTMLVideoElement.prototype;
  const films = new Map<ItemState, Film>();
  let filmItem: ItemState | null = null;
  let filmMix = 0;
  let filmScale = [1, 1];
  let filmFresh = false; // a new frame to upload
  const filmFor = (item: ItemState) => {
    let v = films.get(item);
    if (!v && item.video) {
      const film = document.createElement('video') as Film;
      film.muted = true;
      film.loop = true;
      film.playsInline = true;
      film.preload = 'auto';
      film.src = item.video;
      // Each new frame, once (where the browser says when there is one; otherwise every frame is uploaded).
      let waiting = false;
      const onFrame = () => {
        waiting = false;
        filmFresh = true;
        run();
        if (perFrame && !film.paused && !waiting) {
          waiting = true;
          film.requestVideoFrameCallback(onFrame);
        }
      };
      film.addEventListener('playing', () => {
        const va = film.videoWidth / film.videoHeight || ASPECT;
        filmScale = va > ASPECT ? [ASPECT / va, 1] : [1, va / ASPECT];
        if (!waiting) onFrame();
      });
      films.set(item, film);
      v = film;
    }
    return v ?? null;
  };
  const filmPlaying = () => {
    const v = filmItem ? films.get(filmItem) : null;
    return v && !v.paused && v.readyState >= 2 ? v : null;
  };
  const hoverFilm = (t: Tile | null) => {
    filmTile = t;
    const item = t?.item ?? null;
    if (item === filmItem) return;
    if (filmItem) films.get(filmItem)?.pause();
    filmItem = item;
    filmMix = 0;
    if (!item?.video || reduced()) return;
    filmFor(item)?.play().catch(() => {});
  };

  /* ---------- Drawing ---------- */
  const draw = (now: number) => {
    if (lost || !vao) return;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindVertexArray(vao);
    gl.uniform2f(u.uView, vw, vh);
    gl.uniform1f(u.uCurve, bowlK);
    gl.uniform2f(u.uCursor, cx, cy);
    gl.uniform1f(u.uLens, lens);
    const felt = Math.hypot(mx, my);
    const still = reduced();
    gl.uniform2f(u.uDir, felt > 0.01 ? mx / felt : 1, felt > 0.01 ? my / felt : 0);
    gl.uniform1f(u.uCurl, still ? 0 : Math.min(felt * CURL, G.curlMax));
    gl.uniform1f(u.uStretch, still ? 0 : Math.min((felt * STRETCH) / S, STRETCH_MAX));
    // The footage, uploaded when there's a new frame.
    const playing = filmPlaying();
    const filmOn = !!playing;
    if (playing && filmFresh) {
      texture(playing, false, film);
      filmFresh = !perFrame;
    }
    const sink = recede();
    const visible = tiles.filter((t) => t.on && t.item.words).sort((a, b) => a.z - b.z);
    // Each tile's own: how far it still has to be laid down (or has just landed), its outer edge lifted as it does.
    // Returns how far it has been laid down, 0 to 1.
    const own = (t: Tile) => {
      const down = t.born ? ease((now - t.born) / LAY_MS) : 1;
      const landing = t.landAt ? 1 - ease((now - t.landAt) / LAND_MS) : 0;
      const ex = t.x + G.tileW / 2 - vw / 2;
      const ey = t.y + G.tileH / 2 - vh / 2;
      const n = Math.hypot(ex, ey) || 1;
      gl.uniform1f(u.uLift, t.lift + (1 - down) * G.lay - sinkZ);
      gl.uniform3f(u.uBend, ex / n, ey / n, (1 - down) * G.layBend + landing * G.bend);
      return down;
    };
    const alphaOf = (t: Tile, down: number) => (still ? 1 : Math.min(down, ease((now - t.item.wordsAt) / 500)));
    // The shadows first, under everything (an opened tile's stays, fainter, in its empty place).
    gl.uniform1f(u.uShadow, 1);
    gl.uniform1f(u.uPad, 60 * S);
    gl.uniform1f(u.uPress, 0);
    for (const t of visible) {
      const down = own(t);
      const slot = t === lifted ? 1 - (1 - SLOT_SHADOW) * ease((now - liftedAt) / SLOT_MS) : 1;
      gl.uniform4f(u.uRect, t.x, t.y, G.tileW, G.tileH);
      gl.uniform3f(u.uOffset, t.ox, t.oy + 18 * S, -30 * S);
      gl.uniform1f(u.uAlpha, alphaOf(t, down) * (t.item.image ? ease((now - t.item.imageAt) / 600) : 0.4) * slot);
      gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);
    }
    gl.uniform1f(u.uShadow, 0);
    gl.uniform1f(u.uPad, 8 * S);
    gl.uniform2f(u.uFilmScale, filmScale[0], filmScale[1]);
    for (const t of visible) {
      if (t === lifted) continue;
      const item = t.item;
      const down = own(t);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, item.image ?? blank);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, item.words);
      const filmHere = filmOn && t === filmTile && item === filmItem;
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, filmHere ? film : blank);
      gl.uniform1f(u.uFilmMix, filmHere ? filmMix : 0);
      gl.uniform4f(u.uRect, t.x, t.y, G.tileW, G.tileH);
      gl.uniform3f(u.uOffset, t.ox, t.oy, 0);
      gl.uniform1f(u.uHasImage, item.image ? (still ? 1 : ease((now - item.imageAt) / 600)) : 0);
      gl.uniform2f(u.uShift, t.sx, t.sy);
      // Dimmer as it sinks away; without motion, a press shows as a little dimming instead of a dimple.
      gl.uniform1f(u.uDim, Math.min(1, t.dim + 0.35 * sink + (still ? 0.08 * t.press : 0)));
      gl.uniform1f(u.uWordsAlpha, t.words);
      gl.uniform1f(u.uAlpha, alphaOf(t, down));
      gl.uniform1f(u.uFocus, t.focus);
      gl.uniform1f(u.uPress, still ? 0 : t.press);
      gl.uniform2f(u.uPressAt, t.atX, t.atY);
      gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);
    }
  };

  /* ---------- Each frame (only while something is changing: every input, arrival and resize starts it again) ---------- */
  const tick = (now: number) => {
    raf = 0;
    if (!inView || document.hidden || fieldHidden || (held && now > holdUntil)) return;
    const dt = last ? clamp((now - last) / (1000 / 60), 0.25, 3) : 1;
    last = now;
    const still = reduced();
    let stirring = pressed || queue.length > 0;
    let drifting = false;
    // Where it's sent, when nothing else is sending it: on by a drag's throw dying away, or drifting.
    if (!pressed && !held) {
      vx *= Math.pow(FRICTION, dt);
      vy *= Math.pow(FRICTION, dt);
      if (Math.abs(vx) > 0.05 || Math.abs(vy) > 0.05) {
        tx += vx * dt;
        ty += vy * dt;
      } else if (!hovered && !still) {
        drifting = true;
        tx -= G.drift * dt;
        ty -= G.drift * 0.6 * dt;
      }
    }
    // The canvas itself: a share of the way there, every frame. This is all that ever moves it.
    const share = still ? 1 : 1 - Math.pow(1 - GLIDE, dt);
    x += (tx - x) * share;
    y += (ty - y) * share;
    const sx = (x - placedX) / dt;
    const sy = (y - placedY) / dt;
    placedX = x;
    placedY = y;
    speed = Math.hypot(sx, sy);
    // Moving: dragged, or on its way somewhere. The tiles stop answering the pointer meanwhile.
    const moving = (pressed && dragged) || speed > G.moving;
    root.classList.toggle('is-moving', moving);
    // The bowl, easing in from flat as the tiles first appear.
    if (curve < 1 && items[0].wordsAt) curve = still ? 1 : Math.min(1, approach(curve, 1, 0.045, dt) + 0.003 * dt);
    // The paper feels how fast it's going, a little late, and lets go of it as gently.
    mx = approach(mx, sx, PAPER, dt);
    my = approach(my, sy, PAPER, dt);
    // The list taking its place (or giving it back), or the page going on past it: it sinks back, the bowl closing
    // around it, and once the list has it, it goes.
    away = still ? awayTo : approach(away, awayTo, awayTo ? 0.14 : 0.1, dt);
    if (awayTo && away > 0.98) {
      away = 1;
      hideField(true);
    } else if (!awayTo && away < 0.001) away = 0; // (back exactly where it was)
    const sink = recede();
    bowlK = curve * (1 + 0.5 * sink);
    sinkZ = G.sink * sink;
    if (!held) {
      // What points at the canvas: the pointer.
      const aimX = pointer.x;
      const aimY = pointer.y;
      const aiming = pointer.in && !asList;
      // The swell: its middle follows what points, and it waits while the canvas has somewhere to be.
      const calm = 1 / (1 + (Math.abs(tx - x) + Math.abs(ty - y)) / G.lensCalm);
      const swelling = aiming && !(pressed && dragged) ? calm * (1 - sink) : 0;
      const [fx, fy] = unproject(aimX, aimY, 0, false);
      if (lens < 0.004 || still) {
        cx = fx;
        cy = fy;
      } else {
        cx = approach(cx, fx, 0.12, dt);
        cy = approach(cy, fy, 0.12, dt);
      }
      lens = still ? swelling : approach(lens, swelling, 0.08, dt);
      if (Math.abs(lens - swelling) > 0.002 || (lens > 0.004 && Math.abs(cx - fx) + Math.abs(cy - fy) > 0.1)) stirring = true;
      place();
      // Under what points (when the canvas is still): which tile, and that one forward and lit, the rest further back.
      if (moving || !aiming || sink > 0.5) setHover(null);
      else setHover(tileAt(aimX, aimY));
      // Its footage plays; without a pointer on the canvas, the keyboard's tile plays its own.
      hoverFilm(hovered ?? (pointer.in ? null : focused));
      follow(now, dt, still, aimX, aimY);
    } else {
      place();
      hoverFilm(null);
      follow(now, dt, still, pointer.x, pointer.y);
    }
    const filmTo = filmPlaying() ? 1 : 0;
    filmMix = approach(filmMix, filmTo, 0.1, dt);
    work();
    // The first words are ready: the tiles on the screen are laid down, from the middle outwards.
    if (!laid && items.some((item) => item.words)) {
      laid = true;
      if (!still) for (const t of tiles) if (t.on) t.born = now + LAY_AFTER + (fromMiddle(t) * LAY_STEP) / S;
    }
    draw(now);
    if (held) {
      if (now < holdUntil) raf = requestAnimationFrame(tick);
      return;
    }
    stirring ||=
      tilesStirring ||
      drifting ||
      Math.abs(tx - x) + Math.abs(ty - y) > 0.05 ||
      Math.abs(vx) + Math.abs(vy) > 0.05 ||
      Math.abs(mx) + Math.abs(my) > 0.01 ||
      (curve < 1 && !!items[0].wordsAt) ||
      Math.abs(away - awayTo) > 0.001 ||
      now - lastArrival < 700 ||
      filmTo > 0 ||
      Math.abs(filmMix - filmTo) > 0.002 ||
      queue.length > 0;
    if (stirring) raf = requestAnimationFrame(tick);
  };

  // Every tile on the screen, towards how it should be now: forward and lit, ringed, pressed in, beside an empty place.
  let tilesStirring = false;
  const follow = (now: number, dt: number, still: boolean, aimX: number, aimY: number) => {
    tilesStirring = false;
    const lit = hovered ?? focused;
    for (const t of tiles) {
      // Off the screen: back at rest, for when it comes round again.
      if (!t.on) {
        t.lift = t.lv = t.sx = t.sy = t.focus = t.press = t.ox = t.oy = t.born = t.landAt = 0;
        t.spring = false;
        t.dim = DIM;
        t.words = 1;
        continue;
      }
      const on = t === lit;
      const pressing = t === pressTile;
      t.press = still ? Number(pressing) : approach(t.press, Number(pressing), pressing ? PRESS_IN : dragged ? PRESS_DRAG : PRESS_OUT, dt);
      const lift = (on ? G.lift : 0) - (still ? 0 : G.pressLift * t.press);
      if (t.spring && !still) {
        // Landing, or let go: it springs to its place, past it a little and back.
        t.lv = (t.lv + (lift - t.lift) * SPRING * dt) * Math.pow(DAMPING, dt);
        t.lift += t.lv * dt;
        if (Math.abs(lift - t.lift) + Math.abs(t.lv) < 0.05) {
          t.spring = false;
          t.lv = 0;
        }
      } else {
        t.spring = false; // (without motion there's no spring, and nothing left waiting on one)
        t.lift = still ? lift : approach(t.lift, lift, 0.18, dt);
      }
      const dim = on ? 0 : lit ? DIM_OTHERS : DIM;
      t.dim = approach(t.dim, dim, 0.12, dt);
      const words = lit && !on ? 0.55 : 1;
      t.words = approach(t.words, words, 0.12, dt);
      // Its picture follows the pointer a little inside the frame.
      let px = 0;
      let py = 0;
      if (t === hovered && !still) {
        px = clamp(((aimX - (t.x + G.tileW / 2)) / G.tileW) * 2, -1, 1);
        py = clamp(((aimY - (t.y + G.tileH / 2)) / G.tileH) * 2, -1, 1);
      }
      t.sx = approach(t.sx, px, 0.08, dt);
      t.sy = approach(t.sy, py, 0.08, dt);
      const ring = t === focused ? 1 : 0;
      t.focus = still ? ring : approach(t.focus, ring, 0.2, dt);
      // Beside an opened tile's empty place, eased a little into it, as paper relaxes into a gap.
      let nx = 0;
      let ny = 0;
      if (lifted && t !== lifted) {
        const dx = lifted.x - t.x;
        const dy = lifted.y - t.y;
        const d = Math.hypot(dx, dy);
        if (d > 0 && Math.hypot(dx / G.cellW, dy / G.cellH) < 1.6) {
          nx = (dx / d) * G.nudge;
          ny = (dy / d) * G.nudge;
        }
      }
      t.ox = still ? nx : approach(t.ox, nx, 0.12, dt);
      t.oy = still ? ny : approach(t.oy, ny, 0.12, dt);
      if (t.born && now - t.born > LAY_MS) t.born = 0;
      if (t.landAt && now - t.landAt > LAND_MS) t.landAt = 0;
      if (
        !tilesStirring &&
        (t.spring ||
          !!t.born ||
          !!t.landAt ||
          t.press > 0.002 ||
          Math.abs(t.lift - lift) > 0.02 ||
          Math.abs(t.dim - dim) > 0.002 ||
          Math.abs(t.words - words) > 0.002 ||
          Math.abs(t.sx - px) + Math.abs(t.sy - py) > 0.002 ||
          Math.abs(t.focus - ring) > 0.002 ||
          Math.abs(t.ox - nx) + Math.abs(t.oy - ny) > 0.02)
      )
        tilesStirring = true;
    }
  };

  function run() {
    if (!raf) {
      last = 0;
      raf = requestAnimationFrame(tick);
    }
  }

  /* ---------- Dragging, and throwing ---------- */
  let startX = 0;
  let startY = 0;
  let fromX = 0; // where the canvas was sent when the drag began
  let fromY = 0;
  let downTile: Tile | null = null;
  const trail: { t: number; x: number; y: number }[] = []; // the drag's last few moves (for its throw)
  const local = (e: PointerEvent) => {
    const r = root.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };
  field.addEventListener('pointermove', (e) => {
    [pointer.x, pointer.y] = local(e);
    pointer.in = true;
    run();
  });
  field.addEventListener('pointerleave', () => {
    pointer.in = false;
    run();
  });
  field.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    [pointer.x, pointer.y] = local(e);
    pointer.in = true;
    pressed = true;
    dragged = false;
    // Held to the canvas until it's let go, even beyond the window, so a drag never sticks.
    try {
      field.setPointerCapture(e.pointerId);
    } catch {
      /* (a pointer that's already gone) */
    }
    // Caught on its way somewhere fast, a press only stops it; otherwise it may be a click on the tile there, which
    // gives a little under it.
    downTile = speed > G.fast ? null : tileAt(pointer.x, pointer.y);
    pressTile = downTile;
    if (downTile) [downTile.atX, downTile.atY] = localOf(downTile, pointer.x, pointer.y);
    startX = e.clientX;
    startY = e.clientY;
    trail.length = 0;
    trail.push({ t: e.timeStamp, x: e.clientX, y: e.clientY });
    // It stops where it is, and the drag sends it on from there.
    fromX = tx = x;
    fromY = ty = y;
    vx = vy = 0;
    run();
  });
  window.addEventListener('pointermove', (e) => {
    if (!pressed) return;
    trail.push({ t: e.timeStamp, x: e.clientX, y: e.clientY });
    if (trail.length > 8) trail.shift();
    if (!dragged && Math.hypot(e.clientX - startX, e.clientY - startY) < DRAG_PX) return;
    if (!dragged) {
      dragged = true;
      pressTile = null;
      root.classList.add('is-dragging');
    }
    // The drag only says where it should go: the canvas follows, and glides on to there when it's let go.
    tx = fromX + (e.clientX - startX) * DRAG;
    ty = fromY + (e.clientY - startY) * DRAG;
    run();
  });
  // Let go while moving, it's thrown: it carries on at the speed the drag had (the friction slowing it), and the
  // paper's curl shows it.
  const thrown = (e: PointerEvent) => {
    trail.push({ t: e.timeStamp, x: e.clientX, y: e.clientY });
    const recent = trail.filter((p) => e.timeStamp - p.t <= THROW_MS);
    const a = recent[0];
    const b = recent[recent.length - 1];
    if (!a || !b || b.t - a.t < 8) return;
    const per = ((1000 / 60) * DRAG) / (b.t - a.t);
    vx = clamp((b.x - a.x) * per, -G.throwMax, G.throwMax);
    vy = clamp((b.y - a.y) * per, -G.throwMax, G.throwMax);
  };
  const release = (e: PointerEvent) => {
    if (!pressed) return;
    pressed = false;
    root.classList.remove('is-dragging');
    const t = pressTile;
    pressTile = null;
    run();
    if (dragged) {
      if (e.type === 'pointerup' && !reduced()) thrown(e);
      return;
    }
    if (e.type !== 'pointerup' || !downTile) return;
    // The paper springs back as it opens.
    if (t) t.spring = true;
    const href = downTile.item.href;
    if (e.metaKey || e.ctrlKey) window.open(href, '_blank', 'noopener');
    else if (preview) openPreview(downTile);
    else window.location.assign(href);
  };
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
  field.addEventListener('lostpointercapture', release);
  field.addEventListener('dragstart', (e) => e.preventDefault());

  /* ---------- The wheel and trackpad: any direction ---------- */
  field.addEventListener(
    'wheel',
    (e) => {
      if (asList) return;
      e.preventDefault();
      // A pinch on a trackpad arrives as the wheel with the control key: it neither zooms the page nor moves the canvas.
      if (e.ctrlKey) return;
      const unit = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? vh : 1;
      tx -= e.deltaX * G.wheel * unit;
      ty -= e.deltaY * G.wheel * unit;
      vx = vy = 0;
      run();
    },
    { passive: false },
  );

  // The page going on past the canvas (to the close): it sinks back into the dark as it goes.
  window.addEventListener(
    'scroll',
    () => {
      const to = reduced() ? 0 : clamp((window.scrollY - pageTop) / (0.8 * vh || 1), 0, 1);
      if (Math.abs(to - sunk) < 0.0005) return;
      sunk = to;
      run();
    },
    { passive: true },
  );

  /* ---------- A press shown before it opens (a key's, a fist's), so it's seen ---------- */
  let pressTimer = 0;
  const pressThen = (t: Tile, at?: [number, number]) => {
    if (pressTimer) return;
    if (reduced()) return openPreview(t);
    pressTile = t;
    [t.atX, t.atY] = at ? localOf(t, at[0], at[1]) : [0, 0];
    run();
    pressTimer = window.setTimeout(() => {
      pressTimer = 0;
      if (pressTile === t) pressTile = null;
      t.spring = true;
      openPreview(t);
    }, PRESS_SHOWN);
  };

  /* ---------- The keyboard: a link per case study brings its tile to the middle, ringed ---------- */
  // The arrow keys walk to the tile beside it that way (by where it is: the canvas wraps), Home to the first case
  // study's; Enter or Space opens it.
  const links = root.querySelector<HTMLElement>('[data-canvas-links]');
  const linkFor = (key: string) => root.querySelector<HTMLAnchorElement>(`[data-canvas-link="${CSS.escape(key)}"]`);
  let nextFocus: Tile | null = null; // the tile the keys walked to, for the focus that follows
  let stepAt = 0;
  const bringIn = (t: Tile) => {
    focused = t;
    tx = x + vw / 2 - (t.x + G.tileW / 2);
    ty = y + vh / 2 - (t.y + G.tileH / 2);
    vx = vy = 0;
    run();
  };
  root.querySelectorAll<HTMLAnchorElement>('[data-canvas-link]').forEach((a) => {
    a.addEventListener('focus', () => {
      if (asList) return;
      const key = a.dataset.canvasLink ?? '';
      const t = nextFocus?.item.key === key ? nextFocus : nearestOf(key);
      nextFocus = null;
      if (t) bringIn(t);
    });
    a.addEventListener('blur', () => {
      focused = null;
      run();
    });
    // Enter opens its preview too, the paper giving first (a modified click still opens the page).
    a.addEventListener('click', (e) => {
      if (!preview || e.metaKey || e.ctrlKey || e.shiftKey || asList) return;
      const t = focused?.item.key === a.dataset.canvasLink ? focused : tiles.find((q) => q.on && q.item.key === a.dataset.canvasLink);
      if (!t) return;
      e.preventDefault();
      pressThen(t);
    });
  });
  const WAYS: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  links?.addEventListener('keydown', (e) => {
    const link = (e.target as HTMLElement).closest<HTMLAnchorElement>('[data-canvas-link]');
    if (!link || asList || held || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === ' ') {
      e.preventDefault();
      link.click();
      return;
    }
    const way = WAYS[e.key];
    if (!way && e.key !== 'Home') return;
    e.preventDefault();
    const now = performance.now();
    if (now - stepAt < STEP_MS) return;
    stepAt = now;
    let to: Tile | null = null;
    if (!way) to = nearestOf(items[0].key);
    else if (focused) {
      const ax = focused.x + G.tileW / 2 + way[0] * G.cellW;
      const ay = focused.y + G.tileH / 2 + way[1] * G.cellH;
      const off = (t: Tile) => Math.hypot(t.x + G.tileW / 2 - ax, t.y + G.tileH / 2 - ay);
      to = tiles.filter((t) => t !== focused).sort((p, q) => off(p) - off(q))[0] ?? null;
    }
    const next = to && linkFor(to.item.key);
    if (!to || !next) return;
    if (next === document.activeElement) bringIn(to);
    else {
      nextFocus = to;
      next.focus({ preventScroll: true });
    }
  });

  /* ---------- The case study panel (work-preview.ts): the tile grows into it, and shrinks back into it ---------- */
  // Where a tile is on the page: its corners, as they're drawn (with its corners' size there, and where its picture
  // has followed the pointer to, so the picture growing out of it starts as the tile showed it).
  const screenRect = (t: Tile): Rect => {
    const box = root.getBoundingClientRect();
    const xs: number[] = [];
    const ys: number[] = [];
    for (const [px, py] of [[t.x, t.y], [t.x + G.tileW, t.y], [t.x, t.y + G.tileH], [t.x + G.tileW, t.y + G.tileH]]) {
      const [qx, qy] = project(px, py, t.lift);
      xs.push(qx);
      ys.push(qy);
    }
    const width = Math.max(...xs) - Math.min(...xs);
    const height = Math.max(...ys) - Math.min(...ys);
    return { left: box.left + Math.min(...xs), top: box.top + Math.min(...ys), width, height, radius: (G.radius * width) / G.tileW, shift: [t.sx, t.sy] };
  };
  let previewTile: Tile | null = null;
  const preview = initWorkPreview(root, {
    // It lifts out of its place (its shadow fading to a faint one, its neighbours easing into the gap for a few more
    // frames), then the canvas holds still behind it.
    onOpen: () => {
      const still = reduced();
      held = true;
      holdUntil = still ? 0 : performance.now() + HOLD_MS;
      tx = x;
      ty = y;
      vx = vy = 0;
      pressTile = null;
      lifted = previewTile && !still ? previewTile : null;
      liftedAt = performance.now();
      hoverFilm(null);
      run();
    },
    // In the same moment the panel goes, the tile is drawn back in its place (never a frame without it, nor with
    // two); it lands, a little forward and its outer edge lifted, and settles, its neighbours easing back.
    onClose: () => {
      held = false;
      const t = lifted;
      lifted = null;
      previewTile = null;
      if (t) {
        t.spring = true;
        t.lv = 0;
        t.landAt = performance.now();
      }
      if (!fieldHidden) draw(performance.now());
      run();
    },
    // Where the picture goes back to: its tile (or, swapped to another project meanwhile, that one's tile nearest the
    // middle, now empty instead). It comes back a little forward, as it lands.
    rectOf: (key) => {
      if (asList || fieldHidden) return null;
      const t = previewTile && previewTile.item.key === key && previewTile.on ? previewTile : nearestOf(key, true);
      if (!t) return null;
      // (Closed as it's still opening, the canvas stops here, so nothing moves the tile from where the picture lands.)
      holdUntil = 0;
      if (!reduced()) {
        if (t !== lifted) {
          lifted = previewTile = t;
          liftedAt = performance.now() - SLOT_MS;
          t.ox = t.oy = 0;
          draw(performance.now());
        }
        t.lift = G.land;
        t.lv = 0;
        t.spring = false;
      }
      return screenRect(t);
    },
  });
  // Its footage carries on in the case study, from where it was.
  function openPreview(t: Tile) {
    const playing = filmItem === t.item && filmMix > 0.5 ? filmPlaying() : null;
    previewTile = t;
    preview?.open(t.item.key, screenRect(t), playing ? { src: t.item.video, time: playing.currentTime } : null);
  }
  // The list view: each line's picture beside the pointer, and a press opens its case study too (work-list.ts).
  initWorkList(root, {
    src: (key) => items.find((item) => item.key === key)?.src ?? '',
    open: (key, from) => {
      previewTile = null;
      preview?.open(key, from);
    },
  });

  // Sent here for one case study (on desktop the case pages are out of date and their links come here, the owner,
  // 2026-11-13; SiteLayout.astro): it opens over the canvas once the page has opened, and again when the address
  // names another. The address then goes back to Our Work's own.
  const fromAddress = () => {
    const key = decodeURIComponent(location.hash.slice(1));
    if (!key || !items.some((item) => item.key === key) || preview?.isOpen()) return;
    const t = nearestOf(key, true) ?? null;
    previewTile = t;
    preview?.open(key, t ? screenRect(t) : null);
    history.replaceState(null, '', location.pathname + location.search);
  };
  whenLoaded(() => window.setTimeout(fromAddress, 450));
  window.addEventListener('hashchange', fromAddress);

  /* ---------- Start, and keep going ---------- */
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    lost = true;
  });
  canvas.addEventListener('webglcontextrestored', () => {
    lost = false;
    items.forEach((item) => (item.image = item.words = null));
    setup();
    void load();
  });
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    if (inView) run();
  }).observe(root);
  document.addEventListener('visibilitychange', run);
  window.addEventListener('resize', () => {
    layout();
    place();
    run();
  });

  try {
    setup();
  } catch {
    showList(true, true);
    return;
  }
  layout();
  place();
  void load();
  run();
}

export function initWorkCanvas() {
  document.querySelectorAll<HTMLElement>('[data-work-canvas]').forEach((root) => {
    if (root.dataset.canvasReady) return;
    root.dataset.canvasReady = 'true';
    initCanvas(root);
  });
}
