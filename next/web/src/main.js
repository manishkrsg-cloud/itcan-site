// ITCAN flagship site.
import { initScroll } from "./core/scroll.js";
import { initPrims } from "./core/prims.js";
import { initStory } from "./sections/story.js";
import { initNav, initDoors, initServices, initProcess, initMedia, initFooter } from "./sections/blocks.js";
import { initBuilder } from "./sections/builder.js";
import { initHall } from "./sections/hall.js";
import { initOffices } from "./sections/offices.js";

window.__itcan = true;
const safe = (name, fn) => { try { const r = fn(); if (r && r.catch) r.catch((e) => console.error(`[itcan] ${name}`, e)); } catch (e) { console.error(`[itcan] ${name}`, e); } };

safe("scroll", initScroll);
safe("nav", initNav);
safe("story", initStory);
safe("doors", initDoors);
safe("services", initServices);
safe("process", initProcess);
safe("builder", initBuilder);
safe("hall", initHall);
safe("offices", initOffices);
safe("media", initMedia);
safe("footer", initFooter);
safe("prims", () => initPrims());
