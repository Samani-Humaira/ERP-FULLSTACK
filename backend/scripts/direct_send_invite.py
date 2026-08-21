import logging
from app.services.emailer import send_email
from app.config import settings

logging.basicConfig(level=logging.DEBUG)

recipient = 'szagade119@gmail.com'
project_id = 'local-test'
link = f"{settings.FRONTEND_URL}/projects/{project_id}?invite_token=TESTTOKEN"
subject = "You're invited to collaborate on project Test"
html = f"<p>Click <a href=\"{link}\">here</a> to accept</p>"

ok = send_email(recipient, subject, html, text_body=f"Open the link to accept: {link}", invite_link=link)
print('send_email returned', ok)
