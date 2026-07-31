/* ══════════════════════════════════════════════════════════════════
   home.js · Nur für die Startseite.

   Zwei Aufgaben:

   1. Die laufende Zahl im Seitenkopf. Sie zeigt, was ein festes,
      offen ausgewiesenes Beispielobjekt verliert, seit die Seite
      geöffnet wurde. Sie ist die größte Zahl der Website und das
      einzige, was sich darauf bewegt.

      Der Betrag ist klein, das ist der Punkt: Er läuft sichtbar,
      und der Satz darunter rechnet ihn auf Jahr und Tag hoch. Die
      Kennzeichnung als Beispielrechnung steht direkt daneben, eine
      Zahl ohne Objektbezug wäre irreführend nach § 5 UWG.

   2. Die Übergabe der Postleitzahl an die Analyse. Wer auf der
      Startseite tippt, soll nicht auf der nächsten Seite noch
      einmal tippen.
   ══════════════════════════════════════════════════════════════════ */

(function (global) {
  "use strict";

  var doc = document;
  function q(s, c) { return (c || doc).querySelector(s); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c];
    });
  }

  /* Das Beispielobjekt. Bewusst ein typischer Fall aus dem
     Einzugsgebiet: Nachkriegs-Einfamilienhaus, Gasheizung, nie
     energetisch angefasst. Wer so eines hat, erkennt sich sofort. */
  var BEISPIEL = {
    plz: "74072", stadtteil: "Innenstadt",
    objekttyp: "efh", baujahr: 1968, wohnflaeche: 145,
    heizung: "erdgas", energieklasse: "unbekannt",
    nutzung: "selbst", kaltmiete: 0, sanierungen: []
  };

  function laufendeZahl() {
    var kasten = q("[data-beispiel]");
    if (!kasten) return;

    var wertKnoten = q("[data-laufwert]", kasten);
    var zeitKnoten = q("[data-laufzeit]", kasten);
    var satzKnoten = q("[data-laufsatz]", kasten);
    var jahrKnoten = q("[data-beispiel-jahr]", kasten);
    var zeileKnoten = q("[data-beispiel-zeile]", kasten);
    var statisch = doc.documentElement.dataset.statisch === "ja";

    global.Engine.laden().then(function () {
      var e = global.Engine.rechne(BEISPIEL);
      if (!e.ok) { kasten.hidden = true; return; }

      var fmt = global.Engine.fmt;

      /* Der Satz unter der laufenden Zahl. Er ist der Maßstab: Ohne
         ihn steht dort ein Betrag mit vier Nullen hinter dem Komma
         und niemand weiß, ob das viel ist. */
      if (satzKnoten) {
        satzKnoten.innerHTML =
          "verliert dieses Haus, während Sie es lesen. Das sind <strong>" +
          esc(fmt.euro(e.jahr_gesamt_eur)) + "</strong> im Jahr und <strong>" +
          esc(fmt.euro(e.pro_tag_eur)) + "</strong> an jedem Tag, an dem nichts passiert.";
      }

      if (jahrKnoten) {
        jahrKnoten.textContent =
          fmt.euro(e.jahr_gesamt_eur) + " pro Jahr · " + fmt.euro(e.pro_tag_eur) + " pro Tag";
      }

      /* Die Objektzeile trägt die Kennzeichnung. Sie steht direkt
         unter der Zahl und nennt, worum es überhaupt geht. */
      if (zeileKnoten) {
        zeileKnoten.textContent =
          "Beispielrechnung: Einfamilienhaus, " + BEISPIEL.wohnflaeche + " m², Baujahr " +
          BEISPIEL.baujahr + ", Gasheizung, Klasse " + e.energieklasse.klasse +
          (e.energieklasse.geschaetzt ? " (geschätzt)" : "") + ", " +
          BEISPIEL.plz + " " + BEISPIEL.stadtteil + ". Kein Angebot.";
      }

      if (statisch) {
        if (wertKnoten) wertKnoten.textContent = "0,0000 €";
        return;
      }

      ticker(e.pro_sekunde_eur);

      /* ── Der Ticker ─────────────────────────────────────────────
         Vier Nachkommastellen, damit die hinterste Stelle sichtbar
         läuft: Bei rund 7.800 € im Jahr wechselt sie etwa zweimal
         pro Sekunde.

         Im Hintergrundtab hält er an. Der Browser liefert dort
         ohnehin keine Bilder mehr, und weiterzuzählen hieße, dem
         Besucher Zeit zu berechnen, die er gar nicht gesehen hat.
         Die gelaufenen Sekunden bleiben stehen und laufen bei der
         Rückkehr weiter, der Zähler springt also nicht zurück.

         tick als benannte Funktionsdeklaration, nicht als benannter
         Funktionsausdruck: Der Name eines Ausdrucks gilt nur
         INNERHALB der Funktion. Beim Zurückschalten warf der Aufruf
         deshalb still einen ReferenceError, und der Ticker stand
         endgültig.                                                */
      function ticker(proSek) {
        var f4 = new Intl.NumberFormat("de-DE", {
          style: "currency", currency: "EUR",
          minimumFractionDigits: 4, maximumFractionDigits: 4
        });
        var t0 = performance.now();
        var gelaufen = 0;      // Sekunden aus früheren Sichtbarkeitsphasen
        var an = true;

        function sekunden() { return gelaufen + (performance.now() - t0) / 1000; }

        function uhr(sek) {
          var m = Math.floor(sek / 60), s = Math.floor(sek % 60);
          return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
        }

        function tick() {
          if (!an) return;
          var sek = sekunden();
          if (wertKnoten) wertKnoten.textContent = f4.format(sek * proSek);
          if (zeitKnoten) zeitKnoten.textContent = uhr(sek);
          requestAnimationFrame(tick);
        }
        tick();

        doc.addEventListener("visibilitychange", function () {
          if (doc.hidden) {
            if (an) { gelaufen = sekunden(); an = false; }
          } else if (!an) {
            t0 = performance.now(); an = true; tick();
          }
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

  function los() { laufendeZahl(); plzUebergabe(); }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", los);
  else los();

})(window);
