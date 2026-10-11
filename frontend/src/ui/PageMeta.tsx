import { useEffect } from 'react';
import { Platform } from 'react-native';
import { usePathname } from 'expo-router';

const BRAND = 'CoinQuest';
const DEFAULT_DESC = 'Pay with UPI, track spending and bills, plan your way out of debt and build savings goals, with rewards for good money habits.';

// Title and description for each web page. Unlisted paths fall back to the brand and default description.
const PAGES: [RegExp, string, string?][] = [
  [/^\/(login)?$/, 'Pay, save and level up', DEFAULT_DESC],
  [/^\/verify$/, 'Enter your code'],
  [/^\/pin$/, 'Your app PIN'],
  [/^\/$|^\/\(tabs\)$/, 'Home'],
  [/^\/money$/, 'Money'],
  [/^\/rewards$/, 'Rewards'],
  [/^\/me$/, 'Me'],
  [/^\/pay$/, 'Pay'],
  [/^\/pay\/amount$/, 'Enter amount'],
  [/^\/pay\/success$/, 'Payment receipt'],
  [/^\/scan$/, 'Scan a QR code'],
  [/^\/activity$/, 'Activity'],
  [/^\/expenses$/, 'Spending'],
  [/^\/bills$/, 'Bills'],
  [/^\/debts$/, 'Debts'],
  [/^\/goals$/, 'Goals'],
  [/^\/credit-score$/, 'Credit score'],
  [/^\/digital-loans$/, 'Loans', 'Indicative rates for loans against mutual funds, shares and FDs, with every cost shown before you apply.'],
  [/^\/my-wallet$/, 'Accounts'],
  [/^\/account-aggregator$/, 'Link bank accounts'],
  [/^\/learn$/, 'Learn', 'Two-minute lessons on budgeting, debt, credit scores and investing.'],
  [/^\/help$/, 'Help and support', 'Answers to common questions and how to contact CoinQuest support.'],
  [/^\/security$/, 'Security and privacy'],
  [/^\/kyc$/, 'Verify your identity'],
  [/^\/notifications$/, 'Notifications'],
  [/^\/notification-settings$/, 'Notification settings'],
  [/^\/appearance$/, 'Appearance'],
  [/^\/edit-profile$/, 'Profile'],
  [/^\/legal\/privacy$/, 'Privacy Policy', 'What CoinQuest collects, why, who it is shared with, how long it is kept, and your rights.'],
  [/^\/legal\/terms$/, 'Terms of Service', 'The agreement between you and CoinQuest.'],
  [/^\/legal\/refunds$/, 'Refund Policy', 'What happens when a CoinQuest payment fails, is duplicated or needs a refund.'],
  [/^\/legal\/cookies$/, 'Cookie Policy', 'What the CoinQuest website stores in your browser, and why.'],
  [/^\/legal\/licenses$/, 'Licences', 'Open-source software, fonts and icons used in CoinQuest.'],
  [/^\/delete-account$/, 'Delete my data', 'Delete your CoinQuest account and personal data, even if you can’t sign in.'],
];

function setMeta(name: string, content: string, attr: 'name' | 'property' = 'name') {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, name);
    document.head.appendChild(tag);
  }
  tag.content = content;
}

/** Web only: keeps the tab title and meta description in step with the current page. */
export function PageMeta() {
  const path = usePathname();
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const match = PAGES.find(([re]) => re.test(path));
    const title = match ? `${match[1]} · ${BRAND}` : BRAND;
    const desc = match?.[2] ?? DEFAULT_DESC;
    document.title = title;
    setMeta('description', desc);
    setMeta('og:title', title, 'property');
    setMeta('og:description', desc, 'property');
  }, [path]);
  return null;
}
