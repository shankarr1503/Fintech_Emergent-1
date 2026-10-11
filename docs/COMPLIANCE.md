# Compliance and guidelines matrix

This document records how CoinQuest meets the product guidelines. Each item is in one of three states:

- **In code:** built, covered by tests in `backend/tests/` or the browser walkthrough, and enabled by default.
- **Needs infrastructure:** the code is ready, but it only takes effect once it is deployed with the right settings or services.
- **Needs legal / business:** a certification, licence, audit or partnership. Code cannot satisfy these.

**CoinQuest is not certified or licensed for anything yet.** The app makes no such claim anywhere; `/api/compliance/rbi-info` returns `certifications: []`. Real money must not move through it until the "needs legal / business" items are done.

## Security and compliance

| Guideline | Status | What exists / what's missing |
|---|---|---|
| **KYC** | In code (sandbox provider) | **Built:** tiered limits. Basic tier: ₹5,000 per payment, ₹10,000 per month. Full KYC: ₹1 lakh per payment and per day. PAN format and age checks, an explicit consent checkbox, and one PAN per account. Files: `services/kyc.py`, `routers/kyc.py`, `app/kyc.tsx`. **Missing:** `SandboxKycProvider` must be replaced with a real KYC agency (NSDL/Protean PAN verification, CKYC, DigiLocker/Aadhaar offline e-KYC). |
| **AML** | In code (rules) / needs business | **Built:** a rules engine on every payment covering velocity, large amounts, structuring just under ₹10k/₹50k, and a large first payment to a new payee. A payment is either allowed, flagged for review, or held (`on_hold`) with an alert in `aml_alerts`. Admins can view alerts at `GET /api/admin/aml/alerts`. **Missing:** a compliance officer, a review process, STR/CTR filing with FIU-IND, sanctions/PEP screening (a vendor), and tuning of the thresholds. |
| **PCI DSS** | Scope minimised; not certified | **Built:** the app never stores card numbers (PAN), CVV or the UPI PIN. Card numbers pasted into support messages are detected (with a Luhn check) and masked before storage (`services/pci.py`). **Missing:** card payments must go through a PCI-certified gateway's hosted fields or SDK so that CoinQuest stays out of PCI scope. If it ever stores card data, it needs a QSA audit. |
| **GDPR / CCPA / India DPDP Act** | In code / needs legal | **Built:** <ul><li>Data export ("Download my data").</li><li>Account erasure. Payment, KYC-hash and audit records are kept for 5 years, as PMLA requires, and the export says so.</li><li>Recorded consent to the Terms (version + time).</li><li>Marketing notifications are off by default.</li><li>KYC has its own consent step.</li></ul>**Missing:** a privacy policy and Terms written by counsel, a named Data Protection Officer or grievance officer, a DPA with each processor, a cookie banner on the web build, and a breach-notification runbook. |
| **MFA** | In code | **Built:** OTP (possession of the phone) plus an app PIN (knowledge). Details: <ul><li>PINs are hashed with PBKDF2-SHA256 (210k rounds). Weak PINs are rejected on the client and the server. Five wrong attempts lock the PIN for 15 minutes.</li><li>Payments of ₹2,000 or more need a fresh PIN confirmation, and that confirmation only works in the current session.</li><li>A PIN reset needs the OTP plus the PAN, and then blocks large payments for 24 hours.</li></ul> |
| **Biometric login** | In code (native) | **Built:** Face ID or fingerprint unlocks the app through `expo-local-authentication`, with the PIN as fallback. The biometric is checked once before the feature can be turned on. Biometrics never leave the device. Biometric unlock is not available on web. |
| **Session timeouts** | In code | **Built:** sessions are stored on the server. They end after 15 minutes idle (`IDLE_TIMEOUT_MINUTES`) and after 30 days at most. The app locks after 1 minute in the background and on every cold start. **Security** lists every device signed in, with "sign out" for one device or all others. Logout revokes the session on the server. |
| **TLS 1.3 in transit** | Needs infrastructure | **Built:** `deploy/nginx.conf` allows only `TLSv1.3` and sets HSTS. With `REQUIRE_HTTPS` (the default whenever `DEMO_MODE` is off), the API refuses plain HTTP with a 403. **Missing:** deploy behind that proxy (or a load balancer with a TLS 1.3-only policy) and issue certificates. |
| **AES-256 at rest** | In code + needs infrastructure | **Built:** PAN and date of birth are encrypted field-by-field with AES-256-GCM. Lookups use an HMAC blind index (`services/crypto.py`). The API won't start without `FIELD_ENCRYPTION_KEY` in production. **Missing:** turn on storage encryption for the database (MongoDB Atlas does this by default; self-hosted needs encrypted volumes) and for backups, and keep the key in a KMS or secret manager, not in `.env`. |

## UX / UI

| Guideline | Status | Notes |
|---|---|---|
| Frictionless workflows | In code | **Built:** <ul><li>Swipe to pay, QR deep links with the amount pre-filled, and recent payees.</li><li>The PIN is asked for only when it matters: cold start, ₹2,000 or more, or a new device.</li><li>A duplicate payment needs one confirmation instead of being blocked.</li></ul> |
| Trust-building visuals | In code | **Built:** <ul><li>A calm navy and green palette (`src/ui/theme.ts`), with gold kept for rewards.</li><li>Amounts use tabular figures and Indian grouping (₹1,00,000). Large values are compacted (₹1L, ₹3.2K) where space is tight, so long values never wrap or overflow.</li></ul> |
| Transparent transaction status | In code | **Built:** <ul><li>Payments are `pending`, `success`, `failed` or `on_hold`, each with its own receipt colour, icon and plain-language explanation. For example, a failed payment says "no money left your account; if it did, it's reversed within 48 hours".</li><li>A pending receipt polls until the payment settles.</li><li>Status pills appear in payment history.</li><li>Receipts appear instantly and can be shared.</li></ul> |
| Error explanations | In code | **Built:** every API error has a human-readable `detail` that the app shows as-is. Examples: "UPI is temporarily unavailable at the bank. You haven't been charged.", "Wrong PIN. 4 attempts left.", and "You paid ₹300 to … a moment ago." |
| Accessibility | In code (partial) | **Built:** <ul><li>Labels on all icon buttons and keypads.</li><li>`accessibilityRole` and `accessibilityState` on toggles and checkboxes.</li><li>The offline banner uses a live region.</li><li>Text follows the system font scale.</li></ul>**Missing:** a full audit with TalkBack and VoiceOver, plus contrast measurements for every token. |
| Personalisation | In code | **Built:** <ul><li>Notification preferences per kind. Security alerts are always on and marketing alerts are off by default.</li><li>Light, dark or system theme.</li><li>Custom spending categories, with "apply to every payment to this merchant".</li></ul> |

## Core architecture

| Guideline | Status | Notes |
|---|---|---|
| Payment gateways / UPI rail | In code (sandbox) / needs business | **Built:** <ul><li>A rail adapter interface (`services/payments.py`).</li><li>`SandboxUpiRail` simulates success, pending, failed, timeout and outage. Test payees: `pending@coinquest`, `fail@coinquest`, `timeout@coinquest`, `outage@coinquest`.</li><li>Signed webhooks for status updates and incoming money.</li></ul>**Missing:** a PSP bank partnership (NPCI's TPAP model) and that bank's UPI SDK in place of the sandbox. |
| Modular, cloud-scalable backend | In code + needs infrastructure | **Built:** <ul><li>FastAPI with one router per domain and services for cross-cutting concerns.</li><li>The API is stateless: sessions, rate limits, idempotency keys and webhook dedupe all live in MongoDB, so any number of instances can run behind a load balancer.</li><li>Dockerfile (non-root user, healthcheck) and `deploy/docker-compose.yml`.</li></ul>**Missing:** managed MongoDB (replica set), autoscaling, and a scheduled job that calls `POST /api/admin/payments/reconcile` every minute. |
| Immutable, detailed audit logs | In code + needs infrastructure | **Built:** <ul><li>An append-only, SHA-256 hash-chained log covering every state-changing API call plus named security events: logins, failed OTPs and PINs, PIN changes, payments and their outcomes, KYC, exports, erasure and consent changes.</li><li>`GET /api/admin/audit/verify` detects any edited, deleted or reordered entry.</li></ul>**Missing:** ship the log to WORM storage (e.g. S3 Object Lock) so that even a database admin can't rewrite it. |

## Reliability

| Guideline | Status | Notes |
|---|---|---|
| Failed network | In code | **Built:** <ul><li>An offline banner, and payments refuse to start while offline.</li><li>If a payment request times out, the app asks the server about that `Idempotency-Key` before showing anything, so the user never sees a false "failed" for a payment that went through.</li></ul> |
| Duplicate requests | In code | **Built:** <ul><li>An `Idempotency-Key` on every payment: a retry with the same key replays the original response and never charges twice.</li><li>A separate check for "same payee, same amount within 90 seconds" asks the user to confirm.</li><li>Settlement happens exactly once (an atomic `pending → final` update).</li></ul> |
| Delayed / duplicate webhooks | In code | **Built:** webhooks are HMAC-signed with a 5-minute timestamp window and deduplicated by `event_id`. A webhook that arrives after reconciliation has already settled the payment is a no-op. Stuck `pending` payments are settled by a status enquiry, both on a schedule and when the user opens the receipt. |
| Third-party outages | In code | **Built:** <ul><li>A circuit breaker around the rail: after repeated failures it fails fast for 30 seconds.</li><li>A rail outage fails the payment cleanly with "you haven't been charged".</li><li>A rail timeout leaves the payment pending, which is then reconciled.</li></ul> |
| Real-time alerts | In code + needs infrastructure | **Built:** <ul><li>An in-app notification for every debit, credit, failed or held payment, sign-in on a new device, PIN change, PIN lock and PIN reset.</li><li>Expo push is sent when `PUSH_ENABLED=true`, and the app registers its push token after sign-in.</li><li>Security alerts can't be turned off.</li></ul>**Missing:** production push credentials (APNs/FCM through EAS), and SMS fallback for debit alerts, which RBI expects for bank-linked debits. |

## Production checklist

The required settings:
- `DEMO_MODE=false`
- A strong `SECRET_KEY`
- `FIELD_ENCRYPTION_KEY`, from a KMS
- `WEBHOOK_SECRET`, shared with the PSP
- `ADMIN_API_KEY`, which should sit behind a VPN or IP allowlist
- `REQUIRE_HTTPS=true`
- `PUSH_ENABLED=true`
- A real SMS provider for OTPs

Beyond those settings:
1. Deploy with `deploy/` (nginx TLS 1.3) or an equivalent TLS 1.3-only load balancer.
2. Replace the sandbox KYC provider and UPI rail with licensed partners.
3. Schedule reconciliation every minute, and export the audit log to WORM storage.
4. Engage counsel for the Terms and Privacy Policy, register with FIU-IND, and appoint the grievance officer and DPO.
5. Commission an independent penetration test and a VAPT (vulnerability assessment and penetration test) before launch, and repeat them yearly.
