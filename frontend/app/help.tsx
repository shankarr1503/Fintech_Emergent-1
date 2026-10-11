import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { errorMessage, submitSupportRequest } from '../src/services/api';
import { useAuth } from '../src/context/AuthContext';
import { Alert } from '../src/ui/dialog';
import { Body, Button, Card, Field, Row, Screen, Section, Strong, IconMark } from '../src/ui/kit';
import { C, themed } from '../src/ui/theme';

const FAQS: [string, string][] = [
  ['A payment failed but money left my account', 'It comes back on its own, usually within 48 hours, sometimes up to 5 working days. That is how UPI reversals work. If it doesn\'t, message us below with the UPI reference.'],
  ['How do coins work?', 'You earn 1 coin for every ₹50 sent on UPI and 1 for every ₹100 of bills, plus bonuses for daily quests. Spend them in Rewards. 1 coin is worth ₹0.25.'],
  ['Is my data safe?', 'Bank data reaches us through the RBI\'s Account Aggregator network: read-only, and you can stop sharing at any time. We never see or store your UPI PIN.'],
  ['What is a streak?', 'Open the app and check in once a day to keep it going. Miss a day and it starts again from 1.'],
  ['Avalanche or snowball?', 'Avalanche (highest interest first) costs the least. Snowball (smallest first) feels faster. The Debts screen shows both, in rupees, for your loans.'],
  ['How do I delete my account?', 'Me → Security & privacy → Delete account. Everything is removed permanently.'],
];

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
      Alert.alert('Got it', `Ticket ${res.ticket_id.slice(0, 8).toUpperCase()}. A person will reply within a day.`);
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
            <Pressable key={q} onPress={() => setOpen(open === i ? null : i)} style={[styles.faq, i > 0 && styles.line]} accessibilityRole="button" accessibilityState={{ expanded: open === i }}>
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

      <Card padded={false} style={{ marginTop: 16, paddingHorizontal: 16 }}>
        <Row left={<IconMark icon="mail" tint="mail" />} title="support@coinquest.app" subtitle="Replies within a day" onPress={() => Linking.openURL('mailto:support@coinquest.app')} chevron />
      </Card>
    </Screen>
  );
}

const styles = themed(() => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  faq: { padding: 16 },
  line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
}));
