import logging
import smtplib
from email.message import EmailMessage
from email.utils import formatdate, make_msgid
from pathlib import Path
from typing import Optional

from app.config import settings

logger = logging.getLogger(__name__)


def send_email(
    to_email: str,
    subject: str,
    html_body: str,
    text_body: Optional[str] = None,
    save_copy: bool = True,
) -> bool:
    """Send an email through configured SMTP. Return whether SMTP accepted it."""
    if not settings.SMTP_HOST:
        logger.error("SMTP_HOST is not configured; cannot send email to %s", to_email)
        return False

    msg = EmailMessage()
    from_addr = settings.SMTP_FROM
    msg["Subject"] = subject
    msg["From"] = f"ERP Research <{from_addr}>"
    msg["To"] = to_email
    msg["Reply-To"] = from_addr
    msg["Date"] = formatdate(localtime=True)
    msg["Message-ID"] = make_msgid()
    msg.set_content(
        text_body or "You have been invited. Open the project to accept the invite."
    )
    msg.add_alternative(html_body, subtype="html")

    if settings.SAVE_SENT_EMAILS and save_copy:
        try:
            logs_dir = Path(__file__).resolve().parents[1] / "email_logs"
            logs_dir.mkdir(parents=True, exist_ok=True)
            message_id = msg["Message-ID"].strip("<>")
            (logs_dir / f"{message_id}.eml").write_bytes(msg.as_bytes())
        except OSError:
            logger.exception("Could not save email debug copy")

    for attempt in range(1, 4):
        server = None
        try:
            if settings.SMTP_USE_TLS:
                server = smtplib.SMTP(
                    settings.SMTP_HOST, settings.SMTP_PORT, timeout=15
                )
                server.ehlo()
                server.starttls()
                server.ehlo()
            else:
                server = smtplib.SMTP_SSL(
                    settings.SMTP_HOST, settings.SMTP_PORT, timeout=15
                )

            if settings.SMTP_USER:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)

            refused = server.send_message(msg, from_addr, [to_email])
            if refused:
                logger.error("SMTP refused recipient %s: %s", to_email, refused)
                return False

            logger.info(
                "Email accepted by SMTP: subject=%s recipient=%s message_id=%s",
                subject,
                to_email,
                msg["Message-ID"],
            )
            return True
        except (smtplib.SMTPAuthenticationError, smtplib.SMTPRecipientsRefused,
                smtplib.SMTPSenderRefused) as exc:
            logger.error("SMTP rejected email to %s: %s", to_email, exc)
            return False
        except (smtplib.SMTPException, OSError) as exc:
            logger.warning(
                "SMTP attempt %s/3 failed for %s: %s", attempt, to_email, exc
            )
            if attempt == 3:
                logger.exception("Email delivery failed for %s", to_email)
        except Exception:
            logger.exception("Unexpected error sending email to %s", to_email)
            return False
        finally:
            if server is not None:
                try:
                    server.quit()
                except Exception:
                    pass

    return False