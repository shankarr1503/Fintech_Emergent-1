import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { checkLoanEligibility, applyForLoan, getActiveLoans } from '../src/services/api';
import { formatCurrency } from '../src/utils/format';

const { width } = Dimensions.get('window');

const LoanTypeCard = ({ loan, onSelect, isSelected }: any) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isSelected) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1.02, friction: 3, useNativeDriver: true }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(glowAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
            Animated.timing(glowAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
          ])
        ),
      ]).start();
    } else {
      Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }).start();
    }
  }, [isSelected]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'loan_against_mf': return 'pie-chart';
      case 'loan_against_shares': return 'trending-up';
      case 'loan_against_fd': return 'lock-closed';
      case 'personal_loan': return 'person';
      default: return 'cash';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'loan_against_mf': return '#8B5CF6';
      case 'loan_against_shares': return '#3B82F6';
      case 'loan_against_fd': return '#10B981';
      case 'personal_loan': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  return (
    <TouchableOpacity onPress={onSelect} activeOpacity={0.8}>
      <Animated.View style={[
        styles.loanTypeCard,
        isSelected && styles.loanTypeCardSelected,
        { transform: [{ scale: scaleAnim }] }
      ]}>
        {isSelected && (
          <Animated.View style={[styles.selectedGlow, { opacity: glowAnim }]} />
        )}
        <View style={[styles.loanTypeIcon, { backgroundColor: `${getTypeColor(loan.type)}20` }]}>
          <Ionicons name={getTypeIcon(loan.type) as any} size={24} color={getTypeColor(loan.type)} />
        </View>
        <View style={styles.loanTypeInfo}>
          <Text style={styles.loanTypeName}>{loan.name}</Text>
          <View style={styles.loanTypeDetails}>
            <View style={styles.loanDetail}>
              <Text style={styles.loanDetailLabel}>Interest</Text>
              <Text style={styles.loanDetailValue}>{loan.interest_rate}%</Text>
            </View>
            <View style={styles.loanDetail}>
              <Text style={styles.loanDetailLabel}>Max LTV</Text>
              <Text style={styles.loanDetailValue}>{loan.max_ltv}%</Text>
            </View>
            <View style={styles.loanDetail}>
              <Text style={styles.loanDetailLabel}>Max Loan</Text>
              <Text style={styles.loanDetailValue}>{formatCurrency(loan.max_loan)}</Text>
            </View>
          </View>
          <View style={styles.disbursementBadge}>
            <Ionicons name="flash" size={12} color="#00D09C" />
            <Text style={styles.disbursementText}>{loan.disbursement_time}</Text>
          </View>
        </View>
        {isSelected && (
          <View style={styles.selectedCheck}>
            <Ionicons name="checkmark-circle" size={24} color="#00D09C" />
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function DigitalLoansScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [eligibility, setEligibility] = useState<any>(null);
  const [activeLoans, setActiveLoans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLoan, setSelectedLoan] = useState<string | null>(null);
  const [step, setStep] = useState<'select' | 'amount' | 'confirm'>('select');
  const [loanAmount, setLoanAmount] = useState(0);
  const [tenure, setTenure] = useState(24);

  // Animation refs
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!user?.id) {
      router.replace('/(auth)/login');
      return;
    }
    fetchData();
  }, [user?.id]);

  const fetchData = async () => {
    if (!user?.id) return;
    try {
      const [eligibilityData, loansData] = await Promise.all([
        checkLoanEligibility(user.id),
        getActiveLoans(user.id),
      ]);
      setEligibility(eligibilityData);
      setActiveLoans(loansData);
    } catch (error) {
      console.error('Failed to fetch loan data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedLoanType = eligibility?.eligible_loan_types?.find((l: any) => l.type === selectedLoan);

  const calculateEMI = () => {
    if (!loanAmount || !selectedLoanType) return 0;
    const rate = selectedLoanType.interest_rate / 12 / 100;
    const emi = (loanAmount * rate * Math.pow(1 + rate, tenure)) / (Math.pow(1 + rate, tenure) - 1);
    return Math.round(emi);
  };

  const handleApply = async () => {
    try {
      const result = await applyForLoan(user!.id, selectedLoan!, loanAmount, tenure, []);
      Alert.alert(
        'Loan Approved! 🎉',
        `Your loan of ${formatCurrency(loanAmount)} has been approved!\n\nEMI: ${formatCurrency(result.emi)}/month\nLoan ID: ${result.loan_id}\n\nAmount will be credited within 2 hours.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to apply for loan');
    }
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
          <Text style={styles.title}>Digital Loans</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Credit Score Banner */}
        <View style={styles.creditBanner}>
          <View style={styles.creditScore}>
            <Text style={styles.creditScoreValue}>{eligibility?.credit_score || 700}</Text>
            <Text style={styles.creditScoreLabel}>Credit Score</Text>
          </View>
          <View style={styles.creditInfo}>
            <Text style={styles.creditInfoTitle}>Pre-Approved Limit</Text>
            <Text style={styles.creditInfoValue}>{formatCurrency(eligibility?.max_loan_amount || 500000)}</Text>
            <Text style={styles.creditInfoNote}>Based on your credit profile</Text>
          </View>
        </View>

        {/* Pre-Approved Offers */}
        {eligibility?.pre_approved_offers?.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pre-Approved Offers</Text>
              <View style={styles.specialBadge}>
                <Ionicons name="star" size={12} color="#FBBF24" />
                <Text style={styles.specialText}>Special</Text>
              </View>
            </View>
            {eligibility.pre_approved_offers.map((offer: any) => (
              <TouchableOpacity key={offer.id} style={styles.preApprovedCard}>
                <View style={styles.preApprovedHeader}>
                  <View style={styles.preApprovedIcon}>
                    <Ionicons name="flash" size={24} color="#FBBF24" />
                  </View>
                  <View style={styles.preApprovedInfo}>
                    <Text style={styles.preApprovedTitle}>Instant Loan</Text>
                    <Text style={styles.preApprovedAmount}>{formatCurrency(offer.amount)}</Text>
                  </View>
                  <View style={styles.preApprovedRate}>
                    <Text style={styles.preApprovedRateValue}>{offer.interest_rate}%</Text>
                    <Text style={styles.preApprovedRateLabel}>p.a.</Text>
                  </View>
                </View>
                <View style={styles.preApprovedDetails}>
                  <View style={styles.preApprovedDetail}>
                    <Text style={styles.detailLabel}>EMI</Text>
                    <Text style={styles.detailValue}>{formatCurrency(offer.emi)}/mo</Text>
                  </View>
                  <View style={styles.preApprovedDetail}>
                    <Text style={styles.detailLabel}>Tenure</Text>
                    <Text style={styles.detailValue}>{offer.tenure} months</Text>
                  </View>
                  <View style={styles.preApprovedDetail}>
                    <Text style={styles.detailLabel}>Valid Till</Text>
                    <Text style={styles.detailValue}>{offer.valid_until}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.claimButton}>
                  <Text style={styles.claimButtonText}>Claim Now</Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Active Loans */}
        {activeLoans.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Active Loans</Text>
            {activeLoans.map((loan: any) => (
              <View key={loan.id} style={styles.activeLoanCard}>
                <View style={styles.activeLoanHeader}>
                  <View style={styles.activeLoanIcon}>
                    <Ionicons name="cash" size={20} color="#00D09C" />
                  </View>
                  <View style={styles.activeLoanInfo}>
                    <Text style={styles.activeLoanName}>{loan.name}</Text>
                    <Text style={styles.activeLoanId}>ID: {loan.id}</Text>
                  </View>
                  <View style={styles.activeLoanAmount}>
                    <Text style={styles.outstandingLabel}>Outstanding</Text>
                    <Text style={styles.outstandingValue}>{formatCurrency(loan.outstanding)}</Text>
                  </View>
                </View>
                <View style={styles.progressSection}>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${((loan.tenure - loan.remaining_tenure) / loan.tenure) * 100}%` }]} />
                  </View>
                  <Text style={styles.progressText}>{loan.tenure - loan.remaining_tenure}/{loan.tenure} EMIs paid</Text>
                </View>
                <View style={styles.activeLoanFooter}>
                  <View>
                    <Text style={styles.footerLabel}>Next EMI</Text>
                    <Text style={styles.footerValue}>{formatCurrency(loan.emi)}</Text>
                  </View>
                  <View>
                    <Text style={styles.footerLabel}>Due Date</Text>
                    <Text style={styles.footerValue}>{loan.next_emi_date}</Text>
                  </View>
                  <TouchableOpacity style={styles.payEmiButton}>
                    <Text style={styles.payEmiText}>Pay EMI</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}

        {/* Loan Types */}
        <Text style={styles.sectionTitle}>Available Loan Options</Text>
        {eligibility?.eligible_loan_types?.map((loan: any) => (
          <LoanTypeCard
            key={loan.type}
            loan={loan}
            isSelected={selectedLoan === loan.type}
            onSelect={() => setSelectedLoan(selectedLoan === loan.type ? null : loan.type)}
          />
        ))}

        {/* Apply Button */}
        {selectedLoan && (
          <TouchableOpacity style={styles.applyButton} onPress={() => {
            setLoanAmount(selectedLoanType?.max_loan || 100000);
            handleApply();
          }}>
            <Text style={styles.applyButtonText}>Apply for {selectedLoanType?.name}</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {/* Why Digital Loans */}
        <View style={styles.whySection}>
          <Text style={styles.whyTitle}>Why FinanceWise Loans?</Text>
          <View style={styles.whyGrid}>
            <View style={styles.whyItem}>
              <Ionicons name="flash" size={24} color="#00D09C" />
              <Text style={styles.whyText}>Instant Approval</Text>
            </View>
            <View style={styles.whyItem}>
              <Ionicons name="shield-checkmark" size={24} color="#00D09C" />
              <Text style={styles.whyText}>100% Digital</Text>
            </View>
            <View style={styles.whyItem}>
              <Ionicons name="document-text" size={24} color="#00D09C" />
              <Text style={styles.whyText}>Minimal Docs</Text>
            </View>
            <View style={styles.whyItem}>
              <Ionicons name="trending-down" size={24} color="#00D09C" />
              <Text style={styles.whyText}>Low Interest</Text>
            </View>
          </View>
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
  creditBanner: { flexDirection: 'row', marginHorizontal: 20, backgroundColor: 'linear-gradient(135deg, #059669 0%, #10B981 100%)', borderRadius: 20, padding: 20, marginBottom: 24 },
  creditScore: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  creditScoreValue: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  creditScoreLabel: { fontSize: 10, color: 'rgba(255,255,255,0.8)' },
  creditInfo: { flex: 1, justifyContent: 'center' },
  creditInfoTitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  creditInfoValue: { fontSize: 28, fontWeight: '700', color: '#FFFFFF' },
  creditInfoNote: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#FFFFFF', paddingHorizontal: 20, marginBottom: 12, marginTop: 8 },
  specialBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(251, 191, 36, 0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  specialText: { fontSize: 12, color: '#FBBF24', marginLeft: 4, fontWeight: '600' },
  preApprovedCard: { marginHorizontal: 20, backgroundColor: '#1A1F2E', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.3)' },
  preApprovedHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  preApprovedIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(251, 191, 36, 0.15)', alignItems: 'center', justifyContent: 'center' },
  preApprovedInfo: { flex: 1, marginLeft: 12 },
  preApprovedTitle: { fontSize: 14, color: '#FBBF24' },
  preApprovedAmount: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  preApprovedRate: { alignItems: 'center' },
  preApprovedRateValue: { fontSize: 20, fontWeight: '700', color: '#00D09C' },
  preApprovedRateLabel: { fontSize: 11, color: '#6B7280' },
  preApprovedDetails: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  preApprovedDetail: { alignItems: 'center' },
  detailLabel: { fontSize: 11, color: '#6B7280' },
  detailValue: { fontSize: 14, fontWeight: '600', color: '#FFFFFF', marginTop: 2 },
  claimButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FBBF24', borderRadius: 10, paddingVertical: 12 },
  claimButtonText: { fontSize: 15, fontWeight: '600', color: '#0A0E14', marginRight: 8 },
  activeLoanCard: { marginHorizontal: 20, backgroundColor: '#1A1F2E', borderRadius: 16, padding: 16, marginBottom: 12 },
  activeLoanHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  activeLoanIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(0, 208, 156, 0.15)', alignItems: 'center', justifyContent: 'center' },
  activeLoanInfo: { flex: 1, marginLeft: 12 },
  activeLoanName: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  activeLoanId: { fontSize: 12, color: '#6B7280' },
  activeLoanAmount: { alignItems: 'flex-end' },
  outstandingLabel: { fontSize: 11, color: '#6B7280' },
  outstandingValue: { fontSize: 16, fontWeight: '700', color: '#EF4444' },
  progressSection: { marginBottom: 16 },
  progressBar: { height: 6, backgroundColor: '#2A3142', borderRadius: 3, marginBottom: 8 },
  progressFill: { height: '100%', backgroundColor: '#00D09C', borderRadius: 3 },
  progressText: { fontSize: 12, color: '#6B7280' },
  activeLoanFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerLabel: { fontSize: 11, color: '#6B7280' },
  footerValue: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  payEmiButton: { backgroundColor: '#00D09C', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  payEmiText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  loanTypeCard: { marginHorizontal: 20, backgroundColor: '#1A1F2E', borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', overflow: 'hidden' },
  loanTypeCardSelected: { borderWidth: 2, borderColor: '#00D09C' },
  selectedGlow: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 208, 156, 0.1)' },
  loanTypeIcon: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  loanTypeInfo: { flex: 1, marginLeft: 14 },
  loanTypeName: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginBottom: 8 },
  loanTypeDetails: { flexDirection: 'row', marginBottom: 8 },
  loanDetail: { marginRight: 16 },
  loanDetailLabel: { fontSize: 10, color: '#6B7280' },
  loanDetailValue: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  disbursementBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: 'rgba(0, 208, 156, 0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  disbursementText: { fontSize: 11, color: '#00D09C', marginLeft: 4 },
  selectedCheck: { position: 'absolute', top: 12, right: 12 },
  applyButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 20, backgroundColor: '#00D09C', borderRadius: 14, paddingVertical: 16, marginTop: 8, marginBottom: 24 },
  applyButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginRight: 8 },
  whySection: { marginHorizontal: 20, backgroundColor: '#1A1F2E', borderRadius: 16, padding: 20, marginBottom: 24 },
  whyTitle: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginBottom: 16, textAlign: 'center' },
  whyGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  whyItem: { width: '50%', alignItems: 'center', paddingVertical: 12 },
  whyText: { fontSize: 12, color: '#9CA3AF', marginTop: 8 },
  bottomSpacing: { height: 40 },
});
