const canvas = document.getElementById('visualCanvas');
const ctx = canvas.getContext('2d');
const seg = document.querySelector('.segmented');
const segItems = document.querySelectorAll('.seg-item');
const playBtn = document.getElementById('playVisual');
const startMicBtn = document.getElementById('startMic');
const emotionTag = document.getElementById('emotionTag');
let mode = 'bass';
let shapes = [];
let t = 0;
let pointer = { x: 0, y: 0, active: false };
let audioCtx = null;
let analyser = null;
let micStream = null;
let freqBuf = null;
let timeBuf = null;
let audioActive = false;
let lastFlux = null;
let fluxAvg = 0;
let featureTick = 0;
let lastEmotion = 'bass';
let intensity = 0.5;
function resize() {
  const ratio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const w = canvas.clientWidth;
  const h = Math.max(380, canvas.clientHeight);
  canvas.width = Math.floor(w * ratio);
  canvas.height = Math.floor(h * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}
window.addEventListener('resize', resize);
canvas.addEventListener('pointermove', e => {
  const r = canvas.getBoundingClientRect();
  pointer.x = e.clientX - r.left;
  pointer.y = e.clientY - r.top;
  pointer.active = true;
});
canvas.addEventListener('pointerleave', () => { pointer.active = false; });
const palettes = {
  bass: ['#55c1ff','#35d0c3','#9fd3ff','#bfe9ff'],
  treble: ['#39a9ff','#22e0c3','#cfe7ff','#e6f2ff'],
  joyful: ['#4fd1ff','#3de6c8','#b6f5ff','#ffffff'],
  melancholic: ['#89b4ff','#6fd9ce','#cfe9f9','#eaf2ff']
};
function rnd(a, b) { return a + Math.random() * (b - a); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function createShapes(m) {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const arr = [];
  if (m === 'bass') {
    for (let i = 0; i < 26; i++) {
      arr.push({
        type: 'circle',
        x: rnd(40, w - 40),
        y: rnd(40, h - 40),
        vx: rnd(-0.4, 0.4),
        vy: rnd(-0.3, 0.3),
        size: rnd(18, 42),
        phase: rnd(0, Math.PI * 2),
        color: pick(palettes.bass),
        glow: rnd(6, 18)
      });
    }
    for (let i = 0; i < 4; i++) {
      arr.push({
        type: 'ring',
        x: w * rnd(0.15, 0.85),
        y: h * rnd(0.2, 0.8),
        size: rnd(80, 160),
        phase: rnd(0, Math.PI * 2),
        color: pick(palettes.bass),
        width: rnd(1, 2)
      });
    }
  } else if (m === 'treble') {
    for (let i = 0; i < 20; i++) {
      arr.push({
        type: 'star',
        x: rnd(40, w - 40),
        y: rnd(40, h - 40),
        vx: rnd(-0.6, 0.6),
        vy: rnd(-0.6, 0.6),
        size: rnd(16, 34),
        phase: rnd(0, Math.PI * 2),
        color: pick(palettes.treble),
        points: Math.floor(rnd(5, 8)),
        glow: rnd(8, 16)
      });
    }
    for (let i = 0; i < 8; i++) {
      arr.push({
        type: 'triangle',
        x: rnd(20, w - 20),
        y: rnd(20, h - 20),
        vx: rnd(-0.8, 0.8),
        vy: rnd(-0.8, 0.8),
        size: rnd(14, 26),
        phase: rnd(0, Math.PI * 2),
        color: pick(palettes.treble),
        glow: rnd(6, 14)
      });
    }
  } else if (m === 'joyful') {
    for (let i = 0; i < 36; i++) {
      const ty = Math.random() < 0.6 ? 'circle' : 'triangle';
      arr.push({
        type: ty,
        x: rnd(30, w - 30),
        y: rnd(30, h - 30),
        vx: rnd(-1.1, 1.1),
        vy: rnd(-1.1, 1.1),
        size: rnd(10, 22),
        phase: rnd(0, Math.PI * 2),
        color: pick(palettes.joyful),
        glow: rnd(6, 18)
      });
    }
  } else if (m === 'melancholic') {
    for (let i = 0; i < 3; i++) {
      arr.push({
        type: 'wave',
        y: h * rnd(0.25, 0.75),
        amplitude: rnd(18, 30),
        freq: rnd(0.008, 0.012),
        speed: rnd(0.6, 0.9),
        color: pick(palettes.melancholic),
        width: rnd(1.25, 2.25),
        phase: rnd(0, Math.PI * 2)
      });
    }
    for (let i = 0; i < 22; i++) {
      arr.push({
        type: 'circle',
        x: rnd(40, w - 40),
        y: rnd(40, h - 40),
        vx: rnd(-0.35, 0.35),
        vy: rnd(-0.35, 0.35),
        size: rnd(8, 20),
        phase: rnd(0, Math.PI * 2),
        color: pick(palettes.melancholic),
        glow: rnd(5, 12)
      });
    }
  }
  return arr;
}
function drawCircle(s) {
  const d = pointer.active ? Math.hypot(pointer.x - s.x, pointer.y - s.y) : 400;
  const wobble = Math.sin(t * 1.8 + s.phase + d * 0.02) * Math.max(0, 12 - Math.min(12, d * 0.03));
  const r = s.size + wobble + Math.sin(t * 1.2 + s.phase) * s.size * 0.18;
  ctx.save();
  ctx.shadowColor = s.color;
  ctx.shadowBlur = s.glow;
  ctx.fillStyle = s.color;
  ctx.beginPath();
  ctx.arc(s.x, s.y, Math.max(2, r), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
function drawRing(s) {
  const pulse = Math.sin(t * 1.4 + s.phase) * 6;
  const r = s.size + pulse;
  ctx.save();
  ctx.strokeStyle = s.color;
  ctx.lineWidth = s.width;
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.arc(s.x, s.y, Math.max(10, r), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
function drawStar(s) {
  const rot = t * 0.8 + s.phase;
  const d = pointer.active ? Math.hypot(pointer.x - s.x, pointer.y - s.y) : 400;
  const wobble = Math.sin(t * 2.2 + d * 0.03) * Math.max(0, 8 - Math.min(8, d * 0.05));
  const outer = s.size + wobble;
  const inner = outer * 0.45;
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(rot);
  ctx.shadowColor = s.color;
  ctx.shadowBlur = s.glow;
  ctx.fillStyle = s.color;
  ctx.beginPath();
  for (let i = 0; i < s.points * 2; i++) {
    const ang = (i * Math.PI) / s.points;
    const r = i % 2 === 0 ? outer : inner;
    ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
function drawTriangle(s) {
  const rot = t * 1.1 + s.phase;
  const d = pointer.active ? Math.hypot(pointer.x - s.x, pointer.y - s.y) : 400;
  const wobble = Math.cos(t * 1.9 + d * 0.02) * Math.max(0, 6 - Math.min(6, d * 0.05));
  const r = s.size + wobble;
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(rot);
  ctx.shadowColor = s.color;
  ctx.shadowBlur = s.glow;
  ctx.fillStyle = s.color;
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(r * 0.9, r);
  ctx.lineTo(-r * 0.9, r);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
function drawWave(s) {
  const w = canvas.width / (window.devicePixelRatio || 1);
  const h = canvas.height / (window.devicePixelRatio || 1);
  const near = pointer.active ? Math.max(0, 1 - Math.abs(pointer.y - s.y) / 160) : 0;
  const amp = s.amplitude + near * 18;
  ctx.save();
  ctx.lineWidth = s.width;
  ctx.strokeStyle = s.color;
  ctx.shadowColor = s.color;
  ctx.shadowBlur = 12;
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 6) {
    const y = s.y + Math.sin(x * s.freq + t * s.speed + s.phase) * amp;
    if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
}
function step() {
  t += 0.016;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = 'lighter';
  if (audioActive && analyser) {
    analyser.getFloatFrequencyData(freqBuf);
    analyser.getFloatTimeDomainData(timeBuf);
    const f = extractFeatures(freqBuf, timeBuf, audioCtx.sampleRate);
    fluxAvg = fluxAvg * 0.92 + f.flux * 0.08;
    intensity = Math.min(1, Math.max(0, f.energy * 2 + fluxAvg * 0.4));
    featureTick++;
    if (featureTick % 30 === 0) {
      const emo = classifyEmotion(f);
      if (emo !== lastEmotion) {
        lastEmotion = emo;
        emotionTag.textContent = labelMap[emo];
        setMode(emo);
      } else {
        emotionTag.textContent = labelMap[emo];
      }
      tuneShapes(intensity);
    } else {
      tuneShapes(intensity);
    }
  }
  for (const s of shapes) {
    if (s.type === 'circle') {
      s.x += s.vx;
      s.y += s.vy;
      if (s.x < 10 || s.x > canvas.clientWidth - 10) s.vx *= -1;
      if (s.y < 10 || s.y > canvas.clientHeight - 10) s.vy *= -1;
      drawCircle(s);
    } else if (s.type === 'ring') {
      drawRing(s);
    } else if (s.type === 'star') {
      s.x += s.vx;
      s.y += s.vy;
      if (s.x < 10 || s.x > canvas.clientWidth - 10) s.vx *= -1;
      if (s.y < 10 || s.y > canvas.clientHeight - 10) s.vy *= -1;
      drawStar(s);
    } else if (s.type === 'triangle') {
      s.x += s.vx;
      s.y += s.vy;
      if (s.x < 10 || s.x > canvas.clientWidth - 10) s.vx *= -1;
      if (s.y < 10 || s.y > canvas.clientHeight - 10) s.vy *= -1;
      drawTriangle(s);
    } else if (s.type === 'wave') {
      drawWave(s);
    }
  }
  requestAnimationFrame(step);
}
function setMode(m) {
  mode = m;
  shapes = createShapes(m);
}
function randomVisual() {
  const modes = ['bass','treble','joyful','melancholic'];
  const pickMode = modes[Math.floor(Math.random() * modes.length)];
  setMode(pickMode);
  setActiveSegment(pickMode);
}
const labelMap = {
  bass: '低沉',
  treble: '高亢',
  joyful: '欢快',
  melancholic: '忧郁'
};
function linMag(db) {
  return Math.pow(10, db / 20);
}
function extractFeatures(freq, time, sr) {
  let sumSq = 0;
  for (let i = 0; i < time.length; i++) {
    const v = time[i] / 1.0;
    sumSq += v * v;
  }
  const energy = Math.sqrt(sumSq / time.length);
  const n = freq.length;
  const ny = sr / 2;
  let magSum = 0;
  let centroidNum = 0;
  let lowSum = 0;
  let highSum = 0;
  for (let i = 0; i < n; i++) {
    const m = linMag(freq[i]);
    const hz = (i / n) * ny;
    magSum += m;
    centroidNum += hz * m;
    if (hz < 300) lowSum += m; else highSum += m;
  }
  const centroid = magSum > 0 ? centroidNum / magSum : 0;
  let zc = 0;
  let prev = time[0];
  for (let i = 1; i < time.length; i++) {
    const cur = time[i];
    if ((prev >= 0 && cur < 0) || (prev < 0 && cur >= 0)) zc++;
    prev = cur;
  }
  const zcr = zc / time.length;
  let flux = 0;
  if (!lastFlux) {
    lastFlux = new Float32Array(n);
    for (let i = 0; i < n; i++) lastFlux[i] = linMag(freq[i]);
  } else {
    for (let i = 0; i < n; i++) {
      const m = linMag(freq[i]);
      const d = m - lastFlux[i];
      if (d > 0) flux += d;
      lastFlux[i] = m;
    }
  }
  const lowRatio = magSum > 0 ? lowSum / magSum : 0;
  const highRatio = magSum > 0 ? highSum / magSum : 0;
  return { energy, centroid, zcr, flux, lowRatio, highRatio };
}
function classifyEmotion(f) {
  const cNorm = Math.min(1, f.centroid / 4000);
  const e = f.energy;
  const r = f.flux;
  if (e > 0.08 && cNorm > 0.35 && r > 0.6) return 'joyful';
  if (f.lowRatio > 0.55 && e > 0.06) return 'bass';
  if (cNorm > 0.5 && f.highRatio > 0.5) return 'treble';
  if (e < 0.05 && r < 0.3) return 'melancholic';
  return mode;
}
function tuneShapes(inten) {
  for (const s of shapes) {
    if (s.type === 'circle' || s.type === 'triangle' || s.type === 'star') {
      s.vx = Math.max(-1.2, Math.min(1.2, s.vx * 0.9 + (Math.random() - 0.5) * 0.06 * (0.5 + inten)));
      s.vy = Math.max(-1.2, Math.min(1.2, s.vy * 0.9 + (Math.random() - 0.5) * 0.06 * (0.5 + inten)));
      s.glow = (s.glow || 8) * 0.92 + 18 * inten * 0.08;
      s.size = s.size * 0.98 + s.size * 0.02 * (0.8 + inten * 0.6);
    } else if (s.type === 'wave') {
      s.amplitude = s.amplitude * 0.95 + 30 * inten * 0.05;
      s.speed = s.speed * 0.95 + 1.2 * inten * 0.05;
    } else if (s.type === 'ring') {
      s.width = s.width * 0.95 + 2.2 * inten * 0.05;
    }
  }
}
async function startMic() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (!micStream) {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false
      });
      micStream = stream;
      const source = audioCtx.createMediaStreamSource(stream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.85;
      source.connect(analyser);
      freqBuf = new Float32Array(analyser.frequencyBinCount);
      timeBuf = new Float32Array(analyser.fftSize);
    }
    await audioCtx.resume();
    audioActive = true;
    emotionTag.textContent = '分析中…';
    startMicBtn.textContent = '停止麦克风分析';
  } catch (err) {
    audioActive = false;
    emotionTag.textContent = '权限或设备不可用';
    startMicBtn.textContent = '开始麦克风分析';
    console.error(err);
  }
}
function stopMic() {
  audioActive = false;
  if (micStream) {
    micStream.getTracks().forEach(t => t.stop && t.stop());
    micStream = null;
  }
  if (audioCtx && audioCtx.state !== 'closed') audioCtx.suspend();
  emotionTag.textContent = '静音';
  startMicBtn.textContent = '开始麦克风分析';
}
startMicBtn.addEventListener('click', () => {
  if (!audioActive) startMic(); else stopMic();
});
function setActiveSegment(m) {
  segItems.forEach(btn => {
    const active = btn.dataset.mode === m;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-checked', active ? 'true' : 'false');
  });
}
segItems.forEach(btn => {
  btn.addEventListener('click', () => {
    const m = btn.dataset.mode;
    setMode(m);
    setActiveSegment(m);
  });
});
seg.addEventListener('keydown', e => {
  const idx = Array.from(segItems).findIndex(b => b.classList.contains('active'));
  if (e.key === 'ArrowRight') {
    const ni = (idx + 1) % segItems.length;
    segItems[ni].focus();
    segItems[ni].click();
    e.preventDefault();
  } else if (e.key === 'ArrowLeft') {
    const ni = (idx - 1 + segItems.length) % segItems.length;
    segItems[ni].focus();
    segItems[ni].click();
    e.preventDefault();
  }
});
playBtn.addEventListener('click', randomVisual);
resize();
setMode(mode);
setActiveSegment(mode);
step();

