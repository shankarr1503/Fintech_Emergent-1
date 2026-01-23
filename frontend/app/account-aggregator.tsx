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
import { getAAConsentStatus, initiateAAConsent, confirmAAConsent, getAggregatedData, revokeAAConsent } from '../src/services/api';
import { formatCurrency } from '../src/utils/format';

const FIP_LOGOS: Record<string, { color: string; icon: string }> = {
  hdfc: { color: '#004C8F', icon: 'business' },
  icici: { color: '#F58220', icon: 'business' },
  sbi: { color: '#22409A', icon: 'business' },
  axis: { color: '#97144D', icon: 'business' },
  kotak: { color: '#ED1C24', icon: 'business' },
  zerodha: { color: '#387ED1', icon: 'trending-up' },
  groww: { color: '#5367FF', icon: 'trending-up' },
  lic: { color: '#00529B', icon: 'shield' },
  nps: { color: '#1E8449', icon: 'wallet' },
};

export default function AccountAggregatorScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [consentStatus, setConsentStatus] = useState<any>(null);
  const [aggregatedData, setAggregatedData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFips, setSelectedFips] = useState<string[]>([]);
  const [isLinking, setIsLinking] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!user?.id) return;
    try {
      const status = await getAAConsentStatus(user.id);
      setConsentStatus(status);
      
      if (status.status === 'active') {
        const data = await getAggregatedData(user.id);
        setAggregatedData(data);
      }
    } catch (error) {
      console.error('Failed to fetch AA status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFip = (fipId: string) => {
    setSelectedFips(prev => 
      prev.includes(fipId) 
        ? prev.filter(id => id !== fipId)
        : [...prev, fipId]
    );
  };

  const handleLinkAccounts = async () => {
    if (selectedFips.length === 0) {
      Alert.alert('Select Accounts', 'Please select at least one account to link');
      return;
    }

    setIsLinking(true);
    try {
      const consent = await initiateAAConsent(user!.id, selectedFips);
      
      // Simulate consent confirmation (in real app, this would be a redirect)
      Alert.alert(
        'Consent Required',
        'In production, you would be redirected to your bank app to approve data sharing. For this demo, we\'ll simulate approval.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Simulate Approval',
            onPress: async () => {
              await confirmAAConsent(consent.consent_id, user!.id);
              Alert.alert('Success! 🎉', 'Accounts linked successfully!');
              fetchData();
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to initiate consent');
    } finally {
      setIsLinking(false);
    }
  };

  const handleRevokeConsent = () => {
    Alert.alert(
      'Revoke Access',
      'This will unlink all connected accounts and delete your financial data from FinanceWise. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            try {
              await revokeAAConsent(user!.id, consentStatus.id);
              Alert.alert('Consent Revoked', 'All linked accounts have been removed.');
              setConsentStatus({ status: 'not_linked', linked_accounts: [], available_fips: consentStatus.available_fips });
              setAggregatedData(null);
            } catch (error) {
              Alert.alert('Error', 'Failed to revoke consent');
            }
          },
        },
      ]
    );
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
          <Text style={styles.title}>Account Aggregator</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* RBI Badge */}
        <View style={styles.rbiBadge}>
          <Ionicons name="shield-checkmark" size={20} color="#10B981" />
          <Text style={styles.rbiText}>RBI Regulated • Secure • Consent-based</Text>
        </View>

        {consentStatus?.status === 'active' ? (
          // Linked State
          <>
            {/* Linked Accounts Summary */}
            <View style={styles.linkedCard}>
              <View style={styles.linkedHeader}>
                <View style={styles.linkedIcon}>
                  <Ionicons name="link" size={24} color="#00D09C" />
                </View>
                <View>
                  <Text style={styles.linkedTitle}>{consentStatus.linked_accounts?.length || 0} Accounts Linked</Text>
                  <Text style={styles.linkedSubtitle}>via {consentStatus.aa_provider || 'Finvu'}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.manageBtn} onPress={handleRevokeConsent}>
                <Text style={styles.manageBtnText}>Manage Access</Text>
              </TouchableOpacity>
            </View>

            {/* Net Worth */}
            {aggregatedData?.net_worth && (
              <View style={styles.netWorthCard}>
                <Text style={styles.netWorthLabel}>Your Net Worth</Text>
                <Text style={[
                  styles.netWorthValue,
                  aggregatedData.net_worth.net_worth < 0 && styles.negativeValue
                ]}>
                  {formatCurrency(Math.abs(aggregatedData.net_worth.net_worth))}
                  {aggregatedData.net_worth.net_worth < 0 && ' (Negative)'}
                </Text>
                <View style={styles.netWorthBreakdown}>
                  <View style={styles.breakdownItem}>
                    <Text style={styles.breakdownLabel}>Assets</Text>
                    <Text style={styles.breakdownValue}>{formatCurrency(aggregatedData.net_worth.total_assets)}</Text>
                  </View>
                  <View style={styles.breakdownDivider} />
                  <View style={styles.breakdownItem}>
                    <Text style={styles.breakdownLabel}>Liabilities</Text>
                    <Text style={[styles.breakdownValue, styles.negativeValue]}>{formatCurrency(aggregatedData.net_worth.total_liabilities)}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Bank Accounts */}
            <Text style={styles.sectionTitle}>Bank Accounts</Text>
            {aggregatedData?.bank_accounts?.map((account: any, index: number) => (
              <View key={index} style={styles.accountCard}>
                <View style={[styles.accountIcon, { backgroundColor: '#004C8F20' }]}>
                  <Ionicons name="business" size={20} color="#004C8F" />
                </View>
                <View style={styles.accountInfo}>
                  <Text style={styles.accountBank}>{account.bank}</Text>
                  <Text style={styles.accountNumber}>{account.account_number} • {account.type}</Text>
                </View>
                <Text style={styles.accountBalance}>{formatCurrency(account.balance)}</Text>
              </View>
            ))}

            {/* Investments */}
            <Text style={styles.sectionTitle}>Investments</Text>
            <View style={styles.investmentCard}>
              <View style={styles.investmentHeader}>
                <Text style={styles.investmentType}>Mutual Funds</Text>
                <Text style={styles.investmentValue}>{formatCurrency(aggregatedData?.investments?.mutual_funds?.total_value || 0)}</Text>
              </View>
              {aggregatedData?.investments?.mutual_funds?.funds?.map((fund: any, index: number) => (
                <View key={index} style={styles.fundRow}>
                  <Text style={styles.fundName}>{fund.name}</Text>
                  <View style={styles.fundRight}>
                    <Text style={styles.fundValue}>{formatCurrency(fund.value)}</Text>
                    <Text style={[styles.fundReturns, fund.returns >= 0 ? styles.positive : styles.negative]}>
                      {fund.returns >= 0 ? '+' : ''}{fund.returns}%
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Insurance */}
            <Text style={styles.sectionTitle}>Insurance</Text>
            {aggregatedData?.insurance?.map((policy: any, index: number) => (
              <View key={index} style={styles.insuranceCard}>
                <View style={[styles.accountIcon, { backgroundColor: '#10B98120' }]}>
                  <Ionicons name="shield" size={20} color="#10B981" />
                </View>
                <View style={styles.accountInfo}>
                  <Text style={styles.accountBank}>{policy.type} Insurance</Text>
                  <Text style={styles.accountNumber}>{policy.provider}</Text>
                </View>
                <View style={styles.insuranceRight}>
                  <Text style={styles.insuranceSum}>{formatCurrency(policy.sum_assured)}</Text>
                  <Text style={styles.insurancePremium}>{formatCurrency(policy.premium)}/yr</Text>
                </View>
              </View>
            ))}
          </>
        ) : (
          // Not Linked State
          <>
            {/* Info Card */}
            <View style={styles.infoCard}>
              <View style={styles.infoIcon}>
                <Ionicons name="information-circle" size={32} color="#3B82F6" />
              </View>
              <Text style={styles.infoTitle}>What is Account Aggregator?</Text>
              <Text style={styles.infoText}>
                Account Aggregator is an RBI-regulated framework that lets you securely share your financial data 
                with FinanceWise for better insights and recommendations.
              </Text>
              <View style={styles.infoFeatures}>
                <View style={styles.infoFeature}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={styles.featureText}>Read-only access</Text>
                </View>
                <View style={styles.infoFeature}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={styles.featureText}>Revoke anytime</Text>
                </View>
                <View style={styles.infoFeature}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={styles.featureText}>Bank-grade encryption</Text>
                </View>
              </View>
            </View>

            {/* Select FIPs */}
            <Text style={styles.sectionTitle}>Select Accounts to Link</Text>
            <View style={styles.fipGrid}>
              {consentStatus?.available_fips?.map((fip: any) => (
                <TouchableOpacity
                  key={fip.id}
                  style={[
                    styles.fipCard,
                    selectedFips.includes(fip.id) && styles.fipCardSelected
                  ]}
                  onPress={() => toggleFip(fip.id)}
                >
                  <View style={[styles.fipIcon, { backgroundColor: `${FIP_LOGOS[fip.id]?.color}20` }]}>
                    <Ionicons name={FIP_LOGOS[fip.id]?.icon as any || 'business'} size={24} color={FIP_LOGOS[fip.id]?.color || '#3B82F6'} />
                  </View>
                  <Text style={styles.fipName}>{fip.name}</Text>
                  <Text style={styles.fipType}>{fip.type}</Text>
                  {selectedFips.includes(fip.id) && (
                    <View style={styles.checkmark}>
                      <Ionicons name="checkmark-circle" size={20} color="#00D09C" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Link Button */}
            <TouchableOpacity
              style={[styles.linkButton, selectedFips.length === 0 && styles.linkButtonDisabled]}
              onPress={handleLinkAccounts}
              disabled={selectedFips.length === 0 || isLinking}
            >
              {isLinking ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.linkButtonText}>Link {selectedFips.length} Account{selectedFips.length !== 1 ? 's' : ''}</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>

            {/* Privacy Note */}
            <View style={styles.privacyNote}>
              <Ionicons name="lock-closed" size={16} color="#6B7280" />
              <Text style={styles.privacyText}>
                Your data is encrypted and never shared without consent. Powered by Finvu & CAMFinserv.
              </Text>
            </View>
          </>
        )}

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
  rbiBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(16, 185, 129, 0.1)', marginHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginBottom: 20 },
  rbiText: { fontSize: 13, color: '#10B981', marginLeft: 8 },
  linkedCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 20, backgroundColor: '#1A1F2E', borderRadius: 16, padding: 16, marginBottom: 20 },
  linkedHeader: { flexDirection: 'row', alignItems: 'center' },
  linkedIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(0, 208, 156, 0.15)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  linkedTitle: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  linkedSubtitle: { fontSize: 13, color: '#6B7280' },
  manageBtn: { backgroundColor: '#2A3142', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  manageBtnText: { fontSize: 13, color: '#FFFFFF' },
  netWorthCard: { marginHorizontal: 20, backgroundColor: 'linear-gradient(135deg, #1A1F2E 0%, #2A3142 100%)', borderRadius: 20, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: '#2A3142' },
  netWorthLabel: { fontSize: 14, color: '#6B7280', marginBottom: 8 },
  netWorthValue: { fontSize: 32, fontWeight: '700', color: '#00D09C', marginBottom: 16 },
  negativeValue: { color: '#EF4444' },
  netWorthBreakdown: { flexDirection: 'row', alignItems: 'center' },
  breakdownItem: { flex: 1, alignItems: 'center' },
  breakdownLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  breakdownValue: { fontSize: 16, fontWeight: '600', color: '#10B981' },
  breakdownDivider: { width: 1, height: 30, backgroundColor: '#2A3142' },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#FFFFFF', marginHorizontal: 20, marginBottom: 12, marginTop: 8 },
  accountCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, backgroundColor: '#1A1F2E', borderRadius: 14, padding: 14, marginBottom: 10 },
  accountIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  accountInfo: { flex: 1, marginLeft: 12 },
  accountBank: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  accountNumber: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  accountBalance: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  investmentCard: { marginHorizontal: 20, backgroundColor: '#1A1F2E', borderRadius: 16, padding: 16, marginBottom: 16 },
  investmentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#2A3142' },
  investmentType: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  investmentValue: { fontSize: 16, fontWeight: '700', color: '#00D09C' },
  fundRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  fundName: { fontSize: 14, color: '#9CA3AF', flex: 1 },
  fundRight: { alignItems: 'flex-end' },
  fundValue: { fontSize: 14, fontWeight: '500', color: '#FFFFFF' },
  fundReturns: { fontSize: 12, marginTop: 2 },
  positive: { color: '#10B981' },
  negative: { color: '#EF4444' },
  insuranceCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, backgroundColor: '#1A1F2E', borderRadius: 14, padding: 14, marginBottom: 10 },
  insuranceRight: { alignItems: 'flex-end' },
  insuranceSum: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  insurancePremium: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  infoCard: { marginHorizontal: 20, backgroundColor: '#1A1F2E', borderRadius: 20, padding: 20, marginBottom: 24, alignItems: 'center' },
  infoIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(59, 130, 246, 0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  infoTitle: { fontSize: 18, fontWeight: '600', color: '#FFFFFF', marginBottom: 12 },
  infoText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 22, marginBottom: 16 },
  infoFeatures: { width: '100%' },
  infoFeature: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  featureText: { fontSize: 14, color: '#FFFFFF', marginLeft: 10 },
  fipGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, marginBottom: 20 },
  fipCard: { width: '29%', backgroundColor: '#1A1F2E', borderRadius: 14, padding: 14, margin: '2%', alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  fipCardSelected: { borderColor: '#00D09C', backgroundColor: 'rgba(0, 208, 156, 0.1)' },
  fipIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  fipName: { fontSize: 12, fontWeight: '600', color: '#FFFFFF', textAlign: 'center' },
  fipType: { fontSize: 10, color: '#6B7280', marginTop: 2, textTransform: 'capitalize' },
  checkmark: { position: 'absolute', top: 8, right: 8 },
  linkButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 20, backgroundColor: '#00D09C', borderRadius: 14, paddingVertical: 16, marginBottom: 16 },
  linkButtonDisabled: { backgroundColor: '#2A3142' },
  linkButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginRight: 8 },
  privacyNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 20, padding: 12 },
  privacyText: { fontSize: 12, color: '#6B7280', marginLeft: 8, textAlign: 'center', flex: 1 },
  bottomSpacing: { height: 40 },
});
