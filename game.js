(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const GAME_TITLE = "Southwest Mushrooms: Desert Harvest";
  const BASE_WIDTH = 960;
  const BASE_HEIGHT = 540;
  const FLOOR_Y = 400;
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
    SHIFT: "Shift",
    ENTER: "Enter",
    SPACE: " ",
    F: "f",
    ESC: "Escape"
  };

  const state = {
    mode: "start",
    elapsed: 0,
    timeLimit: 135,
    goal: 6,
    score: 0,
    nearTargetId: null,
    nearestTargetId: null,
    message: "",
    cameraShake: 0,
    worldTime: 0,
    harvestCombo: 0,
    harvestStreakTimer: 0,
    keysDown: new Set(),
    player: {
      x: BASE_WIDTH * 0.5,
      y: BASE_HEIGHT * 0.85,
      vx: 0,
      vy: 0,
      speed: 200,
      sprintSpeed: 310,
      accel: 1150,
      friction: 7.5,
      r: 13,
      stamina: 1
    },
    mushrooms: [],
    tumbleweeds: [],
    hazards: [],
    dust: []
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

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function isNearHazard(x, y, buffer = 24) {
    for (const h of state.hazards) {
      const dist = Math.hypot(x - h.x, y - h.y);
      if (dist < h.r + state.player.r + buffer) return true;
    }
    return false;
  }

  function createMushroom(id, rand) {
    const zoneLeft = 70;
    const zoneRight = BASE_WIDTH - 70;
    const zoneTop = 95;
    const zoneBottom = BASE_HEIGHT - 70;
    let x = zoneLeft + rand() * (zoneRight - zoneLeft);
    let y = zoneTop + rand() * (zoneBottom - zoneTop);
    let tries = 0;
    while (isNearHazard(x, y, 28) && tries < 18) {
      x = zoneLeft + rand() * (zoneRight - zoneLeft);
      y = zoneTop + rand() * (zoneBottom - zoneTop);
      tries += 1;
    }
    return {
      id,
      x,
      y,
      r: 11 + rand() * 5,
      type: rand() > 0.32 ? "blue-veil" : "sun-cap",
      collected: false,
      pulse: rand() * Math.PI * 2
    };
  }

  function createHazards() {
    state.hazards = [
      { x: 190, y: 176, r: 36, pulse: 0.2 },
      { x: 745, y: 282, r: 39, pulse: 1.1 },
      { x: 470, y: 412, r: 41, pulse: 2.0 }
    ];
  }

  function createTumbleweeds() {
    state.tumbleweeds = [
      { x: 120, y: 232, r: 18, vx: 90, phase: 0.3 },
      { x: 825, y: 348, r: 14, vx: -112, phase: 1.4 },
      { x: 520, y: 300, r: 12, vx: 72, phase: 2.3 }
    ];
  }

  function createDust() {
    state.dust = [];
    for (let i = 0; i < 42; i += 1) {
      state.dust.push({
        x: (i * 31) % BASE_WIDTH,
        y: 260 + (i * 17) % 280,
        r: 1 + (i % 3) * 0.9,
        vx: 6 + (i % 5) * 3.5,
        alpha: 0.06 + (i % 4) * 0.025
      });
    }
  }

  function startGame() {
    state.mode = "playing";
    state.elapsed = 0;
    state.score = 0;
    state.message = `Harvest ${state.goal} mushrooms before the storm rolls in.`;
    state.cameraShake = 0;
    state.worldTime = 0;
    state.nearTargetId = null;
    state.nearestTargetId = null;
    state.harvestCombo = 0;
    state.harvestStreakTimer = 0;
    state.player.x = BASE_WIDTH * 0.5;
    state.player.y = BASE_HEIGHT * 0.86;
    state.player.vx = 0;
    state.player.vy = 0;
    state.player.stamina = 1;
    state.mushrooms = [];
    const rand = createRng(20260212);

    createHazards();
    createTumbleweeds();
    createDust();

    state.mushrooms.push({ id: 1, x: 424, y: 458, r: 14, type: "blue-veil", collected: false, pulse: 0.5 });
    state.mushrooms.push({ id: 2, x: 518, y: 449, r: 13, type: "sun-cap", collected: false, pulse: 1.8 });
    state.mushrooms.push({ id: 3, x: 582, y: 416, r: 12.5, type: "blue-veil", collected: false, pulse: 2.6 });
    for (let i = 3; i < 20; i += 1) {
      state.mushrooms.push(createMushroom(i + 1, rand));
    }
  }

  function drawSkyAndSun() {
    const grad = ctx.createLinearGradient(0, 0, 0, BASE_HEIGHT);
    grad.addColorStop(0, "#f5af66");
    grad.addColorStop(0.42, "#df7a46");
    grad.addColorStop(1, "#8f4a2d");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

    const sunX = 140 + Math.sin(state.worldTime * 0.04) * 48;
    const sunY = 92 + Math.cos(state.worldTime * 0.03) * 18;
    const sunGrad = ctx.createRadialGradient(sunX, sunY, 12, sunX, sunY, 120);
    sunGrad.addColorStop(0, "rgba(255, 238, 176, 0.9)");
    sunGrad.addColorStop(0.6, "rgba(255, 189, 110, 0.35)");
    sunGrad.addColorStop(1, "rgba(255, 189, 110, 0)");
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 120, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawParallaxMesas() {
    const camRatio = (state.player.x - BASE_WIDTH * 0.5) / BASE_WIDTH;
    const farShift = camRatio * 36;
    const midShift = camRatio * 68;

    ctx.fillStyle = "#b86537";
    ctx.beginPath();
    ctx.moveTo(-70 - farShift, 330);
    ctx.lineTo(110 - farShift, 262);
    ctx.lineTo(255 - farShift, 296);
    ctx.lineTo(430 - farShift, 228);
    ctx.lineTo(580 - farShift, 280);
    ctx.lineTo(770 - farShift, 238);
    ctx.lineTo(1040 - farShift, 338);
    ctx.lineTo(1040, BASE_HEIGHT);
    ctx.lineTo(-80, BASE_HEIGHT);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#ae5f34";
    ctx.beginPath();
    ctx.moveTo(-80 - midShift, 360);
    ctx.lineTo(125 - midShift, 290);
    ctx.lineTo(290 - midShift, 318);
    ctx.lineTo(470 - midShift, 250);
    ctx.lineTo(640 - midShift, 314);
    ctx.lineTo(820 - midShift, 270);
    ctx.lineTo(1060 - midShift, 352);
    ctx.lineTo(1060, BASE_HEIGHT);
    ctx.lineTo(-80, BASE_HEIGHT);
    ctx.closePath();
    ctx.fill();
  }

  function drawGround() {
    ctx.fillStyle = "#deb26d";
    ctx.fillRect(0, FLOOR_Y, BASE_WIDTH, BASE_HEIGHT - FLOOR_Y);

    ctx.fillStyle = "#d29347";
    for (let i = 0; i < 62; i += 1) {
      const x = (i * 57) % BASE_WIDTH;
      const y = FLOOR_Y + 12 + ((i * 19) % 120);
      ctx.fillRect(x, y, 2, 8);
    }
  }

  function drawDust(dt) {
    for (const d of state.dust) {
      d.x += d.vx * dt;
      if (d.x > BASE_WIDTH + 18) d.x = -18;
      ctx.fillStyle = `rgba(255, 236, 205, ${d.alpha})`;
      ctx.beginPath();
      ctx.arc(d.x, d.y + Math.sin(state.worldTime * 0.8 + d.x * 0.02) * 4, d.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPlayer() {
    const p = state.player;
    const heading = p.vx * 0.03;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(heading);

    ctx.fillStyle = "#1f5963";
    ctx.fillRect(-9, -18, 18, 30);

    ctx.fillStyle = "#79a67b";
    ctx.fillRect(-12, -30, 24, 12);

    ctx.fillStyle = "#f0d1a2";
    ctx.beginPath();
    ctx.arc(0, -38, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawMushroom(m) {
    if (m.collected) return;
    const glow = 0.5 + Math.sin(state.worldTime * 4 + m.pulse) * 0.5;
    const nearby = m.id === state.nearTargetId;
    ctx.save();
    ctx.translate(m.x, m.y);

    ctx.fillStyle = nearby ? "rgba(255, 244, 196, 0.5)" : `rgba(190, 225, 255, ${0.08 + glow * 0.08})`;
    ctx.beginPath();
    ctx.arc(0, -2, m.r + 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = m.type === "blue-veil" ? "#d7e7ff" : "#ffd9a0";
    ctx.beginPath();
    ctx.ellipse(0, -7, m.r, m.r * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f8e7cd";
    ctx.fillRect(-2.4, -6, 4.8, 16);

    if (nearby) {
      ctx.strokeStyle = "rgba(255, 252, 228, 0.9)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, m.r + 12, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawHazard(h) {
    const pulse = 0.35 + Math.sin(state.worldTime * 3 + h.pulse) * 0.18;
    ctx.fillStyle = `rgba(96, 127, 59, ${0.8 + pulse * 0.2})`;
    ctx.beginPath();
    ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(162, 201, 110, ${0.18 + pulse * 0.18})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(h.x, h.y, h.r + 8 + pulse * 12, 0, Math.PI * 2);
    ctx.stroke();
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
    ctx.lineWidth = 2.1;
    for (let i = 0; i < 6; i += 1) {
      ctx.beginPath();
      ctx.arc(0, 0, t.r - i * 1.9, i * 0.35, Math.PI * 1.5 + i * 0.22);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawTargetGuide() {
    if (!state.nearestTargetId || state.nearTargetId) return;
    const target = state.mushrooms.find((m) => m.id === state.nearestTargetId && !m.collected);
    if (!target) return;
    const p = state.player;
    const dx = target.x - p.x;
    const dy = target.y - p.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) return;

    const dirX = dx / dist;
    const dirY = dy / dist;
    const arrowX = p.x + dirX * 26;
    const arrowY = p.y + dirY * 26;
    const spin = Math.atan2(dirY, dirX);

    ctx.save();
    ctx.translate(arrowX, arrowY);
    ctx.rotate(spin);
    ctx.fillStyle = "rgba(255, 244, 198, 0.9)";
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-5, -6);
    ctx.lineTo(-5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawLighting() {
    const p = state.player;
    const vignette = ctx.createRadialGradient(p.x, p.y - 40, 20, p.x, p.y - 40, 420);
    vignette.addColorStop(0, "rgba(255, 240, 210, 0)");
    vignette.addColorStop(1, "rgba(45, 22, 12, 0.35)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
  }

  function drawHud() {
    ctx.fillStyle = "rgba(25, 15, 9, 0.73)";
    ctx.fillRect(14, 12, 368, 102);
    ctx.fillStyle = "#fff1cf";
    ctx.textAlign = "left";
    ctx.font = "bold 24px Trebuchet MS";
    ctx.fillText(`Harvested: ${state.score}/${state.goal}`, 28, 42);
    ctx.font = "20px Trebuchet MS";
    const remaining = Math.max(0, state.timeLimit - state.elapsed);
    ctx.fillText(`Time: ${remaining.toFixed(1)}s`, 28, 72);
    ctx.fillText(`Combo: x${Math.max(1, state.harvestCombo)}`, 200, 72);

    const staminaW = 150;
    ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
    ctx.fillRect(28, 82, staminaW, 12);
    ctx.fillStyle = "#9ce8d5";
    ctx.fillRect(28, 82, staminaW * state.player.stamina, 12);
    ctx.strokeStyle = "rgba(250, 250, 250, 0.35)";
    ctx.strokeRect(28, 82, staminaW, 12);
  }

  function drawMessage() {
    if (!state.message) return;
    ctx.fillStyle = "rgba(18, 11, 7, 0.72)";
    ctx.fillRect(188, 14, BASE_WIDTH - 376, 52);
    ctx.fillStyle = "#ffe3af";
    ctx.font = "21px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillText(state.message, BASE_WIDTH / 2, 47);
  }

  function drawStartScreen() {
    drawSkyAndSun();
    drawParallaxMesas();
    drawGround();
    drawDust(1 / 60);
    drawLighting();

    ctx.fillStyle = "rgba(18, 10, 7, 0.63)";
    ctx.fillRect(96, 64, BASE_WIDTH - 192, BASE_HEIGHT - 128);

    ctx.fillStyle = "#ffd892";
    ctx.font = "bold 54px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillText(GAME_TITLE, BASE_WIDTH / 2, 155);

    ctx.fillStyle = "#fff2cf";
    ctx.font = "24px Trebuchet MS";
    ctx.fillText("Track, harvest, and survive the desert bloom rush.", BASE_WIDTH / 2, 214);

    ctx.font = "21px Trebuchet MS";
    if (isTouchDevice) {
      ctx.fillText("Drag left side to move", BASE_WIDTH / 2, 278);
      ctx.fillText("Tap right side to harvest", BASE_WIDTH / 2, 314);
      ctx.fillText("Collect 6 mushrooms before the storm!", BASE_WIDTH / 2, 358);
      ctx.fillStyle = "#ffda9a";
      ctx.font = "bold 23px Trebuchet MS";
      ctx.fillText("Tap to begin", BASE_WIDTH / 2, 420);
    } else {
      ctx.fillText("Move: Arrow Keys or WASD", BASE_WIDTH / 2, 270);
      ctx.fillText("Harvest: E", BASE_WIDTH / 2, 302);
      ctx.fillText("Sprint: Shift", BASE_WIDTH / 2, 334);
      ctx.fillText("Fullscreen: F", BASE_WIDTH / 2, 366);
      ctx.fillText("Start: Enter or Space", BASE_WIDTH / 2, 398);
      ctx.fillStyle = "#ffda9a";
      ctx.font = "bold 23px Trebuchet MS";
      ctx.fillText("Press Enter to begin", BASE_WIDTH / 2, 454);
    }
  }

  function drawEndScreen(won) {
    drawSkyAndSun();
    drawParallaxMesas();
    drawGround();
    drawDust(1 / 60);
    drawLighting();

    ctx.fillStyle = "rgba(15, 11, 8, 0.64)";
    ctx.fillRect(128, 104, BASE_WIDTH - 256, BASE_HEIGHT - 208);

    ctx.fillStyle = won ? "#c7ffc4" : "#ffd0a8";
    ctx.font = "bold 48px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillText(won ? "Bloom Secured!" : "Storm Took The Harvest", BASE_WIDTH / 2, 198);

    ctx.fillStyle = "#fff1cf";
    ctx.font = "26px Trebuchet MS";
    ctx.fillText(`${GAME_TITLE}`, BASE_WIDTH / 2, 246);
    ctx.fillText(`Mushrooms Collected: ${state.score}`, BASE_WIDTH / 2, 292);

    ctx.font = "22px Trebuchet MS";
    ctx.fillText(isTouchDevice ? "Tap to play again" : "Press Enter to play again", BASE_WIDTH / 2, 358);
  }

  function drawPlaying(dt) {
    if (state.cameraShake > 0) {
      const shake = Math.min(6, state.cameraShake * 24);
      const ox = (Math.random() - 0.5) * shake;
      const oy = (Math.random() - 0.5) * shake;
      ctx.save();
      ctx.translate(ox, oy);
    }

    drawSkyAndSun();
    drawParallaxMesas();
    drawGround();
    drawDust(dt);

    state.hazards.forEach(drawHazard);
    state.mushrooms.forEach(drawMushroom);
    state.tumbleweeds.forEach((t) => drawTumbleweed(t, dt));
    drawPlayer();
    drawTargetGuide();
    drawLighting();
    drawHud();
    drawMessage();

    if (state.cameraShake > 0) {
      ctx.restore();
    }
  }

  function updatePlaying(dt) {
    const p = state.player;
    state.elapsed += dt;
    state.worldTime += dt;
    state.cameraShake = Math.max(0, state.cameraShake - dt * 2);
    state.harvestStreakTimer = Math.max(0, state.harvestStreakTimer - dt);
    if (state.harvestStreakTimer === 0) {
      state.harvestCombo = 0;
    }

    const left = state.keysDown.has(KEY.LEFT) || state.keysDown.has(KEY.A) || state.keysDown.has("_touchL");
    const right = state.keysDown.has(KEY.RIGHT) || state.keysDown.has(KEY.D) || state.keysDown.has("_touchR");
    const up = state.keysDown.has(KEY.UP) || state.keysDown.has(KEY.W) || state.keysDown.has("_touchU");
    const down = state.keysDown.has(KEY.DOWN) || state.keysDown.has(KEY.S) || state.keysDown.has("_touchD");
    const sprintHeld = state.keysDown.has(KEY.SHIFT);

    const inputX = right - left;
    const inputY = down - up;
    const mag = Math.hypot(inputX, inputY) || 1;
    const normX = inputX / mag;
    const normY = inputY / mag;

    if (sprintHeld && (inputX !== 0 || inputY !== 0) && p.stamina > 0) {
      p.stamina = clamp(p.stamina - dt * 0.24, 0, 1);
    } else {
      p.stamina = clamp(p.stamina + dt * 0.16, 0, 1);
    }
    const sprintMul = sprintHeld && p.stamina > 0.08 ? 1 : 0;
    const targetSpeed = p.speed + (p.sprintSpeed - p.speed) * sprintMul;
    const targetVX = normX * targetSpeed;
    const targetVY = normY * targetSpeed;

    p.vx += (targetVX - p.vx) * clamp((p.accel * dt) / Math.max(1, Math.abs(targetVX - p.vx)), 0, 1);
    p.vy += (targetVY - p.vy) * clamp((p.accel * dt) / Math.max(1, Math.abs(targetVY - p.vy)), 0, 1);
    p.vx *= 1 / (1 + p.friction * dt);
    p.vy *= 1 / (1 + p.friction * dt);

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
    state.nearestTargetId = nearest ? nearest.id : null;
    state.nearTargetId = nearest && nearestDist <= 44 ? nearest.id : null;
    state.message = state.nearTargetId
      ? (isTouchDevice ? "Tap right side to harvest!" : "Press E to harvest nearby mushroom.")
      : (isTouchDevice ? "Drag to move toward the arrow." : "Follow the guide arrow to your next bloom.");

    for (const h of state.hazards) {
      const dist = Math.hypot(p.x - h.x, p.y - h.y);
      if (dist < h.r + p.r) {
        const pushX = p.x - h.x;
        const pushY = p.y - h.y;
        const pushMag = Math.hypot(pushX, pushY) || 1;
        p.x += (pushX / pushMag) * 3.2;
        p.y += (pushY / pushMag) * 3.2;
        p.vx *= 0.5;
        p.vy *= 0.5;
        state.elapsed += dt * 1.4;
        state.cameraShake = 0.35;
        state.message = "Toxic patch! You lost time.";
      }
    }

    for (const t of state.tumbleweeds) {
      const dist = Math.hypot(p.x - t.x, p.y - t.y);
      if (dist < p.r + t.r * 0.68) {
        p.vx += (p.x - t.x) * 0.12;
        p.vy += (p.y - t.y) * 0.12;
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
    state.cameraShake = 0.16;
    state.harvestCombo += 1;
    state.harvestStreakTimer = 4;

    if (state.harvestCombo >= 2) {
      state.elapsed = Math.max(0, state.elapsed - 0.8);
      state.message = `${m.type} harvested! Combo boost: +0.8s`;
    } else {
      state.message = `${m.type} harvested!`;
    }
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
    } else {
      state.worldTime += dt;
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
      title: GAME_TITLE,
      mode: state.mode,
      coordinate_system: "origin=(0,0) top-left; +x right; +y down; units pixels",
      objective: `collect ${state.goal} mushrooms in ${state.timeLimit}s`,
      player: {
        x: Number(state.player.x.toFixed(1)),
        y: Number(state.player.y.toFixed(1)),
        vx: Number(state.player.vx.toFixed(1)),
        vy: Number(state.player.vy.toFixed(1)),
        radius: state.player.r,
        stamina: Number(state.player.stamina.toFixed(2))
      },
      score: state.score,
      combo: state.harvestCombo,
      timer_remaining: Number(Math.max(0, state.timeLimit - state.elapsed).toFixed(2)),
      near_collectible_id: state.nearTargetId,
      nearest_collectible_id: state.nearestTargetId,
      hazards: state.hazards.map((h) => ({ x: h.x, y: h.y, radius: h.r })),
      active_mushrooms: state.mushrooms
        .filter((m) => !m.collected)
        .slice(0, 8)
        .map((m) => ({
          id: m.id,
          x: Number(m.x.toFixed(1)),
          y: Number(m.y.toFixed(1)),
          radius: Number(m.r.toFixed(1)),
          type: m.type
        })),
      active_mushroom_count: state.mushrooms.filter((m) => !m.collected).length,
      message: state.message,
      controls: "Move=Arrow/WASD; Harvest=E (or B); Sprint=Shift; Start/Restart=Enter/Space; Fullscreen=F"
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
      else state.worldTime += dt;
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

  /* ── Touch Controls ── */
  const isTouchDevice = matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
  const touch = { active: false, id: null, startX: 0, startY: 0, dx: 0, dy: 0 };
  const TOUCH_DEAD = 12;

  function canvasTouchXY(t) {
    const r = canvas.getBoundingClientRect();
    return { x: t.clientX - r.left, y: t.clientY - r.top, cw: r.width, ch: r.height };
  }

  canvas.addEventListener("touchstart", (ev) => {
    ev.preventDefault();
    const t = ev.changedTouches[0];
    const { x, y, cw, ch } = canvasTouchXY(t);

    if (state.mode !== "playing") {
      startGame();
      return;
    }

    /* Right third of canvas = harvest */
    if (x > cw * 0.67) {
      attemptHarvest();
      return;
    }

    touch.active = true;
    touch.id = t.identifier;
    touch.startX = t.clientX;
    touch.startY = t.clientY;
    touch.dx = 0;
    touch.dy = 0;
  }, { passive: false });

  canvas.addEventListener("touchmove", (ev) => {
    ev.preventDefault();
    for (const t of ev.changedTouches) {
      if (t.identifier === touch.id) {
        touch.dx = t.clientX - touch.startX;
        touch.dy = t.clientY - touch.startY;
      }
    }
  }, { passive: false });

  canvas.addEventListener("touchend", (ev) => {
    for (const t of ev.changedTouches) {
      if (t.identifier === touch.id) {
        touch.active = false;
        touch.dx = 0;
        touch.dy = 0;
      }
    }
  });

  /* Inject touch direction into keysDown each frame */
  function applyTouchInput() {
    state.keysDown.delete("_touchL");
    state.keysDown.delete("_touchR");
    state.keysDown.delete("_touchU");
    state.keysDown.delete("_touchD");
    if (!touch.active) return;
    const mag = Math.hypot(touch.dx, touch.dy);
    if (mag < TOUCH_DEAD) return;
    const nx = touch.dx / mag;
    const ny = touch.dy / mag;
    if (nx < -0.38) state.keysDown.add("_touchL");
    if (nx > 0.38) state.keysDown.add("_touchR");
    if (ny < -0.38) state.keysDown.add("_touchU");
    if (ny > 0.38) state.keysDown.add("_touchD");
  }

  /* Draw on-screen touch hints during play */
  function drawTouchHints() {
    if (!isTouchDevice || state.mode !== "playing") return;
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = "#fff";
    ctx.font = "14px Trebuchet MS";
    ctx.textAlign = "left";
    ctx.fillText("Drag to move", 18, BASE_HEIGHT - 14);
    ctx.textAlign = "right";
    ctx.fillText("Tap right side to harvest", BASE_WIDTH - 18, BASE_HEIGHT - 14);
    ctx.restore();
  }

  /* Patch updatePlaying to also read touch keys */
  const origUpdatePlaying = updatePlaying;
  function patchedUpdatePlaying(dt) {
    applyTouchInput();
    origUpdatePlaying(dt);
  }

  /* Replace updatePlaying reference in update() */
  function update2(dt) {
    if (state.mode === "playing") {
      patchedUpdatePlaying(dt);
    } else {
      state.worldTime += dt;
    }
    render(dt);
    if (isTouchDevice) drawTouchHints();
  }

  /* Patch input reading to include touch keys */
  const origLeft = KEY.LEFT;
  const origRight = KEY.RIGHT;
  const origUp = KEY.UP;
  const origDown = KEY.DOWN;

  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("orientationchange", () => { setTimeout(resizeCanvas, 100); });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { state.keysDown.clear(); touch.active = false; touch.dx = 0; touch.dy = 0; }
  });

  resizeCanvas();
  render();
  if (rafId) cancelAnimationFrame(rafId);

  /* Override tick to use patched update */
  function tick2(ts) {
    const dt = Math.min(0.033, (ts - lastTs) / 1000);
    lastTs = ts;
    update2(dt);
    rafId = requestAnimationFrame(tick2);
  }
  rafId = requestAnimationFrame(tick2);
})();
