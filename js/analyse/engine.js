/* ══════════════════════════════════════════════════════════════════
   engine.js · Der Rechenkern der Potenzial-Analyse.

   Grundsätze, von denen nicht abgewichen wird:

   1. KEINE ZAHL STEHT IN DIESER DATEI. Jeder Kennwert kommt aus
      data/kennwerte.json oder data/markt.json. Wer rechnen ändern
      will, ändert Daten, nicht Code.

   2. Reine Funktionen, kein DOM. Dadurch ist der Kern in der
      Konsole prüfbar:  Engine.laden().then(()=>console.table(
      Engine.rechne({...}).hebel))

   3. Jeder Ausgabewert trägt seinen Rechenweg mit. Was das Tool
      behauptet, muss Micheal im Termin erklären können — sonst
      ist es wertlos.

   4. Im Zweifel die vorsichtigere Zahl. Ein zu hoher Verlustwert,
      der im Gespräch zusammenfällt, kostet mehr Vertrauen, als
      eine ehrliche Zahl je einbringt.
   ══════════════════════════════════════════════════════════════════ */

(function (global) {
  "use strict";

  var KW = null;    // kennwerte.json
  var MK = null;    // markt.json
  var JETZT = new Date().getFullYear();

  /* ── Formatierung ─────────────────────────────────────────────── */
  var fEuro = new Intl.NumberFormat("de-DE", {
    style: "currency", currency: "EUR",
    minimumFractionDigits: 0, maximumFractionDigits: 0
  });
  var fEuroCt = new Intl.NumberFormat("de-DE", {
    style: "currency", currency: "EUR",
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });
  var fZahl = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });
  var fZahl1 = new Intl.NumberFormat("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  /* Auf glatte Stufen runden. Eine Zahl wie "4.372 €" wirkt
     berechnet, "4.370 €" wirkt geschätzt — und geschätzt ist
     ehrlicher. Unter 1.000 auf 10er, darüber auf 10er. */
  function stufe(n) {
    if (!isFinite(n) || n <= 0) return 0;
    return Math.round(n / 10) * 10;
  }

  /* Für Spannen und große Beträge. Ein Korridor "56.306 € bis
     93.844 €" behauptet eine Genauigkeit, die eine Spanne
     naturgemäß nicht hat — und genau daran hakt ein aufmerksamer
     Eigentümer im Termin ein. */
  function grob(n) {
    if (!isFinite(n) || n <= 0) return 0;
    var stufeGroesse = n >= 100000 ? 5000 : (n >= 10000 ? 1000 : 100);
    return Math.round(n / stufeGroesse) * stufeGroesse;
  }

  /* ── Laden ────────────────────────────────────────────────────── */
  function laden() {
    var pfade = global.APP.DATEN;
    return Promise.all([
      fetch(pfade.KENNWERTE, { cache: "no-cache" }).then(function (r) { return r.json(); }),
      fetch(pfade.MARKT,     { cache: "no-cache" }).then(function (r) { return r.json(); })
    ]).then(function (paare) {
      KW = paare[0];
      MK = paare[1];

      // Sicherung: Im Produktivbetrieb darf mit ungeprüften Daten
      // nicht gerechnet werden. Lieber Ausfall als falsche Zahl.
      if (global.APP.MODUS === "PRODUKTIV" && (!KW.geprueft || !MK.geprueft)) {
        throw new Error(
          "Potenzial-Analyse gestoppt: MODUS ist PRODUKTIV, aber " +
          "kennwerte.json (geprueft=" + KW.geprueft + ") oder " +
          "markt.json (geprueft=" + MK.geprueft + ") ist nicht freigegeben. " +
          "Siehe docs/DATENPFLEGE.md."
        );
      }
      return { kennwerte: KW, markt: MK };
    });
  }

  function bereit() { return !!(KW && MK); }
  function daten() { return { kennwerte: KW, markt: MK }; }

  /* ── Nachschlagen ─────────────────────────────────────────────── */
  function ortFuerPlz(plz) {
    for (var i = 0; i < MK.orte.length; i++) {
      if (MK.orte[i].plz === String(plz)) return MK.orte[i];
    }
    return null;
  }

  function klasseInfo(buchstabe) {
    var s = KW.energieklassen.skala;
    for (var i = 0; i < s.length; i++) if (s[i].klasse === buchstabe) return s[i];
    return null;
  }

  function objekttypInfo(id) {
    for (var i = 0; i < KW.objekttypen.length; i++) {
      if (KW.objekttypen[i].id === id) return KW.objekttypen[i];
    }
    return null;
  }

  function traeger(id) {
    return KW.energietraeger[id] || KW.energietraeger.unbekannt;
  }

  /* Aus einem Kennwert die Klasse ableiten. */
  function klasseAusKennwert(kwh) {
    var s = KW.energieklassen.skala;
    for (var i = 0; i < s.length; i++) {
      if (s[i].grenze_bis === null || kwh <= s[i].grenze_bis) return s[i];
    }
    return s[s.length - 1];
  }

  /* ── Energieklasse schätzen, wenn "weiß ich nicht" ────────────── */
  function schaetzeKlasse(eingabe) {
    var cfg = KW.schaetzung_energieklasse;
    var basis = cfg.basis_kwh_nach_epoche[cfg.basis_kwh_nach_epoche.length - 1];
    for (var i = 0; i < cfg.basis_kwh_nach_epoche.length; i++) {
      if (eingabe.baujahr <= cfg.basis_kwh_nach_epoche[i].bis_baujahr) {
        basis = cfg.basis_kwh_nach_epoche[i];
        break;
      }
    }

    var kwh = basis.kwh;
    var abgezogen = [];
    (eingabe.sanierungen || []).forEach(function (id) {
      var ab = cfg.abschlag_je_sanierung_kwh[id];
      if (ab) { kwh -= ab; abgezogen.push(id); }
    });

    var auf = cfg.aufschlag_je_erzeuger_kwh[eingabe.heizung];
    if (typeof auf === "number") kwh += auf;

    kwh = Math.max(cfg.untergrenze_kwh, kwh);
    var info = klasseAusKennwert(kwh);

    return {
      klasse: info.klasse,
      kennwert: Math.round(kwh),
      farbstufe: info.farbstufe,
      geschaetzt: true,
      rechenweg: "Ausgangswert " + basis.kwh + " kWh/(m²·a) für Baujahr " + basis.label +
                 (abgezogen.length ? ", abzüglich " + abgezogen.join(", ") : "") +
                 (auf ? ", zuzüglich Zuschlag für " + traeger(eingabe.heizung).label : "")
    };
  }

  /* ── Hebel 1 · Energie ────────────────────────────────────────── */
  function hebelEnergie(e, ek) {
    var t = traeger(e.heizung);
    var ziel = klasseInfo(KW.energieklassen.referenzklasse);
    var mehrKwhProQm = Math.max(0, ek.kennwert - ziel.kennwert);
    var mehrKwh = mehrKwhProQm * e.wohnflaeche;

    var brennstoffMehrkosten = mehrKwh * t.arbeitspreis_eur_pro_kwh;

    // CO₂ nach BEHG — nur für Brennstoffe, die darunter fallen.
    var co2KgGesamt = t.behg_pflichtig ? ek.kennwert * e.wohnflaeche * t.co2_kg_pro_kwh : 0;
    var co2KgProQm  = t.behg_pflichtig ? ek.kennwert * t.co2_kg_pro_kwh : 0;
    var co2KostenGesamt = (co2KgGesamt / 1000) * KW.co2.preis_eur_pro_tonne;
    var co2MehrKosten = t.behg_pflichtig
      ? (mehrKwh * t.co2_kg_pro_kwh / 1000) * KW.co2.preis_eur_pro_tonne
      : 0;

    // Stufenmodell CO2KostAufG: Anteil, den der Vermieter trägt.
    var vermieteranteil = 0;
    var stufen = KW.co2.vermieter_stufenmodell.stufen;
    for (var i = 0; i < stufen.length; i++) {
      if (co2KgProQm >= stufen[i].ab_kg_pro_qm) vermieteranteil = stufen[i].vermieteranteil;
    }
    var co2Vermieter = co2KostenGesamt * vermieteranteil;

    var betrag, erklaerung;
    if (e.nutzung === "vermietet") {
      // Die Heizkosten zahlt der Mieter. Für den Eigentümer ist der
      // echte, harte Energieverlust der gesetzliche CO₂-Anteil.
      // Alles andere wäre eine Zahl, die im Gespräch zerfällt.
      betrag = co2Vermieter;
      erklaerung =
        "Bei " + Math.round(co2KgProQm) + " kg CO₂ je m² und Jahr tragen Sie als Vermieter " +
        Math.round(vermieteranteil * 100) + " % der CO₂-Abgabe. Das sind " + fEuro.format(co2Vermieter) +
        " im Jahr — Geld, das Sie nicht umlegen dürfen. Die Heizkosten selbst zahlt Ihr Mieter, " +
        "sie sind aber der Grund, warum Sie die Miete nicht durchsetzen können (siehe Hebel Miete).";
    } else {
      betrag = brennstoffMehrkosten + co2MehrKosten;
      erklaerung =
        "Ihre Immobilie verbraucht rechnerisch " + fZahl.format(Math.round(ek.kennwert)) +
        " kWh je m² und Jahr. Ein vergleichbares Objekt der Klasse " + ziel.klasse + " kommt mit " +
        ziel.kennwert + " aus. Die Differenz von " + fZahl.format(Math.round(mehrKwh)) +
        " kWh kostet Sie bei " + t.label + " " + fEuro.format(brennstoffMehrkosten) +
        (co2MehrKosten > 0 ? " plus " + fEuro.format(co2MehrKosten) + " CO₂-Abgabe" : "") + " im Jahr.";
    }

    return {
      id: "energie",
      label: "Energie",
      betrag_jahr: Math.max(0, betrag),
      in_summe: true,
      erklaerung: erklaerung,
      quelle: "GEG 2024 Anlage 10 · " + (t.quelle || "Energiepreis siehe kennwerte.json") +
              " · CO2KostAufG § 6 · Stand " + KW.stand,
      detail: {
        kennwert_ist: Math.round(ek.kennwert),
        kennwert_ziel: ziel.kennwert,
        mehrverbrauch_kwh: Math.round(mehrKwh),
        arbeitspreis: t.arbeitspreis_eur_pro_kwh,
        brennstoff_mehrkosten_eur: Math.round(brennstoffMehrkosten),
        co2_kg_pro_qm: Math.round(co2KgProQm * 10) / 10,
        co2_kosten_gesamt_eur: Math.round(co2KostenGesamt),
        co2_vermieteranteil: vermieteranteil,
        co2_vermieter_eur: Math.round(co2Vermieter),
        co2_preis_eur_pro_tonne: KW.co2.preis_eur_pro_tonne,
        prognose_2027_eur: Math.round(
          co2KostenGesamt / KW.co2.preis_eur_pro_tonne * KW.co2.preis_prognose_2027_eur_pro_tonne
        )
      }
    };
  }

  /* ── Hebel 2 · Miete ──────────────────────────────────────────── */
  function hebelMiete(e, ort) {
    var m = KW.miete;
    var ortsueblichMonat = ort.miete_eur_qm * e.wohnflaeche;

    if (e.nutzung === "vermietet") {
      var ist = Number(e.kaltmiete) || 0;
      var deltaMonat = Math.max(0, ortsueblichMonat - ist);
      var deltaJahr = deltaMonat * 12;

      // Was rechtlich in einem Zug durchsetzbar ist. Ohne diese
      // Deckelung entstehen Zahlen, die vor Gericht nicht halten.
      var kappe = ist * 12 * (ort.kappungsgrenze || m.kappungsgrenze);
      var realisierbar = Math.min(deltaJahr, kappe);
      var gedeckelt = deltaJahr > kappe;

      return {
        id: "miete",
        label: "Miete",
        betrag_jahr: realisierbar,
        in_summe: true,
        erklaerung:
          "Ortsübliche Vergleichsmiete in " + ort.plz + " " + (e.stadtteil || ort.ort) + ": " +
          fZahl1.format(ort.miete_eur_qm) + " €/m². Für " + e.wohnflaeche + " m² sind das " +
          fEuro.format(ortsueblichMonat) + " im Monat. Sie nehmen " + fEuro.format(ist) + " ein — " +
          "eine Lücke von " + fEuro.format(deltaMonat) + " monatlich." +
          (gedeckelt
            ? " Davon sind wegen der Kappungsgrenze von " +
              Math.round((ort.kappungsgrenze || m.kappungsgrenze) * 100) +
              " % zunächst " + fEuro.format(realisierbar) + " im Jahr durchsetzbar."
            : " Diese Lücke ist in einem Schritt durchsetzbar."),
        quelle: "Mietspiegel " + ort.ort + " (" + (ort.quelle || "TODO") + ") · BGB § 558 · Stand " + MK.stand,
        detail: {
          ortsueblich_eur_qm: ort.miete_eur_qm,
          ortsueblich_monat_eur: Math.round(ortsueblichMonat),
          ist_monat_eur: Math.round(ist),
          luecke_monat_eur: Math.round(deltaMonat),
          luecke_jahr_eur: Math.round(deltaJahr),
          kappungsgrenze: ort.kappungsgrenze || m.kappungsgrenze,
          durchsetzbar_jahr_eur: Math.round(realisierbar),
          gedeckelt: gedeckelt
        }
      };
    }

    if (e.nutzung === "leer") {
      var monate = 12 - (m.leerstand_vermarktungsmonate || 0);
      var entgangen = ortsueblichMonat * monate;
      return {
        id: "miete",
        label: "Miete",
        betrag_jahr: entgangen,
        in_summe: true,
        erklaerung:
          "Die Wohnung steht leer. Bei " + fZahl1.format(ort.miete_eur_qm) + " €/m² wären " +
          fEuro.format(ortsueblichMonat) + " Kaltmiete im Monat erzielbar. Abzüglich " +
          m.leerstand_vermarktungsmonate + " Monaten für Vermarktung und Übergabe entgehen Ihnen " +
          fEuro.format(entgangen) + " im Jahr — zusätzlich zu den Kosten, die trotzdem weiterlaufen.",
        quelle: "Mietspiegel " + ort.ort + " (" + (ort.quelle || "TODO") + ") · Stand " + MK.stand,
        detail: {
          ortsueblich_eur_qm: ort.miete_eur_qm,
          erzielbar_monat_eur: Math.round(ortsueblichMonat),
          angesetzte_monate: monate,
          entgangen_jahr_eur: Math.round(entgangen)
        }
      };
    }

    // Eigennutzung: hier entsteht kein laufender Verlust. Das sagen
    // wir auch so. Der Balken bleibt sichtbar, zählt aber nicht mit.
    return {
      id: "miete",
      label: "Mietpotenzial",
      betrag_jahr: 0,
      informativ_jahr: ortsueblichMonat * 12,
      in_summe: false,
      erklaerung:
        "Sie nutzen die Immobilie selbst — hier entsteht Ihnen kein laufender Verlust, deshalb " +
        "rechnen wir diesen Punkt nicht in die Summe ein. Zur Einordnung: Vermietet wären " +
        fEuro.format(ortsueblichMonat) + " Kaltmiete im Monat erzielbar, also " +
        fEuro.format(ortsueblichMonat * 12) + " im Jahr.",
      quelle: "Mietspiegel " + ort.ort + " (" + (ort.quelle || "TODO") + ") · Stand " + MK.stand,
      detail: {
        ortsueblich_eur_qm: ort.miete_eur_qm,
        erzielbar_monat_eur: Math.round(ortsueblichMonat)
      }
    };
  }

  /* ── Hebel 3 · Instandhaltung ─────────────────────────────────── */
  function hebelInstandhaltung(e) {
    var cfg = KW.instandhaltung;
    var typ = objekttypInfo(e.objekttyp) || {};
    var anteile = typ.hat_gemeinschaft ? cfg.gemeinschaftsanteil_faktor_etw : null;

    // Die Bauteilkosten sind auf ein freistehendes EFH bezogen.
    // Ein Mehrfamilienhaus hat je m² Wohnfläche deutlich weniger
    // Dach und Fassade — ohne diesen Faktor entstehen Staubeträge,
    // die um ein Vielfaches danebenliegen.
    var gebaeude = typeof typ.bauteilkosten_faktor === "number" ? typ.bauteilkosten_faktor : 1;

    // Ein überfälliges, aber funktionierendes Bauteil ist nicht
    // wertlos. Ohne diesen Abschlag rechnet das Tool jedem alten
    // Haus eine Kernsanierung zu.
    var restwert = 1 - (cfg.restwert_anteil_ueberfaellig || 0);

    var stau = 0;
    var verzehrProJahr = 0;
    var ueberfaellig = [];
    var naechste = [];

    cfg.bauteile.forEach(function (b) {
      var saniert = (e.sanierungen || []).indexOf(b.id) !== -1;
      var letztes = saniert ? (Number(e.sanierung_jahr) || (JETZT - 5)) : Number(e.baujahr);
      var alter = Math.max(0, JETZT - letztes);
      var faktor = anteile && typeof anteile[b.id] === "number" ? anteile[b.id] : 1;
      var kosten = b.kosten_eur_pro_qm_wohnflaeche * e.wohnflaeche * faktor * gebaeude;
      var proJahr = kosten / b.nutzungsdauer_jahre;

      if (alter >= b.nutzungsdauer_jahre) {
        stau += kosten * restwert;
        verzehrProJahr += proJahr;
        ueberfaellig.push({
          id: b.id, label: b.label, alter: alter,
          nutzungsdauer: b.nutzungsdauer_jahre,
          kosten_eur: Math.round(kosten * restwert),
          ueberzogen_jahre: alter - b.nutzungsdauer_jahre
        });
      } else {
        var rest = b.nutzungsdauer_jahre - alter;
        if (rest <= 8) {
          naechste.push({ id: b.id, label: b.label, in_jahren: rest, kosten_eur: Math.round(kosten) });
        }
      }
    });

    naechste.sort(function (a, b) { return a.in_jahren - b.in_jahren; });
    ueberfaellig.sort(function (a, b) { return b.kosten_eur - a.kosten_eur; });

    var breite = cfg.stau_korridor_breite || 0;
    var korridor = [grob(stau * (1 - breite)), grob(stau * (1 + breite))];

    var namen = ueberfaellig.map(function (x) { return x.label; });
    var erklaerung;
    if (ueberfaellig.length === 0) {
      erklaerung = "Kein Bauteil ist über seine übliche Nutzungsdauer hinaus. Das ist selten und " +
                   "ein echtes Verkaufsargument." +
                   (naechste.length ? " In den nächsten Jahren steht an: " +
                     naechste.map(function (n) { return n.label + " (in ca. " + n.in_jahren + " Jahren)"; }).join(", ") + "." : "");
    } else {
      erklaerung =
        namen.join(", ") + (namen.length > 1 ? " sind" : " ist") +
        " rechnerisch über die übliche Nutzungsdauer hinaus. Daraus ergibt sich ein " +
        "Instandhaltungsstau von etwa " + fEuro.format(korridor[0]) + " bis " + fEuro.format(korridor[1]) +
        " — nach Abzug des Restwerts der Bauteile, die ja noch funktionieren. Genau diese Summe bringt " +
        "ein Käufer in die Preisverhandlung ein. Und sie wächst: rund " + fEuro.format(stufe(verzehrProJahr)) +
        " im Jahr, weil sich die Substanz weiter verbraucht." +
        (naechste.length ? " Als Nächstes fällig: " +
          naechste.map(function (n) { return n.label + " (ca. " + n.in_jahren + " Jahre)"; }).join(", ") + "." : "");
    }

    return {
      id: "instandhaltung",
      label: "Instandhaltung",
      betrag_jahr: verzehrProJahr,
      in_summe: true,
      erklaerung: erklaerung,
      quelle: "Nutzungsdauern und Wiederherstellungskosten: " + (cfg._quelle || "kennwerte.json") + " · Stand " + KW.stand,
      detail: {
        stau_gesamt_eur: Math.round(stau),
        stau_korridor_eur: korridor,
        verzehr_pro_jahr_eur: Math.round(verzehrProJahr),
        restwert_anteil: cfg.restwert_anteil_ueberfaellig || 0,
        gebaeudefaktor: gebaeude,
        ueberfaellig: ueberfaellig,
        naechste_faellig: naechste,
        gemeinschaftsanteil_beruecksichtigt: !!anteile
      }
    };
  }

  /* ── Wertabschlag ─────────────────────────────────────────────── */
  function wertabschlag(e, ek, ort, stauEur, stauKorridor) {
    var typ = objekttypInfo(e.objekttyp) || { kaufpreis_faktor: 1 };
    var preisQm = ort.kaufpreis_eur_qm * (typ.kaufpreis_faktor || 1);
    var referenzwert = preisQm * e.wohnflaeche;    // Wert bei Klasse C

    var cfg = KW.wertabschlag_energie;
    var prozent = typeof cfg.je_klasse[ek.klasse] === "number" ? cfg.je_klasse[ek.klasse] : 0;
    var energieAbschlag = referenzwert * prozent;   // negativ bei D–H
    var breite = cfg.korridor_breite || 0;

    var betrag = Math.abs(energieAbschlag);
    return {
      referenzwert_eur: Math.round(referenzwert),
      preis_eur_qm: Math.round(preisQm),
      prozent: prozent,
      energie_abschlag_eur: grob(betrag),
      korridor_eur: [grob(betrag * (1 - breite)), grob(betrag * (1 + breite))],
      instandhaltungsstau_eur: grob(stauEur),
      instandhaltungsstau_korridor_eur: stauKorridor || [grob(stauEur), grob(stauEur)],
      verhandlungsmasse_eur: grob(betrag + stauEur),
      verhandlungsmasse_korridor_eur: [
        grob(betrag * (1 - breite) + (stauKorridor ? stauKorridor[0] : stauEur)),
        grob(betrag * (1 + breite) + (stauKorridor ? stauKorridor[1] : stauEur))
      ],
      richtung: prozent < 0 ? "abschlag" : (prozent > 0 ? "aufschlag" : "neutral"),
      quelle: cfg._quelle + " · Kaufpreis " + ort.ort + ": " + (ort.quelle || "TODO") + " · Stand " + MK.stand
    };
  }

  /* ── Hauptberechnung ──────────────────────────────────────────── */
  function rechne(eingabe) {
    if (!bereit()) throw new Error("Engine.laden() muss vor Engine.rechne() aufgerufen werden.");

    var e = Object.assign({
      plz: "", stadtteil: "", objekttyp: "efh", baujahr: 1975, wohnflaeche: 120,
      heizung: "unbekannt", energieklasse: "unbekannt", nutzung: "selbst",
      kaltmiete: 0, sanierungen: [], sanierung_jahr: null
    }, eingabe || {});

    e.wohnflaeche = Math.max(15, Number(e.wohnflaeche) || 0);
    e.baujahr = Math.min(JETZT, Math.max(1800, Number(e.baujahr) || 1975));

    var ort = ortFuerPlz(e.plz);
    if (!ort) {
      return { ok: false, grund: "ausserhalb", info: MK.ausserhalb, plz: e.plz };
    }

    var typ = objekttypInfo(e.objekttyp);
    if (typ && typ._abbruch) {
      return { ok: false, grund: "objekttyp", info: { text: typ._abbruch }, objekttyp: e.objekttyp };
    }

    // Energieklasse: angegeben oder geschätzt
    var ek;
    if (e.energieklasse && e.energieklasse !== "unbekannt") {
      var k = klasseInfo(e.energieklasse);
      ek = { klasse: k.klasse, kennwert: k.kennwert, farbstufe: k.farbstufe, geschaetzt: false,
             rechenweg: "Vom Eigentümer angegeben (Energieausweis)." };
    } else {
      ek = schaetzeKlasse(e);
    }

    var hE = hebelEnergie(e, ek);
    var hM = hebelMiete(e, ort);
    var hI = hebelInstandhaltung(e);
    var hebel = [hE, hM, hI];

    var summe = hebel.reduce(function (s, h) { return s + (h.in_summe ? h.betrag_jahr : 0); }, 0);
    var summeGerundet = stufe(summe);

    // Anteile für die Balken. Bezugsgröße ist ausdrücklich NUR der
    // größte mitzählende Hebel. Ein rein informativer Balken (bei
    // Eigennutzung das Mietpotenzial) darf die Skala nicht setzen —
    // sonst sieht der Nutzer einen 100-%-Balken für einen Posten,
    // der gar nicht in die Summe eingeht, und die echten Hebel
    // wirken daneben harmlos.
    var maxHebel = Math.max.apply(null, hebel
      .filter(function (h) { return h.in_summe; })
      .map(function (h) { return h.betrag_jahr; })
      .concat([1]));

    hebel.forEach(function (h) {
      h.betrag_jahr_gerundet = stufe(h.betrag_jahr);
      h.anteil_am_groessten = h.in_summe ? Math.min(1, h.betrag_jahr / maxHebel) : 0;
      h.anteil_an_summe = summe > 0 && h.in_summe ? h.betrag_jahr / summe : 0;
    });

    var zaehlend = hebel.filter(function (h) { return h.in_summe; });
    zaehlend.sort(function (a, b) { return b.betrag_jahr - a.betrag_jahr; });
    var groesster = zaehlend.length ? zaehlend[0].id : "energie";

    var wa = wertabschlag(e, ek, ort, hI.detail.stau_gesamt_eur, hI.detail.stau_korridor_eur);

    /* Hinweise, die im Ergebnis und im PDF mitlaufen. Sie sind kein
       Kleingedrucktes, sondern Teil des Produkts: Sie zeigen, dass
       hier jemand rechnet und nicht rät. */
    var hinweise = [];
    if (ek.geschaetzt) {
      hinweise.push({
        art: "schaetzung",
        text: "Sie haben keine Energieklasse angegeben. Wir haben Klasse " + ek.klasse +
              " geschätzt: " + ek.rechenweg + " Mit Ihrem Energieausweis rechnen wir exakt nach."
      });
    }
    if (e.nutzung === "vermietet" && (!e.kaltmiete || e.kaltmiete <= 0)) {
      hinweise.push({ art: "luecke", text: "Ohne Ihre aktuelle Kaltmiete können wir den Mietzweig nicht rechnen." });
    }
    if (KW.co2.preis_prognose_2027_eur_pro_tonne && hE.detail.co2_kosten_gesamt_eur > 0) {
      hinweise.push({
        art: "prognose",
        text: "Ab 2027 bildet sich der CO₂-Preis im EU-Emissionshandel am Markt. Bei " +
              KW.co2.preis_prognose_2027_eur_pro_tonne + " €/t läge Ihre CO₂-Last bei rund " +
              fEuro.format(hE.detail.prognose_2027_eur) + " im Jahr. Das ist eine Prognose, keine Zusage."
      });
    }

    var warnungen = [];
    if (!KW.geprueft || !MK.geprueft) {
      warnungen.push("Demo-Datensatz: Miet-, Kauf- und Energiepreise sind noch nicht freigegeben.");
    }

    return {
      ok: true,
      eingabe: e,
      ort: ort,
      objekttyp: typ,
      energieklasse: ek,
      hebel: hebel,
      groesster_hebel: groesster,
      jahr_gesamt_eur: summeGerundet,
      jahr_gesamt_exakt: summe,
      pro_tag_eur: summe / 365,
      pro_monat_eur: summe / 12,
      pro_sekunde_eur: summe / 31557600,        // Julianisches Jahr
      unter_untergrenze: summeGerundet < (global.APP.ANALYSE.VERLUST_UNTERGRENZE_EUR || 0),
      wertabschlag: wa,
      hinweise: hinweise,
      warnungen: warnungen,
      daten: {
        kennwerte_stand: KW.stand,
        markt_stand: MK.stand,
        geprueft: !!(KW.geprueft && MK.geprueft),
        naechste_pruefung: KW.naechste_pruefung
      }
    };
  }

  /* ── Öffentliche Schnittstelle ────────────────────────────────── */
  global.Engine = {
    laden: laden,
    bereit: bereit,
    daten: daten,
    rechne: rechne,
    ortFuerPlz: function (plz) { return ortFuerPlz(plz); },
    klasseAusKennwert: function (k) { return klasseAusKennwert(k); },
    fmt: {
      euro: function (n) { return fEuro.format(n); },
      euroCt: function (n) { return fEuroCt.format(n); },
      zahl: function (n) { return fZahl.format(n); },
      zahl1: function (n) { return fZahl1.format(n); },
      prozent: function (n) { return fZahl.format(Math.round(n * 100)) + " %"; }
    }
  };

})(window);
