# WoT Depot Analytic

[Русская версия](README_ru.md) · [Українська версія](README_ua.md)

**For when you have hundreds of tanks in your garage and can no longer remember what is mounted where.** With a single
click, WoT Depot Analytic scans your entire garage and shows the contents of every vehicle:
equipment, consumables, boosters, shells, crew, styles and camouflages. You can also bulk-demount any equipment using the selected filter: just check what you want to remove, make sure you can afford it, and confirm.

**Client:** 2.4.0.0 · **Mod version:** 0.4.0

## Download

Permanent links that always point to the latest build:

- [`wot_depot.wotmod`](https://github.com/pavel-vireks/wot-depot-analytic/releases/download/latest/wot_depot.wotmod) — the mod itself;
- [`net.openwg.gameface_1.1.6.wotmod`](https://github.com/pavel-vireks/wot-depot-analytic/releases/download/latest/net.openwg.gameface_1.1.6.wotmod) — the library for the in-client window;
- [`wot_depot_res_mods.zip`](https://github.com/pavel-vireks/wot-depot-analytic/releases/download/latest/wot_depot_res_mods.zip) — the mod for the `res_mods` folder (alternative installation method).

---

## Who this mod is for

If you collect vehicles and are a passionate collector, this mod gives you a complete inventory of your priceless collection:

- **Your whole collection in one window.** The mod has been tested on a garage of 750 tanks. The report
  is built in a couple of seconds.
- **Dedicated filters for special vehicles:** **collector**,
  **premium**, **promotional**. Checkboxes can be combined, e.g. "all
  Tier VIII USSR collector vehicles".
- **Styles and customization.** See which style or camouflage is applied to each
  vehicle and for which season ("Winter", "Summer", "Desert" or "all seasons"), and for
  camouflages, also on which part of the tank.
- **Grade-aware equipment.** Experimental, bond, trophy and
  improved trophy equipment look almost identical in the game, but the mod distinguishes them
  with a colored stripe and a label. You can instantly see where rare equipment is mounted that you can remove and move to another favorite tank.
- **Depot.** Each equipment tile shows how many of those items
  are sitting idle. Items stored in the depot are listed as well.
- **Crew.** All crew members with their perks. A separate **"crew with a
  zero perk"** filter finds crews that have a free perk (e.g. "Brothers
  in Arms").

---

## Right inside the game client

A button appears in the garage footer, to the left of "Menu". It opens
a full-screen report.

**Four tabs:**

| Tab                | What it shows                                                                         |
|--------------------|---------------------------------------------------------------------------------------|
| **Tanks**          | List of vehicles. Click a tank to see what is mounted on it                           |
| **Items summary**  | Every item: how many tanks it is mounted on and which ones                            |
| **Equipment**      | Tiles with in-game icons, grouped by grade and class, with the depot stock            |
| **Demount**        | A separate tab for removing equipment; it refreshes as soon as you switch to it       |

**Tools:**

- **Search everything:** by tank, item, crew member, style.
- **Filters:** nation, class, tier, category; "premium /
  collector / promotional" flags; tank contents ("with crew", "with
  equipment", "with consumables", "fully equipped").
- **Sorting** by any column.
- **Navigation:** clicking an item or tile shows all tanks where it is
  mounted; use the "back" button to return.

**Example:** click the "Experimental Loading System" tile and immediately
see every tank it is mounted on.

**"Refresh"** and **"Open in browser"** buttons; close the window with the cross or Esc.

---

## Export to files

Every report is saved to the `tank_report` folder next to the game:

- **HTML page** — the same interactive report, opened in a browser.
  Handy for showing your collection to a friend or viewing it on a second monitor.
- **"Long" CSV** — one row per item, for pivot tables in Excel.
- **"Wide" CSV** — one row per tank, for a quick overview.

Excel opens both CSV files with a double click.

The browser report can also be opened in your system browser with **Ctrl+F9**.

---

## Installation

1. Download [`wot_depot.wotmod`](https://github.com/pavel-vireks/wot-depot-analytic/releases/download/latest/wot_depot.wotmod)
   and [`net.openwg.gameface_1.1.6.wotmod`](https://github.com/pavel-vireks/wot-depot-analytic/releases/download/latest/net.openwg.gameface_1.1.6.wotmod).
2. Put both files into `<game folder>\mods\2.4.0.0\`.
3. Launch the game. On the first launch the library **will restart the
   client once by itself** — this is how it registers mod windows.

If you already have `net.openwg.gameface` installed (it ships with many
mods, e.g. modsListApi), don't add a second copy — keep just one, the
newer one.

The mod also works without the library, but only via **Ctrl+F9** and the browser:
there will be no button in the garage.

**Alternative method — the `res_mods` folder:** extract
[`wot_depot_res_mods.zip`](https://github.com/pavel-vireks/wot-depot-analytic/releases/download/latest/wot_depot_res_mods.zip)
into the game folder. Don't use both methods at once: files from `res_mods` override
the `.wotmod`.

**After a game patch** the mods folder changes (e.g. `mods\2.4.0.0` → the new
version). Move both the mod and `net.openwg.gameface` there.

## Configuration (optional)

Put `tank_report.json` into the game folder:

```json
{
  "hotkey": "KEY_F9",
  "hotkeyRequiresCtrl": true,
  "browserMode": "system",
  "styleDetails": false,
  "hideCustomizationTypes": ["emblem"],
  "chunkSize": 25,
  "hangarButton": true
}
```

- `browserMode`: `system` — regular browser (default), `off` — files
  only.
- `styleDetails`: `true` — list style details individually.
- `hideCustomizationTypes`: which customization types to hide; an empty list
  shows everything.
- `hangarButton`: `false` removes the button from the garage.

## Security

- The mod sends nothing to the internet. For the browser version it starts
  a small web server accessible only on your computer (`127.0.0.1`).
- The mod only reads garage data. The one exception is equipment demounting: it happens only
  on the **Demount** tab and only after you explicitly confirm it.

---

The mod is distributed in compiled form (the window files are HTML/CSS/JS, which
the client reads as is). `net.openwg.gameface` is a third-party library from the
OpenWG project, included for ease of installation, obtained from the repository https://gitlab.com/openwg/wot.gameface/-/releases/v1.1.6

The mod was created with the help of Claude, an AI assistant by Anthropic.
