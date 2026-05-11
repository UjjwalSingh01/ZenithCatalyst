import nodemailer from 'nodemailer';
import logger from '../utils/logger';

// ─── Transporter ──────────────────────────────────────────────────

function createTransporter() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT) || 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.EMAIL_FROM || 'Zenith Catalyst <noreply@zenithcatalyst.app>';

    if (!host || !user || !pass) {
        logger.warn('SMTP not configured — email sending will be skipped');
        return null;
    }

    return nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
    });
}

let transporter = createTransporter();

// ─── Email Templates ──────────────────────────────────────────────

function habitReminderTemplate(name: string, habitName: string, message: string) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Zenith Catalyst Reminder</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a12; color: #f0f0ff; margin: 0; padding: 20px; }
    .container { max-width: 560px; margin: 0 auto; background: #111120; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.08); }
    .header { background: linear-gradient(135deg, #6366f1, #a855f7); padding: 32px 28px; }
    .header h1 { color: white; margin: 0; font-size: 22px; }
    .header p { color: rgba(255,255,255,0.8); margin: 6px 0 0; font-size: 14px; }
    .body { padding: 28px; }
    .greeting { font-size: 18px; font-weight: 600; margin-bottom: 12px; }
    .habit-box { background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.25); border-radius: 12px; padding: 20px; margin: 18px 0; }
    .habit-name { font-size: 20px; font-weight: 700; color: #818cf8; margin-bottom: 8px; }
    .message { color: rgba(240,240,255,0.75); line-height: 1.6; }
    .cta { display: inline-block; background: linear-gradient(135deg, #6366f1, #a855f7); color: white; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 600; margin: 20px 0; font-size: 15px; }
    .footer { padding: 20px 28px; border-top: 1px solid rgba(255,255,255,0.06); font-size: 12px; color: rgba(240,240,255,0.35); }
    .streak { display: inline-flex; align-items: center; gap: 6px; background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.2); border-radius: 8px; padding: 8px 14px; margin-top: 14px; color: #f59e0b; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚡ Zenith Catalyst</h1>
      <p>Your AI-powered catalyst for peak performance and lasting habits.</p>
    </div>
    <div class="body">
      <div class="greeting">Hey ${name}! 👋</div>
      <p class="message">Time to keep your momentum going. Your scheduled reminder is here:</p>
      <div class="habit-box">
        <div class="habit-name">📌 ${habitName}</div>
        <p class="message">${message}</p>
      </div>
      <a href="${process.env.FRONTEND_URL || 'http://localhost'}/app/home" class="cta">Open Zenith Catalyst →</a>
      <div class="streak">🔥 Keep your streak alive — small actions compound into big results</div>
    </div>
    <div class="footer">
      You're receiving this because you set up a reminder in Zenith Catalyst.<br>
      <a href="${process.env.FRONTEND_URL || 'http://localhost'}/app/home" style="color: #6366f1;">Manage reminders</a>
    </div>
  </div>
</body>
</html>`;
}

// ─── Send ─────────────────────────────────────────────────────────

export interface SendEmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

export async function sendEmail(opts: SendEmailOptions): Promise<boolean> {
    if (!transporter) {
        logger.warn({ to: opts.to }, 'Email skipped: SMTP not configured');
        return false;
    }
    try {
        const from = process.env.EMAIL_FROM || 'Zenith Catalyst <noreply@zenithcatalyst.app>';
        const info = await transporter.sendMail({ from, ...opts });
        logger.info({ messageId: info.messageId, to: opts.to }, 'Email sent successfully');
        return true;
    } catch (err) {
        logger.error({ err, to: opts.to }, 'Failed to send email');
        return false;
    }
}

export async function sendHabitReminder(opts: {
    to: string;
    userName: string;
    habitName: string;
    message: string;
}): Promise<boolean> {
    return sendEmail({
        to: opts.to,
        subject: `⏰ Reminder: ${opts.habitName} — Zenith Catalyst`,
        html: habitReminderTemplate(opts.userName, opts.habitName, opts.message),
        text: `Hey ${opts.userName}! Time for your habit: ${opts.habitName}\n\n${opts.message}\n\nStay consistent!`,
    });
}
