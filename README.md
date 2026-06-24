# ScratchCal — škrtací kalendář

Měsíční škrtací kalendář v papírovém útržkovém stylu. Klikneš na den a škrtneš ho,
podržením otevřeš poznámku/úkol k danému dni. Vedle kalendáře je panel s odpočty
(„za kolik dní Vánoce" apod.), kam si můžeš přidat libovolný počet cílů. Vše se
ukládá natrvalo do Supabase.

## 1. Nastavení Supabase

**Pokud zakládáš Supabase poprvé:**
1. Otevři https://supabase.com a vytvoř si nový projekt.
2. V levém menu klikni na **SQL Editor** → **New query**.
3. Vlož celý obsah souboru `supabase_setup.sql` a klikni **Run**.
   Tím se vytvoří tabulky `calendar_days` a `countdown_goals`.

**Pokud už máš ScratchCal s tabulkou `calendar_days` z dřívějška:**
1. V **SQL Editor** → **New query** vlož obsah souboru `migration_countdown_goals.sql` a klikni **Run**.
   Tím jen doplníš novou tabulku `countdown_goals` pro odpočty.

**V obou případech pak:**
4. V levém menu klikni na **Project Settings** → **API**.
   - Zkopíruj **Project URL** → to je `SUPABASE_URL`
   - Zkopíruj **service_role key** (ne anon key!) → to je `SUPABASE_SERVICE_KEY`
   - Service role key má přístup ke všemu bez RLS omezení, proto ho používáme jen
     na serveru (nikdy ne ve frontendu).

## 2. Lokální spuštění (test na vlastním PC)

V CMD ve složce projektu:

```
npm install
copy .env.example .env
```

Otevři `.env` v Notepadu a vyplň `SUPABASE_URL` a `SUPABASE_SERVICE_KEY` podle kroku 1.

Pak spusť:

```
npm start
```

Otevři v prohlížeči `http://localhost:3000`.

## 3. Nasazení na Render.com

1. Nahraj tuto složku jako nový GitHub repozitář, např. `Tomik299-design/ScratchCal`.
2. Na https://render.com klikni **New** → **Web Service**.
3. Vyber svůj repozitář `ScratchCal`.
4. Nastav:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
5. V sekci **Environment** přidej proměnné:
   - `SUPABASE_URL` = tvoje Supabase URL
   - `SUPABASE_SERVICE_KEY` = tvůj service role key
6. Klikni **Create Web Service**. Po nasazení poběží na adrese
   `https://scratchcal-xxxx.onrender.com` (přesný název uvidíš v Render dashboardu).

## Struktura projektu

```
scratchcal/
├── server.js                      # Express server + API endpoints
├── package.json
├── supabase_setup.sql              # SQL pro vytvoření obou tabulek (prvni nastaveni)
├── migration_countdown_goals.sql   # SQL jen pro doplneni tabulky cilu (pokud uz mas DB)
├── .env.example                    # šablona proměnných prostředí
└── public/
    ├── index.html
    ├── style.css                   # papírový škrtací styl
    └── app.js                      # logika kalendáře + cílů + komunikace s API
```

## API endpoints

- `GET /api/days/:month` — vrátí všechny dny pro daný měsíc (formát `2026-06`)
- `POST /api/days/:date` — uloží/aktualizuje den (formát `2026-06-23`), body: `{ crossed: true, note: "text" }`
- `DELETE /api/days/:date` — smaže záznam dne
- `GET /api/goals` — vrátí všechny odpočty/cíle
- `POST /api/goals` — vytvoří nový odpočet, body: `{ label: "Vánoce", target_date: "2026-12-24" }`
- `DELETE /api/goals/:id` — smaže odpočet
- `GET /api/health` — kontrola, že server běží

## Poznámka k bezpečnosti

Aplikace nemá login — je čistě pro osobní použití. Pokud bys ji chtěl/a sdílet
s více lidmi a chtěl/a, aby měl každý svůj vlastní kalendář, dej mi vědět —
přidáme přihlašování stejně jako u tvých předchozích projektů.
