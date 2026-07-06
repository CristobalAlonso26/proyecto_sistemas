(function () {
  var sim = new App.SimController();
  App.controller = sim;

  document.querySelectorAll('.nav-links a').forEach(function (link) {
    link.addEventListener('click', function () {
      document.querySelectorAll('.nav-links a').forEach(function (l) { l.classList.remove('active'); });
      link.classList.add('active');
    });
  });

  var sections = document.querySelectorAll('section');
  var navLinks = document.querySelectorAll('.nav-links a');
  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var id = entry.target.id;
          navLinks.forEach(function (link) {
            link.classList.toggle('active', link.getAttribute('href') === '#' + id);
          });
        }
      });
    },
    { threshold: 0.5 }
  );
  sections.forEach(function (s) { observer.observe(s); });

  document.querySelectorAll('#concept-cards .card').forEach(function (card) {
    card.addEventListener('click', function () {
      card.classList.toggle('expanded');
    });
  });

  var stateLabels = [
    'Normal + Fija',
    'Normal + Vibrando',
    'Alterada + Fija',
    'Alterada + Vibrando',
  ];

  function updateQTable() {
    var table = sim.qtable.table;
    var tbody = document.getElementById('qtable-body');
    tbody.innerHTML = '';
    for (var s = 0; s < table.length; s++) {
      var tr = document.createElement('tr');
      var tdLabel = document.createElement('td');
      tdLabel.textContent = stateLabels[s];
      tdLabel.style.cssText = 'font-family: var(--font-mono); padding: 0.5rem 1rem;';
      tr.appendChild(tdLabel);

      for (var a = 0; a < table[s].length; a++) {
        var td = document.createElement('td');
        var input = document.createElement('input');
        input.type = 'number';
        input.step = '0.1';
        input.value = Math.round(table[s][a] * 10) / 10;
        (function (state, action) {
          input.addEventListener('change', function () {
            sim.qtable.table[state][action] = parseFloat(this.value) || 0;
          });
        })(s, a);
        td.appendChild(input);
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
  }

  setInterval(function () {
    if (sim.running || sim.totalSteps > 0) {
      updateQTable();
    }
  }, 1000);

  updateQTable();
})();
