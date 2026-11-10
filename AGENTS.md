# Asteroids — guía para agentes

Clon de Asteroids en canvas HTML5 puro. Sin dependencias, sin bundler, sin `package.json`: todo el juego está en un solo archivo `game.js` (scope global, sin módulos, `'use strict'`).

## Comandos

- Correr: abrir `index.html` directo en el navegador, o `npx serve .` → http://localhost:3000
- No hay build, lint ni tests: toda verificación es manual en el navegador.

## Convenciones del código

- El tamaño del canvas (800×600) está duplicado: atributos en `index.html` y constantes `W`/`H` en `game.js`. Cambiarlo requiere tocar ambos.
- Entidades (`Bullet`, `Asteroid`, `Ship`, `Particle`, `PowerUp`): clases con `update(dt)` + `draw()` y flag `dead`; los arrays se re-filtran cada frame en `update()`.
- Input: `pressed()` consume `justPressed` (efecto de una sola vez por frame); Space y flechas hacen `preventDefault` en el keydown.
- `loop()` limita `dt` a 0.05 s máximo; las velocidades están en px/s.
- Tuning de asteroides en tablas indexadas por tamaño 1–3 (índice 0 sin uso): `RADII`, `SPEEDS`, `POINTS`.

## Notas

- Power-ups: solo el escudo (`PowerUp` en `game.js`, recogible, 5 s de duración). El README menciona además la "estrella fugaz", que no está implementada.
- Todo texto visible al usuario (HUD, overlays) y los comentarios están en español; los identificadores en inglés.
