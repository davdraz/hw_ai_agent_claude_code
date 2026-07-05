# Plantbase - tech stack Windowson

Elv: iparági best practice, legfrissebb STABIL verzió (se cutting-edge, se elavult). Ez a változat Windows 11 + PowerShell + Docker Desktop környezetre van igazítva.

## Fejlesztői környezet

- Operációs rendszer: Windows 11.
- Terminál: PowerShell 7.
- Opcionális alternatíva: WSL2 Ubuntu, ha a csapat Linux-szerű fejlesztői élményt szeretne.
- Konténer: Docker Desktop WSL2 backenddel.
- Git: Git for Windows.
- Node: aktuális LTS.
- Package manager: pnpm.
- Szerkesztő: VS Code, Zed Windows build, Cursor vagy bármely TypeScript-kompatibilis editor.

## Projekt stack

- Nyelv / monorepo: TypeScript (strict), Nx, pnpm, Node LTS.
- DB: PostgreSQL lokálisan `docker compose`-ban, Docker Desktop futtatja. Prisma (ORM: séma, migráció, seed, typed query). Helyben dolgozunk, nincs felhő-DB.
- Agent: Anthropic SDK (hivatalos kliens, nem nyers HTTP) + saját tool-use loop, agent-framework nélkül. Zod (validáció).
- CLI: commander + `node:readline`.
- Tooling: Vitest, ESLint + Prettier, tsx.
- GitHub: `gh` CLI opcionális, Windowsra telepíthető.

## Telepítés Windowson

Ajánlott sorrend:

1. Git for Windows.
2. Node LTS.
3. pnpm:

   ```powershell
   corepack enable
   corepack prepare pnpm@latest --activate
   pnpm --version
   ```

4. Docker Desktop, WSL2 backend bekapcsolva.
5. Projekt függőségek:

   ```powershell
   cd C:\dev\plantbase
   pnpm install
   ```

## Lokális PostgreSQL Docker Desktoppal

A projekt `docker-compose.yml` fájlt használ. Indítás:

```powershell
docker compose up -d
docker compose ps
```

Leállítás:

```powershell
docker compose down
```

Adatok törlése csak akkor, ha tényleg újra akarod húzni a lokális DB-t:

```powershell
docker compose down -v
```

## Környezeti változók

`.env` létrehozása:

```powershell
Copy-Item .env.example .env
notepad .env
```

Példa:

```env
DATABASE_URL="postgresql://plantbase_app:plantbase_app@localhost:5432/plantbase?schema=public"
DATABASE_URL_READONLY="postgresql://plantbase_readonly:plantbase_readonly@localhost:5432/plantbase?schema=public"
ANTHROPIC_API_KEY="..."
```

PowerShellben ideiglenes env változó:

```powershell
$env:ANTHROPIC_API_KEY = "..."
```

## products séma

```sql
products (
  id            serial primary key,
  name          text,        -- köznapi név
  latin_name    text,
  category      text,        -- szobanövény / kerti / pozsgás / kaktusz / fűszer / fa-cserje / lógó / virágzó
  location      text,        -- beltéri / kültéri / mindkettő
  price             numeric,  -- ár (HUF)
  sale_price        numeric,  -- akciós ár (ha van akció), különben null
  stock             int,      -- raktárkészlet (db)
  light             text,     -- árnyék / alacsony / közepes / erős / direkt nap
  watering          text,     -- ritka / közepes / gyakori / állandóan nedves
  difficulty        text,     -- kezdő / haladó / profi
  current_height_cm int,      -- aktuális magasság
  max_height_cm     int,      -- kifejlett (max) magasság
  current_pot_cm    int,      -- aktuális cserépméret
  pet_safe          boolean,  -- háziállat-barát
  kid_safe          boolean,  -- gyerekbiztos (nem mérgező)
  air_purifying     boolean,  -- légtisztító
  rating            numeric,  -- 0-5
  reviews_count     int,
  description       text
)
```

### Értékkészletek (kategorikus mezők)

- **category:** szobanövény, kerti, pozsgás, kaktusz, fűszer, fa-cserje, lógó, virágzó
- **location:** beltéri, kültéri, mindkettő
- **light:** árnyék, alacsony, közepes, erős, direkt nap
- **watering:** ritka, közepes, gyakori, állandóan nedves
- **difficulty:** kezdő, haladó, profi
- **bool:** pet_safe, kid_safe, air_purifying

## Windows-kompatibilitási szabályok

- Ne használjunk OrbStack-függő leírást; Windows alatt Docker Desktop az alap.
- Parancsok dokumentálásánál PowerShell példákat adjunk.
- Node kódban útvonalhoz `node:path` kell.
- Shell script helyett preferált a Node script vagy package script, mert az Windows/Unix alatt is fut.
- CI-ban Linux futhat, de lokális fejlesztésnek Windows alatt is reprodukálhatónak kell lennie.

