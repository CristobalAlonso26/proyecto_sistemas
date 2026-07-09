# RL Factory — Control de Calidad con Aprendizaje por Refuerzo

Aplicación web educativa que enseña los fundamentos del Aprendizaje por Refuerzo
(Reinforcement Learning) mediante visualizaciones interactivas y un caso práctico
de detección de anomalías en una línea de producción industrial.

## Ejecutar

Abrir `index.html` en el navegador, o servir con cualquier servidor HTTP:

```bash
python3 -m http.server 8000
```

Luego visitar http://localhost:8000

## Estructura

```
├── index.html          # SPA con 7 secciones
├── css/
│   └── main.css        # Estilos completos
├── js/
│   ├── qlearning.js    # Motor RL: Q-Table + política Epsilon-Greedy
│   ├── simulator.js    # Entorno, canvas, renderizador, controlador y gráfica
│   └── app.js          # Navegación, modales de conceptos, Q-table en vivo
└── README.md
```

## Secciones de la aplicación

1. **Hero** — Presentación del proyecto como recurso educativo interactivo
2. **¿Qué es RL?** — Diagrama animado HTML/CSS del ciclo Agente-Entorno con tooltips
3. **Conceptos** — Tarjetas con modales: definiciones accesibles + detalle técnico formal
4. **Q-Learning** — Algoritmo explicado con pseudocódigo, ecuación de Bellman e hiperparámetros
5. **Caso práctico** — La Fábrica: modelado RL del control de calidad en cinta transportadora
6. **Simulación** — Canvas interactivo con brazo robótico, gráfica de recompensa, Q-table editable en vivo y toggle RL vs reglas fijas
7. **Conclusiones** — Aportes, limitaciones y referencias académicas

## La simulación

- Cinta transportadora con cajas normales (teal, simétricas) y defectuosas (rojas, deformadas, vibrando)
- Brazo robótico que aprende mediante Q-Learning a clasificar correctamente
- Controles: Entrenar, Pausar, Paso a paso, Acelerar (x2/x8/x20), Reset
- Toggle RL Agent / Reglas Fijas para comparar ambas estrategias
- Gráfica de recompensa acumulada por episodio (RL vs reglas fijas)
- Q-Table en vivo con celdas editables y flash en valores actualizados
- Métricas en tiempo real: puntaje, errores, episodio, epsilon, pasos totales
- Overlay de transición de episodio con puntaje

## Tecnología

HTML5 + CSS3 + JavaScript vanilla (sin dependencias externas).

## Autor

Cristobal Ramos
