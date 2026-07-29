/* ══════════════════════════════════════════════════════════════════
   check.js · KI-Inserats-Check.

   Architektur in einem Satz: Alles, was ohne KI entscheidbar ist,
   passiert im Browser und sofort. Nur der Rest geht an Bedrock.

   Deshalb kein URL-Feld, sondern Upload:
   Ein Scraper auf ImmoScout wäre technisch fragil (das Markup
   ändert sich, Bot-Erkennung greift) und AGB-seitig heikel. Der
   Eigentümer lädt selbst hoch — damit ist die Rechtsfrage weg und
   die Datenqualität besser, weil wir die Originalfotos bekommen
   statt heruntergerechneter Portal-Vorschauen.

   Bilder werden VOR dem Upload im Browser verkleinert. Das spart
   Bedrock-Kosten, Upload-Zeit und Mobilfunkvolumen des Nutzers.
   ══════════════════════════════════════════════════════════════════ */

(function (global) {
  "use strict";

  var doc = document;
  function q(s, c) { return (c || doc).querySelector(s); }
  function qa(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }
  function el(h) { var d = doc.createElement("div"); d.innerHTML = h.trim(); return d.firstElementChild; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
    return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }

  var bilder = [];      // { name, groesse, datenUrl, breite, hoehe }
  var wurzel, ablage, dateiEingabe, textfeld, gegKasten, sendeKnopf, status;

  /* ── Bild im Browser verkleinern ──────────────────────────────── */
  function verkleinern(datei) {
    return new Promise(function (fertig, fehler) {
      var leser = new FileReader();
      leser.onerror = function () { fehler(new Error("Datei nicht lesbar")); };
      leser.onload = function () {
        var bild = new Image();
        bild.onerror = function () { fehler(new Error("Kein gültiges Bild")); };
        bild.onload = function () {
          var max = global.APP.INSERAT.FOTO_MAX_KANTE_PX;
          var f = Math.min(1, max / Math.max(bild.width, bild.height));
          var b = Math.round(bild.width * f);
          var h = Math.round(bild.height * f);

          var leinwand = doc.createElement("canvas");
          leinwand.width = b; leinwand.height = h;
          var stift = leinwand.getContext("2d");
          stift.imageSmoothingQuality = "high";
          stift.drawImage(bild, 0, 0, b, h);

          fertig({
            name: datei.name,
            groesse_original: datei.size,
            datenUrl: leinwand.toDataURL("image/jpeg", global.APP.INSERAT.FOTO_JPEG_QUALITAET),
            breite: b, hoehe: h,
            breite_original: bild.width, hoehe_original: bild.height
          });
        };
        bild.src = leser.result;
      };
      leser.readAsDataURL(datei);
    });
  }

  function bilderAnnehmen(dateien) {
    var max = global.APP.INSERAT.FOTOS_MAX;
    var liste = Array.prototype.slice.call(dateien)
      .filter(function (d) { return /^image\//.test(d.type); })
      .slice(0, Math.max(0, max - bilder.length));

    if (!liste.length) return;

    Promise.all(liste.map(verkleinern)).then(function (neue) {
      bilder = bilder.concat(neue).slice(0, max);
      bilderZeichnen();
      pruefen();
    }).catch(function (e) {
      meldung("Mindestens eine Datei konnte nicht gelesen werden.", "fehler");
      console.warn(e);
    });
  }

  function bilderZeichnen() {
    var kasten = q(".bilder", wurzel);
    kasten.innerHTML = bilder.map(function (b, i) {
      return '<figure class="bild">' +
        '<img src="' + b.datenUrl + '" alt="Foto ' + (i + 1) + ' aus Ihrem Inserat">' +
        '<figcaption class="bild__nr zahl">' + String(i + 1).padStart(2, "0") + '</figcaption>' +
        '<button type="button" class="bild__weg" data-weg="' + i + '" aria-label="Foto ' + (i + 1) + ' entfernen">×</button>' +
      '</figure>';
    }).join("");

    qa("[data-weg]", kasten).forEach(function (b) {
      b.addEventListener("click", function () {
        bilder.splice(Number(b.dataset.weg), 1);
        bilderZeichnen(); pruefen();
      });
    });

    var zaehler = q(".ablage__stand", wurzel);
    if (zaehler) {
      zaehler.textContent = bilder.length + " von " + global.APP.INSERAT.FOTOS_MAX +
        " Fotos · mindestens " + global.APP.INSERAT.FOTOS_MIN;
    }
  }

  /* ── GEG-Prüfung, während getippt wird ────────────────────────── */
  var tippTimer = null;
  function gegZeichnen() {
    var text = textfeld.value;
    if (text.trim().length < 40) { gegKasten.innerHTML = ""; return; }

    var r = global.GEG.pruefe(text);

    var zeilen = r.pflicht.map(function (p) {
      return '<div class="geg__zeile" data-stand="' + (p.erfuellt ? "ok" : "fehlt") + '">' +
        '<span class="geg__zeichen">' + (p.erfuellt ? "✓" : "✕") + '</span>' +
        '<span class="geg__text"><strong>' + esc(p.titel) + '</strong>' +
        '<span>' + esc(p.norm) + " — " + esc(p.erklaerung) + '</span></span>' +
      '</div>';
    }).join("");

    var signale = r.signale.map(function (s) {
      var zeichen = s.stand === "ok" ? "✓" : (s.stand === "mittel" ? "~" : "✕");
      return '<div class="geg__zeile" data-stand="' + (s.stand === "ok" ? "ok" : "fehlt") + '">' +
        '<span class="geg__zeichen">' + zeichen + '</span>' +
        '<span class="geg__text"><strong>' + esc(s.titel) + '</strong><span>' + esc(s.text) + '</span></span>' +
      '</div>';
    }).join("");

    gegKasten.innerHTML =
      '<p class="etikett' + (r.bussgeldrisiko ? ' etikett--signal' : '') + '">' +
        'Pflichtangaben nach GEG § 87 — sofort geprüft, ohne KI</p>' +
      '<div class="geg">' + zeilen + '</div>' +
      (r.bussgeldrisiko
        ? '<div class="bussgeld"><strong>' + r.fehlend.length + ' von 5 Pflichtangaben fehlen.</strong>' +
          '<p class="still" style="margin-top:.5rem">' + esc(r.bussgeld_hinweis) + '</p>' +
          '<p class="still" style="margin-top:.5rem">' + esc(r.hinweis_kein_ausweis) + '</p></div>'
        : '<div class="bussgeld" style="border-color:rgba(94,224,168,.3);background:var(--gepruft-flach)">' +
          '<strong style="color:var(--gepruft)">Alle fünf Pflichtangaben sind vorhanden.</strong>' +
          '<p class="still" style="margin-top:.5rem">Das ist selten — die meisten privaten Inserate ' +
          'haben mindestens eine Lücke.</p></div>') +
      '<p class="etikett" style="margin-top:2rem">Textsignale — ebenfalls ohne KI messbar</p>' +
      '<div class="geg">' + signale + '</div>';
  }

  /* ── Zustand ──────────────────────────────────────────────────── */
  function pruefen() {
    var genugBilder = bilder.length >= global.APP.INSERAT.FOTOS_MIN;
    var genugText = textfeld.value.trim().length >= global.APP.INSERAT.TEXT_MIN_ZEICHEN;
    sendeKnopf.disabled = !(genugBilder && genugText);

    var zw = q(".zaehlwerk", wurzel);
    if (zw) {
      zw.innerHTML =
        '<span>' + textfeld.value.length + " / " + global.APP.INSERAT.TEXT_MAX_ZEICHEN + ' Zeichen</span>' +
        '<span>' + (genugText ? "ausreichend" : "mindestens " + global.APP.INSERAT.TEXT_MIN_ZEICHEN) + '</span>';
    }
  }

  function meldung(text, art) {
    status.dataset.art = art || "";
    status.textContent = text;
  }

  /* ── Absenden ─────────────────────────────────────────────────── */
  function senden() {
    sendeKnopf.disabled = true;
    ladeschirm();

    var nutzlast = {
      quelle: "inserats-check",
      version: 1,
      zeitpunkt: new Date().toISOString(),
      inserat: {
        text: textfeld.value,
        eckdaten: {
          preis_eur:     Number(q('[name="preis"]', wurzel).value) || null,
          wohnflaeche_qm:Number(q('[name="flaeche"]', wurzel).value) || null,
          plz:           String(q('[name="plz"]', wurzel).value || "").trim() || null,
          objekttyp:     q('[name="typ"]', wurzel).value || null
        }
      },
      fotos: bilder.map(function (b, i) {
        return {
          position: i + 1, name: b.name,
          breite: b.breite, hoehe: b.hoehe,
          seitenverhaeltnis: Math.round(b.breite / b.hoehe * 100) / 100,
          datenUrl: b.datenUrl
        };
      }),
      /* Was der Browser schon weiß, muss die KI nicht mehr suchen.
         Wir schicken es mit, damit Bedrock darauf aufsetzt statt
         es noch einmal zu ermitteln. */
      vorbefund: global.GEG.pruefe(textfeld.value)
    };

    if (global.APP.MODUS === "DEMO" || !global.APP.N8N_BASIS) {
      console.info("[DEMO] Nichts verschickt. Diese Nutzlast ginge an n8n:");
      console.log(JSON.stringify(Object.assign({}, nutzlast, {
        fotos: nutzlast.fotos.map(function (f) {
          return Object.assign({}, f, { datenUrl: "<" + Math.round(f.datenUrl.length / 1024) + " kB base64>" });
        })
      }), null, 2));
      setTimeout(function () { ergebnisZeichnen(demoErgebnis(nutzlast)); }, 2200);
      return;
    }

    fetch(global.APP.N8N_BASIS + global.APP.ENDPUNKTE.INSERAT_CHECK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nutzlast)
    })
      .then(function (r) {
        if (!r.ok) throw new Error("n8n antwortete mit " + r.status);
        return r.json();
      })
      .then(ergebnisZeichnen)
      .catch(function (e) {
        console.error("[Inserats-Check]", e);
        wurzel.innerHTML =
          '<div class="wz__schluss rahmen"><p class="etikett">Fehler</p>' +
          '<h2>Die Analyse ist nicht durchgelaufen.</h2>' +
          '<p class="gross">Das liegt nicht an Ihrem Inserat. Bitte in ein paar Minuten noch einmal — ' +
          'oder schicken Sie uns den Link, dann sehen wir persönlich drauf.</p>' +
          '<a class="knopf knopf--signal knopf--gross" href="/micheal-preview/kontakt.html">Persönlich prüfen lassen <span class="pfeil">→</span></a></div>';
      });
  }

  function ladeschirm() {
    wurzel.innerHTML =
      '<div class="rechnet">' +
        '<p class="etikett etikett--signal">Analyse läuft</p>' +
        '<ol class="rechnet__liste">' +
          ["Fotos werden bewertet: Schärfe, Licht, Bildausschnitt",
           "Reihenfolge der Fotos wird geprüft",
           "Text wird auf Wirkung und Vollständigkeit gelesen",
           "Preis wird gegen den Markt gestellt"]
          .map(function (t, i) {
            return '<li data-i="' + i + '"><span class="rechnet__punkt"></span>' +
                   '<span class="rechnet__text">' + t + '</span>' +
                   '<span class="rechnet__ok zahl">OK</span></li>';
          }).join("") +
        '</ol>' +
      '</div>';

    var lis = qa(".rechnet__liste li", wurzel);
    var takt = 480;
    lis.forEach(function (li, i) {
      setTimeout(function () { li.dataset.stand = "laeuft"; }, i * takt);
      setTimeout(function () { li.dataset.stand = "fertig"; }, i * takt + takt * 0.75);
    });
  }

  /* ── Ergebnis ─────────────────────────────────────────────────── */
  function ergebnisZeichnen(d) {
    var umfang = 2 * Math.PI * 70;
    var anteil = Math.max(0, Math.min(100, d.score)) / 100;

    wurzel.innerHTML =
      '<div class="ic">' +
        '<section class="score rahmen rahmen--signal" style="padding:clamp(1.5rem,5vw,2.5rem)">' +
          '<div class="score__ring">' +
            '<svg viewBox="0 0 160 160" aria-hidden="true">' +
              '<circle class="score__spur" cx="80" cy="80" r="70"></circle>' +
              '<circle class="score__wert-ring" cx="80" cy="80" r="70" ' +
                'stroke-dasharray="' + umfang.toFixed(1) + '" ' +
                'stroke-dashoffset="' + umfang.toFixed(1) + '"></circle>' +
            '</svg>' +
            '<div class="score__zahl">' + Math.round(d.score) + '<small>VON 100</small></div>' +
          '</div>' +
          '<div class="score__text">' +
            '<p class="etikett etikett--signal">Vermarktungs-Score</p>' +
            '<h2 style="font-size:var(--t-h2)">' + esc(d.urteil) + '</h2>' +
            '<p class="gross">' + esc(d.zusammenfassung) + '</p>' +
          '</div>' +
        '</section>' +

        (d.pflicht_fehlend && d.pflicht_fehlend.length
          ? '<section class="bussgeld">' +
              '<strong>' + d.pflicht_fehlend.length + ' Pflichtangabe' +
              (d.pflicht_fehlend.length > 1 ? 'n fehlen' : ' fehlt') + ': ' +
              esc(d.pflicht_fehlend.join(", ")) + '</strong>' +
              '<p class="still" style="margin-top:.5rem">Bußgeldrahmen nach GEG § 108: bis 10.000 €. ' +
              'Das ist der Punkt, den Sie heute noch selbst beheben können — dafür brauchen Sie uns nicht.</p>' +
            '</section>'
          : '') +

        '<section>' +
          '<p class="etikett">Die drei größten Hebel</p>' +
          '<div class="fehlerliste">' +
            d.fehler.slice(0, 3).map(function (f, i) {
              return '<article class="fehler">' +
                '<span class="fehler__nr zahl">' + String(i + 1).padStart(2, "0") + '</span>' +
                '<div><h4>' + esc(f.titel) + '</h4><p>' + esc(f.text) + '</p></div>' +
              '</article>';
            }).join("") +
          '</div>' +
        '</section>' +

        '<section class="gate rahmen">' +
          '<p class="etikett">Der Rest</p>' +
          '<h3 class="gate__titel">Wir haben ' + (d.fehler.length) + ' Punkte gefunden. Drei davon sehen Sie oben.</h3>' +
          '<p class="gross">Die übrigen gehen wir in einem Gespräch durch — mit den konkreten Formulierungen ' +
          'und der Foto-Reihenfolge, die wir stattdessen nehmen würden. Zwanzig Minuten, kostenlos, ' +
          'ohne dass Sie uns beauftragen müssen.</p>' +
          '<a class="knopf knopf--signal knopf--gross" href="/micheal-preview/kontakt.html?anlass=inserat">' +
            'Termin abstimmen <span class="pfeil">→</span></a>' +
        '</section>' +

        '<p class="erg__fussnote">Die Bewertung entsteht aus Ihren hochgeladenen Fotos und Ihrem Text. ' +
        'Sie ist eine Einschätzung, keine Rechtsberatung und kein Wertgutachten. Ihre Daten werden für ' +
        'die Analyse verarbeitet und danach nicht dauerhaft gespeichert.</p>' +
      '</div>';

    // Ring füllen
    setTimeout(function () {
      var ring = q(".score__wert-ring", wurzel);
      if (ring) ring.style.strokeDashoffset = String(umfang * (1 - anteil));
    }, 120);
  }

  /* ── Demo-Ergebnis aus den lokalen Signalen ───────────────────
     Kein erfundener Zufallswert: Der Demo-Score entsteht aus den
     Prüfungen, die ohnehin clientseitig laufen. Dadurch reagiert
     die Vorführung echt auf den eingegebenen Text.               */
  function demoErgebnis(n) {
    var v = n.vorbefund;
    var punkte = 100;
    punkte -= v.fehlend.length * 9;
    v.signale.forEach(function (s) {
      if (s.stand === "schwach") punkte -= 8;
      else if (s.stand === "mittel") punkte -= 4;
    });
    if (n.fotos.length < 5) punkte -= (5 - n.fotos.length) * 5;
    punkte = Math.max(12, Math.min(96, punkte));

    var fehler = [];
    v.fehlend.forEach(function (p) {
      fehler.push({
        titel: "Pflichtangabe fehlt: " + p.titel,
        text: p.erklaerung + " (" + p.norm + ")"
      });
    });
    v.signale.filter(function (s) { return s.stand !== "ok"; }).forEach(function (s) {
      fehler.push({ titel: s.titel, text: s.text });
    });
    if (n.fotos.length < 5) {
      fehler.push({
        titel: "Zu wenige Fotos",
        text: "Sie haben " + n.fotos.length + " Fotos hochgeladen. Inserate mit acht bis zwölf Bildern " +
              "bekommen deutlich mehr qualifizierte Anfragen — vor allem, wenn Grundriss und Außenansicht dabei sind."
      });
    }
    fehler.push({
      titel: "Reihenfolge der Fotos",
      text: "Das erste Bild entscheidet, ob überhaupt geklickt wird. In der Vorschau steht bei Ihnen " +
            "Foto 1 — im Termin schauen wir, welches Ihrer Bilder dort hingehört."
    });

    return {
      score: punkte,
      urteil: punkte >= 75 ? "Solide, aber Sie verschenken Reichweite."
            : punkte >= 50 ? "Ausbaufähig — hier liegt echtes Geld."
            : "Das Inserat arbeitet gegen Sie.",
      zusammenfassung:
        "DEMO-BETRIEB: Dieser Wert stammt aus den Prüfungen, die im Browser laufen — die Fotos " +
        "wurden noch nicht durch die KI gesehen. Im Echtbetrieb bewertet Bedrock zusätzlich Bildqualität, " +
        "Reihenfolge, Textwirkung und Preisplausibilität.",
      pflicht_fehlend: v.fehlend.map(function (p) { return p.titel; }),
      fehler: fehler
    };
  }

  /* ── Aufbau ───────────────────────────────────────────────────── */
  function start(behaelter) {
    wurzel = behaelter;

    wurzel.innerHTML =
      '<div class="ic">' +
        '<section>' +
          '<p class="etikett">Schritt 1</p>' +
          '<h2>Fotos aus Ihrem Inserat</h2>' +
          '<p class="leise" style="max-width:34rem">' +
            'Laden Sie die Bilder hoch, die tatsächlich im Inserat stehen — in genau der Reihenfolge. ' +
            'Wir prüfen bewusst keine Portal-Links: Das wäre technisch wacklig und gegenüber den ' +
            'Portalen heikel. Ihre Originale sind ohnehin aussagekräftiger.</p>' +
          '<label class="ablage" data-ablage>' +
            '<span class="ablage__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">' +
              '<rect x="3" y="5" width="18" height="14"/><circle cx="8.5" cy="10" r="1.6"/>' +
              '<path d="m3 16 5-4 4 3 3.5-2.5L21 16"/></svg></span>' +
            '<strong>Fotos hierher ziehen oder auswählen</strong>' +
            '<span class="ablage__stand">0 von 5 Fotos · mindestens 3</span>' +
            '<input type="file" accept="image/*" multiple>' +
          '</label>' +
          '<div class="bilder"></div>' +
        '</section>' +

        '<section>' +
          '<p class="etikett">Schritt 2</p>' +
          '<h2>Der Inseratstext</h2>' +
          '<p class="leise" style="max-width:34rem">Kompletten Text hineinkopieren — Überschrift, ' +
            'Beschreibung, Ausstattung. Die Pflichtangaben-Prüfung läuft mit, während Sie einfügen.</p>' +
          '<label class="feld">' +
            '<span class="sr">Inseratstext</span>' +
            '<textarea class="feld__eingabe" rows="12" maxlength="8000" ' +
              'placeholder="Gepflegtes Einfamilienhaus in ruhiger Lage …"></textarea>' +
          '</label>' +
          '<div class="zaehlwerk"></div>' +
        '</section>' +

        '<section data-geg></section>' +

        '<section>' +
          '<p class="etikett">Schritt 3 <span class="still">— freiwillig, macht die Preisprüfung genauer</span></p>' +
          '<div class="gform__reihe">' +
            '<label class="feld"><span class="feld__label">Geforderter Preis</span>' +
              '<input class="feld__eingabe zahl" name="preis" type="number" min="0" step="1000" placeholder="459000"></label>' +
            '<label class="feld"><span class="feld__label">Wohnfläche m²</span>' +
              '<input class="feld__eingabe zahl" name="flaeche" type="number" min="0" step="1" placeholder="142"></label>' +
          '</div>' +
          '<div class="gform__reihe">' +
            '<label class="feld"><span class="feld__label">Postleitzahl</span>' +
              '<input class="feld__eingabe zahl" name="plz" type="text" inputmode="numeric" maxlength="5" placeholder="74072"></label>' +
            '<label class="feld"><span class="feld__label">Objektart</span>' +
              '<select class="feld__eingabe" name="typ">' +
                '<option value="">bitte wählen</option>' +
                '<option value="efh">Einfamilienhaus</option>' +
                '<option value="dhh">Doppelhaushälfte</option>' +
                '<option value="rmh">Reihenhaus</option>' +
                '<option value="etw">Eigentumswohnung</option>' +
                '<option value="mfh">Mehrfamilienhaus</option>' +
              '</select></label>' +
          '</div>' +
        '</section>' +

        '<section>' +
          '<button class="knopf knopf--signal knopf--gross knopf--voll" data-senden disabled>' +
            'Inserat analysieren <span class="pfeil">→</span></button>' +
          '<p class="gform__status" role="status" aria-live="polite" style="margin-top:1rem"></p>' +
          '<p class="erg__fussnote" style="margin-top:1rem">Ihre Fotos werden im Browser verkleinert und ' +
          'ausschließlich für diese Analyse verarbeitet. Die Verarbeitung läuft in der EU (Frankfurt).</p>' +
        '</section>' +
      '</div>';

    ablage = q("[data-ablage]", wurzel);
    dateiEingabe = q('input[type="file"]', wurzel);
    textfeld = q("textarea", wurzel);
    gegKasten = q("[data-geg]", wurzel);
    sendeKnopf = q("[data-senden]", wurzel);
    status = q(".gform__status", wurzel);

    dateiEingabe.addEventListener("change", function () {
      bilderAnnehmen(dateiEingabe.files);
      dateiEingabe.value = "";
    });

    ["dragenter", "dragover"].forEach(function (ev) {
      ablage.addEventListener(ev, function (e) { e.preventDefault(); ablage.dataset.drueber = "ja"; });
    });
    ["dragleave", "drop"].forEach(function (ev) {
      ablage.addEventListener(ev, function (e) { e.preventDefault(); ablage.dataset.drueber = "nein"; });
    });
    ablage.addEventListener("drop", function (e) {
      if (e.dataTransfer && e.dataTransfer.files) bilderAnnehmen(e.dataTransfer.files);
    });

    textfeld.addEventListener("input", function () {
      pruefen();
      clearTimeout(tippTimer);
      tippTimer = setTimeout(gegZeichnen, 420);
    });

    sendeKnopf.addEventListener("click", senden);
    pruefen();
  }

  global.InseratsCheck = { start: start };

})(window);
