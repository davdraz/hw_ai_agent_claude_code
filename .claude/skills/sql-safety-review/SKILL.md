---
name: sql-safety-review
description: Use before committing any change that touches SQL generation or execution in this repo - the agent system prompt, packages/core/src/tools/run-sql.ts, packages/core/src/tools/list-categories.ts, or packages/core/src/tools/pool.ts - to verify the read-only/SELECT-only guarantee (NFR1) still holds end to end.
---

# SQL biztonsági review (NFR1)

## Miért ez a skill

A `brs-plantbase.md` NFR1-e ("Biztonság") és a sikerkritériumok szó szerint kimondják: *"Az agent soha nem módosítja az adatot (csak SELECT, read-only kapcsolat)."* Az `architektura.md` szerint ez több rétegben van kikényszerítve: prompt szabály, alkalmazásoldali guard, adatbázis-jogosultság, külön `DATABASE_URL_READONLY` connection string. Ez a legkritikusabb, egyetlen regresszióval is megsérthető garancia a projektben - ezért külön review-lépést érdemel minden olyan változtatás előtt, ami ezt a réteget érinti.

## Mikor fusson

Bármely commit előtt, ami módosít egyet vagy többet az alábbiak közül:

- `packages/core/src/system-prompt.ts` (a SELECT-only szabály szövege)
- `packages/core/src/tools/run-sql.ts` (`assertSelectOnly`, a tiltott kulcsszó-lista)
- `packages/core/src/tools/list-categories.ts` vagy bármilyen új, hasonló fix-lekérdezéses tool
- `packages/core/src/tools/pool.ts` (melyik connection stringet használja a pool)
- `packages/core/src/agent.ts` tool-dispatch logikája

## Ellenőrzési lista

1. **Connection string.** Minden agent-oldali lekérdezés (`run_sql`, `list_categories`, bármilyen új tool) a `DATABASE_URL_READONLY`-n megy, sosem a `DATABASE_URL`-en (ami a Prismáé).
2. **`assertSelectOnly` lefedettsége.** Minden új, dinamikus SQL-t építő útvonal átmegy ezen a guardon (vagy egy vele egyenértékű, legalább ugyanolyan szigorú ellenőrzésen) - ne csak a "boldog út" hívja meg.
3. **Statikus lekérdezések is guard-oltak.** Ha egy tool fix SQL stringet futtat (mint `list-categories.ts`), az is menjen át `assertSelectOnly`-n defense-in-depth-ként, ne bízzunk abban, hogy "ez úgyis csak SELECT".
4. **Tiltott kulcsszó-lista teljessége.** Ha egy módosítás új SQL-konstrukciót enged meg (pl. CTE, subquery, window function), ellenőrizd, hogy ez nem nyit-e kiskaput valamelyik tiltott művelethez (pl. `WITH ... AS (INSERT ...)`).
5. **System prompt konzisztencia.** A system prompt SELECT-only szövege és a kód guard-ja ne mondjon egymásnak ellent (pl. ha a prompt megenged valamit, amit a guard tilt, vagy fordítva, az legalábbis szándékos és dokumentált legyen).
6. **Tesztek.** `packages/core/tests/run-sql.test.ts` és `list-categories.test.ts` (vagy az új tool megfelelő teszt fájlja) lefedi az új/módosult ágakat - futtasd le (`pnpm nx run core:test`) commit előtt.

## Mit jelents

Ha bármelyik pont sérül, NE commitolj - jelezd a felhasználónak konkrétan, melyik réteg (prompt / app-guard / connection string / teszt) esett ki, mielőtt bármilyen fixet javasolnál.
