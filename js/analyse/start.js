/* ══════════════════════════════════════════════════════════════════
   start.js · Zündschlüssel der Potenzial-Analyse.
   Lädt die Daten, übernimmt eine mitgegebene PLZ und startet den
   Wizard. Muss als LETZTES Skript der Seite eingebunden werden.
   ══════════════════════════════════════════════════════════════════ */

(function (global) {
  "use strict";

  function los() {
    var behaelter = document.getElementById("analyse");
    if (!behaelter) return;

    behaelter.innerHTML =
      '<p class="etikett">Daten werden geladen</p>' +
      '<div class="wz__balken" style="--fortschritt:12%"><i></i></div>';

    global.Engine.laden().then(function () {
      var vorbelegung = {};
      var param = new URLSearchParams(location.search).get("plz");
      if (param && /^\d{5}$/.test(param) && global.Engine.ortFuerPlz(param)) {
        vorbelegung.plz = param;
      }
      global.Wizard.start(behaelter, vorbelegung);
    }).catch(function (fehler) {
      console.error("[Potenzial-Analyse]", fehler);
      behaelter.innerHTML =
        '<div class="wz__schluss rahmen">' +
          '<p class="etikett">Vorübergehend nicht verfügbar</p>' +
          '<h2>Die Analyse lässt sich gerade nicht starten.</h2>' +
          '<p class="gross">Wir rechnen lieber gar nicht als mit ungeprüften Zahlen. ' +
          'Schreiben Sie uns kurz — Sie bekommen die Einschätzung dann von Hand, meist am selben Tag.</p>' +
          '<a class="knopf knopf--signal knopf--gross" href="/micheal-preview/kontakt.html">Einschätzung anfragen ' +
          '<span class="pfeil">→</span></a>' +
        '</div>';
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", los);
  else los();

})(window);
