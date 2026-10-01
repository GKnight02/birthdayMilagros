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
  const y = f.feet - GIRL_H + (f.laugh ? laughBob(f.phase) : 0) + hop - (f.lift || 0);
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.fillRect(f.x + GIRL_HALF - 10, f.feet - 1, 20, 2);
  const img = f.laugh ? spr.laugh : !f.quiet && talking(f.phase) ? spr.talk : spr.chat;
  drawSprite(img, f.x, y, SCALE, f.facing === -1);
  return y;
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

// Ciudad a lo lejos, colina con pasto y un árbol (el cielo queda transparente)
const nightLand = (() => {
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");
  const r = (col, x, y, w, h) => { g.fillStyle = col; g.fillRect(x, Math.round(y), w, Math.round(h)); };

  // Edificios con ventanitas encendidas
  let x = 0, k = 0;
  while (x < W) {
    const w = 14 + ((k * 7) % 4) * 4, h = 18 + ((k * 13) % 5) * 7;
    r("#1a1c3a", x, GROUND_Y - 14 - h, w, h + 14);
    for (let wy = GROUND_Y - 10 - h; wy < GROUND_Y - 16; wy += 5)
      for (let wx = x + 3; wx < x + w - 3; wx += 4)
        if (((wx * 31 + wy * 17) >>> 0) % 5 < 2) r("#ffd27a", wx, wy, 2, 2);
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
  for (let x = 4; x < W; x += 9) r("#3f8a5e", x, GROUND_Y - 2, 1, 2); // hojitas de pasto

  // Árbol a la izquierda
  r("#140c0c", 20, GROUND_Y - 46, 10, 46);
  r("#4a3226", 22, GROUND_Y - 46, 6, 46);
  for (const [cx, cy, rad] of [[25, 82, 22], [8, 92, 14], [44, 90, 15], [26, 66, 14]]) {
    for (let dy = -rad; dy <= rad; dy++) {
      const half = Math.floor(Math.sqrt(rad * rad - dy * dy));
      r("#0f2a20", cx - half - 1, cy + dy, half * 2 + 2, 1);
      r(dy < -rad / 3 ? "#1f4a35" : "#183b2b", cx - half, cy + dy, half * 2, 1);
    }
  }
  return c;
})();

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

  // Nubes de lluvia que tapan la luna y luego se van a los lados
  const drift = Math.sin(time * 0.2) * 4;
  for (const [cx, cy, s, dir] of [[26, 20, 2, -1], [70, 36, 1, -1], [150, 14, 2, 1], [210, 34, 1, 1], [262, 18, 1, 1]]) {
    ctx.globalAlpha = 1 - clear * 0.4;
    drawNightCloud(Math.round(cx + drift + dir * clear * 190), cy, s);
  }
  ctx.globalAlpha = 1;

  ctx.drawImage(nightLand, 0, 0);

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

  drawGirl();

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

  // Penumbra de la tormenta
  if (night.rain > 0) {
    ctx.globalAlpha = 0.28 * night.rain;
    rect("#0a0a1e", 0, 0, W, H);
    ctx.globalAlpha = 1;
  }
}

function updateNight(dt) {
  // Lluvia: más gotas mientras más fuerte
  if (Math.random() < night.rain * dt * 140) {
    for (let i = 0; i < 2; i++)
      particles.push({ type: "rain", x: Math.random() * (W + 40) - 20, y: -6, vx: -30, vy: 210 + Math.random() * 40, life: 1.2 });
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
const HOUSE_DOOR = { x: 146, w: 36, top: GROUND_Y - 72 };
const DOOR_BOTTOM = GROUND_Y - 4;                       // la puerta empieza arriba del escalón
const HOUSE_WINDOWS = [{ x: 56, y: 62, w: 44, h: 36 }, { x: 228, y: 62, w: 44, h: 36 }];
const PORCH_LAMP = { x: 128, y: 82 };

// Fachada de la casita al atardecer
const houseBg = (() => {
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");
  const r = (col, x, y, w, h) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };

  const sky = ["#2b1d4e", "#3d2a6b", "#5a3a8a", "#7d4ea3", "#a864b5", "#d47fb8", "#f2a0b8"];
  const band = GROUND_Y / sky.length;
  sky.forEach((col, i) => r(col, 0, Math.floor(i * band), W, Math.ceil(band)));
  g.fillStyle = "#fff";
  for (let i = 0; i < 18; i++) g.fillRect((i * 97) % W, (i * 53) % 30, 1, 1);

  // Arbustos a los lados
  for (const [cx, cy, rad] of [[14, 132, 18], [36, 140, 12], [306, 132, 18], [286, 140, 12]]) {
    for (let dy = -rad; dy <= rad; dy++) {
      const half = Math.floor(Math.sqrt(rad * rad - dy * dy));
      r("#1e5a3a", cx - half - 1, cy + dy, half * 2 + 2, 1);
      r(dy < -rad / 3 ? "#4caf50" : "#3a8f48", cx - half, cy + dy, half * 2, 1);
    }
  }

  // Techo de tejas
  for (let y = 14; y < 36; y++) {
    const left = 46 - (y - 14) * 0.75;
    r(y % 4 === 0 ? "#6e2a3a" : "#8e3a4c", left, y, W - left * 2, 1);
  }
  r("#140c0c", 28, 13, W - 56, 1);
  r("#4a1828", 28, 36, W - 56, 3);

  // Pared con tablitas
  r("#f3d9c0", 40, 39, W - 80, GROUND_Y - 39);
  for (let y = 45; y < GROUND_Y; y += 6) r("#e6c6a8", 40, y, W - 80, 1);
  r("#140c0c", 39, 39, 1, GROUND_Y - 39);
  r("#140c0c", W - 40, 39, 1, GROUND_Y - 39);

  // Ventanas con luz cálida y cortinas (las siluetas se dibujan aparte)
  for (const w of HOUSE_WINDOWS) {
    r("#140c0c", w.x - 3, w.y - 3, w.w + 6, w.h + 6);
    r("#ffffff", w.x - 2, w.y - 2, w.w + 4, w.h + 4);
    r("#ffe3a0", w.x, w.y, w.w, w.h);
    r("#ffd27a", w.x, w.y + w.h / 2, w.w, w.h / 2);
    r("#ff8fb5", w.x, w.y, 6, w.h); r("#ff8fb5", w.x + w.w - 6, w.y, 6, w.h);
    r("#e8668f", w.x + 5, w.y, 1, w.h); r("#e8668f", w.x + w.w - 6, w.y, 1, w.h);
    r("#ffffff", w.x - 4, w.y + w.h + 2, w.w + 8, 3);                  // repisa
  }

  // Marco de la puerta y ventanita de arriba
  const d = HOUSE_DOOR;
  r("#140c0c", d.x - 5, d.top - 13, d.w + 10, DOOR_BOTTOM - d.top + 13);
  r("#fff8ee", d.x - 4, d.top - 12, d.w + 8, DOOR_BOTTOM - d.top + 12);
  r("#140c0c", d.x - 1, d.top - 10, d.w + 2, 9);
  r("#ffd27a", d.x, d.top - 9, d.w, 7);
  r("#140c0c", d.x + d.w / 2, d.top - 9, 1, 7);
  // Escalón y tapete
  r("#140c0c", d.x - 10, DOOR_BOTTOM - 1, d.w + 20, 6);
  r("#c8b4a0", d.x - 9, DOOR_BOTTOM, d.w + 18, 4);
  // Macetas con flores
  for (const px of [98, 196]) {
    r("#140c0c", px - 1, GROUND_Y - 13, 14, 13);
    r("#c0603a", px, GROUND_Y - 12, 12, 12);
    r("#3a8f48", px + 1, GROUND_Y - 20, 10, 8);
    r("#ff4d6d", px + 2, GROUND_Y - 22, 3, 3); r("#ffe066", px + 7, GROUND_Y - 21, 3, 3);
  }
  // Farolito del pórtico
  const l = PORCH_LAMP;
  r("#140c0c", l.x - 3, l.y - 2, 8, 12);
  r("#fff1b8", l.x - 2, l.y, 6, 8);
  r("#140c0c", l.x - 4, l.y - 3, 10, 2);

  // Pasto, tierra y caminito
  r("#4caf50", 0, GROUND_Y, W, 4);
  r("#2e7d32", 0, GROUND_Y + 4, W, 2);
  r("#8d5a3b", 0, GROUND_Y + 6, W, H - GROUND_Y - 6);
  g.fillStyle = "#6d4028";
  for (let y = GROUND_Y + 10; y < H; y += 8)
    for (let x = (y / 8) % 2 ? 0 : 8; x < W; x += 16) g.fillRect(x, y, 6, 3);
  for (let y = GROUND_Y + 4; y < H; y += 7) r("#b8a090", d.x + 4 + ((y / 7) % 2) * 6, y, 22, 4);
  return c;
})();

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

  r("#f9d5e5", 0, 0, W, FLOOR_Y);
  for (let x = 0; x < W; x += 16) r("#fbe3ee", x, 0, 8, FLOOR_Y);
  r("#ffffff", 0, 98, W, 2);
  r("#eab3c9", 0, 100, W, FLOOR_Y - 100);
  r("#d998b2", 0, FLOOR_Y - 2, W, 2);
  // Piso de madera
  r("#c98f5e", 0, FLOOR_Y, W, H - FLOOR_Y);
  for (let y = FLOOR_Y + 6, k = 0; y < H; y += 7, k++) {
    r("#b07a4f", 0, y, W, 1);
    for (let x = (k % 3) * 23; x < W; x += 70) r("#b07a4f", x, y - 6, 1, 6);
  }
  // Puerta por donde entra ella (abierta, con la luz de afuera)
  r("#140c0c", 6, 44, 36, FLOOR_Y - 44);
  r("#fff8ee", 7, 45, 34, FLOOR_Y - 45);
  r("#fff4c8", 10, 48, 28, FLOOR_Y - 48);
  r("#140c0c", 42, 46, 6, FLOOR_Y - 46);
  r("#b0603a", 43, 47, 4, FLOOR_Y - 48);
  // Banderines de colores colgando de un cordón
  for (let x = 0; x < W; x++) {
    const y = 9 + Math.round(Math.sin(((x % 80) / 80) * Math.PI) * 8);
    r("#7a4a5a", x, y, 1, 1);
    if (x % 10 === 3) {
      const col = FLAG_COLORS[(x / 10 | 0) % FLAG_COLORS.length];
      for (let k = 0; k < 6; k++) r(col, x - 3 + k / 2, y + 1 + k, 7 - k, 1);
    }
  }
  return c;
})();

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
  // Vasos rojos
  for (const cx of [x + 72, x + 79]) {
    rect("#140c0c", cx - 1, top - 10, 7, 9);
    rect("#e5383b", cx, top - 9, 5, 7);
    rect("#ffffff", cx, top - 9, 5, 1);
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
  const x = Math.round(girl.x) + 12, y = Math.round(girl.y) - 7 + bounce;
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
    door: 0, rays: 0, flash: 0, duck: 0, mode: "calm", shake: 0, dim: 0,
    bigText: null, crown: false, highlight: false, joyTears: false, timer: 0,
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
  ctx.drawImage(houseBg, 0, 0);

  // Siluetas que se asoman por las ventanas... y se agachan para no ser vistas
  HOUSE_WINDOWS.forEach((w, wi) => {
    ctx.save();
    ctx.beginPath(); ctx.rect(w.x + 6, w.y, w.w - 12, w.h); ctx.clip();
    for (let k = 0; k < 2; k++) {
      const hx = w.x + 15 + k * 14;
      const hy = Math.round(w.y + w.h - 9 + party.duck * 22 + Math.sin(time * 2.5 + wi * 2 + k * 1.3) * 1.5);
      ctx.globalAlpha = 0.75;
      pixelCircle(hx, hy, 6, "#6a3f5a");
      rect("#6a3f5a", hx - 9, hy + 5, 18, 12);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    rect("#ffffff", w.x + w.w / 2 - 1, w.y, 2, w.h);
    rect("#ffffff", w.x, w.y + w.h / 2 - 1, w.w, 2);
  });

  // Luz del farolito
  ctx.globalAlpha = 0.12 + Math.sin(time * 3) * 0.02;
  pixelCircle(PORCH_LAMP.x + 1, PORCH_LAMP.y + 4, 14, "#ffd27a");
  ctx.globalAlpha = 1;

  // Detrás de la puerta: pura luz dorada
  const d = HOUSE_DOOR, h = DOOR_BOTTOM - d.top;
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
  // La hoja de la puerta gira hacia adentro sobre la bisagra derecha
  const pw = Math.max(3, Math.round(d.w * (1 - 0.88 * party.door)));
  const px = d.x + d.w - pw;
  rect("#140c0c", px - 1, d.top, pw + 1, h);
  rect("#b0603a", px, d.top + 1, pw - 1, h - 1);
  if (pw > 14) {
    rect("#8e4a2a", px + 4, d.top + 6, pw - 9, 24);
    rect("#8e4a2a", px + 4, d.top + 36, pw - 9, 24);
    rect("#c07048", px + 5, d.top + 7, pw - 11, 1);
    rect("#c07048", px + 5, d.top + 37, pw - 11, 1);
    rect("#140c0c", px + 1, d.top + 36, 4, 4);
    rect("#ffd166", px + 2, d.top + 37, 2, 2);                                  // perilla
    rect("#ff4d6d", px + pw / 2 - 4, d.top + 1, 8, 2);                            // moñito
  }
  ctx.globalAlpha = party.door * 0.4;
  rect("#140c0c", px, d.top + 1, pw - 1, h - 1);
  ctx.globalAlpha = 1;

  drawGirl();
}

function drawParty() {
  ctx.drawImage(partyBg, 0, 0);

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

  // Las de atrás quedan tapadas por la mesa
  const back = crowd.filter((f) => f.feet < GROUND_Y - 6);
  back.forEach(drawGuest);
  drawTable();

  const people = [...crowd.filter((f) => !back.includes(f)).map((f) => ({ feet: f.feet, draw: () => drawGuest(f) })),
    { feet: girl.y + GIRL_H, draw: () => { drawGirl(); if (party.crown) drawCrown(); } }];
  people.sort((a, b) => a.feet - b.feet).forEach((p) => p.draw());

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

function updateDoorScene(dt) {
  // Al abrirse la puerta se escapan brillitos y confeti
  if (party.door > 0.15 && Math.random() < dt * 30) {
    const d = HOUSE_DOOR;
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
  pose: "stand",      // stand | sit | bench
  benchFace: "sad",   // sad | look | smile (sentada en la banca)
  behindDoor: false,  // del otro lado de la puerta de vidrio
  reach: false,       // brazo estirado (deslizando la puerta)
  sitAnim: "type",    // type | sigh
  bodyOffset: 0,      // sube (-1) o baja (+1) los hombros al suspirar
  sweat: null,        // { t } gota de sudor sobre la cabeza
  mood: null,         // null | chat | laugh | angry | smile (de lado)
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
  if (girl.pose === "bench") return SPRITES.bench[girl.benchFace];
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
  if (girl.pose === "sit" || girl.pose === "bench") return drawSittingGirl();
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
  Sound.playMusic("morning");
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

  // Llega hasta la puerta; adentro alguien se asoma por la ventana... y se esconde
  await walkTo(HOUSE_DOOR.x + 5 - 35);
  floatText("¡Shhh!", 78, 60, "#ffffff", 1.6);
  tween(party, "duck", 1, 0.5);
  await wait(700);
  await say(`Al final del día, algo llevó a ${CONFIG.name} hasta esta puerta...`);
  floatText("?", girl.x + 24, girl.y - 4, "#ffffff", 1.8);
  await wait(500);
  await say(`¿Y ahora, ${CONFIG.name}... por qué sientes que hoy es un día especial?`);

  // Silencio, estira la mano y abre: sale la luz
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
    if (Math.random() < 0.03 && scene === "party") burstHearts(PARTY_CAKE.x + 16, PARTY_CAKE.y, 1);
  }

  updateGirl(dt);
  updateParticles(dt);
  updateCurtain(dt);
  for (const c of clouds) { c.x += c.s * 60 * dt; if (c.x > W) c.x = -30; }
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
    drawDoorScene();
  } else if (scene === "hallway") {
    ctx.drawImage(hallwayBg, 0, 0);
    drawGroup();
  } else if (scene === "night") {
    drawNight();
  } else if (scene === "office") {
    ctx.drawImage(officeBg, 0, 0);
    // Mientras está del otro lado del vidrio, el vidrio y la hoja van encima de ella
    if (girl.behindDoor) { drawGirl(); drawLeftGlass(); drawDoors(); drawChair(); }
    else { drawLeftGlass(); drawDoors(); drawChair(); drawGirl(); }
    drawDesk();
  } else {
    ctx.drawImage(background, 0, 0);
    clouds.forEach((c) => drawCloud(Math.round(c.x), c.y));
    drawGirl();
  }
  drawParticles();
  ctx.restore();
  drawPartyOverlay();
  drawCurtain();

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
