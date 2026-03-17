import os
import sendgrid
from sendgrid.helpers.mail import Mail
from dotenv import load_dotenv

load_dotenv()

SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
FROM_EMAIL       = os.getenv("SENDGRID_FROM_EMAIL", "noreply@kcc.edu.ph")
APP_NAME         = "KCCSmartInfoX"


def send_announcement_email(subscriber_emails: list, title: str, content: str):
    if not SENDGRID_API_KEY or not subscriber_emails:
        print("[Email] Skipped: no API key or no subscribers.")
        return

    sg = sendgrid.SendGridAPIClient(api_key=SENDGRID_API_KEY)

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

    for email in subscriber_emails:
        try:
            message = Mail(
                from_email=FROM_EMAIL,
                to_emails=email,
                subject=f"[KCC] {title}",
                html_content=html,
            )
            sg.send(message)
        except Exception as e:
            print(f"[Email] Failed to send to {email}: {e}")
