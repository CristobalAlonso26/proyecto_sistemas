// Simulación de La Fábrica: cinta transportadora, brazo robótico y gráfica de recompensas.
// Contiene las clases Box, Environment, Renderer, SimController y ChartRenderer.

// Box: modelo de una caja en la cinta transportadora

App.Box = class {
  constructor() {
    // 35% de probabilidad de ser defectuosa
    this.isDefective = Math.random() < 0.35;
    // Apariencia: 0 = normal (verde), 1 = alterada (rojiza)
    this.appearance = this.isDefective ? 1 : 0;
    // Vibración: 70% de las defectuosas vibran; las normales nunca
    this.isVibrating = this.isDefective && Math.random() < 0.7;
    this.stability = this.isVibrating ? 1 : 0;
    this.color = this.isDefective ? '#E08A8A' : '#93BFBB';
    this.shape = this.isDefective ? 'deformed' : 'normal';
    // Parámetros para la animación de temblor
    this.wobbleOffset = 0;
    this.wobbleSpeed = 1 + Math.random() * 2;
  }

  // Codifica el estado como entero: appearance*2 + stability → {0,1,2,3}
  getState() {
    return this.appearance * 2 + this.stability;
  }
};


// Environment: entorno MDP que genera cajas y ejecuta acciones

App.Environment = class {
  constructor() {
    this.currentBox = null;
  }

  // Crea una nueva caja y la pone en la cinta
  generateBox() {
    this.currentBox = new App.Box();
    return this.currentBox;
  }

  // Ejecuta una acción sobre la caja actual y retorna {reward, nextState}
  executeAction(action) {
    const box = this.currentBox;
    if (!box) return { reward: 0, nextState: 0 };
    const reward = App.Environment.computeReward(action, box.isDefective);
    const nextBox = this.generateBox();
    return { reward: reward, nextState: nextBox.getState() };
  }
};

// Función pura de recompensa compartida (evita duplicación)
// Acción 0 = dejar pasar, Acción 1 = descartar
App.Environment.computeReward = function(action, isDefective) {
  if (action === 1) return isDefective ? 10 : -10;   // descartar: +10 acierto, -10 error
  return isDefective ? -20 : 1;                       // pasar: -20 fallo crítico, +1 ok
};


// Renderer: dibuja toda la simulación en un canvas 2D

App.Renderer = class {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    // Cajas activas en pantalla
    this.boxes = [];
    // Máquina de estados del brazo: idle → pushing → retracting → idle
    this.armState = 'idle';
    this.armTimer = 0;
    // Efecto de texto flotante tras cada decisión
    this.decisionEffect = null;
    // Cursor intermitente en la zona de decisión
    this.showCursor = true;
    this.cursorTimer = 0;

    window.addEventListener('resize', () => this.resize());
  }

  // Ajusta el canvas al ancho del contenedor
  resize() {
    const container = this.canvas.parentElement;
    this.W = this.canvas.width = Math.min(container.clientWidth, 960);
    this.H = this.canvas.height = 420;
    this.beltY = this.H * 0.5;
  }

  // Fondo: cinta transportadora con rodillos
  drawBackground() {
    const ctx = this.ctx;
    ctx.fillStyle = '#2F3640';
    ctx.fillRect(0, 0, this.W, this.H);

    // Cuerpo de la cinta
    ctx.fillStyle = '#414956';
    ctx.fillRect(0, this.beltY - 45, this.W, 90);

    // Rodillos (círculos en bordes superior e inferior)
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

    // Paneles superior e inferior de la máquina
    ctx.fillStyle = '#363D48';
    ctx.fillRect(0, 0, this.W, this.beltY - 55);
    ctx.fillRect(0, this.beltY + 55, this.W, this.H - (this.beltY + 55));
  }

  // Brazo robótico con animación de empuje y retracción
  drawArm() {
    const ctx = this.ctx;
    const baseX = this.W * 0.52;
    const baseY = this.beltY - 70;

    // Soporte vertical
    ctx.fillStyle = '#536173';
    ctx.fillRect(baseX - 6, baseY - 30, 12, 30);

    // Base circular
    ctx.fillStyle = '#4A5463';
    ctx.beginPath();
    ctx.arc(baseX, baseY, 8, 0, Math.PI * 2);
    ctx.fill();

    // Ángulo del brazo según el estado de la animación
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

    // Brazo
    ctx.strokeStyle = '#93BFBB';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();

    // Punta del brazo
    ctx.fillStyle = '#A8D5D1';
    ctx.beginPath();
    ctx.arc(tipX, tipY, 6, 0, Math.PI * 2);
    ctx.fill();

    // Etiqueta de estado
    ctx.font = '10px monospace';
    ctx.fillStyle = '#93BFBB';
    ctx.textAlign = 'center';
    if (this.armState === 'idle') ctx.fillText('ESPERANDO', baseX, baseY - 40);
    else if (this.armState === 'pushing') ctx.fillText('DESCARTANDO', baseX, baseY - 40);
    else if (this.armState === 'retracting') ctx.fillText('RETRAYENDO', baseX, baseY - 40);
  }

  // Dibuja una caja individual con efectos visuales
  drawBox(x, y, box, alpha = 1) {
    const ctx = this.ctx;
    const w = 55;
    const h = 40;
    ctx.save();
    ctx.globalAlpha = alpha;

    // Vibración vertical si corresponde
    const wobble = box.isVibrating ? Math.sin(box.wobbleOffset) * 3 : 0;
    ctx.translate(x, y + wobble);

    // Deformación por bordes irregulares
    if (box.shape === 'deformed') {
      ctx.transform(1, 0.05, -0.03, 1, 0, 0);
    }

    // Cuerpo de la caja
    ctx.fillStyle = box.color;
    ctx.fillRect(-w / 2, -h / 2, w, h);

    // Borde
    ctx.strokeStyle = '#ffffff22';
    ctx.lineWidth = 2;
    ctx.strokeRect(-w / 2, -h / 2, w, h);

    // Brillo (reflejo)
    ctx.fillStyle = '#ffffff44';
    ctx.fillRect(-w / 2 + 4, -h / 2 + 4, w / 3, h - 8);

    // Línea central
    ctx.strokeStyle = '#ffffff66';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-w / 2, 0);
    ctx.lineTo(w / 2, 0);
    ctx.stroke();

    // Indicador "!" sobre cajas que vibran
    if (box.isVibrating) {
      ctx.fillStyle = 'rgba(224,138,138,0.3)';
      ctx.font = '16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('!', 0, -h / 2 - 4);
    }

    ctx.restore();
  }

  // Línea punteada y cursor en la zona de decisión
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

  // Agrega una caja al pipeline de renderizado (aparece por la izquierda)
  addBox(box) {
    this.boxes.push({
      box: box,
      x: -60,
      y: this.beltY,
      state: 'entering',     // entering → accepted/rejected
      decided: false,
      action: null,
      vy: 0,                 // velocidad vertical (para caja descartada)
      alpha: 1,              // opacidad (para fade-out al descartar)
    });
  }

  // Inicia la animación de decisión sobre una caja
  animateDecision(boxData, action) {
    boxData.decided = true;
    boxData.action = action;
    this.showCursor = false;
    this.cursorTimer = 20;   // frames hasta que reaparezca el cursor

    if (action === 1) {
      // Descartar: caja sale volando hacia abajo, brazo empuja
      boxData.state = 'rejected';
      boxData.vy = -2;
      this.armState = 'pushing';
      this.armTimer = 0;
      this.decisionEffect = { x: boxData.x, y: boxData.y, text: 'DESCARTAR', color: '#E08A8A' };
    } else {
      // Dejar pasar: caja sigue su camino
      boxData.state = 'accepted';
      this.decisionEffect = { x: boxData.x, y: boxData.y, text: 'PASAR', color: '#93BFBB' };
    }
  }

  // Actualiza posiciones, animaciones y dispara decisiones (un frame)
  update(speed) {
    const effectiveSpeed = speed || 2;
    const decisionX = this.W * 0.52;

    // Recorremos de atrás hacia adelante para poder eliminar elementos
    for (let i = this.boxes.length - 1; i >= 0; i--) {
      const bd = this.boxes[i];
      if (!bd) continue;
      bd.box.wobbleOffset += 0.05 * bd.box.wobbleSpeed;

      if (bd.state === 'entering') {
        bd.x += effectiveSpeed;
        // Al llegar a la zona de decisión, el controlador toma la decisión
        if (bd.x >= decisionX && !bd.decided) {
          if (App.controller) {
            App.controller.handleDecision(bd);
          }
        }
        // Eliminar si salió de pantalla sin decidir (no debería ocurrir)
        if (bd.x > this.W + 80) {
          this.boxes.splice(i, 1);
        }
      } else if (bd.state === 'accepted') {
        bd.x += effectiveSpeed * 1.2;
        if (bd.x > this.W + 80) {
          this.boxes.splice(i, 1);
        }
      } else if (bd.state === 'rejected') {
        // Caída con fade-out
        bd.vy += 0.3;
        bd.y += bd.vy;
        bd.alpha -= 0.02;
        if (bd.y > this.H + 50 || bd.alpha <= 0) {
          this.boxes.splice(i, 1);
        }
      }
    }

    // Máquina de estados del brazo: pushing → retracting → idle
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

    // Efecto de texto flotante: sube y se desvanece
    if (this.decisionEffect) {
      this.decisionEffect.y -= 0.8;
      this.decisionEffect.alpha = (this.decisionEffect.alpha || 1) - 0.02;
      if (this.decisionEffect.alpha <= 0) {
        this.decisionEffect = null;
      }
    }

    // Temporizador para reaparecer el cursor tras una decisión
    if (this.cursorTimer > 0) {
      this.cursorTimer--;
      if (this.cursorTimer <= 0) {
        this.showCursor = true;
      }
    }
  }

  // Renderiza un frame completo
  draw() {
    this.drawBackground();

    for (const bd of this.boxes) {
      this.drawBox(bd.x, bd.y, bd.box, bd.alpha);
    }

    this.drawDecisionZone();
    this.drawArm();

    // Texto flotante de la última decisión
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

  // Reinicia el estado visual del renderer
  clear() {
    this.boxes = [];
    this.armState = 'idle';
    this.armTimer = 0;
    this.decisionEffect = null;
    this.showCursor = true;
    this.cursorTimer = 0;
  }
};


// SimController: orquesta Q-Learning, entorno, renderer y gráfica

App.SimController = class {
  constructor() {
    // Motor RL: 4 estados × 2 acciones
    this.qtable = new App.QTable(4, 2);
    this.policy = new App.EpsilonGreedy();
    this.env = new App.Environment();
    this.renderer = new App.Renderer('simulator-canvas');
    this.chart = new App.ChartRenderer('chart-canvas');

    // Métricas y estado de la simulación
    this.episode = 1;
    this.episodeReward = 0;
    this.errors = 0;              // errores en el episodio actual
    this.totalSteps = 0;          // pasos totales acumulados (no se resetea por episodio)
    this.running = false;
    this.paused = false;
    this.speed = 2;               // 2, 8 o 20
    this.stepsThisEpisode = 0;
    this.EPISODE_LENGTH = 30;     // cajas por episodio
    this.animFrameId = null;
    this.decisionMadeThisFrame = false;  // evita decisiones duplicadas en el mismo frame

    // Modo: 'rl' (agente Q-Learning) o 'rules' (clasificador fijo)
    this.mode = 'rl';
    // Historial de recompensas por episodio para la gráfica
    this.episodeRewardsRL = [];
    this.episodeRewardsRules = [];
    this.episodeRewardRules = 0;
    this.errorsRules = 0;
    // Celdas actualizadas en el último paso (para animar la Q-Table)
    this.lastUpdatedState = -1;
    this.lastUpdatedAction = -1;
    this.episodeOverlayTimer = null;

    this.setupControls();
    this.startNewEpisode();
  }

  // Conecta los botones de la interfaz con sus handlers
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
      let ind = document.getElementById('mode-indicator');
      if (ind) { ind.textContent = 'Entrenando agente RL'; ind.className = 'mode-indicator rl-mode'; }
    });
    document.getElementById('btn-mode-rules').addEventListener('click', () => {
      this.mode = 'rules';
      document.getElementById('btn-mode-rules').classList.add('active');
      document.getElementById('btn-mode-rl').classList.remove('active');
      let ind = document.getElementById('mode-indicator');
      if (ind) { ind.textContent = 'Clasificador por reglas fijas'; ind.className = 'mode-indicator rules-mode'; }
    });
  }

  // Clasificador por reglas fijas: si apariencia alterada o vibra → descartar
  ruleBasedAction(box) {
    if (box.appearance === 1 || box.stability === 1) return 1;
    return 0;
  }

  // Calcula la recompensa que habría obtenido el clasificador fijo
  computeRuleReward(boxData) {
    const box = boxData.box;
    const action = this.ruleBasedAction(box);
    return App.Environment.computeReward(action, box.isDefective);
  }

  // Prepara el inicio de un nuevo episodio
  startNewEpisode() {
    this.episodeReward = 0;
    this.episodeRewardRules = 0;
    this.stepsThisEpisode = 0;
    this.renderer.clear();
    const box = this.env.generateBox();
    this.renderer.addBox(box);
    this.updateUI();
  }

  // Llamado por el Renderer cuando una caja llega a la zona de decisión
  handleDecision(boxData) {
    if (this.decisionMadeThisFrame) return;
    if (boxData.decided) return;
    this.decisionMadeThisFrame = true;

    const state = boxData.box.getState();

    // Seleccionar acción según el modo actual
    let action;
    if (this.mode === 'rules') {
      action = this.ruleBasedAction(boxData.box);
    } else {
      action = this.policy.selectAction(state, this.qtable);
    }

    let result = this.env.executeAction(action);
    this.renderer.animateDecision(boxData, action);

    // Solo en modo RL se actualiza la Q-Table y decae epsilon
    if (this.mode === 'rl') {
      this.qtable.update(state, action, result.reward, result.nextState);
      this.lastUpdatedState = state;
      this.lastUpdatedAction = action;
      this.policy.decayEpsilon();
    }

    // Acumular métricas
    this.episodeReward += result.reward;
    this.totalSteps++;
    this.stepsThisEpisode++;

    if (result.reward < 0) this.errors++;

    // Recompensa del clasificador fijo (para comparar en la gráfica)
    const ruleReward = this.computeRuleReward(boxData);
    this.episodeRewardRules += ruleReward;
    if (ruleReward < 0) this.errorsRules++;

    // ¿Fin del episodio?
    if (this.stepsThisEpisode >= this.EPISODE_LENGTH) {
      let epScore = this.episodeReward;
      this.episodeRewardsRL.push(this.episodeReward);
      this.episodeRewardsRules.push(this.episodeRewardRules);
      this.chart.draw(this.episodeRewardsRL, this.episodeRewardsRules);
      let prevEpisode = this.episode;
      this.episode++;
      // Resetear métricas por episodio
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

  // Avanza un solo paso (modo manual)
  singleStep() {
    const decisionX = this.renderer.W * 0.52;
    // Buscar la primera caja no decidida y forzar decisión
    for (let i = 0; i < this.renderer.boxes.length; i++) {
      let bd = this.renderer.boxes[i];
      if (!bd.decided && bd.state === 'entering') {
        bd.x = decisionX;
        this.decisionMadeThisFrame = false;
        this.handleDecision(bd);
        this.renderer.draw();
        return;
      }
    }
    // Si no hay cajas pendientes, generar una nueva
    let box = this.env.generateBox();
    this.renderer.addBox(box);
    this.renderer.draw();
  }

  // Bucle principal de animación (requestAnimationFrame)
  loop() {
    if (!this.running || this.paused) return;

    this.decisionMadeThisFrame = false;
    this.renderer.update(this.speed);
    this.renderer.draw();

    // Si se vació la cinta, agregar una caja nueva
    if (this.renderer.boxes.length === 0) {
      const box = this.env.generateBox();
      this.renderer.addBox(box);
    }

    this.animFrameId = requestAnimationFrame(() => this.loop());
  }

  // Actualiza los indicadores numéricos de la barra de métricas
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

  // Overlay que aparece brevemente al completar un episodio
  showEpisodeOverlay(epNum, score) {
    let overlay = document.getElementById('episode-overlay');
    if (!overlay) return;
    let titleEl = overlay.querySelector('.episode-overlay-title');
    let scoreEl = overlay.querySelector('.episode-overlay-score');
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

  // Reinicia todo: Q-Table, política, métricas, renderer, gráfica
  reset() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    this.running = false;
    this.paused = false;
    this.episode = 1;
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


// ChartRenderer: gráfica de líneas de recompensa por episodio
// Compara agente RL (línea dorada) vs clasificador fijo (línea gris punteada)

App.ChartRenderer = class {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.W = this.canvas.width;
    this.H = this.canvas.height;
  }

  // Dibuja la gráfica completa con los datos acumulados de ambos modos
  draw(rlData, rulesData) {
    let parentW = this.canvas.parentElement.clientWidth;
    if (!parentW) parentW = 960;
    this.canvas.width = parentW;
    this.canvas.height = 160;
    this.W = this.canvas.width;
    this.H = this.canvas.height;

    let ctx = this.ctx;
    let pad = { top: 20, right: 20, bottom: 30, left: 50 };
    let w = this.W - pad.left - pad.right;
    let h = this.H - pad.top - pad.bottom;
    if (w <= 0 || h <= 0) return;

    // Fondo
    ctx.fillStyle = '#2F3640';
    ctx.fillRect(0, 0, this.W, this.H);

    // Cuadrícula horizontal (4 líneas)
    ctx.strokeStyle = '#536173';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      let gridY = pad.top + (h / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, gridY);
      ctx.lineTo(this.W - pad.right, gridY);
      ctx.stroke();
    }

    // Calcular rango Y simétrico
    let allData = rlData.concat(rulesData);
    let maxVal = Math.max.apply(null, allData.concat([1]));
    let minVal = Math.min.apply(null, allData.concat([0]));
    let range = Math.max(Math.abs(maxVal), Math.abs(minVal), 50);
    let yMin = -range;
    let yMax = range;

    // Etiquetas del eje Y
    ctx.fillStyle = '#95A5A5';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      let val = yMin + ((yMax - yMin) / 4) * i;
      let labelY = pad.top + (h / 4) * (4 - i);
      ctx.fillText(Math.round(val), pad.left - 5, labelY + 3);
    }

    // Línea RL (dorada, sólida)
    if (rlData.length >= 2) {
      ctx.strokeStyle = '#F2D091';
      ctx.setLineDash([]);
      ctx.lineWidth = 2;
      this.drawLine(rlData, pad, w, h, yMin, yMax);
      this.drawDots(rlData, pad, w, h, yMin, yMax, '#F2D091');
    }

    // Línea reglas fijas (gris, punteada)
    if (rulesData.length >= 2) {
      ctx.strokeStyle = '#95A5A5';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 2;
      this.drawLine(rulesData, pad, w, h, yMin, yMax);
      this.drawDots(rulesData, pad, w, h, yMin, yMax, '#95A5A5');
      ctx.setLineDash([]);
    }

    // Etiquetas del eje X (números de episodio)
    ctx.fillStyle = '#95A5A5';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    let maxEp = Math.max(rlData.length, 1);
    let step = Math.max(1, Math.floor(maxEp / 8));
    for (let i = 1; i <= maxEp; i += step) {
      let x = pad.left + (w * (i - 1)) / Math.max(maxEp - 1, 1);
      ctx.fillText(i, x, this.H - 8);
    }
    ctx.fillText('Episodio', this.W / 2, this.H - 2);
  }

  // Traza una línea conectando los puntos de datos
  drawLine(data, pad, w, h, yMin, yMax) {
    let ctx = this.ctx;
    if (data.length < 2) return;
    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
      let x = pad.left + (w * i) / Math.max(data.length - 1, 1);
      let y = pad.top + h * (1 - (data[i] - yMin) / (yMax - yMin));
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Dibuja círculos en cada punto de datos
  drawDots(data, pad, w, h, yMin, yMax, color) {
    let ctx = this.ctx;
    ctx.fillStyle = color;
    for (let i = 0; i < data.length; i++) {
      let x = pad.left + (w * i) / Math.max(data.length - 1, 1);
      let y = pad.top + h * (1 - (data[i] - yMin) / (yMax - yMin));
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Limpia explícitamente y restaura tamaño del canvas
  clear() {
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    if (this.canvas) {
      this.canvas.width = this.canvas.parentElement.clientWidth || 960;
      this.canvas.height = 160;
    }
  }
};
