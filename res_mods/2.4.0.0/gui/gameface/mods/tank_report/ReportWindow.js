import { ModelObserver } from "../libs/model.js";
import { playSound } from "../libs/sound.js";
const LINE_BUDGET = 150;
const SUMMARY_ITEMS = 50;
const SUMMARY_NAMES = 12;
const CHIP_CLASSES = 7;
const NO_CLASS = 99;
const CLASS_RE = /\((?:Класс|class)\s*(\d+)\)/i;
const WHEEL_SPEED = 8;
const R_TANK = 0, R_CAT = 1, R_ITEM = 2, R_SETUP = 3, R_SLOT = 4, R_COUNT = 5,
    R_DETAILS = 6, R_GRADE = 7, R_ICON = 8;
const T_NAME = 0, T_NATION = 1, T_VTYPE = 2, T_TIER = 3, T_FLAGS = 4, T_INV = 5;
const D_CAT = 0, D_ITEM = 1, D_COUNT = 2, D_ICON = 3, D_GRADE = 4;
const X_TANK = 0, X_SLOT = 1, X_CD = 2, X_ITEM = 3, X_GRADE = 4, X_ICON = 5,
    X_CUR = 6, X_AMOUNT = 7, X_FLAGS = 8;
const XT_NAME = 0, XT_NATION = 1, XT_VTYPE = 2, XT_TIER = 3, XT_INV = 4;
const XF_FREE = 1, XF_WOTPLUS = 2, XF_KIT = 4;
const CONFIRM_ITEMS = 12;
const FLAGS = [
    { bit: 1, label: "Премиум", badge: "премиум", cls: "badge prem" },
    { bit: 2, label: "Коллекционный", badge: "коллекционный", cls: "badge" },
    { bit: 4, label: "Акционный", badge: "акционный", cls: "badge" },
];
const TANK_COLS = [
    ["Танк", "c-name", (t) => t.head[T_NAME]],
    ["Нация", "c-nation", (t) => S()[t.head[T_NATION]]],
    ["Класс", "c-vtype", (t) => S()[t.head[T_VTYPE]]],
    ["Уровень", "c-tier", (t) => t.head[T_TIER]],
    ["Признаки", "c-flags", (t) => t.head[T_FLAGS]],
    ["invID", "c-inv", (t) => Number(t.head[T_INV]) || 0],
    ["Строк", "c-rows", (t) => t.kids.length],
];
const SUMMARY_COLS = [
    ["Категория", "c-scat"],
    ["Предмет", "c-sitem"],
    ["Танков", "c-sn"],
    ["Танки", "c-stanks"],
];
const observer = ModelObserver();
const freshView = () => ({
    tab: "tanks",
    query: "",
    picks: {},
    flags: 0,
    content: {},
    zeroPerk: false,
    open: {},
    openCat: {},
    catLimit: {},
    expandAll: false,
    sortCol: -1,
    sortDir: 1,
    budget: LINE_BUDGET,
});
let view = freshView();
let hist = [];
let data = null;
let index = null;
let revision = -1;
let busy = false;
let statusText = null;
let dem = null;
let demRevision = -1;
let demBusy = false;
let sel = {};
const freshDemView = () => ({
    grades: {},
    paidOnly: false,
    open: {},
    budget: LINE_BUDGET,
    useKit: true,
});
let demView = freshDemView();
const S = () => data.strings;
const DS = () => dem.strings;
const selKey = (it) => dem.tanks[it[X_TANK]][XT_INV] + ":" + it[X_SLOT];
const $ = (id) => document.getElementById(id);
const unwrap = (value) =>
    value !== null && typeof value === "object" && "value" in value ? value.value : value;
const command = (name, args) => {
    const m = observer.model;
    if (m && typeof m[name] === "function") {
        if (args === undefined) {
            m[name]();
        } else {
            m[name](args);
        }
    }
};
const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) {
        node.className = className;
    }
    if (text !== undefined && text !== null && text !== "") {
        node.textContent = String(text);
    }
    return node;
};
const tri = (dir) => el("span", "tri " + dir);
const clear = (node) => {
    while (node.firstChild) {
        node.removeChild(node.firstChild);
    }
};
const show = (node, visible) => {
    node.style.display = visible ? "" : "none";
};
const onClick = (node, handler) => {
    node.addEventListener("click", (event) => {
        playSound("play");
        handler(event);
    });
};
const cmp = (a, b) => {
    if (typeof a === "number" && typeof b === "number") {
        return a - b;
    }
    a = String(a).toLowerCase();
    b = String(b).toLowerCase();
    return a < b ? -1 : a > b ? 1 : 0;
};
const clone = (value) => JSON.parse(JSON.stringify(value));
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const deviceClass = (item) => {
    const m = CLASS_RE.exec(item || "");
    return m ? parseInt(m[1], 10) : NO_CLASS;
};
const buildIndex = (d) => {
    const strings = d.strings;
    const tankCats = d.tanks.map(() => ({}));
    const zeroPerk = d.tanks.map(() => false);
    const tankText = d.tanks.map((t) =>
        [t[T_NAME], strings[t[T_NATION]], strings[t[T_VTYPE]], t[T_TIER], t[T_INV]]
            .join("\n").toLowerCase());
    const rowText = new Array(d.rows.length);
    for (let i = 0; i < d.rows.length; i++) {
        const r = d.rows[i];
        tankCats[r[R_TANK]][r[R_CAT]] = true;
        if (r[R_CAT] === d.crewCategory &&
            strings[r[R_DETAILS]].indexOf(d.freePerkMark) !== -1) {
            zeroPerk[r[R_TANK]] = true;
        }
        rowText[i] = [d.categories[r[R_CAT]], strings[r[R_ITEM]], strings[r[R_SETUP]],
            strings[r[R_SLOT]], r[R_COUNT], strings[r[R_DETAILS]]].join("\n").toLowerCase();
    }
    return { tankCats, zeroPerk, tankText, rowText };
};
const isFiltering = () => {
    if (view.query || view.flags || view.zeroPerk) {
        return true;
    }
    return Object.keys(view.picks).some((k) => view.picks[k]) ||
        Object.keys(view.content).some((k) => view.content[k]);
};
const defaultOpen = () => view.expandAll || Boolean(view.query);
const filteredRows = () => {
    const strings = S();
    const picks = view.picks;
    const need = [];
    Object.keys(view.content).forEach((k) => {
        if (view.content[k]) {
            data.contentFilters[k][1].forEach((c) => need.push(c));
        }
    });
    const tankOk = data.tanks.map((t, ti) => {
        if (picks.nation && strings[t[T_NATION]] !== picks.nation) return false;
        if (picks.vtype && strings[t[T_VTYPE]] !== picks.vtype) return false;
        if (picks.tier && String(t[T_TIER]) !== picks.tier) return false;
        if ((t[T_FLAGS] & view.flags) !== view.flags) return false;
        for (const c of need) {
            if (!index.tankCats[ti][c]) return false;
        }
        return !(view.zeroPerk && !index.zeroPerk[ti]);
    });
    const catPick = picks.category ? data.categories.indexOf(picks.category) : -1;
    const needle = view.query;
    const out = [];
    for (let i = 0; i < data.rows.length; i++) {
        const r = data.rows[i];
        if (!tankOk[r[R_TANK]]) continue;
        if (catPick !== -1 && r[R_CAT] !== catPick) continue;
        if (needle && index.tankText[r[R_TANK]].indexOf(needle) === -1 &&
            index.rowText[i].indexOf(needle) === -1) continue;
        out.push(r);
    }
    return out;
};
const chip = (catIdx) =>
    el("span", "chip k" + (catIdx % CHIP_CLASSES), data.categories[catIdx]);
const ctxOf = (ctx) => ctx || data;
const gradeTag = (grade, ctx) =>
    grade ? el("span", "gtag " + (ctxOf(ctx).gradeClasses[grade] || ""), grade) : null;
const iconUrl = (iconIdx, ctx) => {
    const c = ctxOf(ctx);
    const file = c.strings[iconIdx];
    return file ? c.iconRoot + file : "";
};
const itemCell = (className, itemIdx, gradeIdx, iconIdx, ctx) => {
    const c = ctxOf(ctx);
    const cell = el("div", className);
    const url = iconUrl(iconIdx, c);
    if (url) {
        const ico = el("div", "ico");
        ico.style.backgroundImage = "url(" + url + ")";
        cell.appendChild(ico);
    }
    cell.appendChild(el("span", "txt", c.strings[itemIdx]));
    const tag = gradeTag(c.strings[gradeIdx], c);
    if (tag) {
        cell.appendChild(tag);
    }
    return cell;
};
const moreButton = (content, label, handler) => {
    const more = el("div", "more");
    const btn = el("div", "btn", label);
    onClick(btn, handler);
    more.appendChild(btn);
    content.appendChild(more);
};
const renderHead = (cols) => {
    const head = $("thead");
    clear(head);
    if (!cols) {
        show(head, false);
        return;
    }
    show(head, true);
    if (view.tab === "tanks") {
        head.appendChild(el("div", "c-tw"));
    }
    cols.forEach((col, i) => {
        const th = el("div", "th " + col[1], col[0]);
        if (i === view.sortCol) {
            th.appendChild(tri(view.sortDir > 0 ? "up" : "down"));
        }
        if (view.tab === "tanks" || i < 3) {
            onClick(th, () => {
                view.sortDir = view.sortCol === i ? -view.sortDir : 1;
                view.sortCol = i;
                render(true);
            });
        }
        head.appendChild(th);
    });
};
const groupByTank = (rows) => {
    const map = {};
    const order = [];
    for (const r of rows) {
        let g = map[r[R_TANK]];
        if (!g) {
            g = map[r[R_TANK]] = { idx: r[R_TANK], head: data.tanks[r[R_TANK]], kids: [] };
            order.push(g);
        }
        g.kids.push(r);
    }
    return order;
};
const renderKid = (r, band) => {
    const strings = S();
    const line = el("div", band ? "kid band" : "kid");
    const cat = el("div", "k-cat");
    cat.appendChild(chip(r[R_CAT]));
    line.appendChild(cat);
    line.appendChild(el("div", "k-setup txt", strings[r[R_SETUP]]));
    line.appendChild(el("div", "k-slot", strings[r[R_SLOT]]));
    line.appendChild(itemCell("k-item", r[R_ITEM], r[R_GRADE], r[R_ICON]));
    line.appendChild(el("div", "k-count", r[R_COUNT]));
    const details = strings[r[R_DETAILS]];
    line.appendChild(el("div", "k-details", details === strings[r[R_GRADE]] ? "" : details));
    return line;
};
const renderTanks = (content, rows) => {
    const strings = S();
    const groups = groupByTank(rows);
    if (view.sortCol >= 0) {
        const key = TANK_COLS[view.sortCol][2];
        const dir = view.sortDir;
        groups.sort((a, b) => cmp(key(a), key(b)) * dir || a.idx - b.idx);
    }
    const def = defaultOpen();
    let used = 0;
    let band = 0;
    let shown = 0;
    for (const g of groups) {
        if (used >= view.budget) break;
        const open = view.open.hasOwnProperty(g.idx) ? view.open[g.idx] : def;
        const t = g.head;
        band ^= 1;
        shown++;
        const row = el("div", band ? "row head click band" : "row head click");
        const tw = el("div", "c-tw");
        tw.appendChild(tri(open ? "down" : "right"));
        row.appendChild(tw);
        row.appendChild(el("div", "c-name", t[T_NAME]));
        row.appendChild(el("div", "c-nation", strings[t[T_NATION]]));
        row.appendChild(el("div", "c-vtype", strings[t[T_VTYPE]]));
        row.appendChild(el("div", "c-tier", t[T_TIER]));
        const flags = el("div", "c-flags");
        FLAGS.forEach((f) => {
            if (t[T_FLAGS] & f.bit) flags.appendChild(el("span", f.cls, f.badge));
        });
        row.appendChild(flags);
        row.appendChild(el("div", "c-inv dim", t[T_INV]));
        row.appendChild(el("div", "c-rows dim", g.kids.length));
        onClick(row, () => {
            view.open[g.idx] = !open;
            render();
        });
        content.appendChild(row);
        used++;
        if (open) {
            for (const r of g.kids) {
                content.appendChild(renderKid(r, band));
            }
            used += g.kids.length;
        }
    }
    if (shown < groups.length) {
        moreButton(content, "Показать ещё (танков: " + (groups.length - shown) + ")", () => {
            view.budget += LINE_BUDGET;
            render();
        });
    }
    return groups.length
        ? "танков: " + groups.length + " · строк: " + rows.length +
          (shown < groups.length ? " · показано танков: " + shown : "")
        : "";
};
const summarize = (rows) => {
    const map = {};
    const out = [];
    const strings = S();
    for (const r of rows) {
        if (!strings[r[R_ITEM]]) continue;
        const key = r[R_CAT] + "|" + r[R_ITEM] + "|" + r[R_GRADE];
        let e = map[key];
        if (!e) {
            e = map[key] = { cat: r[R_CAT], item: r[R_ITEM], grade: r[R_GRADE],
                icon: r[R_ICON], tanks: {}, n: 0 };
            out.push(e);
        }
        if (!e.tanks[r[R_TANK]]) {
            e.tanks[r[R_TANK]] = true;
            e.n++;
        }
        if (!strings[e.icon] && strings[r[R_ICON]]) {
            e.icon = r[R_ICON];
        }
    }
    return out;
};
const renderSummary = (content, rows) => {
    const strings = S();
    const agg = summarize(rows);
    const c = view.sortCol;
    const d = view.sortDir;
    agg.sort((a, b) => {
        if (c === 1) return cmp(strings[a.item], strings[b.item]) * d;
        if (c === 2) return (a.n - b.n) * d;
        return b.n - a.n;
    });
    const byCat = {};
    const cats = [];
    for (const e of agg) {
        if (!byCat[e.cat]) {
            byCat[e.cat] = [];
            cats.push(e.cat);
        }
        byCat[e.cat].push(e);
    }
    cats.sort((a, b) => (a - b) * (c === 0 ? d : 1));
    const def = defaultOpen();
    let band = 0;
    let used = 0;
    let shownCats = 0;
    for (const cat of cats) {
        if (used >= view.budget) break;
        const list = byCat[cat];
        const open = view.openCat.hasOwnProperty(cat) ? view.openCat[cat] : def;
        band ^= 1;
        shownCats++;
        const row = el("div", band ? "row head click band" : "row head click");
        const cell = el("div", "c-scat");
        cell.appendChild(tri(open ? "down" : "right"));
        cell.appendChild(chip(cat));
        row.appendChild(cell);
        row.appendChild(el("div", "c-sitem dim", "предметов: " + list.length));
        onClick(row, () => {
            view.openCat[cat] = !open;
            render();
        });
        content.appendChild(row);
        used++;
        if (!open) continue;
        const limit = view.catLimit[cat] || SUMMARY_ITEMS;
        for (const e of list.slice(0, limit)) {
            const line = el("div", band ? "kid click band" : "kid click");
            line.appendChild(el("div", "c-scat"));
            line.appendChild(itemCell("c-sitem k-item", e.item, e.grade, e.icon));
            line.appendChild(el("div", "c-sn", e.n));
            const names = [];
            const seen = {};
            Object.keys(e.tanks).forEach((ti) => {
                const name = data.tanks[ti][T_NAME];
                if (!seen[name]) {
                    seen[name] = true;
                    names.push(name);
                }
            });
            names.sort(cmp);
            let text = names.slice(0, SUMMARY_NAMES).join(", ");
            if (names.length > SUMMARY_NAMES) {
                text += " и ещё " + (names.length - SUMMARY_NAMES);
            }
            line.appendChild(el("div", "c-stanks tanklist", text));
            onClick(line, () => goToTanks(strings[e.item]));
            content.appendChild(line);
        }
        used += Math.min(limit, list.length);
        if (list.length > limit) {
            moreButton(content, "Ещё предметов: " + (list.length - limit), () => {
                view.catLimit[cat] = limit + SUMMARY_ITEMS;
                render();
            });
        }
    }
    if (shownCats < cats.length) {
        moreButton(content, "Показать ещё (категорий: " + (cats.length - shownCats) + ")", () => {
            view.budget += LINE_BUDGET;
            render();
        });
    }
    return agg.length ? "уникальных предметов: " + agg.length : "";
};
const tileSection = (e) => {
    const strings = S();
    if (e.cat !== data.optCategory) {
        return { ord: 500 + data.tileCategories.indexOf(e.cat), label: data.categories[e.cat] };
    }
    const grade = strings[e.grade];
    if (grade) {
        const ord = data.gradeOrder[grade];
        return { ord: ord === undefined ? 4 : ord, label: cap(grade) };
    }
    const cl = deviceClass(strings[e.item]);
    if (cl < 90) {
        return { ord: 10 + cl, label: "Обычное · Класс " + cl };
    }
    return { ord: 19, label: "Обычное" };
};
const renderTile = (e) => {
    const strings = S();
    const node = el("div", "tile");
    const pic = el("div", "pic");
    const url = iconUrl(e.icon);
    if (url) {
        pic.style.backgroundImage = "url(" + url + ")";
    }
    const gradeClass = data.gradeClasses[strings[e.grade]];
    if (gradeClass) {
        pic.appendChild(el("div", "stripe " + gradeClass));
        if (gradeClass === "g-trophyup") {
            pic.appendChild(el("div", "stripe second " + gradeClass));
        }
    }
    node.appendChild(pic);
    const info = el("div", "info");
    const n = el("div", "n");
    n.appendChild(el("span", "", String(e.n)));
    n.appendChild(el("span", "unit", "танк."));
    info.appendChild(n);
    const nm = el("div", "nm");
    nm.appendChild(el("span", "", strings[e.item]));
    const tag = gradeTag(strings[e.grade]);
    if (tag) {
        nm.appendChild(tag);
    }
    info.appendChild(nm);
    if (e.depot) {
        info.appendChild(el("div", "st", "на складе: " + e.depot));
    }
    node.appendChild(info);
    if (e.n) {
        onClick(node, () => goToTanks(strings[e.item]));
    } else {
        node.className = "tile depot";
    }
    return node;
};
const renderGear = (content, rows) => {
    const strings = S();
    const all = [];
    const seen = {};
    for (const e of summarize(rows)) {
        if (data.tileCategories.indexOf(e.cat) === -1) continue;
        e.depot = 0;
        all.push(e);
        seen[e.cat + "|" + strings[e.item] + "|" + strings[e.grade]] = e;
    }
    const filtering = isFiltering();
    for (const d of data.depot) {
        const hit = seen[d[D_CAT] + "|" + strings[d[D_ITEM]] + "|" + strings[d[D_GRADE]]];
        if (hit) {
            hit.depot += d[D_COUNT];
            if (!strings[hit.icon]) hit.icon = d[D_ICON];
            continue;
        }
        if (filtering) continue;
        all.push({ cat: d[D_CAT], item: d[D_ITEM], grade: d[D_GRADE], icon: d[D_ICON],
            n: 0, depot: d[D_COUNT] });
    }
    const secMap = {};
    const secs = [];
    for (const e of all) {
        const sec = tileSection(e);
        const key = sec.ord + "|" + sec.label;
        if (!secMap[key]) {
            secMap[key] = { ord: sec.ord, label: sec.label, items: [] };
            secs.push(secMap[key]);
        }
        secMap[key].items.push(e);
    }
    secs.sort((x, y) => x.ord - y.ord || cmp(x.label, y.label));
    const box = el("div", "tiles");
    for (const sec of secs) {
        sec.items.sort((a, b) => b.n - a.n || b.depot - a.depot ||
            cmp(strings[a.item], strings[b.item]));
        const node = el("div", "tsec");
        const head = el("div", "head");
        head.appendChild(el("span", "", sec.label));
        head.appendChild(el("span", "cnt", String(sec.items.length)));
        node.appendChild(head);
        const grid = el("div", "grid");
        sec.items.forEach((e) => grid.appendChild(renderTile(e)));
        node.appendChild(grid);
        box.appendChild(node);
    }
    content.appendChild(box);
    return all.length ? "типов предметов: " + all.length : "";
};
const demCurrency = (code) => (dem.currencyNames && dem.currencyNames[code]) || code;
const isPaid = (it) =>
    !(it[X_FLAGS] & (XF_FREE | XF_WOTPLUS)) && it[X_AMOUNT] > 0;
const itemPrice = (it) => {
    if (it[X_FLAGS] & XF_WOTPLUS) return "бесплатно (WoT Plus)";
    if (!isPaid(it)) return "бесплатно";
    return it[X_AMOUNT] + " " + demCurrency(DS()[it[X_CUR]]);
};
const formatCost = (cost) => {
    const parts = [];
    Object.keys(cost).sort().forEach((cur) => {
        if (cost[cur]) parts.push(cost[cur] + " " + demCurrency(cur));
    });
    return parts.length ? parts.join(", ") : "бесплатно";
};
const planCost = (items) => {
    const kitsLeft = Object.assign({}, dem.kits || {});
    const cost = {};
    let kits = 0;
    for (const it of items) {
        if (!isPaid(it)) continue;
        const cur = DS()[it[X_CUR]];
        if (demView.useKit && it[X_FLAGS] & XF_KIT && (kitsLeft[cur] || 0) > 0) {
            kitsLeft[cur] -= 1;
            kits += 1;
            continue;
        }
        cost[cur] = (cost[cur] || 0) + it[X_AMOUNT];
    }
    const shortage = {};
    Object.keys(cost).forEach((cur) => {
        const have = (dem.balance && dem.balance[cur]) || 0;
        if (cost[cur] > have) shortage[cur] = cost[cur] - have;
    });
    return { cost, kits, shortage };
};
const isSelected = (it) => sel[selKey(it)] === true;
const setSelected = (it, on) => {
    const key = selKey(it);
    if (on) {
        sel[key] = true;
    } else {
        delete sel[key];
    }
};
const selectedItems = () => (dem ? dem.items.filter(isSelected) : []);
const kitsAvailable = () => {
    const kits = (dem && dem.kits) || {};
    return Object.keys(kits).reduce((sum, cur) => sum + (kits[cur] || 0), 0);
};
const demFiltered = () => {
    const strings = DS();
    const needle = view.query;
    const grades = demView.grades;
    const anyGrade = Object.keys(grades).some((k) => grades[k]);
    const out = [];
    for (const it of dem.items) {
        if (demView.paidOnly && !isPaid(it)) continue;
        if (anyGrade && !grades[strings[it[X_GRADE]]]) continue;
        if (needle) {
            const text = (dem.tanks[it[X_TANK]][XT_NAME] + "\n" + strings[it[X_ITEM]])
                .toLowerCase();
            if (text.indexOf(needle) === -1) continue;
        }
        out.push(it);
    }
    return out;
};
const tick = (on, partial) => {
    const node = el("div", "tick" + (on ? " on" : partial ? " part" : ""));
    node.appendChild(el("div", "mark"));
    return node;
};
const renderDemountRow = (it, band) => {
    const strings = DS();
    const on = isSelected(it);
    const line = el("div", band ? "kid click band" : "kid click");
    const cell = el("div", "x-tick");
    cell.appendChild(tick(on, false));
    line.appendChild(cell);
    line.appendChild(itemCell("x-item", it[X_ITEM], it[X_GRADE], it[X_ICON], dem));
    line.appendChild(el("div", "x-slot", "слот " + (it[X_SLOT] + 1)));
    const price = el("div", "x-price" + (isPaid(it) ? " paid" : " free"), itemPrice(it));
    line.appendChild(price);
    const kit = el("div", "x-kit",
        it[X_FLAGS] & XF_KIT ? "можно комплектом" : "");
    line.appendChild(kit);
    onClick(line, () => {
        if (demBusy) return;
        setSelected(it, !on);
        render();
    });
    return line;
};
const renderDemount = (content, items) => {
    if (!dem) {
        content.appendChild(el("div", "empty",
            demBusy ? "Читаю ангар..." : "Список не прочитан. Нажми «перечитать ангар»."));
        return "";
    }
    const strings = DS();
    const groups = [];
    const map = {};
    for (const it of items) {
        let g = map[it[X_TANK]];
        if (!g) {
            g = map[it[X_TANK]] = { idx: it[X_TANK], head: dem.tanks[it[X_TANK]], kids: [] };
            groups.push(g);
        }
        g.kids.push(it);
    }
    let used = 0;
    let band = 0;
    let shown = 0;
    for (const g of groups) {
        if (used >= demView.budget) break;
        const open = demView.open.hasOwnProperty(g.idx) ? demView.open[g.idx] : true;
        const t = g.head;
        const picked = g.kids.filter(isSelected).length;
        band ^= 1;
        shown++;
        const row = el("div", band ? "row head click band" : "row head click");
        const tw = el("div", "c-tw");
        tw.appendChild(tri(open ? "down" : "right"));
        row.appendChild(tw);
        const box = el("div", "x-tick");
        box.appendChild(tick(picked === g.kids.length, picked > 0));
        onClick(box, (event) => {
            if (demBusy) return;
            event.stopPropagation();
            const turnOn = picked < g.kids.length;
            g.kids.forEach((it) => setSelected(it, turnOn));
            render();
        });
        row.appendChild(box);
        row.appendChild(el("div", "c-name", t[XT_NAME]));
        row.appendChild(el("div", "c-vtype", strings[t[XT_VTYPE]]));
        row.appendChild(el("div", "c-tier", "ур. " + t[XT_TIER]));
        row.appendChild(el("div", "c-inv dim", "id " + t[XT_INV]));
        const sum = {};
        g.kids.forEach((it) => {
            if (isPaid(it)) {
                const cur = strings[it[X_CUR]];
                sum[cur] = (sum[cur] || 0) + it[X_AMOUNT];
            }
        });
        row.appendChild(el("div", "x-total dim",
            "снять всё: " + formatCost(sum)));
        onClick(row, () => {
            demView.open[g.idx] = !open;
            render();
        });
        content.appendChild(row);
        used++;
        if (open) {
            g.kids.forEach((it) => content.appendChild(renderDemountRow(it, band)));
            used += g.kids.length;
        }
    }
    if (shown < groups.length) {
        moreButton(content, "Показать ещё (танков: " + (groups.length - shown) + ")", () => {
            demView.budget += LINE_BUDGET;
            render();
        });
    }
    return groups.length
        ? "танков: " + groups.length + " · оборудования: " + items.length
        : "";
};
const syncDemBar = () => {
    if (!dem) {
        $("dem-count").textContent = "";
        $("dem-cost").textContent = "";
        $("dem-apply").className = "btn accent disabled";
        return;
    }
    const picked = selectedItems();
    const plan = planCost(picked);
    $("dem-count").textContent = picked.length
        ? "отмечено: " + picked.length
        : "ничего не отмечено";
    const parts = [];
    if (picked.length) {
        parts.push("спишется: " + formatCost(plan.cost));
        if (plan.kits) parts.push("комплектов: " + plan.kits);
    }
    $("dem-cost").textContent = parts.join(" · ");
    $("dem-cost").className = Object.keys(plan.shortage).length ? "cost short" : "cost";
    $("dem-apply").className = picked.length && !demBusy ? "btn accent" : "btn accent disabled";
};
const hideConfirm = () => { $("modal").style.display = "none"; };
const showConfirm = () => {
    if (!dem || demBusy) return;
    const picked = selectedItems();
    if (!picked.length) return;
    const strings = DS();
    const plan = planCost(picked);
    const body = $("modal-body");
    clear(body);
    const tanks = {};
    picked.forEach((it) => { tanks[it[X_TANK]] = true; });
    body.appendChild(el("div", "mline",
        "Предметов: " + picked.length + " · танков: " +
        Object.keys(tanks).length + " · снятое уйдёт на склад."));
    const cost = el("div", "mline big");
    cost.appendChild(el("span", "", "Спишется: "));
    cost.appendChild(el("span", "sum", formatCost(plan.cost)));
    body.appendChild(cost);
    if (plan.kits) {
        body.appendChild(el("div", "mline",
            "Демонтажных комплектов уйдёт: " + plan.kits));
    }
    const balance = {};
    Object.keys(plan.cost).forEach((cur) => {
        balance[cur] = (dem.balance && dem.balance[cur]) || 0;
    });
    if (Object.keys(balance).length) {
        body.appendChild(el("div", "mline dim", "У тебя: " + formatCost(balance)));
    }
    const short = Object.keys(plan.shortage).length;
    if (short) {
        body.appendChild(el("div", "mline warn",
            "Не хватает: " + formatCost(plan.shortage) + ". Снятие не начнётся."));
    }
    const list = el("div", "mlist");
    picked.slice(0, CONFIRM_ITEMS).forEach((it) => {
        const line = el("div", "mrow");
        line.appendChild(el("div", "t", dem.tanks[it[X_TANK]][XT_NAME]));
        line.appendChild(el("div", "i", strings[it[X_ITEM]]));
        line.appendChild(el("div", "p", itemPrice(it)));
        list.appendChild(line);
    });
    if (picked.length > CONFIRM_ITEMS) {
        list.appendChild(el("div", "mrow dim",
            "…и ещё " + (picked.length - CONFIRM_ITEMS)));
    }
    body.appendChild(list);
    const kitUsable = kitsAvailable() > 0 && picked.some((it) => it[X_FLAGS] & XF_KIT);
    const kitNode = $("modal-kit");
    show(kitNode, kitUsable);
    if (kitUsable) {
        kitNode.className = demView.useKit ? "chk on" : "chk";
        $("modal-kit-label").textContent =
            "использовать демонтажные комплекты (есть: " + kitsAvailable() + ")";
    }
    $("modal-ok").className = short ? "btn accent disabled" : "btn accent";
    $("modal").style.display = "flex";
};
const applyDemount = () => {
    const picked = selectedItems();
    if (!picked.length) return;
    if (Object.keys(planCost(picked).shortage).length) return;
    const items = picked.map((it) => [
        dem.tanks[it[X_TANK]][XT_INV], it[X_SLOT], it[X_CD]]);
    command("onDemountApply", { data: JSON.stringify({ useKit: demView.useKit, items }) });
    sel = {};
    hideConfirm();
    render();
};
const rescan = () => {
    if (demBusy) return;
    command("onDemountScan");
};
const pushHist = () => {
    hist.push(clone(view));
};
const goToTanks = (item) => {
    pushHist();
    $("search").value = String(item || "");
    view.query = String(item || "").trim().toLowerCase();
    view.tab = "tanks";
    view.sortCol = -1;
    view.sortDir = 1;
    view.budget = LINE_BUDGET;
    syncControls();
    layout();
    render(true);
};
const setTab = (tab) => {
    if (view.tab === tab) return;
    view.tab = tab;
    view.sortCol = -1;
    view.sortDir = 1;
    view.budget = LINE_BUDGET;
    if (tab === "demount" && !dem && !demBusy) {
        command("onDemountScan");
    }
    syncControls();
    layout();
    render(true);
};
const filterChanged = () => {
    view.budget = LINE_BUDGET;
    view.catLimit = {};
    demView.budget = LINE_BUDGET;
    syncControls();
    layout();
    render(true);
};
let dropdowns = [];
const closeDropdowns = () => {
    let closed = false;
    for (const dd of dropdowns) {
        if (dd.node.className.indexOf("open") !== -1) closed = true;
        dd.node.className = dd.node.className.replace(" open", "");
    }
    return closed;
};
const buildDropdown = (key, label, options) => {
    const node = el("div", "dd");
    const btn = el("div", "dd-btn");
    const text = el("span", "dd-label");
    btn.appendChild(text);
    btn.appendChild(tri("down dd-arrow"));
    node.appendChild(btn);
    const menu = el("div", "dd-menu");
    node.appendChild(menu);
    const items = [["", label + ": все"]].concat(options.map((o) => [o, o]));
    const itemNodes = items.map(([value, title]) => {
        const item = el("div", "dd-item", title);
        item.addEventListener("click", (event) => {
            event.stopPropagation();
            playSound("play");
            view.picks[key] = value;
            closeDropdowns();
            filterChanged();
        });
        menu.appendChild(item);
        return [value, item];
    });
    btn.addEventListener("click", (event) => {
        event.stopPropagation();
        playSound("play");
        const wasOpen = node.className.indexOf("open") !== -1;
        closeDropdowns();
        if (!wasOpen) node.className += " open";
    });
    const sync = () => {
        const value = view.picks[key] || "";
        text.textContent = value ? label + ": " + value : label + ": все";
        node.className = "dd" + (value ? " set" : "") +
            (node.className.indexOf("open") !== -1 ? " open" : "");
        for (const [v, item] of itemNodes) {
            item.className = v === value ? "dd-item on" : "dd-item";
        }
    };
    return { node, sync };
};
const buildCheck = (label, isOn, toggle) => {
    const node = el("div", "chk");
    node.appendChild(el("div", "box"));
    node.appendChild(el("span", "", label));
    onClick(node, () => {
        toggle();
        filterChanged();
    });
    return { node, sync: () => { node.className = isOn() ? "chk on" : "chk"; } };
};
let checks = [];
const buildControls = () => {
    const filters = $("filters");
    const flags = $("flags");
    const content = $("content-filters");
    clear(filters);
    clear(flags);
    clear(content);
    dropdowns = data.filters.map(([key, label, options]) => buildDropdown(key, label, options));
    dropdowns.forEach((dd) => filters.appendChild(dd.node));
    checks = [];
    FLAGS.forEach((f) => {
        const c = buildCheck(f.label, () => view.flags & f.bit, () => { view.flags ^= f.bit; });
        flags.appendChild(c.node);
        checks.push(c);
    });
    data.contentFilters.forEach(([label], i) => {
        const c = buildCheck(label, () => view.content[i],
            () => { view.content[i] = !view.content[i]; });
        content.appendChild(c.node);
        checks.push(c);
    });
    const zp = buildCheck("экипаж с 0-перком", () => view.zeroPerk,
        () => { view.zeroPerk = !view.zeroPerk; });
    content.appendChild(zp.node);
    checks.push(zp);
};
let demChecks = [];
const buildDemControls = () => {
    const box = $("dem-grades");
    clear(box);
    demChecks = [];
    if (!dem) return;
    const strings = dem.strings;
    const seen = {};
    const grades = [];
    dem.items.forEach((it) => {
        const grade = strings[it[X_GRADE]];
        if (!seen[grade]) {
            seen[grade] = true;
            grades.push(grade);
        }
    });
    grades.sort((a, b) =>
        (dem.gradeOrder[a] === undefined ? 9 : dem.gradeOrder[a]) -
        (dem.gradeOrder[b] === undefined ? 9 : dem.gradeOrder[b]));
    grades.forEach((grade) => {
        const c = buildCheck(grade || "обычное", () => demView.grades[grade],
            () => { demView.grades[grade] = !demView.grades[grade]; });
        box.appendChild(c.node);
        demChecks.push(c);
    });
    const paid = buildCheck("только платное", () => demView.paidOnly,
        () => { demView.paidOnly = !demView.paidOnly; });
    box.appendChild(paid.node);
    demChecks.push(paid);
};
const syncControls = () => {
    const search = $("search");
    if (String(search.value || "").trim().toLowerCase() !== view.query) {
        search.value = view.query;
    }
    dropdowns.forEach((dd) => dd.sync());
    checks.forEach((c) => c.sync());
    demChecks.forEach((c) => c.sync());
    ["tanks", "summary", "gear", "demount"].forEach((tab) => {
        $("tab-" + tab).className = tab === view.tab ? "tab on" : "tab";
    });
    $("expand").textContent = view.expandAll ? "свернуть все" : "развернуть все";
    const onDemount = view.tab === "demount";
    show($("filters"), !onDemount);
    show($("flags"), !onDemount);
    show($("back"), !onDemount && hist.length > 0);
    show($("reset"), !onDemount);
    show($("expand"), !onDemount && view.tab !== "gear");
    show($("controls-sub"), !onDemount);
    show($("dem-controls"), onDemount);
    show($("dembar"), onDemount);
    $("dem-rescan").className = demBusy ? "lnk disabled" : "lnk";
    if (onDemount) {
        syncDemBar();
    } else {
        hideConfirm();
    }
};
const render = (resetScroll) => {
    const content = $("content");
    const scroll = content.scrollTop;
    clear(content);
    $("meta").textContent = data ? data.meta || "" : "";
    if (view.tab === "demount") {
        renderHead(null);
        $("meta").textContent = dem && dem.stamp
            ? "Ангар прочитан: " + dem.stamp + " · снятое уходит на склад"
            : "";
        const count = dem ? renderDemount(content, demFiltered()) : renderDemount(content, []);
        if (dem && !count) {
            content.appendChild(el("div", "empty", "Ничего не найдено."));
        }
        $("count").textContent = count;
        syncDemBar();
        layout();
        content.scrollTop = resetScroll ? 0 : scroll;
        return;
    }
    if (!data) {
        renderHead(null);
        content.appendChild(el("div", "empty",
            busy ? "Собираю отчёт..." : "Отчёт ещё не собран. Нажми «Обновить»."));
        $("count").textContent = "";
        return;
    }
    const rows = filteredRows();
    let count;
    if (view.tab === "tanks") {
        renderHead(TANK_COLS);
        count = renderTanks(content, rows);
    } else if (view.tab === "summary") {
        renderHead(SUMMARY_COLS);
        count = renderSummary(content, rows);
    } else {
        renderHead(null);
        count = renderGear(content, rows);
    }
    if (!count) {
        content.appendChild(el("div", "empty", "Ничего не найдено."));
    }
    $("count").textContent = count;
    layout();
    content.scrollTop = resetScroll ? 0 : scroll;
};
const readDemount = (text) => {
    dem = null;
    if (text) {
        try {
            dem = JSON.parse(text);
        } catch (error) {
            console.error("[tank_report] bad demount payload", error);
        }
    }
    if (dem) {
        const alive = {};
        dem.items.forEach((it) => {
            const key = selKey(it);
            if (sel[key]) alive[key] = true;
        });
        sel = alive;
    } else {
        sel = {};
    }
    demView.open = {};
    demView.budget = LINE_BUDGET;
    buildDemControls();
    syncControls();
    if (view.tab === "demount") {
        layout();
        render(true);
    }
};
const readModel = () => {
    const m = observer.model;
    if (!m) return;
    const status = String(unwrap(m.status) || "");
    const nowBusy = Boolean(unwrap(m.busy));
    const busyChanged = nowBusy !== busy;
    if (status !== statusText || busyChanged) {
        statusText = status;
        const statusNode = $("status");
        statusNode.textContent = nowBusy ? status || "Собираю..." : status.split("\n")[0];
        statusNode.className = nowBusy ? "status busy" : "status";
        $("refresh").className = nowBusy ? "btn disabled" : "btn";
    }
    busy = nowBusy;
    const nowDemBusy = Boolean(unwrap(m.demountBusy));
    if (nowDemBusy !== demBusy) {
        demBusy = nowDemBusy;
        if (view.tab === "demount") {
            syncControls();
            render();
        }
    }
    const demRev = Number(unwrap(m.demountRevision)) || 0;
    if (demRev !== demRevision) {
        demRevision = demRev;
        readDemount(String(unwrap(m.demount) || ""));
    }
    const rev = Number(unwrap(m.revision)) || 0;
    if (rev === revision) {
        if (busyChanged && !data) render();
        return;
    }
    revision = rev;
    const text = String(unwrap(m.payload) || "");
    data = null;
    index = null;
    if (text) {
        try {
            const parsed = JSON.parse(text);
            index = buildIndex(parsed);
            data = parsed;
        } catch (error) {
            console.error("[tank_report] bad payload", error);
        }
    }
    view.open = {};
    view.openCat = {};
    view.catLimit = {};
    view.budget = LINE_BUDGET;
    hist = [];
    if (data) {
        const known = {};
        data.filters.forEach(([key, , options]) => { known[key] = options; });
        Object.keys(view.picks).forEach((key) => {
            if (known[key] && known[key].indexOf(view.picks[key]) === -1) view.picks[key] = "";
        });
        buildControls();
    }
    syncControls();
    layout();
    render(true);
};
const layout = () => {
    try {
        const app = $("app");
        const content = $("content");
        const appRect = app.getBoundingClientRect();
        let height = appRect.height;
        if (!height) {
            height = window.innerHeight;
            app.style.height = height + "px";
        }
        const padding = window.viewEnv && typeof viewEnv.remToPx === "function"
            ? viewEnv.remToPx(20) : 20;
        const top = content.getBoundingClientRect().top - appRect.top;
        const bar = $("dembar");
        const barHeight = bar.style.display === "none"
            ? 0 : bar.getBoundingClientRect().height;
        const wanted = Math.max(100, Math.floor(height - top - padding - barHeight));
        if (content.style.height !== wanted + "px") {
            content.style.height = wanted + "px";
        }
    } catch (error) {
        console.error("[tank_report] layout failed", error);
    }
};
const onWheel = (event) => {
    const content = $("content");
    content.scrollTop -= event.deltaY * WHEEL_SPEED;
    event.preventDefault();
    event.stopPropagation();
};
let searchTimer = null;
const onSearchInput = () => {
    const value = String($("search").value || "").trim().toLowerCase();
    if (value === view.query) return;
    if (searchTimer !== null) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        searchTimer = null;
        view.query = value;
        filterChanged();
    }, 250);
};
engine.whenReady.then(() => {
    onClick($("close"), () => command("onClose"));
    onClick($("refresh"), () => command("onRefresh"));
    onClick($("browser"), () => command("onOpenBrowser"));
    onClick($("tab-tanks"), () => setTab("tanks"));
    onClick($("tab-summary"), () => setTab("summary"));
    onClick($("tab-gear"), () => setTab("gear"));
    onClick($("tab-demount"), () => setTab("demount"));
    onClick($("dem-rescan"), () => rescan());
    onClick($("dem-all"), () => {
        if (demBusy || !dem) return;
        demFiltered().forEach((it) => setSelected(it, true));
        render();
    });
    onClick($("dem-none"), () => {
        if (demBusy) return;
        sel = {};
        render();
    });
    onClick($("dem-apply"), () => showConfirm());
    onClick($("modal-cancel"), () => hideConfirm());
    onClick($("modal-ok"), () => applyDemount());
    onClick($("modal-kit"), () => {
        demView.useKit = !demView.useKit;
        showConfirm();
    });
    $("modal").addEventListener("click", (event) => {
        if (event.target === $("modal")) hideConfirm();
    });
    onClick($("clear"), () => {
        view.query = "";
        $("search").value = "";
        filterChanged();
    });
    onClick($("reset"), () => {
        const tab = view.tab;
        view = freshView();
        view.tab = tab;
        hist = [];
        $("search").value = "";
        filterChanged();
    });
    onClick($("back"), () => {
        if (!hist.length) return;
        view = hist.pop();
        syncControls();
        render(true);
    });
    onClick($("expand"), () => {
        view.expandAll = !view.expandAll;
        view.open = {};
        view.openCat = {};
        syncControls();
        render();
    });
    const search = $("search");
    search.addEventListener("input", onSearchInput);
    search.addEventListener("keyup", onSearchInput);
    document.addEventListener("click", () => closeDropdowns());
    document.addEventListener("keydown", (event) => {
        if (event.keyCode !== 27 || closeDropdowns()) return;
        if ($("modal").style.display !== "none") {
            hideConfirm();
            return;
        }
        command("onClose");
    });
    window.addEventListener("resize", layout);
    engine.on("self.onScaleUpdated", () => setTimeout(layout, 0));
    setTimeout(layout, 100);
    setTimeout(layout, 500);
    $("content").addEventListener("wheel", onWheel);
    document.addEventListener("wheel", (event) => {
        let node = event.target;
        while (node && node !== document.body) {
            if (node.className && String(node.className).indexOf("dd-menu") !== -1) {
                node.scrollTop -= event.deltaY * WHEEL_SPEED;
                event.preventDefault();
                return;
            }
            node = node.parentNode;
        }
    }, true);
    hideConfirm();
    observer.onUpdate(readModel);
    observer.subscribe();
    setInterval(readModel, 1000);
    syncControls();
    layout();
    readModel();
    render(true);
});
