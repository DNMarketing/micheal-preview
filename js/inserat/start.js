/* ══════════════════════════════════════════════════════════════════
   start.js · Zündschlüssel des Inserats-Checks.
   Muss als LETZTES Skript der Seite eingebunden werden.
   ══════════════════════════════════════════════════════════════════ */

(function (global) {
  "use strict";

  function los() {
    var behaelter = document.getElementById("check");
    if (behaelter) global.InseratsCheck.start(behaelter);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", los);
  else los();

})(window);
