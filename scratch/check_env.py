import os
from pathlib import Path

def load_env(path):
    if not os.path.exists(path):
        return
    with open(path) as f:
        for line in f:
            if '=' in line:
                key, val = line.strip().split('=', 1)
                os.environ[key] = val

env_path = Path('.env').resolve()
print(f"Checking {env_path}")
load_env(env_path)
print(f"TWILIO_ACCOUNT_SID: {os.getenv('TWILIO_ACCOUNT_SID')}")
print(f"TWILIO_AUTH_TOKEN: {os.getenv('TWILIO_AUTH_TOKEN')}")
