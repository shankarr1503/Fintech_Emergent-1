import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getCommunityPosts } from '../src/services/api';

export default function CommunityScreen() {
  const router = useRouter();
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const data = await getCommunityPosts();
      setPosts(data);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filters = ['all', 'Success Story', 'Investment', 'Advice', 'Expert Advice'];

  const filteredPosts = activeFilter === 'all' 
    ? posts 
    : posts.filter(p => p.category === activeFilter);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Success Story': return '#10B981';
      case 'Investment': return '#3B82F6';
      case 'Advice': return '#F59E0B';
      case 'Expert Advice': return '#8B5CF6';
      default: return '#6B7280';
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
          <Text style={styles.title}>Community</Text>
          <TouchableOpacity style={styles.notifButton}>
            <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search discussions..."
            placeholderTextColor="#6B7280"
          />
        </View>

        {/* Quick Stats */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>12.5K</Text>
            <Text style={styles.statLabel}>Members</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>2.3K</Text>
            <Text style={styles.statLabel}>Discussions</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>156</Text>
            <Text style={styles.statLabel}>Online</Text>
          </View>
        </View>

        {/* Create Post */}
        <TouchableOpacity style={styles.createPostCard}>
          <View style={styles.createAvatar}>
            <Ionicons name="person" size={20} color="#6B7280" />
          </View>
          <Text style={styles.createPlaceholder}>Share your financial journey...</Text>
          <View style={styles.createButton}>
            <Ionicons name="create" size={20} color="#00D09C" />
          </View>
        </TouchableOpacity>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterPill, activeFilter === filter && styles.filterPillActive]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text style={[styles.filterText, activeFilter === filter && styles.filterTextActive]}>
                {filter === 'all' ? 'All Posts' : filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Posts */}
        {filteredPosts.map((post) => (
          <TouchableOpacity key={post.id} style={styles.postCard}>
            {/* Post Header */}
            <View style={styles.postHeader}>
              <View style={styles.authorAvatar}>
                <Text style={styles.avatarText}>{post.avatar}</Text>
              </View>
              <View style={styles.authorInfo}>
                <View style={styles.authorRow}>
                  <Text style={styles.authorName}>{post.author}</Text>
                  {post.verified && (
                    <View style={styles.verifiedBadge}>
                      <Ionicons name="checkmark-circle" size={14} color="#3B82F6" />
                    </View>
                  )}
                </View>
                <Text style={styles.postTime}>{post.timestamp}</Text>
              </View>
              <View style={[styles.categoryBadge, { backgroundColor: `${getCategoryColor(post.category)}20` }]}>
                <Text style={[styles.categoryText, { color: getCategoryColor(post.category) }]}>
                  {post.category}
                </Text>
              </View>
            </View>

            {/* Post Content */}
            <Text style={styles.postTitle}>{post.title}</Text>
            <Text style={styles.postContent} numberOfLines={3}>{post.content}</Text>

            {/* Post Actions */}
            <View style={styles.postActions}>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="heart-outline" size={20} color="#6B7280" />
                <Text style={styles.actionText}>{post.likes}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="chatbubble-outline" size={20} color="#6B7280" />
                <Text style={styles.actionText}>{post.comments}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="share-outline" size={20} color="#6B7280" />
                <Text style={styles.actionText}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="bookmark-outline" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}

        {/* Join Expert Session */}
        <View style={styles.expertCard}>
          <View style={styles.expertBadge}>
            <Ionicons name="videocam" size={24} color="#8B5CF6" />
          </View>
          <View style={styles.expertInfo}>
            <Text style={styles.expertTitle}>Live Expert Session</Text>
            <Text style={styles.expertDesc}>Join CA Rachana Ranade for Tax Planning Tips</Text>
            <Text style={styles.expertTime}>Tomorrow, 7 PM</Text>
          </View>
          <TouchableOpacity style={styles.joinButton}>
            <Text style={styles.joinButtonText}>Remind</Text>
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
  notifButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1A1F2E', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, backgroundColor: '#1A1F2E', borderRadius: 12, paddingHorizontal: 14, marginBottom: 16 },
  searchInput: { flex: 1, paddingVertical: 12, paddingHorizontal: 10, fontSize: 15, color: '#FFFFFF' },
  statsCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, backgroundColor: '#1A1F2E', borderRadius: 16, padding: 16, marginBottom: 16 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  statLabel: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  statDivider: { width: 1, height: 30, backgroundColor: '#2A3142' },
  createPostCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, backgroundColor: '#1A1F2E', borderRadius: 14, padding: 14, marginBottom: 16 },
  createAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#2A3142', alignItems: 'center', justifyContent: 'center' },
  createPlaceholder: { flex: 1, fontSize: 14, color: '#6B7280', marginLeft: 12 },
  createButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0, 208, 156, 0.15)', alignItems: 'center', justifyContent: 'center' },
  filtersScroll: { paddingHorizontal: 20, marginBottom: 16 },
  filterPill: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#1A1F2E', borderRadius: 20, marginRight: 10 },
  filterPillActive: { backgroundColor: '#00D09C' },
  filterText: { fontSize: 13, color: '#6B7280' },
  filterTextActive: { color: '#FFFFFF', fontWeight: '600' },
  postCard: { marginHorizontal: 20, backgroundColor: '#1A1F2E', borderRadius: 16, padding: 16, marginBottom: 12 },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  authorAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#00D09C', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '600', color: '#FFFFFF' },
  authorInfo: { flex: 1, marginLeft: 12 },
  authorRow: { flexDirection: 'row', alignItems: 'center' },
  authorName: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  verifiedBadge: { marginLeft: 6 },
  postTime: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  categoryBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  categoryText: { fontSize: 11, fontWeight: '600' },
  postTitle: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginBottom: 8 },
  postContent: { fontSize: 14, color: '#9CA3AF', lineHeight: 22, marginBottom: 12 },
  postActions: { flexDirection: 'row', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#2A3142' },
  actionButton: { flexDirection: 'row', alignItems: 'center', marginRight: 24 },
  actionText: { fontSize: 13, color: '#6B7280', marginLeft: 6 },
  expertCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, backgroundColor: 'rgba(139, 92, 246, 0.1)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.3)', marginTop: 8 },
  expertBadge: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(139, 92, 246, 0.2)', alignItems: 'center', justifyContent: 'center' },
  expertInfo: { flex: 1, marginLeft: 12 },
  expertTitle: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  expertDesc: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  expertTime: { fontSize: 11, color: '#8B5CF6', marginTop: 4 },
  joinButton: { backgroundColor: '#8B5CF6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  joinButtonText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  bottomSpacing: { height: 40 },
});
