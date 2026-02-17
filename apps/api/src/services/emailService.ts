import nodemailer from "nodemailer";
import { logger } from "tsdown";

const SMTP_FROM = process.env.SMTP_FROM || "Gatherly <noreply@gatherly.local>";

/**
 * Send magic link email to invited participant
 * Fire-and-don't-block: logs errors but does NOT throw
 * Caller should not await this if they want non-blocking behavior
 */
export async function sendMagicLinkEmail(
  to: string,
  magicLinkUrl: string,
  eventName: string,
): Promise<void> {
  try {
    const testAccount = await nodemailer.createTestAccount();

    // Create nodemailer transporter using environment variables
    // Defaults suitable for MailHog/Mailpit local development (host=localhost, port=1025)
    const transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    logger.log("Sending email to ", to);
    logger.log("Sending email from ", SMTP_FROM);
    logger.log("Test account: ", testAccount);

    const info = await transporter.sendMail({
      from: `"Gatherly" <${testAccount.user}>`,
      to,
      subject: `You're invited to ${eventName} on Gatherly`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          </head>
          <body style="font-family: sans-serif; background: #f9fafb; margin: 0; padding: 40px 20px;">
            <div style="max-width: 480px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 40px; box-shadow: 0 1px 4px rgba(0,0,0,0.08);">
              <h1 style="font-size: 22px; color: #111827; margin-top: 0;">
                You're invited to <strong>${eventName}</strong>
              </h1>
              <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
                Someone has invited you to join <strong>${eventName}</strong> on Gatherly — where you can share your wishlist and discover what others would love to receive.
              </p>
              <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
                Click the button below to join. This link is valid for 24 hours and can only be used once.
              </p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${magicLinkUrl}"
                   style="background: #6366f1; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 16px; font-weight: 600; display: inline-block;">
                  Join Event
                </a>
              </div>
              <p style="color: #9ca3af; font-size: 13px; margin-bottom: 0;">
                If the button doesn't work, copy and paste this link into your browser:<br />
                <a href="${magicLinkUrl}" style="color: #6366f1; word-break: break-all;">${magicLinkUrl}</a>
              </p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                If you did not expect this invitation, you can safely ignore this email.
              </p>
            </div>
          </body>
        </html>
      `,
    });
    logger.log(`Magic link email sent to ${to}`);
    logger.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
  } catch (error) {
    console.error(`Failed to send magic link email to ${to}:`, error);
    // Do NOT rethrow - fire-and-don't-block pattern
  }
}
