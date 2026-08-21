from getpass import getpass
from app.config import settings
from app.services.emailer import send_email

if __name__ == '__main__':
    print('This will prompt you for your Gmail App Password (input hidden).')
    pw = getpass('Enter Gmail App Password: ')
    # set password for this session
    settings.SMTP_PASSWORD = pw
    print('Sending test email to', settings.SMTP_USER)
    ok = send_email(settings.SMTP_USER, 'ERP-FULLSTACK interactive test', '<p>Interactive test email</p>', 'Interactive test body')
    print('Sent:', ok)
    if not ok:
        print('If sending failed, check the backend logs and ensure App Password is valid.')
