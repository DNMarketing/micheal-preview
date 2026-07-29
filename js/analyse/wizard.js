/* ══════════════════════════════════════════════════════════════════
   wizard.js · Die sechs Schritte.

   Was hier bewusst gebaut ist und beim Abnehmen geprüft gehört:

   · Ein Bildschirm, eine Frage. Keine Formularwüste.
   · Bei eindeutigen Auswahlen springt der Wizard von selbst weiter.
     Das spart pro Durchlauf sechs Klicks und ist der Hauptgrund,
     warum solche Strecken durchlaufen werden statt abzubrechen.
   · Tastatur vollwertig: Ziffern wählen, Enter weiter, Rücktaste
     zurück. Wer das einmal merkt, klickt nie wieder.
   · Der Browser-Zurück-Knopf geht einen Schritt zurück, nicht von
     der Seite runter. Ohne das verliert man Leute an genau dieser
     Stelle.
   · Zwischenstand liegt in der sessionStorage. Ein versehentliches
     Neuladen kostet den Durchlauf nicht.
   ══════════════════════════════════════════════════════════════════ */

(function (global) {
  "use strict";

  var SPEICHER = "pa:zwischenstand";
  var F, wurzel, buehne, balken, meta;
  var idx = 0;
  var S = {};                 // Antworten
  var richtung = "vor";
  var statisch = false;

  /* ── Hilfsmittel ──────────────────────────────────────────────── */
  function el(html) {
    var d = document.createElement("div");
    d.innerHTML = html.trim();
    return d.firstElementChild;
  }
  /* Für Markup mit MEHREREN Wurzelelementen. el() gibt nur das
     erste zurück — wer das übersieht, verliert stillschweigend
     halbe Bildschirme samt ihrer Klick-Handler. */
  function frag(html) {
    var t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content;
  }
  function q(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qa(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
    return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }

  /* ── Zwischenstand ────────────────────────────────────────────── */
  function sichern() {
    try {
      sessionStorage.setItem(SPEICHER, JSON.stringify({ ts: Date.now(), idx: idx, S: S }));
    } catch (e) { /* privater Modus — dann eben ohne */ }
  }
  function wiederherstellen() {
    try {
      var roh = sessionStorage.getItem(SPEICHER);
      if (!roh) return false;
      var d = JSON.parse(roh);
      var maxAlter = (global.APP.ANALYSE.SESSION_MINUTEN || 90) * 60000;
      if (Date.now() - d.ts > maxAlter) { sessionStorage.removeItem(SPEICHER); return false; }
      S = d.S || {};
      idx = Math.min(d.idx || 0, F.schritte.length - 1);
      return true;
    } catch (e) { return false; }
  }
  function verwerfen() {
    try { sessionStorage.removeItem(SPEICHER); } catch (e) {}
    S = {}; idx = 0;
  }

  /* ── Fortschritt ──────────────────────────────────────────────── */
  function kopfAktualisieren() {
    var n = F.schritte.length;
    var s = F.schritte[idx];
    meta.innerHTML =
      '<span class="wz__zaehler zahl">' + String(idx + 1).padStart(2, "0") +
      '<span class="wz__von"> / ' + String(n).padStart(2, "0") + '</span></span>' +
      '<span class="wz__etikett">' + esc(s.etikett) + '</span>';
    balken.style.setProperty("--fortschritt", ((idx) / n * 100).toFixed(2) + "%");
    balken.setAttribute("aria-valuenow", String(idx + 1));
  }

  /* ── Rendern ──────────────────────────────────────────────────── */
  var bauer = {};

  function zeichnen() {
    var s = F.schritte[idx];
    kopfAktualisieren();

    var schirm = el(
      '<div class="wz__schritt" data-richtung="' + richtung + '">' +
        '<h2 class="wz__frage">' + esc(s.frage) + '</h2>' +
        (s.hilfe ? '<p class="wz__hilfe">' + esc(s.hilfe) + '</p>' : '') +
        '<div class="wz__eingabe"></div>' +
      '</div>'
    );

    buehne.innerHTML = "";
    buehne.appendChild(schirm);
    bauer[s.typ](q(".wz__eingabe", schirm), s);

    fussAktualisieren();

    // Erstes bedienbares Element bekommt den Fokus — aber nur, wenn
    // per Tastatur navigiert wurde. Sonst springt auf dem Handy
    // ungefragt die Tastatur auf.
    if (document.body.dataset.tastatur === "ja") {
      var erstes = q("[data-fokus], input, button", schirm);
      if (erstes) erstes.focus();
    }
    sichern();
  }

  function fussAktualisieren() {
    var zurueckBtn = q("[data-zurueck]", wurzel);
    var weiterBtn = q("[data-weiter]", wurzel);
    zurueckBtn.hidden = idx === 0;
    var ok = gueltig();
    weiterBtn.disabled = !ok;
    weiterBtn.innerHTML = (idx === F.schritte.length - 1)
      ? 'Analyse starten <span class="pfeil">→</span>'
      : 'Weiter <span class="pfeil">→</span>';
  }

  /* ── Schritt 1 · Ort ──────────────────────────────────────────── */
  bauer.ort = function (ziel, s) {
    ziel.appendChild(el(
      '<div class="ortfeld">' +
        '<label class="feld">' +
          '<span class="feld__label">Postleitzahl</span>' +
          '<input class="feld__eingabe zahl" data-fokus type="text" inputmode="numeric" ' +
                 'autocomplete="postal-code" maxlength="5" pattern="[0-9]{5}" ' +
                 'placeholder="74072" value="' + esc(S.plz || "") + '">' +
        '</label>' +
        '<div class="ortfeld__antwort" aria-live="polite"></div>' +
      '</div>'
    ));

    var eingabe = q(".feld__eingabe", ziel);
    var antwort = q(".ortfeld__antwort", ziel);

    function pruefen() {
      var plz = eingabe.value.replace(/\D/g, "").slice(0, 5);
      eingabe.value = plz;
      antwort.innerHTML = "";
      if (plz.length < 5) { S.plz = plz; S.stadtteil = ""; fussAktualisieren(); return; }

      var ort = global.Engine.ortFuerPlz(plz);
      if (!ort) {
        S.plz = plz; S.stadtteil = "";
        var info = global.Engine.daten().markt.ausserhalb;
        antwort.appendChild(el(
          '<div class="hinweis hinweis--warn">' +
            '<strong>' + esc(info.ueberschrift) + '</strong>' +
            '<p>' + esc(info.text) + '</p>' +
            '<a class="knopf" href="/micheal-preview/kontakt.html">Persönliche Einschätzung anfragen <span class="pfeil">→</span></a>' +
          '</div>'
        ));
        fussAktualisieren();
        return;
      }

      S.plz = plz;
      var chips = ort.stadtteile.map(function (t, i) {
        var aktiv = S.stadtteil === t;
        return '<button type="button" class="chip" data-teil="' + esc(t) + '" ' +
               'aria-pressed="' + (aktiv ? "true" : "false") + '">' +
               '<span class="chip__ziffer zahl">' + (i + 1) + '</span>' + esc(t) + '</button>';
      }).join("");

      antwort.appendChild(el(
        '<div class="teilwahl">' +
          '<p class="teilwahl__ort"><span class="marke marke--gepruft"><span class="punkt"></span>' +
            esc(ort.ort) + '</span> Wir haben Vergleichsdaten für diesen Ort.</p>' +
          '<p class="feld__label">Welcher Stadtteil?</p>' +
          '<div class="chips">' + chips + '</div>' +
        '</div>'
      ));

      qa(".chip", antwort).forEach(function (b) {
        b.addEventListener("click", function () {
          S.stadtteil = b.dataset.teil;
          qa(".chip", antwort).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
          fussAktualisieren();
          weiterGleich();
        });
      });
      fussAktualisieren();
    }

    eingabe.addEventListener("input", pruefen);
    if (S.plz) pruefen();
  };

  /* ── Schritt 2 · Objekttyp ────────────────────────────────────── */
  bauer.kacheln = function (ziel, s) {
    var html = s.optionen.map(function (o, i) {
      var aktiv = S[s.feld] === o.wert;
      return '<button type="button" class="wahl" data-wert="' + esc(o.wert) + '" ' +
             'aria-pressed="' + (aktiv ? "true" : "false") + '">' +
               '<span class="wahl__ziffer zahl">' + (i + 1) + '</span>' +
               '<span class="wahl__icon">' + o.icon + '</span>' +
               '<span class="wahl__label">' + esc(o.label) + '</span>' +
             '</button>';
    }).join("");

    ziel.appendChild(el('<div class="wahlraster wahlraster--' + (s.spalten || 3) + '">' + html + '</div>'));

    qa(".wahl", ziel).forEach(function (b) {
      b.addEventListener("click", function () {
        S[s.feld] = b.dataset.wert;
        qa(".wahl", ziel).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        fussAktualisieren();
        weiterGleich();
      });
    });
  };

  /* ── Schritt 3 · Regler ───────────────────────────────────────── */
  bauer.regler = function (ziel, s) {
    s.regler.forEach(function (r) {
      if (S[r.feld] == null) S[r.feld] = r.standard;

      var marken = r.marken.map(function (m) {
        var p = ((m - r.min) / (r.max - r.min) * 100).toFixed(2);
        return '<span class="regler__marke zahl" style="left:' + p + '%">' + m + '</span>';
      }).join("");

      var block = el(
        '<div class="regler">' +
          '<div class="regler__kopf">' +
            '<label class="feld__label" for="r-' + r.feld + '">' + esc(r.label) + '</label>' +
            '<div class="regler__eingabe">' +
              '<input class="regler__zahl zahl" type="number" min="' + r.min + '" max="' + r.max + '" ' +
                     'step="' + r.schritt + '" value="' + S[r.feld] + '" ' +
                     'aria-label="' + esc(r.label) + ' direkt eingeben">' +
              '<span class="regler__einheit zahl">' + esc(r.einheit) + '</span>' +
            '</div>' +
          '</div>' +
          '<input class="regler__schieber" id="r-' + r.feld + '" type="range" ' +
                 'min="' + r.min + '" max="' + r.max + '" step="' + r.schritt + '" value="' + S[r.feld] + '">' +
          '<div class="regler__skala">' + marken + '</div>' +
          '<p class="regler__hint zahl"></p>' +
        '</div>'
      );
      ziel.appendChild(block);

      var schieber = q(".regler__schieber", block);
      var zahl = q(".regler__zahl", block);
      var hint = q(".regler__hint", block);

      function setzen(v, quelleSchieber) {
        v = Math.min(r.max, Math.max(r.min, Number(v) || r.standard));
        S[r.feld] = v;
        if (quelleSchieber) zahl.value = v; else schieber.value = v;
        schieber.style.setProperty("--pos", ((v - r.min) / (r.max - r.min) * 100).toFixed(2) + "%");
        if (r.feld === "baujahr") hint.textContent = epocheText(v);
        if (r.feld === "wohnflaeche") hint.textContent = flaecheText(v);
        sichern();
      }

      schieber.addEventListener("input", function () { setzen(schieber.value, true); });
      zahl.addEventListener("input", function () { setzen(zahl.value, false); });
      zahl.addEventListener("blur", function () { setzen(zahl.value, false); });
      setzen(S[r.feld], true);
    });
  };

  /* Live-Einordnung beim Ziehen. Genau dieses Mitlaufen macht den
     Unterschied zwischen Formular und Messgerät. */
  function epocheText(jahr) {
    var d = global.Engine.daten().kennwerte.schaetzung_energieklasse;
    var e = d.basis_kwh_nach_epoche[d.basis_kwh_nach_epoche.length - 1];
    for (var i = 0; i < d.basis_kwh_nach_epoche.length; i++) {
      if (jahr <= d.basis_kwh_nach_epoche[i].bis_baujahr) { e = d.basis_kwh_nach_epoche[i]; break; }
    }
    var k = global.Engine.klasseAusKennwert(e.kwh);
    return "Bauepoche " + e.label + " · unsaniert typisch Klasse " + k.klasse;
  }
  function flaecheText(qm) {
    return qm + " m² Wohnfläche · rund " + Math.max(1, Math.round(qm / 28)) + " Zimmer";
  }

  /* ── Schritt 4 · Energie ──────────────────────────────────────── */
  bauer.energie = function (ziel, s) {
    var heiz = s.heizungen.map(function (o, i) {
      var aktiv = S[s.feld_heizung] === o.wert;
      return '<button type="button" class="wahl wahl--klein" data-wert="' + esc(o.wert) + '" ' +
             'aria-pressed="' + (aktiv ? "true" : "false") + '">' +
               '<span class="wahl__ziffer zahl">' + (i + 1) + '</span>' +
               '<span class="wahl__icon">' + o.icon + '</span>' +
               '<span class="wahl__label">' + esc(o.label) + '</span>' +
             '</button>';
    }).join("");

    var skala = global.Engine.daten().kennwerte.energieklassen.skala;
    var klassen = skala.map(function (k) {
      var aktiv = S[s.feld_klasse] === k.klasse;
      return '<button type="button" class="ek" data-klasse="' + k.klasse + '" ' +
             'style="--ek:var(--ek-' + k.farbstufe + ')" aria-pressed="' + (aktiv ? "true" : "false") + '">' +
               '<span class="ek__buchstabe">' + k.klasse + '</span>' +
               '<span class="ek__wert zahl">' + (k.grenze_bis ? "≤" + k.grenze_bis : ">250") + '</span>' +
             '</button>';
    }).join("");

    ziel.appendChild(el(
      '<div class="energiewahl">' +
        '<p class="feld__label">Wärmeerzeuger</p>' +
        '<div class="wahlraster wahlraster--4">' + heiz + '</div>' +

        '<p class="feld__label feld__label--abstand">Energieeffizienzklasse ' +
          '<span class="still">— steht auf Seite 1 des Energieausweises</span></p>' +
        '<div class="ekskala">' + klassen + '</div>' +
        '<div class="ekskala__legende">' +
          '<span class="zahl">sparsam</span>' +
          '<span class="zahl">kWh/(m²·a)</span>' +
          '<span class="zahl">unwirtschaftlich</span>' +
        '</div>' +

        '<button type="button" class="unbekannt" data-unbekannt ' +
          'aria-pressed="' + (S[s.feld_klasse] === "unbekannt" ? "true" : "false") + '">' +
          '<span class="unbekannt__zeichen zahl">?</span>' +
          '<span><strong>Weiß ich nicht — bitte schätzen</strong>' +
          '<span class="unbekannt__unter">Wir leiten die Klasse aus Baujahr, Heizung und Sanierungsstand ab und legen den Rechenweg offen.</span></span>' +
        '</button>' +
      '</div>'
    ));

    qa(".wahl", ziel).forEach(function (b) {
      b.addEventListener("click", function () {
        S[s.feld_heizung] = b.dataset.wert;
        qa(".wahl", ziel).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        fussAktualisieren();
      });
    });

    function klasseSetzen(wert, knopf) {
      S[s.feld_klasse] = wert;
      qa(".ek", ziel).forEach(function (x) { x.setAttribute("aria-pressed", String(x === knopf)); });
      q("[data-unbekannt]", ziel).setAttribute("aria-pressed", String(wert === "unbekannt"));
      fussAktualisieren();
      if (S[s.feld_heizung]) weiterGleich();
    }

    qa(".ek", ziel).forEach(function (b) {
      b.addEventListener("click", function () { klasseSetzen(b.dataset.klasse, b); });
    });
    q("[data-unbekannt]", ziel).addEventListener("click", function () { klasseSetzen("unbekannt", null); });
  };

  /* ── Schritt 5 · Nutzung ──────────────────────────────────────── */
  bauer.nutzung = function (ziel, s) {
    var html = s.optionen.map(function (o, i) {
      var aktiv = S[s.feld] === o.wert;
      return '<button type="button" class="wahl wahl--breit" data-wert="' + esc(o.wert) + '" ' +
             'aria-pressed="' + (aktiv ? "true" : "false") + '">' +
               '<span class="wahl__ziffer zahl">' + (i + 1) + '</span>' +
               '<span class="wahl__icon">' + o.icon + '</span>' +
               '<span class="wahl__label">' + esc(o.label) +
                 '<span class="wahl__zusatz">' + esc(o.zusatz) + '</span></span>' +
             '</button>';
    }).join("");

    ziel.appendChild(frag(
      '<div class="wahlraster wahlraster--3">' + html + '</div>' +
      '<div class="mietfeld" hidden>' +
        '<label class="feld">' +
          '<span class="feld__label">' + esc(s.miete_label) + '</span>' +
          '<span class="feld__gruppe">' +
            '<input class="feld__eingabe zahl" type="number" inputmode="decimal" min="0" step="10" ' +
                   'placeholder="780" value="' + (S[s.feld_miete] || "") + '">' +
            '<span class="feld__einheit zahl">€ / Monat</span>' +
          '</span>' +
        '</label>' +
        '<p class="still">' + esc(s.miete_hilfe) + '</p>' +
      '</div>'
    ));

    var mietfeld = q(".mietfeld", ziel);
    var mieteEingabe = q(".feld__eingabe", mietfeld);

    function mietfeldPruefen() {
      var noetig = S[s.feld] === "vermietet";
      mietfeld.hidden = !noetig;
      if (noetig && document.body.dataset.tastatur === "ja") mieteEingabe.focus();
    }

    qa(".wahl", ziel).forEach(function (b) {
      b.addEventListener("click", function () {
        S[s.feld] = b.dataset.wert;
        qa(".wahl", ziel).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        mietfeldPruefen();
        fussAktualisieren();
        if (S[s.feld] !== "vermietet") weiterGleich();
      });
    });

    mieteEingabe.addEventListener("input", function () {
      S[s.feld_miete] = Number(mieteEingabe.value) || 0;
      fussAktualisieren();
      sichern();
    });

    mietfeldPruefen();
  };

  /* ── Schritt 6 · Sanierungen ──────────────────────────────────── */
  bauer.mehrfach = function (ziel, s) {
    if (!Array.isArray(S[s.feld])) S[s.feld] = [];

    var html = s.optionen.map(function (o, i) {
      var aktiv = S[s.feld].indexOf(o.wert) !== -1;
      return '<button type="button" class="wahl wahl--klein" data-wert="' + esc(o.wert) + '" ' +
             'aria-pressed="' + (aktiv ? "true" : "false") + '">' +
               '<span class="wahl__ziffer zahl">' + (i + 1) + '</span>' +
               '<span class="wahl__icon">' + o.icon + '</span>' +
               '<span class="wahl__label">' + esc(o.label) + '</span>' +
               '<span class="wahl__haken" aria-hidden="true">✓</span>' +
             '</button>';
    }).join("");

    var jetzt = new Date().getFullYear();
    if (S[s.feld_jahr] == null) S[s.feld_jahr] = jetzt - 6;

    ziel.appendChild(frag(
      '<div class="wahlraster wahlraster--3">' + html + '</div>' +
      '<button type="button" class="unbekannt unbekannt--knapp" data-keine ' +
        'aria-pressed="' + (S[s.feld].indexOf("keine") !== -1 ? "true" : "false") + '">' +
        '<span class="unbekannt__zeichen">' + s.keine.icon + '</span>' +
        '<span><strong>' + esc(s.keine.label) + '</strong></span>' +
      '</button>' +
      '<div class="jahrfeld" hidden>' +
        '<label class="feld">' +
          '<span class="feld__label">' + esc(s.jahr_label) + '</span>' +
          '<input class="feld__eingabe zahl" type="number" min="' + s.jahr_min + '" max="' + jetzt + '" ' +
                 'step="1" value="' + S[s.feld_jahr] + '">' +
        '</label>' +
      '</div>'
    ));

    var jahrfeld = q(".jahrfeld", ziel);
    var keineBtn = q("[data-keine]", ziel);

    function synchron() {
      var echte = S[s.feld].filter(function (x) { return x !== "keine"; });
      jahrfeld.hidden = echte.length === 0;
      keineBtn.setAttribute("aria-pressed", String(S[s.feld].indexOf("keine") !== -1));
      fussAktualisieren();
      sichern();
    }

    qa(".wahl", ziel).forEach(function (b) {
      b.addEventListener("click", function () {
        var w = b.dataset.wert;
        var i = S[s.feld].indexOf(w);
        if (i === -1) S[s.feld].push(w); else S[s.feld].splice(i, 1);
        S[s.feld] = S[s.feld].filter(function (x) { return x !== "keine"; });
        b.setAttribute("aria-pressed", String(i === -1));
        synchron();
      });
    });

    keineBtn.addEventListener("click", function () {
      var an = S[s.feld].indexOf("keine") === -1;
      S[s.feld] = an ? ["keine"] : [];
      qa(".wahl", ziel).forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
      synchron();
      if (an) weiterGleich();
    });

    q(".jahrfeld .feld__eingabe", ziel).addEventListener("input", function (ev) {
      S[s.feld_jahr] = Number(ev.target.value) || (jetzt - 6);
      sichern();
    });

    synchron();
  };

  /* ── Gültigkeit ───────────────────────────────────────────────── */
  function gueltig() {
    var s = F.schritte[idx];
    switch (s.id) {
      case "ort":       return !!(S.plz && S.plz.length === 5 && global.Engine.ortFuerPlz(S.plz) && S.stadtteil);
      case "objekttyp": return !!S.objekttyp;
      case "gebaeude":  return !!(S.baujahr && S.wohnflaeche);
      case "energie":   return !!(S.heizung && S.energieklasse);
      case "nutzung":   return !!S.nutzung && (S.nutzung !== "vermietet" || Number(S.kaltmiete) > 0);
      case "sanierung": return Array.isArray(S.sanierungen);
      default:          return true;
    }
  }

  /* ── Navigation ───────────────────────────────────────────────── */
  var sprungLaeuft = false;
  function weiterGleich() {
    // Kurzer Moment, damit die Auswahl sichtbar wird, bevor der
    // Bildschirm wechselt. Ohne das wirkt es hektisch.
    if (sprungLaeuft || !gueltig()) return;
    sprungLaeuft = true;
    setTimeout(function () { sprungLaeuft = false; weiter(); }, statisch ? 0 : 220);
  }

  function weiter() {
    if (!gueltig()) return;

    // Grundstücke rechnen wir nicht — das sagen wir sofort und
    // ehrlich, statt eine Zahl zu erfinden.
    if (S.objekttyp === "grundstueck") { abbruchGrundstueck(); return; }

    if (idx < F.schritte.length - 1) {
      idx++; richtung = "vor";
      history.pushState({ schritt: idx }, "", "#s" + (idx + 1));
      zeichnen();
      buehne.scrollIntoView({ block: "nearest", behavior: statisch ? "auto" : "smooth" });
    } else {
      abschliessen();
    }
  }

  function zurueck() {
    if (idx === 0) return;
    idx--; richtung = "zurueck";
    history.pushState({ schritt: idx }, "", "#s" + (idx + 1));
    zeichnen();
  }

  function abbruchGrundstueck() {
    wurzel.innerHTML =
      '<div class="wz__schluss rahmen">' +
        '<p class="etikett">Ehrliche Antwort</p>' +
        '<h2>Für Grundstücke rechnet dieses Werkzeug nicht.</h2>' +
        '<p class="gross">Der Wert eines Grundstücks hängt am Bodenrichtwert, am Bebauungsplan und an der ' +
        'Erschließung — nicht an Energiekennwerten. Eine Zahl, die wir hier erfinden würden, wäre wertlos.</p>' +
        '<p>Schicken Sie uns die Flurstücksnummer, dann bekommen Sie eine belastbare Einschätzung von Hand.</p>' +
        '<a class="knopf knopf--signal knopf--gross" href="/micheal-preview/kontakt.html">Einschätzung anfragen <span class="pfeil">→</span></a>' +
      '</div>';
  }

  /* ── Abschluss: Rechenschirm, dann Ergebnis ───────────────────── */
  function abschliessen() {
    var ergebnis;
    try {
      ergebnis = global.Engine.rechne(S);
    } catch (e) {
      wurzel.innerHTML = '<div class="wz__schluss rahmen"><p class="etikett">Fehler</p>' +
        '<h2>Die Analyse konnte nicht gerechnet werden.</h2><p>' + esc(e.message) + '</p></div>';
      return;
    }

    var schritte = F.rechnet.schritte;
    wurzel.innerHTML =
      '<div class="rechnet">' +
        '<p class="etikett etikett--signal">' + esc(F.rechnet.etikett) + '</p>' +
        '<ol class="rechnet__liste">' +
          schritte.map(function (t, i) {
            return '<li data-i="' + i + '"><span class="rechnet__punkt"></span>' +
                   '<span class="rechnet__text">' + esc(t) + '</span>' +
                   '<span class="rechnet__ok zahl">OK</span></li>';
          }).join("") +
        '</ol>' +
      '</div>';

    var lis = qa(".rechnet__liste li", wurzel);
    var takt = statisch ? 0 : 340;
    lis.forEach(function (li, i) {
      setTimeout(function () { li.dataset.stand = "laeuft"; }, i * takt);
      setTimeout(function () { li.dataset.stand = "fertig"; }, i * takt + takt * 0.8);
    });

    setTimeout(function () {
      try { sessionStorage.removeItem(SPEICHER); } catch (e) {}
      history.pushState({ schritt: "ergebnis" }, "", "#ergebnis");
      global.Ergebnis.zeigen(ergebnis, wurzel, S);
    }, statisch ? 0 : lis.length * takt + 260);
  }

  /* ── Tastatur ─────────────────────────────────────────────────── */
  function tasten(ev) {
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
    var ziel = ev.target;
    var inFeld = ziel && /^(INPUT|TEXTAREA|SELECT)$/.test(ziel.tagName);

    if (ev.key === "Enter" && !inFeld) { ev.preventDefault(); weiter(); return; }
    if (ev.key === "Enter" && inFeld && ziel.type !== "textarea") { ev.preventDefault(); weiter(); return; }
    if (ev.key === "Backspace" && !inFeld) { ev.preventDefault(); zurueck(); return; }
    if (ev.key === "Escape") { zurueck(); return; }

    if (!inFeld && /^[1-9]$/.test(ev.key)) {
      var n = Number(ev.key) - 1;
      var knoepfe = qa(".wahl, .chip", buehne);
      if (knoepfe[n]) { ev.preventDefault(); knoepfe[n].click(); }
    }
  }

  /* ── Start ────────────────────────────────────────────────────── */
  function start(behaelter, vorbelegung) {
    F = global.FRAGEN;
    wurzel = behaelter;
    statisch = document.documentElement.dataset.statisch === "ja";

    wurzel.innerHTML =
      '<div class="wz">' +
        '<div class="wz__kopf">' +
          '<div class="wz__meta"></div>' +
          '<div class="wz__balken" role="progressbar" aria-label="Fortschritt" ' +
               'aria-valuemin="1" aria-valuemax="' + F.schritte.length + '" aria-valuenow="1"><i></i></div>' +
        '</div>' +
        '<div class="wz__buehne"></div>' +
        '<div class="wz__fuss">' +
          '<button type="button" class="knopf knopf--leise" data-zurueck>← Zurück</button>' +
          '<button type="button" class="knopf knopf--signal knopf--gross" data-weiter>Weiter <span class="pfeil">→</span></button>' +
        '</div>' +
        '<p class="wz__tastatur zahl">1–9 wählen · ↵ weiter · ⌫ zurück</p>' +
      '</div>';

    buehne = q(".wz__buehne", wurzel);
    balken = q(".wz__balken", wurzel);
    meta   = q(".wz__meta", wurzel);

    q("[data-weiter]", wurzel).addEventListener("click", weiter);
    q("[data-zurueck]", wurzel).addEventListener("click", zurueck);

    if (!wiederherstellen()) { S = {}; idx = 0; }
    if (vorbelegung) { Object.assign(S, vorbelegung); }

    // Wer von der Startseite mit PLZ kommt, überspringt Schritt 1.
    if (vorbelegung && vorbelegung.plz && vorbelegung.stadtteil && idx === 0) idx = 1;

    document.addEventListener("keydown", tasten);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Tab") document.body.dataset.tastatur = "ja";
    });
    document.addEventListener("pointerdown", function () { document.body.dataset.tastatur = "nein"; });

    global.addEventListener("popstate", function (ev) {
      var z = ev.state && ev.state.schritt;
      if (typeof z === "number" && z !== idx) {
        richtung = z < idx ? "zurueck" : "vor";
        idx = z;
        zeichnen();
      }
    });

    history.replaceState({ schritt: idx }, "", "#s" + (idx + 1));
    zeichnen();
  }

  global.Wizard = { start: start, zurücksetzen: verwerfen, stand: function () { return S; } };

})(window);
