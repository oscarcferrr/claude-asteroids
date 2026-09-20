# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Clon del clásico arcade **Asteroids** en HTML5 Canvas puro (vanilla JS, ES6+), sin frameworks, sin bundler y sin dependencias. Todo el juego vive en un único archivo `game.js`, cargado directamente por `index.html`.

## Running

No hay build ni tests. Simplemente abre `index.html` en el navegador, o sirve el directorio:

```bash
npx serve .
```

Luego visita `http://localhost:3000`.

## Architecture

Todo el estado y la lógica del juego están en `game.js` (archivo único, sin módulos). Estructura de arriba a abajo:

- **Input**: `keys` / `justPressed` son mapas globales poblados por listeners de `keydown`/`keyup`. `pressed(code)` consume un "just pressed" (para disparo tipo trigger, no repetido en cada frame).
- **Clases de entidades**: `Bullet`, `Asteroid`, `Ship`, `Particle`. Cada una tiene `update(dt)` y `draw()`. No hay clase base ni sistema de entidades genérico — es deliberadamente simple.
- **Coordenadas toroidales**: `wrap(v, max)` envuelve posición en los bordes del canvas (800×600); todas las entidades móviles lo usan en su `update`.
- **Tamaños de asteroide**: representados como enteros 1 (pequeño) a 3 (grande), indexando en paralelo los arrays `RADII`, `SPEEDS`, `POINTS`. Al partirse (`Asteroid.split()`), un asteroide de tamaño N genera 2 de tamaño N-1; tamaño 1 no se parte.
- **Estado global del juego**: variables de módulo (`ship`, `bullets`, `asteroids`, `particles`, `score`, `lives`, `level`, `state`, `deadTimer`) reinicializadas por `initGame()`. `state` es una máquina de estados simple: `'playing' | 'dead' | 'gameover'`, manejada al inicio de `update(dt)`.
- **Loop principal**: `requestAnimationFrame` clásico en `loop(ts)` → calcula `dt` (clamped a 0.05s), llama `update(dt)` luego `draw()`. La detección de colisiones (bala↔asteroide, nave↔asteroide) vive dentro de `update()`, no en las clases de entidad.
- **Progresión de nivel**: al vaciarse `asteroids`, `nextLevel()` incrementa `level` y genera `3 + level` asteroides grandes nuevos.

Al modificar el juego, mantén el patrón existente: una clase por tipo de entidad con `update`/`draw`, colisiones y transiciones de estado centralizadas en las funciones `update`/`initGame`/`nextLevel`/`killShip`, sin introducir módulos, bundler ni dependencias externas.

**Consejo de diseño**
 dado el estilo wireframe del juego, los power-ups podrían aparecer como figuras geométricas parpadeantes (un rombo, un hexágono, etc.) para mantener la estética retro sin romper la coherencia visual.
