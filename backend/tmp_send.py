import sys
import importlib.util

# Ensure current directory is on sys.path so `app` package is importable
sys.path.insert(0, '.')

spec = importlib.util.spec_from_file_location('emailer_mod', 'app/services/emailer.py')
emailer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(emailer)

recipient = 'szagade119@gmail.com'
print('Sending test email to', recipient)
ok = emailer.send_email(recipient, 'ERP-FULLSTACK test', '<p>This is a test from tmp_send.py</p>', text_body='Test body')
print('Sent:', ok)
