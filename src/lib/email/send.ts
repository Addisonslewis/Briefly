import { Resend } from "resend";

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

export async function sendDigest(
  to: string,
  emailHtml: string
): Promise<void> {
  const date = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  await getResend().emails.send({
    from: process.env.EMAIL_FROM || "digest@gobriefly.app",
    to,
    subject: `Briefly - ${date}`,
    html: emailHtml,
  });
}

export async function sendAlertEmail(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  await getResend().emails.send({
    from: process.env.EMAIL_FROM || "digest@gobriefly.app",
    to,
    subject,
    html,
  });
}
