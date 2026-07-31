/* ══════════════════════════════════════════════════════════════════
   config.js · Alle Schalter und Endpunkte an EINER Stelle.

   Diese Datei ist die einzige, die vor dem Livegang inhaltlich
   angefasst werden muss. Wer hier fertig ist, ist fertig.

   Reihenfolge beim Einbinden: IMMER als erstes Skript, vor allen
   anderen. Alle anderen Dateien lesen nur aus window.APP.
   ══════════════════════════════════════════════════════════════════ */

window.APP = {

  /* ── 1. Betriebsmodus ──────────────────────────────────────────
     "DEMO"      – Tool rechnet, zeigt aber sichtbar einen Demo-Hinweis
                   und schickt KEINE Leads los. Zum Vorführen.
     "PRODUKTIV" – Voller Betrieb. Startet nur, wenn in
                   data/kennwerte.json UND data/markt.json
                   "geprueft": true steht. Sonst bricht das Tool
                   bewusst ab und meldet es in der Konsole.
     ────────────────────────────────────────────────────────────── */
  MODUS: "DEMO",


  /* ── 2. n8n ────────────────────────────────────────────────────
     Basis ohne Schrägstrich am Ende, z. B.
     "https://n8n.m2-immoservice.de/webhook"

     ACHTUNG: Sobald hier ein fremder Host steht, muss er in
     _headers UND netlify.toml in die CSP:
       connect-src 'self' https://n8n.m2-immoservice.de;
     Sonst blockiert der Browser den Fetch, und zwar lautlos.
     Vertragscontracts der Payloads: docs/N8N.md
     ────────────────────────────────────────────────────────────── */
  N8N_BASIS: "",

  ENDPUNKTE: {
    ANALYSE_LEAD:  "/potenzial-analyse",   // Build 1 · Lead + volle Analyse als PDF
    INSERAT_CHECK: "/inserats-check",      // Build 2 · Fotos + Text → Bedrock
    WHATSAPP_LEAD: "/whatsapp-lead",       // Build 3 · Fallback, falls WhatsApp nicht verfügbar
    KONTAKT:       "/kontakt"              // allgemeines Kontaktformular
  },


  /* ── 3. Kontakt ────────────────────────────────────────────────
     WHATSAPP_NUMMER: international, ohne +, ohne Leerzeichen.
     Beispiel Deutschland: "4917612345678"
     Leer lassen = der WhatsApp-Knopf erscheint gar nicht.
     ────────────────────────────────────────────────────────────── */
  WHATSAPP_NUMMER: "",
  WHATSAPP_TEXT: "Hallo Herr Spitzer, ich habe eine Immobilie in %ORT% und möchte eine Ersteinschätzung. Ich schicke Ihnen gleich 3 Fotos.",

  KONTAKT_EMAIL: "kontakt@m2-immoservice.de",
  TELEFON: "+49 172 1403755",

  FIRMA: {
    name: "M2-Immoservice",
    inhaber: "Michael Spitzer",
    strasse: "Wollhausstr. 83",
    plz_ort: "74074 Heilbronn",
    domain: "https://m2-immoservice.de"
  },


  /* ── 4. Käufer-Zähler ──────────────────────────────────────────
     Das Widget blendet sich SELBST aus, wenn data/kaeufer.json
     älter ist als KAEUFER_MAX_ALTER_TAGE oder wenn "gesamt" 0 ist.

     Das ist kein Bug, das ist die Bremse: Ein Zähler mit erfundenen
     oder veralteten Zahlen ist eine Irreführung nach § 5 UWG.
     Wer die Liste nicht pflegt, hat das Widget nicht.
     ────────────────────────────────────────────────────────────── */
  KAEUFER_MAX_ALTER_TAGE: 45,


  /* ── 5. Potenzial-Analyse ──────────────────────────────────────── */
  ANALYSE: {
    // Wie lange darf ein angefangener Durchlauf im Browser liegen,
    // bevor er verworfen wird (Minuten).
    SESSION_MINUTEN: 90,

    // Der Live-Ticker auf dem Ergebnisschirm. Vier Nachkommastellen,
    // damit die hinteren Stellen sichtbar laufen, bei ca. 4.000 €/Jahr
    // wechselt die vierte Stelle etwa jede Sekunde.
    TICKER_NACHKOMMA: 4,

    // Dauer der Hochzähl-Animation der großen Zahl (ms).
    COUNTER_DAUER_MS: 1900,

    // Untergrenze: Liegt der errechnete Jahresverlust darunter,
    // wird KEIN Schockergebnis gezeigt, sondern ehrlich gesagt,
    // dass die Immobilie gut dasteht. Baut mehr Vertrauen auf als
    // eine erzwungene Zahl.
    VERLUST_UNTERGRENZE_EUR: 350
  },


  /* ── 6. Inserats-Check ─────────────────────────────────────────── */
  INSERAT: {
    FOTOS_MIN: 3,
    FOTOS_MAX: 5,
    // Bilder werden im Browser verkleinert, bevor sie hochgehen.
    // Spart Bedrock-Kosten, Bandbreite und Upload-Zeit.
    FOTO_MAX_KANTE_PX: 1400,
    FOTO_JPEG_QUALITAET: 0.82,
    TEXT_MIN_ZEICHEN: 120,
    TEXT_MAX_ZEICHEN: 8000
  },


  /* ── 7. Datenpfade ─────────────────────────────────────────────── */
  DATEN: {
    KENNWERTE: "/micheal-preview/data/kennwerte.json",
    MARKT:     "/micheal-preview/data/markt.json",
    KAEUFER:   "/micheal-preview/data/kaeufer.json"
  }
};
