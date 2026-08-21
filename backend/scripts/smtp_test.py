import smtplib
from app.config import settings

print('SMTP settings: host=', settings.SMTP_HOST, 'port=', settings.SMTP_PORT, 'use_tls=', settings.SMTP_USE_TLS)

try:
    if settings.SMTP_USE_TLS:
        server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
        server.ehlo()
        server.starttls()
        server.ehlo()
    else:
        server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
    print('Connected to SMTP server')
    if settings.SMTP_USER:
        try:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            print('SMTP login successful')
        except Exception as e:
            print('SMTP login failed:', type(e).__name__, e)
    server.quit()
except Exception as e:
    print('SMTP connection error:', type(e).__name__, e)
