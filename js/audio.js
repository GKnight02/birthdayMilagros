// Sonidos chiptune sencillos con Web Audio (sin archivos externos)
const Sound = (() => {
  let ctx = null;

  function init() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
  }

  function tone(freq, duration = 0.1, type = "square", volume = 0.06, when = 0) {
    if (!ctx) return;
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + duration);
  }

  function jump() {
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(900, t + 0.15);
    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  // Barrido que baja de tono (para el suspiro y el telón)
  function sweep(from, to, duration, type, volume) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + duration);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }
  const sigh = () => sweep(520, 180, 0.7, "triangle", 0.07);
  const curtain = () => sweep(220, 90, 0.9, "triangle", 0.05);
  const door = () => sweep(300, 200, 0.6, "sine", 0.03);
  const key = () => tone(1400 + Math.random() * 400, 0.015, "square", 0.012);

  const blip = () => tone(880, 0.03, "square", 0.025);
  const step = () => tone(140, 0.03, "triangle", 0.04);
  const select = () => { tone(660, 0.08); tone(990, 0.12, "square", 0.06, 0.08); };

  // Melodía de "Cumpleaños feliz" (dominio público)
  function birthdaySong() {
    const N = { G4: 392, A4: 440, B4: 494, C5: 523, D5: 587, E5: 659, F5: 698, G5: 784 };
    const song = [
      ["G4", .75], ["G4", .25], ["A4", 1], ["G4", 1], ["C5", 1], ["B4", 2],
      ["G4", .75], ["G4", .25], ["A4", 1], ["G4", 1], ["D5", 1], ["C5", 2],
      ["G4", .75], ["G4", .25], ["G5", 1], ["E5", 1], ["C5", 1], ["B4", 1], ["A4", 2],
      ["F5", .75], ["F5", .25], ["E5", 1], ["C5", 1], ["D5", 1], ["C5", 2],
    ];
    const beat = 0.32;
    let t = 0;
    for (const [n, d] of song) {
      tone(N[n], d * beat * 0.95, "square", 0.05, t);
      tone(N[n] / 2, d * beat * 0.95, "triangle", 0.05, t);
      t += d * beat;
    }
  }

  return { init, jump, blip, select, step, sigh, curtain, door, key, birthdaySong };
})();
