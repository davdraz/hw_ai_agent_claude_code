# Plantbase

CLI AI agent, amely természetes nyelvű kérdést fordít SQL-re a növény-katalógus (`products` tábla) felett, read-only adatbázis-kapcsolaton futtatja, és természetes nyelvű választ ad. A részletes specifikáció a `docs/` mappában található (`brs-plantbase.md`, `architektura.md`, `stack.md`, `konvenciok.md`, `dev-workflow.md`).

## Gyors indulás Windowson (PowerShell)

Előfeltétel: Git for Windows, Node.js LTS, Docker Desktop (WSL2 backenddel).

```powershell
corepack enable
pnpm install

Copy-Item .env.example .env
notepad .env   # töltsd ki az ANTHROPIC_API_KEY-t

docker compose up -d
pnpm prisma migrate dev
pnpm seed

pnpm plantbase ask "Milyen kezdőbarát, háziállat-barát szobanövény van készleten?"
pnpm plantbase            # interaktív mód, "exit"-tel lehet kilépni
```

## Felépítés (Nx monorepo)

```text
packages/core   agent-logika (Anthropic SDK-ra épülő tool-use loop, runSql tool, system prompt, JSONL naplózás)
packages/db     Prisma (séma, migráció, seed, generált kliens)
apps/cli        CLI (ask parancs + interaktív mód, commander + node:readline)
docs/           specifikációk
scripts/db/init roles.sql - a két Postgres szerepkör (app / readonly) létrehozása
```

## Fejlesztői parancsok

```powershell
pnpm typecheck   # tsc --noEmit minden csomagra (Nx)
pnpm lint        # ESLint minden csomagra (Nx)
pnpm test        # Vitest (packages/core: run_sql guard, system prompt)
pnpm build       # tsc build minden csomagra (Nx)
pnpm format      # Prettier

pnpm prisma <parancs>   # pl. pnpm prisma studio
pnpm migrate            # prisma migrate dev
pnpm seed                # ~30 szintetikus növény betöltése
pnpm roi                # ROI kalkuláció (lásd docs/roi.md), --flaggel paraméterezhető
```

## Biztonság / átláthatóság

- Az agent `runSql` toolja kizárólag a `DATABASE_URL_READONLY` kapcsolaton fut (Postgres `plantbase_readonly` szerepkör, csak SELECT jog), és alkalmazásoldali guard is csak SELECT-et enged át.
- Minden interakció naplózva: `logs/<timestamp>.jsonl` (system prompt, üzenetek, generált SQL, eredmény, válasz, token-használat).
- `--show-prompt` flaggel (`pnpm plantbase ask "..." --show-prompt`) a teljes üzenet-tömb kiírható.

## Megjegyzés a Prisma klienshez

A `pnpm install` egy `postinstall` hookon keresztül automatikusan lefuttatja a `prisma generate`-et, így a `packages/db/generated/client` a séma alapján azonnal, DB-kapcsolat nélkül is létrejön telepítés után. A `pnpm typecheck`/`pnpm build` ezért közvetlenül `pnpm install` után is működik; a tényleges adatbázis-kapcsolatot (migráció, seed, `ask`) továbbra is a "Gyors indulás" szakasz `docker compose up -d` + `pnpm prisma migrate dev` + `pnpm seed` lépései adják.
