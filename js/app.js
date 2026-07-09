// UI de la aplicación: modales, navegación scroll-spy, Q-Table en vivo.
// Se ejecuta en un IIFE para no contaminar el scope global.

(function () {
  
  // Sistema de modales para los conceptos de RL
  

  // Cierra y elimina el modal actual del DOM
  function closeModal() {
    let overlay = document.querySelector('.modal-overlay');
    if (overlay) {
      overlay.remove();
      document.body.style.overflow = '';
    }
  }

  // Abre un modal con el contenido detallado de una tarjeta de concepto
  function openModal(card) {
    closeModal();

    // Extraer datos de la tarjeta
    let title = card.querySelector('h4').textContent;
    let tagline = card.querySelector('p').textContent;
    let detail = card.querySelector('.detail');

    // Construir overlay
    let overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    let content = document.createElement('div');
    content.className = 'modal-content';

    // Botón de cierre (X)
    let closeBtn = document.createElement('button');
    closeBtn.className = 'modal-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      closeModal();
    });

    content.appendChild(closeBtn);

    // Título del concepto
    let titleEl = document.createElement('h3');
    titleEl.textContent = title;
    content.appendChild(titleEl);

    // Descripción informal (tagline)
    let tagEl = document.createElement('p');
    tagEl.className = 'modal-tagline';
    tagEl.textContent = tagline;
    content.appendChild(tagEl);

    // Definición técnica (se copia del .detail oculto en la tarjeta)
    let detailEl = document.createElement('div');
    detailEl.className = 'modal-detail';
    detailEl.innerHTML = detail.innerHTML;
    content.appendChild(detailEl);

    overlay.appendChild(content);

    // Cerrar al hacer clic fuera del contenido
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });

    document.body.style.overflow = 'hidden';
    document.body.appendChild(overlay);
  }

  // Asignar clic a cada tarjeta de concepto
  document.querySelectorAll('#concept-cards .card').forEach(function (card) {
    card.addEventListener('click', function (e) {
      e.stopPropagation();
      openModal(card);
    });
  });

  // Cerrar modal con tecla Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeModal();
  });

  
  // Navegación: scroll-spy con IntersectionObserver
  

  // Resaltar enlace activo al hacer clic
  document.querySelectorAll('.nav-links a').forEach(function (link) {
    link.addEventListener('click', function () {
      document.querySelectorAll('.nav-links a').forEach(function (l) { l.classList.remove('active'); });
      link.classList.add('active');
    });
  });

  // Observer que actualiza el enlace activo según la sección visible
  let sections = document.querySelectorAll('section');
  let navLinks = document.querySelectorAll('.nav-links a');
  let observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          let id = entry.target.id;
          navLinks.forEach(function (link) {
            link.classList.toggle('active', link.getAttribute('href') === '#' + id);
          });
        }
      });
    },
    { threshold: 0.5 }   // se activa cuando el 50% de la sección es visible
  );
  sections.forEach(function (s) { observer.observe(s); });

  
  // Simulación y Q-Table en vivo
  

  // Crear el controlador principal y exponerlo globalmente
  let sim = new App.SimController();
  App.controller = sim;

  // Etiquetas para las 4 filas de la Q-Table
  let stateLabels = [
    'Normal + Fija',
    'Normal + Vibrando',
    'Alterada + Fija',
    'Alterada + Vibrando',
  ];

  let qtableInitialized = false;

  // Construye la tabla HTML con inputs editables para cada celda Q(s,a)
  function initQTable() {
    let tbody = document.getElementById('live-qtable-body');
    if (!tbody) return;
    let table = sim.qtable.table;
    tbody.innerHTML = '';
    for (let s = 0; s < table.length; s++) {
      let tr = document.createElement('tr');
      let tdLabel = document.createElement('td');
      tdLabel.textContent = stateLabels[s];
      tr.appendChild(tdLabel);
      for (let a = 0; a < table[s].length; a++) {
        let td = document.createElement('td');
        td.setAttribute('data-state', s);
        td.setAttribute('data-action', a);
        let input = document.createElement('input');
        input.type = 'number';
        input.step = '0.1';
        input.setAttribute('data-state', s);
        input.setAttribute('data-action', a);
        input.value = table[s][a].toFixed(1);
        // IIFE para capturar state y action en el closure del listener
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

  // Actualiza los valores de la Q-Table en pantalla y anima celdas modificadas
  function refreshQTable() {
    let tbody = document.getElementById('live-qtable-body');
    if (!tbody) return;
    if (!qtableInitialized) initQTable();
    let table = sim.qtable.table;
    let inputs = tbody.querySelectorAll('input[data-state]');

    for (let i = 0; i < inputs.length; i++) {
      let inp = inputs[i];
      let s = parseInt(inp.getAttribute('data-state'));
      let a = parseInt(inp.getAttribute('data-action'));
      // No sobrescribir el valor si el usuario está editando
      if (document.activeElement !== inp) {
        inp.value = table[s][a].toFixed(1);
      }
      // Efecto flash en la celda que acaba de actualizarse
      let td = inp.parentElement;
      td.classList.remove('flash');
      if (s === sim.lastUpdatedState && a === sim.lastUpdatedAction) {
        td.classList.add('flash');
      }
    }

    // Consumir el indicador de última celda actualizada
    if (sim.lastUpdatedState >= 0) {
      sim.lastUpdatedState = -1;
      sim.lastUpdatedAction = -1;
    }
  }

  // Polling periódico: refresca la Q-Table cada 800ms mientras haya actividad
  function scheduleRefresh() {
    if (sim.running || sim.totalSteps > 0) {
      refreshQTable();
    }
    setTimeout(scheduleRefresh, 800);
  }

  scheduleRefresh();
  initQTable();
})();
