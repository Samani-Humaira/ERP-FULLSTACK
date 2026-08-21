import time
import httpx
import os

BASE = os.getenv('API_BASE', 'http://localhost:8000')

# configure test accounts/recipient
TEST_EMAIL = os.getenv('TEST_USER_EMAIL') or f"test-invite-{int(time.time())}@example.com"
TEST_PASSWORD = os.getenv('TEST_USER_PASSWORD') or 'TestPass123!'
RECIPIENT = os.getenv('TEST_RECIPIENT') or os.getenv('SMTP_USER') or 'recipient@example.com'

client = httpx.Client(base_url=BASE, timeout=30.0)

print('Using test account:', TEST_EMAIL)

# try signup
signup_payload = {
    'email': TEST_EMAIL,
    'password': TEST_PASSWORD,
    'full_name': 'Invite Tester',
    'role': 'researcher'
}

r = client.post('/api/v1/auth/signup', json=signup_payload)
if r.status_code == 201:
    print('Signed up test user')
elif r.status_code == 400 and 'exists' in (r.text or ''):
    print('User already exists, proceeding to login')
else:
    print('Signup response:', r.status_code, r.text)

# login
r = client.post('/api/v1/auth/login', json={'email': TEST_EMAIL, 'password': TEST_PASSWORD})
if r.status_code != 200:
    print('Login failed:', r.status_code, r.text)
    raise SystemExit(1)

token = r.json().get('access_token')
print('Got token')
headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

# create a project
proj_payload = {
    'title': 'Invite flow test project',
    'description': 'Created by automated test',
    'project_type': 'paper',
    'query': 'test',
    'content': {},
}

r = client.post('/api/v1/save', json=proj_payload, headers=headers)
if r.status_code != 200 and r.status_code != 201:
    print('Project create failed:', r.status_code, r.text)
    raise SystemExit(1)

project = r.json()
project_id = project.get('id')
print('Created project', project_id)

# send invite
invite_payload = {'emails': [RECIPIENT], 'role': 'editor'}
try:
    r = client.post(f'/api/v1/projects/{project_id}/invite', json=invite_payload, headers=headers)
    print('Invite response status:', r.status_code)
    try:
        print(r.json())
    except Exception:
        print(r.text)
except Exception as e:
    print('Invite request failed:', type(e).__name__, e)

print('Done')
