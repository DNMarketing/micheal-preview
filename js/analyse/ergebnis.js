/* ══════════════════════════════════════════════════════════════════
   ergebnis.js · Der Bildschirm, wegen dem das Ganze gebaut wird.

   Zum Zähler, weil das die häufigste Rückfrage sein wird:

   Die große Zahl zählt einmal hoch und bleibt dann stehen — sie ist
   der Jahresverlust. Darunter läuft ein zweiter, kleiner Zähler
   dauerhaft weiter: der Verlust, der seit dem Öffnen dieser Seite
   entstanden ist, mit vier Nachkommastellen. Bei rund 4.000 € im
   Jahr wechselt die vierte Stelle etwa jede Sekunde — sichtbar,
   ohne dass irgendetwas beschleunigt oder erfunden wird.

   Das ist der Unterschied zu den üblichen Rechnern: Da rast eine
   Zahl hoch, die nichts bedeutet. Hier tickt sie in echt.

   Zum Gate: Die verdeckten Zahlen werden NICHT unscharf gerendert,
   sondern durch Platzhalterziffern ersetzt. Ein Blur ist im
   Entwicklerwerkzeug in fünf Sekunden weg. Sichtbar bleibt die
   Stellenzahl — die Größenordnung ist der Köder, nicht der Wert.
   ══════════════════════════════════════════════════════════════════ */

(function (global) {
  "use strict";

  var statisch = false;
  var tickerStopp = null;
  var E = null;      // aktuelles Ergebnis
  var EIN = null;    // Eingaben des Nutzers
  var wurzel = null;

  function q(s, c) { return (c || document).querySelector(s); }
  function qa(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function el(h) { var d = document.createElement("div"); d.innerHTML = h.trim(); return d.firstElementChild; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
    return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }

  var fmt = null;   // wird beim Zeigen aus Engine geholt

  /* ── Maskierte Zahl: gleiche Stellenzahl, andere Ziffern ──────── */
  function maske(betrag) {
    var s = fmt.euro(betrag);
    return s.replace(/\d/g, "█");
  }

  /* ── Hochzählen ───────────────────────────────────────────────── */
  function hochzaehlen(knoten, ziel, dauer, fertig) {
    if (statisch || dauer <= 0) {
      knoten.textContent = fmt.euro(ziel);
      if (fertig) fertig();
      return;
    }
    var start = performance.now();
    function schritt(jetzt) {
      var t = Math.min(1, (jetzt - start) / dauer);
      // easeOutExpo: schnell los, langes Auslaufen — die Zahl
      // "rastet ein", statt abrupt zu stoppen.
      var e = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      knoten.textContent = fmt.euro(ziel * e);
      if (t < 1) requestAnimationFrame(schritt);
      else if (fertig) fertig();
    }
    requestAnimationFrame(schritt);
  }

  /* ── Live-Ticker ──────────────────────────────────────────────── */
  function tickerStarten(knoten, proSekunde) {
    var stellen = global.APP.ANALYSE.TICKER_NACHKOMMA || 4;
    var f = new Intl.NumberFormat("de-DE", {
      style: "currency", currency: "EUR",
      minimumFractionDigits: stellen, maximumFractionDigits: stellen
    });
    var beginn = performance.now();
    var laeuft = true;
    var id = null;

    function tick() {
      if (!laeuft) return;
      var sek = (performance.now() - beginn) / 1000;
      knoten.textContent = f.format(sek * proSekunde);
      id = requestAnimationFrame(tick);
    }

    // Im Hintergrundtab wird nicht gerechnet. Kleinigkeit, aber sie
    // verhindert, dass ein offener Tab den Akku leersaugt.
    function sichtbarkeit() {
      if (document.hidden) { laeuft = false; if (id) cancelAnimationFrame(id); }
      else if (!laeuft) { laeuft = true; tick(); }
    }
    document.addEventListener("visibilitychange", sichtbarkeit);

    if (statisch) {
      knoten.textContent = f.format(0);
    } else {
      tick();
    }

    return function () {
      laeuft = false;
      if (id) cancelAnimationFrame(id);
      document.removeEventListener("visibilitychange", sichtbarkeit);
    };
  }

  /* ── Lead-Einordnung für die n8n-Strecke ──────────────────────── */
  function leadTyp(e) {
    if (e.unter_untergrenze) return "solide";
    if (e.eingabe.nutzung === "leer") return "leerstand";
    if (e.eingabe.nutzung === "vermietet") return "vermieter";
    if (e.groesster_hebel === "instandhaltung") return "instandhaltung";
    if (["E", "F", "G", "H"].indexOf(e.energieklasse.klasse) !== -1) return "energiedruck";
    return "allgemein";
  }

  function temperatur(e) {
    var punkte = 0;
    if (e.jahr_gesamt_eur > 3000) punkte += 2;
    else if (e.jahr_gesamt_eur > 1200) punkte += 1;
    if (e.wertabschlag.verhandlungsmasse_eur > 60000) punkte += 2;
    else if (e.wertabschlag.verhandlungsmasse_eur > 25000) punkte += 1;
    if (e.eingabe.nutzung === "leer") punkte += 1;
    return punkte >= 4 ? "heiss" : (punkte >= 2 ? "warm" : "kalt");
  }

  /* ── Kopfzeile: die Eingaben in einer Mono-Zeile ─────────────── */
  function objektzeile(e) {
    var teile = [
      // e.ort ist null, sobald die PLZ nicht im Marktgebiet liegt.
      (e.eingabe.plz + " " + (e.eingabe.stadtteil || (e.ort && e.ort.ort) || "")).trim(),
      (e.objekttyp && e.objekttyp.label) || "",
      fmt.zahl(e.eingabe.wohnflaeche) + " m²",
      "Bj. " + e.eingabe.baujahr,
      "Klasse " + e.energieklasse.klasse + (e.energieklasse.geschaetzt ? " (geschätzt)" : "")
    ];
    return teile.filter(Boolean).join("  ·  ");
  }

  /* ── Ein Hebel-Balken ─────────────────────────────────────────── */
  function hebelZeile(h, offen, nr) {
    /* Ein rein informativer Hebel (bei Eigennutzung das
       Mietpotenzial) wird NIE verdeckt. Ihn hinter das Gate zu
       legen wäre unehrlich: Er zählt gar nicht in die Summe, und
       eine große verdeckte Zahl daneben liest sich wie ein
       weiterer Verlust. Deshalb offen, gedämpft und ausdrücklich
       als "nicht in der Summe" beschriftet. */
    if (!h.in_summe) offen = true;

    var breite = Math.round(h.anteil_am_groessten * 100);
    var wert = h.in_summe ? h.betrag_jahr_gerundet : (h.informativ_jahr || 0);
    var einheit = h.in_summe ? " / Jahr" : " / Jahr, bei Vermietung";

    return '' +
      '<article class="hb" data-offen="' + (offen ? "ja" : "nein") + '"' +
        (h.in_summe ? '' : ' data-informativ="ja"') + ' data-id="' + h.id + '">' +
        '<div class="hb__kopf">' +
          '<span class="hb__nr zahl">' + String(nr).padStart(2, "0") + '</span>' +
          '<h3 class="hb__label">' + esc(h.label) +
            (h.in_summe ? '' : '<span class="hb__vermerk">nicht in der Summe</span>') + '</h3>' +
          (offen
            ? '<span class="hb__wert zahl">' + fmt.euro(wert) + '<span class="hb__pa">' + einheit + '</span></span>'
            : '<span class="hb__wert hb__wert--zu zahl" aria-label="Wert im vollständigen Bericht">' +
              maske(wert) + '<span class="hb__pa">' + einheit + '</span></span>') +
        '</div>' +
        '<div class="hb__balken"><i style="--breite:' + breite + '%"></i></div>' +
        (offen
          ? '<p class="hb__text">' + esc(h.erklaerung) + '</p>' +
            '<p class="quelle">' + esc(h.quelle) + '</p>'
          : '<p class="hb__text hb__text--zu" aria-hidden="true">' +
              esc(h.erklaerung).replace(/[0-9]/g, "█").slice(0, 190) + '…</p>' +
            '<p class="hb__schloss">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" width="14" height="14">' +
              '<rect x="5" y="10.5" width="14" height="10" rx="1"/><path d="M8.5 10.5V7.8a3.5 3.5 0 0 1 7 0v2.7"/></svg>' +
              'Im vollständigen Bericht</p>') +
      '</article>';
  }

  /* ── Hauptausgabe ─────────────────────────────────────────────── */
  function zeigen(ergebnis, behaelter, eingaben) {
    E = ergebnis; EIN = eingaben; wurzel = behaelter;
    fmt = global.Engine.fmt;
    statisch = document.documentElement.dataset.statisch === "ja";
    if (tickerStopp) { tickerStopp(); tickerStopp = null; }

    if (!E.ok) { zeigeAbbruch(); return; }
    if (E.unter_untergrenze) { zeigeSolide(); return; }

    var F = global.FRAGEN;
    var offenId = E.groesster_hebel;
    var hebelHtml = E.hebel.map(function (h, i) {
      return hebelZeile(h, h.id === offenId, i + 1);
    }).join("");

    var wa = E.wertabschlag;

    wurzel.innerHTML =
      '<div class="erg">' +

        /* ── Objektzeile ─────────────────────────────────────── */
        '<p class="erg__objekt zahl">' + esc(objektzeile(E)) + '</p>' +

        /* ── Zähler ──────────────────────────────────────────── */
        '<section class="zaehler rahmen rahmen--signal" aria-labelledby="z-titel">' +
          '<p class="etikett etikett--signal">Laufender Verlust</p>' +
          '<h2 class="zaehler__satz" id="z-titel">Ihre Immobilie verliert</h2>' +

          '<div class="zaehler__buehne">' +
            '<div class="zaehler__zahl zahl" aria-live="polite">0 €</div>' +
            '<div class="zaehler__strahl" aria-hidden="true"></div>' +
          '</div>' +
          '<p class="zaehler__einheit">pro Jahr · gerundet</p>' +

          '<div class="messleiste messleiste--signal" aria-hidden="true"></div>' +

          '<div class="ticker">' +
            '<span class="ticker__label">seit Sie diese Seite geöffnet haben</span>' +
            '<span class="ticker__wert zahl" aria-hidden="true">0,0000 €</span>' +
          '</div>' +

          '<dl class="umrechnung">' +
            '<div><dt>pro Tag</dt><dd class="zahl">' + fmt.euroCt(E.pro_tag_eur) + '</dd></div>' +
            '<div><dt>pro Monat</dt><dd class="zahl">' + fmt.euro(E.pro_monat_eur) + '</dd></div>' +
            '<div><dt>in fünf Jahren</dt><dd class="zahl">' + fmt.euro(E.jahr_gesamt_eur * 5) + '</dd></div>' +
          '</dl>' +
        '</section>' +

        /* ── Die drei Hebel ──────────────────────────────────── */
        '<section class="hebelblock">' +
          '<p class="etikett">Woraus sich das zusammensetzt</p>' +
          '<div class="hebelliste">' + hebelHtml + '</div>' +
        '</section>' +

        /* ── Wertkorridor ────────────────────────────────────── */
        '<section class="wert rahmen">' +
          '<p class="etikett">Beim Verkauf</p>' +
          '<h3 class="wert__titel">So viel Verhandlungsmasse geben Sie einem Käufer heute in die Hand</h3>' +
          '<div class="wert__zahl zahl" data-zu="ja">' + maske(wa.verhandlungsmasse_eur) + '</div>' +
          '<ul class="wert__teile">' +
            /* Der energetische Abschlag ist ein Prozentsatz auf den
               Objektwert und braucht einen Kaufpreis je m². Außerhalb des
               Marktgebiets gibt es den nicht — dann steht hier ehrlich
               „offen“ statt einer Zahl, und die Verhandlungsmasse oben
               enthält nur den Instandhaltungsstau. */
            '<li><span>Energetischer Abschlag (Klasse ' + esc(E.energieklasse.klasse) + ')</span>' +
              (wa.energie_abschlag_eur === null
                ? '<span class="still">ohne Kaufpreise vor Ort nicht bezifferbar</span>'
                : '<span class="zahl" data-teil="energie" data-zu="ja">' + maske(wa.energie_abschlag_eur) + '</span>') +
            '</li>' +
            '<li><span>Aufgelaufener Instandhaltungsstau</span>' +
              '<span class="zahl" data-teil="stau" data-zu="ja">' + maske(wa.instandhaltungsstau_eur) + '</span></li>' +
          '</ul>' +
          '<p class="quelle">' + esc(wa.quelle) + '</p>' +

          /* Die Anschlussfrage. Wer gerade gesehen hat, wie viel
             Verhandlungsmasse er einem Käufer hinlegt, will als
             Nächstes wissen, worüber überhaupt verhandelt wird.
             Genau hier gehört der Weg zur Bewertung hin — nicht
             erst irgendwo im Fußbereich. */
          '<div class="wert__weiter">' +
            '<p>Was Ihre Immobilie tatsächlich wert ist, sagt Ihnen keine Formel. ' +
            'Dafür schaut jemand drauf, der die Straße kennt.</p>' +
            '<a class="knopf" href="/micheal-preview/bewertung.html">Bewertung anfordern <span class="pfeil">→</span></a>' +
          '</div>' +
        '</section>' +

        /* ── Gate ────────────────────────────────────────────── */
        '<section class="gate rahmen rahmen--signal" id="bericht">' +
          '<p class="etikett etikett--signal">' + esc(F.gate.etikett) + '</p>' +
          '<h3 class="gate__titel">' + esc(F.gate.titel) + '</h3>' +
          '<p class="gross">' + esc(F.gate.text) + '</p>' +
          formularHtml(F) +
        '</section>' +

        /* ── Hinweise ────────────────────────────────────────── */
        hinweiseHtml() +
      '</div>';

    /* Zähler starten */
    var zahlKnoten = q(".zaehler__zahl", wurzel);
    var buehne = q(".zaehler__buehne", wurzel);
    hochzaehlen(zahlKnoten, E.jahr_gesamt_eur, global.APP.ANALYSE.COUNTER_DAUER_MS, function () {
      buehne.dataset.eingerastet = "ja";
      tickerStopp = tickerStarten(q(".ticker__wert", wurzel), E.pro_sekunde_eur);
    });

    /* Balken erst füllen, wenn sie zu sehen sind */
    setTimeout(function () {
      qa(".hb__balken", wurzel).forEach(function (b, i) {
        setTimeout(function () { b.dataset.gefuellt = "ja"; }, statisch ? 0 : i * 130);
      });
    }, statisch ? 0 : 700);

    formularBinden();
  }

  /* ── Formular ─────────────────────────────────────────────────── */
  function formularHtml(F) {
    return '' +
      '<form class="gform" novalidate>' +
        '<div class="gform__reihe">' +
          '<label class="feld"><span class="feld__label">Vor- und Nachname</span>' +
            '<input class="feld__eingabe" name="name" type="text" autocomplete="name" required></label>' +
          '<label class="feld"><span class="feld__label">E-Mail</span>' +
            '<input class="feld__eingabe" name="email" type="email" autocomplete="email" required></label>' +
        '</div>' +
        '<div class="gform__reihe">' +
          '<label class="feld feld--breit"><span class="feld__label">Straße und Hausnummer</span>' +
            '<input class="feld__eingabe" name="strasse" type="text" autocomplete="street-address" required>' +
            '<span class="feld__unter">Jetzt erst — vorher haben wir sie nicht gebraucht und deshalb nicht gefragt.</span></label>' +
          '<label class="feld"><span class="feld__label">Telefon <span class="still">(freiwillig)</span></span>' +
            '<input class="feld__eingabe zahl" name="telefon" type="tel" autocomplete="tel"></label>' +
        '</div>' +

        /* Honigtopf: für Menschen unsichtbar, für einfache Bots
           verlockend. Ausgefüllt = Anfrage wird still verworfen. */
        '<div class="honig" aria-hidden="true">' +
          '<label>Webseite<input name="webseite" type="text" tabindex="-1" autocomplete="off"></label>' +
        '</div>' +

        '<label class="haken">' +
          '<input type="checkbox" name="einwilligung" required>' +
          '<span>' + esc(global.FRAGEN.gate.dsgvo) +
          ' <a href="/micheal-preview/rechtliches/datenschutz.html" target="_blank" rel="noopener">Datenschutzerklärung</a></span>' +
        '</label>' +

        '<button class="knopf knopf--signal knopf--gross knopf--voll" type="submit">' +
          esc(global.FRAGEN.gate.knopf) + ' <span class="pfeil">→</span></button>' +
        '<p class="gform__status" role="status" aria-live="polite"></p>' +
      '</form>';
  }

  function hinweiseHtml() {
    var teile = [];

    if (E.hinweise.length) {
      teile.push(
        '<section class="notizen">' +
          '<p class="etikett">Wie wir gerechnet haben</p>' +
          '<ul class="liste">' +
            E.hinweise.map(function (h) { return '<li>' + esc(h.text) + '</li>'; }).join("") +
          '</ul>' +
        '</section>'
      );
    }

    teile.push(
      '<p class="erg__fussnote">' +
        'Alle Werte sind rechnerische Schätzungen auf Basis Ihrer Angaben und öffentlich zugänglicher ' +
        'Kennwerte (Datenstand ' + esc(E.daten.markt_stand) + '). Sie ersetzen weder ein Wertgutachten ' +
        'noch einen Energieausweis. Verbindlich wird es erst nach Besichtigung.' +
      '</p>'
    );

    return teile.join("");
  }

  function formularBinden() {
    var form = q(".gform", wurzel);
    if (!form) return;
    var status = q(".gform__status", form);
    var geoeffnet = Date.now();

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      status.dataset.art = "";
      status.textContent = "";

      var daten = new FormData(form);

      // Zeitfalle: Wer in unter drei Sekunden absendet, hat nicht
      // gelesen und ist mit hoher Wahrscheinlichkeit kein Mensch.
      if (Date.now() - geoeffnet < 3000 || daten.get("webseite")) {
        status.dataset.art = "fehler";
        status.textContent = "Bitte prüfen Sie Ihre Eingaben.";
        return;
      }

      if (!daten.get("name") || !daten.get("email") || !daten.get("strasse")) {
        status.dataset.art = "fehler";
        status.textContent = "Name, E-Mail und Adresse brauchen wir für den Bericht.";
        return;
      }
      if (!form.querySelector('[name="einwilligung"]').checked) {
        status.dataset.art = "fehler";
        status.textContent = "Ohne Ihre Einwilligung dürfen wir Ihnen den Bericht nicht schicken.";
        return;
      }

      var knopf = q('button[type="submit"]', form);
      knopf.disabled = true;
      status.dataset.art = "laeuft";
      status.textContent = "Bericht wird erstellt …";

      senden(daten).then(function () {
        aufdecken();
        form.innerHTML =
          '<div class="gform__danke">' +
            '<p class="marke marke--gepruft"><span class="punkt"></span>Angefordert</p>' +
            '<p class="gross">' + esc(global.FRAGEN.gate.nachher) + '</p>' +
            '<p class="leise">Wenn ohnehin ein Verkauf im Raum steht: Die Wert-Einschätzung ' +
            'läuft getrennt davon und dauert eine weitere Minute.</p>' +
            '<a class="knopf" href="/micheal-preview/bewertung.html">Immobilie bewerten lassen <span class="pfeil">→</span></a>' +
          '</div>';
      }).catch(function (fehler) {
        knopf.disabled = false;
        status.dataset.art = "fehler";
        status.textContent = "Das hat gerade nicht geklappt. Bitte melden Sie sich kurz direkt bei uns — " +
                             "wir schicken den Bericht dann von Hand.";
        if (global.console) console.error("[Potenzial-Analyse] Übermittlung fehlgeschlagen:", fehler);
      });
    });
  }

  /* ── Übermittlung an n8n ──────────────────────────────────────── */
  function senden(daten) {
    var nutzlast = {
      quelle: "potenzial-analyse",
      version: 1,
      zeitpunkt: new Date().toISOString(),
      lead: {
        name:    String(daten.get("name") || "").trim(),
        email:   String(daten.get("email") || "").trim(),
        strasse: String(daten.get("strasse") || "").trim(),
        telefon: String(daten.get("telefon") || "").trim(),
        einwilligung: true,
        einwilligung_text: global.FRAGEN.gate.dsgvo
      },
      einordnung: {
        typ: leadTyp(E),
        temperatur: temperatur(E),
        groesster_hebel: E.groesster_hebel
      },
      objekt: E.eingabe,
      ergebnis: {
        jahr_gesamt_eur: E.jahr_gesamt_eur,
        pro_tag_eur: Math.round(E.pro_tag_eur * 100) / 100,
        energieklasse: E.energieklasse,
        hebel: E.hebel.map(function (h) {
          return {
            id: h.id, label: h.label,
            betrag_jahr_eur: Math.round(h.betrag_jahr),
            in_summe: h.in_summe,
            erklaerung: h.erklaerung,
            detail: h.detail
          };
        }),
        wertabschlag: E.wertabschlag,
        hinweise: E.hinweise
      },
      datenstand: E.daten
    };

    if (global.APP.MODUS === "DEMO" || !global.APP.N8N_BASIS) {
      if (global.console) {
        console.info("[DEMO] Es wurde nichts verschickt. Diese Nutzlast ginge an n8n:");
        console.log(JSON.stringify(nutzlast, null, 2));
      }
      return new Promise(function (r) { setTimeout(r, 900); });
    }

    var url = global.APP.N8N_BASIS + global.APP.ENDPUNKTE.ANALYSE_LEAD;
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nutzlast)
    }).then(function (r) {
      if (!r.ok) throw new Error("n8n antwortete mit " + r.status);
      return r;
    });
  }

  /* ── Nach Absenden: alles aufdecken ───────────────────────────── */
  function aufdecken() {
    var wa = E.wertabschlag;

    qa(".hb[data-offen='nein']", wurzel).forEach(function (karte) {
      var h = null;
      E.hebel.forEach(function (x) { if (x.id === karte.dataset.id) h = x; });
      if (!h) return;
      var wert = h.in_summe ? h.betrag_jahr_gerundet : (h.informativ_jahr || 0);
      q(".hb__wert", karte).innerHTML = fmt.euro(wert) + '<span class="hb__pa"> / Jahr</span>';
      q(".hb__wert", karte).classList.remove("hb__wert--zu");
      var text = q(".hb__text", karte);
      text.classList.remove("hb__text--zu");
      text.removeAttribute("aria-hidden");
      text.textContent = h.erklaerung;
      var schloss = q(".hb__schloss", karte);
      if (schloss) schloss.outerHTML = '<p class="quelle">' + esc(h.quelle) + '</p>';
      karte.dataset.offen = "ja";
    });

    var wz = q(".wert__zahl", wurzel);
    if (wz) { wz.textContent = fmt.euro(wa.verhandlungsmasse_eur); wz.dataset.zu = "nein"; }
    /* Benannt statt über die Position: Außerhalb des Marktgebiets rendert
       die Energiezeile gar kein .zahl-Element, dann rutscht der Index um
       eins und der Instandhaltungswert bekäme den Energiebetrag. */
    var tEnergie = q('.wert__teile [data-teil="energie"]', wurzel);
    if (tEnergie && wa.energie_abschlag_eur !== null) {
      tEnergie.textContent = fmt.euro(wa.energie_abschlag_eur);
      tEnergie.dataset.zu = "nein";
    }
    var tStau = q('.wert__teile [data-teil="stau"]', wurzel);
    if (tStau) { tStau.textContent = fmt.euro(wa.instandhaltungsstau_eur); tStau.dataset.zu = "nein"; }
  }

  /* ── Sonderfälle ──────────────────────────────────────────────── */
  function zeigeSolide() {
    var k = global.FRAGEN.kein_verlust;
    wurzel.innerHTML =
      '<div class="erg">' +
        '<p class="erg__objekt zahl">' + esc(objektzeile(E)) + '</p>' +
        '<section class="zaehler rahmen">' +
          '<p class="etikett">' + esc(k.etikett) + '</p>' +
          '<h2 class="zaehler__satz">' + esc(k.titel) + '</h2>' +
          '<p class="gross lese">' + esc(k.text) + '</p>' +
          '<dl class="umrechnung">' +
            '<div><dt>Rechnerischer Verlust</dt><dd class="zahl">' + fmt.euro(E.jahr_gesamt_eur) + ' / Jahr</dd></div>' +
            '<div><dt>Energieklasse</dt><dd class="zahl">' + esc(E.energieklasse.klasse) + '</dd></div>' +
          '</dl>' +
        '</section>' +
        '<section class="gate rahmen rahmen--signal" id="bericht">' +
          '<p class="etikett etikett--signal">Bericht</p>' +
          '<h3 class="gate__titel">Lassen Sie sich das schriftlich geben.</h3>' +
          '<p class="gross">Ein Bericht, der belegt, dass an Ihrer Immobilie nichts im Argen liegt, ' +
          'ist im Verkaufsgespräch bares Geld wert.</p>' +
          formularHtml(global.FRAGEN) +
        '</section>' +
        hinweiseHtml() +
      '</div>';
    formularBinden();
  }

  function zeigeAbbruch() {
    var info = E.info || {};
    wurzel.innerHTML =
      '<div class="wz__schluss rahmen">' +
        '<p class="etikett">Ehrliche Antwort</p>' +
        '<h2>' + esc(info.ueberschrift || "Hier rechnen wir nicht.") + '</h2>' +
        '<p class="gross">' + esc(info.text || "") + '</p>' +
        '<a class="knopf knopf--signal knopf--gross" href="/micheal-preview/kontakt.html">Persönliche Einschätzung anfragen <span class="pfeil">→</span></a>' +
      '</div>';
  }

  global.Ergebnis = { zeigen: zeigen };

})(window);
