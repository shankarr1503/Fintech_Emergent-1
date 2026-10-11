import React from 'react';
import { Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BUSINESS, isTodo, mailLink, telLink } from '../config/business';
import { reopenCookieNotice } from './CookieNotice';
import { C, F, themed } from './theme';

const LINKS: { label: string; href: string }[] = [
  { label: 'Privacy', href: '/legal/privacy' },
  { label: 'Terms', href: '/legal/terms' },
  { label: 'Refunds', href: '/legal/refunds' },
  { label: 'Cookies', href: '/legal/cookies' },
  { label: 'Licences', href: '/legal/licenses' },
  { label: 'Delete my data', href: '/delete-account' },
];

/** Legal links, company details and contact, shown on sign-in, Help, Me and every legal page. */
export function LegalFooter({ dark }: { dark?: boolean }) {
  const router = useRouter();
  const muted = dark ? C.nightMuted : C.ink3;
  const link = [styles.link, { color: dark ? C.nightText : C.ink2 }];

  const contact = (value: string, href: string, label: string) =>
    isTodo(value) ? (
      <Text style={styles.todo}>[{value.replace(/^TODO:\s*/, '')}]</Text>
    ) : (
      <Text style={link} onPress={() => Linking.openURL(href)} accessibilityRole="link" accessibilityLabel={`${label} ${value}`}>
        {value}
      </Text>
    );

  return (
    <View style={styles.wrap} accessibilityRole={Platform.OS === 'web' ? ('contentinfo' as any) : undefined}>
      <View style={styles.links}>
        {LINKS.map((l) => (
          <Text key={l.href} style={link} onPress={() => router.push(l.href as any)} accessibilityRole="link">
            {l.label}
          </Text>
        ))}
        {Platform.OS === 'web' && (
          <Text style={link} onPress={reopenCookieNotice} accessibilityRole="button">
            Cookie settings
          </Text>
        )}
      </View>
      <Text style={[styles.small, { color: muted }]}>
        Support: {contact(BUSINESS.supportEmail, mailLink(BUSINESS.supportEmail, 'CoinQuest support'), 'Email')} ·{' '}
        {contact(BUSINESS.supportPhone, telLink(BUSINESS.supportPhone), 'Call')}
      </Text>
      <Text style={[styles.small, { color: muted }]}>
        © {new Date().getFullYear()} {isTodo(BUSINESS.legalName) ? <Text style={styles.todo}>[{BUSINESS.legalName.replace(/^TODO:\s*/, '')}]</Text> : BUSINESS.legalName}. {BUSINESS.brand} is not a bank; payments are made through UPI and partner banks.
      </Text>
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    wrap: { marginTop: 32, paddingTop: 18, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line, gap: 10 },
    links: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 10 },
    link: { fontFamily: F.medium, fontSize: 13, lineHeight: 20, textDecorationLine: 'underline', minHeight: 24 },
    small: { fontFamily: F.regular, fontSize: 12, lineHeight: 18 },
    todo: { backgroundColor: C.amberSoft, color: C.red, fontFamily: F.semibold },
  }),
);
