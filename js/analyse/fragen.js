/* ══════════════════════════════════════════════════════════════════
   fragen.js · Inhalt der sechs Schritte. Nur Text, Optionen, Icons.

   Hier steht KEINE Logik. Wer Formulierungen ändern will und das
   wird im Betrieb ständig passieren, fasst nur diese Datei an.

   Zur Reihenfolge: Der erste Schritt fragt bewusst nur die
   Postleitzahl ab, nicht die Adresse. Das senkt den Absprung
   spürbar und hält den Datenschutz aus dem Weg, solange noch gar
   kein Interesse besteht. Die Adresse kommt erst am Ende, gegen
   den vollständigen Bericht.
   ══════════════════════════════════════════════════════════════════ */

(function (global) {
  "use strict";

  /* Icons: 1px-Linien, keine Flächen, 24er-Raster. Sie sollen wie
     technische Zeichnungen wirken, nicht wie Piktogramme. */
  var I = {
    efh:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M3 11 12 4l9 7"/><path d="M5.5 9.6V20h13V9.6"/><path d="M10 20v-5.5h4V20"/></svg>',
    dhh:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M1 11 7 6l6 5"/><path d="M3 9.9V20h8V9.9"/><path d="M11 11l6-5 6 5"/><path d="M13 9.9V20h8V9.9"/><path d="M11 20V9"/></svg>',
    rmh:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M1 12l3.5-3L8 12"/><path d="M8 12l4-3.5 4 3.5"/><path d="M16 12l3.5-3L23 12"/><path d="M2.2 11.2V20h19.6v-8.8"/><path d="M8 20v-8.6M16 20v-8.6"/></svg>',
    etw:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="4" y="3" width="16" height="18"/><path d="M4 9h16M4 15h16M12 3v18"/><rect x="4.9" y="9.9" width="6.2" height="4.2" fill="currentColor" fill-opacity=".85" stroke="none"/></svg>',
    mfh:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="2" width="18" height="20"/><path d="M6.5 5.5h3v3h-3zM10.5 5.5h3v3h-3zM14.5 5.5h3v3h-3zM6.5 10.5h3v3h-3zM10.5 10.5h3v3h-3zM14.5 10.5h3v3h-3z"/><path d="M10 22v-6h4v6"/></svg>',
    grd:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M2 7h4M2 7v4M22 7h-4M22 7v4M2 17h4M2 17v-4M22 17h-4M22 17v-4"/><path d="M8 12h8M12 8v8" stroke-dasharray="1 2"/></svg>',

    gas:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M12 2.5c3.4 4 5.2 6.6 5.2 9.6a5.2 5.2 0 0 1-10.4 0c0-3 1.8-5.6 5.2-9.6Z"/><path d="M12 21a2.6 2.6 0 0 0 2.6-2.6c0-1.5-.9-2.8-2.6-4.8-1.7 2-2.6 3.3-2.6 4.8A2.6 2.6 0 0 0 12 21Z"/></svg>',
    oel:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M12 2.5c4.2 5.3 6.3 8.2 6.3 11.1A6.3 6.3 0 0 1 5.7 13.6c0-2.9 2.1-5.8 6.3-11.1Z"/><path d="M9 14.4a3 3 0 0 0 3 3"/></svg>',
    fern: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="6" width="18" height="12"/><path d="M7 6v12M11 6v12M15 6v12M19 6v12"/><path d="M3 3h18"/></svg>',
    wp:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.2"/><path d="M12 3.2v3.4M12 17.4v3.4M3.2 12h3.4M17.4 12h3.4M5.8 5.8l2.4 2.4M15.8 15.8l2.4 2.4M18.2 5.8l-2.4 2.4M8.2 15.8l-2.4 2.4"/></svg>',
    pell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="5" y="4" width="4" height="6" rx="2"/><rect x="11" y="8" width="4" height="6" rx="2"/><rect x="15" y="3" width="4" height="6" rx="2"/><rect x="6" y="13" width="4" height="6" rx="2"/><rect x="13" y="16" width="4" height="5" rx="2"/></svg>',
    strom:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M13.5 2.5 5 13.5h5.5L9.5 21.5 19 10h-5.8Z"/></svg>',
    frag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><circle cx="12" cy="12" r="9"/><path d="M9.4 9.2a2.7 2.7 0 0 1 5.2.9c0 1.8-2.6 2.2-2.6 3.9"/><circle cx="12" cy="17.4" r=".7" fill="currentColor"/></svg>',

    vermietet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M3 10.5 12 4l9 6.5"/><path d="M5.5 9.4V20h13V9.4"/><circle cx="12" cy="14" r="2"/><path d="M8.6 19.4a3.6 3.6 0 0 1 6.8 0"/></svg>',
    selbst:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M3 10.5 12 4l9 6.5"/><path d="M5.5 9.4V20h13V9.4"/><path d="M9.2 14.6l2 2 3.6-3.8"/></svg>',
    leer:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M3 10.5 12 4l9 6.5"/><path d="M5.5 9.4V20h13V9.4" stroke-dasharray="2 2.5"/><path d="M9.8 13.5l4.4 4.4M14.2 13.5l-4.4 4.4"/></svg>',

    dach:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M2 13 12 5l10 8"/><path d="M4.5 12.2 12 6.4l7.5 5.8"/></svg>',
    fassade: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="4" y="4" width="16" height="16"/><path d="M4 9h16M4 14h16M9 4v16M15 4v16" stroke-dasharray="1.5 2"/></svg>',
    fenster: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="4" y="3" width="16" height="18"/><path d="M12 3v18M4 12h16"/></svg>',
    heizung: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="4" y="7" width="16" height="11"/><path d="M8 7v11M12 7v11M16 7v11M6 18v2M18 18v2"/></svg>',
    baeder:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M3 12h18v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3Z"/><path d="M6.5 12V6a2 2 0 0 1 4 0"/><path d="M7 19v2M17 19v2"/></svg>',
    elektro: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="4" y="3" width="16" height="18" rx="1"/><circle cx="9.5" cy="10" r="1"/><circle cx="14.5" cy="10" r="1"/><path d="M8 15h8"/></svg>',
    keine:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><circle cx="12" cy="12" r="9"/><path d="M6.5 17.5 17.5 6.5"/></svg>'
  };

  global.FRAGEN = {

    /* Wird über dem Fortschrittsbalken angezeigt. */
    titel: "Potenzial-Analyse",
    dauer: "6 Fragen · rund 90 Sekunden",

    schritte: [

      /* ── 1 ────────────────────────────────────────────────────── */
      {
        id: "ort",
        etikett: "Lage",
        frage: "Wo steht Ihre Immobilie?",
        hilfe: "Die Postleitzahl genügt. Ihre Adresse fragen wir erst ganz am Ende und nur dann, wenn Sie den vollständigen Bericht möchten.",
        typ: "ort",
        felder: ["plz", "stadtteil"]
      },

      /* ── 2 ────────────────────────────────────────────────────── */
      {
        id: "objekttyp",
        etikett: "Objekt",
        frage: "Um was für eine Immobilie geht es?",
        hilfe: null,
        typ: "kacheln",
        feld: "objekttyp",
        spalten: 3,
        optionen: [
          { wert: "efh",         label: "Einfamilienhaus",  icon: I.efh },
          { wert: "dhh",         label: "Doppelhaushälfte", icon: I.dhh },
          { wert: "rmh",         label: "Reihenhaus",       icon: I.rmh },
          { wert: "etw",         label: "Eigentumswohnung", icon: I.etw },
          { wert: "mfh",         label: "Mehrfamilienhaus", icon: I.mfh },
          { wert: "grundstueck", label: "Grundstück",       icon: I.grd }
        ]
      },

      /* ── 3 ────────────────────────────────────────────────────── */
      {
        id: "gebaeude",
        etikett: "Substanz",
        frage: "Baujahr und Wohnfläche?",
        hilfe: "Schätzwerte reichen völlig. Wir rechnen mit Bandbreiten, nicht mit Nachkommastellen.",
        typ: "regler",
        regler: [
          {
            feld: "baujahr", label: "Baujahr",
            min: 1850, max: new Date().getFullYear(), schritt: 1, standard: 1972,
            einheit: "",
            marken: [1900, 1950, 1980, 2000, 2020]
          },
          {
            feld: "wohnflaeche", label: "Wohnfläche",
            min: 30, max: 500, schritt: 5, standard: 140,
            einheit: " m²",
            marken: [50, 100, 200, 300, 400]
          }
        ]
      },

      /* ── 4 ────────────────────────────────────────────────────── */
      {
        id: "energie",
        etikett: "Energie",
        frage: "Wie wird geheizt, und welche Energieklasse steht im Ausweis?",
        hilfe: "Kein Ausweis zur Hand? Kein Problem. Wir schätzen die Klasse aus Baujahr, Heizung und Sanierungsstand und sagen Ihnen im Ergebnis transparent, wie.",
        typ: "energie",
        feld_heizung: "heizung",
        feld_klasse: "energieklasse",
        heizungen: [
          { wert: "erdgas",       label: "Gas",           icon: I.gas },
          { wert: "heizoel",      label: "Öl",            icon: I.oel },
          { wert: "fernwaerme",   label: "Fernwärme",     icon: I.fern },
          { wert: "waermepumpe",  label: "Wärmepumpe",    icon: I.wp },
          { wert: "pellets",      label: "Pellets / Holz", icon: I.pell },
          { wert: "nachtspeicher",label: "Nachtspeicher", icon: I.strom },
          { wert: "unbekannt",    label: "Weiß ich nicht", icon: I.frag }
        ]
      },

      /* ── 5 ────────────────────────────────────────────────────── */
      {
        id: "nutzung",
        etikett: "Nutzung",
        frage: "Wie wird die Immobilie derzeit genutzt?",
        hilfe: null,
        typ: "nutzung",
        feld: "nutzung",
        feld_miete: "kaltmiete",
        optionen: [
          { wert: "vermietet", label: "Vermietet",       zusatz: "Es fließt Miete",        icon: I.vermietet },
          { wert: "selbst",    label: "Selbst genutzt",  zusatz: "Ich wohne darin",        icon: I.selbst },
          { wert: "leer",      label: "Steht leer",      zusatz: "Aktuell niemand darin",  icon: I.leer }
        ],
        miete_label: "Aktuelle Kaltmiete im Monat",
        miete_hilfe: "Nettokalt, ohne Nebenkosten. Diese eine Zahl entscheidet, ob wir Ihnen ein echtes Mietpotenzial ausrechnen können."
      },

      /* ── 6 ────────────────────────────────────────────────────── */
      {
        id: "sanierung",
        etikett: "Zustand",
        frage: "Was wurde in den letzten Jahren erneuert?",
        hilfe: "Mehrfachauswahl. Was hier fehlt, behandeln wir rechnerisch so, als sei es noch im Originalzustand von Baujahr an.",
        typ: "mehrfach",
        feld: "sanierungen",
        feld_jahr: "sanierung_jahr",
        optionen: [
          { wert: "dach",    label: "Dach",              icon: I.dach },
          { wert: "fassade", label: "Fassade / Dämmung", icon: I.fassade },
          { wert: "fenster", label: "Fenster",           icon: I.fenster },
          { wert: "heizung", label: "Heizung",           icon: I.heizung },
          { wert: "baeder",  label: "Bäder",             icon: I.baeder },
          { wert: "elektro", label: "Elektrik",          icon: I.elektro }
        ],
        keine: { wert: "keine", label: "Nichts davon", icon: I.keine },
        jahr_label: "Wann zuletzt?",
        jahr_min: 1980
      }
    ],

    /* ── Texte des Abschlusses ────────────────────────────────── */
    rechnet: {
      etikett: "Analyse läuft",
      schritte: [
        "Energiekennwert wird bestimmt",
        "Vergleichsmiete wird abgeglichen",
        "Bauteile werden gegen Nutzungsdauern geprüft",
        "Wertkorridor wird ermittelt"
      ]
    },

    gate: {
      etikett: "Vollständiger Bericht",
      titel: "Die beiden anderen Hebel und Ihren Wertkorridor bekommen Sie als PDF.",
      text: "Zwölf Seiten, jede Zahl mit Rechenweg und Quelle. Kein Werbeprospekt, sondern ein Dokument, das Sie Ihrem Steuerberater oder Ihrer Bank vorlegen können.",
      knopf: "Bericht anfordern",
      dsgvo:
        "Ich möchte den Bericht per E-Mail erhalten und bin damit einverstanden, dass meine Angaben " +
        "dafür verarbeitet werden. Die Einwilligung kann ich jederzeit widerrufen.",
      nachher:
        "Der Bericht ist unterwegs. Falls in zehn Minuten nichts da ist: bitte im Spam-Ordner nachsehen."
    },

    /* Wird gezeigt, wenn der errechnete Verlust unter der Grenze
       aus config.js liegt. Ehrlichkeit schlägt hier den Schock. */
    kein_verlust: {
      etikett: "Ergebnis",
      titel: "Ihre Immobilie steht gut da.",
      text: "Wir haben keinen nennenswerten laufenden Verlust gefunden. Das ist bei einem Bestandsobjekt selten und beim Verkauf bares Geld wert, weil Sie es belegen können. Den vollständigen Bericht bekommen Sie trotzdem, dann haben Sie es schwarz auf weiß."
    }
  };

})(window);
