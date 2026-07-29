/* ══════════════════════════════════════════════════════════════════
   kontakt.js · Das allgemeine Kontaktformular.
   Gleiche Schutzmechanik wie beim Bericht-Formular: Honigtopf plus
   Zeitfalle. Kein Captcha — das kostet Abschlüsse und hält gegen
   ernsthafte Bots ohnehin nicht.
   ══════════════════════════════════════════════════════════════════ */

(function (global) {
  "use strict";

  function los() {
    var form = document.getElementById("kontaktform");
    if (!form) return;

    var status = form.querySelector(".gform__status");
    var geoeffnet = Date.now();

    // Anlass aus der Adresszeile übernehmen: /kontakt.html?anlass=inserat
    var anlass = new URLSearchParams(location.search).get("anlass");
    if (anlass) {
      var auswahl = form.querySelector('[name="anlass"]');
      if (auswahl && auswahl.querySelector('[value="' + anlass + '"]')) auswahl.value = anlass;
    }

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var d = new FormData(form);
      status.dataset.art = "";

      if (Date.now() - geoeffnet < 3000 || d.get("webseite")) {
        status.dataset.art = "fehler";
        status.textContent = "Bitte prüfen Sie Ihre Eingaben.";
        return;
      }
      if (!d.get("name") || !d.get("email") || !d.get("nachricht")) {
        status.dataset.art = "fehler";
        status.textContent = "Name, E-Mail und Nachricht brauchen wir.";
        return;
      }
      if (!form.querySelector('[name="einwilligung"]').checked) {
        status.dataset.art = "fehler";
        status.textContent = "Ohne Ihre Einwilligung dürfen wir die Anfrage nicht bearbeiten.";
        return;
      }

      var knopf = form.querySelector('button[type="submit"]');
      knopf.disabled = true;
      status.dataset.art = "laeuft";
      status.textContent = "Wird gesendet …";

      var nutzlast = {
        quelle: "kontakt",
        version: 1,
        zeitpunkt: new Date().toISOString(),
        lead: {
          name: String(d.get("name")).trim(),
          email: String(d.get("email")).trim(),
          telefon: String(d.get("telefon") || "").trim(),
          anlass: String(d.get("anlass") || "").trim(),
          nachricht: String(d.get("nachricht")).trim(),
          einwilligung: true
        },
        herkunft: { seite: location.pathname, verweis: document.referrer || null }
      };

      var fertig = function () {
        form.innerHTML =
          '<div class="gform__danke">' +
            '<p class="marke marke--gepruft"><span class="punkt"></span>Angekommen</p>' +
            '<p class="gross">Wir melden uns — in der Regel noch am selben Werktag.</p>' +
          '</div>';
      };

      if (global.APP.MODUS === "DEMO" || !global.APP.N8N_BASIS) {
        console.info("[DEMO] Nichts verschickt. Diese Nutzlast ginge an n8n:");
        console.log(JSON.stringify(nutzlast, null, 2));
        setTimeout(fertig, 800);
        return;
      }

      fetch(global.APP.N8N_BASIS + global.APP.ENDPUNKTE.KONTAKT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nutzlast)
      }).then(function (r) {
        if (!r.ok) throw new Error("n8n antwortete mit " + r.status);
        fertig();
      }).catch(function (e) {
        console.error("[Kontakt]", e);
        knopf.disabled = false;
        status.dataset.art = "fehler";
        status.textContent = "Das hat gerade nicht geklappt. Bitte rufen Sie uns an — " +
                             "oder versuchen Sie es in ein paar Minuten noch einmal.";
      });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", los);
  else los();

})(window);
