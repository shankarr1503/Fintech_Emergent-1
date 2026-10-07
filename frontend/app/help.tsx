import React, { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { Alert } from '../src/game/dialog';
import { errorMessage, submitSupportRequest } from '../src/services/api';
import { useAuth } from '../src/context/AuthContext';
import { C } from '../src/game/theme';
import { Body, Box, PixelButton, PixelInput, PText, Screen, SectionTitle, Sprite } from '../src/game/ui';

const FAQS = [
  ['How do coins and XP work?', 'Every money move earns rewards: 1 coin per ₹50 sent by UPI, 1 coin per ₹100 of bills, plus XP for saving, learning and paying down debt. Coins buy vouchers in the Item Shop; XP raises your level.'],
  ['Is my financial data secure?', 'Data is encrypted in transit and at rest. Bank data comes through the RBI Account Aggregator framework with read-only, revocable consent. We never store your banking passwords.'],
  ['What is a "boss"?', 'Each debt is a boss. Its HP is the outstanding balance. Log payments with ATTACK to shrink it. Avalanche hits the highest-interest boss first; Snowball the smallest.'],
  ['How do streaks work?', 'Claim the daily bonus on the Home screen once per day. Missing a day resets your streak to 1. Longer streaks pay bigger bonuses.'],
  ['Can I delete my account?', 'Yes. Profile → Security → Delete account permanently removes your data.'],
  ['Where do insights come from?', 'The Sage analyses your last 60 days of spending. With an AI key configured it uses an LLM; otherwise a rules engine.'],
];

export default function HelpScreen() {
  const { user } = useAuth();
  const [open, setOpen] = useState<number | null>(0);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!user?.id || !subject.trim() || !message.trim()) return Alert.alert('Missing info', 'Please fill in both fields.');
    setBusy(true);
    try {
      const res = await submitSupportRequest(user.id, subject.trim(), message.trim());
      setSubject('');
      setMessage('');
      Alert.alert('Message sent!', `Ticket ${res.ticket_id.slice(0, 8).toUpperCase()}. We reply within 24 hours.`);
    } catch (e) {
      Alert.alert('Could not send', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="HELP" subtitle="ASK THE SAGE">
      <Box color={C.ink}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Sprite name="potion" scale={3} />
          <PText size={9} color={C.white} style={{ marginLeft: 12, flex: 1 }}>
            IT&apos;S DANGEROUS TO SPEND ALONE. READ THIS!
          </PText>
        </View>
      </Box>

      <SectionTitle>FAQ</SectionTitle>
      {FAQS.map(([q, a], i) => (
        <Pressable key={q} onPress={() => setOpen(open === i ? null : i)} accessibilityRole="button" accessibilityState={{ expanded: open === i }}>
          <Box style={{ marginBottom: 10 }} padding={12}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <PText size={9} style={{ flex: 1 }}>
                {q.toUpperCase()}
              </PText>
              <PText size={10}>{open === i ? '-' : '+'}</PText>
            </View>
            {open === i && <Body style={{ marginTop: 10 }}>{a}</Body>}
          </Box>
        </Pressable>
      ))}

      <SectionTitle>SEND A MESSAGE</SectionTitle>
      <Box>
        <PixelInput label="Subject" placeholder="Payment stuck" value={subject} onChangeText={setSubject} maxLength={80} />
        <PixelInput label="Message" placeholder="Tell us what happened..." value={message} onChangeText={setMessage} multiline style={{ minHeight: 100, textAlignVertical: 'top' }} />
        <PixelButton label="SEND" sprite="bubble" color={C.blue} loading={busy} onPress={send} />
      </Box>

      <Pressable onPress={() => Linking.openURL('mailto:support@coinquest.app')} style={{ marginTop: 16, alignSelf: 'center' }} accessibilityRole="link">
        <PText size={8} color={C.white} shadow={C.ink}>
          SUPPORT@COINQUEST.APP
        </PText>
      </Pressable>
    </Screen>
  );
}
