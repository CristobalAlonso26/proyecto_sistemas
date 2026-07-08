(function () {
  function closeModal() {
    var overlay = document.querySelector('.modal-overlay');
    if (overlay) {
      overlay.remove();
      document.body.style.overflow = '';
    }
  }

  function openModal(card) {
    closeModal();

    var emojiEl = card.querySelector('.emoji');
    var emoji = emojiEl ? emojiEl.textContent : '';
    var title = card.querySelector('h4').textContent;
    var tagline = card.querySelector('p').textContent;
    var detail = card.querySelector('.detail');

    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    var content = document.createElement('div');
    content.className = 'modal-content';

    var closeBtn = document.createElement('button');
    closeBtn.className = 'modal-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      closeModal();
    });

    content.appendChild(closeBtn);

    if (emoji) {
      var emojiSpan = document.createElement('span');
      emojiSpan.className = 'modal-emoji';
      emojiSpan.textContent = emoji;
      content.appendChild(emojiSpan);
    }

    var titleEl = document.createElement('h3');
    titleEl.textContent = title;
    content.appendChild(titleEl);

    var tagEl = document.createElement('p');
    tagEl.className = 'modal-tagline';
    tagEl.textContent = tagline;
    content.appendChild(tagEl);

    var detailEl = document.createElement('div');
    detailEl.className = 'modal-detail';
    detailEl.innerHTML = detail.innerHTML;
    content.appendChild(detailEl);

    overlay.appendChild(content);

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });

    document.body.style.overflow = 'hidden';
    document.body.appendChild(overlay);
  }

  document.querySelectorAll('#concept-cards .card').forEach(function (card) {
    card.addEventListener('click', function (e) {
      e.stopPropagation();
      openModal(card);
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeModal();
  });

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

  var sim = new App.SimController();
  App.controller = sim;

  var stateLabels = [
    'Normal + Fija',
    'Normal + Vibrando',
    'Alterada + Fija',
    'Alterada + Vibrando',
  ];

  var qtableInitialized = false;

  function initQTable() {
    var tbody = document.getElementById('live-qtable-body');
    if (!tbody) return;
    var table = sim.qtable.table;
    tbody.innerHTML = '';
    for (var s = 0; s < table.length; s++) {
      var tr = document.createElement('tr');
      var tdLabel = document.createElement('td');
      tdLabel.textContent = stateLabels[s];
      tr.appendChild(tdLabel);
      for (var a = 0; a < table[s].length; a++) {
        var td = document.createElement('td');
        td.setAttribute('data-state', s);
        td.setAttribute('data-action', a);
        var input = document.createElement('input');
        input.type = 'number';
        input.step = '0.1';
        input.setAttribute('data-state', s);
        input.setAttribute('data-action', a);
        input.value = table[s][a].toFixed(1);
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
    qtableInitialized = true;
  }

  function refreshQTable() {
    var tbody = document.getElementById('live-qtable-body');
    if (!tbody) return;
    if (!qtableInitialized) initQTable();
    var table = sim.qtable.table;
    var inputs = tbody.querySelectorAll('input[data-state]');

    for (var i = 0; i < inputs.length; i++) {
      var inp = inputs[i];
      var s = parseInt(inp.getAttribute('data-state'));
      var a = parseInt(inp.getAttribute('data-action'));
      if (document.activeElement !== inp) {
        inp.value = table[s][a].toFixed(1);
      }
      var td = inp.parentElement;
      td.classList.remove('flash');
      if (s === sim.lastUpdatedState && a === sim.lastUpdatedAction) {
        td.classList.add('flash');
      }
    }

    if (sim.lastUpdatedState >= 0) {
      sim.lastUpdatedState = -1;
      sim.lastUpdatedAction = -1;
    }
  }

  setInterval(function () {
    if (sim.running || sim.totalSteps > 0) {
      refreshQTable();
    }
  }, 800);

  initQTable();

  document.getElementById('btn-reset').addEventListener('click', function () {
    setTimeout(refreshQTable, 100);
  });
})();
