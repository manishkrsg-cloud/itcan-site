// Runs first in <head>, before any stylesheet: decides whether the preloader plays.
(function () {
  var d = document.documentElement;
  // theme: a saved choice wins, otherwise dark (the brand look)
  try { if (localStorage.getItem("itcan-theme") === "light") d.setAttribute("data-theme", "light"); } catch (e) {}
  var rm = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var bot = /lighthouse|googlebot|pagespeed|headlesschrome|gtmetrix|pingdom|bingbot|yandexbot/i.test(navigator.userAgent);
  var esm = "noModule" in document.createElement("script");
  if (bot) d.setAttribute("data-bot", "");
  if (!esm) return;
  if (!rm) d.classList.add("motion");
  var seen = false;
  try { seen = sessionStorage.getItem("itcan-intro") === "1"; } catch (e) {}
  // the intro plays once per session on desktop; phones and tablets go straight to the page
  var touch = window.matchMedia && matchMedia("(hover: none) and (pointer: coarse)").matches;
  if (!rm && !bot && !seen && !touch) d.setAttribute("data-preload", "");
  // failsafe: never leave the page hidden if the app does not boot
  setTimeout(function () {
    if (!window.__itcan) {
      d.removeAttribute("data-preload");
      d.removeAttribute("data-preload-closing");
      d.classList.remove("motion");
    }
  }, 7000);
})();
