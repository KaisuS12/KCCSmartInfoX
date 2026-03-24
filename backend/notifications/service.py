import os
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("kccsmartinfox.notifications")

EMAIL_USER     = os.getenv("EMAIL_USER", "")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD", "")
APP_NAME       = "KCCSmartInfoX"


def send_announcement_email(subscriber_emails: list, title: str, content: str):
    if not EMAIL_USER or not EMAIL_PASSWORD:
        logger.warning("[Email] Skipped: EMAIL_USER or EMAIL_PASSWORD not set in .env")
        return
    if not subscriber_emails:
        logger.info("[Email] Skipped: no subscribers.")
        return

    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
      <div style="background:#003087;color:#fff;padding:24px;text-align:center;border-radius:12px 12px 0 0;">
        <h1 style="margin:0;font-size:22px;">{APP_NAME}</h1>
        <p style="margin:4px 0 0;font-size:13px;opacity:.8;">Kabankalan Catholic College, Inc.</p>
      </div>
      <div style="background:#f9f9f9;padding:28px;">
        <h2 style="color:#003087;margin-top:0;">{title}</h2>
        <p style="color:#333;line-height:1.7;white-space:pre-line;">{content}</p>
      </div>
      <div style="background:#eee;padding:14px;text-align:center;font-size:12px;color:#888;border-radius:0 0 12px 12px;">
        You received this because you subscribed to KCC announcements.<br/>
        Visit <strong>{APP_NAME}</strong> for more information.
      </div>
    </div>
    """

    sent = 0
    for email in subscriber_emails:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = f"[KCC] {title}"
            msg["From"]    = EMAIL_USER
            msg["To"]      = email
            msg.attach(MIMEText(html, "html"))

            with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
                server.login(EMAIL_USER, EMAIL_PASSWORD)
                server.sendmail(EMAIL_USER, email, msg.as_string())
            sent += 1
            logger.info("[Email] Sent to %s", email)
        except Exception as e:
            logger.error("[Email] Failed to send to %s: %s", email, e)

    logger.info("[Email] Done: %d/%d sent", sent, len(subscriber_emails))
