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
    if (rainWanted && !rainSound) rain(true);
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
  const thump = () => { sweep(120, 45, 0.25, "sine", 0.12); tone(70, 0.08, "triangle", 0.06); };
  const door = () => sweep(300, 200, 0.6, "sine", 0.03);
  const key = () => tone(1400 + Math.random() * 400, 0.015, "square", 0.012);

  const blip = () => tone(880, 0.03, "square", 0.025);
  const step = () => tone(140, 0.03, "triangle", 0.04);
  const select = () => { tone(660, 0.08); tone(990, 0.12, "square", 0.06, 0.08); };

  // =====================================================
  //  MÚSICA DE FONDO — va por un canal aparte para no tocar los efectos
  // =====================================================
  // Cada pista es una lista de voces y cada paso es una corchea:
  //   "C5" nota · "C5:2" nota de 2 pasos · "A3+C4+E4" acorde · "." silencio · "x" golpe (batería)
  //   "|" solo separa compases para leerlo mejor.
  const TRACKS = {
    // Pantalla de título: vals alegre de cuento, "érase una vez..." (3/4, 6 pasos por compás)
    storytime: {
      bpm: 132,
      voices: [
        { type: "triangle", vol: 0.03, gate: 0.75, seq:
          "G4 C5 E5 G5:3 . . | A5 G5 E5 C5:3 . . | F4 A4 C5 F5:3 . . | A5 G5 F5 E5:3 . . | " +
          "D5 G5 B5 D6:3 . . | C6 B5 A5 G5:3 . . | E5 G5 C6 E6:2 . D6 | D6 C6 B5 G5:3 . . | " +
          "A4 C5 E5 A5:3 . . | G5 E5 C5 A4:3 . . | F5 A5 C6 A5:3 . . | G5 E5 C5 G4:3 . . | " +
          "A4 C5 F5 A5:2 . G5 | B4 D5 G5 B5:2 . A5 | G5 C6 E6 D6 C6 B5 | D6:2 . B5 . G5 ." },
        { type: "sine", vol: 0.012, gate: 0.5, seq:
          ". . . G6 . . | . . . C6 . . | . . . F6 . . | . . . E6 . . | " +
          ". . . D7 . . | . . . G6 . . | . . . E7 . . | . . . G6 . . | " +
          ". . . A6 . . | . . . A5 . . | . . . A6 . . | . . . G5 . . | " +
          ". . . A6 . . | . . . B6 . . | . . . . . . | . . . . . ." },
        { type: "triangle", vol: 0.014, gate: 0.45, seq:
          ". . C4+E4+G4 . C4+E4+G4 . | . . C4+E4+G4 . C4+E4+G4 . | . . C4+F4+A4 . C4+F4+A4 . | . . C4+F4+A4 . C4+F4+A4 . | " +
          ". . B3+D4+G4 . B3+D4+G4 . | . . B3+D4+G4 . B3+D4+G4 . | . . C4+E4+G4 . C4+E4+G4 . | . . B3+D4+F4 . B3+D4+F4 . | " +
          ". . C4+E4+A4 . C4+E4+A4 . | . . C4+E4+A4 . C4+E4+A4 . | . . C4+F4+A4 . C4+F4+A4 . | . . C4+E4+G4 . C4+E4+G4 . | " +
          ". . C4+F4+A4 . C4+F4+A4 . | . . B3+D4+G4 . B3+D4+G4 . | . . C4+E4+G4 . C4+E4+G4 . | . . B3+D4+F4 . B3+D4+F4 ." },
        { type: "triangle", vol: 0.045, gate: 0.6, seq:
          "C3:2 . . . G2 . | C3:2 . . . . . | F2:2 . . . C3 . | F2:2 . . . . . | " +
          "G2:2 . . . D3 . | G2:2 . . . . . | C3:2 . . . G2 . | G2:2 . . . . . | " +
          "A2:2 . . . E3 . | A2:2 . . . . . | F2:2 . . . . . | C3:2 . . . . . | " +
          "F2:2 . . . . . | G2:2 . . . . . | C3:2 . . . E3 . | G2:2 . . . B2 ." },
        { type: "kick", vol: 0.05, seq: "x . . . . ." },
        { type: "hat", vol: 0.012, seq: ". . x . x ." },
      ],
    },
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
    // Noche lluviosa: lenta, suave y nostálgica
    rain: {
      bpm: 66,
      voices: [
        { type: "sine", vol: 0.012, gate: 1, attack: 0.6, seq:
          "A3+C4+E4:8 . . . . . . . | F3+A3+C4:8 . . . . . . . | D3+F3+A3:8 . . . . . . . | E3+G#3+B3:8 . . . . . . ." },
        { type: "triangle", vol: 0.02, gate: 0.95, attack: 0.05, seq:
          "E5:3 . . D5 C5:4 . . . | A4:8 . . . . . . . | F4:3 . . A4 D5:4 . . . | B4:4 . . . G#4:4 . . ." },
        { type: "triangle", vol: 0.03, gate: 0.9, seq:
          "A2:8 . . . . . . . | F2:8 . . . . . . . | D2:8 . . . . . . . | E2:8 . . . . . . ." },
      ],
    },
    // Esperanza: cálida y luminosa, cuando sale la luna
    hope: {
      bpm: 84,
      voices: [
        { type: "sine", vol: 0.011, gate: 1, attack: 0.5, seq:
          "C4+E4+G4:8 . . . . . . . | G3+B3+D4:8 . . . . . . . | A3+C4+E4:8 . . . . . . . | F3+A3+C4:8 . . . . . . ." },
        { type: "sine", vol: 0.016, gate: 0.7, seq:
          "C5 E5 G5 E5 C5 E5 G5 E5 | B4 D5 G5 D5 B4 D5 G5 D5 | A4 C5 E5 C5 A4 C5 E5 C5 | A4 C5 F5 C5 A4 C5 F5 C5" },
        { type: "triangle", vol: 0.024, gate: 0.9, seq:
          "G5:3 . . E5 C6:4 . . . | B5:3 . . G5 D5:4 . . . | C5:3 . . E5 A5:4 . . . | A5:2 . G5 . F5 . E5 ." },
        { type: "triangle", vol: 0.035, gate: 0.8, seq:
          "C3:4 . . . G2:4 . . . | G2:4 . . . D3:4 . . . | A2:4 . . . E2:4 . . . | F2:4 . . . C3:4 . . ." },
      ],
    },
    // Fiesta sorpresa: alegre, brillante y para brincar
    celebration: {
      bpm: 140,
      voices: [
        { type: "square", vol: 0.016, gate: 0.6, seq:
          "C5 . E5 G5 . E5 C6 . | A5 . G5 . E5 . C5 . | D5 . F5 A5 . F5 D6 . | C6 . B5 . G5 . . . | " +
          "E5 . G5 C6 . G5 E6 . | D6 . C6 . A5 . F5 . | G5 . A5 B5 . D6 C6 . | C6:2 . G5 C6:4 . . . ." },
        { type: "triangle", vol: 0.012, gate: 0.4, seq:
          ". C4+E4+G4 . C4+E4+G4 . C4+E4+G4 . C4+E4+G4 | . A3+C4+E4 . A3+C4+E4 . A3+C4+E4 . A3+C4+E4 | " +
          ". D4+F4+A4 . D4+F4+A4 . D4+F4+A4 . D4+F4+A4 | . B3+D4+G4 . B3+D4+G4 . B3+D4+G4 . B3+D4+G4 | " +
          ". C4+E4+G4 . C4+E4+G4 . C4+E4+G4 . C4+E4+G4 | . A3+C4+F4 . A3+C4+F4 . A3+C4+F4 . A3+C4+F4 | " +
          ". B3+D4+G4 . B3+D4+G4 . B3+D4+G4 . B3+D4+G4 | . C4+E4+G4 . C4+E4+G4 . C4+E4+G4 . C4+E4+G4" },
        { type: "triangle", vol: 0.045, gate: 0.6, seq:
          "C3 . C3 G2 C3 . G2 . | A2 . A2 E3 A2 . E3 . | D3 . D3 A2 D3 . A2 . | G2 . G2 D3 G2 . B2 . | " +
          "C3 . C3 G2 C3 . G2 . | F2 . F2 C3 F2 . C3 . | G2 . G2 D3 G2 . D3 . | C3 . G2 . C3 . . ." },
        { type: "kick", vol: 0.08, seq: "x . . . x . . ." },
        { type: "hat", vol: 0.02, seq: ". x . x . x . x" },
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

  // Lluvia: ruido filtrado en bucle que entra y sale con fundido
  let rainSound = null;
  let rainWanted = false;
  function rain(on) {
    rainWanted = on;
    if (!ctx) return;
    const t = ctx.currentTime;
    if (on && !rainSound) {
      const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      const lp = ctx.createBiquadFilter();
      const g = ctx.createGain();
      src.buffer = buf;
      src.loop = true;
      lp.type = "lowpass";
      lp.frequency.value = 1400;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.05, t + 1.5);
      src.connect(lp).connect(g).connect(ctx.destination);
      src.start(t);
      rainSound = { src, g };
    } else if (!on && rainSound) {
      const { src, g } = rainSound;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.linearRampToValueAtTime(0, t + 2.5);
      src.stop(t + 2.6);
      rainSound = null;
    }
  }

  // Destello de estrellita: dos notas agudas y suaves
  const twinkle = (k = 0) => {
    const base = [1047, 1175, 1319, 1568, 1760][k % 5];
    tone(base, 0.25, "sine", 0.04);
    tone(base * 1.5, 0.35, "sine", 0.025, 0.07);
  };
  // Estrella fugaz: barrido que cae
  const shootingStar = () => sweep(2400, 500, 1, "sine", 0.04);

  // Ruido blanco largo para el vitoreo
  function noiseBuffer(sec) {
    const buf = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  // Trueno lejano: ruido grave que retumba y se apaga despacio
  function thunder() {
    if (!ctx) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    const lp = ctx.createBiquadFilter();
    const g = ctx.createGain();
    src.buffer = noiseBuffer(3);
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(380, t);
    lp.frequency.exponentialRampToValueAtTime(90, t + 2.6);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.09, t + 0.12);
    g.gain.linearRampToValueAtTime(0.05, t + 0.5);
    g.gain.linearRampToValueAtTime(0.07, t + 0.8);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);
    src.connect(lp).connect(g).connect(ctx.destination);
    src.start(t);
    src.stop(t + 3);
  }

  // Murmullo detrás de la puerta: sílabas graves y apagadas, como voces bajitas
  function murmur() {
    if (!ctx) return;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 700;
    lp.connect(ctx.destination);
    const n = 3 + Math.floor(Math.random() * 3);
    let s = ctx.currentTime;
    for (let i = 0; i < n; i++) {
      s += 0.08 + Math.random() * 0.05;
      const f = 170 + Math.random() * 160;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(f, s);
      osc.frequency.linearRampToValueAtTime(f * (0.85 + Math.random() * 0.3), s + 0.1);
      g.gain.setValueAtTime(0.0001, s);
      g.gain.linearRampToValueAtTime(0.018, s + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, s + 0.11);
      osc.connect(g).connect(lp);
      osc.start(s);
      osc.stop(s + 0.12);
    }
  }

  // Revelación mágica al abrir la puerta: arpegio que sube y brilla
  function reveal() {
    [523, 659, 784, 1047, 1319, 1568, 2093].forEach((f, i) => {
      tone(f, 0.5, "sine", 0.045, i * 0.07);
      tone(f * 2, 0.3, "triangle", 0.012, i * 0.07 + 0.03);
    });
  }

  // Cañón de confeti: chasquido de ruido y un "pop" agudo
  function pop() {
    if (!ctx) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    const bp = ctx.createBiquadFilter();
    const g = ctx.createGain();
    src.buffer = noiseBuffer(0.2);
    bp.type = "bandpass";
    bp.frequency.value = 2500;
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    src.connect(bp).connect(g).connect(ctx.destination);
    src.start(t);
    sweep(900, 1800, 0.08, "square", 0.03);
  }

  // Vitoreo de la gente: ruido que sube y baja con muchos "¡yei!" agudos
  function cheer() {
    if (!ctx) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    const bp = ctx.createBiquadFilter();
    const g = ctx.createGain();
    src.buffer = noiseBuffer(2.5);
    bp.type = "bandpass";
    bp.frequency.value = 1400;
    bp.Q.value = 0.7;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.06, t + 0.25);
    g.gain.linearRampToValueAtTime(0.035, t + 1.2);
    g.gain.linearRampToValueAtTime(0.0001, t + 2.4);
    src.connect(bp).connect(g).connect(ctx.destination);
    src.start(t);
    for (let i = 0; i < 12; i++) {
      const f = 700 + Math.random() * 600;
      const s = ctx.currentTime + Math.random() * 1.4;
      const osc = ctx.createOscillator();
      const og = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(f, s);
      osc.frequency.exponentialRampToValueAtTime(f * 1.5, s + 0.18);
      og.gain.setValueAtTime(0.0001, s);
      og.gain.linearRampToValueAtTime(0.015, s + 0.03);
      og.gain.exponentialRampToValueAtTime(0.0001, s + 0.22);
      osc.connect(og).connect(ctx.destination);
      osc.start(s);
      osc.stop(s + 0.25);
    }
  }

  // Fanfarria final (devuelve su duración en segundos)
  function fanfare() {
    const N = { G4: 392, C5: 523, E5: 659, G5: 784, A5: 880, C6: 1047 };
    const notes = [["G4", 0, 0.12], ["C5", 0.12, 0.12], ["E5", 0.24, 0.12], ["G5", 0.36, 0.3],
      ["E5", 0.7, 0.12], ["G5", 0.82, 0.12], ["A5", 0.94, 0.12], ["C6", 1.06, 0.9]];
    for (const [n, at, d] of notes) {
      tone(N[n], d, "square", 0.05, at);
      tone(N[n] / 2, d, "triangle", 0.05, at);
    }
    [523, 659, 784].forEach((f) => tone(f, 0.9, "triangle", 0.03, 1.06));
    return 2;
  }

  return { init, jump, blip, select, step, sigh, curtain, thump, door, key, playMusic, stopMusic,
    rain, twinkle, shootingStar, reveal, pop, cheer, fanfare, murmur, thunder };
})();
