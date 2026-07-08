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

  function updateQTable() {
    var table = sim.qtable.table;
    var tbody = document.getElementById('qtable-body');
    if (!tbody) return;
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
      updateLiveQTable();
    }
  }, 800);

  function updateLiveQTable() {
    var tbody = document.getElementById('live-qtable-body');
    if (!tbody) return;
    var table = sim.qtable.table;
    var rows = tbody.querySelectorAll('tr');

    if (rows.length === 0) {
      for (var s = 0; s < table.length; s++) {
        var tr = document.createElement('tr');
        var tdLabel = document.createElement('td');
        tdLabel.textContent = stateLabels[s];
        tr.appendChild(tdLabel);
        for (var a = 0; a < table[s].length; a++) {
          var td = document.createElement('td');
          td.setAttribute('data-state', s);
          td.setAttribute('data-action', a);
          td.textContent = table[s][a].toFixed(1);
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      }
      rows = tbody.querySelectorAll('tr');
    }

    for (var s = 0; s < Math.min(table.length, rows.length); s++) {
      var cells = rows[s].querySelectorAll('td[data-state]');
      for (var a = 0; a < cells.length; a++) {
        cells[a].textContent = table[s][a].toFixed(1);
        cells[a].classList.remove('flash');
        if (s === sim.lastUpdatedState && a === sim.lastUpdatedAction) {
          cells[a].classList.add('flash');
        }
      }
    }

    if (sim.lastUpdatedState >= 0) {
      setTimeout(function () {
        var allCells = tbody.querySelectorAll('td.flash');
        for (var c = 0; c < allCells.length; c++) {
          allCells[c].classList.remove('flash');
        }
      }, 400);
      sim.lastUpdatedState = -1;
      sim.lastUpdatedAction = -1;
    }
  }

  updateQTable();
  updateLiveQTable();
})();
