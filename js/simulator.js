var App = window.App || {};

App.Box = class {
  constructor() {
    this.isDefective = Math.random() < 0.35;
    this.appearance = this.isDefective ? 1 : 0;
    this.isVibrating = this.isDefective && Math.random() < 0.7;
    this.stability = this.isVibrating ? 1 : 0;
    this.color = this.isDefective ? '#E08A8A' : '#93BFBB';
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
  }

  generateBox() {
    this.currentBox = new App.Box();
    return this.currentBox;
  }

  executeAction(action) {
    const box = this.currentBox;
    if (!box) return { reward: 0, nextState: 0 };

    let reward;
    if (action === 1) {
      reward = box.isDefective ? 10 : -10;
    } else {
      reward = box.isDefective ? -20 : 1;
    }

    const nextBox = this.generateBox();
    return { reward: reward, nextState: nextBox.getState() };
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
    ctx.fillStyle = '#2F3640';
    ctx.fillRect(0, 0, this.W, this.H);

    ctx.fillStyle = '#414956';
    ctx.fillRect(0, this.beltY - 45, this.W, 90);

    ctx.strokeStyle = '#536173';
    ctx.lineWidth = 2;
    for (let x = 0; x < this.W; x += 40) {
      ctx.beginPath();
      ctx.arc(x + 20, this.beltY - 45, 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + 20, this.beltY + 45, 10, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = '#363D48';
    ctx.fillRect(0, 0, this.W, this.beltY - 55);
    ctx.fillRect(0, this.beltY + 55, this.W, this.H - (this.beltY + 55));
  }

  drawArm() {
    const ctx = this.ctx;
    const baseX = this.W * 0.52;
    const baseY = this.beltY - 70;

    ctx.fillStyle = '#536173';
    ctx.fillRect(baseX - 6, baseY - 30, 12, 30);

    ctx.fillStyle = '#4A5463';
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

    ctx.strokeStyle = '#93BFBB';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();

    ctx.fillStyle = '#A8D5D1';
    ctx.beginPath();
    ctx.arc(tipX, tipY, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = '10px monospace';
    ctx.fillStyle = '#93BFBB';
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
      ctx.fillStyle = 'rgba(224,138,138,0.3)';
      ctx.font = '16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('!', 0, -h / 2 - 4);
    }

    ctx.restore();
  }

  drawDecisionZone() {
    const ctx = this.ctx;
    const x = this.W * 0.52;
    ctx.strokeStyle = 'rgba(242,208,145,0.22)';
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, this.beltY - 50);
    ctx.lineTo(x, this.beltY + 50);
    ctx.stroke();
    ctx.setLineDash([]);

    if (this.showCursor) {
      ctx.fillStyle = '#F2D091';
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
      this.decisionEffect = { x: boxData.x, y: boxData.y, text: 'DESCARTAR', color: '#E08A8A' };
    } else {
      boxData.state = 'accepted';
      this.decisionEffect = { x: boxData.x, y: boxData.y, text: 'PASAR', color: '#93BFBB' };
    }
  }

  update() {
    const decisionX = this.W * 0.52;
    const speed = this.getSpeed();

    for (let i = this.boxes.length - 1; i >= 0; i--) {
      const bd = this.boxes[i];
      if (!bd) continue;
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
    this.chart = new App.ChartRenderer('chart-canvas');

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

    this.mode = 'rl';
    this.episodeRewardsRL = [];
    this.episodeRewardsRules = [];
    this.episodeRewardRules = 0;
    this.errorsRules = 0;
    this.lastUpdatedState = -1;
    this.lastUpdatedAction = -1;
    this.episodeOverlayTimer = null;

    this.setupControls();
    this.startNewEpisode();
  }

  setupControls() {
    document.getElementById('btn-train').addEventListener('click', () => {
      this.running = true;
      this.paused = false;
      document.getElementById('btn-pause').textContent = 'Pausa';
      this.loop();
    });
    document.getElementById('btn-pause').addEventListener('click', () => {
      this.paused = !this.paused;
      document.getElementById('btn-pause').textContent = this.paused ? 'Reanudar' : 'Pausa';
      if (!this.paused) this.loop();
    });
    document.getElementById('btn-speed').addEventListener('click', () => {
      if (this.speed === 2) {
        this.speed = 8;
        document.getElementById('btn-speed').textContent = 'x8';
      } else if (this.speed === 8) {
        this.speed = 20;
        document.getElementById('btn-speed').textContent = 'x20';
      } else {
        this.speed = 2;
        document.getElementById('btn-speed').textContent = 'x2';
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
    document.getElementById('btn-mode-rl').addEventListener('click', () => {
      this.mode = 'rl';
      document.getElementById('btn-mode-rl').classList.add('active');
      document.getElementById('btn-mode-rules').classList.remove('active');
      var ind = document.getElementById('mode-indicator');
      if (ind) { ind.textContent = 'Entrenando agente RL'; ind.className = 'mode-indicator rl-mode'; }
    });
    document.getElementById('btn-mode-rules').addEventListener('click', () => {
      this.mode = 'rules';
      document.getElementById('btn-mode-rules').classList.add('active');
      document.getElementById('btn-mode-rl').classList.remove('active');
      var ind = document.getElementById('mode-indicator');
      if (ind) { ind.textContent = 'Clasificador por reglas fijas'; ind.className = 'mode-indicator rules-mode'; }
    });
  }

  ruleBasedAction(box) {
    if (box.appearance === 1 || box.stability === 1) return 1;
    return 0;
  }

  computeRuleReward(boxData) {
    const box = boxData.box;
    const action = this.ruleBasedAction(box);
    if (action === 1) {
      return box.isDefective ? 10 : -10;
    } else {
      return box.isDefective ? -20 : 1;
    }
  }

  startNewEpisode() {
    this.episodeReward = 0;
    this.episodeRewardRules = 0;
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

    let action;
    if (this.mode === 'rules') {
      action = this.ruleBasedAction(boxData.box);
    } else {
      action = this.policy.selectAction(state, this.qtable);
    }

    var result = this.env.executeAction(action);
    this.renderer.animateDecision(boxData, action);

    if (this.mode === 'rl') {
      this.qtable.update(state, action, result.reward, result.nextState);
      this.lastUpdatedState = state;
      this.lastUpdatedAction = action;
      this.policy.decayEpsilon();
    }

    this.totalReward += result.reward;
    this.episodeReward += result.reward;
    this.totalSteps++;
    this.stepsThisEpisode++;

    if (result.reward < 0) this.errors++;

    const ruleReward = this.computeRuleReward(boxData);
    this.episodeRewardRules += ruleReward;
    if (ruleReward < 0) this.errorsRules++;

    if (this.stepsThisEpisode >= this.EPISODE_LENGTH) {
      var epScore = this.episodeReward;
      this.episodeRewardsRL.push(this.episodeReward);
      this.episodeRewardsRules.push(this.episodeRewardRules);
      this.chart.draw(this.episodeRewardsRL, this.episodeRewardsRules);
      var prevEpisode = this.episode;
      this.episode++;
      this.errors = 0;
      this.errorsRules = 0;
      this.episodeReward = 0;
      this.episodeRewardRules = 0;
      this.stepsThisEpisode = 0;
      this.renderer.clear();
      const newBox = this.env.generateBox();
      this.renderer.addBox(newBox);
      this.showEpisodeOverlay(prevEpisode, epScore);
    } else {
      const nextBox = this.env.currentBox;
      this.renderer.addBox(nextBox);
    }

    this.updateUI();
  }

  singleStep() {
    const decisionX = this.renderer.W * 0.52;
    for (var i = 0; i < this.renderer.boxes.length; i++) {
      var bd = this.renderer.boxes[i];
      if (!bd.decided && bd.state === 'entering') {
        bd.x = decisionX;
        this.decisionMadeThisFrame = false;
        this.handleDecision(bd);
        this.renderer.draw();
        return;
      }
    }
    var box = this.env.generateBox();
    this.renderer.addBox(box);
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
    const scoreEl = document.getElementById('score');
    const errorsEl = document.getElementById('errors');
    const episodeEl = document.getElementById('episode');
    const epsilonEl = document.getElementById('epsilon');
    const stepsEl = document.getElementById('total-steps');
    if (!scoreEl || !errorsEl || !episodeEl || !epsilonEl || !stepsEl) return;

    scoreEl.textContent = Math.round(this.episodeReward);
    errorsEl.textContent = this.errors;
    episodeEl.textContent = this.episode;
    epsilonEl.textContent = this.policy.epsilon.toFixed(3);
    stepsEl.textContent = this.totalSteps;

    scoreEl.className = this.episodeReward >= 0
      ? 'metric-value positive'
      : 'metric-value negative';
  }

  showEpisodeOverlay(epNum, score) {
    var overlay = document.getElementById('episode-overlay');
    if (!overlay) return;
    var titleEl = overlay.querySelector('.episode-overlay-title');
    var scoreEl = overlay.querySelector('.episode-overlay-score');
    if (!titleEl || !scoreEl) return;

    titleEl.textContent = 'Episodio ' + epNum + ' completado';
    scoreEl.textContent = (score >= 0 ? '+' : '') + Math.round(score);
    scoreEl.className = 'episode-overlay-score ' + (score >= 0 ? 'positive' : 'negative');
    overlay.classList.add('show');

    if (this.episodeOverlayTimer) clearTimeout(this.episodeOverlayTimer);
    this.episodeOverlayTimer = setTimeout(function () {
      overlay.classList.remove('show');
    }, 1200);
  }

  reset() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    this.running = false;
    this.paused = false;
    this.episode = 1;
    this.totalReward = 0;
    this.episodeReward = 0;
    this.episodeRewardRules = 0;
    this.errors = 0;
    this.errorsRules = 0;
    this.totalSteps = 0;
    this.speed = 2;
    this.episodeRewardsRL = [];
    this.episodeRewardsRules = [];
    this.qtable.reset();
    this.policy.reset();
    this.renderer.clear();
    this.chart.clear();
    document.getElementById('btn-pause').textContent = 'Pausa';
    document.getElementById('btn-speed').textContent = 'x2';
    this.startNewEpisode();
  }
};

App.ChartRenderer = class {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.W = this.canvas.width;
    this.H = this.canvas.height;
  }

  draw(rlData, rulesData) {
    var parentW = this.canvas.parentElement.clientWidth;
    if (!parentW) parentW = 960;
    this.canvas.width = parentW;
    this.canvas.height = 160;
    this.W = this.canvas.width;
    this.H = this.canvas.height;

    var ctx = this.ctx;
    var pad = { top: 20, right: 20, bottom: 30, left: 50 };
    var w = this.W - pad.left - pad.right;
    var h = this.H - pad.top - pad.bottom;
    if (w <= 0 || h <= 0) return;

    ctx.fillStyle = '#2F3640';
    ctx.fillRect(0, 0, this.W, this.H);

    ctx.strokeStyle = '#536173';
    ctx.lineWidth = 1;
    for (var i = 0; i <= 4; i++) {
      var gridY = pad.top + (h / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, gridY);
      ctx.lineTo(this.W - pad.right, gridY);
      ctx.stroke();
    }

    var allData = rlData.concat(rulesData);
    var maxVal = Math.max.apply(null, allData.concat([1]));
    var minVal = Math.min.apply(null, allData.concat([0]));
    var range = Math.max(Math.abs(maxVal), Math.abs(minVal), 50);
    var yMin = -range;
    var yMax = range;

    ctx.fillStyle = '#95A5A5';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    for (var i = 0; i <= 4; i++) {
      var val = yMin + ((yMax - yMin) / 4) * i;
      var labelY = pad.top + (h / 4) * (4 - i);
      ctx.fillText(Math.round(val), pad.left - 5, labelY + 3);
    }

    if (rlData.length >= 2) {
      ctx.strokeStyle = '#F2D091';
      ctx.setLineDash([]);
      ctx.lineWidth = 2;
      this.drawLine(rlData, pad, w, h, yMin, yMax);
      this.drawDots(rlData, pad, w, h, yMin, yMax, '#F2D091');
    }

    if (rulesData.length >= 2) {
      ctx.strokeStyle = '#95A5A5';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 2;
      this.drawLine(rulesData, pad, w, h, yMin, yMax);
      this.drawDots(rulesData, pad, w, h, yMin, yMax, '#95A5A5');
      ctx.setLineDash([]);
    }

    ctx.fillStyle = '#95A5A5';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    var maxEp = Math.max(rlData.length, 1);
    var step = Math.max(1, Math.floor(maxEp / 8));
    for (var i = 1; i <= maxEp; i += step) {
      var x = pad.left + (w * (i - 1)) / Math.max(maxEp - 1, 1);
      ctx.fillText(i, x, this.H - 8);
    }
    ctx.fillText('Episodio', this.W / 2, this.H - 2);
  }

  drawLine(data, pad, w, h, yMin, yMax) {
    var ctx = this.ctx;
    if (data.length < 2) return;
    ctx.beginPath();
    for (var i = 0; i < data.length; i++) {
      var x = pad.left + (w * i) / Math.max(data.length - 1, 1);
      var y = pad.top + h * (1 - (data[i] - yMin) / (yMax - yMin));
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  drawDots(data, pad, w, h, yMin, yMax, color) {
    var ctx = this.ctx;
    ctx.fillStyle = color;
    for (var i = 0; i < data.length; i++) {
      var x = pad.left + (w * i) / Math.max(data.length - 1, 1);
      var y = pad.top + h * (1 - (data[i] - yMin) / (yMax - yMin));
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  clear() {
    if (this.canvas) {
      this.canvas.width = this.canvas.parentElement.clientWidth || 960;
      this.canvas.height = 160;
    }
  }
};
