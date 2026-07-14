---
name: ddd-audit
description: Use when the user asks to update or sync /docs (ddd/glossary.md, ddd/model.md, tech/*.md) with the current codebase and git history after a batch of changes - this is the doc-sync mechanism named in docs/dev-workflow.md, run on demand rather than on every commit.
---

# DDD & tech-docs audit

## Miért ez a skill

A `docs/dev-workflow.md` "/docs (a repóban)" szakasza kimondja: *"A `/docs` frissítését a **`ddd-audit` skill** végzi (git-history -> docs), külön, igény szerint futtatva."* Ez a skill ennek a - eddig csak megnevezett, de nem implementált - mechanizmusnak a tartalma.

## Mikor fusson

- A felhasználó kifejezetten kéri a `/docs` frissítését, vagy
- egy nagyobb, koherens funkcionális változtatás (pl. új tool, új entitás, séma-módosítás) után, amikor a doménmodell vagy a technikai architektúra dokumentációja elmaradt a kódtól.

NE fusson minden egyes commit után; ez tudatosan nem Stop-hook, hanem igény szerinti audit (lásd `dev-workflow.md`).

## Mit csinál

1. **Git history áttekintése.** `git log` a legutóbbi doc-frissítés óta (ha nincs korábbi audit-jelölő commit, akkor az utolsó néhány releváns commit), fókuszban a `packages/`, `apps/` és `prisma/schema.prisma` változásokra.
2. **Domain-változások azonosítása.** Új vagy módosult entitás, mező, tool, végpont - minden, ami a ubiquitous language-et (növény, kategória, fényigény, gondozás stb.) vagy az entitás/aggregátum-modellt érinti.
3. **`docs/ddd/glossary.md` frissítése.** Ha egy változtatás új domain-fogalmat vezet be (pl. új `category` érték, új tool mint `list_categories`), a glosszárium kap egy rövid, egy-két mondatos bejegyzést. Ha a fájl még nem létezik, hozd létre a `docs/ddd/` mappában, a `dev-workflow.md`-ben leírt struktúra szerint.
4. **`docs/ddd/model.md` frissítése.** Entitások, value objectek, aggregátumok szinkronban tartása a `packages/db/prisma/schema.prisma`-val és a `packages/core/src/types.ts`-szel.
5. **`docs/tech/*.md` frissítése.** `infra.md` (Postgres, .env, két DB-kapcsolat), `architecture.md` (core/apps felelősségek, adat-elérés), `api.md` (tool/CLI felület - `ask`, `run_sql`, `list_categories` stb.) - csak azt a fájlt módosítsd, amit az adott változtatás ténylegesen érint.
6. **Konzisztencia-ellenőrzés a meglévő doksikkal.** A `brs-plantbase.md`, `architektura.md`, `stack.md`, `konvenciok.md` tartalmával ne kerüljön ellentmondásba az újonnan írt szöveg; ha ellentmondást találsz, jelezd a felhasználónak ahelyett, hogy csendben felülírnád valamelyiket.
7. **Kis, fókuszált commit.** A `dev-workflow.md` Git-konvenciói szerint (`docs: ...` típusú Conventional Commit), külön a kód-változtatásoktól.

## Mit NE csinálj

- Ne generálj doc-freshness ellenőrző scriptet vagy Stop hookot - ezt a `dev-workflow.md` kifejezetten későbbi (4. órás, CI-alapú) szakaszra halasztja.
- Ne írj át olyan dokumentumot, ami kurzus-melléklet (pl. `brs-plantbase.md`, `konvenciok.md`) - ezek forrás, nem audit-célpont.
