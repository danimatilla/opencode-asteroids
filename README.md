# Asteroids

Clon del clásico arcade **Asteroids** implementado en canvas HTML5 puro, sin dependencias ni bundler.

## Descripción

Nave espacial en un campo de asteroides con envolvimiento de bordes (el espacio es toroidal). Destruye asteroides para sumar puntos: los grandes se parten en medianos, los medianos en pequeños. Incluye power-ups especiales y tipos de asteroides únicos como la estrella fugaz.

## Tecnologías

- **HTML5 Canvas** — renderizado 2D
- **JavaScript (ES6+)** — lógica del juego en un solo archivo `game.js`
- Sin frameworks, sin bundler, sin dependencias

## Cómo correr

Abre `index.html` directamente en el navegador (doble clic), o usa un servidor local:

```bash
npx serve .
```

Luego visita `http://localhost:3000`.

## Controles

| Tecla     | Acción     |
| --------- | ---------- |
| `←` `→`   | Rotar nave (o elegir nave en la pantalla de selección) |
| `↑`       | Propulsar  |
| `Espacio` | Disparar / confirmar |

## Naves

Antes de empezar, y al pulsar `S` en la pantalla de GAME OVER, puedes elegir entre dos naves:

| Nave    | Tamaño                          | Puntos |
| ------- | ------------------------------- | ------ |
| Clásica | Normal                          | ×1     |
| Pesada  | Más grande (mayor hitbox)       | ×2     |

La nave pesada es más fácil de impactar, pero todos los puntos que consigas (asteroides y estrella fugaz) se duplican.

## Power-ups

| Power-up | Efecto |
| -------- | ------ |
| Escudo   | Al recogerlo, la nave queda rodeada por un anillo cian durante 5 s: los asteroides que la tocan se destruyen (suman puntos) sin dañarla. |

Al destruir asteroides con balas hay un 15 % de probabilidad de que aparezca uno en pantalla (uno a la vez); si no se recoge en 12 s, desaparece.

## Puntuación

| Asteroide      | Puntos |
| -------------- | ------ |
| Grande         | 20     |
| Mediano        | 50     |
| Pequeño        | 100    |
| Estrella fugaz | 250    |

## Características

- Dos naves seleccionables: clásica (×1 puntos) y pesada (más grande, ×2 puntos)
- 3 vidas con invencibilidad temporal al reaparecer (parpadeo)
- Asteroides se parten en fragmentos más pequeños al ser destruidos
- Partículas de explosión al destruir asteroides
- Power-up de escudo recogible: 5 s de inmunidad que destruye asteroides al contacto
- Estrella fugaz: desde el nivel 2 aparece periódicamente (chance cada 10 s) y cruza la pantalla a gran velocidad; su rastro daña a la nave salvo con escudo, y destruirla con una bala vale 250 puntos
