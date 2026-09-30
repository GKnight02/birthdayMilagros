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
//  FONDO (se dibuja una sola vez en un canvas aparte)
// =====================================================
const background = (() => {
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");

  // Cielo en franjas (look retro en vez de degradado suave)
  const sky = ["#2b1d4e", "#3d2a6b", "#5a3a8a", "#7d4ea3", "#a864b5", "#d47fb8", "#f2a0b8"];
  const band = GROUND_Y / sky.length;
  sky.forEach((col, i) => { g.fillStyle = col; g.fillRect(0, Math.floor(i * band), W, Math.ceil(band)); });

  // Estrellitas
  g.fillStyle = "#fff";
  for (let i = 0; i < 40; i++) g.fillRect((i * 97) % W, (i * 53) % 60, 1, 1);

  // Colinas
  g.fillStyle = "#6a3f8f";
  for (let x = 0; x < W; x++) {
    const h = 18 + Math.sin(x / 22) * 8 + Math.sin(x / 9) * 3;
    g.fillRect(x, GROUND_Y - Math.floor(h), 1, Math.floor(h));
  }

  // Pasto y tierra
  g.fillStyle = "#4caf50"; g.fillRect(0, GROUND_Y, W, 4);
  g.fillStyle = "#2e7d32"; g.fillRect(0, GROUND_Y + 4, W, 2);
  g.fillStyle = "#8d5a3b"; g.fillRect(0, GROUND_Y + 6, W, H - GROUND_Y - 6);
  g.fillStyle = "#6d4028";
  for (let y = GROUND_Y + 10; y < H; y += 8)
    for (let x = (y / 8) % 2 ? 0 : 8; x < W; x += 16) g.fillRect(x, y, 6, 3);
  return c;
})();

// Nubes que se mueven
const clouds = [
  { x: 30, y: 22, s: 0.08 },
  { x: 180, y: 40, s: 0.05 },
  { x: 260, y: 15, s: 0.1 },
];
function drawCloud(x, y) {
  ctx.fillStyle = "#ffffff";
  ctx.globalAlpha = 0.85;
  ctx.fillRect(x + 4, y, 16, 4);
  ctx.fillRect(x, y + 4, 28, 6);
  ctx.fillRect(x + 8, y - 3, 8, 3);
  ctx.globalAlpha = 1;
}

// =====================================================
//  ESCENA: OFICINA
//  Habitación en perspectiva: la pared izquierda y la del fondo son
//  de vidrio (en la izquierda está la puerta corrediza, que ella abre
//  con la mano) y la de la derecha es color crema.
// =====================================================
let scene = "outdoor"; // outdoor | office

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
  onWall(284, 298, 0.2, 0.3, "#140c0c");        // reloj
  onWall(286, 296, 0.215, 0.285, "#ffffff");
  onWall(290, 292, 0.225, 0.255, "#140c0c");
  onWall(290, 294, 0.25, 0.26, "#140c0c");

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

// Silla de oficina (se dibuja detrás de ella)
function drawChair() {
  const x = OFFICE.girlX, y = OFFICE.girlY;
  rect("#140c0c", x + 1, y + 18, 10, 22);   // respaldo
  rect("#3b4a6b", x + 3, y + 20, 6, 18);
  rect("#140c0c", x + 6, y + 34, 26, 5);    // asiento
  rect("#3b4a6b", x + 8, y + 35, 22, 2);
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
  r("#fbf6ea", 0, 0, W, 16);
  r("#e9dbbd", 0, 16, W, 2);
  for (let x = 30; x < W; x += 70) { r("#ffffff", x, 18, 30, 3); r("#fff4c4", x + 2, 21, 26, 1); }
  r("#e9dbbd", 0, BACK.y1 - 5, W, 5);
  paintTileFloor(r);

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
  r("#140c0c", 82, 44, 58, 36);
  r("#c9955b", 84, 46, 54, 32);
  r("#ffe066", 88, 50, 12, 10); r("#ff8fb5", 104, 52, 12, 10);
  r("#8ce99a", 120, 49, 12, 10); r("#7ec8e3", 94, 64, 12, 9); r("#ffffff", 112, 65, 14, 10);
  // Cuadro con un corazón
  r("#140c0c", 184, 42, 30, 26);
  r("#ffffff", 186, 44, 26, 22);
  [[192, 48, 4, 2], [200, 48, 4, 2], [191, 50, 14, 4], [193, 54, 10, 2], [195, 56, 6, 2], [197, 58, 2, 2]]
    .forEach(([x, y, w, h]) => r("#ff4d6d", x, y, w, h));
  // Garrafón de agua
  r("#140c0c", 228, 96, 16, BACK.y1 - 95);
  r("#ffffff", 229, 97, 14, BACK.y1 - 97);
  r("#140c0c", 229, 78, 14, 19);
  r("#9fd4ff", 230, 79, 12, 17);
  r("#dff3ff", 231, 81, 2, 12);
  r("#4a78c2", 231, 104, 3, 3);
  return c;
})();

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

function drawFriend(f) {
  const spr = SPRITES.friends[f.key];
  const hop = f.hop > 0 ? -Math.round(Math.sin((f.hop / 0.5) * Math.PI) * 10) : 0;
  const y = f.feet - GIRL_H + (f.laugh ? laughBob(f.phase) : 0) + hop;
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.fillRect(f.x + GIRL_HALF - 10, f.feet - 1, 20, 2);
  const img = f.laugh ? spr.laugh : talking(f.phase) ? spr.talk : spr.chat;
  drawSprite(img, f.x, y, SCALE, f.facing === -1);
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
//  TELÓN DE TEATRO
// =====================================================
const curtain = { open: 0, from: 0, to: 0, t: 0, dur: 1, done: null };
const CURTAIN_SHADES = ["#4a0b18", "#6e1226", "#931a33", "#b3243e", "#c93a52", "#b3243e", "#931a33", "#6e1226"];
const VALANCE_H = 16;

// Abre (1) o cierra (0) el telón; se resuelve al terminar
function moveCurtain(to, dur = 1.4) {
  return new Promise((resolve) => {
    Object.assign(curtain, { from: curtain.open, to, t: 0, dur, done: resolve });
    Sound.curtain();
  });
}
const openCurtain = () => moveCurtain(1);
const closeCurtain = () => moveCurtain(0);

function updateCurtain(dt) {
  if (!curtain.done) return;
  curtain.t += dt;
  const p = Math.min(1, curtain.t / curtain.dur);
  const e = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2; // suave al inicio y al final
  curtain.open = curtain.from + (curtain.to - curtain.from) * e;
  if (p >= 1) { const cb = curtain.done; curtain.done = null; cb(); }
}

function drawCurtain() {
  const minW = 14; // lo que queda recogido a cada lado cuando está abierto
  const cw = Math.round(minW + (W / 2 - minW) * (1 - curtain.open));
  for (let lx = 0; lx < cw; lx++) {
    // Los pliegues se comprimen conforme el telón se recoge
    const phase = ((lx / cw) * 7) % 1;
    ctx.fillStyle = CURTAIN_SHADES[Math.floor(phase * CURTAIN_SHADES.length)];
    ctx.fillRect(lx, 0, 1, H);
    ctx.fillRect(W - 1 - lx, 0, 1, H);
  }
  // Orilla dorada en el borde que se mueve
  if (cw < W / 2) {
    rect("#140c0c", cw, 0, 1, H); rect("#140c0c", W - 1 - cw, 0, 1, H);
  }
  rect("#e0b040", cw - 2, 0, 2, H); rect("#e0b040", W - cw, 0, 2, H);

  // Cenefa de arriba con ondas
  for (let x = 0; x < W; x++) {
    const wave = Math.round(Math.abs(Math.sin((x / 20) * Math.PI)) * 4);
    rect(x % 20 < 10 ? "#7a1428" : "#931a33", x, 0, 1, VALANCE_H - wave);
    rect("#e0b040", x, VALANCE_H - wave, 1, 2);
    rect("#140c0c", x, VALANCE_H - wave + 2, 1, 1);
  }
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
  pose: "stand",      // stand | sit
  behindDoor: false,  // del otro lado de la puerta de vidrio
  reach: false,       // brazo estirado (deslizando la puerta)
  sitAnim: "type",    // type | sigh
  bodyOffset: 0,      // sube (-1) o baja (+1) los hombros al suspirar
  sweat: null,        // { t } gota de sudor sobre la cabeza
  mood: null,         // null | chat | laugh | angry (platicando de lado)
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
  if (girl.pose === "sit") {
    if (girl.sitAnim === "sigh" || girl.blinkTimer % 3 < 0.15) return SPRITES.sitSigh;
    return [SPRITES.sitA, SPRITES.sitB, SPRITES.sitC][typingPose()];
  }
  if (girl.reach) return door.carry && Math.floor(time * 6) % 2 ? SPRITES.reachB : SPRITES.reachA;
  if (girl.mood && girl.onGround && girl.targetX === null) {
    if (girl.mood === "chat" && talking(0.9)) return SPRITES.side.talk;
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
  if (girl.pose === "sit") return drawSittingGirl();
  // sombra (a la altura de sus pies; en el aire se queda en el piso)
  const air = (GIRL_TOP - girl.y) / 60;
  const floorY = girl.onGround ? girl.y + GIRL_H : GROUND_Y;
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  const sw = girl.onGround ? 24 : Math.max(10, 24 - air * 12);
  ctx.fillRect(Math.round(girl.x + GIRL_HALF - sw / 2), Math.round(floorY) - 1, Math.round(sw), 2);
  // Al caminar el cuerpo rebota un poquito hacia arriba
  const stepping = girl.targetX !== null && runFrameIndex() % 2;
  let bounce = girl.onGround && stepping ? -SCALE : 0;
  if (girl.mood === "laugh") bounce = laughBob(0.5);

  // Enojada: tiembla un poquito de coraje
  const shake = girl.mood === "angry" ? (Math.floor(time * 20) % 2) * 2 - 1 : 0;
  // Siempre a escala entera para que los pixeles no se deformen
  drawSprite(girlFrame(), girl.x + shake, girl.y + bounce, SCALE, girl.facing === -1);
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
  const w = img.width * SCALE, cut = 14; // fila donde empiezan las piernas
  ctx.drawImage(img, 0, cut, img.width, img.height - cut, x, y + cut * SCALE, w, (img.height - cut) * SCALE);
  ctx.drawImage(img, 0, 0, img.width, cut + 1, x, y + girl.bodyOffset * SCALE, w, (cut + 1) * SCALE);

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
//  OBJETOS: pastel, corazones, confeti
// =====================================================
let cake = null; // { x, y, vy, landed }

function dropCake(x) {
  return new Promise((resolve) => {
    cake = { x, y: -30, vy: 0, landed: false, onLand: resolve };
  });
}

function updateCake(dt) {
  if (!cake || cake.landed) return;
  cake.vy += GRAVITY * dt;
  cake.y += cake.vy * dt;
  const floor = GROUND_Y - 24;
  if (cake.y >= floor) {
    cake.y = floor;
    cake.landed = true;
    Sound.select();
    burstHearts(cake.x + 16, cake.y);
    cake.onLand && cake.onLand();
  }
}

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

function say(text, speed = 40) {
  return new Promise((resolve) => {
    dialog.classList.remove("hidden");
    dialogNext.classList.remove("show");
    dialogText.textContent = "";
    let i = 0;
    let done = false;

    const finish = () => {
      done = true;
      dialogText.textContent = text;
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
      dialogText.textContent = text.slice(0, i);
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
  await wait(300);
  await openCurtain();
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
  await wait(600);
}

// De regreso afuera, donde encuentra el pastel
async function chapterCake() {
  await changeScene(() => {
    scene = "outdoor";
    girl.pose = "stand";
    girl.mood = null;
    friends = [];
    girl.x = -40;
    girl.y = GIRL_TOP;
  });

  await walkTo(240, true);
  await say("Buscó por aquí...");
  await walkTo(60, true);
  await say("...y buscó por allá...");
  await walkTo(W / 2 - 40, true);
  girl.facing = 1;

  await say("Hasta que de pronto...");
  await jump();
  await dropCake(W / 2 + 10);
  await wait(400);
  await jump();

  await say(`¡Un pastel! ¡Hoy es el cumpleaños de ${CONFIG.name}!`);
}

const CHAPTERS = [
  { name: "Inicio", run: chapterIntro },
  { name: "Oficina", run: chapterOffice },
  { name: "Amigas", run: chapterFriends },
  { name: "Pastel", run: chapterCake },
];

async function story(from = 0) {
  state = "story";
  for (let i = from; i < CHAPTERS.length; i++) await CHAPTERS[i].run();
  finale();
}

function finale() {
  state = "finale";
  $("finale-name").textContent = `${CONFIG.name}`;
  finaleEl.classList.remove("hidden");
  Sound.birthdaySong();
  burstHearts(girl.x + GIRL_HALF, girl.y, 12);
}

function resetScene() {
  cake = null;
  particles = [];
  scene = "outdoor";
  curtain.open = 0;
  curtain.done = null;
  girl.pose = "stand";
  girl.behindDoor = false;
  girl.reach = false;
  girl.sweat = null;
  girl.bodyOffset = 0;
  girl.mood = null;
  friends = [];
  highlightBest = false;
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
  Sound.init();
  Sound.select();
  titleScreen.classList.add("hidden");
  story();
}

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

  // Si la dirección trae #escena=N, se salta el título y empieza ahí
  if (current >= 1 && current <= CHAPTERS.length) {
    titleScreen.classList.add("hidden");
    story(current - 1);
  }
})();

// =====================================================
//  BUCLE PRINCIPAL
// =====================================================
let last = performance.now();
let confettiTimer = 0;
let lastTypingPose = 0;
let time = 0;

function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  time += dt;

  // En el final: confeti, saltitos y corazones
  if (state === "finale") {
    confettiTimer += dt;
    while (confettiTimer > 0.04) { spawnConfetti(); confettiTimer -= 0.04; }
    if (girl.onGround && Math.random() < 0.02) jump();
    if (Math.random() < 0.02 && cake) burstHearts(cake.x + 16, cake.y, 1);
  }

  updateGirl(dt);
  updateCake(dt);
  updateParticles(dt);
  updateCurtain(dt);
  for (const c of clouds) { c.x += c.s * 60 * dt; if (c.x > W) c.x = -30; }
  if (girl.sweat) {
    girl.sweat.t += dt;
    if (girl.sweat.fade !== null && (girl.sweat.fade += dt) >= 0.4) girl.sweat = null;
  }
  updateDoors(dt);
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

  // Dibujar
  if (scene === "hallway") {
    ctx.drawImage(hallwayBg, 0, 0);
    drawGroup();
  } else if (scene === "office") {
    ctx.drawImage(officeBg, 0, 0);
    // Mientras está del otro lado del vidrio, el vidrio y la hoja van encima de ella
    if (girl.behindDoor) { drawGirl(); drawLeftGlass(); drawDoors(); drawChair(); }
    else { drawLeftGlass(); drawDoors(); drawChair(); drawGirl(); }
    drawDesk();
  } else {
    ctx.drawImage(background, 0, 0);
    clouds.forEach((c) => drawCloud(Math.round(c.x), c.y));
    if (cake) drawSprite(Math.floor(time * 6) % 2 ? SPRITES.cake1 : SPRITES.cake2, cake.x, cake.y);
    drawGirl();
  }
  drawParticles();
  drawCurtain();

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
