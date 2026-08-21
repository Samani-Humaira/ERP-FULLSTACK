import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

# Attempt to load backend/.env for credentials if present
env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
env = {}
if os.path.exists(env_path):
    with open(env_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            if '=' in line:
                k, v = line.split('=', 1)
                env[k.strip()] = v.strip()

SMTP_HOST = env.get('SMTP_HOST', os.environ.get('SMTP_HOST', 'smtp.gmail.com'))
SMTP_PORT = int(env.get('SMTP_PORT', os.environ.get('SMTP_PORT', '587')))
SMTP_USER = env.get('SMTP_USER', os.environ.get('SMTP_USER'))
SMTP_PASSWORD = env.get('SMTP_PASSWORD', os.environ.get('SMTP_PASSWORD'))
SMTP_FROM = env.get('SMTP_FROM', os.environ.get('SMTP_FROM', SMTP_USER))

recipient = os.environ.get('TEST_RECIPIENT', 'szagade119@gmail.com')

from email.message import EmailMessage

msg = EmailMessage()
msg['Subject'] = "Test direct SMTP"
msg['From'] = SMTP_FROM
msg['To'] = recipient
msg.set_content("This is a test")
msg.add_alternative("<p>This is a test</p>", subtype='html')

try:
    server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10)
    server.ehlo()
    server.starttls()
    server.ehlo()
    server.login(SMTP_USER, SMTP_PASSWORD)
    try:
        server.send_message(msg, SMTP_FROM, [recipient])
        print('send_message succeeded')
    except Exception as e:
        print('send_message exception:', type(e).__name__, e)
    server.quit()
except Exception as e:
    print('Exception during send_message:', type(e).__name__, e)
