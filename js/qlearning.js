var App = window.App || {};

App.QTable = class {
  constructor(numStates, numActions, learningRate = 0.1, discount = 0.95) {
    this.lr = learningRate;
    this.gamma = discount;
    this.table = [];
    for (let s = 0; s < numStates; s++) {
      this.table[s] = new Array(numActions).fill(0);
    }
  }

  getMaxQ(state) {
    return Math.max(...this.table[state]);
  }

  getBestAction(state) {
    const qs = this.table[state];
    const maxQ = this.getMaxQ(state);
    const best = [];
    for (let a = 0; a < qs.length; a++) {
      if (qs[a] === maxQ) best.push(a);
    }
    return best[Math.floor(Math.random() * best.length)];
  }

  update(state, action, reward, nextState) {
    const oldQ = this.table[state][action];
    const maxNextQ = this.getMaxQ(nextState);
    this.table[state][action] = oldQ + this.lr * (reward + this.gamma * maxNextQ - oldQ);
  }

  getTable() {
    return this.table;
  }

  reset() {
    for (let s = 0; s < this.table.length; s++) {
      this.table[s].fill(0);
    }
  }
};

App.EpsilonGreedy = class {
  constructor(epsilon = 1.0, decay = 0.995, minEpsilon = 0.01) {
    this.epsilon = epsilon;
    this.decay = decay;
    this.min = minEpsilon;
  }

  selectAction(state, qtable) {
    if (Math.random() < this.epsilon) {
      return Math.floor(Math.random() * qtable.table[state].length);
    }
    return qtable.getBestAction(state);
  }

  decayEpsilon() {
    this.epsilon = Math.max(this.min, this.epsilon * this.decay);
  }

  reset() {
    this.epsilon = 1.0;
  }
};
