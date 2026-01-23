import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { getCreditScore, payCreditCardBill } from '../src/services/api';
import { formatCurrency } from '../src/utils/format';

const { width } = Dimensions.get('window');

export default function CreditScoreScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [scoreData, setScoreData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCreditScore();
  }, []);

  const fetchCreditScore = async () => {
    if (!user?.id) return;
    try {
      const data = await getCreditScore(user.id);
      setScoreData(data);
    } catch (error) {
      console.error('Failed to fetch credit score:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 750) return '#10B981';
    if (score >= 700) return '#FBBF24';
    if (score >= 650) return '#F97316';
    return '#EF4444';
  };

  const getScoreArc = (score: number) => {
    const percentage = ((score - 300) / 600) * 100;
    return Math.min(percentage, 100);
  };

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
          <Text style={styles.title}>Credit Score</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={fetchCreditScore}>
            <Ionicons name="refresh" size={24} color="#00D09C" />
          </TouchableOpacity>
        </View>

        {/* Score Card */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreCircle}>
            <Text style={[styles.scoreNumber, { color: getScoreColor(scoreData?.score || 0) }]}>
              {scoreData?.score || 0}
            </Text>
            <Text style={styles.scoreLabel}>{scoreData?.rating}</Text>
          </View>
          <View style={styles.scoreBarContainer}>
            <View style={styles.scoreBarBg}>
              <View 
                style={[
                  styles.scoreBarFill, 
                  { 
                    width: `${getScoreArc(scoreData?.score || 300)}%`,
                    backgroundColor: getScoreColor(scoreData?.score || 0)
                  }
                ]} 
              />
            </View>
            <View style={styles.scoreRange}>
              <Text style={styles.rangeText}>300</Text>
              <Text style={styles.rangeText}>900</Text>
            </View>
          </View>
          <Text style={styles.lastUpdated}>Last updated: Today</Text>
        </View>

        {/* Credit Factors */}
        <Text style={styles.sectionTitle}>Score Factors</Text>
        <View style={styles.factorsCard}>
          {Object.entries(scoreData?.factors || {}).map(([key, value]: [string, any]) => (
            <View key={key} style={styles.factorRow}>
              <View style={styles.factorInfo}>
                <Text style={styles.factorName}>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</Text>
                <View style={styles.factorBarBg}>
                  <View style={[styles.factorBarFill, { width: `${value}%` }]} />
                </View>
              </View>
              <Text style={styles.factorValue}>{value}%</Text>
            </View>
          ))}
        </View>

        {/* Credit Cards */}
        <Text style={styles.sectionTitle}>Your Credit Cards</Text>
        {scoreData?.credit_cards?.map((card: any, index: number) => (
          <View key={index} style={styles.cardItem}>
            <View style={styles.cardHeader}>
              <View style={styles.cardBankLogo}>
                <Text style={styles.cardBankInitial}>{card.bank.charAt(0)}</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardBank}>{card.bank}</Text>
                <Text style={styles.cardType}>{card.card_type}</Text>
              </View>
              <View style={styles.cardPoints}>
                <Ionicons name="star" size={16} color="#FBBF24" />
                <Text style={styles.pointsText}>{card.reward_points?.toLocaleString()}</Text>
              </View>
            </View>
            <View style={styles.cardDetails}>
              <View style={styles.cardDetailItem}>
                <Text style={styles.detailLabel}>Total Due</Text>
                <Text style={styles.detailValue}>{formatCurrency(card.total_due)}</Text>
              </View>
              <View style={styles.cardDetailItem}>
                <Text style={styles.detailLabel}>Min Due</Text>
                <Text style={styles.detailValue}>{formatCurrency(card.min_due)}</Text>
              </View>
              <View style={styles.cardDetailItem}>
                <Text style={styles.detailLabel}>Due Date</Text>
                <Text style={[styles.detailValue, styles.dueDate]}>{card.due_date}</Text>
              </View>
            </View>
            <View style={styles.utilizationBar}>
              <Text style={styles.utilizationLabel}>Credit Used: {Math.round((card.used / card.limit) * 100)}%</Text>
              <View style={styles.utilizationBg}>
                <View style={[styles.utilizationFill, { width: `${(card.used / card.limit) * 100}%` }]} />
              </View>
            </View>
            <TouchableOpacity style={styles.payButton}>
              <Text style={styles.payButtonText}>Pay Bill & Earn Coins</Text>
              <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ))}

        {/* Score History */}
        <Text style={styles.sectionTitle}>Score History</Text>
        <View style={styles.historyCard}>
          {scoreData?.history?.map((item: any, index: number) => (
            <View key={index} style={styles.historyRow}>
              <Text style={styles.historyMonth}>{item.month}</Text>
              <View style={styles.historyBarBg}>
                <View style={[styles.historyBarFill, { width: `${((item.score - 300) / 600) * 100}%` }]} />
              </View>
              <Text style={styles.historyScore}>{item.score}</Text>
            </View>
          ))}
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
  refreshButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1A1F2E', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  scoreCard: { marginHorizontal: 20, backgroundColor: '#1A1F2E', borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 24 },
  scoreCircle: { width: 160, height: 160, borderRadius: 80, borderWidth: 8, borderColor: '#2A3142', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  scoreNumber: { fontSize: 48, fontWeight: '700' },
  scoreLabel: { fontSize: 16, color: '#6B7280', marginTop: 4 },
  scoreBarContainer: { width: '100%' },
  scoreBarBg: { height: 8, backgroundColor: '#2A3142', borderRadius: 4, overflow: 'hidden' },
  scoreBarFill: { height: '100%', borderRadius: 4 },
  scoreRange: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  rangeText: { fontSize: 12, color: '#6B7280' },
  lastUpdated: { fontSize: 12, color: '#6B7280', marginTop: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#FFFFFF', marginHorizontal: 20, marginBottom: 12 },
  factorsCard: { marginHorizontal: 20, backgroundColor: '#1A1F2E', borderRadius: 16, padding: 16, marginBottom: 24 },
  factorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  factorInfo: { flex: 1 },
  factorName: { fontSize: 14, color: '#FFFFFF', marginBottom: 6, textTransform: 'capitalize' },
  factorBarBg: { height: 6, backgroundColor: '#2A3142', borderRadius: 3 },
  factorBarFill: { height: '100%', backgroundColor: '#00D09C', borderRadius: 3 },
  factorValue: { fontSize: 14, fontWeight: '600', color: '#00D09C', marginLeft: 12, width: 40, textAlign: 'right' },
  cardItem: { marginHorizontal: 20, backgroundColor: '#1A1F2E', borderRadius: 16, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  cardBankLogo: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center' },
  cardBankInitial: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  cardInfo: { flex: 1, marginLeft: 12 },
  cardBank: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  cardType: { fontSize: 13, color: '#6B7280' },
  cardPoints: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(251, 191, 36, 0.15)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  pointsText: { fontSize: 13, fontWeight: '600', color: '#FBBF24', marginLeft: 4 },
  cardDetails: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  cardDetailItem: { alignItems: 'center' },
  detailLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  detailValue: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  dueDate: { color: '#EF4444' },
  utilizationBar: { marginBottom: 16 },
  utilizationLabel: { fontSize: 12, color: '#6B7280', marginBottom: 6 },
  utilizationBg: { height: 6, backgroundColor: '#2A3142', borderRadius: 3 },
  utilizationFill: { height: '100%', backgroundColor: '#F97316', borderRadius: 3 },
  payButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#00D09C', borderRadius: 12, paddingVertical: 14 },
  payButtonText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF', marginRight: 8 },
  historyCard: { marginHorizontal: 20, backgroundColor: '#1A1F2E', borderRadius: 16, padding: 16, marginBottom: 24 },
  historyRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  historyMonth: { fontSize: 13, color: '#6B7280', width: 70 },
  historyBarBg: { flex: 1, height: 6, backgroundColor: '#2A3142', borderRadius: 3, marginHorizontal: 12 },
  historyBarFill: { height: '100%', backgroundColor: '#00D09C', borderRadius: 3 },
  historyScore: { fontSize: 14, fontWeight: '600', color: '#FFFFFF', width: 40, textAlign: 'right' },
  bottomSpacing: { height: 40 },
});
