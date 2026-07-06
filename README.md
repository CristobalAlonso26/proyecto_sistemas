# RL Factory — Control de Calidad con Aprendizaje por Refuerzo

Aplicación web educativa sobre Aprendizaje por Refuerzo aplicado a la detección de anomalías
en una línea de producción industrial.

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
│   ├── simulator.js    # Entorno, renderizado canvas y controlador
│   └── app.js          # Navegación, UI interactiva, Q-table editable
├── assets/
│   └── images/         # Diagramas e imágenes
└── README.md
```

## Secciones de la aplicación

1. **Hero** — Presentación del proyecto
2. **¿Qué es RL?** — Introducción conceptual
3. **Conceptos** — Tarjetas interactivas: agente, entorno, estado, acción, recompensa, política
4. **Q-Learning** — Algoritmo explicado con Q-table editable
5. **Caso práctico** — La Fábrica: modelado RL del control de calidad
6. **Simulación** — Cinta transportadora interactiva con brazo robótico
7. **Conclusiones** — Aportes, limitaciones y referencias

## La simulación

- Cinta transportadora con cajas normales (verdes, simétricas) y defectuosas (rojas, deformadas, vibrando)
- Brazo robótico que aprende mediante Q-Learning a clasificar correctamente
- Controles: Entrenar, Pausar, Paso a paso, Acelerar (x2/x8/x20), Reset
- Métricas en tiempo real: puntaje, errores, episodio, epsilon, pasos totales

## Tecnología

HTML5 + CSS3 + JavaScript vanilla (sin dependencias externas).
