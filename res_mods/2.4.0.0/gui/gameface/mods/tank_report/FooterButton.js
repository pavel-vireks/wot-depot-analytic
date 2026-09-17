import { playSound } from "../libs/sound.js";
import { showTooltip, hideTooltip } from "../libs/views.js";
const FEATURE = "tank_report/FooterButton";
const BUTTON_CLASS = "tankReportButton";
const unwrap = (value) =>
    value !== null && typeof value === "object" && "value" in value ? value.value : value;
const findModel = () => {
    const ids = window.subViews && window.subViews.ids ? window.subViews.ids() : [];
    for (const id of ids) {
        const model = window.subViews.get(id)?.model;
        if (model?.ModInjectModel && unwrap(model.ModInjectModel.name) === FEATURE) {
            return model;
        }
    }
    return null;
};
const createButton = () => {
    const button = document.createElement("div");
    button.className = BUTTON_CLASS;
    const icon = document.createElement("div");
    icon.className = "tankReportIcon";
    button.appendChild(icon);
    button.addEventListener("click", () => {
        const model = findModel();
        playSound("play");
        hideTooltip();
        if (model && typeof model.onClick === "function") {
            model.onClick();
        }
    });
    button.addEventListener("mouseenter", () => {
        const model = findModel();
        playSound("highlight");
        showTooltip(unwrap(model?.title) || "", unwrap(model?.description) || "");
    });
    button.addEventListener("mouseleave", () => hideTooltip());
    return button;
};
const attach = () => {
    const menuButton = document.querySelector('div[data-test-id="menu"]');
    const section = menuButton?.parentNode;
    if (menuButton && section && !section.querySelector("." + BUTTON_CLASS)) {
        section.insertBefore(createButton(), menuButton);
    }
};
let scheduled = false;
const scheduleAttach = () => {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => {
        scheduled = false;
        attach();
    }, 100);
};
engine.whenReady.then(() => {
    const observer = new MutationObserver(scheduleAttach);
    observer.observe(document.body, { childList: true, subtree: true });
    attach();
});
