// =====================================================
//  CONFIGURACIÓN — cambia aquí el nombre y los textos
// =====================================================
const CONFIG = {
  name: "Milagros",
};

// =====================================================
//  CANVAS
// =====================================================
const W = 320, H = 180;
const GROUND_Y = 148;   // línea del piso
const SCALE = 2;        // tamaño de los sprites en pantalla

const GIRL_H = SPRITES.idle.height * SCALE;
const GIRL_TOP = GROUND_Y - GIRL_H; // "y" de la chica parada en el piso
const GIRL_HALF = SPRITES.idle.width * SCALE / 2; // centro horizontal del sprite

const canvas = document.getElementById("screen");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const $ = (id) => document.getElementById(id);
const titleScreen = $("title-screen");
const dialog = $("dialog");
const dialogText = $("dialog-text");
const dialogNext = $("dialog-next");
const finaleEl = $("finale");

// =====================================================
//  ESCENA: AMANECER AFUERA
//  Capas de atrás hacia adelante: cielo, sol que va saliendo, montañas
//  lejanas, colinas con pinos, pasto y tierra. Encima se mueven las nubes,
//  los pájaros, las mariposas, el árbol y las flores con el viento.
// =====================================================
const SUN = { x: 252, r: 12 };
const hillH = (x) => 18 + Math.sin(x / 22) * 8 + Math.sin(x / 9) * 3;
const mountainH = (x) => 36 + Math.sin(x / 41 + 1) * 10 + Math.sin(x / 17) * 5 + Math.abs(Math.sin(x / 63)) * 8;

// Cielo en franjas (look retro en vez de degradado suave)
const morningSky = (() => {
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");
  const sky = ["#2b1d4e", "#3d2a6b", "#5a3a8a", "#7d4ea3", "#a864b5", "#d47fb8", "#f2a0b8"];
  const band = GROUND_Y / sky.length;
  sky.forEach((col, i) => { g.fillStyle = col; g.fillRect(0, Math.floor(i * band), W, Math.ceil(band)); });
  return c;
})();

// Todo lo que va delante del sol (el cielo queda transparente)
const morningLand = (() => {
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");
  const r = (col, x, y, w, h) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };

  // Montañas lejanas: el aire las aclara y el sol les pinta la orilla
  for (let x = 0; x < W; x++) {
    const top = GROUND_Y - Math.floor(mountainH(x));
    const lit = mountainH(x + 1) < mountainH(x);   // ladera que mira al sol
    r("#8a5ca6", x, top, 1, GROUND_Y - top);
    r(lit ? "#c98fbf" : "#9d6bb2", x, top, 1, 1);
    if (lit) r("#a874b6", x, top + 1, 1, 2);
  }
  // Neblina entre las montañas y las colinas
  g.globalAlpha = 0.35;
  r("#f2b8cc", 0, GROUND_Y - 30, W, 6);
  g.globalAlpha = 0.2;
  r("#f2b8cc", 0, GROUND_Y - 36, W, 6);
  g.globalAlpha = 1;

  // Colinas con su orilla iluminada
  for (let x = 0; x < W; x++) {
    const h = Math.floor(hillH(x));
    r("#6a3f8f", x, GROUND_Y - h, 1, h);
    r("#8a58a8", x, GROUND_Y - h, 1, 1);
  }
  // Pinitos sobre las colinas (siluetas)
  for (const [px, ph] of [[20, 14], [28, 10], [64, 12], [118, 16], [126, 11], [174, 13], [214, 15], [222, 10], [288, 12], [300, 16]]) {
    const base = GROUND_Y - Math.floor(hillH(px)) + 3;
    for (let k = 0; k < ph; k++) {
      const half = Math.floor((k / ph) * 4);
      r("#4f2f75", px - half, base - ph + k, half * 2 + 1, 1);
    }
    r("#3f2560", px, base, 1, 2);
  }

  // Pasto: orilla con hojitas irregulares, dos tonos y sombra
  r("#4caf50", 0, GROUND_Y, W, 4);
  r("#2e7d32", 0, GROUND_Y + 4, W, 2);
  for (let x = 0; x < W; x++) {
    const n = (x * 37) % 11;
    if (n < 4) r("#4caf50", x, GROUND_Y - 1, 1, 1);
    if (n === 0) r("#5cc060", x, GROUND_Y - 2, 1, 1);
    if (n > 7) r("#6fd06a", x, GROUND_Y, 1, 1);
    if (n === 5) r("#3a9440", x, GROUND_Y + 3, 1, 2);
  }
  // Tierra con piedritas, raíces y vetas
  r("#8d5a3b", 0, GROUND_Y + 6, W, H - GROUND_Y - 6);
  r("#6d4028", 0, GROUND_Y + 6, W, 1);
  g.fillStyle = "#6d4028";
  for (let y = GROUND_Y + 10; y < H; y += 8)
    for (let x = (y / 8) % 2 ? 0 : 8; x < W; x += 16) g.fillRect(x, y, 6, 3);
  for (let k = 0; k < 26; k++) {
    const sx = (k * 83 + 11) % W, sy = GROUND_Y + 9 + ((k * 29) % (H - GROUND_Y - 12));
    r("#5a3420", sx, sy + 1, 3, 1);
    r("#b98a62", sx, sy, 2, 1);
  }
  for (const [rx, ry] of [[40, 160], [190, 166], [270, 158]]) {
    r("#5a3420", rx, ry, 9, 1); r("#5a3420", rx + 8, ry + 1, 5, 1); r("#5a3420", rx + 3, ry - 1, 2, 1);
  }
  return c;
})();

// Nubes que se mueven (cada una a su velocidad)
const clouds = [
  { x: 30, y: 22, s: 0.08 },
  { x: 180, y: 40, s: 0.05 },
  { x: 260, y: 15, s: 0.1 },
];
// warm: qué tanto les pega la luz rosada del sol por abajo
function drawCloud(x, y, warm = 1) {
  ctx.globalAlpha = 0.9;
  rect("#d68fb0", x + 2, y + 9, 26, 2);                         // panza en sombra
  rect("#ffffff", x + 4, y, 16, 4);
  rect("#ffffff", x, y + 4, 28, 6);
  rect("#ffffff", x + 8, y - 3, 8, 3);
  rect("#ffffff", x + 18, y + 1, 6, 3);
  ctx.globalAlpha = 0.9 * warm;
  rect("#f7b6c8", x + 1, y + 8, 26, 2);                         // luz del amanecer por abajo
  rect("#ffd9a0", x + 20, y + 4, 7, 2);
  ctx.globalAlpha = 1;
}

// Pájaros a lo lejos: dos cuadros (alas arriba y alas abajo)
const birds = [
  { x: -20, y: 46, s: 22, phase: 0 }, { x: -34, y: 54, s: 22, phase: 1.3 }, { x: -48, y: 42, s: 22, phase: 2.1 },
  { x: 140, y: 30, s: 15, phase: 0.6 },
];
function drawBird(x, y, up, col = "#3a2550") {
  x = Math.round(x); y = Math.round(y);
  const d = up ? -1 : 1;
  rect(col, x - 2, y + d, 1, 1); rect(col, x - 1, y, 3, 1); rect(col, x + 2, y + d, 1, 1);
}

// Mariposas que revolotean cerca de las flores
const butterflies = [
  { cx: 88, cy: 128, rx: 22, ry: 10, sp: 0.7, phase: 0, col: "#ffe066" },
  { cx: 238, cy: 122, rx: 26, ry: 12, sp: 0.55, phase: 2.4, col: "#7ec8e3" },
];
function drawButterfly(b) {
  const t = time * b.sp + b.phase;
  const x = Math.round(b.cx + Math.sin(t) * b.rx + Math.sin(t * 2.7) * 4);
  const y = Math.round(b.cy + Math.sin(t * 1.9) * b.ry + Math.sin(time * 9 + b.phase) * 1.5);
  const open = Math.floor(time * 12 + b.phase) % 2;
  rect("#140c0c", x, y - 1, 1, 3);
  if (open) { rect(b.col, x - 2, y - 2, 2, 2); rect(b.col, x + 1, y - 2, 2, 2); rect(b.col, x - 1, y, 1, 1); rect(b.col, x + 1, y, 1, 1); }
  else { rect(b.col, x - 1, y - 2, 1, 3); rect(b.col, x + 1, y - 2, 1, 3); }
}

// Flores y matitas al frente: se mecen con el viento
const FLOWERS = [
  [24, "#ff8fb5"], [52, "#ffe066"], [70, "#ffffff"], [96, "#ff4d6d"], [104, "#ffe066"], [214, "#cdb4db"],
  [232, "#ff8fb5"], [250, "#ffffff"], [276, "#ffe066"], [292, "#ff4d6d"],
];
const wind = (x, amp = 1) => Math.round(Math.sin(time * 1.8 + x * 0.21) * amp + Math.sin(time * 0.7 + x * 0.05) * amp * 0.6);
function drawMeadow() {
  for (let x = 2; x < W; x += 7) {   // matitas de pasto
    const s = wind(x, 1);
    rect("#3a9440", x, GROUND_Y - 3, 1, 3);
    rect("#5cc060", x + s, GROUND_Y - 5 + ((x * 7) % 3), 1, 2);
  }
  for (const [x, col] of FLOWERS) {
    const s = wind(x, 1.2);
    rect("#2e7d32", x, GROUND_Y - 5, 1, 5);
    rect("#2e7d32", x + 1, GROUND_Y - 3, 2, 1);                // hojita
    rect(col, x - 1 + s, GROUND_Y - 8, 3, 3);
    rect("#ffd166", x + s, GROUND_Y - 7, 1, 1);
  }
}

// Árbol al frente a la izquierda: la copa se mece en bloques y suelta hojitas
const TREE = { x: 22, top: 60 };
const TREE_LEAVES = [[34, 70, 20], [16, 80, 15], [52, 82, 15], [33, 54, 13], [20, 64, 11]];
function drawTree() {
  const { x, top } = TREE;
  rect("#140c0c", x, top + 30, 10, GROUND_Y - top - 30);
  rect("#5a3a2a", x + 1, top + 30, 8, GROUND_Y - top - 30);
  rect("#7a5038", x + 6, top + 30, 2, GROUND_Y - top - 30);       // lado iluminado
  rect("#140c0c", x - 3, GROUND_Y - 3, 16, 3);                   // raíces
  rect("#5a3a2a", x - 2, GROUND_Y - 3, 14, 2);
  rect("#140c0c", x + 8, top + 40, 12, 3);                       // rama
  rect("#5a3a2a", x + 9, top + 41, 10, 1);
  for (const [i, [cx, cy, rad]] of TREE_LEAVES.entries()) {
    const sx = wind(cx + i * 13, 1.4), sy = Math.round(Math.sin(time * 1.3 + i) * 0.6);
    pixelCircle(cx + sx, cy + sy, rad + 1, "#140c0c");
  }
  for (const [i, [cx, cy, rad]] of TREE_LEAVES.entries()) {
    const sx = wind(cx + i * 13, 1.4), sy = Math.round(Math.sin(time * 1.3 + i) * 0.6);
    pixelCircle(cx + sx, cy + sy, rad, "#2e5a3a");
    pixelCircle(cx + sx + 2, cy + sy - 2, rad - 3, "#3f7a46");
    pixelCircle(cx + sx + 4, cy + sy - 4, Math.max(2, rad - 9), "#5a9a52");  // brillo del lado del sol
  }
  // manzanitas
  for (const [ax, ay] of [[26, 74], [44, 66], [14, 84], [56, 86]]) {
    const sx = wind(ax, 1.4);
    rect("#140c0c", ax + sx - 1, ay - 1, 4, 4);
    rect("#ff4d6d", ax + sx, ay, 2, 2);
  }
}

function drawOutdoor() {
  const rise = 1 - Math.exp(-sceneT / 7);      // el sol va saliendo
  const sunY = Math.round(100 - rise * 34);
  ctx.drawImage(morningSky, 0, 0);
  // El cielo se calienta conforme sale el sol
  ctx.globalAlpha = 0.25 * rise;
  rect("#ffb08a", 0, GROUND_Y - 63, W, 63);
  ctx.globalAlpha = 0.18 * rise;
  rect("#ffd08a", 0, GROUND_Y - 42, W, 42);
  ctx.globalAlpha = 1;

  // Estrellitas que titilan y se apagan con la luz
  for (let i = 0; i < 40; i++) {
    ctx.globalAlpha = (1 - rise * 0.8) * (0.4 + 0.6 * Math.abs(Math.sin(time * 1.5 + i * 1.7)));
    rect("#ffffff", (i * 97) % W, (i * 53) % 60, 1, 1);
  }
  // Sol con halo y rayos que giran despacio
  ctx.fillStyle = "#ffe6a8";
  for (let i = 0; i < 12; i++) {
    const a = time * 0.08 + (i / 12) * Math.PI * 2;
    ctx.globalAlpha = 0.06 * rise;
    ctx.beginPath();
    ctx.moveTo(SUN.x, sunY);
    ctx.lineTo(SUN.x + Math.cos(a - 0.08) * 220, sunY + Math.sin(a - 0.08) * 220);
    ctx.lineTo(SUN.x + Math.cos(a + 0.08) * 220, sunY + Math.sin(a + 0.08) * 220);
    ctx.fill();
  }
  const pulse = Math.sin(time * 2) * 1.5;
  ctx.globalAlpha = 0.12;
  pixelCircle(SUN.x, sunY, SUN.r + 16 + pulse, "#ffd9a0");
  ctx.globalAlpha = 0.2;
  pixelCircle(SUN.x, sunY, SUN.r + 7, "#ffe6b0");
  ctx.globalAlpha = 1;
  pixelCircle(SUN.x, sunY, SUN.r, "#ffd27a");
  pixelCircle(SUN.x - 2, sunY - 2, SUN.r - 3, "#fff1b8");

  clouds.forEach((c) => drawCloud(Math.round(c.x), c.y, 0.5 + rise * 0.5));
  for (const b of birds) drawBird(b.x, b.y + Math.sin(time * 2 + b.phase) * 3, Math.floor(time * 6 + b.phase * 3) % 2);

  ctx.drawImage(morningLand, 0, 0);
  // Neblina que se desliza sobre las colinas
  ctx.globalAlpha = 0.18;
  for (let k = 0; k < 4; k++) {
    const mx = ((k * 97 + time * 4) % (W + 60)) - 60;
    rect("#ffe0ec", Math.round(mx), GROUND_Y - 16 + (k % 2) * 3, 50, 3);
    rect("#ffe0ec", Math.round(mx) + 8, GROUND_Y - 18 + (k % 2) * 3, 30, 2);
  }
  ctx.globalAlpha = 1;

  drawTree();
  drawMeadow();
  butterflies.forEach(drawButterfly);
  drawGirl();
}

function updateOutdoor(dt) {
  for (const c of clouds) { c.x += c.s * 60 * dt; if (c.x > W) c.x = -30; }
  for (const b of birds) { b.x += b.s * dt; if (b.x > W + 20) b.x = -20 - Math.random() * 60; }
  // Hojitas y pétalos que suelta el árbol
  if (Math.random() < dt * 0.9) {
    const [cx, cy, rad] = TREE_LEAVES[(Math.random() * TREE_LEAVES.length) | 0];
    particles.push({
      type: "leaf", x: cx + (Math.random() - 0.5) * rad, y: cy + rad * 0.5, vx: 8 + Math.random() * 8, vy: 10,
      color: Math.random() < 0.3 ? "#ff8fb5" : "#5a9a52", life: 6, phase: Math.random() * 6, floor: GROUND_Y - 1 + Math.random() * 6,
    });
  }
}

// =====================================================
//  ESCENA: OFICINA
//  Habitación en perspectiva: la pared izquierda y la del fondo son
//  de vidrio (en la izquierda está la puerta corrediza, que ella abre
//  con la mano) y la de la derecha es color crema.
// =====================================================
let scene = "outdoor"; // outdoor | office | hallway | night | door | party

// Dónde se sienta ella; la silla y el escritorio se acomodan alrededor.
// El escritorio queda pegado a la pared crema (su extremo toca la pared).
const OFFICE = { girlX: 202, girlY: GROUND_Y - 50 };

// Punto de fuga y esquinas de la pared del fondo
const VP = { x: 160, y: 70 };
const BACK = { x0: 92, x1: 248, y0: 18, y1: 128 };
// "y" de la línea que va del punto de fuga a la esquina (cx, cy), evaluada en x
const persp = (cx, cy, x) => VP.y + ((cy - VP.y) * (x - VP.x)) / (cx - VP.x);
const leftTop = (x) => persp(BACK.x0, BACK.y0, x);
const leftBot = (x) => persp(BACK.x0, BACK.y1, x);
const rightTop = (x) => persp(BACK.x1, BACK.y0, x);
const rightBot = (x) => persp(BACK.x1, BACK.y1, x);

// Puerta corrediza en el vidrio izquierdo: hueco entre x0 y x1.
// La hoja se desliza hacia el fondo, por delante del vidrio fijo.
const DOOR = { x0: 46, x1: 72, travel: 18 };
const doorTop = (x) => leftBot(x) - (leftBot(x) - leftTop(x)) * 0.42;
const door = { open: 0, from: 0, to: 0, t: 0, dur: 0.9, done: null, carry: null };

const CREAM = "#f5ead2";
const OUTSIDE = "#e3edf2";  // lo que se ve del otro lado del vidrio
const ALU = "#b8bcc4", ALU_DARK = "#8e939c";

// Techo con plafones, pared con lambrín y zócalo (pasillo y puerta de la sala)
function paintWallDetails(r, g, floorY) {
  r("#fbf6ea", 0, 0, W, 16);
  for (let x = 0; x < W; x += 24) r("#efe6d2", x, 0, 1, 16);
  r("#efe6d2", 0, 8, W, 1);
  r("#e9dbbd", 0, 16, W, 2);
  r("#e2d4b4", 0, 18, W, 1);
  // Lambrín: la parte de abajo de la pared un tono más oscuro, con moldura
  r("#efe0c2", 0, floorY - 26, W, 21);
  r("#e2d0aa", 0, floorY - 27, W, 2);
  r("#fbf3e0", 0, floorY - 25, W, 1);
  for (let x = 12; x < W; x += 32) r("#e6d6b4", x, floorY - 22, 1, 15);
  r("#e9dbbd", 0, floorY - 5, W, 5);
  r("#d8c8a4", 0, floorY - 5, W, 1);
}
// Charcos de luz brillante en el piso bajo cada lámpara
function paintLightPools(r, g, xs, floorY) {
  g.globalAlpha = 0.5;
  for (const x of xs) {
    for (let k = 0; k < 6; k++) r("#ffffff", x - 22 + k * 3, floorY + 2 + k * 2, 44 - k * 6, 2);
  }
  g.globalAlpha = 1;
}
function paintNoticeBoard(r, x, y) {
  r("#140c0c", x, y, 58, 36);
  r("#c9955b", x + 2, y + 2, 54, 32);
  r("#b98548", x + 2, y + 33, 54, 1);
  for (let k = 0; k < 14; k++) r("#b8844a", x + 4 + ((k * 23) % 50), y + 4 + ((k * 13) % 28), 1, 1);   // textura del corcho
  const notes = [[6, 6, 12, 10, "#ffe066"], [22, 8, 12, 10, "#ff8fb5"], [38, 5, 12, 10, "#8ce99a"], [12, 20, 12, 9, "#7ec8e3"], [30, 21, 14, 10, "#ffffff"]];
  notes.forEach(([nx, ny, w, h, col], i) => {
    r("#a87440", x + nx + 1, y + ny + 1, w, h);                 // sombrita
    r(col, x + nx, y + ny, w, h);
    for (let l = 3; l < h - 2; l += 2) r("#00000022", x + nx + 2, y + ny + l, w - 4 - (l % 3), 1);   // renglones
    r(["#ff4d6d", "#4a78c2", "#e0b040"][i % 3], x + nx + w / 2 - 1, y + ny, 2, 2);  // chinche
  });
}
function paintClockFace(g, cx, cy) {
  const disc = (rad, col) => {
    g.fillStyle = col;
    for (let dy = -rad; dy <= rad; dy++) { const half = Math.round(Math.sqrt(rad * rad - dy * dy)); g.fillRect(cx - half, cy + dy, half * 2, 1); }
  };
  disc(8, "#140c0c"); disc(7, "#e0b040"); disc(6, "#ffffff");
  g.fillStyle = "#c9c9d9";
  for (const [dx, dy] of [[0, -5], [5, 0], [0, 5], [-5, 0]]) g.fillRect(cx + dx - (dx > 0 ? 1 : 0), cy + dy - (dy > 0 ? 1 : 0), 1, 1);
  g.fillStyle = "#e2d4b4"; g.fillRect(cx - 6, cy + 9, 12, 1);
}
function paintCooler(r, x, floorY) {
  r("#140c0c", x, floorY - 32, 16, 32);
  r("#ffffff", x + 1, floorY - 31, 14, 30);
  r("#e2e2ea", x + 11, floorY - 31, 4, 30);
  r("#c9c9d9", x + 3, floorY - 22, 10, 1);
  r("#140c0c", x + 1, floorY - 50, 14, 19);
  r("#9fd4ff", x + 2, floorY - 49, 12, 17);
  r("#7ec0f0", x + 2, floorY - 46, 12, 1);
  r("#dff3ff", x + 3, floorY - 47, 2, 12);
  r("#4a78c2", x + 3, floorY - 24, 3, 3);
  r("#ff4d6d", x + 8, floorY - 24, 3, 3);
}

// Piso blanco de mosaico en perspectiva (oficina y pasillo)
function paintTileFloor(r) {
  r("#f7f7f4", 0, BACK.y1, W, H - BACK.y1);
  [133, 140, 150, 164].forEach((y) => r("#e2e2dc", 0, y, W, 1));
  for (let xb = BACK.x0 - 110; xb <= BACK.x1 + 110; xb += 22)
    for (let y = BACK.y1; y < H; y++)
      r("#e2e2dc", Math.round(VP.x + ((xb - VP.x) * (y - VP.y)) / (BACK.y1 - VP.y)), y, 1, 1);
}

const officeBg = (() => {
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");
  const r = (col, x, y, w, h) => { g.fillStyle = col; g.fillRect(x, Math.round(y), w, Math.round(h)); };

  // Techo y piso blanco
  r("#fbf6ea", 0, 0, W, BACK.y1);
  paintTileFloor(r);
  // Paneles de luz en el techo, en perspectiva hacia el fondo
  const ceilX = (u, y) => VP.x + ((u - VP.x) * (VP.y - y)) / (VP.y - BACK.y0);
  for (const [y0, y1] of [[2, 6], [10, 13]]) {
    for (let y = y0 - 1; y <= y1 + 1; y++) {
      const a = Math.round(ceilX(128, y)), b = Math.round(ceilX(192, y));
      r(y < y0 || y > y1 ? "#e6dfcc" : y === y0 ? "#fffdf4" : "#ffffff", a, y, b - a, 1);
    }
  }
  r("#efe8d6", 0, BACK.y0 - 1, W, 1);
  // Reflejo de los ventanales sobre el piso brillante
  g.globalAlpha = 0.35;
  for (const x of [100, 152, 204]) {
    for (let y = BACK.y1; y < BACK.y1 + 14; y++)
      r("#ffffff", Math.round(VP.x + ((x - VP.x) * (y - VP.y)) / (BACK.y1 - VP.y)), y, 20 - (y - BACK.y1), 1);
  }
  g.globalAlpha = 1;

  // Pared derecha color crema (columna por columna, en perspectiva)
  for (let x = BACK.x1; x < W; x++) {
    const t = rightTop(x), b = rightBot(x);
    r(CREAM, x, t, 1, b - t);
    r("#e9dbbd", x, b - (b - t) * 0.04, 1, (b - t) * 0.04 + 1);   // zócalo
  }
  // Cosas colgadas en la pared crema: se deforman igual que la pared
  const onWall = (x0, x1, v0, v1, col) => {
    for (let x = x0; x < x1; x++) {
      const t = rightTop(x), h = rightBot(x) - t;
      r(col, x, t + h * v0, 1, h * (v1 - v0));
    }
  };
  onWall(256, 280, 0.2, 0.44, "#140c0c");       // cuadrito con corazón
  onWall(258, 278, 0.22, 0.42, "#ffffff");
  onWall(263, 267, 0.27, 0.3, "#ff4d6d"); onWall(269, 273, 0.27, 0.3, "#ff4d6d");
  onWall(262, 274, 0.3, 0.34, "#ff4d6d");
  onWall(264, 272, 0.34, 0.37, "#ff4d6d"); onWall(266, 270, 0.37, 0.39, "#ff4d6d");
  onWall(284, 298, 0.2, 0.3, "#140c0c");        // reloj (las manecillas se mueven, ver drawOfficeClock)
  onWall(286, 296, 0.215, 0.285, "#ffffff");
  onWall(290, 292, 0.218, 0.222, "#c9c9d9"); onWall(290, 292, 0.278, 0.282, "#c9c9d9");
  onWall(284, 298, 0.34, 0.5, "#140c0c");       // calendario
  onWall(285, 297, 0.35, 0.49, "#ffffff");
  onWall(285, 297, 0.35, 0.38, "#ff4d6d");
  for (let k = 0; k < 3; k++) for (let j = 0; j < 3; j++) onWall(287 + k * 4, 289 + k * 4, 0.405 + j * 0.03, 0.418 + j * 0.03, "#c9c9d9");
  onWall(291, 293, 0.435, 0.448, "#ff4d6d");    // un día marcado con corazón
  onWall(304, 308, 0.52, 0.58, "#140c0c");      // apagador
  onWall(305, 307, 0.53, 0.57, "#ffffff");
  // Brillo del cuadro y sombra bajo el cuadro y el reloj
  onWall(258, 261, 0.22, 0.3, "#f4f4ff");
  onWall(257, 281, 0.44, 0.455, "#e2d4b4");
  onWall(285, 299, 0.3, 0.31, "#e2d4b4");

  // Lo que se ve del otro lado del vidrio izquierdo (el vidrio va encima, en drawLeftGlass)
  for (let x = 0; x < BACK.x0; x++) {
    const t = Math.round(leftTop(x)), b = Math.round(leftBot(x));
    r(OUTSIDE, x, t, 1, b - t);
    r("#d3e0e7", x, b - (b - t) * 0.3, 1, (b - t) * 0.3);   // piso de afuera
  }

  // Pared del fondo de vidrio: se ve el pasillo de afuera
  const bw = BACK.x1 - BACK.x0, bh = BACK.y1 - BACK.y0;
  r(OUTSIDE, BACK.x0, BACK.y0, bw, bh);
  r("#d3e0e7", BACK.x0, BACK.y1 - 22, bw, 22);
  r("#c9d6de", BACK.x0, BACK.y1 - 23, bw, 1);
  // Del otro lado: lámparas, una puerta, un sillón y una planta
  for (const x of [104, 160, 216]) { r("#ffffff", x, BACK.y0 + 4, 18, 2); r("#d8e4ea", x + 2, BACK.y0 + 6, 14, 1); }
  r("#b8c6d0", 108, 52, 24, 54); r("#cfdbe2", 110, 54, 20, 52); r("#9fb0bc", 126, 80, 3, 2);
  r("#b8c6d0", 150, 86, 34, 14); r("#c4d0d8", 150, 80, 34, 7); r("#b8c6d0", 152, 100, 2, 6); r("#b8c6d0", 180, 100, 2, 6);
  r("#bccad2", 214, 94, 12, 12);
  for (const [lx, ly, lw, lh] of [[212, 74, 4, 20], [218, 66, 4, 28], [224, 76, 4, 18]]) r("#a8c4b4", lx, ly, lw, lh);
  g.globalAlpha = 0.35;
  r("#bfe3f2", BACK.x0, BACK.y0, bw, bh);
  g.globalAlpha = 0.6;
  for (let k = 0; k < 7; k++) {
    const x = BACK.x0 + 8 + k * 22;
    r("#ffffff", x, 40 + (k % 3) * 10, 1, 10);
    r("#ffffff", x + 3, 44 + (k % 3) * 10, 1, 5);
  }
  g.globalAlpha = 1;
  // marco de aluminio y divisiones
  r(ALU, BACK.x0, BACK.y0, bw, 2);
  r(ALU, BACK.x0, BACK.y1 - 3, bw, 3);
  [BACK.x0 - 1, 144, 196, BACK.x1 - 2].forEach((x) => r(ALU_DARK, x, BACK.y0, 2, bh));

  return c;
})();

const rect = (col, x, y, w, h) => { ctx.fillStyle = col; ctx.fillRect(x, Math.round(y), w, Math.round(h)); };

// =====================================================
//  LUZ, SOMBRAS Y REFLEJOS (compartido por todas las escenas)
//  Cada escena define su luz con setAmbient: un tinte del ambiente,
//  un contraluz (rim) del lado de donde viene la luz y qué tanto
//  refleja el piso a los personajes.
// =====================================================
const ambient = {};
function setAmbient(o = {}) {
  Object.assign(ambient, { tint: null, tintA: 0, rim: null, rimA: 0, rimDx: 1, reflect: 0 }, o);
}
setAmbient();

// Sombra suave: elipse pixelada, más oscura en el centro
function softShadow(cx, y, w, a = 0.25) {
  cx = Math.round(cx); y = Math.round(y);
  ctx.fillStyle = "#1a0f1f";
  const band = (ww, yy, al) => { ctx.globalAlpha = al; ctx.fillRect(cx - Math.round(ww / 2), yy, Math.round(ww), 1); };
  band(w * 0.7, y - 2, a * 0.45);
  band(w, y - 1, a * 0.7);
  band(w * 0.8, y, a * 0.6);
  band(w * 0.45, y - 1, a * 0.5);
  ctx.globalAlpha = 1;
}

// Personajes: el sprite se arma en un canvas auxiliar (con el torso
// separado de las piernas si respira o suspira), se tiñe con la luz de
// la escena y se dibuja con su contraluz y su reflejo en el piso.
const actorBuf = document.createElement("canvas");
const rimBuf = document.createElement("canvas");
const ACTOR_PAD = 2;
// parts: [fila inicial, número de filas, desplazamiento en y]
function drawLit(img, x, y, flip = false, parts = [[0, img.height, 0]], floorY = null) {
  x = Math.round(x); y = Math.round(y);
  const w = img.width * SCALE, h = img.height * SCALE + ACTOR_PAD * 2;
  const g = actorBuf.getContext("2d");
  if (actorBuf.width !== w || actorBuf.height !== h) { actorBuf.width = w; actorBuf.height = h; }
  else g.clearRect(0, 0, w, h);
  g.imageSmoothingEnabled = false;
  for (const [sy, sh, dy] of parts) g.drawImage(img, 0, sy, img.width, sh, 0, ACTOR_PAD + sy * SCALE + dy, w, sh * SCALE);
  if (ambient.tint && ambient.tintA > 0) {
    g.globalCompositeOperation = "source-atop";
    g.globalAlpha = ambient.tintA;
    g.fillStyle = ambient.tint;
    g.fillRect(0, 0, w, h);
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
  }
  const put = (src, dx, a, sy = 0, sh = h, mirror = false) => {
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.translate(flip ? x + w + dx : x + dx, mirror ? 2 * floorY : 0);
    ctx.scale(flip ? -1 : 1, mirror ? -1 : 1);
    ctx.drawImage(src, 0, sy, w, sh, 0, y - ACTOR_PAD + sy, w, sh);
    ctx.restore();
  };
  // Reflejo en el piso: solo se alcanzan a ver los pies y se desvanece
  if (floorY !== null && ambient.reflect > 0) {
    const feet = ACTOR_PAD + img.height * SCALE;
    put(actorBuf, 0, ambient.reflect * 0.5, feet - 18, 18, true);
    put(actorBuf, 0, ambient.reflect * 0.5, feet - 8, 8, true);
  }
  if (ambient.rim && ambient.rimA > 0) {
    const r = rimBuf.getContext("2d");
    if (rimBuf.width !== w || rimBuf.height !== h) { rimBuf.width = w; rimBuf.height = h; }
    else r.clearRect(0, 0, w, h);
    r.globalCompositeOperation = "source-over";
    r.drawImage(actorBuf, 0, 0);
    r.globalCompositeOperation = "source-in";
    r.fillStyle = ambient.rim;
    r.fillRect(0, 0, w, h);
    put(rimBuf, ambient.rimDx, ambient.rimA);
  }
  put(actorBuf, 0, 1);
}
// Respirando: el torso sube un pixel de vez en cuando (cut = fila donde empiezan las piernas)
const breath = (phase) => (Math.sin(time * 2.2 + phase) > 0.35 ? 1 : 0);
const breathing = (img, cut, lift) => (lift ? [[cut, img.height - cut, 0], [0, cut + 1, -lift]] : undefined);
// Parpadeo: cada quien a su ritmo
const blinking = (phase) => (time + phase * 0.77) % 3.4 < 0.14;

// Lámparas de techo: cono de luz hacia el piso y charco de luz abajo
function ceilingLight(x, w, y, floorY, power = 1) {
  ctx.globalAlpha = 0.07 * power;
  ctx.fillStyle = "#fff6d8";
  ctx.beginPath();
  ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w + 18, floorY); ctx.lineTo(x - 18, floorY);
  ctx.fill();
  ctx.globalAlpha = 0.5 * power;
  rect("#fff4c4", x + 2, y, w - 4, 1);
  ctx.globalAlpha = 1;
}
// Lámpara que de vez en cuando parpadea
const flicker = (seed) => {
  const k = Math.floor(time * 12);
  return ((k * 2654435761 + seed * 977) >>> 0) % 97 < 4 ? 0.3 : 1;
};

// Polvito que flota en la luz
function drawMotes(n, x0, y0, w, h, seed = 0, col = "#fff8e0") {
  for (let i = 0; i < n; i++) {
    const px = x0 + ((i * 53 + seed * 31 + time * (3 + (i % 3))) % w);
    const py = y0 + ((i * 37 + seed * 17 + Math.sin(time * 0.8 + i) * 6 + h) % h);
    ctx.globalAlpha = 0.25 + 0.45 * Math.abs(Math.sin(time * 1.3 + i * 1.7));
    rect(col, Math.round(px), Math.round(py), 1, 1);
  }
  ctx.globalAlpha = 1;
}

// Reloj de pared redondo: el segundero avanza a saltitos
function clockHands(cx, cy, len, sx = 1) {
  const sec = Math.floor(time) % 60, min = (time / 60 + 12) % 60;
  const hand = (frac, l, col) => {
    const a = frac * Math.PI * 2 - Math.PI / 2;
    for (let k = 0; k <= l; k++) rect(col, Math.round(cx + Math.cos(a) * k * sx), Math.round(cy + Math.sin(a) * k), 1, 1);
  };
  hand(min / 60, len - 1, "#140c0c");
  hand(0.33 + min / 720, len - 2, "#140c0c");
  hand(sec / 60, len, "#ff4d6d");
}

// Planta en maceta: las hojas se mecen un poquito
function drawPlant(leaves, seed = 0) {
  for (const [i, [x, y, w, h]] of leaves.entries()) {
    const s = Math.round(Math.sin(time * 1.4 + i * 1.7 + seed) * 0.8);
    rect("#1e5a3a", x - 1 + s, y - 1, w + 2, h + 2);
    rect("#3a8f48", x + s, y, w, h);
    rect("#5cb85c", x + s, y, 1, Math.max(1, h - 4));        // brillo de la hoja
  }
}

// Garrafón: burbujas que suben de vez en cuando por el agua
function coolerBubbles(x, top, bottom, seed = 0) {
  const t = (time + seed) % 4;
  if (t > 1.6) return;
  for (let k = 0; k < 3; k++) {
    const y = bottom - (t - k * 0.18) * (bottom - top) / 1.2;
    if (y > bottom || y < top) continue;
    rect("#ffffff", x + ((k * 3) % 5) + Math.round(Math.sin(time * 9 + k)), Math.round(y), k === 0 ? 2 : 1, k === 0 ? 2 : 1);
  }
}

// Alguien que pasa caminando del otro lado de un vidrio o una ventanita
function drawPasser(x, feet, h, col, phase = 0) {
  x = Math.round(x);
  const bob = Math.floor(time * 4 + phase) % 2;
  const y = feet - h - bob;
  pixelCircle(x, y + 3, 3, col);
  rect(col, x - 4, y + 7, 9, Math.round(h * 0.45));
  const legs = Math.floor(time * 4 + phase) % 2 ? 1 : -1;
  rect(col, x - 3 + legs, y + 7 + Math.round(h * 0.45), 3, Math.round(h * 0.45) - 6 + bob);
  rect(col, x + 1 - legs, y + 7 + Math.round(h * 0.45), 3, Math.round(h * 0.45) - 6 + bob);
}

// Notitas del pizarrón: de vez en cuando una se levanta con el aire
function flutterNote(x, y, w, h, col, seed) {
  const t = (time + seed) % 5;
  if (t > 0.8) return;
  const lift = Math.round(Math.sin((t / 0.8) * Math.PI) * 2);
  rect("#c9955b", x, y + h - 3, w, 3);
  rect(col, x + 1, y + h - 3 - lift, w, 3);
  rect("#ffffff", x + w - 3, y + h - 3 - lift, 2, 1);
  ctx.globalAlpha = 0.3;
  rect("#140c0c", x + 1, y + h, w, 1);
  ctx.globalAlpha = 1;
}

// Mueve la hoja de la puerta: 1 abierta, 0 cerrada.
// Si ella la está empujando, su cuerpo avanza junto con la hoja.
function slideDoors(to) {
  return new Promise((resolve) => {
    Object.assign(door, { from: door.open, to, t: 0, done: resolve });
    Sound.door();
  });
}
function updateDoors(dt) {
  if (!door.done) return;
  door.t += dt;
  const p = Math.min(1, door.t / door.dur);
  door.open = door.from + (door.to - door.from) * (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2);
  if (door.carry) girl.x = door.carry.x + (door.open - door.carry.open) * DOOR.travel;
  if (p >= 1) { const cb = door.done; door.done = null; cb(); }
}

// Ella estira el brazo, toma la jaladera y desliza la hoja
async function slideByHand(to) {
  girl.reach = true;
  await wait(350);
  door.carry = { x: girl.x, open: door.open };
  await slideDoors(to);
  door.carry = null;
  await wait(250);
  girl.reach = false;
}

// Vidrio de la pared izquierda (menos el hueco de la puerta) con su riel
function drawLeftGlass() {
  for (let x = 0; x < BACK.x0; x++) {
    const t = leftTop(x), b = leftBot(x);
    const inDoor = x >= DOOR.x0 && x < DOOR.x1;
    ctx.globalAlpha = 0.35;
    rect("#bfe3f2", x, t, 1, (inDoor ? doorTop(x) : b) - t);
    ctx.globalAlpha = 1;
    rect(ALU, x, t, 1, 2);
    if (!inDoor) rect(ALU, x, b - 3, 1, 3);
    if (x >= DOOR.x0 - 2 && x < DOOR.x1 + DOOR.travel + 2) rect(ALU, x, doorTop(x) - 3, 1, 3); // riel
  }
  for (const x of [22, DOOR.x0 - 2]) rect(ALU_DARK, x, leftTop(x), 2, leftBot(x) - leftTop(x));
  ctx.globalAlpha = 0.6;
  for (const x of [8, 30, 80]) rect("#ffffff", x, (leftTop(x) + leftBot(x)) / 2 - 10, 1, 10);
  ctx.globalAlpha = 1;
}

// La hoja de vidrio con su jaladera, siguiendo la perspectiva de la pared
function drawDoors() {
  const lx = DOOR.x0 + Math.round(door.open * DOOR.travel);
  const w = DOOR.x1 - DOOR.x0;
  for (let x = lx; x < lx + w; x++) {
    const t = doorTop(x), b = leftBot(x);
    ctx.globalAlpha = 0.45;
    rect("#bfe3f2", x, t, 1, b - t);
    ctx.globalAlpha = 1;
    rect(ALU, x, t, 1, 2);
    rect(ALU, x, b - 3, 1, 3);
  }
  const edge = (x) => rect(ALU_DARK, x, doorTop(x), 2, leftBot(x) - doorTop(x));
  edge(lx); edge(lx + w - 2);
  ctx.globalAlpha = 0.7;
  rect("#ffffff", lx + 6, (doorTop(lx + 6) + leftBot(lx + 6)) / 2 - 10, 1, 12);
  ctx.globalAlpha = 1;
  const hx = lx + 3, hy = (doorTop(hx) + leftBot(hx)) / 2;
  rect("#6e737c", hx, hy - 4, 2, 12);                  // jaladera
}

// Lo que se mueve detrás del vidrio: gente que pasa por el pasillo de
// afuera, un destello que recorre los ventanales y el reloj
const OFFICE_PASSERS = [
  { speed: 14, offset: 0, h: 32, col: "#9fb0c0" },
  { speed: -10, offset: 130, h: 30, col: "#b0a4bc" },
];
function drawOfficeBack() {
  const bw = BACK.x1 - BACK.x0, bh = BACK.y1 - BACK.y0;
  ctx.save();
  ctx.beginPath();
  ctx.rect(BACK.x0, BACK.y0 + 2, bw, bh - 5);
  ctx.clip();
  ctx.globalAlpha = 0.55;
  for (const [i, p] of OFFICE_PASSERS.entries()) {
    const span = bw + 60;
    const d = (((sceneT * p.speed + p.offset) % span) + span) % span;
    const x = p.speed > 0 ? BACK.x0 - 30 + d : BACK.x1 + 30 - d;
    drawPasser(x, BACK.y1 - 7, p.h, p.col, i);
  }
  ctx.globalAlpha = 1;
  // Destello que cruza el vidrio cada tantos segundos
  const sweep = (sceneT % 7) / 2.2;
  if (sweep < 1) {
    const sx = BACK.x0 - 40 + sweep * (bw + 80);
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(sx, BACK.y0); ctx.lineTo(sx + 10, BACK.y0); ctx.lineTo(sx - 30, BACK.y1); ctx.lineTo(sx - 40, BACK.y1);
    ctx.moveTo(sx + 14, BACK.y0); ctx.lineTo(sx + 17, BACK.y0); ctx.lineTo(sx - 23, BACK.y1); ctx.lineTo(sx - 26, BACK.y1);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  [BACK.x0 - 1, 144, 196, BACK.x1 - 2].forEach((x) => rect(ALU_DARK, x, BACK.y0, 2, bh));
  rect(ALU, BACK.x0, BACK.y1 - 3, bw, 3);

  // Reloj: centro de la carátula sobre la pared en perspectiva
  const onWallY = (x, v) => rightTop(x) + (rightBot(x) - rightTop(x)) * v;
  clockHands(291, Math.round(onWallY(291, 0.25)), 3, 0.8);
}

// Rayos de sol que entran por el vidrio y polvito flotando en ellos
function drawOfficeLight() {
  const k = 0.8 + Math.sin(time * 0.6) * 0.2;
  ctx.fillStyle = "#fff4d0";
  for (const [x0, x1, f0, f1] of [[8, 34, 120, 176], [52, 70, 168, 206]]) {
    ctx.globalAlpha = 0.07 * k;
    ctx.beginPath();
    ctx.moveTo(x0, leftTop(x0) + 12); ctx.lineTo(x1, leftTop(x1) + 12);
    ctx.lineTo(f1, H); ctx.lineTo(f0, H);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  drawMotes(14, 60, 70, 120, 100, 1);
}

// Planta en la esquina, junto a la pared crema
function drawOfficePlant() {
  const x = 286, base = 170;
  softShadow(x + 7, base + 1, 22, 0.25);
  drawPlant([[x + 1, base - 30, 4, 18], [x + 5, base - 42, 4, 30], [x + 10, base - 34, 4, 22], [x - 3, base - 22, 4, 10], [x + 14, base - 24, 3, 11]], 2);
  rect("#140c0c", x - 1, base - 13, 16, 13);
  rect("#e8e8e4", x, base - 12, 14, 12);
  rect("#ffffff", x + 1, base - 12, 3, 11);
  rect("#c9c9d9", x + 11, base - 12, 3, 12);
  rect("#d8d8d4", x, base - 12, 14, 2);
}

// Silla de oficina (se dibuja detrás de ella)
function drawChair() {
  const x = OFFICE.girlX, y = OFFICE.girlY;
  softShadow(OFFICE.girlX + 53, GROUND_Y + 1, 62, 0.22);         // sombra del escritorio
  softShadow(x + 20, GROUND_Y + 1, 36, 0.3);
  rect("#140c0c", x + 1, y + 18, 10, 22);   // respaldo
  rect("#3b4a6b", x + 3, y + 20, 6, 18);
  rect("#52648a", x + 3, y + 20, 2, 16);    // brillo del tapiz
  rect("#140c0c", x + 6, y + 34, 26, 5);    // asiento
  rect("#3b4a6b", x + 8, y + 35, 22, 2);
  rect("#52648a", x + 8, y + 35, 22, 1);
  rect("#140c0c", x + 17, y + 39, 5, 7);    // poste
  rect("#140c0c", x + 6, y + 45, 28, 3);    // base con ruedas
  rect("#140c0c", x + 4, GROUND_Y - 3, 4, 3);
  rect("#140c0c", x + 32, GROUND_Y - 3, 4, 3);
}

// Escritorio visto de lado, igual que ella: la cubierta se extiende
// frente a ella y el monitor está girado hacia su cara.
let keyFlash = 0; // brillo de la tecla recién presionada

function drawDesk() {
  const top = OFFICE.girlY + 30;              // altura de la cubierta
  const dx = OFFICE.girlX + 30, dw = 46;      // de su lado al otro extremo
  const bt = top - 5;                         // orilla de atrás de la cubierta (se ve desde arriba)

  // Monitor encendido: la pantalla mira hacia ella
  const mx = dx + 22, sw = 12, cy = top - 22;
  const flicker = Math.sin(time * 40) > 0.6 ? 0.08 : 0;          // parpadeo leve de pantalla
  const glow = 0.85 + Math.sin(time * 3) * 0.05 - flicker;
  // Luz de la pantalla sobre ella
  ctx.globalAlpha = Math.max(0, 0.06 + Math.sin(time * 3) * 0.02 - flicker / 2);
  ctx.fillStyle = "#bfe6ff";
  ctx.beginPath();
  ctx.moveTo(mx, cy - 12); ctx.lineTo(mx - 24, cy - 16); ctx.lineTo(mx - 24, cy + 6); ctx.lineTo(mx, cy + 12);
  ctx.fill();
  ctx.globalAlpha = 1;
  rect("#140c0c", mx + sw + 2, cy + 8, 4, top - cy - 10);        // soporte
  rect("#140c0c", mx + sw - 4, top - 3, 16, 2);                  // base
  for (let i = 0; i < sw; i++) {
    const h = 26 - 2 * Math.floor((i / sw) * 3);                 // la orilla lejana más chica
    const y0 = cy - h / 2;
    rect("#140c0c", mx + i, y0 - 2, 1, h + 4);
    if (i === 0 || i === sw - 1) continue;
    ctx.globalAlpha = glow;
    rect(i < 4 ? "#dff3ff" : "#9fd4ff", mx + i, y0, 1, h);       // pantalla prendida
    // Renglones de texto que van subiendo conforme escribe
    const scroll = Math.floor(time * 1.5);
    ctx.globalAlpha = glow * 0.7;
    for (let k = 0; 3 + k * 3 < h - 2; k++) {
      const n = (((k + scroll) * 2654435761) >>> 0) % 9;
      if (n > 1 && i >= 2 && i < 2 + n) rect(n % 3 ? "#4a78c2" : "#e8668f", mx + i, y0 + 3 + k * 3, 1, 1);
    }
    ctx.globalAlpha = 1;
  }
  rect("#140c0c", mx + sw, cy - 10, 5, 20);                      // carcasa de atrás
  rect("#4a4a5a", mx + sw, cy - 9, 4, 18);
  rect(Math.floor(time * 1.5) % 2 ? "#8ce99a" : "#2e7d32", mx + 2, cy + 12, 2, 1); // foquito de encendido

  // Cubierta blanca: se ve un poco de arriba
  rect("#140c0c", dx - 1, bt - 1, dw + 2, top - bt + 5);
  rect("#ffffff", dx, bt, dw, top - bt);
  rect("#e4e4ea", dx, top, dw, 3);
  // Patas metálicas de lado: dos postes y el pie en el piso
  rect("#140c0c", dx + 3, top + 4, 5, GROUND_Y - top - 7);
  rect(ALU, dx + 4, top + 4, 3, GROUND_Y - top - 7);
  rect("#140c0c", dx + dw - 8, top + 4, 5, GROUND_Y - top - 7);
  rect(ALU, dx + dw - 7, top + 4, 3, GROUND_Y - top - 7);
  rect("#140c0c", dx, GROUND_Y - 4, dw, 4);
  rect(ALU, dx + 1, GROUND_Y - 3, dw - 2, 2);
  rect("#140c0c", dx + 8, top + 18, dw - 16, 3);                 // travesaño
  rect(ALU, dx + 8, top + 19, dw - 16, 1);

  // Pila de hojas y una pluma
  rect("#140c0c", dx + 17, top - 5, 11, 4);
  rect("#ffffff", dx + 18, top - 4, 9, 1);
  rect("#f2f2ea", dx + 18, top - 3, 9, 1);
  rect("#ff8fb5", dx + 19, top - 6, 7, 1);
  // Teclado de lado bajo su mano; la tecla presionada brilla
  rect("#140c0c", dx, top - 3, 16, 3);
  rect("#e4e4ea", dx + 1, top - 3, 14, 1);
  if (keyFlash > 0) rect("#ffffff", dx + 3 + (Math.floor(time * 13) % 3) * 3, top - 3, 2, 1);

  // Taza con vapor en el otro extremo
  const cx = dx + dw - 10;
  rect("#140c0c", cx, top - 11, 8, 9);
  rect("#ff8fb5", cx + 1, top - 10, 6, 7);
  rect("#140c0c", cx + 8, top - 9, 2, 4);
  ctx.globalAlpha = 0.6;
  const st = Math.floor(time * 3) % 2;
  rect("#ffffff", cx + 2 + st, top - 16, 2, 3);
  rect("#ffffff", cx + 4 - st, top - 20, 2, 3);
  ctx.globalAlpha = 1;
}

// =====================================================
//  ESCENA: PASILLO CON SUS AMIGAS
// =====================================================
const hallwayBg = (() => {
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");
  const r = (col, x, y, w, h) => { g.fillStyle = col; g.fillRect(x, Math.round(y), w, Math.round(h)); };

  // Pared crema, techo con lámparas y piso blanco
  r(CREAM, 0, 0, W, BACK.y1);
  paintWallDetails(r, g, BACK.y1);
  for (let x = 30; x < W; x += 70) { r("#ffffff", x, 18, 30, 3); r("#fff4c4", x + 2, 21, 26, 1); }
  paintTileFloor(r);
  paintLightPools(r, g, [45, 115, 185, 255], BACK.y1);

  // Puertas de madera con ventanita
  for (const x of [18, 262]) {
    r("#140c0c", x - 1, 54, 36, BACK.y1 - 53);
    r("#b07a4f", x, 55, 34, BACK.y1 - 55);
    r("#8d5a3b", x + 2, 57, 30, 2);
    r("#140c0c", x + 8, 64, 18, 16);
    g.globalAlpha = 0.6; r("#bfe3f2", x + 9, 65, 16, 14); g.globalAlpha = 1;
    r("#e0b040", x + 27, 92, 4, 3);
  }
  // Pizarrón de avisos con notitas
  paintNoticeBoard(r, 82, 44);
  // Cuadro con un corazón
  r("#140c0c", 184, 42, 30, 26);
  r("#ffffff", 186, 44, 26, 22);
  [[192, 48, 4, 2], [200, 48, 4, 2], [191, 50, 14, 4], [193, 54, 10, 2], [195, 56, 6, 2], [197, 58, 2, 2]]
    .forEach(([x, y, w, h]) => r("#ff4d6d", x, y, w, h));
  r("#ff8fb5", 193, 50, 2, 2);
  r("#e2d4b4", 185, 68, 30, 1);
  // Reloj redondo (las manecillas se mueven)
  paintClockFace(g, 162, 56);
  // Garrafón de agua
  paintCooler(r, 228, BACK.y1);
  // Apagador junto a la puerta
  r("#140c0c", 252, 86, 5, 8); r("#ffffff", 253, 87, 3, 6); r("#c9c9d9", 254, 89, 1, 2);
  return c;
})();

// Las puertas de madera tienen ventanita: a veces alguien pasa del otro lado
const HALL_WINDOWS = [{ x: 27, y: 65 }, { x: 271, y: 65 }];
function drawHallwayBack() {
  for (const [i, w] of HALL_WINDOWS.entries()) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(w.x, w.y, 16, 14);
    ctx.clip();
    const t = (sceneT + i * 3.7) % 9;
    if (t < 2.5) {
      ctx.globalAlpha = 0.6;
      drawPasser(w.x - 8 + (t / 2.5) * 32 * (i ? -1 : 1) + (i ? 32 : 0), w.y + 26, 22, i ? "#7a6a8a" : "#6a7a8a", i);
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  coolerBubbles(232, 80, 94, 0.6);
  flutterNote(104, 52, 12, 10, "#ff8fb5", 1.2);
  flutterNote(112, 65, 14, 10, "#ffffff", 3.4);
  clockHands(162, 56, 4);
}
// Conos de luz de las lámparas (una parpadea de vez en cuando) y polvito
function drawHallwayLight() {
  [30, 100, 170, 240].forEach((x, i) => ceilingLight(x, 30, 21, H, i === 2 ? flicker(3) : 1));
  drawMotes(16, 20, 26, 280, 100, 2);
}

// Las amigas platicando en grupo con Milagros: unas más atrás que otras
// (feet = altura de los pies) y mirándose entre ellas (facing).
// Milagros mira a la amiga especial, que la mira de vuelta.
const MILI_SPOT = { x: 126, feet: GROUND_Y, facing: 1 };
let friends = [];
function makeFriends() {
  return [
    { key: "dress", x: 34, feet: GROUND_Y - 4, facing: 1 },
    { key: "bob", x: 80, feet: GROUND_Y - 12, facing: 1 },
    { key: "best", x: 170, feet: GROUND_Y, facing: -1 },
    { key: "pony", x: 214, feet: GROUND_Y - 10, facing: -1 },
  ].map((f, i) => ({ ...f, laugh: true, phase: i * 1.7, hop: 0 }));
}
let highlightBest = false; // destellos alrededor de la amiga especial

// Riendo se sacuden un poquito, cada una a su ritmo
const laughBob = (phase) => (Math.floor(time * 7 + phase) % 2 ? -SCALE : 0);
// Platicando: la boca se abre y se cierra a ratos
const talking = (phase) => Math.sin(time * 2 + phase * 3) > 0.2 && Math.floor(time * 6 + phase) % 2 === 0;

// Platicando mueven las manos a ratos; calladas parpadean
function friendFrame(f) {
  const spr = SPRITES.friends[f.key];
  if (f.laugh) return spr.laugh;
  if (!f.quiet && Math.sin(time * 2 + f.phase * 3) > 0.2) {
    const open = Math.floor(time * 6 + f.phase) % 2 === 0;
    if (Math.sin(time * 0.9 + f.phase * 2) > 0) return open ? spr.gesture : spr.gestureUp;
    return open ? spr.talk : spr.chat;
  }
  return blinking(f.phase) ? spr.blink : spr.chat;
}

function drawFriend(f) {
  const hop = f.hop > 0 ? -Math.round(Math.sin((f.hop / 0.5) * Math.PI) * 10) : 0;
  const y = f.feet - GIRL_H + (f.laugh ? laughBob(f.phase) : 0) + hop - (f.lift || 0);
  // La sombra se encoge cuando brincan
  softShadow(f.x + GIRL_HALF, f.feet, Math.max(12, 24 + (y - (f.feet - GIRL_H)) * 0.6), 0.26);
  const img = friendFrame(f);
  const lift = f.laugh || hop || f.lift ? 0 : breath(f.phase);
  drawLit(img, f.x, y, f.facing === -1, breathing(img, 14, lift), f.feet);
  return y - lift;
}

// Dibuja a todas de atrás hacia adelante para que se encimen bien
function drawGroup() {
  const people = [...friends.map((f) => ({ feet: f.feet, draw: () => drawFriend(f) })),
    { feet: girl.y + GIRL_H, draw: drawGirl }];
  people.sort((a, b) => a.feet - b.feet).forEach((p) => p.draw());
}

// Emoticonos que salen de quien se está riendo
let emoteTimer = 0;
function spawnEmotes(dt) {
  emoteTimer -= dt;
  if (emoteTimer > 0) return;
  emoteTimer = 0.35 + Math.random() * 0.3;
  const who = friends.filter((f) => f.laugh).map((f) => ({ x: f.x, top: f.feet - GIRL_H }));
  if (girl.mood === "laugh") who.push({ x: girl.x, top: girl.y });
  if (!who.length) return;
  const w = who[(Math.random() * who.length) | 0];
  const base = {
    x: w.x + GIRL_HALF + (Math.random() - 0.5) * 16, y: w.top - 6,
    vx: (Math.random() - 0.5) * 10, vy: -16 - Math.random() * 8, life: 1.3,
  };
  if (Math.random() < 0.35) particles.push({ ...base, type: "emoji" });
  else particles.push({ ...base, type: "text", text: ["JA", "JAJA", "JAJAJA"][(Math.random() * 3) | 0] });
}

// Enojada: le sale vapor de la cabeza y de vez en cuando un "GRR"
let steamTimer = 0;
function spawnSteam(dt) {
  steamTimer -= dt;
  if (steamTimer > 0) return;
  steamTimer = 0.12;
  const x = girl.x + 8 + Math.random() * 16;
  particles.push({ type: "steam", x, y: girl.y + 2, vx: (Math.random() - 0.5) * 8, vy: -22, life: 0.7 });
  if (Math.random() < 0.12)
    particles.push({ type: "text", text: "GRR", color: "#ff4d6d", x: girl.x + 34, y: girl.y + 4, vx: 6, vy: -14, life: 1 });
}

// Corazoncitos sobre cada amiga: todas son especiales para ella
function heartsOverFriends() {
  friends.forEach((f) => burstHearts(f.x + GIRL_HALF, f.feet - GIRL_H - 2, 3));
}

// Brillitos alrededor de la amiga especial
function spawnSparkles(f) {
  particles.push({
    type: "spark",
    x: f.x + 4 + Math.random() * 28, y: f.feet - GIRL_H - 4 + Math.random() * 40,
    vx: 0, vy: -6, life: 0.6,
  });
}

// =====================================================
//  ESCENA: MIRADOR DE NOCHE
//  Empieza lloviendo y nublado; poco a poco se despeja, sale la luna,
//  se enciende una constelación de corazón, llegan las luciérnagas
//  y al final amanece.
// =====================================================
const BENCH_SPOT = { x: 104 };
const LAMP = { x: 168, top: 84 };
const MOON = { x: 58, y: 32, r: 11 };
const HEART_C = { x: 238, y: 48 };

// Cielo: uno de noche y otro de amanecer que se va encimando
function skyCanvas(bands) {
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");
  const band = GROUND_Y / bands.length;
  bands.forEach((col, i) => { g.fillStyle = col; g.fillRect(0, Math.floor(i * band), W, Math.ceil(band)); });
  return c;
}
const nightSky = skyCanvas(["#0b0d26", "#10143a", "#161d48", "#1d2656", "#252f64", "#2e3870", "#38427c"]);
const dawnSky = skyCanvas(["#3d2a6b", "#5a3a8a", "#8a4f9e", "#c46a9e", "#f08a8a", "#ffaa7a", "#ffd08a"]);

// Ciudad a lo lejos, colina con pasto y el tronco del árbol (el cielo queda transparente)
const CITY_WINDOWS = [];   // ventanas que se prenden y se apagan
const ANTENNAS = [];       // foquitos rojos en lo alto de los edificios
const PUDDLES = [[60, 166, 26], [196, 160, 30], [268, 170, 22]];   // [centro x, y, ancho]
const nightLand = (() => {
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");
  const r = (col, x, y, w, h) => { g.fillStyle = col; g.fillRect(x, Math.round(y), w, Math.round(h)); };

  // Edificios lejanos, más azulados por la distancia
  for (let x = -6, k = 0; x < W; k++) {
    const w = 10 + ((k * 5) % 3) * 6, h = 34 + ((k * 11) % 4) * 9;
    r("#141634", x, GROUND_Y - 14 - h, w, h);
    if (k % 3 === 1) r("#141634", x + w / 2 - 1, GROUND_Y - 22 - h, 2, 8);
    for (let wy = GROUND_Y - 10 - h; wy < GROUND_Y - 30; wy += 6)
      for (let wx = x + 2; wx < x + w - 2; wx += 3)
        if (((wx * 13 + wy * 7) >>> 0) % 7 === 0) r("#8a7a5a", wx, wy, 1, 1);
    x += w + 1;
  }
  // Edificios con ventanitas encendidas
  let x = 0, k = 0;
  while (x < W) {
    const w = 14 + ((k * 7) % 4) * 4, h = 18 + ((k * 13) % 5) * 7;
    r("#1a1c3a", x, GROUND_Y - 14 - h, w, h + 14);
    r("#23264a", x, GROUND_Y - 14 - h, 1, h + 14);                 // orilla que da a la luna
    r("#10122a", x, GROUND_Y - 14 - h, w, 1);
    if (h >= 46) ANTENNAS.push({ x: x + Math.floor(w / 2), y: GROUND_Y - 22 - h, phase: k });
    if (h >= 46) r("#10122a", x + Math.floor(w / 2), GROUND_Y - 21 - h, 1, 7);
    for (let wy = GROUND_Y - 10 - h; wy < GROUND_Y - 16; wy += 5)
      for (let wx = x + 3; wx < x + w - 3; wx += 4) {
        const n = ((wx * 31 + wy * 17) >>> 0) % 5;
        if (n < 2) r("#ffd27a", wx, wy, 2, 2);
        else if (n === 2 && (wx < 16 || wx > 32)) CITY_WINDOWS.push({ x: wx, y: wy, seed: wx * 7 + wy });
        else r("#14162e", wx, wy, 2, 2);
      }
    x += w + 2; k++;
  }
  // Colina oscura delante de la ciudad
  for (let x = 0; x < W; x++) {
    const h = 10 + Math.sin(x / 30) * 4 + Math.sin(x / 11) * 2;
    r("#14233a", x, GROUND_Y - Math.floor(h), 1, Math.floor(h));
  }
  // Pasto y tierra
  r("#2f6b4a", 0, GROUND_Y, W, 3);
  r("#1f4a35", 0, GROUND_Y + 3, W, 3);
  r("#2a2036", 0, GROUND_Y + 6, W, H - GROUND_Y - 6);
  g.fillStyle = "#211a2c";
  for (let y = GROUND_Y + 10; y < H; y += 8)
    for (let x = (y / 8) % 2 ? 0 : 8; x < W; x += 16) g.fillRect(x, y, 6, 3);
  // Piedritas del camino
  for (let k = 0; k < 18; k++) r("#3a2f4a", (k * 67 + 9) % W, GROUND_Y + 9 + ((k * 23) % 22), 2, 1);
  // Charcos (lo que reflejan se dibuja en drawPuddles)
  for (const [cx, cy, w] of PUDDLES) {
    for (let dy = -2; dy <= 2; dy++) {
      const half = Math.round((w / 2) * Math.sqrt(1 - (dy / 3) ** 2));
      r("#1b1830", cx - half - 1, cy + dy, half * 2 + 2, 1);
      r("#232a4a", cx - half, cy + dy, half * 2, 1);
    }
  }

  // Tronco del árbol a la izquierda (la copa se mece, ver drawNightTree)
  r("#140c0c", 20, GROUND_Y - 46, 10, 46);
  r("#4a3226", 22, GROUND_Y - 46, 6, 46);
  r("#5e4232", 26, GROUND_Y - 46, 2, 46);
  r("#140c0c", 16, GROUND_Y - 3, 18, 3);
  return c;
})();

// Copa del árbol: bloques que se mecen con el viento (más fuerte con la tormenta)
const NIGHT_LEAVES = [[25, 82, 22], [8, 92, 14], [44, 90, 15], [26, 66, 14]];
function drawNightTree() {
  const gust = 0.8 + night.rain * 1.4;
  const sway = (i) => Math.round(Math.sin(time * (1.1 + night.rain) + i * 1.3) * gust);
  NIGHT_LEAVES.forEach(([cx, cy, rad], i) => pixelCircle(cx + sway(i), cy, rad + 1, "#0f2a20"));
  NIGHT_LEAVES.forEach(([cx, cy, rad], i) => {
    const x = cx + sway(i);
    for (let dy = -rad; dy <= rad; dy++) {
      const half = Math.floor(Math.sqrt(rad * rad - dy * dy));
      rect(dy < -rad / 3 ? "#1f4a35" : "#183b2b", x - half, cy + dy, half * 2, 1);
    }
    // Luz de la luna sobre las hojas de arriba
    ctx.globalAlpha = 0.5 * night.clear * (1 - night.dawn * 0.5);
    rect("#3a6a50", x - Math.floor(rad / 2), cy - rad + 2, rad, 2);
    ctx.globalAlpha = 1;
  });
}

// Pasto que se mece
function drawNightGrass() {
  const gust = 1 + night.rain;
  for (let x = 4; x < W; x += 9) {
    const s = Math.round(Math.sin(time * (1.6 + night.rain) + x * 0.3) * gust * 0.8);
    rect("#3f8a5e", x, GROUND_Y - 2, 1, 2);
    rect("#4f9a6e", x + s, GROUND_Y - 4, 1, 2);
  }
}

// Charcos: reflejan el farol, la luna y hacen ondas con la lluvia
function drawPuddles() {
  for (const [i, [cx, cy, w]] of PUDDLES.entries()) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, w / 2, 2.6, 0, 0, Math.PI * 2);
    ctx.clip();
    const lampA = (1 - night.dawn * 0.7) * 0.55;
    const near = Math.max(0, 1 - Math.abs(cx - LAMP.x) / 120);
    ctx.globalAlpha = lampA * (0.3 + near);
    rect("#ffd27a", LAMP.x - 3 + (cx - LAMP.x) * 0.3, cy - 2, 6, 5);
    ctx.globalAlpha = night.clear * 0.6 * (1 - night.dawn * 0.5);
    rect("#fff3c4", MOON.x + (cx - MOON.x) * 0.2 - 2, cy - 1, 4, 2);
    if (night.dawn > 0) { ctx.globalAlpha = night.dawn * 0.5; rect("#ffb08a", cx - w / 2, cy - 2, w, 2); }
    ctx.globalAlpha = 0.4 + Math.sin(time * 2 + i) * 0.1;
    rect("#4a5a8a", cx - w / 2 + 2, cy - 2, w - 6, 1);           // brillo de la superficie
    // Ondas: con lluvia muchas, cuando escampa caen gotitas sueltas
    const rate = 0.6 + night.rain * 2.5;
    for (let k = 0; k < 3; k++) {
      const t = (time * rate + k * 0.37 + i * 0.21) % 1;
      if (night.rain < 0.05 && k > 0) break;
      const rx = cx + ((((k * 13 + i * 7 + Math.floor(time * rate + k * 0.37)) * 17) % w) - w / 2) * 0.8;
      ctx.globalAlpha = (1 - t) * 0.8;
      ctx.strokeStyle = "#9fb8e8";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(Math.round(rx) + 0.5, cy + 0.5, 1 + t * 5, 0.5 + t * 1.2, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// Ventanas de la ciudad que se prenden y se apagan, y antenas que parpadean
function drawCityLife() {
  for (const w of CITY_WINDOWS) {
    const on = Math.sin(time * 0.15 + w.seed) > 0.2;
    rect(on ? "#ffd27a" : "#14162e", w.x, w.y, 2, 2);
    if (on && w.seed % 4 === 0) rect("#fff1b8", w.x, w.y, 1, 1);
  }
  for (const a of ANTENNAS) {
    const on = Math.floor(time * 1.2 + a.phase * 0.5) % 2;
    if (!on) continue;
    ctx.globalAlpha = 0.3;
    rect("#ff4d6d", a.x - 1, a.y - 1, 3, 3);
    ctx.globalAlpha = 1;
    rect("#ff4d6d", a.x, a.y, 1, 1);
  }
}

// Estrellas que titilan (cada una a su ritmo)
const nightStars = Array.from({ length: 46 }, (_, i) => ({
  x: (i * 89 + 13) % W, y: (i * 37 + 5) % 96, phase: i * 1.3,
}));

// Constelación de corazón: 12 estrellas alrededor de la figura
const HEART_STARS = Array.from({ length: 12 }, (_, i) => {
  const t = (i / 12) * Math.PI * 2;
  return {
    x: HEART_C.x + 16 * Math.sin(t) ** 3 * 1.5,
    y: HEART_C.y - (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * 1.4,
  };
});

// Luciérnagas
const fireflies = Array.from({ length: 16 }, (_, i) => ({
  x: (i * 71 + 30) % W, y: 92 + ((i * 29) % 52), phase: i * 2.1,
}));

// Estado de la escena (todo de 0 a 1, se anima con tween)
const night = {};
function resetNight() {
  Object.assign(night, {
    rain: 1, clear: 0, glow: 0, fireflies: 0, dawn: 0, lit: 0,
    tears: false, aura: false, shoot: null, tearTimer: 0,
    bolt: null, boltIn: 2.5,
  });
}
resetNight();

// Anima una propiedad de un objeto hasta "to" en "dur" segundos
let tweens = [];
function tween(obj, key, to, dur) {
  return new Promise((resolve) => tweens.push({ obj, key, from: obj[key], to, dur, t: 0, resolve }));
}
function updateTweens(dt) {
  for (const tw of tweens) {
    tw.t += dt;
    const p = Math.min(1, tw.t / tw.dur);
    tw.obj[tw.key] = tw.from + (tw.to - tw.from) * (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2);
    if (p >= 1) tw.resolve();
  }
  tweens = tweens.filter((tw) => tw.t < tw.dur);
}

// Enciende las estrellas del corazón de una en una, cada una con su destello
async function lightHeart(upTo) {
  while (night.lit < upTo) {
    const s = HEART_STARS[night.lit];
    Sound.twinkle(night.lit);
    for (let i = 0; i < 4; i++)
      particles.push({ type: "spark", x: s.x + (Math.random() - 0.5) * 8, y: s.y + (Math.random() - 0.5) * 8, vx: 0, vy: -4, life: 0.6 });
    night.lit++;
    await wait(260);
  }
}

// Dibuja un círculo pixelado fila por fila
function pixelCircle(cx, cy, rad, col) {
  for (let dy = -rad; dy <= rad; dy++) {
    const half = Math.round(Math.sqrt(rad * rad - dy * dy));
    rect(col, Math.round(cx - half), cy + dy, half * 2, 1);
  }
}

function drawNightCloud(x, y, s) {
  rect("#3a3f5e", x + 6 * s, y, 18 * s, 5 * s);
  rect("#3a3f5e", x, y + 4 * s, 32 * s, 7 * s);
  rect("#4a5070", x + 8 * s, y - 3 * s, 10 * s, 4 * s);
  rect("#2c304a", x + 2 * s, y + 9 * s, 28 * s, 2 * s);
}

function drawNight() {
  const clear = night.clear, dawn = night.dawn;
  ctx.drawImage(nightSky, 0, 0);
  if (dawn > 0) { ctx.globalAlpha = dawn; ctx.drawImage(dawnSky, 0, 0); ctx.globalAlpha = 1; }

  // Estrellas: casi no se ven con nubes, y se apagan al amanecer
  const starA = (0.25 + clear * 0.75) * (1 - dawn * 0.85);
  for (const s of nightStars) {
    ctx.globalAlpha = starA * (0.45 + 0.55 * Math.abs(Math.sin(time * 1.4 + s.phase)));
    rect("#ffffff", s.x, s.y, 1, 1);
  }
  ctx.globalAlpha = 1;

  // Luna con su halo
  ctx.globalAlpha = 0.12 * (0.4 + clear * 0.6) * (1 - dawn * 0.6);
  pixelCircle(MOON.x, MOON.y, MOON.r + 8, "#fff6c8");
  pixelCircle(MOON.x, MOON.y, MOON.r + 4, "#fff6c8");
  ctx.globalAlpha = 1 - dawn * 0.5;
  pixelCircle(MOON.x, MOON.y, MOON.r, "#fff3c4");
  rect("#e8dca8", MOON.x - 5, MOON.y - 3, 3, 3);
  rect("#e8dca8", MOON.x + 3, MOON.y + 2, 4, 3);
  rect("#e8dca8", MOON.x - 1, MOON.y + 5, 2, 2);
  ctx.globalAlpha = 1;

  // Constelación de corazón: líneas entre las estrellas encendidas
  const pulse = 0.6 + 0.4 * Math.sin(time * 3);
  if (night.lit > 0) {
    ctx.strokeStyle = "#ffe9a8";
    ctx.lineWidth = 1;
    ctx.globalAlpha = (0.35 + night.glow * 0.4 * pulse) * (1 - dawn * 0.5);
    ctx.beginPath();
    HEART_STARS.slice(0, night.lit).forEach((s, i) => (i ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y)));
    if (night.lit === HEART_STARS.length) ctx.closePath();
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  HEART_STARS.slice(0, night.lit).forEach((s, i) => {
    const tw = 0.7 + 0.3 * Math.sin(time * 4 + i);
    ctx.globalAlpha = tw;
    rect("#fff6c8", Math.round(s.x) - 1, s.y, 3, 1);
    rect("#fff6c8", Math.round(s.x), s.y - 1, 1, 3);
    rect("#ffffff", Math.round(s.x), s.y, 1, 1);
    ctx.globalAlpha = 1;
  });
  // Cuando se completa, el corazón late con un brillo rosado en el centro
  if (night.glow > 0) {
    ctx.globalAlpha = night.glow * 0.18 * pulse;
    pixelCircle(HEART_C.x, HEART_C.y - 4, 16, "#ff8fb5");
    ctx.globalAlpha = 1;
  }

  // Estrella fugaz
  if (night.shoot) {
    const p = night.shoot.t / 1.1;
    const sx = 310 - p * 170, sy = 8 + p * 50;
    for (let i = 0; i < 14; i++) {
      ctx.globalAlpha = (1 - i / 14) * (1 - p * 0.6);
      rect(i < 2 ? "#ffffff" : "#ffe9a8", Math.round(sx + i * 2.2), Math.round(sy - i * 0.65), 2, 1);
    }
    ctx.globalAlpha = 1;
  }

  // Relámpago a lo lejos, detrás de las nubes
  if (night.bolt) {
    const b = night.bolt;
    ctx.globalAlpha = b.t < 0.1 || (b.t > 0.18 && b.t < 0.26) ? 0.9 : Math.max(0, 0.5 - b.t);
    let bx = b.x, by = 10;
    for (let k = 0; k < 9; k++) {
      const nx = bx + ((((b.seed + k) * 2654435761) >>> 0) % 9) - 4, ny = by + 8;
      for (let j = 0; j < 8; j++) rect("#f4f0ff", Math.round(bx + ((nx - bx) * j) / 8), by + j, 1, 1);
      bx = nx; by = ny;
    }
    ctx.globalAlpha = 1;
  }

  // Nubes de lluvia que tapan la luna y luego se van a los lados
  const drift = Math.sin(time * 0.2) * 4;
  for (const [cx, cy, s, dir] of [[26, 20, 2, -1], [70, 36, 1, -1], [150, 14, 2, 1], [210, 34, 1, 1], [262, 18, 1, 1]]) {
    ctx.globalAlpha = 1 - clear * 0.4;
    drawNightCloud(Math.round(cx + drift + dir * clear * 190), cy, s);
  }
  ctx.globalAlpha = 1;

  // Al amanecer el sol se asoma detrás de la ciudad
  if (dawn > 0) {
    const sy = Math.round(GROUND_Y - 6 - dawn * 22);
    ctx.globalAlpha = 0.25 * dawn;
    pixelCircle(288, sy, 26, "#ffd08a");
    ctx.globalAlpha = dawn;
    pixelCircle(288, sy, 10, "#ffe6a8");
    ctx.globalAlpha = 1;
  }

  ctx.drawImage(nightLand, 0, 0);
  drawCityLife();
  drawPuddles();
  drawNightTree();
  drawNightGrass();

  // Farol: poste, lámpara y su luz (titila con la lluvia)
  const flick = night.rain > 0.3 && Math.sin(time * 23) > 0.85 ? 0.4 : 1;
  const lampOn = (1 - dawn * 0.7) * flick;
  ctx.globalAlpha = 0.1 * lampOn;
  pixelCircle(LAMP.x + 3, LAMP.top + 4, 26, "#ffd27a");
  pixelCircle(LAMP.x + 3, LAMP.top + 4, 14, "#ffd27a");
  ctx.globalAlpha = 0.12 * lampOn;
  ctx.fillStyle = "#ffd27a";
  ctx.beginPath();
  ctx.moveTo(LAMP.x + 1, LAMP.top + 8); ctx.lineTo(LAMP.x + 5, LAMP.top + 8);
  ctx.lineTo(LAMP.x + 30, GROUND_Y + 2); ctx.lineTo(LAMP.x - 24, GROUND_Y + 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  rect("#140c0c", LAMP.x + 1, LAMP.top + 6, 4, GROUND_Y - LAMP.top - 6);
  rect("#3a3f5e", LAMP.x + 2, LAMP.top + 6, 2, GROUND_Y - LAMP.top - 6);
  rect("#140c0c", LAMP.x - 1, GROUND_Y - 3, 8, 3);
  rect("#140c0c", LAMP.x - 2, LAMP.top, 10, 8);
  rect(lampOn > 0.5 ? "#fff1b8" : "#b8a870", LAMP.x - 1, LAMP.top + 1, 8, 6);
  rect("#140c0c", LAMP.x - 3, LAMP.top - 2, 12, 2);
  rect("#3a3f5e", LAMP.x - 2, LAMP.top - 2, 4, 1);
  rect("#140c0c", LAMP.x + 2, LAMP.top + 1, 1, 6);                 // cristal en cuatro partes
  // Polillas que revolotean alrededor de la luz cuando deja de llover
  if (night.clear > 0.3) {
    for (let k = 0; k < 3; k++) {
      const a = time * (2.4 + k * 0.7) + k * 2;
      ctx.globalAlpha = Math.min(1, (night.clear - 0.3) * 2) * lampOn;
      rect("#e8e0c8", Math.round(LAMP.x + 3 + Math.cos(a) * (7 + k * 3)), Math.round(LAMP.top + 4 + Math.sin(a * 1.3) * (5 + k)), 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  // Sombra de la banca que proyecta el farol (hacia la izquierda)
  const bx0 = BENCH_SPOT.x - 34;
  ctx.globalAlpha = 0.28 * lampOn;
  ctx.fillStyle = "#0a0a1e";
  ctx.beginPath();
  ctx.moveTo(bx0 - 2, GROUND_Y); ctx.lineTo(bx0 + 74, GROUND_Y);
  ctx.lineTo(bx0 + 50, GROUND_Y + 9); ctx.lineTo(bx0 - 34, GROUND_Y + 9);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Banca de madera (de frente), ella se sienta en la orilla derecha
  const bx = BENCH_SPOT.x - 34, bw = 72;
  rect("#140c0c", bx, GROUND_Y - 30, bw, 13);                     // respaldo
  rect("#8d5a3b", bx + 1, GROUND_Y - 29, bw - 2, 4);
  rect("#8d5a3b", bx + 1, GROUND_Y - 23, bw - 2, 4);
  rect("#140c0c", bx + 4, GROUND_Y - 17, 3, 10);                  // postes del respaldo
  rect("#140c0c", bx + bw - 7, GROUND_Y - 17, 3, 10);
  rect("#140c0c", bx - 2, GROUND_Y - 8, bw + 4, 4);               // asiento
  rect("#b07a4f", bx - 1, GROUND_Y - 7, bw + 2, 2);
  rect("#140c0c", bx + 2, GROUND_Y - 4, 3, 4);                    // patas
  rect("#140c0c", bx + bw - 5, GROUND_Y - 4, 3, 4);
  rect("#5e3a28", bx + 1, GROUND_Y - 25, bw - 2, 1);              // vetas de la madera
  rect("#5e3a28", bx + 1, GROUND_Y - 19, bw - 2, 1);
  // Madera mojada: brilla con la luz del farol mientras llueve
  ctx.globalAlpha = 0.5 * Math.max(night.rain, 0.2) * lampOn;
  rect("#ffe2a8", bx + 30, GROUND_Y - 7, bw - 26, 1);
  rect("#ffe2a8", bx + 40, GROUND_Y - 29, bw - 42, 1);
  ctx.globalAlpha = 1;

  // Ella se tiñe de azul con la noche, de naranja al amanecer, y el farol
  // la ilumina por la derecha
  setAmbient({
    tint: dawn > 0.5 ? "#ff9a6a" : "#1a2466", tintA: dawn > 0.5 ? 0.14 * dawn : 0.3 * (1 - dawn * 2) + 0.05,
    rim: "#ffd27a", rimA: 0.55 * lampOn, rimDx: 1,
  });
  drawGirl();
  setAmbient();

  // Luciérnagas
  if (night.fireflies > 0) {
    for (const f of fireflies) {
      const fx = Math.round(f.x + Math.sin(time * 0.7 + f.phase) * 12);
      const fy = Math.round(f.y + Math.cos(time * 0.9 + f.phase * 2) * 7 - night.fireflies * 6);
      const a = night.fireflies * (0.4 + 0.6 * Math.abs(Math.sin(time * 2.2 + f.phase)));
      ctx.globalAlpha = a * 0.3;
      rect("#e8ff8a", fx - 1, fy - 1, 3, 3);
      ctx.globalAlpha = a;
      rect("#f4ffb8", fx, fy, 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  // Pajaritos que salen con el amanecer
  if (dawn > 0.3) {
    for (let k = 0; k < 3; k++) {
      const x = ((time * 24 + k * 22) % (W + 60)) - 30;
      drawBird(x, 40 + k * 6 + Math.sin(time * 2 + k) * 3, Math.floor(time * 6 + k) % 2, "#5a3a6a");
    }
  }

  // Penumbra de la tormenta
  if (night.rain > 0) {
    ctx.globalAlpha = 0.28 * night.rain;
    rect("#0a0a1e", 0, 0, W, H);
    ctx.globalAlpha = 1;
  }
  // Destello del relámpago sobre todo el paisaje
  if (night.bolt && (night.bolt.t < 0.1 || (night.bolt.t > 0.18 && night.bolt.t < 0.26))) {
    ctx.globalAlpha = 0.22;
    rect("#dfe6ff", 0, 0, W, H);
    ctx.globalAlpha = 1;
  }
}

function updateNight(dt) {
  // Lluvia: más gotas mientras más fuerte
  if (Math.random() < night.rain * dt * 140) {
    for (let i = 0; i < 2; i++)
      particles.push({ type: "rain", x: Math.random() * (W + 40) - 20, y: -6, vx: -30, vy: 210 + Math.random() * 40, life: 1.2, floor: GROUND_Y + Math.random() * 30 });
  }
  // Al tocar el piso la gota salpica
  for (const p of particles) {
    if (p.type !== "rain" || p.y < p.floor) continue;
    p.life = 0;
    if (Math.random() < 0.6)
      for (let k = -1; k <= 1; k += 2)
        particles.push({ type: "splash", x: p.x, y: p.floor, vx: k * (10 + Math.random() * 12), vy: -28 - Math.random() * 16, g: 260, life: 0.22 });
  }
  // Relámpagos mientras la tormenta está fuerte (el trueno llega un poquito después)
  if (night.bolt && (night.bolt.t += dt) > 0.6) night.bolt = null;
  if (night.rain > 0.6 && (night.boltIn -= dt) <= 0) {
    night.boltIn = 6 + Math.random() * 6;
    night.bolt = { x: 120 + Math.random() * 170, t: 0, seed: (Math.random() * 1000) | 0 };
    setTimeout(() => scene === "night" && Sound.thunder(), 350);
  }
  // Lágrimas que resbalan de su ojo
  if (night.tears && girl.pose === "bench" && (night.tearTimer -= dt) <= 0) {
    night.tearTimer = 0.7 + Math.random() * 0.5;
    particles.push({
      type: "tear", x: girl.x + 30, y: girl.y + 13 + girl.bodyOffset * SCALE,
      vx: 4, vy: 6, life: 0.9,
    });
  }
  // Brillo a su alrededor cuando se pone de pie
  if (night.aura && Math.random() < dt * 18) {
    particles.push({
      type: "spark", x: girl.x + 2 + Math.random() * 32, y: girl.y + Math.random() * 40,
      vx: 0, vy: -10, life: 0.7,
    });
  }
  if (night.shoot && (night.shoot.t += dt) > 1.1) night.shoot = null;
}

// Suspiro sentada en la banca (sin la gota de sudor de la oficina)
async function benchSigh() {
  girl.bodyOffset = -1;
  await wait(650);
  girl.bodyOffset = 1;
  Sound.sigh();
  for (let i = 0; i < 5; i++) {
    particles.push({
      type: "puff", x: girl.x + 34, y: girl.y + 16 + Math.random() * 3,
      vx: 10 + Math.random() * 12, vy: -4 - Math.random() * 6, life: 0.9 + Math.random() * 0.4,
    });
  }
  await wait(900);
}

// =====================================================
//  ESCENA FINAL: LA PUERTA Y LA FIESTA SORPRESA
// =====================================================
const HALL_DOOR = { x: 146, w: 36, top: GROUND_Y - 72 };

// Pasillo de la oficina con la puerta blanca de la sala de juntas
const hallDoorBg = (() => {
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");
  const r = (col, x, y, w, h) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };

  // Techo con lámparas, pared crema con lambrín y zócalo
  r(CREAM, 0, 0, W, GROUND_Y);
  paintWallDetails(r, g, GROUND_Y);
  for (let x = 20; x < W; x += 70) { r("#ffffff", x, 18, 30, 3); r("#fff4c4", x + 2, 21, 26, 1); }
  // Piso blanco de mosaico
  r("#f7f7f4", 0, GROUND_Y, W, H - GROUND_Y);
  [GROUND_Y + 7, GROUND_Y + 16, GROUND_Y + 28].forEach((y) => r("#e2e2dc", 0, y, W, 1));
  for (let xb = -60; xb <= W + 60; xb += 24)
    for (let y = GROUND_Y; y < H; y++) r("#e2e2dc", W / 2 + (xb - W / 2) * (1 + (y - GROUND_Y) / 30), y, 1, 1);
  paintLightPools(r, g, [35, 105, 245], GROUND_Y);

  // Pizarrón de avisos con notitas y un reloj a un lado
  paintNoticeBoard(r, 52, 52);
  paintClockFace(g, 125, 60);
  // Cuadro con un corazón
  r("#140c0c", 236, 46, 30, 26);
  r("#ffffff", 238, 48, 26, 22);
  [[244, 52, 4, 2], [252, 52, 4, 2], [243, 54, 14, 4], [245, 58, 10, 2], [247, 60, 6, 2], [249, 62, 2, 2]]
    .forEach(([x, y, w, h]) => r("#ff4d6d", x, y, w, h));
  // Garrafón de agua
  paintCooler(r, 284, GROUND_Y);
  // Maceta junto a la puerta (las hojas se mecen, ver drawDoorProps)
  r("#140c0c", 199, GROUND_Y - 15, 14, 15);
  r("#e8e8e4", 200, GROUND_Y - 14, 12, 14);
  r("#ffffff", 201, GROUND_Y - 14, 2, 13);
  r("#c9c9d9", 209, GROUND_Y - 14, 3, 14);

  // Marco de la puerta y letrero
  const d = HALL_DOOR;
  r("#140c0c", d.x - 4, d.top - 4, d.w + 8, GROUND_Y - d.top + 4);
  r("#d8d8d4", d.x - 3, d.top - 3, d.w + 6, GROUND_Y - d.top + 3);
  r("#140c0c", d.x - 1, d.top - 1, d.w + 2, GROUND_Y - d.top + 1);
  r("#140c0c", d.x + 1, d.top - 18, d.w - 2, 12);
  r("#4a5a7a", d.x + 2, d.top - 17, d.w - 4, 10);
  r("#5a6a8a", d.x + 2, d.top - 17, d.w - 4, 1);
  r("#e2d4b4", d.x - 4, GROUND_Y, d.w + 8, 1);
  return c;
})();

// Lo que se mueve en el pasillo de la sala
function drawDoorProps() {
  [20, 90, 160, 230].forEach((x, i) => ceilingLight(x, 30, 21, GROUND_Y + 20, i === 1 ? flicker(5) : i === 2 ? 0.6 : 1));
  softShadow(206, GROUND_Y + 1, 20, 0.25);
  drawPlant([[201, GROUND_Y - 26, 4, 12], [205, GROUND_Y - 32, 3, 18], [208, GROUND_Y - 27, 4, 13], [198, GROUND_Y - 20, 3, 6]], 1);
  softShadow(292, GROUND_Y + 1, 22, 0.25);
  coolerBubbles(288, GROUND_Y - 49, GROUND_Y - 35, 1.7);
  flutterNote(74, 60, 12, 10, "#ff8fb5", 0.4);
  flutterNote(82, 73, 14, 10, "#ffffff", 2.9);
  clockHands(125, 60, 4);
  drawMotes(12, 20, 30, 280, 110, 4);
}

// Salón de la fiesta: pared rosa, piso de madera, puerta abierta y banderines
const FLOOR_Y = 118;
const PARTY_TABLE = { x: 112, w: 104, top: 120 };
const PARTY_CAKE = { x: 148, y: PARTY_TABLE.top - 22 };
const FLAG_COLORS = ["#ff4d6d", "#ffe066", "#7ec8e3", "#8ce99a", "#ff8fb5", "#cdb4db"];
const BANNER_COLORS = ["#ff4d6d", "#4a90c8", "#3fa058", "#e8668f", "#9b5de5", "#f08a30"]; // que se lean sobre blanco

const partyBg = (() => {
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");
  const r = (col, x, y, w, h) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };

  // Techo y pared crema de la oficina
  r("#fbf6ea", 0, 0, W, 6);
  r(CREAM, 0, 6, W, FLOOR_Y - 6);
  r("#e9dbbd", 0, 6, W, 1);
  r("#e9dbbd", 0, FLOOR_Y - 5, W, 5);

  // Ventanal (a la derecha): el cielo y las nubes se mueven, ver partyWindow
  r("#140c0c", 236, 22, 72, 56);
  r("#e2d4b4", 236, 78, 72, 2);

  // Pizarrón blanco con dibujitos y un reloj
  r("#140c0c", 50, 58, 50, 36);
  r(ALU, 51, 59, 48, 34);
  r("#ffffff", 53, 61, 44, 30);
  [[59, 66, 3, 2], [64, 66, 3, 2], [58, 68, 10, 3], [60, 71, 6, 2], [62, 73, 2, 2]]
    .forEach(([x, y, w, h]) => r("#ff4d6d", x, y, w, h));
  for (let k = 0; k < 4; k++) r("#4a90c8", 72, 66 + k * 5, 18 - (k % 2) * 6, 1);
  r(ALU_DARK, 60, 92, 30, 2);
  r("#140c0c", 68, 38, 14, 14);
  r("#ffffff", 69, 39, 12, 12);
  r("#140c0c", 74, 41, 2, 5); r("#140c0c", 74, 45, 4, 2);

  // Piso blanco de mosaico
  r("#f7f7f4", 0, FLOOR_Y, W, H - FLOOR_Y);
  [FLOOR_Y + 9, FLOOR_Y + 22, FLOOR_Y + 40].forEach((y) => r("#e2e2dc", 0, y, W, 1));
  for (let xb = -60; xb <= W + 60; xb += 24)
    for (let y = FLOOR_Y; y < H; y++) r("#e2e2dc", W / 2 + (xb - W / 2) * (1 + (y - FLOOR_Y) / 50), y, 1, 1);

  // Puerta blanca por donde entra ella (abierta, se ve el pasillo)
  r("#140c0c", 6, 44, 36, FLOOR_Y - 44);
  r("#d8d8d4", 7, 45, 34, FLOOR_Y - 45);
  r("#fff4dc", 10, 48, 28, FLOOR_Y - 48);
  r("#140c0c", 42, 46, 6, FLOOR_Y - 46);
  r("#f4f4f2", 43, 47, 4, FLOOR_Y - 48);

  // Regalos recargados en la pared, bajo el pizarrón
  for (const [x, y, w, h, col, ribbon] of [[56, 108, 16, 14, "#ff4d6d", "#ffe066"], [60, 100, 9, 8, "#8ce99a", "#ff4d6d"],
    [74, 112, 12, 10, "#7ec8e3", "#ff8fb5"], [88, 114, 9, 8, "#cdb4db", "#ffffff"]]) {
    r("#140c0c", x - 1, y - 1, w + 2, h + 1);
    r(col, x, y, w, h);
    r("#00000026", x + w - 3, y, 3, h);
    r(ribbon, x + Math.floor(w / 2) - 1, y, 2, h);
    r(ribbon, x, y + Math.floor(h / 2) - 1, w, 2);
    r(ribbon, x + Math.floor(w / 2) - 3, y - 3, 2, 3); r(ribbon, x + Math.floor(w / 2) + 1, y - 3, 2, 3);
  }
  return c;
})();

// Ciudad del ventanal (va encima del cielo que se mueve)
const partyWindow = (() => {
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");
  const r = (col, x, y, w, h) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  [[240, 50, 10, 27], [252, 40, 12, 37], [266, 56, 9, 21], [277, 34, 13, 43], [292, 48, 12, 29]]
    .forEach(([x, y, w, h]) => {
      r("#9fb8c8", x, y, w, h);
      r("#b4cad8", x, y, 2, h);
      for (let wy = y + 3; wy < y + h - 2; wy += 5) r("#dff3ff", x + 2, wy, w - 4, 1);
    });
  g.globalAlpha = 0.5;
  r("#ffffff", 242, 26, 1, 12); r("#ffffff", 245, 30, 1, 6);
  g.globalAlpha = 1;
  r(ALU, 236, 22, 72, 2); r(ALU, 236, 76, 72, 2);
  [236, 260, 284, 306].forEach((x) => r(ALU_DARK, x, 22, 2, 56));
  return c;
})();

// Cielo del ventanal con nubes y un pajarito; la luz entra y pinta el piso
function drawPartyWindow() {
  rect("#bfe3f2", 237, 23, 70, 54);
  rect("#d4eef8", 237, 23, 70, 10);
  ctx.save();
  ctx.beginPath();
  ctx.rect(237, 23, 70, 54);
  ctx.clip();
  for (const [k, y] of [[0, 30], [1, 44], [2, 36]]) {
    const x = 230 + ((time * (4 + k * 2) + k * 40) % 100);
    rect("#ffffff", Math.round(x), y, 14, 3); rect("#ffffff", Math.round(x) + 3, y - 2, 7, 2);
  }
  drawBird(240 + ((time * 14) % 80), 32 + Math.sin(time * 2) * 2, Math.floor(time * 6) % 2, "#5a6a8a");
  ctx.restore();
  ctx.drawImage(partyWindow, 0, 0);
  ctx.globalAlpha = 0.14 + Math.sin(time * 0.8) * 0.03;
  ctx.fillStyle = "#fff6d8";
  ctx.beginPath();
  ctx.moveTo(238, FLOOR_Y + 2); ctx.lineTo(306, FLOOR_Y + 2); ctx.lineTo(290, FLOOR_Y + 30); ctx.lineTo(214, FLOOR_Y + 30);
  ctx.fill();
  ctx.globalAlpha = 1;
}

// Banderines que se mecen y una serie de foquitos que titilan
function drawBunting() {
  for (let x = 0; x < W; x++) {
    const y = 23 + Math.round(Math.sin((((x + 30) % 106) / 106) * Math.PI) * 6);
    rect("#5a3a4a", x, y, 1, 1);
    if (x % 12 === 6) {
      const k = (x / 12) | 0, on = (Math.floor(time * 3) + k) % 3;
      const col = BANNER_COLORS[k % BANNER_COLORS.length];
      ctx.globalAlpha = on ? 0.25 : 0.1;
      pixelCircle(x, y + 3, 4, col);
      ctx.globalAlpha = 1;
      rect("#140c0c", x - 1, y + 1, 3, 4);
      rect(on ? "#fff6d8" : col, x, y + 2, 1, 2);
    }
  }
  for (let x = 0; x < W; x++) {
    const seg = Math.floor(x / 80);
    const y = 9 + Math.round(Math.sin(((x % 80) / 80) * Math.PI) * (8 + Math.sin(time * 1.3 + seg)));
    rect("#7a4a5a", x, y, 1, 1);
    if (x % 10 === 3) {
      const col = FLAG_COLORS[(x / 10 | 0) % FLAG_COLORS.length];
      const swing = Math.sin(time * 2.2 + x * 0.15) * 1.2;
      for (let k = 0; k < 6; k++) rect(col, Math.round(x - 3 + k / 2 + (swing * k) / 6), y + 1 + k, 7 - k, 1);
      rect("#ffffff", x - 2, y + 1, 1, 1);
    }
  }
}

// Luces de colores que barren la sala mientras festejan
function drawPartyLights() {
  if (party.mode !== "cheer") return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ["#ff4d6d", "#7ec8e3", "#ffe066"].forEach((col, i) => {
    const a = time * (0.9 + i * 0.3) + i * 2.1;
    const cx = 160 + Math.cos(a) * 120, cy = 80 + Math.sin(a * 1.4) * 40;
    ctx.globalAlpha = 0.1;
    pixelCircle(cx, cy, 20, col);
    ctx.globalAlpha = 0.06;
    pixelCircle(cx, cy, 28, col);
  });
  ctx.restore();
}

// Globos que flotan (los de la mesa van amarrados a sus esquinas)
const BALLOONS = [
  { x: 102, y: 66, ax: 113, ay: 120, c: "#ff4d6d" }, { x: 92, y: 54, ax: 113, ay: 120, c: "#ffe066" },
  { x: 116, y: 52, ax: 113, ay: 120, c: "#7ec8e3" }, { x: 226, y: 64, ax: 215, ay: 120, c: "#8ce99a" },
  { x: 214, y: 50, ax: 215, ay: 120, c: "#ff8fb5" }, { x: 238, y: 52, ax: 215, ay: 120, c: "#cdb4db" },
  { x: 60, y: 30, c: "#ff8fb5" }, { x: 74, y: 24, c: "#ffe066" }, { x: 268, y: 26, c: "#7ec8e3" },
  { x: 284, y: 32, c: "#ff4d6d" }, { x: 298, y: 24, c: "#8ce99a" },
].map((b, i) => ({ ...b, phase: i * 1.9 }));

function drawBalloon(b) {
  const x = Math.round(b.x + Math.sin(time * 1.2 + b.phase) * 2);
  const y = Math.round(b.y + Math.sin(time * 1.7 + b.phase) * 2);
  ctx.strokeStyle = "rgba(90,60,80,0.7)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 0.5, y + 8);
  ctx.quadraticCurveTo(x + 4, y + 20, b.ax ?? x + 1, b.ay ?? y + 26);
  ctx.stroke();
  pixelCircle(x, y, 7, "#140c0c");
  pixelCircle(x, y, 6, b.c);
  rect("#ffffff", x - 3, y - 4, 2, 2);
  rect("#140c0c", x - 1, y + 7, 3, 2);
}

// Mesa con mantel, pastel, cupcakes, gaseosas, vasos y bocadillos
function drawTable() {
  const { x, w, top } = PARTY_TABLE;
  softShadow(x + w / 2, GROUND_Y - 3, w + 14, 0.3);
  rect("#140c0c", x + 6, top + 16, 4, GROUND_Y - 4 - top - 16);     // patas
  rect("#140c0c", x + w - 10, top + 16, 4, GROUND_Y - 4 - top - 16);
  rect("#140c0c", x - 3, top - 4, w + 6, 22);
  rect("#ffffff", x - 2, top - 3, w + 4, 4);                         // superficie
  rect("#fff0f5", x - 2, top + 1, w + 4, 16);                        // mantel de frente
  rect("#ff8fb5", x - 2, top + 5, w + 4, 2);
  for (let k = 0; k < w + 4; k += 8) pixelCircle(x - 2 + k + 4, top + 17, 3, "#ff8fb5"); // olanes

  // Gaseosas: cola, naranja y limón
  [["#5a2a1a", "#ff4d6d"], ["#ff9933", "#ffffff"], ["#8ce99a", "#2e7d32"]].forEach(([col, label], i) => {
    const bx = x + 18 + i * 7;
    rect("#140c0c", bx - 1, top - 17, 6, 15);
    rect(col, bx, top - 15, 4, 12);
    rect(label, bx, top - 11, 4, 3);
    rect("#140c0c", bx + 1, top - 20, 2, 3);
    rect("#ffffff", bx + 1, top - 14, 1, 2);
  });
  // Cupcakes
  for (const cx of [x + 2, x + 10]) {
    rect("#140c0c", cx - 1, top - 9, 8, 7);
    rect("#7ec8e3", cx, top - 6, 6, 4);
    rect("#ff8fb5", cx, top - 9, 6, 3);
    rect("#ff4d6d", cx + 2, top - 11, 2, 2);
  }
  // Pastel con velitas que titilan
  drawSprite(Math.floor(time * 6) % 2 ? SPRITES.cake1 : SPRITES.cake2, PARTY_CAKE.x, PARTY_CAKE.y);
  // Brillo cálido de las velitas, que titila con las llamas
  const fl = 0.16 + Math.sin(time * 13) * 0.03 + Math.sin(time * 7.3) * 0.02 + party.dim * 0.1;
  ctx.globalAlpha = fl;
  pixelCircle(PARTY_CAKE.x + 16, PARTY_CAKE.y + 2, 16, "#ffd27a");
  ctx.globalAlpha = fl * 1.4;
  pixelCircle(PARTY_CAKE.x + 16, PARTY_CAKE.y + 2, 8, "#fff1b8");
  ctx.globalAlpha = 1;
  // Vasos rojos
  for (const cx of [x + 72, x + 79]) {
    rect("#140c0c", cx - 1, top - 10, 7, 9);
    rect("#e5383b", cx, top - 9, 5, 7);
    rect("#ffffff", cx, top - 9, 5, 1);
    rect("#ff8a8c", cx, top - 8, 1, 5);
  }
  // Burbujitas que suben en las gaseosas
  for (let i = 0; i < 3; i++) {
    const by = top - 4 - ((time * 8 + i * 3.3) % 10);
    rect("#ffffff", x + 19 + i * 7 + (Math.floor(time * 5 + i) % 2), Math.round(by), 1, 1);
  }
  // Tazón de papitas y sándwiches
  rect("#140c0c", x + 86, top - 7, 17, 6);
  rect("#7ec8e3", x + 87, top - 6, 15, 4);
  for (let k = 0; k < 5; k++) rect("#ffd166", x + 88 + k * 3, top - 9 - (k % 2), 3, 2);
}

// Gorrito de fiesta encima de la cabeza (cx = centro de la cabeza)
function drawPartyHat(cx, y, col) {
  for (let k = 0; k < 10; k++) {
    const half = Math.floor(k / 2);
    rect("#140c0c", cx - half - 1, y - 10 + k, half * 2 + 3, 1);
    rect(k % 4 < 2 ? col : "#ffffff", cx - half, y - 10 + k, half * 2 + 1, 1);
  }
  rect("#ffffff", cx - 1, y - 12, 3, 2);
}

// Coronita de la cumpleañera
function drawCrown() {
  const bounce = girl.mood === "laugh" && girl.onGround ? laughBob(0.5) : 0;
  const x = Math.round(girl.x) + 12, y = Math.round(girl.y) - 7 + bounce - (girl.headLift || 0);
  rect("#140c0c", x - 1, y - 1, 16, 8);
  rect("#140c0c", x - 1, y - 4, 4, 4); rect("#140c0c", x + 5, y - 5, 4, 5); rect("#140c0c", x + 11, y - 4, 4, 4);
  rect("#ffd166", x, y, 14, 6);
  rect("#ffd166", x, y - 3, 2, 3); rect("#ffd166", x + 6, y - 4, 2, 4); rect("#ffd166", x + 12, y - 3, 2, 3);
  rect("#e0a020", x, y + 4, 14, 2);
  rect("#ff4d6d", x + 2, y + 1, 2, 2); rect("#7ec8e3", x + 6, y + 1, 2, 2); rect("#ff4d6d", x + 10, y + 1, 2, 2);
}

// Todas las que la estaban esperando, mirando hacia ella
let crowd = [];
function makeCrowd() {
  return [
    // detrás de la mesa
    ["g1", 96, -14], ["g3", 118, -14], ["g6", 182, -14], ["g8", 204, -14], ["g2", 226, -14],
    // a un lado
    ["pony", 248, -2], ["g7", 272, -2], ["g4", 296, -2],
    // al frente
    ["best", 94, 14], ["bob", 196, 14], ["dress", 226, 14], ["g5", 256, 14], ["g9", 284, 14],
  ].map(([key, x, df], i) => ({
    key, x, feet: GROUND_Y + df, facing: -1, laugh: false, quiet: true, phase: i * 1.37, hop: 0, lift: 0,
    hat: i % 3 !== 1 ? FLAG_COLORS[i % FLAG_COLORS.length] : null,
  }));
}

function drawGuest(f) {
  const y = drawFriend(f);
  // Volteadas a la izquierda, el centro de la cabeza queda en la columna 7
  if (f.hat) drawPartyHat(f.x + 15, y + 1, f.hat);
}

const party = {};
function resetParty() {
  Object.assign(party, {
    door: 0, rays: 0, flash: 0, murmur: false, bump: 0, mode: "calm", shake: 0, dim: 0,
    bigText: null, crown: false, highlight: false, joyTears: false, timer: 0, settled: [],
  });
  crowd = [];
}
resetParty();

// Cañón de confeti
function popper(x, y, dir) {
  Sound.pop();
  for (let i = 0; i < 34; i++) {
    particles.push({
      type: "confetti", x, y, g: 150,
      vx: dir * (30 + Math.random() * 90), vy: -(90 + Math.random() * 110),
      color: CONFETTI_COLORS[(Math.random() * CONFETTI_COLORS.length) | 0], life: 3,
    });
  }
}

function floatText(text, x, y, color = "#ffe066", life = 1.4) {
  const half = text.length * 4 + 16;   // que no se corte en las orillas
  particles.push({ type: "text", text, color, x: Math.min(W - half, Math.max(half, x)), y, vx: 0, vy: -10, life });
}

function drawDoorScene() {
  ctx.drawImage(hallDoorBg, 0, 0);
  drawDoorProps();
  const d = HALL_DOOR, h = GROUND_Y - d.top;

  // Letrero de la sala (las letras brillan suave)
  ctx.font = "8px 'Press Start 2P', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.globalAlpha = 0.35 + Math.sin(time * 2) * 0.15;
  ctx.fillStyle = "#9fd4ff";
  ctx.fillText("SALA", d.x + d.w / 2 + 1, d.top - 11);
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#ffffff";
  ctx.fillText("SALA", d.x + d.w / 2, d.top - 12);

  // Detrás de la puerta: pura luz dorada
  const glow = Math.min(1, party.door * 0.6 + party.rays * 0.6);
  if (party.door > 0) {
    rect("#fff4c8", d.x, d.top, d.w, h);
    for (let k = 0; k < 14; k++)   // confeti que se alcanza a ver adentro
      rect(CONFETTI_COLORS[k % CONFETTI_COLORS.length], d.x + 3 + ((k * 11) % (d.w - 6)), d.top + 6 + ((k * 17 + Math.floor(time * 20)) % (h - 10)), 2, 2);
  }
  // Rayos de luz que giran saliendo de la puerta
  if (glow > 0) {
    const cx = d.x + d.w / 2, cy = d.top + h / 2;
    ctx.fillStyle = "#fff2b0";
    for (let i = 0; i < 10; i++) {
      const a = time * 0.5 + (i / 10) * Math.PI * 2;
      ctx.globalAlpha = 0.3 * glow;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a - 0.13) * 300, cy + Math.sin(a - 0.13) * 300);
      ctx.lineTo(cx + Math.cos(a + 0.13) * 300, cy + Math.sin(a + 0.13) * 300);
      ctx.fill();
    }
    ctx.globalAlpha = 0.2 * glow;
    pixelCircle(cx, cy, 40, "#fff6d0");
    pixelCircle(cx, cy, 24, "#ffffff");
    ctx.globalAlpha = 1;
  }

  // La hoja blanca gira hacia adentro sobre la bisagra derecha
  // (cuando alguien adentro choca con ella, tiembla un poquito)
  const bump = party.bump > 0 ? Math.round(Math.sin(party.bump * 60)) : 0;
  const pw = Math.max(3, Math.round(d.w * (1 - 0.88 * party.door)));
  const px = d.x + d.w - pw + bump;
  rect("#140c0c", px - 1, d.top, pw + 1, h);
  rect("#f4f4f2", px, d.top + 1, pw - 1, h - 1);
  if (pw > 14) {
    rect("#e2e2de", px + 4, d.top + 6, pw - 9, 26);
    rect("#e2e2de", px + 4, d.top + 38, pw - 9, 26);
    rect("#ffffff", px + 5, d.top + 7, pw - 11, 1);
    rect("#ffffff", px + 5, d.top + 39, pw - 11, 1);
    rect("#140c0c", px + 1, GROUND_Y - 22, 3, 6);                      // manija
    rect("#140c0c", px + 1, GROUND_Y - 21, 8, 3);
    rect(ALU, px + 2, GROUND_Y - 20, 6, 1);
  }
  ctx.globalAlpha = party.door * 0.4;
  rect("#140c0c", px, d.top + 1, pw - 1, h - 1);
  ctx.globalAlpha = 1;

  // Luz por debajo de la puerta, con sombras de pies que pasan
  if (party.door === 0) {
    ctx.globalAlpha = 0.25 + Math.sin(time * 3) * 0.08;          // la luz se derrama un poquito al piso
    for (let k = 0; k < 4; k++) rect("#ffe9a0", d.x - k * 3, GROUND_Y + k, d.w + k * 6, 1);
    ctx.globalAlpha = 1;
    rect("#ffe9a0", d.x, GROUND_Y - 1, d.w, 1);
    for (let k = 0; k < 2; k++) {
      const fx = d.x + Math.round(((time * (14 + k * 9) + k * 17) % (d.w + 10)) - 5);
      const fw = Math.min(5, d.x + d.w - fx);
      if (fw > 0) rect("#7a6a5a", Math.max(d.x, fx), GROUND_Y - 1, fw, 1);
    }
  }

  drawGirl();
}

function drawParty() {
  ctx.drawImage(partyBg, 0, 0);
  drawPartyWindow();
  drawBunting();
  // Confeti que ya cayó al piso
  for (const c of party.settled) rect(c.color, c.x, c.y, c.w, 1);

  // Letrero con letras de colores que van cambiando
  const lines = ["¡FELIZ CUMPLE", `${CONFIG.name.toUpperCase()}!`];
  rect("#140c0c", 102, 25, 116, 28);
  rect("#ffffff", 103, 26, 114, 26);
  rect("#ff8fb5", 103, 26, 114, 2); rect("#ff8fb5", 103, 50, 114, 2);
  ctx.font = "8px 'Press Start 2P', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  lines.forEach((line, li) => {
    const chars = [...line];
    chars.forEach((ch, i) => {
      ctx.fillStyle = BANNER_COLORS[(i + li * 3 + Math.floor(time * 4)) % BANNER_COLORS.length];
      ctx.fillText(ch, 160 - chars.length * 4 + i * 8 + 4, 38 + li * 11);
    });
  });

  BALLOONS.forEach(drawBalloon);

  // Piso brillante; mientras festejan, las luces les dan contraluz
  setAmbient({ reflect: 0.16, rim: party.mode === "cheer" ? "#fff2b0" : null, rimA: 0.4, rimDx: -1 });
  // Las de atrás quedan tapadas por la mesa
  const back = crowd.filter((f) => f.feet < GROUND_Y - 6);
  back.forEach(drawGuest);
  drawTable();

  const people = [...crowd.filter((f) => !back.includes(f)).map((f) => ({ feet: f.feet, draw: () => drawGuest(f) })),
    { feet: girl.y + GIRL_H, draw: () => { drawGirl(); if (party.crown) drawCrown(); } }];
  people.sort((a, b) => a.feet - b.feet).forEach((p) => p.draw());
  setAmbient();
  drawPartyLights();

  // Baja la luz y un foco la ilumina solo a ella
  if (party.dim > 0) {
    const cx = girl.x + GIRL_HALF, cy = girl.y + 20;
    ctx.fillStyle = `rgba(14,6,30,${0.62 * party.dim})`;
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.arc(cx, cy, 34, 0, Math.PI * 2, true);
    ctx.fill();
    ctx.globalAlpha = 0.1 * party.dim;
    ctx.fillStyle = "#fff2b0";
    ctx.beginPath();
    ctx.moveTo(cx - 6, 0); ctx.lineTo(cx + 6, 0); ctx.lineTo(cx + 34, cy + 20); ctx.lineTo(cx - 34, cy + 20);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

// Lo que va encima de todo: el letrerote de "¡SORPRESA!" y el destello blanco
function drawPartyOverlay() {
  if (party.bigText) {
    const t = party.bigText.t;
    const s = t < 0.25 ? (t / 0.25) * 1.4 : t < 0.4 ? 1.4 - ((t - 0.25) / 0.15) * 0.4 : 1;
    ctx.save();
    ctx.globalAlpha = t > 2.2 ? Math.max(0, 1 - (t - 2.2) / 0.5) : 1;
    ctx.translate(W / 2, 80);
    ctx.scale(s, s);
    ctx.font = "16px 'Press Start 2P', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#140c0c";
    ctx.strokeText(party.bigText.text, 0, 0);
    ctx.fillStyle = FLAG_COLORS[Math.floor(time * 8) % FLAG_COLORS.length];
    ctx.fillText(party.bigText.text, 0, 0);
    ctx.restore();
  }
  if (party.flash > 0) {
    ctx.globalAlpha = party.flash;
    rect("#ffffff", 0, 0, W, H);
    ctx.globalAlpha = 1;
  }
}

const MURMURS = ["psst", "shh", "jiji", "¿ya?", "...", "¡ahí viene!", "bla bla", "¡shhh!"];
function updateDoorScene(dt) {
  const d = HALL_DOOR;
  party.bump = Math.max(0, party.bump - dt);
  // Murmullos y risitas que se escapan de la sala
  if (party.murmur && (party.timer -= dt) <= 0) {
    party.timer = 0.55 + Math.random() * 0.6;
    const text = MURMURS[(Math.random() * MURMURS.length) | 0];
    const side = Math.random() < 0.5 ? -1 : 1;
    particles.push({
      type: "text", text, color: "#9a7fa8",
      x: d.x + d.w / 2 + side * (12 + Math.random() * 26), y: d.top + 2 + Math.random() * 24,
      vx: side * 6, vy: -8, life: 1.5,
    });
    Sound.murmur();
    if (Math.random() < 0.2) party.bump = 0.15;
  }
  // Al abrirse la puerta se escapan brillitos y confeti
  if (party.door > 0.15 && Math.random() < dt * 30) {
    const x = d.x + 4 + Math.random() * (d.w - 8), y = d.top + 6 + Math.random() * 56;
    if (Math.random() < 0.5) particles.push({ type: "spark", x, y, vx: (Math.random() - 0.5) * 60, vy: -10 - Math.random() * 30, life: 0.8 });
    else particles.push({
      type: "confetti", x, y, g: 60, vx: (Math.random() - 0.5) * 90, vy: -30 - Math.random() * 50, life: 2,
      color: CONFETTI_COLORS[(Math.random() * CONFETTI_COLORS.length) | 0],
    });
  }
}

const CHEERS = ["¡YEI!", "¡WIII!", "¡FELIZ DÍA!", "¡TQM!", "¡BRAVO!"];
function updateParty(dt) {
  const cheering = party.mode === "cheer";
  for (const f of crowd) {
    f.hop = Math.max(0, f.hop - dt);
    f.laugh = cheering;
    f.lift = cheering ? Math.round(Math.max(0, Math.sin(time * 6 + f.phase)) * 3) * 2 : 0;
  }
  if (cheering && (party.timer -= dt) <= 0) {
    party.timer = 0.3 + Math.random() * 0.3;
    const f = crowd[(Math.random() * crowd.length) | 0];
    if (f) {
      if (Math.random() < 0.3) burstHearts(f.x + GIRL_HALF, f.feet - GIRL_H, 1);
      else floatText(CHEERS[(Math.random() * CHEERS.length) | 0], f.x + GIRL_HALF, f.feet - GIRL_H - 4);
    }
    spawnConfetti();
  }
  const best = crowd.find((f) => f.key === "best");
  if (party.highlight && best && Math.random() < dt * 14) spawnSparkles(best);
  // Lagrimitas de felicidad
  if (party.joyTears && Math.random() < dt * 1.6)
    particles.push({ type: "tear", x: girl.x + 30, y: girl.y + 12, vx: 4, vy: 6, life: 0.9 });
  // Corazones que flotan mientras le dicen el mensaje
  if (party.dim > 0.5 && Math.random() < dt * 3)
    particles.push({ type: "heart", x: Math.random() * W, y: H + 4, vx: (Math.random() - 0.5) * 6, vy: -16, life: 7 });
  if (party.crown && Math.random() < dt * 4)
    particles.push({ type: "spark", x: girl.x + 12 + Math.random() * 14, y: girl.y - 8 + Math.random() * 6, vx: 0, vy: -6, life: 0.5 });
  if (party.bigText) party.bigText.t += dt;
  // El confeti que cae se queda regado en el piso
  for (const p of particles) {
    if (p.type !== "confetti") continue;
    p.floor ??= FLOOR_Y + 6 + Math.random() * (H - FLOOR_Y - 8);
    if (p.vy > 0 && p.y >= p.floor) {
      p.life = 0;
      party.settled.push({ x: Math.round(p.x), y: Math.round(p.floor), w: Math.random() < 0.5 ? 1 : 2, color: p.color });
    }
  }
  if (party.settled.length > 320) party.settled.splice(0, party.settled.length - 320);
}

// =====================================================
//  TELÓN DE TEATRO
// =====================================================
const curtain = {
  open: 0, from: 0, to: 0, t: 0, dur: 1, done: null,
  vel: 0,      // qué tan rápido se mueve (la tela de abajo se queda atrás)
  thud: 0,     // golpe al cerrarse: hace temblar la tela y la cenefa
  puffs: [],   // polvito que se levanta al juntarse
};
const CURTAIN_SHADES = ["#4a0b18", "#6e1226", "#931a33", "#b3243e", "#c93a52", "#b3243e", "#931a33", "#6e1226"];
const VALANCE_H = 16;
const CURTAIN_BAND = 4; // alto de cada franja con la que se dibuja la tela ondulada
const GOLD = "#e0b040", GOLD_LIGHT = "#ffe08a", GOLD_DARK = "#8a5a18";
const TIEBACK_Y = 96;

// Abre (1) o cierra (0) el telón; se resuelve al terminar
function moveCurtain(to, dur = 1.4) {
  return new Promise((resolve) => {
    Object.assign(curtain, { from: curtain.open, to, t: 0, dur, done: resolve });
    Sound.curtain();
  });
}
const openCurtain = () => moveCurtain(1);
const closeCurtain = () => moveCurtain(0, 1.2);

function updateCurtain(dt) {
  curtain.thud = Math.max(0, curtain.thud - dt * 1.6);
  for (const p of curtain.puffs) {
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= 0.94; p.vy -= 6 * dt;
    p.life -= dt;
  }
  curtain.puffs = curtain.puffs.filter((p) => p.life > 0);

  const prev = curtain.open;
  if (curtain.done) {
    curtain.t += dt;
    const p = Math.min(1, curtain.t / curtain.dur);
    // Al abrir se recoge con un pequeño rebote; al cerrar acelera hasta juntarse
    const e = curtain.to > curtain.from
      ? 1 + 2.2 * (p - 1) ** 3 + 1.2 * (p - 1) ** 2
      : p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
    curtain.open = curtain.from + (curtain.to - curtain.from) * e;
    if (p >= 1) {
      curtain.open = curtain.to;
      if (curtain.to === 0) curtainThud();
      const cb = curtain.done; curtain.done = null; cb();
    }
  }
  // La velocidad se suaviza para que la tela "alcance" a la barra poco a poco
  const v = dt > 0 ? (curtain.open - prev) / dt : 0;
  curtain.vel += (v - curtain.vel) * Math.min(1, dt * 6);
}

// Las dos mitades chocan en el centro: tiembla la tela y se levanta polvito
function curtainThud() {
  curtain.thud = 1;
  Sound.thump();
  for (let k = 0; k < 16; k++) {
    const side = k % 2 ? 1 : -1;
    curtain.puffs.push({
      x: W / 2 + side * Math.random() * 6, y: H - 2 - Math.random() * 4,
      vx: side * (20 + Math.random() * 40), vy: -6 - Math.random() * 14,
      life: 0.6 + Math.random() * 0.5, size: Math.random() < 0.4 ? 2 : 1,
    });
  }
}

// El vaivén de la tela se apaga conforme se abre: recogida a los lados queda quieta
const curtainSway = () => Math.min(1, Math.max(0, 1 - curtain.open));

// Hasta dónde llega cada mitad del telón a la altura y
function curtainEdge(cw, y) {
  const depth = (y / H) ** 2;
  const lag = curtain.vel * 34 * depth;                         // abajo se queda atrás
  const sway = Math.sin(time * 1.6 + y / 16) * (0.6 + depth) * curtainSway(); // vaivén de la tela
  const thud = Math.sin(curtain.thud * 18 + y / 10) * curtain.thud * 3 * depth;
  const e = Math.max(0, Math.min(W / 2 + 2, Math.round(cw + lag + sway + thud)));
  return cw >= W / 2 - 0.5 ? Math.max(e, W / 2) : e; // cerrado, las mitades nunca dejan rendija
}

function drawCurtain() {
  const minW = 14; // lo que queda recogido a cada lado cuando está abierto
  const cw = minW + (W / 2 - minW) * (1 - curtain.open);

  for (let y = 0; y < H; y += CURTAIN_BAND) {
    const e = curtainEdge(cw, y);
    if (e <= 0) continue;
    // Los pliegues se comprimen al recogerse y ondean con el tiempo
    const ripple = Math.sin(time * 1.3 + y / 28) * 0.12 * curtainSway() + curtain.thud * Math.sin(y / 6) * 0.2;
    let runStart = 0, runShade = -1;
    for (let lx = 0; lx <= e; lx++) {
      let shade = -1;
      if (lx < e) {
        const phase = ((((lx / e) * 7 + ripple) % 1) + 1) % 1;
        shade = Math.floor(phase * CURTAIN_SHADES.length);
      }
      if (shade === runShade) continue;
      if (runShade >= 0) {
        const w = lx - runStart;
        ctx.fillStyle = CURTAIN_SHADES[runShade];
        ctx.fillRect(runStart, y, w, CURTAIN_BAND);
        ctx.fillRect(W - runStart - w, y, w, CURTAIN_BAND);
      }
      runStart = lx; runShade = shade;
    }
    // Sombra arriba (bajo la cenefa) y abajo (cerca del piso)
    const shadow = y < 40 ? (40 - y) / 40 * 0.35 : y > H - 30 ? (y - (H - 30)) / 30 * 0.3 : 0;
    if (shadow > 0) {
      ctx.globalAlpha = shadow;
      rect("#140c0c", 0, y, e, CURTAIN_BAND); rect("#140c0c", W - e, y, e, CURTAIN_BAND);
      ctx.globalAlpha = 1;
    }
    // Orilla dorada que sigue la ondulación
    if (e < W / 2) { rect("#140c0c", e, y, 1, CURTAIN_BAND); rect("#140c0c", W - 1 - e, y, 1, CURTAIN_BAND); }
    rect(GOLD, e - 2, y, 2, CURTAIN_BAND); rect(GOLD, W - e, y, 2, CURTAIN_BAND);
    rect(GOLD_LIGHT, e - 2, y, 1, CURTAIN_BAND); rect(GOLD_LIGHT, W - e + 1, y, 1, CURTAIN_BAND);
  }

  // Dobladillo dorado con flecos al ras del piso
  const hemE = curtainEdge(cw, H - 1);
  rect(GOLD_DARK, 0, H - 5, hemE, 1); rect(GOLD_DARK, W - hemE, H - 5, hemE, 1);
  rect(GOLD, 0, H - 4, hemE, 2); rect(GOLD, W - hemE, H - 4, hemE, 2);
  for (let x = 1; x < hemE; x += 2) { rect(GOLD_DARK, x, H - 2, 1, 2); rect(GOLD_DARK, W - 1 - x, H - 2, 1, 2); }

  // Ya abierto, cada lado queda amarrado con un cordón y su borla
  if (curtain.open > 0.6) {
    const e = curtainEdge(cw, TIEBACK_Y);
    ctx.globalAlpha = Math.min(1, (curtain.open - 0.6) / 0.3);
    drawTieback(e, 1);
    drawTieback(e, -1);
    ctx.globalAlpha = 1;
  }

  // Con el telón cerrado, un reflector recorre la tela
  const closed = Math.max(0, 1 - curtain.open * 3);
  if (closed > 0) drawSpotlight(closed * (state === "title" || state === "starting" ? 1 : 0.6));

  // Polvito del golpe
  for (const p of curtain.puffs) {
    ctx.globalAlpha = Math.min(1, p.life * 2) * 0.7;
    rect("#e8d6c0", Math.round(p.x), p.y, p.size, p.size);
  }
  ctx.globalAlpha = 1;

  drawValance();
}

function drawTieback(e, dir) {
  const y = TIEBACK_Y;
  const x0 = dir > 0 ? 0 : W - e - 1;
  rect(GOLD_DARK, x0, y + 2, e + 1, 1);
  rect(GOLD, x0, y, e + 1, 2);
  // Borla que se mece
  const bx = (dir > 0 ? e - 1 : W - e) + Math.round(Math.sin(time * 2.2 + dir) * 1.2);
  rect(GOLD, bx, y + 2, 1, 4);
  rect(GOLD_DARK, bx - 1, y + 6, 3, 1);
  rect(GOLD, bx - 1, y + 7, 3, 5);
  rect(GOLD_LIGHT, bx - 1, y + 7, 1, 4);
}

function drawValance() {
  const drop = Math.round(Math.sin(curtain.thud * 14) * curtain.thud * 2); // rebota con el golpe
  for (let x = 0; x < W; x++) {
    const wave = Math.round(Math.abs(Math.sin((x / 20) * Math.PI)) * 4);
    const h = VALANCE_H - wave + drop;
    rect(x % 20 < 10 ? "#7a1428" : "#931a33", x, 0, 1, h);
    rect("#5a0e1e", x, 0, 1, 3);
    rect(GOLD, x, h, 1, 2);
    rect("#140c0c", x, h + 2, 1, 1);
  }
  // Borlas colgando de cada pico de la cenefa
  for (let k = 0; k <= W / 20; k++) {
    const sx = k * 20 + Math.round(Math.sin(time * 2.5 + k * 0.9) * 1.1 + Math.sin(curtain.thud * 16) * curtain.thud * 2);
    const top = VALANCE_H + 2 + drop;
    rect(GOLD_DARK, sx, top, 1, 2);
    rect(GOLD, sx - 1, top + 2, 3, 4);
    rect(GOLD_LIGHT, sx - 1, top + 2, 1, 3);
    rect(GOLD_DARK, sx, top + 6, 1, 1);
  }
}

// Halo del reflector (en escalones, más pixel que un degradado) y motitas de polvo
function drawSpotlight(a) {
  if (a <= 0) return;
  const cx = Math.round(W / 2 + Math.sin(time * 0.5) * 36);
  const cy = Math.round(96 + Math.sin(time * 0.8) * 6);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = "#ffd9a0";
  for (const [r, al] of [[72, 0.05], [56, 0.06], [40, 0.07], [26, 0.08]]) {
    ctx.globalAlpha = al * a;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#fff4d6";
  for (let k = 0; k < 18; k++) {
    const t = time * (0.15 + (k % 5) * 0.04) + k * 7.3;
    const mx = cx + Math.sin(t * 1.7 + k) * 50 * ((k % 3) + 1) / 3;
    const my = cy + 40 - ((t * 20 + k * 13) % 80);
    ctx.globalAlpha = a * (0.3 + 0.25 * Math.sin(time * 3 + k));
    ctx.fillRect(Math.round(mx), Math.round(my), 1, 1);
  }
  ctx.restore();
}

// =====================================================
//  PERSONAJE
// =====================================================
const girl = {
  x: W / 2 - GIRL_HALF,      // posición (esquina izquierda)
  y: GIRL_TOP,   // arriba del sprite
  vy: 0,
  onGround: true,
  facing: 1,          // 1 derecha, -1 izquierda
  targetX: null,
  speed: 60,          // px por segundo caminando
  runSpeed: 100,      // px por segundo corriendo
  running: false,
  walkTimer: 0,
  blinkTimer: 0,
  onArrive: null,
  onLand: null,
  jumpDelay: 0,       // se agacha un instante antes de despegar
  landTimer: 0,       // se queda agachada un instante al aterrizar
  pose: "stand",      // stand | sit | bench
  benchFace: "sad",   // sad | look | smile (sentada en la banca)
  behindDoor: false,  // del otro lado de la puerta de vidrio
  reach: false,       // brazo estirado (deslizando la puerta)
  sitAnim: "type",    // type | sigh
  bodyOffset: 0,      // sube (-1) o baja (+1) los hombros al suspirar
  sweat: null,        // { t } gota de sudor sobre la cabeza
  mood: null,         // null | chat | laugh | angry | smile (de lado)
  headLift: 0,        // pixel que sube el torso al respirar (para la coronita)
};

const GRAVITY = 520;
const JUMP_FORCE = -210;

function jump() {
  return new Promise((resolve) => {
    if (!girl.onGround || girl.jumpDelay > 0) return resolve();
    girl.jumpDelay = 0.09;
    girl.onLand = resolve;
  });
}

function walkTo(x, run = false) {
  return new Promise((resolve) => {
    girl.targetX = x;
    girl.running = run;
    girl.facing = x > girl.x ? 1 : -1;
    girl.onArrive = resolve;
  });
}

function updateGirl(dt) {
  // Caminar hacia targetX
  if (girl.targetX !== null) {
    const dx = girl.targetX - girl.x;
    const step = (girl.running ? girl.runSpeed : girl.speed) * dt;
    if (Math.abs(dx) <= step) {
      girl.x = girl.targetX;
      girl.targetX = null;
      girl.running = false;
      const cb = girl.onArrive; girl.onArrive = null; cb && cb();
    } else {
      girl.x += Math.sign(dx) * step;
      const prevFrame = runFrameIndex();
      girl.walkTimer += dt;
      // Al pisar (cuadros de zancada) levanta polvito y suena un pasito
      const f = runFrameIndex();
      if (girl.onGround && f !== prevFrame && f % 2 === 0) {
        dustPuff(girl.x + GIRL_HALF - girl.facing * 8, GROUND_Y - 2, -girl.facing);
        if (girl.running) Sound.step();
      }
    }
  }

  // Física del salto
  if (girl.jumpDelay > 0) {
    girl.jumpDelay -= dt;
    if (girl.jumpDelay <= 0) {
      girl.jumpDelay = 0;
      girl.vy = JUMP_FORCE;
      girl.onGround = false;
      Sound.jump();
    }
  }
  if (!girl.onGround) {
    girl.vy += GRAVITY * dt;
    girl.y += girl.vy * dt;
    if (girl.y >= GIRL_TOP) {
      girl.y = GIRL_TOP;
      girl.vy = 0;
      girl.onGround = true;
      girl.landTimer = 0.12;
      dustPuff(girl.x + GIRL_HALF - 6, GROUND_Y - 2, -1);
      dustPuff(girl.x + GIRL_HALF + 6, GROUND_Y - 2, 1);
      const cb = girl.onLand; girl.onLand = null; cb && cb();
    }
  }

  girl.blinkTimer += dt;
  girl.landTimer = Math.max(0, girl.landTimer - dt);
}

// Ciclo de carrera: zancada, paso, zancada (brazos al revés), paso (otra pierna)
const RUN_CYCLE = ["runA", "runB", "runC", "runD"];
function runFrameIndex() {
  const fps = girl.running ? 10 : 6;
  return Math.floor(girl.walkTimer * fps) % RUN_CYCLE.length;
}

function girlFrame() {
  if (girl.pose === "bench") return girl.benchFace === "look" && blinking(0.3) ? SPRITES.bench.lookBlink : SPRITES.bench[girl.benchFace];
  if (girl.pose === "sit") {
    if (girl.sitAnim === "sigh" || girl.blinkTimer % 3 < 0.15) return SPRITES.sitSigh;
    return [SPRITES.sitA, SPRITES.sitB, SPRITES.sitC][typingPose()];
  }
  if (girl.reach) return door.carry && Math.floor(time * 6) % 2 ? SPRITES.reachB : SPRITES.reachA;
  if (girl.mood && girl.onGround && girl.targetX === null) {
    if (girl.mood === "chat" && talking(0.9)) return SPRITES.side.talk;
    if (girl.mood === "chat" && blinking(0.2)) return SPRITES.side.blink;
    if (girl.mood === "angry" && Math.floor(time * 8) % 2) return SPRITES.side.angry2;
    return SPRITES.side[girl.mood];
  }
  if (girl.jumpDelay > 0 || girl.landTimer > 0) return SPRITES.crouch;
  if (!girl.onGround) return girl.vy < 0 ? SPRITES.jumpUp : SPRITES.jumpFall;
  if (girl.targetX !== null) return SPRITES[RUN_CYCLE[runFrameIndex()]];
  return girl.blinkTimer % 3 < 0.15 ? SPRITES.blink : SPRITES.idle;
}

function drawSprite(img, x, y, scale = SCALE, flip = false) {
  x = Math.round(x); y = Math.round(y);
  const w = img.width * scale, h = img.height * scale;
  if (flip) {
    ctx.save();
    ctx.translate(x + w, y);
    ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0, w, h);
    ctx.restore();
  } else {
    ctx.drawImage(img, x, y, w, h);
  }
}

// Tecleo con ritmo irregular, como una persona escribiendo de verdad:
// 0 = las dos manos abajo, 1 = sube la mano cercana, 2 = sube la lejana
function typingPose() {
  const k = Math.floor(time * 11);
  const h = ((k * 2654435761) >>> 0) % 7;
  return h < 3 ? 0 : h < 5 ? 1 : 2;
}

function drawGirl() {
  if (girl.pose === "sit" || girl.pose === "bench") return drawSittingGirl();
  // sombra (a la altura de sus pies; en el aire se queda en el piso y se encoge)
  const air = (GIRL_TOP - girl.y) / 60;
  const floorY = girl.onGround ? girl.y + GIRL_H : GROUND_Y;
  const sw = girl.onGround ? 26 : Math.max(10, 26 - air * 14);
  softShadow(girl.x + GIRL_HALF, floorY, sw, girl.onGround ? 0.3 : Math.max(0.12, 0.3 - air * 0.15));
  // Al caminar el cuerpo rebota un poquito hacia arriba
  const stepping = girl.targetX !== null && runFrameIndex() % 2;
  let bounce = girl.onGround && stepping ? -SCALE : 0;
  if (girl.mood === "laugh") bounce = laughBob(0.5);

  // Enojada: tiembla un poquito de coraje
  const shake = girl.mood === "angry" ? (Math.floor(time * 20) % 2) * 2 - 1 : 0;
  // Parada y quieta respira (el torso sube un pixel)
  const img = girlFrame();
  const still = girl.onGround && girl.targetX === null && !girl.reach && girl.jumpDelay <= 0 && girl.landTimer <= 0;
  const lift = still && girl.mood !== "laugh" && girl.mood !== "angry" ? breath(0.5) : 0;
  girl.headLift = lift;
  // Siempre a escala entera para que los pixeles no se deformen
  drawLit(img, girl.x + shake, girl.y + bounce, girl.facing === -1, breathing(img, girl.mood ? 15 : 16, lift),
    girl.onGround ? girl.y + GIRL_H : GROUND_Y);
  if (girl.mood === "angry") {
    // marca de enojo que late junto a su cabeza
    const beat = Math.floor(time * 5) % 2;
    drawSprite(SPRITES.anger, girl.x + 12 - beat, girl.y - 18 - beat, SCALE + beat);
  }
}

// Sentada: el torso y la cabeza se dibujan aparte de las piernas
// para que los hombros suban y bajen al suspirar.
function drawSittingGirl() {
  const img = girlFrame();
  const x = Math.round(girl.x), y = Math.round(girl.y);
  const cut = 14; // fila donde empiezan las piernas
  // Si no está suspirando, respira despacito
  const off = girl.bodyOffset ? girl.bodyOffset * SCALE : -breath(1.1);
  drawLit(img, x, y, false, [[cut, img.height - cut, 0], [0, cut + 1, off]]);

  if (girl.sweat) {
    // Aparece, resbala un poquito por la cabeza y al final se desvanece
    const { t, fade } = girl.sweat;
    const slide = Math.round(Math.min(t, 1.2) * 4);
    ctx.globalAlpha = Math.min(1, t * 4) * (fade === null ? 1 : Math.max(0, 1 - fade / 0.4));
    drawSprite(SPRITES.sweat, x - 2, y - 2 + slide + girl.bodyOffset * SCALE);
    ctx.globalAlpha = 1;
  }
}

// Suspiro: toma aire (hombros arriba), lo suelta (hombros abajo) y sale un airecito
async function sigh() {
  girl.sitAnim = "sigh";
  girl.sweat = { t: 0, fade: null };
  await wait(250);
  girl.bodyOffset = -1;
  await wait(700);
  girl.bodyOffset = 1;
  Sound.sigh();
  const mx = girl.x + 34, my = girl.y + 15;
  for (let i = 0; i < 6; i++) {
    particles.push({
      type: "puff", x: mx, y: my + Math.random() * 3,
      vx: 12 + Math.random() * 14, vy: -4 - Math.random() * 6,
      life: 0.9 + Math.random() * 0.4,
    });
  }
  await wait(1100);
  girl.bodyOffset = 0;
  girl.sweat.fade = 0;       // la gota se va desvaneciendo
  await wait(300);
  girl.sitAnim = "type";
}

// =====================================================
//  PARTÍCULAS: corazones, confeti, polvito...
// =====================================================
let particles = [];
const CONFETTI_COLORS = ["#ffe066", "#ff4d6d", "#7ec8e3", "#8ce99a", "#ffffff", "#ff8fb5"];

function burstHearts(x, y, n = 8) {
  for (let i = 0; i < n; i++) {
    particles.push({
      type: "heart", x, y,
      vx: (Math.random() - 0.5) * 80,
      vy: -40 - Math.random() * 60,
      life: 2 + Math.random(),
    });
  }
}

function dustPuff(x, y, dir) {
  for (let i = 0; i < 3; i++) {
    particles.push({
      type: "dust", x, y,
      vx: dir * (10 + Math.random() * 20),
      vy: -5 - Math.random() * 10,
      life: 0.35 + Math.random() * 0.2,
    });
  }
}

function spawnConfetti() {
  particles.push({
    type: "confetti",
    x: Math.random() * W, y: -4,
    vx: (Math.random() - 0.5) * 20,
    vy: 30 + Math.random() * 30,
    color: CONFETTI_COLORS[(Math.random() * CONFETTI_COLORS.length) | 0],
    life: 8,
  });
}

function updateParticles(dt) {
  for (const p of particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (p.type === "heart") p.vy -= 10 * dt; // flotan hacia arriba
    if (p.type === "tear") p.vy += 90 * dt;  // las lágrimas caen
    if (p.g) p.vy += p.g * dt;               // confeti de los cañones: sube y cae
    if (p.type === "leaf") {                 // las hojitas caen meciéndose y se quedan en el pasto
      p.vx = 8 + Math.sin(time * 3 + p.phase) * 14;
      if (p.y >= p.floor) { p.y = p.floor; p.vx = 0; p.vy = 0; } else p.vy = 12 + Math.cos(time * 3 + p.phase) * 6;
    }
  }
  particles = particles.filter((p) => p.life > 0 && p.y < H + 10);
}

function drawParticles() {
  for (const p of particles) {
    if (p.type === "heart") {
      ctx.globalAlpha = Math.min(1, p.life);
      drawSprite(SPRITES.heart, p.x, p.y, 1);
      ctx.globalAlpha = 1;
    } else if (p.type === "text") {
      ctx.globalAlpha = Math.min(1, p.life * 1.5);
      ctx.font = "8px 'Press Start 2P', monospace";
      ctx.textAlign = "center";
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#140c0c";
      ctx.strokeText(p.text, Math.round(p.x), Math.round(p.y));
      ctx.fillStyle = p.color || "#ffe066";
      ctx.fillText(p.text, Math.round(p.x), Math.round(p.y));
      ctx.globalAlpha = 1;
    } else if (p.type === "emoji") {
      ctx.globalAlpha = Math.min(1, p.life * 1.5);
      drawSprite(SPRITES.emojiLaugh, p.x - 4, p.y - 8, 1);
      ctx.globalAlpha = 1;
    } else if (p.type === "spark") {
      ctx.globalAlpha = Math.min(1, p.life * 2);
      ctx.fillStyle = "#ffe066";
      const x = Math.round(p.x), y = Math.round(p.y);
      ctx.fillRect(x, y - 1, 1, 3);
      ctx.fillRect(x - 1, y, 3, 1);
      ctx.globalAlpha = 1;
    } else if (p.type === "steam") {
      ctx.globalAlpha = Math.min(1, p.life * 2) * 0.85;
      const r = p.life > 0.4 ? 3 : 4;   // se va inflando al subir
      ctx.fillStyle = "#9a9aa8";
      ctx.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, r + 2, r + 2);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(Math.round(p.x), Math.round(p.y), r, r);
      ctx.globalAlpha = 1;
    } else if (p.type === "puff") {
      ctx.globalAlpha = Math.min(1, p.life) * 0.8;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 3, 3);
      ctx.globalAlpha = 1;
    } else if (p.type === "rain") {
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = "#9fb8e8";
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 4);
      ctx.globalAlpha = 1;
    } else if (p.type === "tear") {
      ctx.globalAlpha = Math.min(1, p.life * 2);
      ctx.fillStyle = "#9fd4ff";
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 2);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
      ctx.globalAlpha = 1;
    } else if (p.type === "leaf") {
      ctx.globalAlpha = Math.min(1, p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.sin(time * 6 + p.phase) > 0 || p.vy === 0 ? 2 : 1, 1);
      ctx.globalAlpha = 1;
    } else if (p.type === "splash") {
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = "#9fb8e8";
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
      ctx.globalAlpha = 1;
    } else if (p.type === "dust") {
      ctx.globalAlpha = Math.min(1, p.life * 2) * 0.7;
      ctx.fillStyle = "#e8d8c8";
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
    }
  }
}

// =====================================================
//  DIÁLOGOS (efecto máquina de escribir)
// =====================================================
let waitingForInput = null;

// Arma el texto con un <span> por letra (ya reservando su lugar, así nada salta
// de línea mientras se escribe). Devuelve un elemento por carácter del texto
// (los espacios son null) y resalta el nombre de la cumpleañera.
function buildDialogText(text) {
  dialogText.textContent = "";
  const highlight = new Array(text.length).fill(false);
  for (let at = text.indexOf(CONFIG.name); at !== -1; at = text.indexOf(CONFIG.name, at + 1)) {
    highlight.fill(true, at, at + CONFIG.name.length);
  }

  const chars = [];
  let word = null;
  let wave = 0;
  for (let k = 0; k < text.length; k++) {
    if (text[k] === " ") {
      dialogText.append(" ");
      chars.push(null);
      word = null;
      continue;
    }
    if (!word) {
      word = dialogText.appendChild(document.createElement("span"));
      word.className = "word";
    }
    const ch = word.appendChild(document.createElement("span"));
    ch.className = highlight[k] ? "ch hl" : "ch";
    if (highlight[k]) ch.style.setProperty("--i", wave++);
    ch.textContent = text[k];
    chars.push(ch);
  }
  return chars;
}

function say(text, speed = 28) {
  return new Promise((resolve) => {
    dialog.dataset.scene = scene;
    dialog.classList.remove("hidden");
    dialogNext.classList.remove("show");
    const chars = buildDialogText(text);
    let i = 0;
    let done = false;

    const finish = () => {
      done = true;
      for (const c of chars) c?.classList.add("on");
      dialogNext.classList.add("show");
      waitingForInput = () => {
        waitingForInput = null;
        dialog.classList.add("hidden");
        resolve();
      };
    };

    // Si toca durante la escritura, se completa el texto
    waitingForInput = () => { if (!done) { clearInterval(timer); finish(); } };

    const timer = setInterval(() => {
      i++;
      chars[i - 1]?.classList.add("on");
      if (text[i - 1] !== " " && i % 2) Sound.blip();
      if (i >= text.length) { clearInterval(timer); finish(); }
    }, speed);
  });
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// =====================================================
//  LA HISTORIA — edita / agrega pasos aquí
// =====================================================
let state = "title"; // title | story | finale

// Cambio de escena: cierra el telón, acomoda todo y lo vuelve a abrir
async function changeScene(setup) {
  if (curtain.open > 0) await closeCurtain();
  particles = [];
  setup();
  await wait(400);
  await openCurtain();
}

// La historia está dividida en capítulos para poder empezar desde cualquiera
async function chapterIntro() {
  // El vals de "érase una vez" sigue sonando hasta que se abre el telón
  Sound.playMusic("storytime");
  await wait(300);
  await openCurtain();
  Sound.playMusic("morning");
  await wait(300);

  await say(`Érase una vez una chica llamada ${CONFIG.name}...`);
  await say("Un día despertó sintiendo que algo especial iba a pasar.");

  // Sale corriendo por la derecha...
  await walkTo(W + 10, true);
}

// ...y aparece en la oficina
async function chapterOffice() {
  await changeScene(() => {
    scene = "office";
    Sound.playMusic("office");
    door.open = 0;
    girl.behindDoor = true;
    girl.facing = 1;
    girl.x = -44;
    girl.y = GIRL_TOP;
  });
  // Llega caminando por fuera del vidrio hasta la jaladera
  await walkTo(DOOR.x0 + 3 - 32);
  await slideByHand(1);                     // abre la puerta con la mano
  girl.behindDoor = false;
  await walkTo(DOOR.x1 + DOOR.travel - 3);  // entra hasta la orilla de la hoja...
  girl.facing = -1;
  await wait(200);
  await slideByHand(0);                     // ...y la cierra con la mano
  await wait(200);
  await walkTo(OFFICE.girlX);
  girl.facing = 1;
  await wait(250);
  girl.pose = "sit";
  girl.sitAnim = "type";
  girl.y = OFFICE.girlY;
  await wait(1400);
  await say(`${CONFIG.name} es muy trabajadora: siempre da lo mejor de sí en todo lo que hace.`);
  await say("Es tranquila, paciente y muy enfocada...");
  await sigh();
  await say("...aunque a veces el trabajo también llega a estresarla y a cansarla un poquito.");
  await sigh();
  await say("Pero ese día no dejaba de pensar que algo especial iba a pasar...");
}

// Con sus amigas en el pasillo
async function chapterFriends() {
  await changeScene(() => {
    scene = "hallway";
    Sound.playMusic("friends");
    girl.pose = "stand";
    girl.sweat = null;
    girl.bodyOffset = 0;
    girl.facing = MILI_SPOT.facing;
    girl.x = MILI_SPOT.x;
    girl.y = MILI_SPOT.feet - GIRL_H;
    girl.mood = "laugh";
    friends = makeFriends();
  });
  await wait(1200);
  await say(`Por suerte, ${CONFIG.name} no está sola: tiene amigas que la quieren, la animan y la hacen reír.`);
  await say(`Y es que ${CONFIG.name} es risueña y tiene una sonrisa hermosa, de esas que contagian a cualquiera.`);
  heartsOverFriends();
  await say("Cada una es especial para ella a su manera, y con todas comparte los mejores momentos.");

  // Resalta a la amiga especial
  const best = friends.find((f) => f.key === "best");
  friends.forEach((f) => { f.laugh = false; });
  girl.mood = "chat";
  highlightBest = true;
  best.hop = 0.5;
  Sound.jump();
  await wait(700);
  await say("Y luego está ella... especial a su propia manera, y un tanto loquita.");
  best.laugh = true;
  girl.mood = "laugh";
  await say("A veces es la que más la anima y la hace reír hasta que le duele la panza...");
  girl.mood = "angry";
  await say("...y otras veces es la que la saca de quicio.");
  highlightBest = false;
  girl.mood = "laugh";
  friends.forEach((f) => { f.laugh = true; });
  heartsOverFriends();
  await say("¡Pero así la quiere, igual que a cada una de ellas!");
  await say("Y aun entre tantas risas, no dejaba de pensar que algo especial iba a pasar...");
  await wait(600);
}

// De noche, sola en el mirador: un mensaje para ella
async function chapterNight() {
  await changeScene(() => {
    scene = "night";
    Sound.playMusic("rain");
    Sound.rain(true);
    resetNight();
    tweens = [];
    friends = [];
    highlightBest = false;
    girl.pose = "stand";
    girl.mood = null;
    girl.bodyOffset = 0;
    girl.facing = 1;
    girl.x = -40;
    girl.y = GIRL_TOP;
  });

  // Llega caminando despacito y se sienta en la banca, cabizbaja
  await walkTo(BENCH_SPOT.x);
  await wait(300);
  girl.pose = "bench";
  girl.benchFace = "sad";
  girl.bodyOffset = 1;
  await wait(900);
  await say("Pero no todos los días son de risas...");
  night.tears = true;
  await say(`A veces ${CONFIG.name} también se siente triste, preocupada... y hasta con ganas de llorar.`);
  await benchSigh();
  await say("Y está bien sentirse así: hasta las personas más fuertes tienen días grises.");
  night.tears = false;

  // Para de llover, se abren las nubes y sale la luna
  Sound.rain(false);
  Sound.playMusic("hope");
  tween(night, "rain", 0, 3);
  await tween(night, "clear", 1, 3.5);
  girl.bodyOffset = 0;
  girl.benchFace = "look";
  await wait(500);
  await say(`Pero nunca olvides esto, ${CONFIG.name}...`);

  // Cada parte del corazón: su familia, sus amigas y quienes la quieren
  await lightHeart(4);
  await say("Tu sonrisa ilumina la vida de tu familia...");
  await lightHeart(8);
  await say("...de tus amigas...");
  await lightHeart(12);
  tween(night, "glow", 1, 1.2);
  tween(night, "fireflies", 1, 3);
  burstHearts(HEART_C.x, HEART_C.y, 10);
  Sound.select();
  await say("...y de todas las personas que te quieren y que son importantes para ti.");

  girl.benchFace = "smile";
  burstHearts(girl.x + GIRL_HALF, girl.y + 6, 5);
  await say("Así que no dejes de sonreír, ni siquiera en los días difíciles: tu sonrisa es tu luz.");

  // Se pone de pie, firme, con un brillo a su alrededor
  girl.pose = "stand";
  girl.mood = "smile";
  girl.y = GIRL_TOP;
  dustPuff(girl.x + GIRL_HALF - 6, GROUND_Y - 2, -1);
  dustPuff(girl.x + GIRL_HALF + 6, GROUND_Y - 2, 1);
  Sound.jump();
  night.aura = true;
  girl.mood = null;
  await walkTo(BENCH_SPOT.x + 22);   // da unos pasos al frente
  girl.mood = "smile";
  await wait(400);
  await say("Mantente fuerte y firme ante cualquier adversidad: eres mucho más valiente de lo que crees.");

  night.shoot = { t: 0 };
  Sound.shootingStar();
  await wait(1200);
  await say("Porque después de cada tormenta, siempre vuelve a salir el sol...");
  await tween(night, "dawn", 1, 3);
  await say("...y tú siempre vuelves a brillar.");
  await wait(800);
  night.aura = false;
}

// La puerta... y la fiesta sorpresa
async function chapterParty() {
  await changeScene(() => {
    scene = "door";
    Sound.playMusic("search");
    resetParty();
    night.aura = false;
    girl.pose = "stand";
    girl.mood = null;
    girl.reach = false;
    girl.facing = 1;
    girl.x = -40;
    girl.y = GIRL_TOP;
  });

  // Camina por el pasillo hasta la puerta de la sala; adentro murmuran
  party.murmur = true;
  await walkTo(HALL_DOOR.x + 5 - 35);
  await wait(400);
  await say(`De vuelta en la oficina, algo llevó a ${CONFIG.name} hasta esta puerta...`);
  await say('Del otro lado se escuchaban murmullos, risitas y uno que otro "¡shhh!"...');
  floatText("?", girl.x + 24, girl.y - 4, "#ffffff", 1.8);
  await wait(500);
  await say(`¿Y ahora, ${CONFIG.name}... por qué sientes que hoy es un día especial?`);

  // Un último "¡shhh!", silencio total, estira la mano y abre: sale la luz
  party.murmur = false;
  floatText("¡SHHH!", HALL_DOOR.x + HALL_DOOR.w / 2, HALL_DOOR.top + 20, "#9a7fa8", 1.2);
  Sound.murmur();
  Sound.stopMusic(0.8);
  await wait(700);
  girl.reach = true;
  await wait(400);
  Sound.door();
  tween(party, "door", 1, 1.6);
  await wait(500);
  Sound.reveal();
  await tween(party, "rays", 1, 1.3);
  await tween(party, "flash", 1, 0.45);

  // Detrás del destello: ¡la fiesta!
  scene = "party";
  particles = [];
  crowd = makeCrowd();
  girl.reach = false;
  girl.x = 4;
  girl.y = GIRL_TOP;
  Sound.playMusic("celebration");
  tween(party, "flash", 0, 0.9);
  await walkTo(48);

  party.bigText = { t: 0, text: "¡SORPRESA!" };
  party.shake = 0.5;
  party.mode = "cheer";
  popper(PARTY_TABLE.x - 6, PARTY_TABLE.top - 4, -1);
  popper(PARTY_TABLE.x + PARTY_TABLE.w + 6, PARTY_TABLE.top - 4, 1);
  Sound.cheer();
  floatText("!", girl.x + 24, girl.y - 4, "#ff4d6d", 1.2);
  await jump();
  girl.mood = "smile";
  await wait(1600);

  party.crown = true;
  Sound.select();
  for (let i = 0; i < 10; i++)
    particles.push({ type: "spark", x: girl.x + 8 + Math.random() * 24, y: girl.y - 10 + Math.random() * 10, vx: 0, vy: -12, life: 0.8 });
  await say(`¡Porque hoy es tu cumpleaños, ${CONFIG.name}!`);
  crowd.forEach((f) => burstHearts(f.x + GIRL_HALF, f.feet - GIRL_H - 2, 2));
  await say("Y todas las personas que te quieren están aquí para celebrarte.");

  const best = crowd.find((f) => f.key === "best");
  party.highlight = true;
  best.hop = 0.5;
  Sound.jump();
  await say("Tus amigas de siempre (sí, también la loquita)...");
  party.highlight = false;
  popper(300, 120, -1);
  await say("...y muchas personas más que te estiman y agradecen tenerte en su vida.");

  girl.mood = "laugh";
  party.joyTears = true;
  await say("Tanto cariño junto hizo que se le escaparan unas lagrimitas de felicidad.");
  party.joyTears = false;
  girl.mood = "smile";

  // El mensaje final: baja la luz, la música se vuelve suave y flotan corazones
  party.mode = "calm";
  Sound.playMusic("hope");
  await tween(party, "dim", 1, 1.5);
  await say(`${CONFIG.name}: esta pequeña historia es solo un pedacito de todo lo que eres.`);
  await say("Eres trabajadora y dedicada, y das lo mejor de ti en todo lo que haces.");
  await say("Tienes una risa que contagia y una sonrisa que ilumina a todos los que te rodean.");
  await say("Y aunque haya días grises, siempre encuentras la fuerza para volver a brillar.");
  await say("Nunca olvides que no estás sola: aquí hay muchas personas que te quieren de verdad.");
  await say("Gracias por ser exactamente como eres. El mundo es más bonito contigo en él.");
  await say("Que este nuevo año de vida te regale tantas sonrisas como las que tú le regalas a los demás.");

  // ¡Y a celebrar!
  await tween(party, "dim", 0, 1);
  party.mode = "cheer";
  girl.mood = "laugh";
  party.shake = 0.4;
  popper(PARTY_TABLE.x - 6, PARTY_TABLE.top - 4, -1);
  popper(PARTY_TABLE.x + PARTY_TABLE.w + 6, PARTY_TABLE.top - 4, 1);
  Sound.cheer();
  await wait(1200);
}

const CHAPTERS = [
  { name: "Inicio", run: chapterIntro },
  { name: "Oficina", run: chapterOffice },
  { name: "Amigas", run: chapterFriends },
  { name: "Noche", run: chapterNight },
  { name: "Fiesta", run: chapterParty },
];

async function story(from = 0) {
  state = "story";
  for (let i = from; i < CHAPTERS.length; i++) await CHAPTERS[i].run();
  finale();
}

let partyTimer = null;
function finale() {
  state = "finale";
  $("finale-name").textContent = `${CONFIG.name}`;
  finaleEl.classList.remove("hidden");
  Sound.stopMusic(0.3);
  const fanfareLength = Sound.fanfare();
  // Después de la fanfarria sigue la fiesta
  clearTimeout(partyTimer);
  partyTimer = setTimeout(() => state === "finale" && Sound.playMusic("celebration"), fanfareLength * 1000 + 200);
  burstHearts(girl.x + GIRL_HALF, girl.y, 12);
}

function resetScene() {
  clearTimeout(partyTimer);
  particles = [];
  resetParty();
  scene = "outdoor";
  Object.assign(curtain, { open: 0, done: null, vel: 0, thud: 0, puffs: [] });
  girl.pose = "stand";
  girl.behindDoor = false;
  girl.reach = false;
  girl.sweat = null;
  girl.bodyOffset = 0;
  girl.mood = null;
  friends = [];
  highlightBest = false;
  resetNight();
  tweens = [];
  Sound.rain(false);
  door.open = 0;
  door.done = null;
  door.carry = null;
  girl.x = W / 2 - GIRL_HALF;
  girl.y = GIRL_TOP;
  girl.facing = 1;
  girl.targetX = null;
  girl.running = false;
  finaleEl.classList.add("hidden");
}

// =====================================================
//  CONTROLES
// =====================================================
function startGame() {
  if (state !== "title") return;
  state = "starting";
  Sound.init();
  Sound.select();
  // Deja que el título salga volando antes de abrir el telón
  titleScreen.classList.add("leaving");
  setTimeout(() => {
    titleScreen.classList.add("hidden");
    titleScreen.classList.remove("leaving");
    story();
  }, 550);
}

// Envuelve cada letra del título en un <span> para animarlas por separado
(() => {
  const title = $("title-text");
  let i = 0;
  for (const node of [...title.childNodes]) {
    if (node.nodeType !== Node.TEXT_NODE) continue;
    const frag = document.createDocumentFragment();
    for (const c of node.textContent) {
      if (c === " ") { frag.append(" "); continue; }
      const span = document.createElement("span");
      span.className = "ch";
      span.style.setProperty("--i", i++);
      span.textContent = c;
      frag.append(span);
    }
    node.replaceWith(frag);
  }
})();

$("start-btn").addEventListener("click", (e) => { e.stopPropagation(); startGame(); });
$("replay-btn").addEventListener("click", (e) => {
  e.stopPropagation();
  resetScene();
  story();
});

function advance() { Sound.init(); waitingForInput && waitingForInput(); }
$("game").addEventListener("pointerdown", advance);
window.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    if (state === "title") startGame(); else advance();
  }
});

// =====================================================
//  PAGINADO DE ESCENAS (TEMPORAL — borra este bloque cuando ya no lo necesites)
//  Recarga la página empezando en el capítulo elegido (#escena=N).
// =====================================================
(() => {
  const nav = document.createElement("div");
  nav.style.cssText = "position:absolute;top:1%;right:1%;display:flex;gap:0.6cqw;z-index:10;";
  const current = Number((location.hash.match(/escena=(\d+)/) || [])[1]);
  CHAPTERS.forEach((ch, i) => {
    const b = document.createElement("button");
    b.textContent = i + 1;
    b.title = ch.name;
    b.style.cssText =
      "font:1.2cqw 'Press Start 2P',monospace;padding:0.6cqw 0.9cqw;cursor:pointer;border:0.3cqw solid #000;" +
      `color:#fff;background:${current === i + 1 ? "#e84a7f" : "#1a1a2e"};`;
    b.addEventListener("pointerdown", (e) => e.stopPropagation());
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      location.hash = `escena=${i + 1}`;
      location.reload();
    });
    nav.appendChild(b);
  });
  $("game").appendChild(nav);

  // Botón de ojo: oculta/muestra el paginado (para grabar video sin que se vea).
  // Oculto, el ojo también queda transparente; reaparece al pasar el mouse. Atajo: tecla H.
  const eye = document.createElement("button");
  eye.style.cssText =
    "position:absolute;top:1%;left:1%;z-index:11;font:1.6cqw monospace;line-height:1;padding:0.4cqw 0.7cqw;" +
    "cursor:pointer;border:0.3cqw solid #000;color:#fff;background:#1a1a2e;transition:opacity .2s;";
  let navHidden = false;
  try { navHidden = localStorage.getItem("navHidden") === "1"; } catch {}
  const applyNav = () => {
    nav.style.opacity = navHidden ? "0" : "1";
    nav.style.pointerEvents = navHidden ? "none" : "auto";
    eye.textContent = navHidden ? "◡" : "👁";
    eye.title = navHidden ? "Mostrar escenas (H)" : "Ocultar escenas (H)";
    eye.style.opacity = navHidden ? "0" : "1";
    try { localStorage.setItem("navHidden", navHidden ? "1" : "0"); } catch {}
  };
  const toggleNav = () => { navHidden = !navHidden; applyNav(); };
  eye.addEventListener("mouseenter", () => { eye.style.opacity = "1"; });
  eye.addEventListener("mouseleave", () => { if (navHidden) eye.style.opacity = "0"; });
  eye.addEventListener("pointerdown", (e) => e.stopPropagation());
  eye.addEventListener("click", (e) => { e.stopPropagation(); toggleNav(); });
  window.addEventListener("keydown", (e) => { if (e.key === "h" || e.key === "H") toggleNav(); });
  applyNav();
  $("game").appendChild(eye);

  // Si la dirección trae #escena=N, se salta el título y empieza ahí
  if (current >= 1 && current <= CHAPTERS.length) {
    titleScreen.classList.add("hidden");
    story(current - 1);
  }
})();

// Música de la pantalla de título, en bucle hasta que empieza la primera escena.
// El navegador solo deja sonar audio tras una interacción: se intenta de una vez y,
// si está bloqueado, arranca con el primer clic o tecla.
if (state === "title") {
  Sound.playMusic("storytime");
  Sound.init();
}
window.addEventListener("pointerdown", () => Sound.init());
window.addEventListener("keydown", () => Sound.init());

// =====================================================
//  BUCLE PRINCIPAL
// =====================================================
let last = performance.now();
let confettiTimer = 0;
let lastTypingPose = 0;
let time = 0;
let sceneT = 0;          // segundos desde que empezó la escena actual
let lastScene = scene;

function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  time += dt;
  sceneT += dt;
  if (scene !== lastScene) { lastScene = scene; sceneT = 0; }

  // En el final: confeti, saltitos y corazones
  if (state === "finale") {
    confettiTimer += dt;
    while (confettiTimer > 0.04) { spawnConfetti(); confettiTimer -= 0.04; }
    if (girl.onGround && Math.random() < 0.02) jump();
    if (Math.random() < 0.03 && scene === "party") burstHearts(PARTY_CAKE.x + 16, PARTY_CAKE.y, 1);
  }

  updateGirl(dt);
  updateParticles(dt);
  updateCurtain(dt);
  if (scene === "outdoor") updateOutdoor(dt);
  if (girl.sweat) {
    girl.sweat.t += dt;
    if (girl.sweat.fade !== null && (girl.sweat.fade += dt) >= 0.4) girl.sweat = null;
  }
  updateDoors(dt);
  updateTweens(dt);
  if (scene === "night") updateNight(dt);
  if (scene === "door") updateDoorScene(dt);
  if (scene === "party") updateParty(dt);
  party.shake = Math.max(0, party.shake - dt);
  // Cada vez que baja la mano sobre el teclado: brillo en la tecla y un clic suave
  const typing = scene === "office" && girl.pose === "sit" && girl.sitAnim === "type";
  const pose = typing ? typingPose() : 0;
  if (typing && pose !== lastTypingPose) { keyFlash = 0.08; Sound.key(); }
  lastTypingPose = pose;
  keyFlash = Math.max(0, keyFlash - dt);

  if (scene === "hallway") {
    spawnEmotes(dt);
    for (const f of friends) f.hop = Math.max(0, f.hop - dt);
    const best = friends.find((f) => f.key === "best");
    if (highlightBest && best && Math.random() < dt * 14) spawnSparkles(best);
    if (girl.mood === "angry") spawnSteam(dt);
  }

  // Dibujar (con temblor de pantalla en la sorpresa)
  ctx.save();
  if (party.shake > 0) ctx.translate(Math.round((Math.random() - 0.5) * 6 * party.shake), Math.round((Math.random() - 0.5) * 6 * party.shake));
  if (scene === "party") {
    drawParty();
  } else if (scene === "door") {
    setAmbient({ reflect: 0.16, rim: "#fff2b0", rimA: Math.min(0.8, party.door + party.rays * 0.5), rimDx: 1 });
    drawDoorScene();
    setAmbient();
  } else if (scene === "hallway") {
    ctx.drawImage(hallwayBg, 0, 0);
    drawHallwayBack();
    setAmbient({ reflect: 0.18, rim: "#fffbe8", rimA: 0.3, rimDx: 0 });
    drawGroup();
    setAmbient();
    drawHallwayLight();
  } else if (scene === "night") {
    drawNight();
  } else if (scene === "office") {
    ctx.drawImage(officeBg, 0, 0);
    drawOfficeBack();
    // Mientras está del otro lado del vidrio, el vidrio y la hoja van encima de ella
    setAmbient({ reflect: girl.behindDoor ? 0 : 0.14, tint: girl.behindDoor ? "#bfe3f2" : null, tintA: 0.25 });
    if (girl.behindDoor) { drawGirl(); drawLeftGlass(); drawDoors(); drawChair(); }
    else { drawLeftGlass(); drawDoors(); drawChair(); drawGirl(); }
    setAmbient();
    drawDesk();
    drawOfficePlant();
    drawOfficeLight();
  } else {
    setAmbient({ rim: "#ffd9a0", rimA: 0.45, rimDx: 1, tint: "#ff9a6a", tintA: 0.06 });
    drawOutdoor();
    setAmbient();
  }
  drawParticles();
  ctx.restore();
  drawPartyOverlay();
  drawCurtain();

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
