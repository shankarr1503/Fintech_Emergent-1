import React, { useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, View, useWindowDimensions } from 'react-native';
import { getAllAccounts } from '../src/services/api';
import { useUserData } from '../src/game/useData';
import { SpriteName } from '../src/game/sprites';
import { BORDER, C } from '../src/game/theme';
import { Body, Box, Loading, NATIVE_DRIVER, PixelButton, PText, Screen, SectionTitle, Sprite, Stat, tap } from '../src/game/ui';
import { formatCompact, formatCurrency } from '../src/utils/format';

type Cart = { id: string; group: string; title: string; subtitle: string; value: number; color: string; sprite: SpriteName; details: [string, string][] };

function toCartridges(d: any): Cart[] {
  const out: Cart[] = [];
  for (const a of d.bank_accounts ?? [])
    out.push({
      id: a.id, group: 'BANK', title: a.bank, subtitle: `${a.type} • ${a.account_number}`, value: a.balance, color: a.card_color, sprite: 'bank',
      details: [['Interest', `${a.interest_rate}%`], ['IFSC', a.ifsc], ['Salary a/c', a.is_salary_account ? 'Yes' : 'No']],
    });
  for (const a of d.fixed_deposits ?? [])
    out.push({
      id: a.id, group: 'FD', title: `${a.bank} ${a.type}`, subtitle: a.fd_number, value: a.current_value, color: a.card_color, sprite: 'chest',
      details: [['Rate', `${a.interest_rate}%`], ['Matures', a.maturity_date], ['At maturity', formatCompact(a.maturity_amount)]],
    });
  for (const a of d.recurring_deposits ?? [])
    out.push({
      id: a.id, group: 'RD', title: `${a.bank} RD`, subtitle: `${formatCurrency(a.monthly_amount)}/mo`, value: a.current_value, color: a.card_color, sprite: 'piggy',
      details: [['Rate', `${a.interest_rate}%`], ['Paid', `${a.installments_paid}/${a.installments_paid + a.remaining_installments}`], ['Matures', a.maturity_date]],
    });
  for (const a of d.post_office_accounts ?? [])
    out.push({
      id: a.id, group: 'POST', title: a.type, subtitle: a.account_number ?? a.certificate_number, value: a.balance ?? a.current_value, color: a.card_color, sprite: 'scroll',
      details: [['Rate', `${a.interest_rate}%`], a.maturity_date ? ['Matures', a.maturity_date] : ['Branch', a.branch ?? '-']],
    });
  if (d.ppf_account) {
    const p = d.ppf_account;
    out.push({
      id: p.id, group: 'PPF', title: `${p.bank} PPF`, subtitle: p.account_number, value: p.balance, color: p.card_color, sprite: 'shield',
      details: [['Rate', `${p.interest_rate}%`], ['This year', `${formatCompact(p.this_year_deposit)}/${formatCompact(p.max_yearly_deposit)}`], ['Matures', String(p.maturity_year)]],
    });
  }
  if (d.nps_account) {
    const n = d.nps_account;
    out.push({
      id: n.id, group: 'NPS', title: 'NPS Pension', subtitle: n.fund_manager, value: n.total_corpus, color: n.card_color, sprite: 'gem',
      details: [['Equity', `${n.equity_allocation}%`], ['Returns YTD', `${n.returns_ytd}%`], ['PRAN', n.pran_number]],
    });
  }
  return out;
}

function Cartridge({ cart, index }: { cart: Cart; index: number }) {
  return (
    <View style={[styles.cart, { backgroundColor: cart.color || C.blue }]}>
      <View style={styles.cartNotch} />
      <View style={styles.label}>
        <View style={styles.between}>
          <PText size={7} color={C.textMuted}>
            {cart.group} • #{index + 1}
          </PText>
          <Sprite name={cart.sprite} scale={2} />
        </View>
        <PText size={11} style={{ marginTop: 8 }} numberOfLines={1}>
          {cart.title.toUpperCase()}
        </PText>
        <Body size={12} numberOfLines={1} style={{ marginTop: 4 }}>
          {cart.subtitle}
        </Body>
        <PText size={18} color={C.pipeDark} style={{ marginTop: 12 }}>
          {formatCurrency(cart.value)}
        </PText>
      </View>
      <View style={styles.cartDetails}>
        {cart.details.map(([k, v]) => (
          <View key={k} style={{ flex: 1 }}>
            <PText size={6} color={C.white}>
              {k.toUpperCase()}
            </PText>
            <PText size={8} color={C.white} style={{ marginTop: 4 }} numberOfLines={1}>
              {v}
            </PText>
          </View>
        ))}
      </View>
      <View style={styles.pins}>
        {Array.from({ length: 10 }).map((_, i) => (
          <View key={i} style={styles.pin} />
        ))}
      </View>
    </View>
  );
}

/** Swipe the top cartridge away; it goes to the back of the stack. */
function SwipeStack({ carts }: { carts: Cart[] }) {
  const { width } = useWindowDimensions();
  const [top, setTop] = useState(0);
  const pan = useRef(new Animated.ValueXY()).current;
  const count = carts.length;

  const advance = (dir: number) => {
    tap();
    Animated.timing(pan, { toValue: { x: dir * width * 1.2, y: 0 }, duration: 220, useNativeDriver: NATIVE_DRIVER }).start(() => {
      pan.setValue({ x: 0, y: 0 });
      setTop((t) => (t + 1) % count);
    });
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
        onPanResponderRelease: (_, g) => {
          if (Math.abs(g.dx) > 100 || Math.abs(g.vx) > 0.8) advance(g.dx > 0 ? 1 : -1);
          else Animated.spring(pan, { toValue: { x: 0, y: 0 }, friction: 5, useNativeDriver: NATIVE_DRIVER }).start();
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [count, width],
  );

  const rotate = pan.x.interpolate({ inputRange: [-200, 0, 200], outputRange: ['-12deg', '0deg', '12deg'] });
  const visible = [2, 1, 0].filter((o) => o < count);

  return (
    <View>
      <View style={styles.stack}>
        {visible.map((offset) => {
          const idx = (top + offset) % count;
          const isTop = offset === 0;
          const style = isTop
            ? { transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }] }
            : { transform: [{ translateY: offset * 14 }, { scale: 1 - offset * 0.05 }] };
          return (
            <Animated.View key={carts[idx].id} style={[StyleSheet.absoluteFill, style, { zIndex: 10 - offset }]} {...(isTop ? responder.panHandlers : {})}>
              <Cartridge cart={carts[idx]} index={idx} />
            </Animated.View>
          );
        })}
      </View>
      <View style={[styles.between, { marginTop: 40 }]}>
        <PixelButton label="<" small color={C.paper} textColor={C.ink} onPress={() => advance(-1)} />
        <PText size={8} color={C.white} shadow={C.ink}>
          {top + 1} / {count} • SWIPE
        </PText>
        <PixelButton label=">" small color={C.paper} textColor={C.ink} onPress={() => advance(1)} />
      </View>
    </View>
  );
}

export default function InventoryScreen() {
  const { data, loading, refreshing, refresh } = useUserData((id) => getAllAccounts(id));
  const carts = useMemo(() => (data ? toCartridges(data) : []), [data]);

  if (loading || !data) return <Loading label="OPENING INVENTORY" />;
  const s = data.summary;
  const groups = Array.from(new Set(carts.map((c) => c.group)));

  return (
    <Screen title="INVENTORY" subtitle={`${carts.length} ACCOUNTS COLLECTED`} refreshing={refreshing} onRefresh={refresh}>
      <Box>
        <PText size={8} color={C.textMuted}>
          TOTAL LOOT
        </PText>
        <PText size={20} style={{ marginTop: 8 }}>
          {formatCurrency(s.total_balance + s.total_deposits)}
        </PText>
        <View style={[styles.between, { marginTop: 12 }]}>
          <Stat label="Cash" value={formatCompact(s.total_balance)} />
          <Stat label="Deposits" value={formatCompact(s.total_deposits)} align="center" />
          <Stat label="Invested" value={formatCompact(s.total_investments)} align="right" />
        </View>
      </Box>

      <SectionTitle>CARTRIDGES</SectionTitle>
      {carts.length > 0 && <SwipeStack carts={carts} />}

      <SectionTitle>BY TYPE</SectionTitle>
      <Box padding={12}>
        {groups.map((g) => {
          const items = carts.filter((c) => c.group === g);
          const sum = items.reduce((a, c) => a + (c.value || 0), 0);
          return (
            <View key={g} style={[styles.between, styles.groupRow]}>
              <View style={styles.row}>
                <Sprite name={items[0].sprite} scale={2} />
                <PText size={8} style={{ marginLeft: 10 }}>
                  {g} ×{items.length}
                </PText>
              </View>
              <PText size={9}>{formatCompact(sum)}</PText>
            </View>
          );
        })}
      </Box>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stack: { height: 250 },
  cart: { flex: 1, borderWidth: BORDER, borderColor: C.ink, padding: 14, paddingTop: 22 },
  cartNotch: { position: 'absolute', top: -BORDER, left: '35%', width: '30%', height: 12, backgroundColor: C.sky, borderWidth: BORDER, borderTopWidth: 0, borderColor: C.ink },
  label: { backgroundColor: C.paper, borderWidth: BORDER, borderColor: C.ink, padding: 12 },
  cartDetails: { flexDirection: 'row', marginTop: 12, gap: 8 },
  pins: { position: 'absolute', bottom: 4, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between' },
  pin: { width: 8, height: 6, backgroundColor: C.coin, borderWidth: 1, borderColor: C.ink },
  groupRow: { paddingVertical: 10, borderBottomWidth: 2, borderColor: C.paperDark },
});
