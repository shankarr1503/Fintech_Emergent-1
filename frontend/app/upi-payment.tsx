import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { getUPILinkedAccounts, getRecentPayees, sendMoneyUPI } from '../src/services/api';
import { formatCurrency } from '../src/utils/format';

const { width, height } = Dimensions.get('window');

// Mario-style floating coin component
const FloatingCoin = ({ delay, startX }: { delay: number; startX: number }) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(startX)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.5)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      translateY.setValue(height);
      opacity.setValue(1);
      scale.setValue(0.5);
      
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -100,
          duration: 2000,
          delay,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 2000,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1.5,
          duration: 1000,
          delay,
          useNativeDriver: true,
        }),
        Animated.loop(
          Animated.timing(rotate, {
            toValue: 1,
            duration: 300,
            easing: Easing.linear,
            useNativeDriver: true,
          })
        ),
      ]).start();
    };
    animate();
  }, []);

  const spin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.floatingCoin,
        {
          transform: [
            { translateY },
            { translateX },
            { scale },
            { rotateY: spin },
          ],
          opacity,
        },
      ]}
    >
      <Text style={styles.coinEmoji}>🪙</Text>
    </Animated.View>
  );
};

// Success animation component
const SuccessAnimation = ({ amount, coins, onComplete }: { amount: number; coins: number; onComplete: () => void }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      Animated.spring(checkScale, {
        toValue: 1,
        tension: 100,
        friction: 5,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(onComplete, 3000);
  }, []);

  return (
    <Animated.View style={[styles.successOverlay, { opacity: opacityAnim }]}>
      {/* Floating coins */}
      {Array.from({ length: 15 }).map((_, i) => (
        <FloatingCoin key={i} delay={i * 100} startX={Math.random() * width - width / 2} />
      ))}
      
      <Animated.View style={[styles.successCard, { transform: [{ scale: scaleAnim }] }]}>
        <Animated.View style={[styles.checkCircle, { transform: [{ scale: checkScale }] }]}>
          <Ionicons name="checkmark" size={48} color="#FFFFFF" />
        </Animated.View>
        <Text style={styles.successText}>Payment Successful!</Text>
        <Text style={styles.successAmount}>{formatCurrency(amount)}</Text>
        <View style={styles.coinsEarned}>
          <Text style={styles.coinsBounce}>🪙</Text>
          <Text style={styles.coinsEarnedText}>+{coins} coins earned!</Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

export default function UPIPaymentScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [upiData, setUpiData] = useState<any>(null);
  const [payees, setPayees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [step, setStep] = useState<'home' | 'pay' | 'success'>('home');
  const [selectedPayee, setSelectedPayee] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [paymentResult, setPaymentResult] = useState<any>(null);

  // Animation refs
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!user?.id) return;
    try {
      const [upi, recent] = await Promise.all([
        getUPILinkedAccounts(user.id),
        getRecentPayees(user.id),
      ]);
      setUpiData(upi);
      setPayees(recent);
    } catch (error) {
      console.error('Failed to fetch UPI data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPayee = (payee: any) => {
    setSelectedPayee(payee);
    // Animate transition
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -width,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setStep('pay');
      slideAnim.setValue(width);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handlePay = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setIsPaying(true);
    try {
      const result = await sendMoneyUPI(
        user!.id,
        selectedPayee.upi_id,
        parseFloat(amount),
        note,
        upiData.linked_accounts[0].id
      );
      setPaymentResult(result);
      setStep('success');
    } catch (error) {
      Alert.alert('Error', 'Payment failed. Please try again.');
    } finally {
      setIsPaying(false);
    }
  };

  const handleSuccessComplete = () => {
    setStep('home');
    setSelectedPayee(null);
    setAmount('');
    setNote('');
    setPaymentResult(null);
    slideAnim.setValue(0);
    fadeAnim.setValue(1);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00D09C" />
      </View>
    );
  }

  if (step === 'success' && paymentResult) {
    return (
      <SuccessAnimation
        amount={parseFloat(amount)}
        coins={paymentResult.coins_earned}
        onComplete={handleSuccessComplete}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => step === 'pay' ? setStep('home') : router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>{step === 'pay' ? 'Send Money' : 'UPI Payment'}</Text>
          <TouchableOpacity style={styles.qrButton}>
            <Ionicons name="qr-code" size={24} color="#00D09C" />
          </TouchableOpacity>
        </View>

        <Animated.View style={[styles.content, { transform: [{ translateX: slideAnim }], opacity: fadeAnim }]}>
          {step === 'home' ? (
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* UPI ID Card */}
              <View style={styles.upiCard}>
                <View style={styles.upiCardHeader}>
                  <View style={styles.upiLogo}>
                    <Text style={styles.upiLogoText}>UPI</Text>
                  </View>
                  <View>
                    <Text style={styles.upiIdLabel}>Your UPI ID</Text>
                    <Text style={styles.upiId}>{upiData?.upi_id}</Text>
                  </View>
                </View>
                <View style={styles.limitBar}>
                  <View style={styles.limitInfo}>
                    <Text style={styles.limitLabel}>Daily Limit</Text>
                    <Text style={styles.limitValue}>
                      {formatCurrency(upiData?.used_today || 0)} / {formatCurrency(upiData?.daily_limit || 100000)}
                    </Text>
                  </View>
                  <View style={styles.limitBarBg}>
                    <View style={[styles.limitBarFill, { width: `${((upiData?.used_today || 0) / (upiData?.daily_limit || 100000)) * 100}%` }]} />
                  </View>
                </View>
              </View>

              {/* Quick Actions */}
              <View style={styles.quickActions}>
                <TouchableOpacity style={styles.quickAction}>
                  <View style={[styles.quickIcon, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                    <Ionicons name="scan" size={24} color="#3B82F6" />
                  </View>
                  <Text style={styles.quickText}>Scan QR</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickAction}>
                  <View style={[styles.quickIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                    <Ionicons name="person-add" size={24} color="#10B981" />
                  </View>
                  <Text style={styles.quickText}>New Payee</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickAction}>
                  <View style={[styles.quickIcon, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                    <Ionicons name="wallet" size={24} color="#8B5CF6" />
                  </View>
                  <Text style={styles.quickText}>Self Transfer</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickAction}>
                  <View style={[styles.quickIcon, { backgroundColor: 'rgba(251, 191, 36, 0.15)' }]}>
                    <Ionicons name="arrow-down" size={24} color="#FBBF24" />
                  </View>
                  <Text style={styles.quickText}>Request</Text>
                </TouchableOpacity>
              </View>

              {/* Recent Payees */}
              <Text style={styles.sectionTitle}>Recent Payees</Text>
              <View style={styles.payeesList}>
                {payees.map((payee, index) => (
                  <TouchableOpacity
                    key={payee.id}
                    style={styles.payeeCard}
                    onPress={() => handleSelectPayee(payee)}
                  >
                    <View style={[styles.payeeAvatar, { backgroundColor: `hsl(${index * 40}, 70%, 50%)` }]}>
                      <Text style={styles.payeeAvatarText}>{payee.avatar}</Text>
                    </View>
                    <View style={styles.payeeInfo}>
                      <Text style={styles.payeeName}>{payee.name}</Text>
                      <Text style={styles.payeeUpi}>{payee.upi_id}</Text>
                    </View>
                    <View style={styles.payeeRight}>
                      <Text style={styles.lastPaid}>{payee.last_paid}</Text>
                      <Ionicons name="chevron-forward" size={18} color="#6B7280" />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Linked Accounts */}
              <Text style={styles.sectionTitle}>Linked Accounts</Text>
              {upiData?.linked_accounts?.map((account: any, index: number) => (
                <View key={account.id} style={styles.accountCard}>
                  <View style={[styles.bankIcon, { backgroundColor: index === 0 ? '#004C8F' : index === 1 ? '#F58220' : '#22409A' }]}>
                    <Text style={styles.bankInitial}>{account.bank.charAt(0)}</Text>
                  </View>
                  <View style={styles.accountInfo}>
                    <Text style={styles.bankName}>{account.bank}</Text>
                    <Text style={styles.accountNumber}>{account.account_number}</Text>
                  </View>
                  <View style={styles.accountRight}>
                    <Text style={styles.accountBalance}>{formatCurrency(account.balance)}</Text>
                    {account.is_primary && (
                      <View style={styles.primaryBadge}>
                        <Text style={styles.primaryText}>Primary</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}

              <View style={styles.bottomSpacing} />
            </ScrollView>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Selected Payee */}
              <View style={styles.selectedPayee}>
                <View style={[styles.payeeAvatarLarge, { backgroundColor: '#00D09C' }]}>
                  <Text style={styles.payeeAvatarTextLarge}>{selectedPayee?.avatar}</Text>
                </View>
                <Text style={styles.selectedName}>{selectedPayee?.name}</Text>
                <Text style={styles.selectedUpi}>{selectedPayee?.upi_id}</Text>
              </View>

              {/* Amount Input */}
              <View style={styles.amountContainer}>
                <Text style={styles.rupeeSymbol}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0"
                  placeholderTextColor="#6B7280"
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                  autoFocus
                />
              </View>

              {/* Quick Amounts */}
              <View style={styles.quickAmounts}>
                {[100, 200, 500, 1000, 2000].map((amt) => (
                  <TouchableOpacity
                    key={amt}
                    style={styles.quickAmountBtn}
                    onPress={() => setAmount(amt.toString())}
                  >
                    <Text style={styles.quickAmountText}>₹{amt}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Note */}
              <View style={styles.noteContainer}>
                <Ionicons name="chatbubble-outline" size={20} color="#6B7280" />
                <TextInput
                  style={styles.noteInput}
                  placeholder="Add a note (optional)"
                  placeholderTextColor="#6B7280"
                  value={note}
                  onChangeText={setNote}
                />
              </View>

              {/* Coins Preview */}
              {amount && parseFloat(amount) > 0 && (
                <View style={styles.coinsPreview}>
                  <Text style={styles.coinsPreviewText}>🪙 You'll earn {Math.floor(parseFloat(amount) / 50)} coins!</Text>
                </View>
              )}

              {/* Pay Button */}
              <TouchableOpacity
                style={[styles.payButton, (!amount || isPaying) && styles.payButtonDisabled]}
                onPress={handlePay}
                disabled={!amount || isPaying}
              >
                {isPaying ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.payButtonText}>Pay {amount ? formatCurrency(parseFloat(amount)) : ''}</Text>
                    <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.bottomSpacing} />
            </ScrollView>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E14' },
  loadingContainer: { flex: 1, backgroundColor: '#0A0E14', alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1A1F2E', alignItems: 'center', justifyContent: 'center' },
  qrButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1A1F2E', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  content: { flex: 1 },
  upiCard: { marginHorizontal: 20, backgroundColor: 'linear-gradient(135deg, #5B21B6 0%, #7C3AED 100%)', borderRadius: 20, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.3)' },
  upiCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  upiLogo: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  upiLogoText: { fontSize: 14, fontWeight: '800', color: '#5B21B6' },
  upiIdLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  upiId: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  limitBar: { marginTop: 8 },
  limitInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  limitLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  limitValue: { fontSize: 12, color: '#FFFFFF' },
  limitBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3 },
  limitBarFill: { height: '100%', backgroundColor: '#00D09C', borderRadius: 3 },
  quickActions: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 20, marginBottom: 24 },
  quickAction: { alignItems: 'center' },
  quickIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  quickText: { fontSize: 12, color: '#9CA3AF' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginHorizontal: 20, marginBottom: 12 },
  payeesList: { paddingHorizontal: 20 },
  payeeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1F2E', borderRadius: 14, padding: 14, marginBottom: 10 },
  payeeAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  payeeAvatarText: { fontSize: 18, fontWeight: '600', color: '#FFFFFF' },
  payeeInfo: { flex: 1, marginLeft: 12 },
  payeeName: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  payeeUpi: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  payeeRight: { flexDirection: 'row', alignItems: 'center' },
  lastPaid: { fontSize: 13, color: '#6B7280', marginRight: 8 },
  accountCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, backgroundColor: '#1A1F2E', borderRadius: 14, padding: 14, marginBottom: 10 },
  bankIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  bankInitial: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  accountInfo: { flex: 1, marginLeft: 12 },
  bankName: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  accountNumber: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  accountRight: { alignItems: 'flex-end' },
  accountBalance: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  primaryBadge: { backgroundColor: 'rgba(0, 208, 156, 0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 4 },
  primaryText: { fontSize: 10, color: '#00D09C' },
  selectedPayee: { alignItems: 'center', paddingVertical: 30 },
  payeeAvatarLarge: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  payeeAvatarTextLarge: { fontSize: 32, fontWeight: '600', color: '#FFFFFF' },
  selectedName: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  selectedUpi: { fontSize: 15, color: '#6B7280', marginTop: 4 },
  amountContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 20 },
  rupeeSymbol: { fontSize: 48, fontWeight: '300', color: '#6B7280' },
  amountInput: { fontSize: 56, fontWeight: '700', color: '#FFFFFF', minWidth: 100, textAlign: 'center' },
  quickAmounts: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 24 },
  quickAmountBtn: { backgroundColor: '#1A1F2E', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  quickAmountText: { fontSize: 14, color: '#FFFFFF' },
  noteContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, backgroundColor: '#1A1F2E', borderRadius: 12, paddingHorizontal: 16, marginBottom: 16 },
  noteInput: { flex: 1, paddingVertical: 14, paddingHorizontal: 10, fontSize: 15, color: '#FFFFFF' },
  coinsPreview: { alignItems: 'center', marginBottom: 20 },
  coinsPreviewText: { fontSize: 16, color: '#FBBF24', fontWeight: '600' },
  payButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 20, backgroundColor: '#00D09C', borderRadius: 14, paddingVertical: 18 },
  payButtonDisabled: { backgroundColor: '#2A3142' },
  payButtonText: { fontSize: 18, fontWeight: '600', color: '#FFFFFF', marginRight: 8 },
  bottomSpacing: { height: 40 },
  // Success Animation Styles
  successOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#0A0E14', alignItems: 'center', justifyContent: 'center' },
  floatingCoin: { position: 'absolute', zIndex: 10 },
  coinEmoji: { fontSize: 40 },
  successCard: { alignItems: 'center', backgroundColor: '#1A1F2E', borderRadius: 24, padding: 40, width: width - 60 },
  checkCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#00D09C', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  successText: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  successAmount: { fontSize: 36, fontWeight: '700', color: '#00D09C', marginBottom: 16 },
  coinsEarned: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(251, 191, 36, 0.15)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20 },
  coinsBounce: { fontSize: 24, marginRight: 8 },
  coinsEarnedText: { fontSize: 18, fontWeight: '600', color: '#FBBF24' },
});
