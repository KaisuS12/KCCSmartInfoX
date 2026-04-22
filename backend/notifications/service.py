import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from dotenv import load_dotenv

load_dotenv()

EMAIL_USER = os.getenv("EMAIL_USER", "")
EMAIL_PASS = os.getenv("EMAIL_PASSWORD", "")


def _base_template(header_extra: str, body: str, footer: str = "") -> str:
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f5;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.10);">

        <!-- Header -->
        <tr>
          <td style="background:#003087;padding:36px 24px 28px;text-align:center;">
            <div style="width:80px;height:80px;background:#c9a84c;border-radius:50%;display:inline-block;line-height:80px;text-align:center;font-size:26px;font-weight:900;color:#003087;margin:0 auto 16px;letter-spacing:-1px;">KCC</div>
            <h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:0 0 4px;">KCCSmartInfoX</h1>
            <p  style="color:#c0cde8;font-size:13px;margin:0 0 18px;">Kabankalan Catholic College, Inc.</p>
            {header_extra}
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 36px;color:#1a1a2e;font-size:15px;line-height:1.7;">
            {body}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f7f8fa;border-top:1px solid #e8eaf0;padding:18px 36px;text-align:center;">
            <p style="color:#9098a9;font-size:12px;margin:0;">
              {footer if footer else "Kabankalan Catholic College &nbsp;&bull;&nbsp; KCCSmartInfoX<br>This is an automated message &mdash; please do not reply directly to this email."}
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _send(to, subject: str, html: str):
    if not EMAIL_USER or not EMAIL_PASS:
        return

    recipients = [to] if isinstance(to, str) else list(to)
    if not recipients:
        return

    for addr in recipients:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"]    = f"KCCSmartInfoX <{EMAIL_USER}>"
            msg["To"]      = addr
            msg.attach(MIMEText(html, "html", "utf-8"))

            with smtplib.SMTP_SSL("smtp.gmail.com", 465) as s:
                s.login(EMAIL_USER, EMAIL_PASS)
                s.sendmail(EMAIL_USER, addr, msg.as_string())
        except Exception:
            pass


# ── Public functions ──────────────────────────────────────────────────────────

def send_announcement_email(subscriber_emails: list, title: str, content: str):
    header_extra = """
      <span style="display:inline-block;background:#c9a84c;color:#1a1a2e;
                   font-size:12px;font-weight:700;letter-spacing:1px;
                   padding:6px 20px;border-radius:20px;text-transform:uppercase;">
        Announcement
      </span>"""

    body = f"""
      <h2 style="color:#003087;font-size:20px;font-weight:700;margin:0 0 16px;">{title}</h2>
      <div style="color:#374151;font-size:15px;line-height:1.8;white-space:pre-wrap;">{content}</div>
      <hr style="border:none;border-top:1px solid #e8eaf0;margin:28px 0;" />
      <p style="color:#9098a9;font-size:13px;margin:0;">
        You received this because you subscribed to KCCSmartInfoX announcements.
      </p>"""

    html = _base_template(header_extra, body)
    _send(subscriber_emails, f"📢 {title}", html)


def send_concern_notification(admin_email: str, name: str, email: str,
                               message: str, question: str):
    header_extra = """
      <span style="display:inline-block;background:#c9a84c;color:#1a1a2e;
                   font-size:12px;font-weight:700;letter-spacing:1px;
                   padding:6px 20px;border-radius:20px;text-transform:uppercase;">
        New Concern
      </span>"""

    q_row = f"""
      <tr>
        <td style="padding:8px 12px;color:#6b7280;font-size:13px;font-weight:600;white-space:nowrap;">Related Question</td>
        <td style="padding:8px 12px;color:#374151;font-size:14px;">{question}</td>
      </tr>""" if question else ""

    body = f"""
      <p style="color:#374151;margin:0 0 20px;">
        A student has submitted a new concern through the KCCSmartInfoX chatbot.
      </p>

      <table cellpadding="0" cellspacing="0" width="100%"
             style="background:#f7f8fa;border-radius:10px;border:1px solid #e8eaf0;margin-bottom:20px;font-size:14px;">
        <tr>
          <td style="padding:8px 12px;color:#6b7280;font-size:13px;font-weight:600;white-space:nowrap;">Name</td>
          <td style="padding:8px 12px;color:#374151;">{name}</td>
        </tr>
        <tr style="background:#fff;">
          <td style="padding:8px 12px;color:#6b7280;font-size:13px;font-weight:600;white-space:nowrap;">Email</td>
          <td style="padding:8px 12px;color:#374151;">{email}</td>
        </tr>
        {q_row}
      </table>

      <p style="color:#6b7280;font-size:13px;font-weight:600;margin:0 0 8px;">Message</p>
      <div style="background:#fff8e1;border-left:4px solid #c9a84c;border-radius:6px;
                  padding:14px 16px;color:#374151;font-size:14px;line-height:1.7;white-space:pre-wrap;">{message}</div>

      <p style="margin:24px 0 0;font-size:14px;color:#374151;">
        Log in to the admin panel to view and reply to this concern.
      </p>"""

    html = _base_template(header_extra, body)
    _send(admin_email, f"[KCCSmartInfoX] New Concern from {name}", html)


def send_concern_reply(user_email: str, user_name: str,
                        original_message: str, reply: str):
    header_extra = """
      <span style="display:inline-block;background:#16a34a;color:#ffffff;
                   font-size:12px;font-weight:700;letter-spacing:1px;
                   padding:6px 20px;border-radius:20px;text-transform:uppercase;">
        Concern Reply
      </span>"""

    body = f"""
      <p style="color:#374151;margin:0 0 6px;">Hi <strong>{user_name}</strong>,</p>
      <p style="color:#374151;margin:0 0 24px;">
        The admin has responded to your concern. Here is their reply:
      </p>

      <p style="color:#6b7280;font-size:13px;font-weight:600;margin:0 0 8px;">Admin Reply</p>
      <div style="background:#f0fdf4;border-left:4px solid #16a34a;border-radius:6px;
                  padding:14px 16px;color:#374151;font-size:15px;line-height:1.7;white-space:pre-wrap;">{reply}</div>

      <p style="color:#6b7280;font-size:13px;font-weight:600;margin:20px 0 8px;">Your Original Concern</p>
      <div style="background:#f7f8fa;border-left:4px solid #d1d5db;border-radius:6px;
                  padding:12px 16px;color:#6b7280;font-size:14px;line-height:1.7;white-space:pre-wrap;">{original_message}</div>

      <p style="margin:24px 0 0;font-size:13px;color:#9098a9;">
        If you have further questions, please visit the KCCSmartInfoX chatbot again.
      </p>"""

    html = _base_template(header_extra, body)
    _send(user_email, "[KCCSmartInfoX] Reply to Your Concern", html)
