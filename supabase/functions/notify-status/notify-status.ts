// ============================================================
// EDGE FUNCTION — notify-status
// Appelée quand une demande passe au statut "traitée"
// ============================================================

const RESEND_API_KEY = "re_XXXXXXXXXXXXXXXXXXXXXXXXXX"; // 🔑 Remplacez par votre clé Resend
const ADMIN_EMAIL    = "votre@email.fr";                // 📧 Votre adresse e-mail personnelle
const FROM_EMAIL     = "onboarding@resend.dev";         // ✉️  Laisser tel quel (option B Resend)
const APP_NAME       = "PédaGest";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const { demand, newStatus } = await req.json();
    // demand = { subject, referent, referentEmail, creche, desc, priority, theme, date }
    // newStatus = "traite" | "attente"

    const isTraite = newStatus === "traite";

    const htmlAdmin = `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
        <div style="background:${isTraite ? "#1D9E75" : "#BA7517"};padding:16px 24px;border-radius:8px 8px 0 0;margin:-24px -24px 24px">
          <h1 style="color:#fff;margin:0;font-size:18px">
            ${APP_NAME} — Demande ${isTraite ? "traitée ✅" : "remise en attente 🔄"}
          </h1>
        </div>
        <p style="color:#374151">
          La demande suivante a été marquée comme <strong>${isTraite ? "traitée" : "en attente"}</strong> :
        </p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:8px 0;color:#6b7280;width:140px">Crèche</td><td style="padding:8px 0;font-weight:500">${demand.creche}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280">Référent</td><td style="padding:8px 0">${demand.referent}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280">Sujet</td><td style="padding:8px 0;font-weight:500">${demand.subject}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280">Thème</td><td style="padding:8px 0">${demand.theme}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280">Date demande</td><td style="padding:8px 0">${demand.date}</td></tr>
        </table>
        <p style="margin-top:24px;font-size:12px;color:#9ca3af">Message automatique envoyé par ${APP_NAME}</p>
      </div>
    `;

    const htmlReferent = `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
        <div style="background:${isTraite ? "#1D9E75" : "#BA7517"};padding:16px 24px;border-radius:8px 8px 0 0;margin:-24px -24px 24px">
          <h1 style="color:#fff;margin:0;font-size:18px">
            ${APP_NAME} — Votre demande est ${isTraite ? "traitée ✅" : "remise en attente 🔄"}
          </h1>
        </div>
        <p style="color:#374151">Bonjour <strong>${demand.referent}</strong>,</p>
        <p style="color:#374151">
          ${isTraite
            ? "Bonne nouvelle ! Votre demande a été <strong>traitée</strong>."
            : "Votre demande a été remise <strong>en attente</strong> pour un complément de traitement."
          }
        </p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:8px 0;color:#6b7280;width:140px">Crèche</td><td style="padding:8px 0">${demand.creche}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280">Sujet</td><td style="padding:8px 0;font-weight:500">${demand.subject}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280">Description</td><td style="padding:8px 0">${demand.desc || "—"}</td></tr>
        </table>
        ${isTraite ? `<p style="color:#374151;margin-top:16px">Merci pour votre demande.</p>` : ""}
        <p style="margin-top:24px;font-size:12px;color:#9ca3af">Message automatique envoyé par ${APP_NAME}</p>
      </div>
    `;

    const emails = [
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [ADMIN_EMAIL],
          subject: `[${APP_NAME}] Demande ${isTraite ? "traitée" : "remise en attente"} — ${demand.creche} : ${demand.subject}`,
          html: htmlAdmin,
        }),
      }),
    ];

    if (demand.referentEmail) {
      emails.push(
        fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: [demand.referentEmail],
            subject: `[${APP_NAME}] Votre demande est ${isTraite ? "traitée" : "remise en attente"}`,
            html: htmlReferent,
          }),
        })
      );
    }

    await Promise.all(emails);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
