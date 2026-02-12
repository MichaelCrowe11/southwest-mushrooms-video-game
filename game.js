(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const BASE_WIDTH = 960;
  const BASE_HEIGHT = 540;
  const KEY = {
    LEFT: "ArrowLeft",
    RIGHT: "ArrowRight",
    UP: "ArrowUp",
    DOWN: "ArrowDown",
    A: "a",
    D: "d",
    W: "w",
    S: "s",
    E: "e",
    B: "b",
    ENTER: "Enter",
    SPACE: " ",
    F: "f",
    ESC: "Escape"
  };

  const state = {
    mode: "start",
    elapsed: 0,
    timeLimit: 120,
    goal: 3,
    score: 0,
    nearTargetId: null,
    message: "",
    cameraShake: 0,
    keysDown: new Set(),
    player: {
      x: BASE_WIDTH * 0.5,
      y: BASE_HEIGHT * 0.72,
      vx: 0,
      vy: 0,
      speed: 230,
      r: 14
    },
    mushrooms: [],
    tumbleweeds: [],
    hazards: []
  };

  function createRng(seed) {
    let t = seed >>> 0;
    return () => {
      t += 0x6d2b79f5;
      let x = Math.imul(t ^ (t >>> 15), 1 | t);
      x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }

  function isNearHazard(x, y, buffer = 24) {
    for (const h of state.hazards) {
      const dist = Math.hypot(x - h.x, y - h.y);
      if (dist < h.r + state.player.r + buffer) return true;
    }
    return false;
  }

  function createMushroom(id, rand) {
    const zoneLeft = 90;
    const zoneRight = BASE_WIDTH - 90;
    const zoneTop = 90;
    const zoneBottom = BASE_HEIGHT - 90;
    let x = zoneLeft + rand() * (zoneRight - zoneLeft);
    let y = zoneTop + rand() * (zoneBottom - zoneTop);
    let tries = 0;
    while (isNearHazard(x, y) && tries < 14) {
      x = zoneLeft + rand() * (zoneRight - zoneLeft);
      y = zoneTop + rand() * (zoneBottom - zoneTop);
      tries += 1;
    }
    return {
      id,
      x,
      y,
      r: 12 + rand() * 4,
      type: rand() > 0.35 ? "blue-veil" : "sun-cap",
      collected: false
    };
  }

  function createHazards() {
    state.hazards = [
      { x: 200, y: 160, r: 36 },
      { x: 760, y: 280, r: 40 },
      { x: 480, y: 410, r: 42 }
    ];
  }

  function createTumbleweeds() {
    state.tumbleweeds = [
      { x: 130, y: 220, r: 18, vx: 90, phase: 0.3 },
      { x: 840, y: 360, r: 14, vx: -110, phase: 1.4 }
    ];
  }

  function startGame() {
    state.mode = "playing";
    state.elapsed = 0;
    state.score = 0;
    state.message = `Harvest ${state.goal} mushrooms before the storm rolls in.`;
    state.cameraShake = 0;
    state.nearTargetId = null;
    state.player.x = BASE_WIDTH * 0.5;
    state.player.y = BASE_HEIGHT * 0.87;
    state.player.vx = 0;
    state.player.vy = 0;
    state.mushrooms = [];
    const rand = createRng(20260212);
    createHazards();
    createTumbleweeds();

    state.mushrooms.push({ id: 1, x: 422, y: 462, r: 14, type: "blue-veil", collected: false });
    state.mushrooms.push({ id: 2, x: 520, y: 452, r: 13, type: "sun-cap", collected: false });
    state.mushrooms.push({ id: 3, x: 580, y: 418, r: 12.5, type: "blue-veil", collected: false });
    for (let i = 3; i < 18; i += 1) {
      state.mushrooms.push(createMushroom(i + 1, rand));
    }
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function drawMesaBackground() {
    const grad = ctx.createLinearGradient(0, 0, 0, BASE_HEIGHT);
    grad.addColorStop(0, "#f09a56");
    grad.addColorStop(0.48, "#da6f3f");
    grad.addColorStop(1, "#6d3f2a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

    ctx.fillStyle = "#b25c31";
    ctx.beginPath();
    ctx.moveTo(0, 360);
    ctx.lineTo(140, 290);
    ctx.lineTo(300, 320);
    ctx.lineTo(470, 250);
    ctx.lineTo(640, 315);
    ctx.lineTo(820, 270);
    ctx.lineTo(BASE_WIDTH, 340);
    ctx.lineTo(BASE_WIDTH, BASE_HEIGHT);
    ctx.lineTo(0, BASE_HEIGHT);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#e9b96f";
    ctx.fillRect(0, 400, BASE_WIDTH, BASE_HEIGHT - 400);

    ctx.fillStyle = "#d29045";
    for (let i = 0; i < 38; i += 1) {
      const x = (i * 57) % BASE_WIDTH;
      const y = 408 + ((i * 23) % 120);
      ctx.fillRect(x, y, 2, 7);
    }
  }

  function drawStartScreen() {
    drawMesaBackground();
    ctx.fillStyle = "rgba(20, 12, 8, 0.58)";
    ctx.fillRect(130, 80, BASE_WIDTH - 260, BASE_HEIGHT - 160);

    ctx.fillStyle = "#ffd892";
    ctx.font = "bold 56px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillText("Southwest Mushroom Trek", BASE_WIDTH / 2, 175);

    ctx.fillStyle = "#fff2cf";
    ctx.font = "25px Trebuchet MS";
    ctx.fillText("Gather rare desert fungi while avoiding toxic patches.", BASE_WIDTH / 2, 235);

    ctx.font = "22px Trebuchet MS";
    ctx.fillText("Move: Arrow Keys or WASD", BASE_WIDTH / 2, 290);
    ctx.fillText("Harvest: E", BASE_WIDTH / 2, 325);
    ctx.fillText("Fullscreen: F", BASE_WIDTH / 2, 360);
    ctx.fillText("Start: Enter or Space", BASE_WIDTH / 2, 395);

    ctx.fillStyle = "#ffd892";
    ctx.font = "bold 24px Trebuchet MS";
    ctx.fillText("Press Enter to begin", BASE_WIDTH / 2, 455);
  }

  function drawPlayer() {
    const p = state.player;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.fillStyle = "#2f4f4f";
    ctx.fillRect(-9, -17, 18, 28);
    ctx.fillStyle = "#6f9970";
    ctx.fillRect(-11, -28, 22, 11);
    ctx.fillStyle = "#f4d7ad";
    ctx.beginPath();
    ctx.arc(0, -35, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawMushroom(m) {
    if (m.collected) return;
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.fillStyle = m.type === "blue-veil" ? "#c9ddff" : "#ffce8d";
    ctx.beginPath();
    ctx.ellipse(0, -5, m.r, m.r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f5e1c2";
    ctx.fillRect(-2, -4, 4, 15);
    ctx.restore();
  }

  function drawHazard(h) {
    ctx.fillStyle = "#6d8a49";
    ctx.beginPath();
    ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#567132";
    ctx.beginPath();
    ctx.arc(h.x + h.r * 0.3, h.y - h.r * 0.2, h.r * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawTumbleweed(t, dt) {
    t.phase += dt * 4;
    t.x += t.vx * dt;
    if (t.x < -40) t.x = BASE_WIDTH + 40;
    if (t.x > BASE_WIDTH + 40) t.x = -40;
    const bob = Math.sin(t.phase) * 5;
    ctx.save();
    ctx.translate(t.x, t.y + bob);
    ctx.strokeStyle = "#8a5e2e";
    ctx.lineWidth = 2.2;
    for (let i = 0; i < 6; i += 1) {
      ctx.beginPath();
      ctx.arc(0, 0, t.r - i * 2, i * 0.4, Math.PI * 1.5 + i * 0.2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawHud() {
    ctx.fillStyle = "rgba(23, 16, 10, 0.72)";
    ctx.fillRect(14, 12, 340, 86);
    ctx.fillStyle = "#fff1cf";
    ctx.textAlign = "left";
    ctx.font = "bold 24px Trebuchet MS";
    ctx.fillText(`Harvested: ${state.score}/${state.goal}`, 28, 42);
    ctx.font = "21px Trebuchet MS";
    const remaining = Math.max(0, state.timeLimit - state.elapsed);
    ctx.fillText(`Time: ${remaining.toFixed(1)}s`, 28, 74);
  }

  function drawMessage() {
    if (!state.message) return;
    ctx.fillStyle = "rgba(17, 11, 7, 0.7)";
    ctx.fillRect(190, 14, BASE_WIDTH - 380, 52);
    ctx.fillStyle = "#ffe3af";
    ctx.font = "21px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillText(state.message, BASE_WIDTH / 2, 47);
  }

  function drawPlaying(dt) {
    if (state.cameraShake > 0) {
      const shake = Math.min(6, state.cameraShake * 22);
      const ox = (Math.random() - 0.5) * shake;
      const oy = (Math.random() - 0.5) * shake;
      ctx.save();
      ctx.translate(ox, oy);
    }

    drawMesaBackground();
    state.hazards.forEach(drawHazard);
    state.mushrooms.forEach(drawMushroom);
    state.tumbleweeds.forEach((t) => drawTumbleweed(t, dt));
    drawPlayer();
    drawHud();
    drawMessage();

    if (state.cameraShake > 0) {
      ctx.restore();
    }
  }

  function drawEndScreen(won) {
    drawMesaBackground();
    ctx.fillStyle = "rgba(15, 11, 8, 0.6)";
    ctx.fillRect(150, 110, BASE_WIDTH - 300, BASE_HEIGHT - 220);
    ctx.fillStyle = won ? "#b6ffb6" : "#ffd2aa";
    ctx.font = "bold 50px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillText(won ? "Harvest Complete!" : "Dust Storm Overtook You", BASE_WIDTH / 2, 215);

    ctx.fillStyle = "#fff1cf";
    ctx.font = "29px Trebuchet MS";
    ctx.fillText(`Mushrooms Collected: ${state.score}`, BASE_WIDTH / 2, 280);
    ctx.font = "24px Trebuchet MS";
    ctx.fillText("Press Enter to play again", BASE_WIDTH / 2, 360);
  }

  function updatePlaying(dt) {
    const p = state.player;
    state.elapsed += dt;
    state.cameraShake = Math.max(0, state.cameraShake - dt * 1.8);

    const left = state.keysDown.has(KEY.LEFT) || state.keysDown.has(KEY.A);
    const right = state.keysDown.has(KEY.RIGHT) || state.keysDown.has(KEY.D);
    const up = state.keysDown.has(KEY.UP) || state.keysDown.has(KEY.W);
    const down = state.keysDown.has(KEY.DOWN) || state.keysDown.has(KEY.S);

    p.vx = (right - left) * p.speed;
    p.vy = (down - up) * p.speed;
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    p.x = clamp(p.x, 30, BASE_WIDTH - 30);
    p.y = clamp(p.y, 48, BASE_HEIGHT - 28);

    const activeMushrooms = state.mushrooms.filter((m) => !m.collected);
    let nearest = null;
    let nearestDist = Infinity;
    for (const m of activeMushrooms) {
      const dx = m.x - p.x;
      const dy = m.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = m;
      }
    }
    state.nearTargetId = nearest && nearestDist <= 42 ? nearest.id : null;
    state.message = state.nearTargetId ? "Press E to harvest nearby mushroom." : "Search the wash for rare mushrooms.";

    for (const h of state.hazards) {
      const dist = Math.hypot(p.x - h.x, p.y - h.y);
      if (dist < h.r + p.r) {
        p.x -= (p.vx || 0) * dt * 0.7;
        p.y -= (p.vy || 0) * dt * 0.7;
        state.elapsed += dt * 1.5;
        state.cameraShake = 0.35;
        state.message = "Toxic patch! You lost time.";
      }
    }

    if (state.score >= state.goal) {
      state.mode = "won";
      state.message = "";
      return;
    }
    if (state.elapsed >= state.timeLimit) {
      state.mode = "lost";
      state.message = "";
    }
  }

  function attemptHarvest() {
    if (state.mode !== "playing") return;
    if (state.nearTargetId == null) return;
    const m = state.mushrooms.find((x) => x.id === state.nearTargetId);
    if (!m || m.collected) return;
    m.collected = true;
    state.score += 1;
    state.cameraShake = 0.14;
    state.message = `${m.type} harvested!`;
  }

  function render(dtForFx = 1 / 60) {
    ctx.clearRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
    if (state.mode === "start") {
      drawStartScreen();
      return;
    }
    if (state.mode === "playing") {
      drawPlaying(dtForFx);
      return;
    }
    if (state.mode === "won") {
      drawEndScreen(true);
      return;
    }
    drawEndScreen(false);
  }

  function update(dt) {
    if (state.mode === "playing") {
      updatePlaying(dt);
    }
    render(dt);
  }

  let rafId = null;
  let lastTs = performance.now();
  function tick(ts) {
    const dt = Math.min(0.033, (ts - lastTs) / 1000);
    lastTs = ts;
    update(dt);
    rafId = requestAnimationFrame(tick);
  }

  function renderGameToText() {
    const payload = {
      mode: state.mode,
      coordinate_system: "origin=(0,0) top-left; +x right; +y down; units pixels",
      objective: `collect ${state.goal} mushrooms in ${state.timeLimit}s`,
      player: {
        x: Number(state.player.x.toFixed(1)),
        y: Number(state.player.y.toFixed(1)),
        vx: Number(state.player.vx.toFixed(1)),
        vy: Number(state.player.vy.toFixed(1)),
        radius: state.player.r
      },
      score: state.score,
      timer_remaining: Number(Math.max(0, state.timeLimit - state.elapsed).toFixed(2)),
      near_collectible_id: state.nearTargetId,
      hazards: state.hazards.map((h) => ({ x: h.x, y: h.y, radius: h.r })),
      active_mushrooms: state.mushrooms
        .filter((m) => !m.collected)
        .slice(0, 6)
        .map((m) => ({
          id: m.id,
          x: Number(m.x.toFixed(1)),
          y: Number(m.y.toFixed(1)),
          radius: Number(m.r.toFixed(1)),
          type: m.type
        })),
      active_mushroom_count: state.mushrooms.filter((m) => !m.collected).length,
      message: state.message,
      controls: "Move=Arrow/WASD; Harvest=E (or B); Start/Restart=Enter/Space; Fullscreen=F"
    };
    return JSON.stringify(payload);
  }

  async function toggleFullscreen() {
    if (!document.fullscreenElement) {
      await canvas.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  }

  function resizeCanvas() {
    const maxScale = Math.min(window.innerWidth / BASE_WIDTH, window.innerHeight / BASE_HEIGHT);
    const scale = clamp(maxScale * 0.95, 0.45, 1.6);
    canvas.style.width = `${Math.floor(BASE_WIDTH * scale)}px`;
    canvas.style.height = `${Math.floor(BASE_HEIGHT * scale)}px`;
  }

  window.render_game_to_text = renderGameToText;
  window.advanceTime = (ms) => {
    const clamped = clamp(ms, 1, 1000);
    const steps = Math.max(1, Math.round(clamped / (1000 / 60)));
    const dt = clamped / 1000 / steps;
    for (let i = 0; i < steps; i += 1) {
      if (state.mode === "playing") updatePlaying(dt);
    }
    render(dt);
  };

  window.addEventListener("keydown", (ev) => {
    const key = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
    state.keysDown.add(key);

    if (key === KEY.F) {
      toggleFullscreen().catch(() => undefined);
    }
    if (key === KEY.ESC && document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined);
    }
    if ((key === KEY.ENTER || key === KEY.SPACE) && state.mode !== "playing") {
      startGame();
    }
    if (key === KEY.E || key === KEY.B) {
      attemptHarvest();
    }
  });

  window.addEventListener("keyup", (ev) => {
    const key = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
    state.keysDown.delete(key);
  });

  window.addEventListener("resize", resizeCanvas);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) state.keysDown.clear();
  });

  resizeCanvas();
  render();
  if (rafId) cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(tick);
})();
