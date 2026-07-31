/* ══════════════════════════════════════════════════════════════════
   geg.js · Pflichtangaben-Prüfung nach GEG § 87.

   Warum das clientseitig läuft und nicht über die KI:

   Das ist der einzige Teil des Inserats-Checks, der KEINE
   Ermessensfrage ist. Entweder die fünf Pflichtangaben stehen
   drin oder nicht. Eine KI würde das langsamer, teurer und mit
   einer Fehlerquote machen, die man bei einer bußgeldbewehrten
   Angabe nicht haben will.

   Ergebnis liegt in dem Moment vor, in dem der Nutzer aufhört zu
   tippen. Kein Warten, kein Serveraufruf. Das ist der Grund,
   warum dieser Bildschirm sich schnell anfühlt.

   Rechtsstand: GEG in der ab 2024 geltenden Fassung.
   § 87  – Pflichtangaben in Immobilienanzeigen
   § 108 – Bußgeldvorschrift, bis 10.000 €

   ACHTUNG bei Pflege: Wenn sich das GEG ändert, ändert sich diese
   Datei. Sie ist der einzige Ort, an dem Rechtsstand im Code steht.
   ══════════════════════════════════════════════════════════════════ */

(function (global) {
  "use strict";

  var PRUEFUNGEN = [
    {
      id: "ausweisart",
      titel: "Art des Energieausweises",
      norm: "GEG § 87 Abs. 1 Nr. 1",
      erklaerung: "Es muss dastehen, ob es ein Bedarfs- oder ein Verbrauchsausweis ist. " +
                  "„Energieausweis vorhanden“ genügt ausdrücklich nicht.",
      pruefe: function (t) {
        return /(energie)?bedarfsausweis|(energie)?verbrauchsausweis|bedarfsorientiert|verbrauchsorientiert/i.test(t);
      }
    },
    {
      id: "kennwert",
      titel: "Endenergiebedarf oder -verbrauch",
      norm: "GEG § 87 Abs. 1 Nr. 2",
      erklaerung: "Der Zahlenwert aus dem Ausweis, mit Einheit kWh/(m²·a). " +
                  "Die Effizienzklasse allein ersetzt ihn nicht.",
      pruefe: function (t) {
        return /\d{1,3}([,.]\d+)?\s*(kwh)\s*\/?\s*\(?\s*(m²|m2|qm)\s*[·*x•]?\s*a?\)?/i.test(t);
      }
    },
    {
      id: "energietraeger",
      titel: "Wesentlicher Energieträger der Heizung",
      norm: "GEG § 87 Abs. 1 Nr. 3",
      erklaerung: "Gas, Öl, Fernwärme, Wärmepumpe, Pellets, so, wie es im Ausweis steht.",
      /* Achtung bei Änderungen: Zusammensetzungen wie "Gasheizung"
         oder "Ölzentralheizung" müssen mitgefunden werden. Eine
         Wortgrenze hinten (\bgas\b) findet genau die nicht, und
         meldet dann fälschlich eine fehlende Pflichtangabe. */
      pruefe: function (t) {
        return /(erdgas|fl[üu]ssiggas|\bgas(heizung|therme|brennwert|etagenheizung)?\b|heiz[öo]l|[öo]l(heizung|zentralheizung|brennwert)?\b|fernw[äa]rme|nahw[äa]rme|w[äa]rmepumpe|\bwp\b|pellet|scheitholz|holzheizung|holzvergaser|nachtspeicher|nachtstrom|solarthermie|blockheizkraftwerk|\bbhkw\b)/i.test(t);
      }
    },
    {
      id: "baujahr",
      titel: "Baujahr des Gebäudes",
      norm: "GEG § 87 Abs. 1 Nr. 4 (Wohngebäude)",
      erklaerung: "Das im Energieausweis genannte Baujahr, als Jahreszahl.",
      /* Eine Jahreszahl allein beweist nichts. In einem Inserat stehen
         Jahreszahlen für Sanierungen, Einzug, Preise und Bezugstermine.
         Früher stand hier als Rückfall ein blosses \b(19|20)\d\d\b, damit
         galt "Heizung 2019 erneuert" als Baujahrangabe, und das Werkzeug
         meldete Vollständigkeit, obwohl eine bußgeldbewehrte Pflichtangabe
         fehlte. Eine falsche Entwarnung ist hier der teuerste Fehler, den
         diese Datei machen kann.

         Deshalb nur mit Bezugswort und engem Abstand, aber in BEIDEN
         Wortstellungen, weil "Baujahr 1968" und "1968 erbaut" gleich
         häufig sind. Die 25 Zeichen fangen Einschübe wie
         "Baujahr laut Energieausweis 1968" ab.

         \bbj muss die Wortgrenze haben: ohne sie steckt "bj" in "Objekt",
         und "Objekt von 2019" würde wieder als Baujahr durchgehen. */
      pruefe: function (t) {
        return /(baujahr|bauj\.|\bbj\.?|erbaut|errichtet)[^\d]{0,25}(1[6-9]\d{2}|20[0-4]\d)/i.test(t) ||
               /(1[6-9]\d{2}|20[0-4]\d)[^\d]{0,25}(erbaut|errichtet|fertiggestellt)/i.test(t);
      }
    },
    {
      id: "effizienzklasse",
      titel: "Energieeffizienzklasse",
      norm: "GEG § 87 Abs. 1 Nr. 5 (Wohngebäude)",
      erklaerung: "A+ bis H. Fehlt in der Praxis am häufigsten und ist am leichtesten nachzutragen.",
      pruefe: function (t) {
        return /(energie)?(effizienz)?klasse\s*:?\s*(A\+|A\b|B\b|C\b|D\b|E\b|F\b|G\b|H\b)/i.test(t);
      }
    }
  ];

  /* ── Weiche Signale ───────────────────────────────────────────
     Keine Rechtsfrage, aber messbar ohne KI. Was hier auffällt,
     muss die KI nicht mehr suchen, das spart Bedrock-Aufrufe und
     macht das Ergebnis reproduzierbar.                            */
  var SIGNALE = [
    {
      id: "laenge",
      titel: "Textlänge",
      pruefe: function (t) {
        var w = t.trim().split(/\s+/).filter(Boolean).length;
        if (w < 80)  return { stand: "schwach", text: "Nur " + w + " Wörter. Unter 80 Wörtern liest ein Interessent nichts heraus, was ihn zum Anruf bringt." };
        if (w > 600) return { stand: "schwach", text: w + " Wörter. Über 600 Wörter wird nicht mehr gelesen, sondern überflogen. Die guten Argumente gehen unter." };
        return { stand: "ok", text: w + " Wörter. Gute Länge." };
      }
    },
    {
      id: "preis",
      titel: "Preisangabe",
      pruefe: function (t) {
        var da = /(\d[\d.\s]{2,})\s*(€|eur|euro)/i.test(t) || /(kaufpreis|preis)\D{0,20}\d/i.test(t);
        return da
          ? { stand: "ok", text: "Ein Preis ist genannt." }
          : { stand: "schwach", text: "Kein Preis im Text. Inserate ohne Preis erzeugen viele Anfragen, aber kaum ernsthafte." };
      }
    },
    {
      id: "flaeche",
      titel: "Flächenangaben",
      pruefe: function (t) {
        var wf = /(wohnfl[äa]che|wfl)\D{0,12}\d/i.test(t) || /\d{2,4}\s*(m²|m2|qm)/i.test(t);
        var zi = /\d\s*(zimmer|zi\.)/i.test(t);
        if (wf && zi) return { stand: "ok", text: "Wohnfläche und Zimmerzahl sind genannt." };
        if (wf)       return { stand: "mittel", text: "Wohnfläche steht drin, die Zimmerzahl fehlt. Danach wird zuerst gefiltert." };
        return { stand: "schwach", text: "Weder Wohnfläche noch Zimmerzahl klar erkennbar. Damit fällt das Inserat aus jedem Suchfilter." };
      }
    },
    {
      id: "ton",
      titel: "Tonfall",
      pruefe: function (t) {
        var rufe = (t.match(/!/g) || []).length;
        var versalien = (t.match(/\b[A-ZÄÖÜ]{4,}\b/g) || []).length;
        var floskeln = (t.match(/liebhaberobjekt|schmuckst[üu]ck|traumhaft|einmalige gelegenheit|zugreifen|muss man gesehen haben|nicht lange auf dem markt/gi) || []).length;
        var punkte = rufe + versalien + floskeln * 2;
        if (punkte >= 6) return { stand: "schwach", text: "Viele Ausrufezeichen, Großschreibung und Werbefloskeln (" + punkte + " Treffer). Das liest sich wie Kleinanzeigen und drückt den erzielbaren Preis." };
        if (punkte >= 3) return { stand: "mittel", text: "Ein paar Floskeln und Ausrufezeichen. Sachlicher formuliert wirkt der Preis begründeter." };
        return { stand: "ok", text: "Sachlicher Ton. Genau richtig." };
      }
    },
    {
      id: "kontakt",
      titel: "Kontaktdaten im Fließtext",
      pruefe: function (t) {
        var tel = /(\+49|0)\s?[1-9][\d\s\/-]{6,}/.test(t);
        var mail = /[\w.+-]+@[\w-]+\.[a-z]{2,}/i.test(t);
        return (tel || mail)
          ? { stand: "schwach", text: "Im Text stehen direkte Kontaktdaten. Das bringt vor allem Anrufe von Maklern und Datensammlern und ist auf den meisten Portalen ohnehin unzulässig." }
          : { stand: "ok", text: "Keine offenen Kontaktdaten im Text." };
      }
    },
    {
      id: "lage",
      titel: "Lagebeschreibung",
      pruefe: function (t) {
        var treffer = (t.match(/(schule|kindergarten|kita|einkauf|supermarkt|anbindung|bahnhof|autobahn|bus|[äa]rzte|innenstadt|ruhige lage|sackgasse|s[üu]dausrichtung|garten)/gi) || []).length;
        if (treffer >= 4) return { stand: "ok", text: "Die Lage ist mit " + treffer + " konkreten Bezügen beschrieben." };
        if (treffer >= 2) return { stand: "mittel", text: "Die Lage wird gestreift. Konkrete Wege wie Schule, Einkauf und Anbindung verkaufen mehr als Adjektive." };
        return { stand: "schwach", text: "Zur Lage steht praktisch nichts. Bei Immobilien ist das die Hälfte des Kaufarguments." };
      }
    }
  ];

  function pruefe(text) {
    var t = String(text || "");

    var pflicht = PRUEFUNGEN.map(function (p) {
      var erfuellt = false;
      try { erfuellt = !!p.pruefe(t); } catch (e) { erfuellt = false; }
      return {
        id: p.id, titel: p.titel, norm: p.norm,
        erklaerung: p.erklaerung, erfuellt: erfuellt
      };
    });

    var signale = SIGNALE.map(function (s) {
      var r;
      try { r = s.pruefe(t); } catch (e) { r = { stand: "mittel", text: "Nicht prüfbar." }; }
      return { id: s.id, titel: s.titel, stand: r.stand, text: r.text };
    });

    var fehlend = pflicht.filter(function (p) { return !p.erfuellt; });

    return {
      pflicht: pflicht,
      fehlend: fehlend,
      vollstaendig: fehlend.length === 0,
      signale: signale,
      bussgeldrisiko: fehlend.length > 0,
      bussgeld_hinweis:
        "Fehlende Pflichtangaben in einer Immobilienanzeige sind eine Ordnungswidrigkeit nach " +
        "GEG § 108. Der Rahmen reicht bis 10.000 €. Die Pflicht trifft denjenigen, der inseriert, " +
        "auch private Verkäufer, sobald sie ein kommerzielles Portal oder eine Zeitung nutzen und " +
        "ein Energieausweis vorliegt.",
      hinweis_kein_ausweis:
        "Liegt für das Gebäude noch gar kein Energieausweis vor, greifen die Pflichtangaben nicht. " +
        "dann fehlt allerdings der Ausweis selbst, und der muss spätestens bei der Besichtigung " +
        "unaufgefordert vorgelegt werden."
    };
  }

  global.GEG = { pruefe: pruefe, pruefungen: PRUEFUNGEN };

})(window);
