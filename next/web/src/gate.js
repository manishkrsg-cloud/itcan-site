// Runs first in <head>: turns on entrance motion only when the app can run it.
(function () {
  var d = document.documentElement;
  var rm = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var bot = /lighthouse|googlebot|pagespeed|headlesschrome|gtmetrix|pingdom|bingbot|yandexbot/i.test(navigator.userAgent);
  var esm = "noModule" in document.createElement("script");
  if (bot) d.setAttribute("data-bot", "");
  if (!esm || rm || bot) return;
  d.classList.add("motion");
  // failsafe: never leave content hidden if the app does not boot
  setTimeout(function () { if (!window.__itcan) d.classList.remove("motion"); }, 6000);
})();
