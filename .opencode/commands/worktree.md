---
description: Crea un git worktree en .worktrees/<nombre>
---

Crea un worktree con el nombre indicado en `$ARGUMENTS`.

1. Si ARGUMENTS está vacío, pide un nombre y detente.
2. Normaliza a slug: minúsculas, espacios → `-`, sin acentos ni caracteres no alfanuméricos (`globales de juego` → `globales-de-juego`).
3. Ejecuta `git worktree add ".worktrees/<slug>"` (sin `-b`: git nombra la rama con el basename de la ruta).
4. Si el worktree o la rama ya existen, repórtalo y detente (sin `--force`).
5. Confirma la ruta creada.
