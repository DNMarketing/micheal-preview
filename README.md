# M2-Immoservice · Website

Website für **Michael Spitzer, M2-Immoservice, Heilbronn**.

Statische Website, kein Build-Tool, kein Framework. Reines HTML,
CSS und Vanilla JS. Schriften, Bilder, CSS und JS liegen alle auf dem
eigenen Server. Alles Serverseitige läuft über n8n.

**Eine Ausnahme, und nur eine:** `/bewertung.html` bettet den
Bewertungs-Funnel (`bewertung.m2-immoservice.de`) per iframe ein.
Deshalb steht dieser Host in der CSP unter `script-src` und `frame-src`.
Alle anderen Seiten laden weiterhin ausschließlich vom eigenen Host.
Wer die Ausnahme nicht will, nimmt die Seite raus und verlinkt
stattdessen auf die Funnel-Domain, dann greift wieder `default-src 'self'`
in Reinform.

Die Website ist nicht um eine Objektliste herum gebaut, sondern um
drei Werkzeuge. Die Startseite fängt deshalb nicht mit einer
Begrüßung an, sondern mit einer laufenden Messung: Was ein
Beispielobjekt pro Jahr verliert und was es seit dem Öffnen der
Seite verloren hat.

**Farbwelt und Anmutung, Stand 31.07.2026.** Zwei Fassungen sind
verworfen, die dritte steht:

1. Die dunkle „Messinstrument"-Fassung (fast schwarz, Orange, Mono).
   Verworfen, weil sie nach Software und Gaming aussah.
2. Die Fassung im Zuschnitt seines Flyers (helles Papier, Indigo,
   Bronze, Poppins, Markenband). Verworfen, weil sie eine generische
   Maklerseite war und die Logos sich doppelten.
3. **Die jetzige: Weiß, Logo-Blau `#03428F`, schwarze Schrift.** Details
   unter „Gestalterische Leitidee".

Beide alten Fassungen sind erreichbar, falls jemand nachsehen will: die
Flyer-Fassung als `../MichealProjekt-Backup-Flyerstand-2026-07-31.zip`,
die dunkle als Repo `DNMarketing/micheal-preview` (Commit `c64ebe09`).

Das dritte Werkzeug, die Immobilienbewertung auf `/bewertung.html`,
liegt **nicht in diesem Repo**. Es ist eine Instanz des
Eigentümer-Funnel-Templates unter `D&N Marketing/MichaelFunnel` und
läuft als eigenes Deployment. Wie das zusammenhängt, steht in
`docs/BEWERTUNGSFUNNEL.md`.

---

## ⛔️ Vor dem Livegang: neun offene Punkte

Solange davon etwas offen ist, darf die Seite **nicht** live gehen.

### 1 · Domain bestätigen

Im Projekt steht überall `https://m2-immoservice.de`, abgeleitet aus
seiner Mailadresse `kontakt@m2-immoservice.de`. **Ungeprüft ist, ob
die Domain ihm gehört und ob www oder eine andere Schreibweise
gelten soll.** Falls sie sich ändert:

```bash
grep -rn "m2-immoservice.de" . --include="*.html" --include="*.xml" \
  --include="*.txt" --include="*.toml" --include="*.js" --include="*.md"
```

Betroffen: `canonical` und `og:url` in jeder HTML-Datei,
`sitemap.xml`, `robots.txt`, `llms.txt`, `js/config.js`, `netlify.toml`,
`_headers` und die drei n8n-Workflows (`allowedOrigins`).
Danach prüfen: Jede Seite hat genau **ein** `canonical`, und zwar
auf ihre eigene, endgültige URL.

### 2 · Restliche TODO auflösen

Name, Anschrift, Telefon und E-Mail stehen aus seinem Flyer und
seiner Visitenkarte fest eingetragen in `js/config.js`, im Kopf, im
Fuß und auf `kontakt.html`. Offen sind noch die Zahlen auf
`ueber.html`, die Referenzen und die Rechtstexte:

```bash
grep -rn "TODO" --include="*.html" --include="*.js" --include="*.json" .
```

### 3 · `js/config.js` ausfüllen

Das ist die einzige Datei, die inhaltlich angefasst werden muss.
Wer hier fertig ist, ist fertig:

| Feld | Bedeutung |
|---|---|
| `MODUS` | `"DEMO"` → nichts wird verschickt, die Nutzlast landet in der Browser-Konsole. `"PRODUKTIV"` → Echtbetrieb |
| `N8N_BASIS` | Webhook-Basis ohne Schrägstrich am Ende |
| `WHATSAPP_NUMMER` | international, ohne `+`. **Leer = der Knopf erscheint gar nicht.** |
| `KONTAKT_EMAIL`, `TELEFON`, `FIRMA` | Anzeige und Rechtstexte |

### 4 · CSP an n8n anpassen: **der teuerste Fehler**

Sobald `N8N_BASIS` gesetzt ist, muss der Host in **beiden**
Dateien `_headers` und `netlify.toml` in die CSP:

```
connect-src 'self' https://n8n.m2-immoservice.de;
```

Wird das vergessen, blockiert der Browser jeden Aufruf, ohne
Meldung auf der Seite und ohne Eintrag im n8n-Log. Die Website
sieht vollkommen normal aus, das Formular meldet Erfolg, und kein
einziger Lead kommt an. Nach der Änderung eine echte Testanfrage
abschicken und die Browser-Konsole auf CSP-Meldungen prüfen.

### 5 · Marktdaten freigeben

`data/kennwerte.json` und `data/markt.json` enthalten aktuell
**Platzhalter**. Beide tragen `"geprueft": false`.

Ablauf: `docs/DATENPFLEGE.md`. Erst wenn jede Zeile eine echte
Quelle hat, wird `geprueft` auf `true` gesetzt.

Steht `MODUS` auf `PRODUKTIV`, während die Daten nicht freigegeben
sind, **startet die Analyse bewusst gar nicht.** Das ist die
eingebaute Bremse.

⚠️ **Seit dem 31.07.2026 steht das nicht mehr oben auf jeder Seite.**
Der Kunde wollte die Demoleiste weg. Solange `geprueft` auf `false`
steht, weist nur noch eine Zeile unter dem Ergebnis darauf hin
(„Vorläufige Marktwerte …", `js/analyse/engine.js`) und die
Kennzeichnung „Beispielrechnung" im Seitenkopf. Wer die Seite live
stellt, bevor die Daten freigegeben sind, wirbt mit Zahlen, die er
nicht belegen kann. Das ist § 5 UWG.

### 6 · Impressum und Datenschutz einsetzen

`rechtliches/impressum.html` trägt inzwischen Firma, Inhaber, Anschrift
und Kontakt. **Offen sind fünf Angaben:** Umsatzsteuer-Angabe,
zuständige Erlaubnisbehörde nach § 34c GewO, Berufshaftpflicht-
versicherung samt Geltungsbereich und die Haltung zur
Verbraucherschlichtung. `rechtliches/datenschutz.html` enthält noch
Platzhalter. Die Rechtstexte kommen von der Kanzlei und werden
**nicht** selbst formuliert. Die Datenschutzseite enthält bereits eine
vollständige technische Aufstellung dessen, was die Seite tut, das ist
die Vorarbeit für die Kanzlei.

Danach:
1. `<meta name="robots" content="noindex">` in beiden Dateien entfernen
2. beide in `sitemap.xml` aufnehmen (Priorität 0.3)
3. in `robots.txt` die Zeile `Disallow: /rechtliches/` entfernen

Rechtliche Leitplanken insgesamt: `docs/RECHTLICHES.md`.

### 7 · Bewertungs-Funnel ausrollen

`/bewertung.html` ist gebaut, zeigt aber ein leeres Feld, solange die
Funnel-Instanz nicht deployt ist. Drei Dinge müssen zusammenpassen:

1. `MichaelFunnel` deployen auf `bewertung.m2-immoservice.de`
2. dort in `config/makler.config.ts` unter `embed.allowedOrigins`
   diese Domain eintragen (ist bereits vorbereitet)
3. hier in `_headers` **und** `netlify.toml` steht der Host schon in
   `script-src` und `frame-src`, bei abweichender Domain nachziehen

Prüfen lässt sich das mit:

```bash
curl -sI https://bewertung.m2-immoservice.de/embed | grep -i content-security-policy
```

Vollständig: `docs/BEWERTUNGSFUNNEL.md`.

### 8 · Logo als Vektordatei einsetzen

Oben links im Kopf steht ein **Platzhalter**: die dreifarbige Platte
aus seinem Logo, in CSS nachgebaut (`.logo` in `base.css`). Das
kursive Pinsel-`m` der echten Wortmarke gibt keine Websafe-Schrift
her, dort steht ein schräg gestelltes Archivo.

Das Logo steht genau einmal je Seite, im Kopf. Im Fuß und in den
Abschnitten steht der Schriftzug als Text (`.wortmarke`). Zwei
Logoplatten auf einem Bildschirm hat der Kunde ausdrücklich
abgelehnt.

Michael muss die Originaldatei liefern (SVG, EPS, AI oder PDF). Die
einzige Fassung, die es sonst gibt, ist ein Ausschnitt aus seinem
Flyer, zu wenig für Kopf, Favicon und Open-Graph-Bild.

Danach:

1. `assets/logo.svg` ablegen
2. in allen HTML-Dateien `<a class="logo">` gegen
   `<img src="/assets/logo.svg" alt="M2-Immoservice">` tauschen
3. den Block `/* ── Logo · PLATZHALTER ── */` aus `base.css` löschen
4. `favicon.svg` und das OG-Bild aus der Vektorfassung neu erzeugen

Und die Regel, die dabei bleibt: **Das Logo braucht immer Weiß unter
sich.** Auf Farbe oder auf ein Foto gesetzt wird es schmutzig, er
selbst macht das nie. Belege: `docs/STILANALYSE-M2.md`, § 2.

### 9 · Fotos liefern

**Sein Porträt** steht als `assets/bilder/michael-spitzer.jpg` auf der
Startseite (Abschnitt „Der Makler") und auf `ueber.html`, gerahmt von
der Klasse `.portraet`: weiche Ecken, Haarlinie, quadratisch
zugeschnitten.

Die Datei kam als 524 × 524 px großes Profilbild mit lila Kreisrand,
und dieser Rand stand als Keil in den Ecken der Seite. Er ist
herausgerechnet: außerhalb des Kreises setzt jetzt der weichgezeichnete
Bildhintergrund fort, innerhalb ist das Foto unangetastet. Das
unbearbeitete Original liegt als
`assets/bilder/michael-spitzer-original.jpg` daneben, falls die
Rechnung je wiederholt werden muss.

**Ein richtiges Porträtfoto sollte trotzdem kommen**, in höherer
Auflösung und mit ruhigem Hintergrund: 524 px sind für die Größe, in
der es auf der Startseite steht, auf einem Retina-Bildschirm knapp.
Dann nur die Datei tauschen, das Markup bleibt.

**Echte Objektfotos** fehlen noch ganz. Gebraucht werden sie für
`referenzen.html`. Aus seinen „Verkauft“-Reels lassen sich
Einzelbilder ziehen, die Originale sind besser.

---

## Aufbau

```
├── index.html                  Startseite · Werkzeug zuerst
├── potenzial-analyse.html      Build 1 · Wizard und Ergebnis
├── inserats-check.html         Build 2 · Fotos, Text, GEG-Prüfung
├── bewertung.html              Build 5 · eingebetteter Bewertungs-Funnel
├── ueber.html · referenzen.html · kontakt.html
├── anlass/                     vier Anlass-Seiten
├── ratgeber/                   startet klein, wächst mit
├── rechtliches/                Impressum, Datenschutz (noindex)
├── 404.html
│
├── css/
│   ├── tokens.css              Farben, Schriften, Maße, Bewegung
│   ├── base.css                Grundgerüst, Bauteile, Seitenlayouts
│   └── tool.css                Wizard, Zähler, Ergebnis, Inserats-Check
│
├── js/
│   ├── config.js               ⚠️ alle Schalter, als erstes einbinden
│   ├── main.js                 Navigation, Auftritte, WhatsApp, Käufer-Zähler
│   ├── home.js                 Beispiel-Zähler und PLZ-Übergabe
│   ├── kontakt.js              Kontaktformular
│   ├── analyse/
│   │   ├── engine.js           Rechenkern, rein, ohne DOM, testbar
│   │   ├── fragen.js           nur Texte und Optionen der sechs Schritte
│   │   ├── wizard.js           Ablauf, Tastatur, Zwischenstand, Browser-Zurück
│   │   ├── ergebnis.js         Zähler, Balken, Gate, Übergabe an n8n
│   │   └── start.js            Zündschlüssel, als letztes einbinden
│   └── inserat/
│       ├── geg.js              Pflichtangaben nach GEG § 87 (Rechtsstand!)
│       ├── check.js            Upload, Verkleinerung, Ergebnis
│       └── start.js            Zündschlüssel
│
├── data/                       ⚠️ die einzigen Zahlen im Projekt
│   ├── kennwerte.json          Energie, CO₂, Bauteile, Wertabschläge
│   ├── markt.json              Mieten und Kaufpreise je PLZ
│   └── kaeufer.json            vorgemerkte Käufer (schaltet sich selbst ab)
│
├── n8n/                        importfertige Workflows
│   ├── potenzial-analyse.json  Bericht, Mails, Lead-Meldung
│   ├── inserats-check.json     Eingangsprüfung, Bedrock, Normalisierung
│   └── kontakt.json            Anfrage an Michael
│
├── docs/                       intern, wird nicht ausgeliefert
│   ├── STILANALYSE-M2.md       sein Auftritt, gemessen · Leitfaden
│   ├── bauteile.html           Musterseite, jedes Bauteil zum Ansehen
│   ├── DATENPFLEGE.md          das Quartals-Ritual
│   ├── N8N.md                  Nutzlasten und Workflows
│   ├── BEWERTUNGSFUNNEL.md     das zweite Repo und die Einbettung
│   └── RECHTLICHES.md          UWG, DSGVO, GEG
│
├── assets/
│   ├── fonts/                  Archivo, Bricolage, IBM Plex Mono
│   └── bilder/                 ⚠️ zwei SVG-Platzhalter, siehe Punkt 9
├── favicon.svg
├── robots.txt · sitemap.xml · llms.txt
├── _headers · netlify.toml     ⚠️ inhaltlich identisch, beide pflegen
└── PFLICHTENHEFT.md            Umfang, Aufwand, Phasen
```

---

## Die eine Regel

> **Im Code steht keine einzige Rechenzahl.**

Jeder Kennwert kommt aus `data/kennwerte.json` oder
`data/markt.json`, jeweils mit `quelle` und `stand`. Wer das
Rechnen ändern will, ändert Daten, nicht Code.

Der Grund ist nicht Eleganz, sondern Betrieb: Die Datenpflege
macht in einem Jahr jemand, der diesen Code nie gesehen hat.

---

## Lokal testen

```bash
cd "/Users/davidbaumbusch/D&N Marketing/MichaelProjekt"
python3 -m http.server 8472
```

Dann: <http://127.0.0.1:8472>

Warum ein Server und kein Doppelklick: Über `file://` verhalten
sich Schriften, `fetch` und absolute Pfade anders als später live,
und `fetch` auf die JSON-Dateien schlägt fehl, das Werkzeug startet
gar nicht.

| Adresse | Wozu |
|---|---|
| `/` | Startseite mit laufendem Beispiel-Zähler |
| `/potenzial-analyse.html` | der Wizard |
| `/potenzial-analyse.html?plz=74072` | mit vorbelegter PLZ, wie von der Startseite |
| `/inserats-check.html` | GEG-Prüfung läuft schon beim Tippen |
| `/bewertung.html` | eingebetteter Funnel (leer, solange er nicht läuft) |
| `/?statisch` | schaltet **alle** Animationen ab, für Screenshots und Abnahmen |
| `/docs/bauteile.html` | Musterseite der Flyer-Fassung. Seit dem Rückbau vom 31.07. veraltet: Die dort gezeigten Bauteile gibt es im CSS nicht mehr |
| `/gibtsnicht` | 404-Seite (lokal zeigt Python seine eigene) |

### Nach jeder Änderung

1. Alle Seiten einmal durchscrollen, in Desktop- und Handybreite.
2. Browser-Konsole: keine Fehler, keine 404 im Netzwerk-Tab.
3. Den Wizard einmal komplett durchklicken, danach denselben Weg
   **nur mit der Tastatur**: Ziffern wählen, Enter weiter,
   Rücktaste zurück.
4. Browser-Zurück im Wizard: muss einen Schritt zurückgehen, nicht
   die Seite verlassen.
5. Seite mitten im Wizard neu laden: der Zwischenstand muss stehen.
6. Mit Tab durch jede Seite: der Fokus muss überall sichtbar sein.
7. Formular absenden und die Nutzlast in der Konsole prüfen
   (im Demo-Betrieb wird sie dort ausgegeben).

### Rechenkern in der Konsole prüfen

```js
Engine.laden().then(() => console.table(
  Engine.rechne({ plz:"74072", stadtteil:"Innenstadt", objekttyp:"efh",
    baujahr:1968, wohnflaeche:145, heizung:"erdgas",
    energieklasse:"unbekannt", nutzung:"selbst", sanierungen:[] }).hebel
));
```

---

## Gestalterische Leitidee

**Ruhig, hell, hochwertig.**

Die Seite soll aussehen wie die Drucksache eines Maklers, der seit
dreißig Jahren im Geschäft ist. Ausdrücklich **nicht** wie ein Software-
oder Gaming-Auftritt: Das war die Ansage des Kunden am 31.07.2026, und
daran hängt der ganze Rest.

**Drei Farben, mehr nicht:**

| Marke | Wert | Wofür |
|---|---|---|
| Weiß | `#FFFFFF` | trägt alles |
| Logo-Blau | `#03428F` | führt: Zahlen, Knöpfe, Links, Linien, Skalen |
| Schwarz | `#0B0D10` | schreibt |

Dazu die tiefblaue Fläche `#1E2A55` für den Fuß. Beide Blautöne stehen
so in seinem Logo, sie sind nicht nachempfunden. **Das Rot aus dem Logo
darf ausschließlich im Logo selbst auftauchen**, nirgends sonst.

Die einzige Ausnahme von der Einfarbigkeit ist ein tiefes Rot
(`#A32B1F`) für „fehlt": ein fehlendes Pflichtfeld, eine fehlende
Pflichtangabe nach GEG. Ohne diesen Unterschied wäre die Prüfliste im
Inserats-Check nicht bedienbar. Es leuchtet nicht, und es taucht
nirgends dekorativ auf.

**Der Rest der Leitidee:**

- Flächen entstehen durch Abstand und Haarlinien, nicht durch Kästen,
  Schatten oder Raster. Genau ein Schatten im ganzen Projekt
  (`--schatten`), so weich, dass man ihn nicht sieht, sondern merkt.
- **Keine Monoschrift.** Sie war der Hauptgrund, warum die alte Fassung
  nach Terminal aussah. Zahlen laufen trotzdem in gleicher Breite: Die
  Klasse `.zahl` setzt `font-variant-numeric: tabular-nums`.
- Keine weit gesperrten Versalien im Fließtext. Nur das kleine Etikett
  über einem Abschnitt (`.etikett`) ist versal, und das ohne Übertreibung.
- Knöpfe in gemischter Schreibweise, nicht in Versalien. Genau ein
  gefüllter Knopf pro Bildschirm.
- Das Logo steht genau einmal je Seite, oben links. Im Fuß und in den
  Abschnitten steht der Schriftzug als Text (`.wortmarke`).

Was der Kunde am 30.07. abgelehnt hat und nirgends wieder auftauchen
soll: durchnummerierte `01 / 02 / 03`-Kacheln, Überschriften als
Antithese, Geviertstriche im Text, Einblendungen an jedem Abschnitt.

### Die laufende Zahl

Sie ist das Herzstück der Startseite und steht dort, wo sonst ein
Willkommensbild stünde: **der Betrag, den ein Beispielhaus verloren
hat, seit die Seite geöffnet wurde.** Vier Nachkommastellen, damit die
hinterste Stelle sichtbar läuft; bei rund 7.800 € im Jahr wechselt sie
etwa zweimal pro Sekunde.

Der Betrag ist klein, das ist der Punkt. Den Maßstab liefert der Satz
darunter: „Das sind 7.800 € im Jahr und 21 € an jedem Tag, an dem
nichts passiert." Beides rechnet `js/home.js` aus demselben Rechenkern,
mit dem auch die Analyse arbeitet, nichts davon ist ausgedacht.

Direkt daneben steht, um welches Objekt es geht, mit dem Wort
**Beispielrechnung**. Eine laufende Geldzahl ohne Objektbezug wäre
irreführende Werbung nach § 5 UWG.

Der Ticker hält im Hintergrundtab an und läuft bei der Rückkehr weiter,
ohne zurückzuspringen. Wenn das je wieder stehen bleibt: `tick` muss
eine Funktions**deklaration** sein, kein benannter Funktionsausdruck.
Als Ausdruck gilt der Name nur innerhalb der Funktion, und der Aufruf
beim Zurückschalten wirft still einen ReferenceError.

---

## Schriften

Alle unter `assets/fonts`, selbst gehostet, `font-src 'self'`.

| Schrift | Rolle | Lizenz |
|---|---|---|
| Archivo (variabel 100–900) | alles: Text, Bedienung, Zahlen, Logonachbildung | SIL Open Font License |
| Bricolage Grotesque (variabel) | Überschriften und große Zahlen, nie unter 1,5 rem | SIL Open Font License |

`--f-mono` heißt aus historischen Gründen so und zeigt längst auf
Archivo. Der Name bleibt, weil ihn Dutzende Regeln benutzen; getauscht
wurde nur der Wert. **IBM Plex Mono liegt noch im Ordner, wird aber von
keiner Regel mehr angefragt.**

Alle Dateien tragen die Teilmenge „latin". Sie deckt Umlaute, ß, ², €,
– und die deutschen Anführungszeichen ab. **Nicht enthalten ist `↳`**,
das Zeichen in `.quelle` fällt auf eine Systemschrift zurück.

`Poppins-*.woff2` und `Figtree-wght.woff2` liegen aus der
zurückgebauten Flyer-Fassung noch im Ordner, werden aber von keiner
Regel mehr angefragt. Wer sicher ist, dass es keinen Rückweg gibt,
kann sie löschen.

Dateien werden **nie unter gleichem Namen überschrieben**, sondern
nur unter neuem Namen ersetzt. Darauf beruht die Cache-Regel
„ein Jahr, immutable" für `/assets/*`.

---

## Bekannte Grenzen

- **Kein SVG-Favicon-Fallback.** Browser ohne SVG-Favicon-Unterstützung
  fragen `/favicon.ico` an und bekommen 404. Wenn das stört: eine
  32×32-ICO aus `favicon.svg` erzeugen und ablegen.
- **Der Wizard braucht JavaScript.** Ohne JS steht auf beiden
  Werkzeugseiten eine `<noscript>`-Erklärung mit Weg zum Kontakt,
  kein kaputter Bildschirm.
- **Kopf und Fuß stehen in jeder HTML-Datei.** Preis des
  Build-losen Aufbaus, wie in den anderen Projekten auch. Wer die
  Navigation ändert, ändert sie in vierzehn Dateien.
- **Kein Captcha.** Honigtopf und Zeitfalle halten Formularspam ab,
  aber niemanden, der es darauf anlegt. Der Missbrauchsschutz für
  den Inserats-Check gehört nach n8n, siehe `docs/N8N.md`.
