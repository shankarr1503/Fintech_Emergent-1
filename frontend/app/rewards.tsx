import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { getRewards, redeemReward } from '../src/services/api';

const BRAND_COLORS: Record<string, string> = {
  amazon: '#FF9900',
  swiggy: '#FC8019',
  uber: '#000000',
  bookmyshow: '#C4242B',
  myntra: '#FF3F6C',
  zomato: '#E23744',
  flipkart: '#2874F0',
  makemytrip: '#E74C3C',
};

export default function RewardsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [rewardsData, setRewardsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchRewards();
  }, []);

  const fetchRewards = async () => {
    if (!user?.id) return;
    try {
      const data = await getRewards(user.id);
      setRewardsData(data);
    } catch (error) {
      console.error('Failed to fetch rewards:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRedeem = async (deal: any) => {
    if (rewardsData.total_coins < deal.coins_required) {
      Alert.alert('Insufficient Coins', `You need ${deal.coins_required - rewardsData.total_coins} more coins to redeem this offer.`);
      return;
    }

    Alert.alert(
      'Redeem Reward',
      `Redeem ${deal.title} for ${deal.coins_required} coins?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Redeem',
          onPress: async () => {
            try {
              const result = await redeemReward(user!.id, deal.id, deal.coins_required);
              Alert.alert('Success! 🎉', `Your voucher code: ${result.voucher_code}\n\nValid until: ${result.valid_until}`);
              fetchRewards();
            } catch (error) {
              Alert.alert('Error', 'Failed to redeem reward');
            }
          },
        },
      ]
    );
  };

  const categories = ['all', 'shopping', 'food', 'transport', 'entertainment', 'travel'];

  const filteredDeals = selectedCategory === 'all' 
    ? rewardsData?.deals 
    : rewardsData?.deals?.filter((d: any) => d.category === selectedCategory);

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
          <Text style={styles.title}>Rewards Store</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Coins Balance */}
        <View style={styles.coinsCard}>
          <View style={styles.coinsLeft}>
            <View style={styles.coinIcon}>
              <Ionicons name="diamond" size={28} color="#FBBF24" />
            </View>
            <View>
              <Text style={styles.coinsLabel}>Your Coins</Text>
              <Text style={styles.coinsValue}>{rewardsData?.total_coins?.toLocaleString() || 0}</Text>
            </View>
          </View>
          <View style={styles.coinsRight}>
            <Text style={styles.coinsWorth}>Worth</Text>
            <Text style={styles.coinsAmount}>₹{rewardsData?.coins_value || 0}</Text>
            <View style={[styles.tierBadge, { backgroundColor: rewardsData?.tier === 'Platinum' ? '#E5E7EB' : rewardsData?.tier === 'Gold' ? '#FBBF24' : '#9CA3AF' }]}>
              <Text style={styles.tierText}>{rewardsData?.tier}</Text>
            </View>
          </View>
        </View>

        {/* How to Earn */}
        <View style={styles.earnCard}>
          <Text style={styles.earnTitle}>How to earn coins?</Text>
          <View style={styles.earnMethods}>
            <View style={styles.earnMethod}>
              <Ionicons name="card" size={20} color="#00D09C" />
              <Text style={styles.earnText}>Pay credit card bills</Text>
            </View>
            <View style={styles.earnMethod}>
              <Ionicons name="receipt" size={20} color="#00D09C" />
              <Text style={styles.earnText}>Pay utility bills</Text>
            </View>
            <View style={styles.earnMethod}>
              <Ionicons name="home" size={20} color="#00D09C" />
              <Text style={styles.earnText}>Pay rent</Text>
            </View>
          </View>
          <Text style={styles.earnNote}>Earn 1 coin for every ₹100 paid</Text>
        </View>

        {/* Categories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryPill, selectedCategory === cat && styles.categoryPillActive]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.categoryText, selectedCategory === cat && styles.categoryTextActive]}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Deals */}
        <Text style={styles.sectionTitle}>Available Rewards</Text>
        <View style={styles.dealsGrid}>
          {filteredDeals?.map((deal: any) => (
            <TouchableOpacity key={deal.id} style={styles.dealCard} onPress={() => handleRedeem(deal)}>
              <View style={[styles.dealLogo, { backgroundColor: BRAND_COLORS[deal.image] || '#3B82F6' }]}>
                <Text style={styles.dealLogoText}>{deal.brand.charAt(0)}</Text>
              </View>
              <Text style={styles.dealBrand}>{deal.brand}</Text>
              <Text style={styles.dealTitle} numberOfLines={2}>{deal.title}</Text>
              <Text style={styles.dealDiscount}>{deal.discount}</Text>
              <View style={styles.dealCoins}>
                <Ionicons name="diamond" size={14} color="#FBBF24" />
                <Text style={styles.dealCoinsText}>{deal.coins_required.toLocaleString()}</Text>
              </View>
            </TouchableOpacity>
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
  title: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  coinsCard: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 20, backgroundColor: 'linear-gradient(135deg, #1A1F2E 0%, #2A3142 100%)', borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.3)' },
  coinsLeft: { flexDirection: 'row', alignItems: 'center' },
  coinIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(251, 191, 36, 0.15)', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  coinsLabel: { fontSize: 13, color: '#6B7280' },
  coinsValue: { fontSize: 28, fontWeight: '700', color: '#FBBF24' },
  coinsRight: { alignItems: 'flex-end' },
  coinsWorth: { fontSize: 12, color: '#6B7280' },
  coinsAmount: { fontSize: 18, fontWeight: '600', color: '#FFFFFF' },
  tierBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginTop: 6 },
  tierText: { fontSize: 11, fontWeight: '600', color: '#0A0E14' },
  earnCard: { marginHorizontal: 20, backgroundColor: '#1A1F2E', borderRadius: 16, padding: 16, marginBottom: 20 },
  earnTitle: { fontSize: 15, fontWeight: '600', color: '#FFFFFF', marginBottom: 12 },
  earnMethods: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  earnMethod: { alignItems: 'center' },
  earnText: { fontSize: 11, color: '#9CA3AF', marginTop: 6, textAlign: 'center' },
  earnNote: { fontSize: 12, color: '#00D09C', textAlign: 'center' },
  categoriesScroll: { paddingHorizontal: 20, marginBottom: 20 },
  categoryPill: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#1A1F2E', borderRadius: 20, marginRight: 10 },
  categoryPillActive: { backgroundColor: '#00D09C' },
  categoryText: { fontSize: 13, color: '#6B7280' },
  categoryTextActive: { color: '#FFFFFF', fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#FFFFFF', marginHorizontal: 20, marginBottom: 16 },
  dealsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14 },
  dealCard: { width: '46%', backgroundColor: '#1A1F2E', borderRadius: 16, padding: 16, margin: '2%', alignItems: 'center' },
  dealLogo: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  dealLogoText: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  dealBrand: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  dealTitle: { fontSize: 14, fontWeight: '600', color: '#FFFFFF', textAlign: 'center', marginBottom: 4, height: 36 },
  dealDiscount: { fontSize: 11, color: '#00D09C', marginBottom: 8 },
  dealCoins: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(251, 191, 36, 0.15)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  dealCoinsText: { fontSize: 13, fontWeight: '600', color: '#FBBF24', marginLeft: 4 },
  bottomSpacing: { height: 40 },
});
