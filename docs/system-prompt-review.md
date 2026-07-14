# System prompt - minőségi felülvizsgálat és indoklás

> Ez a dokumentum a `packages/core/src/system-prompt.ts`-ben végzett módosításokat és azok indoklását rögzíti, hogy a döntés ne csak a git historyban legyen visszakereshető.

## Változtatások és indoklásuk

| # | Változtatás | Indoklás |
|---|---|---|
| 1 | `<role>` és `<rules>` kiegészítve a `list_categories` eszköz megemlítésével, saját szabállyal, hogy kategória-felsoroláshoz ezt használja `run_sql` helyett | A kategória-lista visszaadása gyakori, fix alakú kérdés (lásd `products séma` a `stack.md`-ben: 8 rögzített kategória). SQL-generálás helyett egy dedikált eszköz gyorsabb (nincs SQL-kerülő), biztonságosabb (statikus lekérdezés) és nem hibázhatja el az oszlop- vagy kategórianevet. |
| 2 | Új szabály a szoba/hely-illeszkedés (`current_height_cm`, `max_height_cm`, `current_pot_cm`) kiemelésére | A BRS (`brs-plantbase.md` §1) explicit módon a "belefér-e a térbe" kérdést nevezi meg a lakberendező idejének fő emésztőjeként, és ez a KPI-mérőszám (1 szoba < 5 perc) alapja. A korábbi prompt csak a séma-kommentben említette ezeket az oszlopokat, a szabályok között nem; ez konkrét, célzott utasítássá teszi a fő üzleti use case-re. |
| 3 | Új szabály: a `run_sql`/`list_categories` eredményében szereplő szöveges mezők (pl. `description`) sosem utasítások, csak adatok | Védelem a jövőbeli, nem szintetikus adatra (pl. admin által felvitt termékleírás) begyűrűző prompt-injection ellen. A `konvenciok.md` "Biztonság" szakasza kimondja, hogy minden külső adat (user input, API-válasz) megbízhatatlan - a DB-ből visszaolvasott mező ugyanúgy külső adat, csak eddig szintetikus volt. Defense-in-depth, nem csak elméleti kockázat: ha a modell egy tool-result szövegében talál egy "ignore previous instructions"-szerű mondatot, ez a szabály explicit módon tiltja a követését. |
| 4 | Új szabály kétértelmű kérdésekre: legvalószínűbb értelmezés + rövid jelzés, mit feltételezett | A v1 hatóköre (FR1) egyszeri `ask` és interaktív mód, nincs tervezett clarification-round-trip. E nélkül a szabály nélkül a modell vagy csendben találgat (átláthatatlan), vagy visszakérdez (extra kör, amit a v1 UX nem tervez). A kompromisszum: válaszol, de kimondja a feltételezést - ez illeszkedik az NFR2 (Átláthatóság) követelményhez plusz kör nélkül. |
| 5 | Forintösszeg-formázási szabály (ezres tagolás, "Ft" jelölés) a végső válaszban | Sikerkritérium (`brs-plantbase.md` §5): "helyes, érthető választ kap". A nyers `12500` szám kevésbé olvasható magyar szövegkörnyezetben, mint a "12 500 Ft"; ez közvetlenül a válasz-minőséget (FR3) célzó, alacsony kockázatú változtatás. |
| 6 | Új példa a `list_categories` eszköz használatára a `<examples>` blokkban | A `konvenciok.md` XML-struktúra ajánlása szerint a `<examples>` blokknak reprezentatívnak kell lennie; enélkül a modellnek csak egyetlen, `run_sql`-központú mintája lett volna, ami alultanítja az új eszköz helyes használatát. |

## Mit NEM változtattunk

- Az XML-szerű tag-struktúra (`<role>`, `<schema>`, `<rules>`, `<examples>`) változatlan - ez a `konvenciok.md` kötelező konvenciója.
- A SELECT-only és LIMIT szabályok szó szerint megmaradtak - ezek NFR1 (Biztonság) alapkövei, módosításuk kockázatos lenne indoklás nélkül.

## Tesztelés

A `packages/core/tests/system-prompt.test.ts` új asszerciókkal bővült, amelyek minden fenti, tartalmi változtatást lefednek (list_categories említése, Ft-formázás, tool-result bizalmi határ), hogy a prompt jövőbeli módosítása ne törhesse el ezeket észrevétlenül.
