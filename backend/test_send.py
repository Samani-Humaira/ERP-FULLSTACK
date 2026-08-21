from app.config import settings
from app.services.emailer import send_email

if __name__ == '__main__':
    to = input('Recipient email: ').strip()
    if not to:
        print('No recipient provided')
        exit(1)
    subject = 'Test invite from ERP-FULLSTACK'
    html = '<p>This is a test email from your local ERP-FULLSTACK app.</p>'
    ok = send_email(to, subject, html, text_body='This is a test email')
    print('Sent:', ok)
    if not ok:
        print('Check backend logs for SMTP exceptions and verify SMTP settings in environment (.env)')
    else:
        print('If not seen in inbox, check spam folder or use Mailtrap for testing')
