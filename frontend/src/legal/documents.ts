// The legal documents shown in the app and on the web at /legal/<id>.
// {placeholders} are filled from src/config/business.json.
// When the Terms or Privacy Policy change, bump UPDATED and TERMS_VERSION (app + backend)
// so every user accepts the new version at their next sign-in.

export const UPDATED = '11 October 2026';

export type Block = string | { bullets: string[] };
export type Section = { heading: string; body: Block[] };
export type LegalDoc = { id: string; title: string; summary: string; sections: Section[] };

const privacy: LegalDoc = {
  id: 'privacy',
  title: 'Privacy Policy',
  summary: 'What we collect, why, who we share it with, how long we keep it, and your rights.',
  sections: [
    {
      heading: 'Who we are',
      body: [
        '{brand} is operated by {legalName} (CIN {cin}), {address}. We are the "data fiduciary" for your personal data under India’s Digital Personal Data Protection Act, 2023 ("DPDP Act").',
        'Questions or complaints: write to our Grievance Officer, {grievanceOfficer}, at {grievanceEmail}. We reply within 7 days and resolve complaints within 30 days.',
      ],
    },
    {
      heading: 'What we collect',
      body: [
        'Only what we need to run the app:',
        {
          bullets: [
            'Your mobile number, to sign you in with a one-time code. Until you verify the code and accept these terms, we keep only a hashed copy of the code for 5 minutes.',
            'Your name, if you choose to add it, to greet you in the app.',
            'Your app PIN, stored only as a salted hash. We can never see it.',
            'Payments you make and receive through CoinQuest: amount, payee UPI ID, note, status and bank reference.',
            'If you verify your identity (KYC): your PAN, name and date of birth. The PAN and date of birth are encrypted (AES-256), and only the masked PAN (e.g. XXXXX1234F) is ever shown.',
            'If you link bank accounts through an RBI-licensed Account Aggregator: the account data you consent to share, for the period you choose.',
            'Bills, debts, goals and categories you add, and your rewards progress.',
            'Device and security data: a random device ID, the device name, IP address and sign-in times. We use these to show you where you’re signed in, to alert you about new devices and to prevent fraud.',
            'A push notification token, if you allow notifications.',
            'Messages you send to support. Card numbers in them are masked before they are stored.',
          ],
        },
        'We don’t collect your contacts, location, photos, Aadhaar number, UPI PIN or card details. The camera is used only to scan QR codes; images are not saved or uploaded.',
      ],
    },
    {
      heading: 'Why we use it',
      body: [
        {
          bullets: [
            'To provide the service you asked for: payments, bills, budgets, goals and rewards (with your consent, DPDP Act s.6).',
            'To meet legal duties: KYC and anti-money-laundering checks, and keeping records under the Prevention of Money Laundering Act, 2002 (DPDP Act s.7).',
            'To keep your account safe: sign-in checks, new-device alerts, fraud and abuse prevention.',
            'To send you notifications you’ve chosen. Offers and product news are off unless you turn them on.',
          ],
        },
        'We don’t sell your data, show you third-party ads, or use your data to train AI models.',
      ],
    },
    {
      heading: 'Who we share it with',
      body: [
        'Only service providers who process data on our behalf under contract, and only what each one needs:',
        {
          bullets: [
            'Our partner bank and UPI service provider: to make and receive payments.',
            'A KYC agency: your PAN, name and date of birth, to verify your identity.',
            'An Account Aggregator: only when you approve a consent request, for the accounts and period you choose.',
            'An SMS provider: your mobile number and the one-time code.',
            'Expo (push notifications): your push token and the notification text.',
            'Our cloud hosting provider: stores the encrypted database.',
            'If AI insights are switched on: OpenAI receives merchant names and category totals (never your name, number or account details) to suggest categories and tips. This may be processed outside India.',
          ],
        },
        'We disclose data to authorities only when the law requires it, for example to the Financial Intelligence Unit (FIU-IND) or under a court order.',
      ],
    },
    {
      heading: 'How long we keep it',
      body: [
        {
          bullets: [
            'One-time codes: 5 minutes.',
            'Sign-in sessions: until you sign out, after 15 minutes of inactivity, or 30 days at most.',
            'Your account data: until you delete your account.',
            'Payment records, KYC records and the security audit log: 5 years after your account closes, because the Prevention of Money Laundering Act requires it. During that time they are kept restricted and used for nothing else.',
          ],
        },
      ],
    },
    {
      heading: 'Your rights',
      body: [
        'Under the DPDP Act (and GDPR or CCPA, if they apply to you) you can:',
        {
          bullets: [
            'Get a copy of your data: Me → Security & privacy → Download my data.',
            'Correct it: Me → Profile.',
            'Delete your account: Me → Security & privacy → Delete account. If you can’t sign in, use the deletion request page at /delete-account.',
            'Withdraw consent, for example to notifications or a bank link, at any time in the app. This doesn’t affect anything done before you withdrew it.',
            'Nominate someone to exercise these rights if you die or become unable to, by writing to our Grievance Officer.',
            'Complain to us, and if you’re not satisfied, to the Data Protection Board of India.',
          ],
        },
      ],
    },
    {
      heading: 'Age',
      body: ['CoinQuest is only for people aged 18 or over. We ask you to confirm your age when you sign up and don’t knowingly collect data from anyone younger. If you believe a child has signed up, contact {grievanceEmail} and we will delete the account.'],
    },
    {
      heading: 'Security',
      body: [
        'Data is encrypted in transit (TLS 1.3) and sensitive fields are encrypted at rest (AES-256). Access to your account needs both a one-time code and your PIN. Every sign-in and change is recorded in a tamper-evident audit log. No system is perfectly secure; if a breach affects you, we will tell you and the Data Protection Board as the law requires.',
      ],
    },
    {
      heading: 'Cookies and browser storage',
      body: ['See our Cookie Policy. In short: we only store what the web app needs to work, and nothing that tracks you.'],
    },
    {
      heading: 'Changes',
      body: ['If we change this policy in a way that matters, we will ask you to review and accept it at your next sign-in. This version was last updated on {updated}.'],
    },
  ],
};

const terms: LegalDoc = {
  id: 'terms',
  title: 'Terms of Service',
  summary: 'The agreement between you and {legalName} for using {brand}.',
  sections: [
    {
      heading: 'About these terms',
      body: [
        'These terms are an agreement between you and {legalName} ("we", "us"), {address}. By creating an account you confirm that you have read them, together with our Privacy Policy, and that you are 18 or older.',
      ],
    },
    {
      heading: 'What CoinQuest is',
      body: [
        '{brand} is an app for making UPI payments, tracking spending, bills and debts, setting savings goals and earning in-app rewards. We are not a bank. Payments are processed by our partner bank and the UPI network run by NPCI; money stays in your own bank account until you pay.',
        'Credit scores, loan offers and bill payments come from licensed partners, whose own terms apply to those services and are shown before you agree to anything.',
      ],
    },
    {
      heading: 'Your account',
      body: [
        {
          bullets: [
            'You must be 18 or older, an Indian resident, and use a mobile number registered in your own name.',
            'Keep your PIN and one-time codes private. We will never ask for them, or for your UPI PIN, by phone, email or chat.',
            'Tell us straight away at {supportEmail} if you think someone else has used your account. You can also sign out every other device from Security.',
            'Higher payment limits need identity verification (KYC), as RBI rules require.',
          ],
        },
      ],
    },
    {
      heading: 'Payments',
      body: [
        {
          bullets: [
            'Check the payee name and amount before you swipe to pay. A completed UPI payment can’t be reversed by us; if you paid the wrong person, contact support and we will raise it with the banks, but recovery isn’t guaranteed.',
            'We may hold a payment for review, or decline it, if our checks suggest fraud or money laundering, or if it exceeds your limits. We will tell you when this happens.',
            'If money leaves your account but the payment fails, your bank reverses it. See our Refund Policy for timelines.',
            'CoinQuest doesn’t charge you a fee to send or receive UPI payments. If a feature ever has a fee, we will show the full amount before you confirm, and you can cancel.',
          ],
        },
      ],
    },
    {
      heading: 'Coins and rewards',
      body: [
        'Coins, XP, streaks and badges are rewards inside the app. They have no cash value, can’t be transferred or sold, and can be redeemed only for the rewards shown in the app. We may change the reward programme with 30 days’ notice in the app; coins you’ve already earned stay redeemable for at least that long.',
      ],
    },
    {
      heading: 'Information, not advice',
      body: [
        'Insights, tips, debt plans and lessons are general information to help you understand your money. They aren’t investment, tax or legal advice. Estimates such as a debt-free date depend on what you enter and may differ from your lender’s figures.',
      ],
    },
    {
      heading: 'Acceptable use',
      body: [
        'Don’t use CoinQuest for anything illegal, to receive money from fraud, to impersonate someone else, or to interfere with the service or other users. We may suspend or close accounts that do, and report them where the law requires.',
      ],
    },
    {
      heading: 'Our responsibility',
      body: [
        'We work hard to keep CoinQuest available and accurate, but the service depends on banks, NPCI and other partners, and may sometimes be unavailable. To the extent the law allows, we aren’t liable for indirect losses, or for losses caused by events outside our control. Nothing in these terms limits rights you have under consumer protection law or RBI rules.',
      ],
    },
    {
      heading: 'Closing your account',
      body: ['You can delete your account at any time from Me → Security & privacy → Delete account. We may close an account with notice if these terms are broken, or immediately where the law requires.'],
    },
    {
      heading: 'Complaints',
      body: [
        'Contact support at {supportEmail} or {supportPhone} ({supportHours}). If you aren’t satisfied within 30 days, write to our Grievance Officer, {grievanceOfficer}, at {grievanceEmail}. For payment complaints you may also approach the RBI Integrated Ombudsman (cms.rbi.org.in).',
      ],
    },
    {
      heading: 'Law',
      body: ['These terms are governed by the laws of India. The courts of {jurisdictionCity} have jurisdiction. Last updated on {updated}.'],
    },
  ],
};

const refunds: LegalDoc = {
  id: 'refunds',
  title: 'Refund Policy',
  summary: 'What happens when a payment fails, is duplicated, or needs a refund.',
  sections: [
    {
      heading: 'We don’t charge fees',
      body: ['CoinQuest doesn’t charge you to send or receive UPI payments, pay bills, or use the app. If that ever changes, the fee will be shown before you confirm and refunded in full if the service isn’t delivered.'],
    },
    {
      heading: 'Failed payments',
      body: [
        'If money left your bank account but the payment failed or the payee wasn’t credited, your bank reverses it automatically. Under RBI’s turnaround-time rules for UPI, this should happen by the next working day (T+1). If it takes longer, your bank owes you compensation of ₹100 for each day of delay.',
        'The receipt in the app shows the payment’s status. If a reversal hasn’t arrived after 2 working days, contact support with the UPI reference number and we will chase it with the banks.',
      ],
    },
    {
      heading: 'Pending payments',
      body: ['A pending payment hasn’t finished yet. Please don’t pay again; we check with the bank automatically and notify you when it completes or is reversed.'],
    },
    {
      heading: 'Duplicate payments',
      body: ['The app warns you before you pay the same person the same amount twice in quick succession, and a retry after a network error never charges you twice. If you still paid twice by mistake, ask the payee for a refund; if they don’t respond, contact support and we will raise a dispute through the UPI network.'],
    },
    {
      heading: 'Payments to the wrong person, and merchant refunds',
      body: ['A UPI payment to the wrong person can only be returned with the recipient’s cooperation or through a bank dispute. Contact support as soon as possible. Refunds for goods or services are the merchant’s responsibility, under the merchant’s own policy; once the merchant issues one, it reaches your bank account directly.'],
    },
    {
      heading: 'Bill payments',
      body: ['If a bill payment fails after your account is debited, the amount is reversed under the same rules. If the biller doesn’t credit a successful payment, contact support with the reference and we will raise a complaint through the Bharat Bill Payment System.'],
    },
    {
      heading: 'Coins and rewards',
      body: ['Coins have no cash value and aren’t refundable. If a reward you redeemed isn’t delivered within 7 days, we will deliver it or return the coins.'],
    },
    {
      heading: 'Contact',
      body: ['Support: {supportEmail}, {supportPhone} ({supportHours}). Grievance Officer: {grievanceOfficer}, {grievanceEmail}. Last updated on {updated}.'],
    },
  ],
};

const cookies: LegalDoc = {
  id: 'cookies',
  title: 'Cookie Policy',
  summary: 'What the CoinQuest website stores in your browser, and why.',
  sections: [
    {
      heading: 'The short version',
      body: ['The CoinQuest web app doesn’t use advertising, analytics or tracking cookies, and doesn’t load third-party trackers. It only stores what it needs to work.'],
    },
    {
      heading: 'What we store',
      body: [
        'The web app uses your browser’s local storage rather than cookies:',
        {
          bullets: [
            'Your sign-in token, so you stay signed in. Removed when you sign out.',
            'A random device ID, so you can see and sign out this browser from Security.',
            'Your appearance setting (light, dark or system).',
            'Your choice on the cookie notice, so we don’t ask again.',
          ],
        },
        'These are strictly necessary for the service you asked for, so the law doesn’t require consent for them. We still tell you about them, and you can clear them at any time in your browser settings (you will be signed out).',
      ],
    },
    {
      heading: 'Your choice',
      body: ['The notice lets you accept or refuse any optional storage. Today there is none: both choices behave the same. If we ever add optional cookies (for example, analytics), they will only be used if you accept, and you can change your mind at any time with “Cookie settings” at the bottom of any legal page. Last updated on {updated}.'],
    },
  ],
};

export const DOCUMENTS: Record<string, LegalDoc> = { privacy, terms, refunds, cookies };
