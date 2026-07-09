// Motor de Aprendizaje por Refuerzo: Q-Table tabular + política Epsilon-Greedy

const App = window.App || {};

// Tabla Q: almacena el valor Q(s,a) para cada par estado-acción.
// La actualización usa la ecuación de Bellman:
//   Q(s,a) ← Q(s,a) + α [ r + γ · max_a' Q(s',a') − Q(s,a) ]
App.QTable = class {
  // numStates: cantidad de estados (4 en La Fábrica)
  // numActions: cantidad de acciones (2: dejar pasar, descartar)
  // learningRate (α): qué tanto pesa la nueva información (default 0.1)
  // discount (γ): importancia de recompensas futuras (default 0.95)
  constructor(numStates, numActions, learningRate = 0.1, discount = 0.95) {
    this.lr = learningRate;
    this.gamma = discount;
    this.table = [];
    for (let s = 0; s < numStates; s++) {
      this.table[s] = new Array(numActions).fill(0);
    }
  }

  // Retorna el máximo valor Q entre todas las acciones para un estado dado
  getMaxQ(state) {
    return Math.max(...this.table[state]);
  }

  // Retorna la mejor acción para un estado (rompe empates al azar)
  getBestAction(state) {
    const qs = this.table[state];
    const maxQ = this.getMaxQ(state);
    const best = [];
    for (let a = 0; a < qs.length; a++) {
      if (qs[a] === maxQ) best.push(a);
    }
    return best[Math.floor(Math.random() * best.length)];
  }

  // Aplica la regla de actualización de Q-Learning (ecuación de Bellman)
  update(state, action, reward, nextState) {
    const oldQ = this.table[state][action];
    const maxNextQ = this.getMaxQ(nextState);
    this.table[state][action] = oldQ + this.lr * (reward + this.gamma * maxNextQ - oldQ);
  }

  getTable() {
    return this.table;
  }

  // Reinicia todos los valores Q a cero
  reset() {
    for (let s = 0; s < this.table.length; s++) {
      this.table[s].fill(0);
    }
  }
};

// Política ε-greedy: balancea exploración (acciones aleatorias) y explotación (mejor acción conocida).
// ε inicia en 1.0 (exploración pura) y decae hasta un mínimo de 0.01.
App.EpsilonGreedy = class {
  constructor(epsilon = 1.0, decay = 0.995, minEpsilon = 0.01) {
    this.epsilon = epsilon;
    this.decay = decay;
    this.min = minEpsilon;
  }

  // Con probabilidad ε elige acción al azar; si no, la mejor acción según Q
  selectAction(state, qtable) {
    if (Math.random() < this.epsilon) {
      return Math.floor(Math.random() * qtable.table[state].length);
    }
    return qtable.getBestAction(state);
  }

  // Reduce ε multiplicando por el factor de decaimiento, sin bajar del mínimo
  decayEpsilon() {
    this.epsilon = Math.max(this.min, this.epsilon * this.decay);
  }

  // Reinicia ε a exploración pura
  reset() {
    this.epsilon = 1.0;
  }
};
