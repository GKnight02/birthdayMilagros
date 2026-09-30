// Sonidos chiptune sencillos con Web Audio (sin archivos externos)
const Sound = (() => {
  let ctx = null;

  function init() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      setupMusic();
    }
    if (ctx.state === "suspended") ctx.resume();
    // Si se pidió música antes de poder crear el audio, arranca ahora
    if (wanted && !music) startTrack(wanted);
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
    return t; // duración en segundos
  }

  // =====================================================
  //  MÚSICA DE FONDO — va por un canal aparte para no tocar los efectos
  // =====================================================
  // Cada pista es una lista de voces y cada paso es una corchea:
  //   "C5" nota · "C5:2" nota de 2 pasos · "A3+C4+E4" acorde · "." silencio · "x" golpe (batería)
  //   "|" solo separa compases para leerlo mejor.
  const TRACKS = {
    // Inicio: mañana soleada, alegre y tranquila, con pajaritos
    morning: {
      bpm: 96,
      birds: true,
      voices: [
        { type: "triangle", vol: 0.03, gate: 0.9, seq:
          "E5:2 . G5 . A5 G5 E5 . | C5:2 . E5 . D5 C5 A4 . | A4:2 . C5 . F5 . E5 . | D5:4 . . . G4 . B4 . | " +
          "E5:2 . G5 . C6:2 . B5 . | A5:2 . G5 . E5 . C5 . | F5 . E5 . D5 . C5 . | D5:2 . B4 . G4:4 . . ." },
        { type: "triangle", vol: 0.045, gate: 0.8, seq:
          "C3 . G3 . C3 . G3 . | A2 . E3 . A2 . E3 . | F2 . C3 . F2 . C3 . | G2 . D3 . G2 . D3 ." },
        { type: "sine", vol: 0.02, gate: 0.6, seq:
          "C4 E4 G4 E4 C4 E4 G4 E4 | A3 C4 E4 C4 A3 C4 E4 C4 | F3 A3 C4 A3 F3 A3 C4 A3 | G3 B3 D4 B3 G3 B3 D4 B3" },
      ],
    },
    // Oficina: lo-fi suave y un poco melancólico, para concentrarse
    office: {
      bpm: 72,
      voices: [
        { type: "sine", vol: 0.012, gate: 1, attack: 0.5, seq:
          "A3+C4+E4+G4:8 . . . . . . . | F3+A3+C4+E4:8 . . . . . . . | C4+E4+G4+B4:8 . . . . . . . | G3+B3+D4:8 . . . . . . ." },
        { type: "triangle", vol: 0.022, gate: 0.9, seq:
          "E5 . . C5 . D5 . . | C5 . . A4 . . . . | G4 . . E5 . D5 . . | B4:4 . . . . . . ." },
        { type: "triangle", vol: 0.03, gate: 0.9, seq:
          "A2:3 . . A2 . . E2 . | F2:3 . . F2 . . C3 . | C3:3 . . C3 . . G2 . | G2:3 . . G2 . . D3 ." },
      ],
    },
    // Amigas: movida y juguetona
    friends: {
      bpm: 138,
      voices: [
        { type: "square", vol: 0.016, gate: 0.7, seq:
          "C5 E5 G5 E5 C6 . G5 . | A5 . F5 A5 C6 . A5 . | B5 . G5 B5 D6 . B5 A5 | G5 E5 C5 E5 G5:2 . ." },
        { type: "triangle", vol: 0.045, gate: 0.6, seq:
          "C3 . C3 G2 C3 . G2 . | F2 . F2 C3 F2 . C3 . | G2 . G2 D3 G2 . D3 . | C3 . G2 . C3 . . ." },
        { type: "kick", vol: 0.08, seq: "x . . . x . . ." },
        { type: "hat", vol: 0.02, seq: ". x . x . x . x" },
      ],
    },
    // Pastel: búsqueda de puntitas, con algo de misterio
    search: {
      bpm: 116,
      voices: [
        { type: "square", vol: 0.016, gate: 0.35, seq:
          "A4 . C5 . E5 . C5 . | B4 . D5 . F5 . D5 . | A4 . C5 . E5 . A5 . | G#4 . B4 . E5 . . ." },
        { type: "triangle", vol: 0.045, gate: 0.5, seq:
          "A2 . . . E2 . . . | D2 . . . F2 . . . | A2 . . . E2 . . . | E2 . . . E2 . G#2 ." },
        { type: "hat", vol: 0.015, seq: ". . x . . . x ." },
      ],
    },
    // Final: fiesta después de "Cumpleaños feliz"
    party: {
      bpm: 120,
      voices: [
        { type: "triangle", vol: 0.022, gate: 0.6, seq:
          "C5 E5 G5 C6 G5 E5 C5 E5 | B4 D5 G5 B5 G5 D5 B4 D5 | A4 C5 E5 A5 E5 C5 A4 C5 | F4 A4 C5 F5 C5 A4 F4 A4" },
        { type: "triangle", vol: 0.045, gate: 0.7, seq:
          "C3 . . C3 . . G2 . | G2 . . G2 . . D3 . | A2 . . A2 . . E3 . | F2 . . F2 . . C3 ." },
        { type: "kick", vol: 0.07, seq: "x . . . x . . ." },
        { type: "hat", vol: 0.015, seq: ". x . x . x . x" },
      ],
    },
  };

  const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function freqOf(name) {
    const [, n, sharp, oct] = name.match(/^([A-G])(#?)(\d)$/);
    const midi = (Number(oct) + 1) * 12 + SEMI[n] + (sharp ? 1 : 0);
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  // Convierte el texto de cada voz en pasos listos para tocar
  for (const track of Object.values(TRACKS)) {
    for (const v of track.voices) {
      v.steps = v.seq.split(/\s+/).filter((s) => s && s !== "|").map((tok) => {
        if (tok === ".") return null;
        if (tok === "x") return { hit: true, len: 1 };
        const [notes, len] = tok.split(":");
        return { freqs: notes.split("+").map(freqOf), len: Number(len || 1) };
      });
    }
  }

  const MUSIC_VOLUME = 0.8;
  const LOOKAHEAD = 0.3; // segundos que se programan por adelantado
  let musicBus = null;
  let noise = null;
  let music = null;  // pista sonando
  let wanted = null; // pista pedida (aunque el audio aún no exista)

  function setupMusic() {
    musicBus = ctx.createGain();
    musicBus.gain.value = MUSIC_VOLUME;
    musicBus.connect(ctx.destination);
    // Ruido blanco para los platillos
    noise = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }

  function note(freq, t, dur, type, vol, attack, out) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + Math.min(attack, dur * 0.5));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(out);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function kick(t, vol, out) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    osc.connect(g).connect(out);
    osc.start(t);
    osc.stop(t + 0.17);
  }

  function hat(t, vol, out) {
    const src = ctx.createBufferSource();
    const hp = ctx.createBiquadFilter();
    const g = ctx.createGain();
    src.buffer = noise;
    hp.type = "highpass";
    hp.frequency.value = 7000;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    src.connect(hp).connect(g).connect(out);
    src.start(t);
    src.stop(t + 0.05);
  }

  // Un pajarito: dos o tres píos rápidos
  function chirp(t, out) {
    const base = 2400 + Math.random() * 1200;
    const n = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < n; i++) {
      const s = t + i * 0.11;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(base, s);
      osc.frequency.exponentialRampToValueAtTime(base * 1.4, s + 0.06);
      g.gain.setValueAtTime(0.0001, s);
      g.gain.linearRampToValueAtTime(0.012, s + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, s + 0.07);
      osc.connect(g).connect(out);
      osc.start(s);
      osc.stop(s + 0.08);
    }
  }

  function schedule(m) {
    const { track } = m;
    const stepDur = 60 / track.bpm / 2;
    // Si la pestaña estuvo en segundo plano, no intentes ponerte al día
    if (m.next < ctx.currentTime - 0.1) m.next = ctx.currentTime + 0.05;
    while (m.next < ctx.currentTime + LOOKAHEAD) {
      for (const v of track.voices) {
        const st = v.steps[m.step % v.steps.length];
        if (!st) continue;
        if (v.type === "kick") kick(m.next, v.vol, m.gain);
        else if (v.type === "hat") hat(m.next, v.vol, m.gain);
        else {
          const dur = st.len * stepDur * (v.gate ?? 0.9);
          for (const f of st.freqs) note(f, m.next, dur, v.type, v.vol, v.attack ?? 0.01, m.gain);
        }
      }
      if (track.birds && m.next >= m.nextBird) {
        chirp(m.next, m.gain);
        m.nextBird = m.next + 1.5 + Math.random() * 3.5;
      }
      m.next += stepDur;
      m.step++;
    }
  }

  function startTrack(name) {
    const t = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(1, t + 1.2);
    gain.connect(musicBus);
    const m = { name, track: TRACKS[name], gain, step: 0, next: t + 0.05, nextBird: t + 1 };
    m.timer = setInterval(() => schedule(m), 50);
    schedule(m);
    music = m;
  }

  function fadeOut(m, fade) {
    clearInterval(m.timer);
    const t = ctx.currentTime;
    m.gain.gain.cancelScheduledValues(t);
    m.gain.gain.setValueAtTime(m.gain.gain.value, t);
    m.gain.gain.linearRampToValueAtTime(0, t + fade);
    setTimeout(() => m.gain.disconnect(), (fade + LOOKAHEAD + 0.5) * 1000);
  }

  // Cambia la música de fondo con un fundido suave
  function playMusic(name) {
    wanted = name;
    if (!ctx || (music && music.name === name)) return;
    if (music) fadeOut(music, 1.2);
    startTrack(name);
  }

  function stopMusic(fade = 1) {
    wanted = null;
    if (!music) return;
    fadeOut(music, fade);
    music = null;
  }

  return { init, jump, blip, select, step, sigh, curtain, door, key, birthdaySong, playMusic, stopMusic };
})();
