// =====================================================
//  SPRITES 8-BIT
//  Cada sprite es una lista de filas; cada carácter es
//  un píxel cuyo color sale de PALETTE ('.' = transparente).
//  Para editar un sprite solo cambia las letras.
// =====================================================

const PALETTE = {
  X: "#140c0c", // contorno
  K: "#4a2c22", // cabello castaño oscuro
  k: "#6e4636", // brillo / raya del cabello
  S: "#e0a980", // piel
  s: "#c08660", // sombra de piel
  E: "#1a1a2e", // ojos
  C: "#e8907a", // mejillas
  M: "#a8404a", // labios
  T: "#f3dfb2", // suéter crema
  t: "#d9bf8c", // suéter sombra
  L: "#2a2020", // rayas negras del suéter
  N: "#ffcc33", // collar dorado "M"
  b: "#1c1414", // cinturón
  J: "#7fa8dc", // jeans
  j: "#5a82b8", // jeans sombra
  B: "#ecebf2", // tenis
  W: "#ffffff",
  P: "#ff8fb5", // pastel rosa
  p: "#e8668f",
  Y: "#ffe066", // llama
  O: "#ff9933", // llama naranja
  c: "#7ec8e3", // vela
  G: "#c9c9d9", // plato
  H: "#ff4d6d", // corazón
};

// --- La chica (18 x 20), estilo chibi ---
// Contorno negro, cabeza grande, pelo largo en mechones delgados.
// Parada se ve de frente; al correr y saltar se pone de perfil (3/4)
// mirando a la derecha (se voltea con flip al ir a la izquierda).

// Agrega una columna vacía a cada lado (los cuadros de frente miden 16)
const pad = (rows) => rows.map((r) => "." + r + ".");

const GIRL_HEAD = [
  "...XXXXXXXXXX...",
  "..XKKKKKKKKkKX..",
  ".XKKkKKKKKKKKKX.",
  ".XKKSKKSSKKSKKX.",
  ".XKSSSSSSSSSSKX.",
  ".XKSSESSSSESSKX.",
  ".XKSSESSSSESSKX.",
  ".XKSCSSMMSSCSKX.",
  ".XKKSSSSSSSSKKX.",
  ".XKKXXSSSSXXKKX.",
];

// Torso: suéter a rayas con brazos (t) y mechones de pelo detrás
const GIRL_TORSO = [
  ".XKKXTTNNTTXKKX.",
  ".XKXtLLLLLLtXKX.",
  ".XKXtTTTTTTtXKX.",
  "..XXSLLLLLLSXX..",
  "...XXTTTTTTXX...",
  "....XbbbbbbX....",
];

const GIRL_IDLE = pad([
  ...GIRL_HEAD,
  ...GIRL_TORSO,
  "....XJJXXJJX....",
  "....XJJXXJJX....",
  "...XBBBXXBBBX...",
  "...XXXXXXXXXX...",
]);

// Parpadeo: ojos cerrados (solo queda la línea de abajo)
const GIRL_BLINK = GIRL_IDLE.map((row, i) =>
  i === 5 ? row.replace(/E/g, "S") : row
);

// Cabeza de perfil: la cara va a la derecha y el pelo hacia atrás
const SIDE_HEAD = [
  ".....XXXXXXXXXX...",
  "....XKKKKKKKKKkKX.",
  "...XKKkKKKKKKKKKKX",
  "...XKKKKKKKSKKSSKX",
  "...XKKKKKKSSSSSSSX",
  "...XKKkKKKSSESSESX",
  "...XKKKKKKSSESSESX",
  "...XKKKKKKSSCSSSSX",
  "...XKKKKKKKSSSSMX.",
  "...XKKKKKKXXSSXX..",
];

// Cuerpo de perfil (filas 10-19): torso, cinturón, piernas, zapato y contorno.
// Pierna y brazo cercanos en color normal (J, t); los lejanos más oscuros (j, s).

// Correr: 4 fases de un ciclo real.
// A: zancada con la pierna cercana adelante y el brazo cercano atrás.
// B: paso: la pierna cercana apoya bajo el cuerpo y la lejana se dobla atrás.
// C: zancada con la pierna lejana adelante y el brazo cercano adelante.
// D: paso: la pierna lejana apoya y la cercana se dobla atrás.
const GIRL_RUN_A = [
  ...SIDE_HEAD,
  "...XKKKKKXTTTNTX..",
  "..XKKKKKKXLLtLLX..",
  "..XKKKKKXXTtTTTX..",
  "...XKKKXStLLLLLX..",
  "....XXX..XbbbbbX..",
  "........XjjXJJJX..",
  ".......XjjX.XJJJX.",
  "......XjjX...XJJJX",
  ".....XBBBX...XBBBX",
  ".....XXXXX...XXXXX",
];
const GIRL_RUN_B = [
  ...SIDE_HEAD,
  "....XKKKKXTTTNTX..",
  "...XKKKKKXLLtLLX..",
  "..XKKKKKXXTTtTTX..",
  "..XKKKX..XLLSLLX..",
  "...XX....XbbbbbX..",
  "........XjjJJJX...",
  ".......XjjXJJJX...",
  "......XBjX.XJJJX..",
  "......XXX..XBBBBX.",
  "...........XXXXXX.",
];
const GIRL_RUN_C = [
  ...SIDE_HEAD,
  "...XKKKKKXTTTNTX..",
  "..XKKKKKKXLLtLLX..",
  "..XKKKKKXXTTTtTX..",
  "...XKKKX.XLLLLtSX.",
  "....XXX..XbbbbbX..",
  "........XJJXjjjX..",
  ".......XJJX.XjjjX.",
  "......XJJX...XjjjX",
  ".....XBBBX...XBBBX",
  ".....XXXXX...XXXXX",
];
const GIRL_RUN_D = [
  ...SIDE_HEAD,
  "....XKKKKXTTTNTX..",
  "...XKKKKKXLLtLLX..",
  "..XKKKKKXXTtTTTX..",
  "..XKKKX..XLSLLLX..",
  "...XX....XbbbbbX..",
  "........XJJjjjX...",
  ".......XJJXjjjX...",
  "......XBJX.XjjjX..",
  "......XXX..XBBBBX.",
  "...........XXXXXX.",
];

// Agachada: antes de saltar y al aterrizar (rodillas dobladas, cabeza abajo)
const GIRL_CROUCH = [
  "..................",
  ...SIDE_HEAD,
  "...XKKKKKXTTTNTX..",
  "..XKKKKKKXLLtLLX..",
  "..XKKKKKXXTTtTTX..",
  "...XKKKX.XLLSLLX..",
  "....XXX..XbbbbbX..",
  "........XjjJJJJX..",
  ".........XjjXJJX..",
  "........XBBBXBBBX.",
  "........XXXXXXXXX.",
];

// Salto subiendo: brazo arriba, rodillas recogidas, pelo colgando
const GIRL_JUMP_UP = [
  ...SIDE_HEAD.slice(0, 9),
  "...XKKKKKKXXSSXXSX",
  "....XKKKKXTTTNTXtX",
  "....XKKKKXLLLLLtX.",
  "....XKKKKXTTTTTX..",
  ".....XKKXXLLLLLX..",
  "......XX.XbbbbbX..",
  "........XjjJJJJJX.",
  ".........XjjX.XJJX",
  "........XBBX..XBBX",
  "........XXX...XXXX",
  "..................",
];

// Salto bajando: pelo flotando hacia atrás, brazo adelante, piernas estiradas
const GIRL_JUMP_FALL = [
  ...SIDE_HEAD,
  ".XKKKKKKKXTTTNTX..",
  "XKKKXXXXXXLLLtLX..",
  ".XXX.....XTTTTtSX.",
  ".........XLLLLLXX.",
  ".........XbbbbbX..",
  "........XjjXJJJX..",
  ".......XjjX.XJJX..",
  "......XBBX..XJJX..",
  "......XXX...XBBBX.",
  "............XXXXX.",
];

// Estirando el brazo hacia adelante para deslizar la puerta.
// A: parada; B: dando un paso mientras empuja la hoja.
const REACH_TOP = [
  ...SIDE_HEAD,
  "...XKKKKKXTTTNTX..",
  "..XKKKKKKXLLLLLXXX",
  "..XKKKKKXXTTttttSX",
  "...XKKKX.XLLLLXXX.",
  "....XXX..XbbbbbX..",
];
const GIRL_REACH_A = [
  ...REACH_TOP,
  ".........XjjJJX...",
  ".........XjjJJX...",
  ".........XjjJJX...",
  "........XBBBBBBX..",
  "........XXXXXXXX..",
];
const GIRL_REACH_B = [
  ...REACH_TOP,
  "........XjjXJJJX..",
  ".......XjjX.XJJJX.",
  "......XjjX...XJJJX",
  ".....XBBBX...XBBBX",
  ".....XXXXX...XXXXX",
];

// Sentada frente a la computadora (de perfil, mirando a la derecha).
// Brazo con el codo doblado y la mano sobre el teclado;
// muslo sobre el asiento y la pierna colgando desde la rodilla.
const SIT_BODY = [
  "...XKKKKKXTTTNTX..",
  "..XKKKKKKXLLtLLX..",
  "..XKKKKKXXTTtTTXXX",
  "...XKKKX.XLLtttttS",
  "....XXX..XbbbbXXXX",
  ".........XJJJJJJX.",
  ".........XXXXXJJX.",
  ".............XJJX.",
  ".............XBBBX",
  ".............XXXXX",
];
const GIRL_SIT_A = [...SIDE_HEAD, ...SIT_BODY];
// Tecleo, mano cercana arriba: el antebrazo se inclina y la mano se levanta
const GIRL_SIT_B = [
  ...SIDE_HEAD,
  "...XKKKKKXTTTNTX..",
  "..XKKKKKKXLLtLLX.S",
  "..XKKKKKXXTTtTTXtX",
  "...XKKKX.XLLttttX.",
  "....XXX..XbbbbXXX.",
  ...SIT_BODY.slice(5),
];
// Tecleo, mano lejana arriba: se asoma detrás de la cercana
const GIRL_SIT_C = GIRL_SIT_A.map((row, i) =>
  i === 12 ? row.slice(0, 15) + "XsX" : row
);
// Ojos cerrados (parpadeo y suspiro)
const GIRL_SIT_SIGH = GIRL_SIT_A.map((row, i) =>
  i === 5 ? row.replace(/E/g, "S") : row
);

// Gota de sudor estilo anime (5 x 7)
const SWEAT = [
  "..X..",
  "..X..",
  ".XcX.",
  "XWccX",
  "XWccX",
  "XcccX",
  ".XXX.",
];

// --- Pastel (16 x 12), dos cuadros para la llama ---
const CAKE_BASE = [
  ".....c..c..c....",
  ".....c..c..c....",
  "..WWWWWWWWWWWW..",
  "..WPWWPWWPWWPW..",
  "..PPPPPPPPPPPP..",
  "..pppppppppppp..",
  "..WWWWWWWWWWWW..",
  "..PPPPPPPPPPPP..",
  "..pppppppppppp..",
  ".GGGGGGGGGGGGGG.",
];
const CAKE1 = [".....Y..Y..Y....", ".....O..O..O....", ...CAKE_BASE];
const CAKE2 = ["....Y..Y..Y.....", ".....O..O..O....", ...CAKE_BASE];

// --- Corazón (7 x 6) ---
const HEART = [
  ".HH.HH.",
  "HHWHHHH",
  "HHHHHHH",
  ".HHHHH.",
  "..HHH..",
  "...H...",
];

// Convierte la matriz de texto en un canvas reutilizable
function buildSprite(rows) {
  const c = document.createElement("canvas");
  c.width = rows[0].length;
  c.height = rows.length;
  const g = c.getContext("2d");
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === "." || !PALETTE[ch]) return;
      g.fillStyle = PALETTE[ch];
      g.fillRect(x, y, 1, 1);
    });
  });
  return c;
}

const SPRITES = {
  idle: buildSprite(GIRL_IDLE),
  blink: buildSprite(GIRL_BLINK),
  runA: buildSprite(GIRL_RUN_A),
  runB: buildSprite(GIRL_RUN_B),
  runC: buildSprite(GIRL_RUN_C),
  runD: buildSprite(GIRL_RUN_D),
  crouch: buildSprite(GIRL_CROUCH),
  reachA: buildSprite(GIRL_REACH_A),
  reachB: buildSprite(GIRL_REACH_B),
  jumpUp: buildSprite(GIRL_JUMP_UP),
  jumpFall: buildSprite(GIRL_JUMP_FALL),
  sitA: buildSprite(GIRL_SIT_A),
  sitB: buildSprite(GIRL_SIT_B),
  sitC: buildSprite(GIRL_SIT_C),
  sitSigh: buildSprite(GIRL_SIT_SIGH),
  sweat: buildSprite(SWEAT),
  cake1: buildSprite(CAKE1),
  cake2: buildSprite(CAKE2),
  heart: buildSprite(HEART),
};
