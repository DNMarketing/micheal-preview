/* ══════════════════════════════════════════════════════════════════
   main.js · Läuft auf jeder Seite.
   Navigation, Auftritte beim Scrollen, WhatsApp-Knopf,
   Käufer-Zähler, Demo-Hinweis.
   ══════════════════════════════════════════════════════════════════ */

(function (global) {
  "use strict";

  var doc = document;
  function q(s, c) { return (c || doc).querySelector(s); }
  function qa(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }

  /* ── ?statisch schaltet alle Bewegung ab ───────────────────────
     Gleiche Konvention wie in den anderen Projekten: praktisch für
     Screenshots, Abnahmen und Vergleiche.                          */
  if (location.search.indexOf("statisch") !== -1) {
    doc.documentElement.dataset.statisch = "ja";
  }

  /* ── Navigation ───────────────────────────────────────────────── */
  function navi() {
    var schalter = q(".navi-schalter");
    var liste = q(".navi");
    if (!schalter || !liste) return;

    schalter.addEventListener("click", function () {
      var offen = liste.dataset.offen === "ja";
      liste.dataset.offen = offen ? "nein" : "ja";
      schalter.setAttribute("aria-expanded", String(!offen));
    });

    qa("a", liste).forEach(function (a) {
      a.addEventListener("click", function () {
        liste.dataset.offen = "nein";
        schalter.setAttribute("aria-expanded", "false");
      });
    });

    doc.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && liste.dataset.offen === "ja") {
        liste.dataset.offen = "nein";
        schalter.setAttribute("aria-expanded", "false");
        schalter.focus();
      }
    });
  }

  /* ── Auftritte beim Scrollen ──────────────────────────────────── */
  function auftritte() {
    var ziele = qa(".auf");
    if (!ziele.length) return;
    if (doc.documentElement.dataset.statisch === "ja" || !("IntersectionObserver" in global)) {
      ziele.forEach(function (z) { z.dataset.sichtbar = "ja"; });
      return;
    }
    var beobachter = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (e.isIntersecting) { e.target.dataset.sichtbar = "ja"; beobachter.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.08 });
    ziele.forEach(function (z) { beobachter.observe(z); });
  }

  /* ── Demo-Hinweis ─────────────────────────────────────────────── */
  function demohinweis() {
    var leiste = q("[data-demo]");
    if (!leiste) return;
    if (global.APP && global.APP.MODUS === "DEMO") {
      leiste.hidden = false;
      leiste.textContent =
        "Demo-Betrieb · Miet-, Kauf- und Energiepreise sind Platzhalter · es werden keine Daten verschickt";
    }
  }

  /* ── WhatsApp ─────────────────────────────────────────────────── */
  function whatsapp() {
    var knopf = q(".wa");
    if (!knopf) return;
    var nr = global.APP && global.APP.WHATSAPP_NUMMER;
    if (!nr) { knopf.remove(); return; }   // keine Nummer, kein Knopf

    var ort = knopf.dataset.ort || "Heilbronn";
    var text = (global.APP.WHATSAPP_TEXT || "").replace("%ORT%", ort);
    knopf.href = "https://wa.me/" + nr + "?text=" + encodeURIComponent(text);
    knopf.hidden = false;
  }

  /* ── Käufer-Zähler ────────────────────────────────────────────
     Zeigt sich nur, wenn die Daten frisch UND befüllt sind. Ein
     Zähler mit erfundenen oder alten Zahlen ist irreführend nach
     § 5 UWG. Die Selbstabschaltung ist Absicht, kein Fehler.      */
  function kaeuferzaehler() {
    var kasten = q("[data-kaeufer]");
    if (!kasten || !global.APP) return;

    fetch(global.APP.DATEN.KAEUFER, { cache: "no-cache" })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var alterTage = (Date.now() - new Date(d.stand + "T00:00:00").getTime()) / 86400000;
        var maxAlter = global.APP.KAEUFER_MAX_ALTER_TAGE || 45;

        if (!isFinite(alterTage) || alterTage > maxAlter) {
          console.warn("[Käufer-Zähler] Ausgeblendet: kaeufer.json ist " +
            Math.round(alterTage) + " Tage alt (erlaubt: " + maxAlter + "). Siehe docs/DATENPFLEGE.md.");
          return;
        }

        var gebiet = kasten.dataset.plz
          ? (d.nach_ort || []).filter(function (o) { return o.plz === kasten.dataset.plz; })[0]
          : null;
        var anzahl = gebiet ? gebiet.anzahl : d.gesamt;
        if (!anzahl || anzahl <= 0) {
          console.warn("[Käufer-Zähler] Ausgeblendet: Anzahl ist 0. Erst befüllen, dann zeigen.");
          return;
        }

        var wo = gebiet ? gebiet.gebiet : "Heilbronn und Umgebung";
        var stand = new Date(d.stand + "T00:00:00")
          .toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

        kasten.innerHTML =
          '<span class="kaeufer__zahl">' + anzahl + '</span>' +
          '<span class="kaeufer__text">vorgemerkte Kaufinteressenten suchen aktuell in <strong>' +
            wo + '</strong>. Wenn Ihre Immobilie dazu passt, ist der erste Anruf oft schon der richtige.</span>' +
          '<span class="kaeufer__stand">Stand ' + stand + '</span>';
        kasten.hidden = false;
      })
      .catch(function (e) { console.warn("[Käufer-Zähler] Daten nicht ladbar:", e); });
  }

  /* ── Jahreszahl im Impressum/Fuß ──────────────────────────────── */
  function jahr() {
    qa("[data-jahr]").forEach(function (n) { n.textContent = new Date().getFullYear(); });
  }

  /* ── Start ────────────────────────────────────────────────────── */
  function los() {
    navi(); auftritte(); demohinweis(); whatsapp(); kaeuferzaehler(); jahr();
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", los);
  else los();

})(window);
