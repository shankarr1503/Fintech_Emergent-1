import os

# Configure before the app is imported: in-memory DB, demo OTPs, no AI, generous IP limits.
os.environ["MONGO_URL"] = ""
os.environ["DEMO_MODE"] = "true"
os.environ["OPENAI_API_KEY"] = ""
os.environ["OTP_SENDS_PER_IP_HOUR"] = "1000"
os.environ["OTP_VERIFIES_PER_IP_10MIN"] = "1000"
os.environ["ADMIN_API_KEY"] = "test-admin-key"
os.environ["WEBHOOK_SECRET"] = "test-webhook-secret"
os.environ["FIELD_ENCRYPTION_KEY"] = "8vXJ3l1a9yqNw4W2t6sZbQ0cY7hRk5mDfPgUeAiLoE8="
