/* ══════════════════════════════════════════════════════════════════
   home.js · Nur für die Startseite.

   Zwei Aufgaben:

   1. Das Messfeld im Seitenkopf. Es zeigt zwei Zahlen, und die
      Reihenfolge ist der ganze Punkt:

        · Der Jahresbetrag. Er zählt beim ersten Blick einmal hoch,
          rastet ein und bleibt stehen. Er sagt, worum es geht.
        · Der Ticker darunter. Er läuft ab dem Öffnen der Seite
          weiter und macht den Jahresbetrag greifbar: Man sieht das
          Geld abfließen, während man liest.

      Beide hängen an derselben Rechnung für ein festes, offen
      ausgewiesenes Beispielobjekt. Die Kennzeichnung steht über der
      Zahl, eine Zahl ohne Objektbezug wäre irreführend nach § 5 UWG.

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

    var wertKnoten  = q("[data-laufwert]", kasten);
    var zeitKnoten  = q("[data-laufzeit]", kasten);
    var jahrKnoten  = q("[data-jahrwert]", kasten);
    var tagKnoten   = q("[data-tagzeile]", kasten);
    var zeileKnoten = q("[data-beispiel-zeile]", kasten);
    var postenListe = q("[data-posten]", kasten);
    var statisch = doc.documentElement.dataset.statisch === "ja";

    global.Engine.laden().then(function () {
      var e = global.Engine.rechne(BEISPIEL);
      if (!e.ok) { kasten.hidden = true; return; }

      var fmt = global.Engine.fmt;

      /* Die Objektzeile trägt die Kennzeichnung. Trockene Aufzählung
         mit Mittelpunkten wie auf einem Typenschild, nicht als Satz:
         Sie soll gelesen, aber nicht erzählt werden. */
      if (zeileKnoten) {
        zeileKnoten.textContent = [
          "Einfamilienhaus",
          BEISPIEL.wohnflaeche + " m²",
          "Bj. " + BEISPIEL.baujahr,
          "Gasheizung",
          "Klasse " + e.energieklasse.klasse + (e.energieklasse.geschaetzt ? " geschätzt" : ""),
          BEISPIEL.plz + " " + BEISPIEL.stadtteil
        ].join(" · ");
      }

      /* Der Jahresbetrag ist abstrakt, der Tagessatz nicht. Diese
         halbe Zeile macht aus der Zahl eine Vorstellung. */
      if (tagKnoten) {
        tagKnoten.innerHTML = " · <span class=\"zahl\">" + esc(fmt.euro(e.pro_tag_eur)) + "</span> pro Tag";
      }

      /* ── Die Posten ─────────────────────────────────────────────
         Nur, was wirklich in der Summe steht. Das Mietpotenzial bei
         Eigennutzung gehört ausdrücklich NICHT hierher: Es ist
         erzielbare Miete, kein laufender Verlust, und stünde als
         größte Zahl der Reihe genau falsch.                       */
      if (postenListe) {
        var posten = (e.hebel || []).filter(function (h) {
          return h.in_summe && h.betrag_jahr > 0;
        });
        postenListe.innerHTML = posten.map(function (h) {
          return "<div><dt>" + esc(h.label) + "</dt>" +
                 "<dd class=\"zahl\">" + esc(fmt.euro(h.betrag_jahr_gerundet)) + "</dd></div>";
        }).join("");

        /* Der Wertabschlag steht hier ausdrücklich NICHT, obwohl er
           die größte Zahl der ganzen Rechnung ist. Er fällt einmal an
           statt jedes Jahr, und ein sechsstelliger Betrag neben einem
           vierstelligen zieht jeden Blick auf sich. So bleibt das
           Feld prüfbar: Die Posten ergeben addiert genau die große
           Zahl darüber. Der Abschlag steht vollständig im Ergebnis
           der Analyse. */
      }

      var ziel = e.jahr_gesamt_eur;

      if (statisch) {
        if (jahrKnoten) jahrKnoten.textContent = fmt.euro(ziel);
        if (wertKnoten) wertKnoten.textContent = "0,0000 €";
        return;
      }

      /* ── Die große Zahl zählt einmal hoch ───────────────────────
         Sie ist der Anschlag, nicht die Messung: Sobald sie steht,
         übernimmt der Ticker. Gestartet wird erst, wenn das Feld
         wirklich zu sehen ist, sonst läuft das Beste der Seite ins
         Leere.                                                    */
      var start = null;
      var dauer = 1800;
      function schritt(t) {
        if (start === null) start = t;
        var p = Math.min(1, (t - start) / dauer);
        var ease = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
        if (jahrKnoten) jahrKnoten.textContent = fmt.euro(ziel * ease);
        if (p < 1) requestAnimationFrame(schritt);
        else ticker(e.pro_sekunde_eur);
      }

      if ("IntersectionObserver" in global) {
        var beob = new IntersectionObserver(function (ein) {
          ein.forEach(function (x) {
            if (x.isIntersecting) { beob.disconnect(); requestAnimationFrame(schritt); }
          });
        }, { threshold: 0.3 });
        beob.observe(kasten);
      } else {
        requestAnimationFrame(schritt);
      }

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
        /* t0 = 0, nicht performance.now(): performance.now() zählt ab
           dem Öffnen der Seite, und genau das behauptet die Zeile
           daneben. Würde der Ticker erst beim Einrasten der großen
           Zahl bei null anfangen, fehlten ihm die zwei Sekunden davor
           und die Beschriftung wäre gelogen. */
        var t0 = 0;
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
