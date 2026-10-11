import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { errorMessage, submitSupportRequest } from '../src/services/api';
import { useAuth } from '../src/context/AuthContext';
import { Alert } from '../src/ui/dialog';
import { BUSINESS, isTodo, mailLink, telLink } from '../src/config/business';
import { Body, Button, Card, Divider, Field, IconMark, Row, Screen, Section, Small, Strong } from '../src/ui/kit';
import { LegalFooter } from '../src/ui/LegalFooter';
import { C, themed } from '../src/ui/theme';

const FAQS: [string, string][] = [
  ['A payment failed but money left my account', 'Your bank reverses it automatically, by the next working day under RBI rules; if it’s late, the bank owes you ₹100 a day. Still missing after 2 working days? Message us below with the UPI reference. See the Refund Policy for details.'],
  ['How do coins work?', 'You earn 1 coin for every ₹50 sent on UPI and 1 for every ₹100 of bills, plus bonuses for daily quests. Spend them in Rewards. In the store, 10 coins = ₹1 in vouchers. Coins have no cash value.'],
  ['Is my data safe?', 'Bank data reaches us only through an RBI-licensed Account Aggregator, with your consent: read-only, and you can stop sharing at any time. We never see or store your UPI PIN. See the Privacy Policy for details.'],
  ['What is a streak?', 'Open the app and check in once a day to keep it going. Miss a day and it starts again from 1.'],
  ['Avalanche or snowball?', 'Avalanche (highest interest first) costs the least. Snowball (smallest first) feels faster. The Debts screen shows both, in rupees, for your loans.'],
  ['How do I delete my account?', 'Me → Security & privacy → Delete account. Your personal data is deleted straight away. Payment and KYC records are kept for 5 years because anti-money-laundering law requires it. Can’t sign in? Use “Delete my data” at the bottom of this page.'],
];

/** A business detail, or a visible marker if it hasn't been filled in yet. */
const shown = (value: string) => (isTodo(value) ? `[${value.replace(/^TODO:\s*/, '')}]` : value);

export default function Help() {
  const { user } = useAuth();
  const [open, setOpen] = useState<number | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!user?.id || !subject.trim() || !message.trim()) return;
    setBusy(true);
    try {
      const res = await submitSupportRequest(user.id, subject.trim(), message.trim());
      setSubject('');
      setMessage('');
      Alert.alert('Got it', `Ticket ${res.ticket_id.slice(0, 8).toUpperCase()}. We’ll reply here in the app.`);
    } catch (e) {
      Alert.alert("Couldn't send", errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Help">
      <Section title="Common questions" style={{ marginTop: 18 }}>
        <Card padded={false}>
          {FAQS.map(([q, a], i) => (
            <Pressable key={q} onPress={() => setOpen(open === i ? null : i)} style={[styles.faq, i > 0 && styles.line]} accessibilityRole="button" accessibilityState={{ expanded: open === i }} aria-expanded={open === i}>
              <View style={styles.row}>
                <Strong style={{ flex: 1 }}>{q}</Strong>
                <Feather name={open === i ? 'minus' : 'plus'} size={18} color={C.ink3} />
              </View>
              {open === i && <Body style={{ marginTop: 8, fontSize: 14 }}>{a}</Body>}
            </Pressable>
          ))}
        </Card>
      </Section>

      <Section title="Write to us">
        <Card>
          <Field label="What's it about?" placeholder="Payment didn't go through" value={subject} onChangeText={setSubject} maxLength={80} />
          <Field label="Details" placeholder="Include the UPI reference if it's about a payment" value={message} onChangeText={setMessage} multiline style={{ minHeight: 96, textAlignVertical: 'top' }} />
          <Button label="Send" disabled={!subject.trim() || !message.trim()} loading={busy} onPress={send} />
        </Card>
      </Section>

      <Section title="Contact">
        <Card padded={false} style={{ paddingHorizontal: 16 }}>
          <Row
            left={<IconMark icon="mail" tint="mail" />}
            title={shown(BUSINESS.supportEmail)}
            subtitle="Email support"
            onPress={isTodo(BUSINESS.supportEmail) ? undefined : () => Linking.openURL(mailLink(BUSINESS.supportEmail, 'CoinQuest support'))}
            role="link"
            chevron={!isTodo(BUSINESS.supportEmail)}
          />
          <Divider inset={54} />
          <Row
            left={<IconMark icon="phone" tint="phone" />}
            title={shown(BUSINESS.supportPhone)}
            subtitle={shown(BUSINESS.supportHours)}
            onPress={isTodo(BUSINESS.supportPhone) ? undefined : () => Linking.openURL(telLink(BUSINESS.supportPhone))}
            role="link"
            chevron={!isTodo(BUSINESS.supportPhone)}
          />
          <Divider inset={54} />
          <Row
            left={<IconMark icon="flag" tint="grievance" />}
            title="Grievance Officer"
            subtitle={`${shown(BUSINESS.grievanceOfficer)} · ${shown(BUSINESS.grievanceEmail)}`}
            subtitleLines={2}
            onPress={isTodo(BUSINESS.grievanceEmail) ? undefined : () => Linking.openURL(mailLink(BUSINESS.grievanceEmail, 'Grievance'))}
            role="link"
            chevron={!isTodo(BUSINESS.grievanceEmail)}
          />
        </Card>
        <Small style={{ marginTop: 10 }}>
          Not resolved within 30 days? You can complain to the RBI Integrated Ombudsman at cms.rbi.org.in, or about personal data to the Data Protection Board of India.
        </Small>
      </Section>

      <LegalFooter />
    </Screen>
  );
}

const styles = themed(() => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  faq: { padding: 16 },
  line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
}));
