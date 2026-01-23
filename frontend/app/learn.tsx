import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { getCourses, getArticles, getLearningProgress } from '../src/services/api';

export default function LearnScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [articles, setArticles] = useState<any[]>([]);
  const [progress, setProgress] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('courses');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [coursesData, articlesData, progressData] = await Promise.all([
        getCourses(),
        getArticles(),
        user?.id ? getLearningProgress(user.id) : null,
      ]);
      setCourses(coursesData);
      setArticles(articlesData);
      setProgress(progressData);
    } catch (error) {
      console.error('Failed to fetch learning data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getLevelProgress = () => {
    if (!progress) return 0;
    return ((progress.total_xp % 500) / 500) * 100;
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
          <Text style={styles.title}>Learn & Earn</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Progress Card */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>Level {progress?.level || 1}</Text>
            </View>
            <View style={styles.xpContainer}>
              <Ionicons name="star" size={16} color="#FBBF24" />
              <Text style={styles.xpText}>{progress?.total_xp || 0} XP</Text>
            </View>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${getLevelProgress()}%` }]} />
          </View>
          <Text style={styles.progressLabel}>{500 - (progress?.total_xp % 500 || 0)} XP to next level</Text>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{progress?.courses_completed || 0}</Text>
              <Text style={styles.statLabel}>Courses</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{progress?.articles_read || 0}</Text>
              <Text style={styles.statLabel}>Articles</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{progress?.streak_days || 0}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{progress?.badges_earned?.length || 1}</Text>
              <Text style={styles.statLabel}>Badges</Text>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'courses' && styles.tabActive]}
            onPress={() => setActiveTab('courses')}
          >
            <Ionicons name="school" size={18} color={activeTab === 'courses' ? '#00D09C' : '#6B7280'} />
            <Text style={[styles.tabText, activeTab === 'courses' && styles.tabTextActive]}>Courses</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'articles' && styles.tabActive]}
            onPress={() => setActiveTab('articles')}
          >
            <Ionicons name="newspaper" size={18} color={activeTab === 'articles' ? '#00D09C' : '#6B7280'} />
            <Text style={[styles.tabText, activeTab === 'articles' && styles.tabTextActive]}>Articles</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {activeTab === 'courses' ? (
          <View style={styles.coursesList}>
            {courses.map((course) => (
              <TouchableOpacity key={course.id} style={styles.courseCard}>
                <View style={styles.courseHeader}>
                  <View style={styles.courseBadge}>
                    <Ionicons name="trophy" size={20} color="#FBBF24" />
                  </View>
                  <View style={styles.courseLevel}>
                    <Text style={styles.courseLevelText}>{course.level}</Text>
                  </View>
                </View>
                <Text style={styles.courseTitle}>{course.title}</Text>
                <Text style={styles.courseDesc}>{course.description}</Text>
                <View style={styles.courseMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons name="book" size={14} color="#6B7280" />
                    <Text style={styles.metaText}>{course.modules} modules</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="time" size={14} color="#6B7280" />
                    <Text style={styles.metaText}>{course.duration}</Text>
                  </View>
                </View>
                <View style={styles.courseFooter}>
                  <View style={styles.courseRating}>
                    <Ionicons name="star" size={14} color="#FBBF24" />
                    <Text style={styles.ratingText}>{course.rating}</Text>
                    <Text style={styles.enrolledText}>({course.enrolled.toLocaleString()} enrolled)</Text>
                  </View>
                  <TouchableOpacity style={styles.startButton}>
                    <Text style={styles.startButtonText}>Start</Text>
                    <Ionicons name="play" size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.articlesList}>
            {articles.map((article) => (
              <TouchableOpacity key={article.id} style={styles.articleCard}>
                <View style={styles.articleContent}>
                  <View style={styles.articleCategory}>
                    <Text style={styles.categoryText}>{article.category}</Text>
                  </View>
                  <Text style={styles.articleTitle}>{article.title}</Text>
                  <Text style={styles.articleSummary}>{article.summary}</Text>
                  <View style={styles.articleMeta}>
                    <Text style={styles.articleAuthor}>{article.author}</Text>
                    <Text style={styles.articleDot}>•</Text>
                    <Text style={styles.articleTime}>{article.read_time}</Text>
                  </View>
                </View>
                <View style={styles.articleStats}>
                  <View style={styles.statRow}>
                    <Ionicons name="heart" size={14} color="#EF4444" />
                    <Text style={styles.statText}>{article.likes}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
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
  progressCard: { marginHorizontal: 20, backgroundColor: '#1A1F2E', borderRadius: 20, padding: 20, marginBottom: 20 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  levelBadge: { backgroundColor: 'rgba(0, 208, 156, 0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  levelText: { fontSize: 14, fontWeight: '600', color: '#00D09C' },
  xpContainer: { flexDirection: 'row', alignItems: 'center' },
  xpText: { fontSize: 14, fontWeight: '600', color: '#FBBF24', marginLeft: 6 },
  progressBar: { height: 8, backgroundColor: '#2A3142', borderRadius: 4, marginBottom: 8 },
  progressFill: { height: '100%', backgroundColor: '#00D09C', borderRadius: 4 },
  progressLabel: { fontSize: 12, color: '#6B7280', marginBottom: 16 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  statLabel: { fontSize: 11, color: '#6B7280', marginTop: 4 },
  tabs: { flexDirection: 'row', marginHorizontal: 20, backgroundColor: '#1A1F2E', borderRadius: 12, padding: 4, marginBottom: 20 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10 },
  tabActive: { backgroundColor: '#2A3142' },
  tabText: { fontSize: 14, color: '#6B7280', marginLeft: 8 },
  tabTextActive: { color: '#00D09C', fontWeight: '600' },
  coursesList: { paddingHorizontal: 20 },
  courseCard: { backgroundColor: '#1A1F2E', borderRadius: 16, padding: 16, marginBottom: 12 },
  courseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  courseBadge: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(251, 191, 36, 0.15)', alignItems: 'center', justifyContent: 'center' },
  courseLevel: { backgroundColor: '#2A3142', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  courseLevelText: { fontSize: 11, color: '#6B7280' },
  courseTitle: { fontSize: 17, fontWeight: '600', color: '#FFFFFF', marginBottom: 6 },
  courseDesc: { fontSize: 13, color: '#9CA3AF', marginBottom: 12, lineHeight: 20 },
  courseMeta: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center' },
  metaText: { fontSize: 12, color: '#6B7280', marginLeft: 6 },
  courseFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  courseRating: { flexDirection: 'row', alignItems: 'center' },
  ratingText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF', marginLeft: 4 },
  enrolledText: { fontSize: 12, color: '#6B7280', marginLeft: 6 },
  startButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#00D09C', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  startButtonText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF', marginRight: 6 },
  articlesList: { paddingHorizontal: 20 },
  articleCard: { flexDirection: 'row', backgroundColor: '#1A1F2E', borderRadius: 16, padding: 16, marginBottom: 12 },
  articleContent: { flex: 1 },
  articleCategory: { alignSelf: 'flex-start', backgroundColor: '#2A3142', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 8 },
  categoryText: { fontSize: 11, color: '#00D09C' },
  articleTitle: { fontSize: 15, fontWeight: '600', color: '#FFFFFF', marginBottom: 6 },
  articleSummary: { fontSize: 13, color: '#9CA3AF', marginBottom: 10, lineHeight: 20 },
  articleMeta: { flexDirection: 'row', alignItems: 'center' },
  articleAuthor: { fontSize: 12, color: '#6B7280' },
  articleDot: { fontSize: 12, color: '#6B7280', marginHorizontal: 6 },
  articleTime: { fontSize: 12, color: '#6B7280' },
  articleStats: { justifyContent: 'center', marginLeft: 12 },
  statRow: { flexDirection: 'row', alignItems: 'center' },
  statText: { fontSize: 12, color: '#6B7280', marginLeft: 4 },
  bottomSpacing: { height: 40 },
});
