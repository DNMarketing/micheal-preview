/* ══════════════════════════════════════════════════════════════════
   home.js · Nur für die Startseite.

   Zwei Aufgaben:

   1. Der Beispiel-Zähler im Hero. Er läuft mit einem festen,
      offen ausgewiesenen Beispielobjekt und zeigt vor dem ersten
      Klick, was am Ende herauskommt. Er ist ausdrücklich als
      Beispielrechnung beschriftet — eine Zahl ohne Objektbezug
      wäre irreführend.

   2. Die Übergabe der Postleitzahl an die Analyse. Wer auf der
      Startseite tippt, soll nicht auf der nächsten Seite noch
      einmal tippen.
   ══════════════════════════════════════════════════════════════════ */

(function (global) {
  "use strict";

  var doc = document;
  function q(s, c) { return (c || doc).querySelector(s); }

  /* Das Beispielobjekt. Bewusst ein typischer Fall aus dem
     Einzugsgebiet: Nachkriegs-Einfamilienhaus, Gasheizung, nie
     energetisch angefasst. Wer so eines hat, erkennt sich sofort. */
  var BEISPIEL = {
    plz: "74072", stadtteil: "Innenstadt",
    objekttyp: "efh", baujahr: 1968, wohnflaeche: 145,
    heizung: "erdgas", energieklasse: "unbekannt",
    nutzung: "selbst", kaltmiete: 0, sanierungen: []
  };

  function beispielZaehler() {
    var kasten = q("[data-beispiel]");
    if (!kasten) return;

    var zahlKnoten = q(".zaehler__zahl", kasten);
    var tickerKnoten = q(".ticker__wert", kasten);
    var zeile = q("[data-beispiel-zeile]", kasten);
    var statisch = doc.documentElement.dataset.statisch === "ja";

    global.Engine.laden().then(function () {
      var e = global.Engine.rechne(BEISPIEL);
      if (!e.ok) { kasten.hidden = true; return; }

      if (zeile) {
        zeile.textContent =
          "Beispiel: Einfamilienhaus, " + BEISPIEL.wohnflaeche + " m², Baujahr " + BEISPIEL.baujahr +
          ", Gasheizung, Klasse " + e.energieklasse.klasse + " (geschätzt), " +
          BEISPIEL.plz + " " + BEISPIEL.stadtteil;
      }

      var fmt = global.Engine.fmt;
      var ziel = e.jahr_gesamt_eur;

      if (statisch) {
        zahlKnoten.textContent = fmt.euro(ziel);
        tickerKnoten.textContent = "0,0000 €";
        return;
      }

      var start = null;
      var dauer = 2100;
      function schritt(t) {
        if (start === null) start = t;
        var p = Math.min(1, (t - start) / dauer);
        var ease = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
        zahlKnoten.textContent = fmt.euro(ziel * ease);
        if (p < 1) requestAnimationFrame(schritt);
        else ticker(e.pro_sekunde_eur);
      }

      // Erst starten, wenn der Zähler wirklich zu sehen ist.
      if ("IntersectionObserver" in global) {
        var beob = new IntersectionObserver(function (ein) {
          ein.forEach(function (x) {
            if (x.isIntersecting) { beob.disconnect(); requestAnimationFrame(schritt); }
          });
        }, { threshold: 0.4 });
        beob.observe(kasten);
      } else {
        requestAnimationFrame(schritt);
      }

      function ticker(proSek) {
        var f = new Intl.NumberFormat("de-DE", {
          style: "currency", currency: "EUR",
          minimumFractionDigits: 4, maximumFractionDigits: 4
        });
        var t0 = performance.now();
        var an = true;
        (function tick() {
          if (!an) return;
          tickerKnoten.textContent = f.format((performance.now() - t0) / 1000 * proSek);
          requestAnimationFrame(tick);
        })();
        doc.addEventListener("visibilitychange", function () {
          if (doc.hidden) { an = false; }
          else if (!an) { an = true; t0 = performance.now(); tick(); }
        });
      }
    }).catch(function (fehler) {
      console.warn("[Startseite] Beispielrechnung nicht möglich:", fehler);
      kasten.hidden = true;
    });
  }

  /* ── PLZ-Übergabe ─────────────────────────────────────────────── */
  function plzUebergabe() {
    var form = q("[data-plz-start]");
    if (!form) return;
    var feld = q("input", form);

    feld.addEventListener("input", function () {
      feld.value = feld.value.replace(/\D/g, "").slice(0, 5);
    });

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var plz = feld.value.replace(/\D/g, "").slice(0, 5);
      location.href = "/micheal-preview/potenzial-analyse.html" + (plz.length === 5 ? "?plz=" + plz : "");
    });
  }

  function los() { beispielZaehler(); plzUebergabe(); }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", los);
  else los();

})(window);
