import smtplib
import os
from pathlib import Path
from email.message import EmailMessage
from email.utils import formatdate, make_msgid
from typing import Optional
from app.config import settings
import logging

logger = logging.getLogger(__name__)


def send_email(to_email: str, subject: str, html_body: str, text_body: Optional[str] = None, invite_link: Optional[str] = None) -> bool:
    """Send an email via configured SMTP server. Returns True on success.
    If `invite_link` is provided, it will be logged to the backend console so developers
    can copy it if email delivery fails.
    """
    # Basic validation: ensure SMTP host and from address are configured
    if not settings.SMTP_HOST:
        logger.error("SMTP_HOST not configured. Set SMTP_HOST in environment (.env) to enable sending emails.")
        if invite_link:
            logger.warning(f"SMTP not configured — invite link for {to_email}: {invite_link}")
        return False

    try:
        # Build a modern EmailMessage with plain and HTML alternatives
        msg = EmailMessage()
        display_name = "ERP Research"
        from_addr = settings.SMTP_FROM
        msg['Subject'] = subject
        msg['From'] = f"{display_name} <{from_addr}>"
        msg['To'] = to_email
        msg['Reply-To'] = from_addr
        msg['Date'] = formatdate(localtime=True)
        msg['Message-ID'] = make_msgid()

        if text_body:
            msg.set_content(text_body)
        else:
            # Set a minimal plain fallback if none provided
            msg.set_content("You have been invited. Open the project to accept the invite.")
        # Add HTML alternative
        msg.add_alternative(html_body, subtype='html')

        # Attempt to send via SMTP
        server = None
        try:
            if settings.SMTP_USE_TLS:
                server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
                server.ehlo()
                server.starttls()
                server.ehlo()
            else:
                server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)

            # Login if credentials provided
            if settings.SMTP_USER:
                try:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                except smtplib.SMTPAuthenticationError as auth_err:
                    logger.error("SMTP authentication failed: %s", auth_err)
                    if invite_link:
                        logger.warning(f"SMTP auth failed — invite link for {to_email}: {invite_link}")
                    # attempt to save the composed message for debugging
                    try:
                        if getattr(settings, 'SAVE_SENT_EMAILS', False):
                            logs_dir = Path(__file__).resolve().parents[1] / 'email_logs'
                            logs_dir.mkdir(parents=True, exist_ok=True)
                            mid = msg['Message-ID'].strip('<>') if msg.get('Message-ID') else make_msgid().strip('<>')
                            path = logs_dir / f"{mid}.eml"
                            with open(path, 'wb') as f:
                                f.write(msg.as_bytes())
                            logger.info("Saved raw email (auth failed) to %s", str(path))
                    except Exception:
                        logger.exception("Failed to save raw email after auth failure")
                    return False

            # Log key headers for debugging (avoid dumping the full body in info logs)
            logger.info("Sending email: Subject=%s From=%s To=%s MessageID=%s", subject, from_addr, to_email, msg['Message-ID'])

            # Optionally save the raw email to disk for inspection (useful during debugging)
            try:
                if getattr(settings, 'SAVE_SENT_EMAILS', False):
                    logs_dir = Path(__file__).resolve().parents[1] / 'email_logs'
                    logs_dir.mkdir(parents=True, exist_ok=True)
                    # filename-safe message id
                    mid = msg['Message-ID'].strip('<>') if msg.get('Message-ID') else make_msgid().strip('<>')
                    path = logs_dir / f"{mid}.eml"
                    with open(path, 'wb') as f:
                        f.write(msg.as_bytes())
                    logger.info("Saved raw email to %s", str(path))
            except Exception:
                logger.exception("Failed to save raw email")

                # Use send_message which handles the envelope and headers
                # Ensure recipients passed as a list to avoid treating string as iterable of chars
                max_attempts = 3
                attempt = 0
                while True:
                    attempt += 1
                    try:
                        server.send_message(msg, from_addr, [to_email])
                        break
                    except smtplib.SMTPRecipientsRefused as rr:
                        logger.error("Recipient refused: %s", rr)
                        if invite_link:
                            logger.warning(f"Recipient refused — invite link for {to_email}: {invite_link}")
                        # save raw email if configured
                        try:
                            if getattr(settings, 'SAVE_SENT_EMAILS', False):
                                mid = msg['Message-ID'].strip('<>') if msg.get('Message-ID') else make_msgid().strip('<>')
                                path = Path(__file__).resolve().parents[1] / 'email_logs' / f"{mid}.eml"
                                with open(path, 'wb') as f:
                                    f.write(msg.as_bytes())
                                logger.info("Saved raw email (recipient refused) to %s", str(path))
                        except Exception:
                            logger.exception("Failed to save raw email after recipient refused")
                        return False
                    except smtplib.SMTPSenderRefused as sr:
                        logger.error("Sender refused: %s", sr)
                        if invite_link:
                            logger.warning(f"Sender refused — invite link for {to_email}: {invite_link}")
                        try:
                            if getattr(settings, 'SAVE_SENT_EMAILS', False):
                                mid = msg['Message-ID'].strip('<>') if msg.get('Message-ID') else make_msgid().strip('<>')
                                path = Path(__file__).resolve().parents[1] / 'email_logs' / f"{mid}.eml"
                                with open(path, 'wb') as f:
                                    f.write(msg.as_bytes())
                                logger.info("Saved raw email (sender refused) to %s", str(path))
                        except Exception:
                            logger.exception("Failed to save raw email after sender refused")
                        return False
                    except smtplib.SMTPDataError as de:
                        logger.error("SMTP data error on attempt %s: %s", attempt, de)
                        if invite_link:
                            logger.warning(f"SMTP data error — invite link for {to_email}: {invite_link}")
                        try:
                            if getattr(settings, 'SAVE_SENT_EMAILS', False):
                                mid = msg['Message-ID'].strip('<>') if msg.get('Message-ID') else make_msgid().strip('<>')
                                path = Path(__file__).resolve().parents[1] / 'email_logs' / f"{mid}.eml"
                                with open(path, 'wb') as f:
                                    f.write(msg.as_bytes())
                                logger.info("Saved raw email (data error) to %s", str(path))
                        except Exception:
                            logger.exception("Failed to save raw email after data error")
                        # retry for transient data errors
                        if attempt >= max_attempts:
                            return False
                    except (smtplib.SMTPServerDisconnected, smtplib.SMTPConnectError, smtplib.SMTPHeloError) as conn_e:
                        logger.error("SMTP connection error on attempt %s: %s", attempt, conn_e)
                        logger.debug("Full exception", exc_info=True)
                        if attempt >= max_attempts:
                            # save raw email for debugging
                            try:
                                if getattr(settings, 'SAVE_SENT_EMAILS', False):
                                    mid = msg['Message-ID'].strip('<>') if msg.get('Message-ID') else make_msgid().strip('<>')
                                    path = Path(__file__).resolve().parents[1] / 'email_logs' / f"{mid}.eml"
                                    with open(path, 'wb') as f:
                                        f.write(msg.as_bytes())
                                    logger.info("Saved raw email (connection error) to %s", str(path))
                            except Exception:
                                logger.exception("Failed to save raw email after connection error")
                            return False
                    except Exception as e:
                        logger.error("Unexpected SMTP error on attempt %s: %s", attempt, e)
                        logger.debug("Full exception", exc_info=True)
                        if attempt >= max_attempts:
                            try:
                                if getattr(settings, 'SAVE_SENT_EMAILS', False):
                                    mid = msg['Message-ID'].strip('<>') if msg.get('Message-ID') else make_msgid().strip('<>')
                                    path = Path(__file__).resolve().parents[1] / 'email_logs' / f"{mid}.eml"
                                    with open(path, 'wb') as f:
                                        f.write(msg.as_bytes())
                                    logger.info("Saved raw email (unexpected error) to %s", str(path))
                            except Exception:
                                logger.exception("Failed to save raw email after unexpected error")
                            return False

            # Log invite link for visibility (successful send)
            if invite_link:
                logger.info(f"Invite link for {to_email}: {invite_link}")

            return True
        finally:
            try:
                if server:
                    server.quit()
            except Exception:
                pass
    except Exception as e:
        logger.exception("Failed to send email: %s", e)
        # If we had an invite link, log it so developers can use it when SMTP fails
        if invite_link:
            logger.warning(f"SMTP failed — invite link for {to_email}: {invite_link}")
        return False
