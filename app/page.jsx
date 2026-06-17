'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();
  const [screen, setScreen] = useState('press');
  const [noCount, setNoCount] = useState(0);
  const [noMsg, setNoMsg] = useState('');
  const [showNoTooltip, setShowNoTooltip] = useState(false);
  const [hudScore, setHudScore] = useState(0);
  const canvasRef = useRef(null);
  const tearCanvasRef = useRef(null);
  const acRef = useRef(null);
  const dprRef = useRef(1);

  const noMsgs = [
    "Nice try. You're still here. 😏",
    "Seriously though... why? 🤨",
    "The YES button works better 👆",
    "We both know the truth 😂",
    "...just click YES already 🙏",
  ];

  function getAC() {
    if (!acRef.current) acRef.current = new (window.AudioContext || window.webkitAudioContext)();
    return acRef.current;
  }

  function tone(f, type, t0, dur, vol = 0.25, fEnd = null) {
    const a = getAC(), o = a.createOscillator(), g = a.createGain();
    o.connect(g); g.connect(a.destination);
    o.type = type; o.frequency.setValueAtTime(f, a.currentTime + t0);
    if (fEnd) o.frequency.exponentialRampToValueAtTime(fEnd, a.currentTime + t0 + dur);
    g.gain.setValueAtTime(vol, a.currentTime + t0);
    g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + t0 + dur);
    o.start(a.currentTime + t0); o.stop(a.currentTime + t0 + dur + 0.05);
  }

  function noise(t0, dur, vol = 0.12, freq = 600) {
    const a = getAC(), buf = a.createBuffer(1, a.sampleRate * dur, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1);
    const src = a.createBufferSource(), g = a.createGain(), filt = a.createBiquadFilter();
    filt.type = 'bandpass'; filt.frequency.value = freq;
    src.buffer = buf; src.connect(filt); filt.connect(g); g.connect(a.destination);
    g.gain.setValueAtTime(vol, a.currentTime + t0);
    g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + t0 + dur);
    src.start(a.currentTime + t0); src.stop(a.currentTime + t0 + dur + 0.05);
  }

  const sndYes = () => { [523, 659, 784, 1047].forEach((f, i) => { tone(f, 'square', i * 0.08, 0.12, 0.2); tone(f * 2, 'sine', i * 0.08, 0.1, 0.06); }); };
  const sndNo = () => { tone(220, 'square', 0, 0.3, 0.2, 110); noise(0, 0.3, 0.15, 200); };
  const sndHover = () => { tone(880, 'square', 0, 0.06, 0.08); tone(1320, 'sine', 0, 0.05, 0.04); };
  const sndClick = () => { [523, 659, 784].forEach((f, i) => tone(f, 'square', i * 0.07, 0.1, 0.18)); };
  const sndWhoosh = () => { tone(900, 'sawtooth', 0, 0.4, 0.18, 60); noise(0, 0.35, 0.1, 500); };
  const sndImpact = () => { tone(100, 'square', 0, 0.18, 0.3, 50); noise(0, 0.18, 0.22, 300); };
  const sndSmoke = () => { tone(70, 'sine', 0, 0.45, 0.28, 35); noise(0, 0.45, 0.14, 400); };
  const sndPop = (n) => { const f = [523, 659, 784][n]; tone(f, 'square', 0, 0.14, 0.18); tone(f * 2, 'sine', 0, 0.1, 0.07); };
  const sndIdea = () => { [523, 659, 784, 1047].forEach((f, i) => { tone(f, 'square', i * 0.09, 0.14, 0.22); tone(f * 2, 'sine', i * 0.09, 0.1, 0.07); }); };
  const sndRun = (b) => { tone(b % 2 === 0 ? 220 : 165, 'square', 0, 0.07, 0.09); };
  const sndPortal = () => { [180, 280, 480, 760, 1100].forEach((f, i) => tone(f, 'sawtooth', i * 0.1, 0.22, 0.16)); noise(0, 0.55, 0.18, 800); };
  const sndReveal = () => {
    [523, 659, 784, 1047, 1319, 1047, 784, 659, 523].forEach((f, i) => tone(f, 'square', i * 0.18, 0.22, 0.2));
    [262, 330, 392, 523, 659, 523, 392, 330, 262].forEach((f, i) => tone(f, 'triangle', i * 0.18, 0.25, 0.12));
    [261, 329, 392].forEach(f => tone(f, 'sine', 0, 3.5, 0.08));
    tone(1047, 'square', 1.6, 0.4, 0.15); tone(2093, 'sine', 1.6, 0.5, 0.06);
  };

  function handleNo() {
    sndNo();
    const newCount = noCount + 1;
    setNoCount(newCount);
    setNoMsg(noMsgs[Math.min(newCount - 1, noMsgs.length - 1)]);
    const btn = document.getElementById('btn-no');
    if (btn) { btn.style.animation = 'none'; void btn.offsetWidth; btn.style.animation = 'shake 0.4s ease'; }
  }

  function handleYes() {
    sndYes();
    setTimeout(() => setScreen('intro'), 300);
  }

  function skipToPage() {
    setScreen('page');
  }

  useEffect(() => {
    if (screen !== 'intro') return;
    const canvas = canvasRef.current;
    const tearCanvas = tearCanvasRef.current;
    if (!canvas || !tearCanvas) return;

    const dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr;
    const W = canvas.offsetWidth, H = canvas.offsetHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    tearCanvas.width = W * dpr; tearCanvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    tearCanvas.style.width = W + 'px'; tearCanvas.style.height = H + 'px';
    const ctx = canvas.getContext('2d');
    const tctx = tearCanvas.getContext('2d');
    ctx.scale(dpr, dpr);
    tctx.scale(dpr, dpr);

    let running = true;
    const lerp = (a, b, t) => a + (b - a) * t;
    const easeOut = t => 1 - Math.pow(1 - t, 3);
    const easeIn = t => t * t * t;
    const easeInOut = t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    const wait = ms => new Promise(r => setTimeout(r, ms));

    // KEY FIX: bg() resets and reapplies DPR scale before every draw
    const bg = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, W, H);
    };

    function roundRect(c, x, y, w, h, r) {
      c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.arcTo(x + w, y, x + w, y + r, r);
      c.lineTo(x + w, y + h - r); c.arcTo(x + w, y + h, x + w - r, y + h, r);
      c.lineTo(x + r, y + h); c.arcTo(x, y + h, x, y + h - r, r);
      c.lineTo(x, y + r); c.arcTo(x, y, x + r, y, r); c.closePath();
    }

    function drawBubble(cx, cy, visibleLines) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      const bw = Math.min(W * 0.45, 360), bh = 190, br = 30;
      const bx = cx - bw / 2, by = cy - bh - 100;
      ctx.save();
      // shadow
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      roundRect(ctx, bx + 5, by + 5, bw, bh, br); ctx.fill();
      // bubble body
      ctx.fillStyle = 'white';
      roundRect(ctx, bx, by, bw, bh, br); ctx.fill();
      ctx.strokeStyle = '#1a1a2e'; ctx.lineWidth = 3.5;
      roundRect(ctx, bx, by, bw, bh, br); ctx.stroke();
      // tail circles
      [[16, 20], [11, 36], [7, 50]].forEach(([r, dy]) => {
        ctx.beginPath(); ctx.arc(cx - 55, by + bh + dy, r, 0, Math.PI * 2);
        ctx.fillStyle = 'white'; ctx.fill();
        ctx.strokeStyle = '#1a1a2e'; ctx.lineWidth = 2.5; ctx.stroke();
      });
      // text lines
      const lines = [
        { t: 'Got an APM interview?', c: '#1a1a2e', y: Math.round(by + bh * 0.26) },
        { t: 'No one to practice with?', c: '#e52b2b', y: Math.round(by + bh * 0.52) },
        { t: 'I got you. 🥷', c: '#27ae60', y: Math.round(by + bh * 0.78) },
      ];
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      lines.forEach((l, i) => {
        if (i >= visibleLines) return;
        ctx.font = '27px Bangers, cursive';
        ctx.fillStyle = l.c;
        ctx.fillText(l.t, cx, l.y);
      });
      ctx.restore();
    }

    function drawShuriken(x, y, r, angle) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
      for (let i = 0; i < 8; i++) {
        ctx.save(); ctx.rotate((Math.PI * 2 / 8) * i);
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.bezierCurveTo(r * 0.25, -r * 0.25, r * 0.5, -r * 0.85, 0, -r);
        ctx.bezierCurveTo(-r * 0.25, -r * 0.75, -r * 0.25, -r * 0.25, 0, 0);
        const g = ctx.createLinearGradient(0, 0, 0, -r);
        g.addColorStop(0, '#b8960a'); g.addColorStop(0.4, '#ffd700'); g.addColorStop(1, '#fff8a0');
        ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = 'rgba(80,60,0,0.3)'; ctx.lineWidth = 0.5; ctx.stroke();
        ctx.restore();
      }
      ctx.beginPath(); ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2); ctx.fillStyle = '#1a1a2e'; ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, r * 0.12, 0, Math.PI * 2); ctx.fillStyle = '#ffd700'; ctx.fill();
      ctx.restore();
    }

    function drawSmoke(x, y, r, alpha) {
      ctx.save(); ctx.globalAlpha = alpha;
      [{ ox: 0, oy: 0, s: 1 }, { ox: -r * 0.45, oy: -r * 0.3, s: 0.75 },
      { ox: r * 0.45, oy: -r * 0.28, s: 0.7 }, { ox: -r * 0.28, oy: -r * 0.68, s: 0.55 },
      { ox: r * 0.28, oy: -r * 0.65, s: 0.5 }, { ox: 0, oy: -r * 0.92, s: 0.38 }
      ].forEach(p => {
        const g = ctx.createRadialGradient(x + p.ox, y + p.oy, 0, x + p.ox, y + p.oy, r * p.s);
        g.addColorStop(0, 'rgba(200,210,220,0.95)');
        g.addColorStop(0.5, 'rgba(170,185,200,0.6)');
        g.addColorStop(1, 'transparent');
        ctx.beginPath(); ctx.arc(x + p.ox, y + p.oy, r * p.s, 0, Math.PI * 2);
        ctx.fillStyle = g; ctx.fill();
      });
      ctx.restore();
    }

    function drawSlash(progress) {
      const x1 = W * 0.12, y1 = H * 0.08, x2 = W * 0.88, y2 = H * 0.92;
      const ex = lerp(x1, x2, progress), ey = lerp(y1, y2, progress);
      ctx.save();
      ctx.strokeStyle = 'rgba(255,215,0,0.2)'; ctx.lineWidth = 28; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,215,0,0.55)'; ctx.lineWidth = 10;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.restore();
    }

    function drawFullScreenTear(progress) {
      tctx.setTransform(1, 0, 0, 1, 0, 0);
      tctx.scale(dpr, dpr);
      tctx.clearRect(0, 0, W, H);
      if (progress <= 0 || progress >= 1) return;
      const gap = lerp(0, W * 1.5, easeOut(progress));
      const x1 = W * 0.12, y1 = H * 0.08, x2 = W * 0.88, y2 = H * 0.92;
      tctx.save(); tctx.translate(-gap * 0.5, -gap * 0.42);
      tctx.beginPath(); tctx.moveTo(0, 0); tctx.lineTo(W, 0); tctx.lineTo(x2, y2); tctx.lineTo(x1, y1); tctx.closePath();
      tctx.fillStyle = '#ffffff'; tctx.fill();
      tctx.strokeStyle = 'rgba(255,215,0,0.9)'; tctx.lineWidth = 5;
      tctx.beginPath(); tctx.moveTo(x1, y1); tctx.lineTo(x2, y2); tctx.stroke();
      tctx.restore();
      tctx.save(); tctx.translate(gap * 0.5, gap * 0.42);
      tctx.beginPath(); tctx.moveTo(0, H); tctx.lineTo(W, H); tctx.lineTo(W, 0); tctx.lineTo(x2, y2); tctx.lineTo(x1, y1); tctx.lineTo(0, H);
      tctx.fillStyle = '#ffffff'; tctx.fill();
      tctx.strokeStyle = 'rgba(255,215,0,0.9)'; tctx.lineWidth = 5;
      tctx.beginPath(); tctx.moveTo(x1, y1); tctx.lineTo(x2, y2); tctx.stroke();
      tctx.restore();
    }

    function drawNinjaBack(x, y, scale, legPhase, lean = 0) {
      ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.rotate(lean);
      const leg = Math.sin(legPhase) * 1.2;
      ctx.save(); ctx.globalAlpha = 0.12;
      ctx.beginPath(); ctx.ellipse(0, 70, 22, 5, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#000'; ctx.fill(); ctx.restore();
      ctx.fillStyle = '#1a1a2e';
      ctx.beginPath(); ctx.moveTo(-18, 18); ctx.bezierCurveTo(-24, 34, -26, 52, -20, 68);
      ctx.lineTo(20, 68); ctx.bezierCurveTo(26, 52, 24, 34, 18, 18); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.beginPath(); ctx.moveTo(-8, 20); ctx.bezierCurveTo(-10, 34, -9, 52, -6, 65);
      ctx.lineTo(-1, 65); ctx.bezierCurveTo(-4, 52, -5, 34, -3, 20); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e52b2b'; ctx.fillRect(-18, 40, 36, 5);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(-18, 40, 36, 1.5);
      const scarfLen = lean !== 0 ? 62 : 38;
      ctx.fillStyle = '#c0392b';
      ctx.beginPath(); ctx.moveTo(-14, 16);
      ctx.bezierCurveTo(-24, 20, -40 + leg * 6, 14 + leg * 8, -14 - scarfLen, 8 + leg * 10);
      ctx.bezierCurveTo(-36 + leg * 4, 22 + leg * 6, -22, 30 + leg * 4, -14, 22); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e52b2b';
      ctx.beginPath(); ctx.moveTo(10, 6);
      ctx.bezierCurveTo(18 + lean * 30, 2 + leg * 5, 28 + lean * 40, 8 + leg * 8, 20 + scarfLen * 0.55, 12 + leg * 6);
      ctx.bezierCurveTo(14 + lean * 20, 14 + leg * 4, 10, 12, 8, 10); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#1a1a2e';
      ctx.save(); ctx.translate(-8, 56); ctx.rotate(leg * 0.35);
      ctx.fillRect(-5, 0, 11, 24); ctx.fillStyle = '#111'; ctx.fillRect(-6, 22, 14, 8); ctx.restore();
      ctx.fillStyle = '#1a1a2e';
      ctx.save(); ctx.translate(8, 56); ctx.rotate(-leg * 0.35);
      ctx.fillRect(-5, 0, 11, 24); ctx.fillStyle = '#111'; ctx.fillRect(-6, 22, 14, 8); ctx.restore();
      ctx.fillStyle = '#1a1a2e';
      ctx.save(); ctx.translate(-18, 26); ctx.rotate(leg * 0.6); ctx.fillRect(-4, 0, 9, 22); ctx.restore();
      ctx.save(); ctx.translate(18, 26); ctx.rotate(-leg * 0.6); ctx.fillRect(-4, 0, 9, 22); ctx.restore();
      ctx.fillStyle = '#222a4a'; ctx.fillRect(-22, 14, 44, 12);
      ctx.fillStyle = '#1a1a2e'; ctx.fillRect(-6, 6, 12, 12);
      ctx.beginPath(); ctx.arc(0, 2, 14, 0, Math.PI * 2); ctx.fillStyle = '#1a1a2e'; ctx.fill();
      ctx.fillStyle = '#e52b2b'; ctx.fillRect(-13, 7, 26, 4);
      ctx.fillStyle = '#c0392b'; ctx.fillRect(8, 6, 6, 8);
      ctx.beginPath(); ctx.moveTo(14, 8);
      ctx.bezierCurveTo(22 + lean * 20, 2 + leg * 5, 32 + lean * 30, 8 + leg * 8, 22 + scarfLen * 0.5, 12 + leg * 6);
      ctx.bezierCurveTo(16 + lean * 15, 14 + leg * 4, 10, 12, 8, 10);
      ctx.fillStyle = '#c0392b'; ctx.fill();
      ctx.restore();
    }

    function drawWindLines(x, y, alpha, intensity = 1) {
      ctx.save(); ctx.globalAlpha = alpha;
      [{ dx: -90, dy: -8, len: 75, w: 3 }, { dx: -110, dy: 8, len: 62, w: 2 },
      { dx: -80, dy: -30, len: 50, w: 1.8 }, { dx: -105, dy: 26, len: 65, w: 2.2 },
      { dx: -75, dy: -48, len: 40, w: 1.4 }, { dx: -70, dy: 14, len: 85, w: 2.5 }
      ].forEach(l => {
        const g = ctx.createLinearGradient(x + l.dx, y, x + l.dx + l.len * intensity, y);
        g.addColorStop(0, 'rgba(80,120,160,0)');
        g.addColorStop(0.3, 'rgba(80,120,160,0.75)');
        g.addColorStop(1, 'rgba(80,120,160,0)');
        ctx.strokeStyle = g; ctx.lineWidth = l.w; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x + l.dx, y + l.dy); ctx.lineTo(x + l.dx + l.len * intensity, y + l.dy); ctx.stroke();
      });
      ctx.restore();
    }

    async function runIntro() {
      bg();
      let sA = 0, sX = -50, sY = -50;
      let ninjaX = W * 0.28, ninjaY = H * 0.52, ninjaScale = 1, legPhase = 0;

      await wait(300);

      // P1: shuriken + slash
      sndWhoosh();
      await new Promise(res => {
        const s = performance.now();
        function f(now) {
          if (!running) return;
          bg();
          const t = Math.min((now - s) / 850, 1);
          drawSlash(easeOut(t));
          sX = lerp(-50, W * 0.88, easeOut(t));
          sY = lerp(-50, H * 0.92, easeOut(t));
          sA += 0.2;
          drawShuriken(sX, sY, 24, sA);
          if (t < 1) requestAnimationFrame(f); else res();
        }
        requestAnimationFrame(f);
      });
      sndImpact(); await wait(200);

      // P2: boomerang
      sndWhoosh();
      await new Promise(res => {
        const s = performance.now(), fx = sX, fy = sY;
        function f(now) {
          if (!running) return;
          bg();
          const t = Math.min((now - s) / 550, 1);
          sX = lerp(fx, -60, easeIn(t)); sY = lerp(fy, -60, easeIn(t)); sA += 0.25;
          drawSlash(1); drawShuriken(sX, sY, 24, sA);
          if (t < 1) requestAnimationFrame(f); else res();
        }
        requestAnimationFrame(f);
      });

      // P3: smoke
      sndSmoke();
      await new Promise(res => {
        const s = performance.now();
        function f(now) {
          if (!running) return;
          bg(); drawSlash(1);
          const t = Math.min((now - s) / 700, 1);
          drawSmoke(W * 0.38, H * 0.52, lerp(0, 140, easeOut(t)), t < 0.55 ? 0.92 : lerp(0.92, 0, (t - 0.55) / 0.45));
          if (t < 1) requestAnimationFrame(f); else res();
        }
        requestAnimationFrame(f);
      });

      // P4: ninja appears
      bg(); drawSlash(1); drawNinjaBack(ninjaX, ninjaY, ninjaScale, legPhase);
      await wait(300);

      // P4b: bubble lines appear one by one — all crisp
      await document.fonts.load('27px Bangers');
      for (let i = 0; i < 3; i++) {
        sndPop(i);
        bg(); drawSlash(1); drawNinjaBack(ninjaX, ninjaY, ninjaScale, legPhase);
        drawBubble(ninjaX, ninjaY, i + 1);
        await wait(i === 2 ? 1700 : 1400);
      }

      // P5: idea moment
      sndIdea();
      bg(); drawSlash(1); drawNinjaBack(ninjaX, ninjaY, ninjaScale, legPhase);
      ctx.font = '42px serif'; ctx.textAlign = 'left'; ctx.fillText('💡', ninjaX + 22, ninjaY - 80);
      await wait(900);

      // P6: ninja runs toward portal
      const destX = W * 0.71, destY = H * 0.70;
      let runBeat = 0, lastBeat = 0;
      await new Promise(res => {
        const s = performance.now(), sx = ninjaX, sy = ninjaY;
        function f(now) {
          if (!running) return;
          bg(); drawSlash(1);
          const t = Math.min((now - s) / 1800, 1), ease = easeInOut(t);
          ninjaX = lerp(sx, destX, ease); ninjaY = lerp(sy, destY, ease);
          ninjaScale = lerp(1, 0.32, ease); legPhase += t < 0.5 ? 0.22 : 0.32;
          const lean = lerp(0, 0.28, Math.min(t * 3, 1));
          const windA = t < 0.08 ? t / 0.08 : t > 0.88 ? lerp(1, 0, (t - 0.88) / 0.12) : 1;
          drawWindLines(ninjaX, ninjaY, windA * 0.85, lerp(0.6, 1.4, Math.min(t * 2, 1)));
          drawNinjaBack(ninjaX, ninjaY, ninjaScale, legPhase, lean);
          if (now - lastBeat > 190) { sndRun(runBeat++); lastBeat = now; }
          if (t < 1) requestAnimationFrame(f); else res();
        }
        requestAnimationFrame(f);
      });

      // P7: portal tears open, ninja vanishes
      sndPortal();
      await new Promise(res => {
        const s = performance.now();
        function f(now) {
          if (!running) return;
          bg(); drawSlash(1);
          const t = Math.min((now - s) / 800, 1);
          ctx.save();
          ctx.strokeStyle = 'rgba(255,215,0,0.9)';
          ctx.lineWidth = lerp(3, 22, easeOut(t));
          ctx.lineCap = 'round';
          ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 30;
          ctx.beginPath(); ctx.moveTo(W * 0.12, H * 0.08); ctx.lineTo(W * 0.88, H * 0.92); ctx.stroke();
          ctx.shadowBlur = 0; ctx.restore();
          if (t < 0.5) drawNinjaBack(ninjaX, ninjaY, lerp(0.32, 0, t / 0.5), legPhase + t * 3, 0.28);
          if (t < 1) requestAnimationFrame(f); else res();
        }
        requestAnimationFrame(f);
      });

      // P8: full screen tear
      await new Promise(res => {
        const s = performance.now();
        function f(now) {
          if (!running) return;
          bg();
          drawFullScreenTear(easeOut(Math.min((now - s) / 1000, 1)));
          if (Math.min((now - s) / 1000, 1) < 1) requestAnimationFrame(f); else res();
        }
        requestAnimationFrame(f);
      });

      // P9: page reveals
      tctx.setTransform(1, 0, 0, 1, 0, 0);
      tctx.clearRect(0, 0, W * dpr, H * dpr);
      bg();
      sndReveal();
      setScreen('page');
    }

    runIntro();
    return () => { running = false; };
  }, [screen]);

  useEffect(() => {
    if (screen !== 'page') return;
  }, [screen]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bangers&family=Press+Start+2P&family=Fredoka+One&family=Space+Grotesk:wght@400;700;900&display=swap');
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-6px)} 80%{transform:translateX(6px)} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .indie-card { animation: fadeUp 0.5s ease forwards; }
      `}</style>

      <div className={`relative w-full min-h-screen ${screen !== 'page' ? 'overflow-hidden' : ''}`} style={{ background: '#fffbf0' }}>

        {/* PRESS SCREEN */}
        {screen === 'press' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-50" style={{ background: '#fffbf0' }}>
            <button
              onClick={skipToPage}
              onMouseEnter={sndHover}
              style={{ position: 'absolute', top: '16px', right: '16px', fontFamily: '"Press Start 2P", monospace', fontSize: '8px', background: 'rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.12)', color: '#888', padding: '7px 13px', borderRadius: '4px', cursor: 'pointer' }}
            >
              SKIP INTRO ▶
            </button>

            <img src="/pmninja-logo.png" alt="PMNinja" style={{ height: '200px', objectFit: 'contain', marginBottom: '24px' }} />

            <div style={{ fontFamily: '"Fredoka One", cursive', fontSize: '40px', color: '#2d1b00', textAlign: 'center', marginBottom: '40px', lineHeight: 1.2 }}>
              Are you an Aspiring<br />Product Manager?
            </div>

            <div className="flex gap-6 items-center">
              <button
                id="btn-yes"
                onClick={handleYes}
                onMouseEnter={sndHover}
                style={{ fontFamily: '"Fredoka One", cursive', fontSize: '28px', padding: '14px 52px', borderRadius: '50px', background: '#27ae60', color: 'white', border: 'none', boxShadow: '0 5px 0 #1e8449', cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseDown={e => { e.currentTarget.style.transform = 'translateY(2px)'; e.currentTarget.style.boxShadow = '0 3px 0 #1e8449'; }}
                onMouseUp={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 5px 0 #1e8449'; }}
              >
                YES ✓
              </button>

              <div className="relative">
                <button
                  id="btn-no"
                  onClick={handleNo}
                  onMouseEnter={() => { setShowNoTooltip(true); sndHover(); }}
                  onMouseLeave={() => setShowNoTooltip(false)}
                  style={{ fontFamily: '"Fredoka One", cursive', fontSize: '28px', padding: '14px 52px', borderRadius: '50px', background: '#ff4757', color: 'white', border: 'none', boxShadow: '0 5px 0 #c0392b', cursor: 'pointer' }}
                >
                  NO ✗
                </button>
                {showNoTooltip && (
                  <div style={{ position: 'absolute', bottom: 'calc(100% + 12px)', left: '50%', transform: 'translateX(-50%)', background: '#2d1b00', color: 'white', fontFamily: '"Fredoka One", cursive', fontSize: '16px', padding: '8px 18px', borderRadius: '8px', whiteSpace: 'nowrap', zIndex: 10 }}>
                    Why are you here? 👀
                    <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', border: '6px solid transparent', borderTopColor: '#2d1b00' }} />
                  </div>
                )}
              </div>
            </div>

            {noMsg && (
              <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '9px', color: '#ff4757', marginTop: '20px', letterSpacing: '0.05em' }}>
                {noMsg}
              </div>
            )}
          </div>
        )}

        {/* INTRO SCREEN */}
        {screen === 'intro' && (
          <div className="absolute inset-0 z-40" style={{ background: 'white' }}>
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
            <canvas ref={tearCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 8 }} />
            <button
              onClick={() => setScreen('page')}
              style={{ position: 'absolute', top: '14px', right: '16px', zIndex: 99, fontFamily: '"Press Start 2P", monospace', fontSize: '8px', background: 'rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.12)', color: '#555', padding: '7px 13px', borderRadius: '4px', cursor: 'pointer' }}
            >
              SKIP INTRO ▶
            </button>
          </div>
        )}

        {/* LANDING PAGE */}
        {screen === 'page' && (
          <div className="flex flex-col min-h-screen" style={{ background: '#fffbf0', animation: 'fadeUp 0.7s ease forwards' }}>
            {/* HUD bar */}
            <div style={{ background: '#2d1b00', padding: '8px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {[['PLAYER', 'APM-001'], ['SCORE', String(hudScore).padStart(6, '0')], ['WORLD', 'PM-1'], ['LIVES', '♥×3']].map(([label, val]) => (
                <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                  <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '8px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em' }}>{label}</div>
                  <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '12px', color: '#ffd700', ...(label === 'SCORE' && { animation: 'blink 1.5s infinite' }) }}>{val}</div>
                </div>
              ))}
            </div>

            {/* Page body */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 gap-5">
              <img src="/pmninja-logo.png" alt="PMNinja" style={{ height: '150px', objectFit: 'contain', marginBottom: '4px' }} />
              <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '9px', color: '#27ae60', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#27ae60', animation: 'blink 1.5s infinite' }} />
                WORLD PM-1 · FREE MOCK ACTIVE
              </div>

              <div style={{ fontFamily: '"Fredoka One", cursive', fontSize: 'clamp(42px, 7vw, 68px)', color: '#2d1b00', lineHeight: 1.05, textAlign: 'center' }}>
                Become a<br />
                <span style={{ color: '#1a1a1a' }}>PM</span><span style={{ color: '#2d6a2d' }}>Ninja</span>
              </div>

              <div style={{ fontSize: '16px', color: '#a08060', textAlign: 'center', maxWidth: '460px', lineHeight: 1.7, fontFamily: '"Space Grotesk", sans-serif' }}>
                The most rigorous AI-driven APM interview practice. Calibrated to Google, Meta, and Flipkart standards.
              </div>

              <button
                onClick={() => { sndClick(); router.push('/auth'); }}
                onMouseEnter={sndHover}
                onMouseDown={e => { e.currentTarget.style.transform = 'translateY(2px)'; e.currentTarget.style.boxShadow = '0 3px 0 #1e8449'; }}
                onMouseUp={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 5px 0 #1e8449'; }}
                style={{ background: '#27ae60', color: 'white', padding: '16px 36px', borderRadius: '50px', fontWeight: 800, fontSize: '16px', boxShadow: '0 5px 0 #1e8449', border: 'none', cursor: 'pointer', fontFamily: '"Space Grotesk", sans-serif', transition: 'all 0.12s' }}
              >
                ▶ CLAIM FREE MOCK
              </button>

              {/* Feature cards */}
              <div className="grid grid-cols-3 gap-4 w-full max-w-3xl mt-2">
                {[
                  { icon: '🏁', level: 'LEVEL 01', title: '8-Checkpoint System', desc: 'Gated interviews. No skipping. Beat each level to advance.' },
                  { icon: '👾', level: 'LEVEL 02', title: 'Brutal AI Assessor', desc: 'Sharp follow-ups. No fluff. The final boss of PM interviews.' },
                  { icon: '🏆', level: 'LEVEL 03', title: 'Ranking & Streaks', desc: 'PM Noob to Ninja. Earn stars every single session.' },
                ].map((card, i) => (
                  <div
                    key={i}
                    className="indie-card"
                    onMouseEnter={sndHover}
                    style={{ background: 'white', border: '2px solid #f0e0c0', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 0 #f0e0c0', transition: 'all 0.2s', animationDelay: `${i * 0.1}s`, cursor: 'default', minHeight: '140px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}
                    onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 0 #f0e0c0'; e.currentTarget.style.borderColor = '#27ae60'; }}
                    onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 0 #f0e0c0'; e.currentTarget.style.borderColor = '#f0e0c0'; }}
                  >
                    <div style={{ fontSize: '24px', marginBottom: '10px' }}>{card.icon}</div>
                    <div style={{ fontFamily: '"Fredoka One", cursive', fontSize: '16px', color: '#2d1b00', marginBottom: '6px' }}>{card.title}</div>
                    <div style={{ fontSize: '12px', color: '#a08060', lineHeight: 1.6 }}>{card.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ textAlign: 'center', fontFamily: '"Press Start 2P", monospace', fontSize: '7px', color: '#e0d0b0', padding: '16px', letterSpacing: '0.08em' }}>
              © PMNINJA · GOOGLE · META · FLIPKART
            </div>
          </div>
        )}
      </div>
    </>
  );
}