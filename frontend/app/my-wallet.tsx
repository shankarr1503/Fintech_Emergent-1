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
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { getAllAccounts } from '../src/services/api';
import { formatCurrency } from '../src/utils/format';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width - 60;
const CARD_HEIGHT = 200;

// Tinder-style swipeable card
const SwipeableCard = ({ account, index, totalCards, onSwipeLeft, onSwipeRight, isTop }: any) => {
  const pan = useRef(new Animated.ValueXY()).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const nextCardScale = useRef(new Animated.Value(0.95)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isTop,
      onMoveShouldSetPanResponder: () => isTop,
      onPanResponderMove: (_, gesture) => {
        pan.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > 120) {
          // Swipe right
          Animated.parallel([
            Animated.timing(pan, {
              toValue: { x: width + 100, y: gesture.dy },
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(cardOpacity, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ]).start(() => onSwipeRight && onSwipeRight());
        } else if (gesture.dx < -120) {
          // Swipe left
          Animated.parallel([
            Animated.timing(pan, {
              toValue: { x: -width - 100, y: gesture.dy },
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(cardOpacity, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ]).start(() => onSwipeLeft && onSwipeLeft());
        } else {
          // Return to center
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            friction: 5,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const rotate = pan.x.interpolate({
    inputRange: [-width / 2, 0, width / 2],
    outputRange: ['-15deg', '0deg', '15deg'],
  });

  const cardStyle = {
    transform: [
      { translateX: pan.x },
      { translateY: pan.y },
      { rotate },
      { scale: isTop ? 1 : 0.95 - index * 0.02 },
    ],
    opacity: cardOpacity,
    zIndex: totalCards - index,
    top: index * 8,
  };

  return (
    <Animated.View
      style={[styles.walletCard, { backgroundColor: account.card_color || '#3B82F6' }, cardStyle]}
      {...(isTop ? panResponder.panHandlers : {})}
    >
      {/* Card Shine Effect */}
      <View style={styles.cardShine} />
      
      {/* Card Content */}
      <View style={styles.cardHeader}>
        <View style={styles.cardLogo}>
          <Text style={styles.cardLogoText}>{account.bank?.charAt(0) || account.type?.charAt(0)}</Text>
        </View>
        <Text style={styles.cardType}>{account.type}</Text>
      </View>
      
      <Text style={styles.cardBank}>{account.bank || account.type}</Text>
      <Text style={styles.cardNumber}>{account.account_number || account.fd_number || account.rd_number}</Text>
      
      <View style={styles.cardFooter}>
        <View>
          <Text style={styles.cardLabel}>{account.balance ? 'Balance' : 'Value'}</Text>
          <Text style={styles.cardBalance}>{formatCurrency(account.balance || account.current_value || account.principal)}</Text>
        </View>
        {account.interest_rate && (
          <View style={styles.interestBadge}>
            <Text style={styles.interestText}>{account.interest_rate}% p.a.</Text>
          </View>
        )}
      </View>

      {/* Swipe Indicators */}
      {isTop && (
        <>
          <Animated.View style={[
            styles.swipeIndicator,
            styles.swipeLeft,
            { opacity: pan.x.interpolate({ inputRange: [-100, 0], outputRange: [1, 0] }) }
          ]}>
            <Ionicons name="close" size={32} color="#EF4444" />
          </Animated.View>
          <Animated.View style={[
            styles.swipeIndicator,
            styles.swipeRight,
            { opacity: pan.x.interpolate({ inputRange: [0, 100], outputRange: [0, 1] }) }
          ]}>
            <Ionicons name="heart" size={32} color="#10B981" />
          </Animated.View>
        </>
      )}
    </Animated.View>
  );
};

export default function MyWalletScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [accountsData, setAccountsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);

  useEffect(() => {
    if (!user?.id) {
      router.replace('/(auth)/login');
      return;
    }
    fetchAccounts();
  }, [user?.id]);

  const fetchAccounts = async () => {
    if (!user?.id) return;
    try {
      const data = await getAllAccounts(user.id);
      setAccountsData(data);
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAllCards = () => {
    if (!accountsData) return [];
    const cards: any[] = [];
    
    if (activeCategory === 'all' || activeCategory === 'bank') {
      accountsData.bank_accounts?.forEach((acc: any) => cards.push({ ...acc, category: 'bank' }));
    }
    if (activeCategory === 'all' || activeCategory === 'post_office') {
      accountsData.post_office_accounts?.forEach((acc: any) => cards.push({ ...acc, category: 'post_office', card_color: '#DC2626' }));
    }
    if (activeCategory === 'all' || activeCategory === 'fd') {
      accountsData.fixed_deposits?.forEach((acc: any) => cards.push({ ...acc, category: 'fd' }));
    }
    if (activeCategory === 'all' || activeCategory === 'rd') {
      accountsData.recurring_deposits?.forEach((acc: any) => cards.push({ ...acc, category: 'rd' }));
    }
    if (activeCategory === 'all' || activeCategory === 'ppf') {
      if (accountsData.ppf_account) {
        cards.push({ ...accountsData.ppf_account, category: 'ppf', type: 'PPF Account' });
      }
    }
    if (activeCategory === 'all' || activeCategory === 'nps') {
      if (accountsData.nps_account) {
        cards.push({ ...accountsData.nps_account, category: 'nps', type: 'NPS Account', current_value: accountsData.nps_account.total_corpus });
      }
    }
    
    return cards;
  };

  const cards = getAllCards();

  const handleSwipe = () => {
    if (currentCardIndex < cards.length - 1) {
      setCurrentCardIndex(prev => prev + 1);
    } else {
      setCurrentCardIndex(0);
    }
  };

  const categories = [
    { id: 'all', label: 'All', icon: 'wallet' },
    { id: 'bank', label: 'Banks', icon: 'business' },
    { id: 'post_office', label: 'Post Office', icon: 'mail' },
    { id: 'fd', label: 'FD', icon: 'lock-closed' },
    { id: 'rd', label: 'RD', icon: 'repeat' },
    { id: 'ppf', label: 'PPF', icon: 'shield' },
    { id: 'nps', label: 'NPS', icon: 'trending-up' },
  ];

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00D09C" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>My Wallet</Text>
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add" size={24} color="#00D09C" />
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Balance</Text>
            <Text style={styles.summaryValue}>{formatCurrency(accountsData?.summary?.total_balance || 0)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Deposits</Text>
            <Text style={styles.summaryValue}>{formatCurrency(accountsData?.summary?.total_deposits || 0)}</Text>
          </View>
        </View>
        <View style={styles.accountsCount}>
          <Ionicons name="card" size={16} color="#6B7280" />
          <Text style={styles.accountsCountText}>{accountsData?.summary?.accounts_count || 0} accounts linked</Text>
        </View>
      </View>

      {/* Categories */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.categoryPill, activeCategory === cat.id && styles.categoryPillActive]}
            onPress={() => {
              setActiveCategory(cat.id);
              setCurrentCardIndex(0);
            }}
          >
            <Ionicons
              name={cat.icon as any}
              size={16}
              color={activeCategory === cat.id ? '#FFFFFF' : '#6B7280'}
            />
            <Text style={[styles.categoryText, activeCategory === cat.id && styles.categoryTextActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Swipe Instructions */}
      <View style={styles.swipeInstructions}>
        <Ionicons name="hand-left" size={16} color="#6B7280" />
        <Text style={styles.swipeText}>Swipe cards to browse</Text>
        <Ionicons name="hand-right" size={16} color="#6B7280" />
      </View>

      {/* Card Stack */}
      <View style={styles.cardStack}>
        {cards.slice(currentCardIndex, currentCardIndex + 3).reverse().map((card, index, arr) => (
          <SwipeableCard
            key={card.id || index}
            account={card}
            index={arr.length - 1 - index}
            totalCards={arr.length}
            isTop={index === arr.length - 1}
            onSwipeLeft={handleSwipe}
            onSwipeRight={handleSwipe}
          />
        ))}
        {cards.length === 0 && (
          <View style={styles.emptyCard}>
            <Ionicons name="card-outline" size={48} color="#6B7280" />
            <Text style={styles.emptyText}>No accounts in this category</Text>
          </View>
        )}
      </View>

      {/* Card Counter */}
      <View style={styles.cardCounter}>
        <Text style={styles.counterText}>
          {cards.length > 0 ? `${currentCardIndex + 1} / ${cards.length}` : '0 / 0'}
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]} onPress={handleSwipe}>
          <Ionicons name="close" size={24} color="#EF4444" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.mainActionBtn]} onPress={() => router.push('/account-aggregator')}>
          <Ionicons name="add" size={28} color="#FFFFFF" />
          <Text style={styles.mainActionText}>Link Account</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]} onPress={handleSwipe}>
          <Ionicons name="heart" size={24} color="#10B981" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E14' },
  loadingContainer: { flex: 1, backgroundColor: '#0A0E14', alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1A1F2E', alignItems: 'center', justifyContent: 'center' },
  addButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1A1F2E', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  summaryCard: { marginHorizontal: 20, backgroundColor: '#1A1F2E', borderRadius: 16, padding: 16, marginBottom: 16 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  summaryValue: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  summaryDivider: { width: 1, height: 30, backgroundColor: '#2A3142' },
  accountsCount: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  accountsCountText: { fontSize: 13, color: '#6B7280', marginLeft: 8 },
  categoriesScroll: { paddingHorizontal: 20, marginBottom: 16 },
  categoryPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#1A1F2E', borderRadius: 20, marginRight: 10 },
  categoryPillActive: { backgroundColor: '#00D09C' },
  categoryText: { fontSize: 13, color: '#6B7280', marginLeft: 6 },
  categoryTextActive: { color: '#FFFFFF', fontWeight: '600' },
  swipeInstructions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  swipeText: { fontSize: 12, color: '#6B7280', marginHorizontal: 8 },
  cardStack: { flex: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  walletCard: { position: 'absolute', width: CARD_WIDTH, height: CARD_HEIGHT, borderRadius: 20, padding: 20, overflow: 'hidden' },
  cardShine: { position: 'absolute', top: -50, right: -50, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.1)' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  cardLogo: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  cardLogoText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  cardType: { fontSize: 12, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' },
  cardBank: { fontSize: 18, fontWeight: '600', color: '#FFFFFF', marginBottom: 4 },
  cardNumber: { fontSize: 14, color: 'rgba(255,255,255,0.8)', letterSpacing: 2, marginBottom: 20 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  cardLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginBottom: 4 },
  cardBalance: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  interestBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  interestText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },
  swipeIndicator: { position: 'absolute', top: 20, padding: 10, borderRadius: 30, borderWidth: 3 },
  swipeLeft: { left: 20, borderColor: '#EF4444' },
  swipeRight: { right: 20, borderColor: '#10B981' },
  emptyCard: { width: CARD_WIDTH, height: CARD_HEIGHT, borderRadius: 20, backgroundColor: '#1A1F2E', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderStyle: 'dashed', borderColor: '#2A3142' },
  emptyText: { fontSize: 14, color: '#6B7280', marginTop: 12 },
  cardCounter: { alignItems: 'center', marginBottom: 16 },
  counterText: { fontSize: 14, color: '#6B7280' },
  actionButtons: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, paddingBottom: 20 },
  actionBtn: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  mainActionBtn: { flexDirection: 'row', backgroundColor: '#00D09C', paddingHorizontal: 24, width: 'auto', borderRadius: 28, marginHorizontal: 20 },
  mainActionText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF', marginLeft: 8 },
});
