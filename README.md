# VCT Predicts

Plataforma de seguimiento, análisis y predicción del **Valorant Champions Tour**. No es una calculadora donde elegís dos equipos: detecta automáticamente los próximos partidos de VCT (Americas, EMEA, Pacific, China e internacionales), y genera para cada uno un análisis completo — predicción de la serie, mapa por mapa, forma reciente, head-to-head, jugadores y factores que explican la predicción.

Los datos son reales, sin mocks: se sincronizan desde [VLR.gg](https://www.vlr.gg) (vía el wrapper no oficial [`vlr.orlandomm.net`](https://vlr.orlandomm.net/docs)), se normalizan en una base de datos propia, y de ahí sale tanto el sitio como el motor de predicción.

## Arquitectura

```
VLR.gg (fuente externa)
  → src/server/vlr/client.ts       (cliente tipado de la API)
  → src/server/sync/*              (normalización: eventos, partidos, rosters)
  → Postgres / Prisma               (capa de persistencia y caché)
  → src/server/prediction/*        (motor de predicción: rating interno, forma,
                                     mapas, H2H, confianza, factores)
  → src/server/data/*              (repositorios que alimentan las páginas)
  → src/app/*                       (Next.js App Router, todo Server Components)
```

El frontend nunca llama a la API externa directamente — todo pasa por la base de datos, para no depender de la disponibilidad ni del rate limit de la fuente.

## Requisitos

- Node.js 20+
- Docker (para Postgres local)

## Setup

```bash
npm install
docker compose up -d          # levanta Postgres en localhost:5442
npx prisma migrate deploy     # aplica el esquema
npm run sync                  # primera carga de datos (puede tardar varios minutos)
```

Copiá `.env.example` a `.env` si hace falta ajustar la conexión (por defecto ya apunta al Postgres de Docker).

## Correr la plataforma

Hacen falta **dos procesos en paralelo**:

```bash
npm run dev          # sitio web en http://localhost:3000
npm run sync:watch   # mantiene la base de datos actualizada (cron cada 10 min)
```

Sin `sync:watch` corriendo, el sitio funciona pero con los datos congelados en la última sincronización manual.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Sitio Next.js en modo desarrollo |
| `npm run build` / `npm run start` | Build y arranque de producción |
| `npm run sync` | Sincronización única (eventos, partidos, rosters, predicciones, evaluación) |
| `npm run sync:watch` | Igual que `sync`, pero en loop cada 10 min (`node-cron`) |
| `npm run lint` | ESLint |

## Modelo de predicción

Combina, cuando hay datos suficientes: rating interno (Elo, recalculado en cada sync), forma reciente ponderada por recencia, win rate por mapa (con split attack/defense derivado de rondas T/CT), head-to-head, rating de roster y pistol rounds. Cada señal pesa según la cantidad de datos reales disponibles — si falta información, se muestra "Datos no disponibles" en vez de inventar un número, y la confianza baja en consecuencia. El código vive en `src/server/prediction/engine.ts`.

Las predicciones de partidos que terminaron sin haber sido vistos "próximos" por el sync (por ejemplo, si estuvo apagado) se reconstruyen a posteriori usando solo datos anteriores al partido, y quedan marcadas como **reconstruidas** en el historial — nunca se presentan como si hubiesen sido hechas en tiempo real.

## Versionado

Semver en `package.json`, visible en el sidebar de la app. Cada release se marca con un tag anotado en git (`vX.Y.Z`). Commits en formato [Conventional Commits](https://www.conventionalcommits.org/), en español (`feat: ...`, `fix: ...`, `chore: ...`).

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Prisma 5 · PostgreSQL · React 19
