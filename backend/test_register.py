import json
from urllib.request import Request, urlopen
from urllib.error import HTTPError

url = 'http://127.0.0.1:8000/api/auth/register'
payload = {
    'email': 'jan.kowalski@firma.pl',
    'password': 'Test12345',
    'full_name': 'Jan Kowalski',
    'role': 'worker',
    'location': 'Warsaw'
}
req = Request(url, data=json.dumps(payload).encode('utf-8'), headers={'Content-Type': 'application/json'})
try:
    with urlopen(req) as resp:
        print('status:', resp.status)
        print(resp.read().decode('utf-8'))
except HTTPError as e:
    print('status:', e.code)
    print(e.read().decode('utf-8'))
except Exception as e:
    print('error:', e)
