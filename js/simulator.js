const App = window.App || {};

App.Box = class {
  constructor() {
    this.isDefective = Math.random() < 0.35;
    this.appearance = this.isDefective ? 1 : 0;
    this.isVibrating = this.isDefective && Math.random() < 0.7;
    this.stability = this.isVibrating ? 1 : 0;
    this.color = this.isDefective ? '#d64045' : '#5a9e6f';
    this.shape = this.isDefective ? 'deformed' : 'normal';
    this.wobbleOffset = 0;
    this.wobbleSpeed = 1 + Math.random() * 2;
  }

  getState() {
    return this.appearance * 2 + this.stability;
  }

  getProperties() {
    return {
      appearance: this.appearance ? 'Alterada' : 'Normal',
      stability: this.stability ? 'Vibrando' : 'Fija',
      isDefective: this.isDefective,
      isVibrating: this.isVibrating,
      color: this.color,
      shape: this.shape,
    };
  }
};

App.Environment = class {
  constructor() {
    this.currentBox = null;
    this.reward = 0;
  }

  generateBox() {
    this.currentBox = new App.Box();
    this.reward = 0;
    return this.currentBox;
  }

  executeAction(action) {
    const box = this.currentBox;
    if (!box) return { reward: 0, nextState: 0 };

    if (action === 1) {
      this.reward = box.isDefective ? 10 : -10;
    } else {
      this.reward = box.isDefective ? -20 : 1;
    }

    const nextBox = this.generateBox();
    return { reward: this.reward, nextState: nextBox.getState() };
  }
};

App.Renderer = class {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    this.boxes = [];
    this.armState = 'idle';
    this.armTimer = 0;
    this.decisionEffect = null;
    this.showCursor = true;
    this.cursorTimer = 0;

    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const container = this.canvas.parentElement;
    this.W = this.canvas.width = Math.min(container.clientWidth, 960);
    this.H = this.canvas.height = 420;
    this.beltY = this.H * 0.5;
  }

  getSpeed() {
    return App.controller ? App.controller.speed : 2;
  }

  drawBackground() {
    const ctx = this.ctx;
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, this.W, this.H);

    ctx.fillStyle = '#2d2d44';
    ctx.fillRect(0, this.beltY - 45, this.W, 90);

    ctx.strokeStyle = '#3d3d5c';
    ctx.lineWidth = 2;
    for (let x = 0; x < this.W; x += 40) {
      ctx.beginPath();
      ctx.arc(x + 20, this.beltY - 45, 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + 20, this.beltY + 45, 10, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = '#2a2a40';
    ctx.fillRect(0, 0, this.W, this.beltY - 55);
    ctx.fillRect(0, this.beltY + 55, this.W, this.H - (this.beltY + 55));
  }

  drawArm() {
    const ctx = this.ctx;
    const baseX = this.W * 0.52;
    const baseY = this.beltY - 70;

    ctx.fillStyle = '#6b7b8d';
    ctx.fillRect(baseX - 6, baseY - 30, 12, 30);

    ctx.fillStyle = '#4a5568';
    ctx.beginPath();
    ctx.arc(baseX, baseY, 8, 0, Math.PI * 2);
    ctx.fill();

    let armAngle = -Math.PI / 2;
    if (this.armState === 'pushing') {
      const progress = this.armTimer / 15;
      armAngle = -Math.PI / 2 + (progress * Math.PI * 0.6);
    } else if (this.armState === 'retracting') {
      const progress = 1 - this.armTimer / 15;
      armAngle = -Math.PI / 2 + (progress * Math.PI * 0.6);
    }

    const armLen = 60;
    const tipX = baseX + Math.cos(armAngle) * armLen;
    const tipY = baseY + Math.sin(armAngle) * armLen;

    ctx.strokeStyle = '#8899aa';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();

    ctx.fillStyle = '#a0b0c0';
    ctx.beginPath();
    ctx.arc(tipX, tipY, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = '10px monospace';
    ctx.fillStyle = '#8899aa';
    ctx.textAlign = 'center';
    if (this.armState === 'idle') ctx.fillText('ESPERANDO', baseX, baseY - 40);
    else if (this.armState === 'pushing') ctx.fillText('DESCARTANDO', baseX, baseY - 40);
    else if (this.armState === 'retracting') ctx.fillText('RETRAYENDO', baseX, baseY - 40);
  }

  drawBox(x, y, box, alpha = 1) {
    const ctx = this.ctx;
    const w = 55;
    const h = 40;
    ctx.save();
    ctx.globalAlpha = alpha;

    const wobble = box.isVibrating ? Math.sin(box.wobbleOffset) * 3 : 0;
    ctx.translate(x, y + wobble);

    if (box.shape === 'deformed') {
      ctx.transform(1, 0.05, -0.03, 1, 0, 0);
    }

    ctx.fillStyle = box.color;
    ctx.fillRect(-w / 2, -h / 2, w, h);

    ctx.strokeStyle = '#ffffff22';
    ctx.lineWidth = 2;
    ctx.strokeRect(-w / 2, -h / 2, w, h);

    ctx.fillStyle = '#ffffff44';
    ctx.fillRect(-w / 2 + 4, -h / 2 + 4, w / 3, h - 8);

    ctx.strokeStyle = '#ffffff66';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-w / 2, 0);
    ctx.lineTo(w / 2, 0);
    ctx.stroke();

    if (box.isVibrating) {
      ctx.fillStyle = '#ffcc0033';
      ctx.font = '16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('⚠', 0, -h / 2 - 4);
    }

    ctx.restore();
  }

  drawDecisionZone() {
    const ctx = this.ctx;
    const x = this.W * 0.52;
    ctx.strokeStyle = '#ffd70022';
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, this.beltY - 50);
    ctx.lineTo(x, this.beltY + 50);
    ctx.stroke();
    ctx.setLineDash([]);

    if (this.showCursor) {
      ctx.fillStyle = '#ffd700';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.beginPath();
      ctx.arc(x, this.beltY - 50, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText('ZONA DE DECISION', x, this.beltY - 60);
    }
  }

  addBox(box) {
    this.boxes.push({
      box: box,
      x: -60,
      y: this.beltY,
      state: 'entering',
      decided: false,
      action: null,
      vy: 0,
      alpha: 1,
    });
  }

  animateDecision(boxData, action) {
    boxData.decided = true;
    boxData.action = action;
    this.showCursor = false;
    this.cursorTimer = 20;

    if (action === 1) {
      boxData.state = 'rejected';
      boxData.vy = -2;
      this.armState = 'pushing';
      this.armTimer = 0;
      this.decisionEffect = { x: boxData.x, y: boxData.y, text: 'DESCARTAR', color: '#d64045' };
    } else {
      boxData.state = 'accepted';
      this.decisionEffect = { x: boxData.x, y: boxData.y, text: 'PASAR', color: '#5a9e6f' };
    }
  }

  update() {
    const decisionX = this.W * 0.52;
    const speed = this.getSpeed();

    for (let i = this.boxes.length - 1; i >= 0; i--) {
      const bd = this.boxes[i];
      bd.box.wobbleOffset += 0.05 * bd.box.wobbleSpeed;

      if (bd.state === 'entering') {
        bd.x += speed;
        if (bd.x >= decisionX && !bd.decided) {
          if (App.controller) {
            App.controller.handleDecision(bd);
          }
        }
        if (bd.x > this.W + 80) {
          this.boxes.splice(i, 1);
        }
      } else if (bd.state === 'accepted') {
        bd.x += speed * 1.2;
        if (bd.x > this.W + 80) {
          this.boxes.splice(i, 1);
        }
      } else if (bd.state === 'rejected') {
        bd.vy += 0.3;
        bd.y += bd.vy;
        bd.alpha -= 0.02;
        if (bd.y > this.H + 50 || bd.alpha <= 0) {
          this.boxes.splice(i, 1);
        }
      }
    }

    if (this.armState === 'pushing') {
      this.armTimer++;
      if (this.armTimer > 15) {
        this.armState = 'retracting';
        this.armTimer = 0;
      }
    } else if (this.armState === 'retracting') {
      this.armTimer++;
      if (this.armTimer > 15) {
        this.armState = 'idle';
        this.armTimer = 0;
      }
    }

    if (this.decisionEffect) {
      this.decisionEffect.y -= 0.8;
      this.decisionEffect.alpha = (this.decisionEffect.alpha || 1) - 0.02;
      if (this.decisionEffect.alpha <= 0) {
        this.decisionEffect = null;
      }
    }

    if (this.cursorTimer > 0) {
      this.cursorTimer--;
      if (this.cursorTimer <= 0) {
        this.showCursor = true;
      }
    }
  }

  draw() {
    this.drawBackground();

    for (const bd of this.boxes) {
      this.drawBox(bd.x, bd.y, bd.box, bd.alpha);
    }

    this.drawDecisionZone();
    this.drawArm();

    if (this.decisionEffect) {
      const ctx = this.ctx;
      ctx.save();
      ctx.globalAlpha = this.decisionEffect.alpha || 1;
      ctx.fillStyle = this.decisionEffect.color;
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this.decisionEffect.text, this.decisionEffect.x, this.decisionEffect.y - 30);
      ctx.restore();
    }
  }

  clear() {
    this.boxes = [];
    this.armState = 'idle';
    this.armTimer = 0;
    this.decisionEffect = null;
    this.showCursor = true;
    this.cursorTimer = 0;
  }
};

App.SimController = class {
  constructor() {
    this.qtable = new App.QTable(4, 2);
    this.policy = new App.EpsilonGreedy();
    this.env = new App.Environment();
    this.renderer = new App.Renderer('simulator-canvas');

    this.episode = 1;
    this.totalReward = 0;
    this.episodeReward = 0;
    this.errors = 0;
    this.totalSteps = 0;
    this.running = false;
    this.paused = false;
    this.speed = 2;
    this.stepsThisEpisode = 0;
    this.EPISODE_LENGTH = 30;
    this.animFrameId = null;
    this.decisionMadeThisFrame = false;

    this.setupControls();
    this.startNewEpisode();
  }

  setupControls() {
    document.getElementById('btn-train').addEventListener('click', () => {
      this.running = true;
      this.paused = false;
      document.getElementById('btn-pause').textContent = '⏸ Pausa';
      this.loop();
    });
    document.getElementById('btn-pause').addEventListener('click', () => {
      this.paused = !this.paused;
      document.getElementById('btn-pause').textContent = this.paused ? '▶ Reanudar' : '⏸ Pausa';
      if (!this.paused) this.loop();
    });
    document.getElementById('btn-speed').addEventListener('click', () => {
      if (this.speed === 2) {
        this.speed = 8;
        document.getElementById('btn-speed').textContent = '⏩ x8';
      } else if (this.speed === 8) {
        this.speed = 20;
        document.getElementById('btn-speed').textContent = '⏩ x20';
      } else {
        this.speed = 2;
        document.getElementById('btn-speed').textContent = '⏩ x2';
      }
    });
    document.getElementById('btn-reset').addEventListener('click', () => {
      this.reset();
    });
    document.getElementById('btn-step').addEventListener('click', () => {
      if (!this.running || this.paused) {
        this.singleStep();
      }
    });
  }

  startNewEpisode() {
    this.episodeReward = 0;
    this.stepsThisEpisode = 0;
    this.renderer.clear();
    const box = this.env.generateBox();
    this.renderer.addBox(box);
    this.updateUI();
  }

  handleDecision(boxData) {
    if (this.decisionMadeThisFrame) return;
    if (boxData.decided) return;
    this.decisionMadeThisFrame = true;

    const state = boxData.box.getState();
    const action = this.policy.selectAction(state, this.qtable);

    const result = this.env.executeAction(action);
    this.renderer.animateDecision(boxData, action);

    this.qtable.update(state, action, result.reward, result.nextState);

    this.policy.decayEpsilon();
    this.totalReward += result.reward;
    this.episodeReward += result.reward;
    this.totalSteps++;
    this.stepsThisEpisode++;

    if (result.reward < 0) this.errors++;

    if (this.stepsThisEpisode >= this.EPISODE_LENGTH) {
      this.episode++;
      this.errors = 0;
      this.startNewEpisode();
    } else {
      const nextBox = this.env.currentBox;
      this.renderer.addBox(nextBox);
    }

    this.updateUI();
  }

  singleStep() {
    const decisionX = this.renderer.W * 0.52;
    for (const bd of this.renderer.boxes) {
      if (!bd.decided && bd.state === 'entering') {
        bd.x = decisionX;
        this.decisionMadeThisFrame = false;
        this.handleDecision(bd);
        this.renderer.update();
        this.renderer.draw();
        return;
      }
    }
    const box = this.env.generateBox();
    this.renderer.addBox(box);
    this.renderer.update();
    this.renderer.draw();
  }

  loop() {
    if (!this.running || this.paused) return;

    this.decisionMadeThisFrame = false;
    this.renderer.update();
    this.renderer.draw();

    if (this.renderer.boxes.length === 0) {
      const box = this.env.generateBox();
      this.renderer.addBox(box);
    }

    this.animFrameId = requestAnimationFrame(() => this.loop());
  }

  updateUI() {
    document.getElementById('score').textContent = Math.round(this.episodeReward);
    document.getElementById('errors').textContent = this.errors;
    document.getElementById('episode').textContent = this.episode;
    document.getElementById('epsilon').textContent = this.policy.epsilon.toFixed(3);
    document.getElementById('total-steps').textContent = this.totalSteps;

    document.getElementById('score').className =
      this.episodeReward >= 0 ? 'metric-value positive' : 'metric-value negative';
  }

  reset() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    this.running = false;
    this.paused = false;
    this.episode = 1;
    this.totalReward = 0;
    this.episodeReward = 0;
    this.errors = 0;
    this.totalSteps = 0;
    this.speed = 2;
    this.qtable.reset();
    this.policy.reset();
    this.renderer.clear();
    document.getElementById('btn-pause').textContent = '⏸ Pausa';
    document.getElementById('btn-speed').textContent = '⏩ x2';
    this.startNewEpisode();
  }
};
