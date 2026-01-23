import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { getBills, payBill } from '../src/services/api';
import { formatCurrency } from '../src/utils/format';

const BILL_ICONS: Record<string, string> = {
  rent: 'home',
  utility: 'flash',
  recharge: 'phone-portrait',
  insurance: 'shield-checkmark',
  subscription: 'play-circle',
};

const BILL_COLORS: Record<string, string> = {
  rent: '#8B5CF6',
  utility: '#F59E0B',
  recharge: '#3B82F6',
  insurance: '#10B981',
  subscription: '#EC4899',
};

export default function BillsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [bills, setBills] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    if (!user?.id) return;
    try {
      const data = await getBills(user.id);
      setBills(data);
    } catch (error) {
      console.error('Failed to fetch bills:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayBill = (bill: any) => {
    Alert.alert(
      'Pay Bill',
      `Pay ${bill.title} - ${formatCurrency(bill.amount)}?\n\nYou'll earn ${bill.coins_earn} coins!`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pay Now',
          onPress: async () => {
            try {
              const result = await payBill(user!.id, bill.id, bill.amount);
              Alert.alert('Payment Successful! 🎉', `You earned ${result.coins_earned} coins!\n\nTransaction ID: ${result.transaction_id.slice(0, 8)}...`);
              fetchBills();
            } catch (error) {
              Alert.alert('Error', 'Payment failed. Please try again.');
            }
          },
        },
      ]
    );
  };

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const totalDue = bills.reduce((sum, bill) => sum + bill.amount, 0);
  const totalCoins = bills.reduce((sum, bill) => sum + bill.coins_earn, 0);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00D09C" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Bill Payments</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Due</Text>
              <Text style={styles.summaryValue}>{formatCurrency(totalDue)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Earn Coins</Text>
              <View style={styles.coinsRow}>
                <Ionicons name="diamond" size={18} color="#FBBF24" />
                <Text style={styles.coinsText}>{totalCoins}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity style={styles.payAllButton}>
            <Text style={styles.payAllText}>Pay All Bills</Text>
            <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickAction}>
            <View style={[styles.quickIcon, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
              <Ionicons name="home" size={24} color="#8B5CF6" />
            </View>
            <Text style={styles.quickText}>Rent</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction}>
            <View style={[styles.quickIcon, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
              <Ionicons name="flash" size={24} color="#F59E0B" />
            </View>
            <Text style={styles.quickText}>Electricity</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction}>
            <View style={[styles.quickIcon, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
              <Ionicons name="wifi" size={24} color="#3B82F6" />
            </View>
            <Text style={styles.quickText}>Broadband</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction}>
            <View style={[styles.quickIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <Ionicons name="phone-portrait" size={24} color="#10B981" />
            </View>
            <Text style={styles.quickText}>Mobile</Text>
          </TouchableOpacity>
        </View>

        {/* Pending Bills */}
        <Text style={styles.sectionTitle}>Pending Bills</Text>
        {bills.map((bill) => {
          const daysLeft = getDaysUntilDue(bill.due_date);
          return (
            <TouchableOpacity key={bill.id} style={styles.billCard} onPress={() => handlePayBill(bill)}>
              <View style={[styles.billIcon, { backgroundColor: `${BILL_COLORS[bill.type]}20` }]}>
                <Ionicons name={BILL_ICONS[bill.type] as any || 'receipt'} size={24} color={BILL_COLORS[bill.type]} />
              </View>
              <View style={styles.billInfo}>
                <Text style={styles.billTitle}>{bill.title}</Text>
                <Text style={styles.billBiller}>{bill.biller}</Text>
                <View style={styles.billMeta}>
                  {bill.autopay && (
                    <View style={styles.autopayBadge}>
                      <Ionicons name="repeat" size={10} color="#00D09C" />
                      <Text style={styles.autopayText}>Autopay</Text>
                    </View>
                  )}
                  <View style={styles.coinsBadge}>
                    <Ionicons name="diamond" size={10} color="#FBBF24" />
                    <Text style={styles.coinsBadgeText}>+{bill.coins_earn}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.billRight}>
                <Text style={styles.billAmount}>{formatCurrency(bill.amount)}</Text>
                <Text style={[styles.billDue, daysLeft <= 3 && styles.billDueUrgent]}>
                  {daysLeft <= 0 ? 'Due today' : `Due in ${daysLeft}d`}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Autopay Setup */}
        <View style={styles.autopayCard}>
          <View style={styles.autopayHeader}>
            <Ionicons name="repeat" size={24} color="#00D09C" />
            <View style={styles.autopayInfo}>
              <Text style={styles.autopayTitle}>Set up Autopay</Text>
              <Text style={styles.autopayDesc}>Never miss a bill payment</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.autopayBtn}>
            <Text style={styles.autopayBtnText}>Enable</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E14' },
  loadingContainer: { flex: 1, backgroundColor: '#0A0E14', alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1A1F2E', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  summaryCard: { marginHorizontal: 20, backgroundColor: '#1A1F2E', borderRadius: 20, padding: 20, marginBottom: 20 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  summaryValue: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  summaryDivider: { width: 1, height: 40, backgroundColor: '#2A3142' },
  coinsRow: { flexDirection: 'row', alignItems: 'center' },
  coinsText: { fontSize: 24, fontWeight: '700', color: '#FBBF24', marginLeft: 6 },
  payAllButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#00D09C', borderRadius: 12, paddingVertical: 14 },
  payAllText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginRight: 8 },
  quickActions: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 20, marginBottom: 24 },
  quickAction: { alignItems: 'center' },
  quickIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  quickText: { fontSize: 12, color: '#9CA3AF' },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#FFFFFF', marginHorizontal: 20, marginBottom: 12 },
  billCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, backgroundColor: '#1A1F2E', borderRadius: 16, padding: 16, marginBottom: 10 },
  billIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  billInfo: { flex: 1, marginLeft: 14 },
  billTitle: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  billBiller: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  billMeta: { flexDirection: 'row', marginTop: 6, gap: 8 },
  autopayBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0, 208, 156, 0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  autopayText: { fontSize: 10, color: '#00D09C', marginLeft: 4 },
  coinsBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(251, 191, 36, 0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  coinsBadgeText: { fontSize: 10, color: '#FBBF24', marginLeft: 4 },
  billRight: { alignItems: 'flex-end' },
  billAmount: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  billDue: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  billDueUrgent: { color: '#EF4444' },
  autopayCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 20, backgroundColor: 'rgba(0, 208, 156, 0.1)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(0, 208, 156, 0.3)', marginTop: 12 },
  autopayHeader: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  autopayInfo: { marginLeft: 12 },
  autopayTitle: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  autopayDesc: { fontSize: 12, color: '#6B7280' },
  autopayBtn: { backgroundColor: '#00D09C', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  autopayBtnText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  bottomSpacing: { height: 40 },
});
