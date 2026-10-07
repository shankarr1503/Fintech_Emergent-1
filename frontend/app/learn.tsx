import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Alert } from '../src/game/dialog';
import { completeModule, errorMessage, getArticles, getCourses, getLearningProgress } from '../src/services/api';
import { useGame } from '../src/game/GameContext';
import { useUserData } from '../src/game/useData';
import { BORDER, C } from '../src/game/theme';
import { Body, Box, Loading, PixelSheet, PText, Screen, SectionTitle, SegmentBar, Sprite, Stat } from '../src/game/ui';

type Course = { id: string; title: string; description: string; modules: number; duration: string; level: string; rating: number; enrolled: number; instructor: string; topics: string[]; badge: string };

const LEVEL_COLOR: Record<string, string> = { Beginner: C.pipeLight, Intermediate: C.coin, Advanced: C.orange };

export default function AcademyScreen() {
  const { celebrate } = useGame();
  const [open, setOpen] = useState<Course | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const { data, loading, refreshing, refresh, reload, userId } = useUserData(async (id) => {
    const [courses, articles, progress] = await Promise.all([getCourses(), getArticles(), getLearningProgress(id)]);
    return { courses: courses as Course[], articles: articles as any[], progress };
  });

  if (loading || !data) return <Loading label="OPENING ACADEMY" />;
  const done = new Set<string>(data.progress.modules_done ?? []);
  const doneIn = (c: Course) => c.topics.filter((_, i) => done.has(`${c.id}:${i}`)).length;

  const play = async (course: Course, index: number) => {
    const key = `${course.id}:${index}`;
    if (done.has(key)) return;
    setBusy(key);
    try {
      const res = await completeModule(userId, course.id, String(index));
      celebrate('LESSON CLEAR!', res.reward);
      reload();
    } catch (e) {
      Alert.alert('Could not save progress', errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen title="ACADEMY" subtitle="LEARN MONEY, EARN XP" refreshing={refreshing} onRefresh={refresh} ground>
      <Box>
        <View style={styles.between}>
          <Stat label="Lessons" value={String(done.size)} />
          <Stat label="Academy XP" value={String(data.progress.total_xp)} color={C.blue} align="center" />
          <Stat label="Rank" value={`LV ${data.progress.level}`} align="right" />
        </View>
      </Box>

      <SectionTitle>LEVEL SELECT</SectionTitle>
      {data.courses.map((c, i) => {
        const n = doneIn(c);
        const complete = n === c.topics.length;
        return (
          <Pressable key={c.id} onPress={() => setOpen(c)} accessibilityRole="button" accessibilityLabel={c.title}>
            <Box style={{ marginBottom: 12 }} color={complete ? '#D7F5B0' : C.paper}>
              <View style={styles.row}>
                <View style={styles.levelNum}>
                  <PText size={7} color={C.white}>
                    W{Math.floor(i / 3) + 1}
                  </PText>
                  <PText size={12} color={C.coin} style={{ marginTop: 4 }}>
                    {(i % 3) + 1}
                  </PText>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <PText size={9}>{c.title.toUpperCase()}</PText>
                  <Body size={12} style={{ marginTop: 4 }}>
                    {c.instructor} • {c.duration}
                  </Body>
                  <View style={[styles.row, { marginTop: 6 }]}>
                    <View style={[styles.tag, { backgroundColor: LEVEL_COLOR[c.level] ?? C.gray }]}>
                      <PText size={6}>{c.level.toUpperCase()}</PText>
                    </View>
                    <PText size={7} style={{ marginLeft: 8 }}>
                      {'★'.repeat(Math.round(c.rating))} {c.rating}
                    </PText>
                  </View>
                </View>
                {complete ? <Sprite name="trophy" scale={3} /> : <Sprite name="book" scale={3} />}
              </View>
              <View style={{ marginTop: 12 }}>
                <SegmentBar value={n} max={c.topics.length} segments={c.topics.length} height={8} color={C.blue} track={C.paperDark} />
              </View>
              <PText size={6} color={C.textMuted} style={{ marginTop: 6 }}>
                {n}/{c.topics.length} LESSONS • BADGE: {c.badge.toUpperCase()}
              </PText>
            </Box>
          </Pressable>
        );
      })}

      <SectionTitle>SIDE QUESTS • READS</SectionTitle>
      {data.articles.map((a) => (
        <Box key={a.id} style={{ marginBottom: 10 }} padding={12}>
          <PText size={7} color={C.blue}>
            {a.category.toUpperCase()} • {a.read_time.toUpperCase()}
          </PText>
          <Body bold color={C.text} style={{ marginTop: 6 }}>
            {a.title}
          </Body>
          <Body size={12} style={{ marginTop: 4 }}>
            {a.summary}
          </Body>
        </Box>
      ))}

      <PixelSheet visible={!!open} onClose={() => setOpen(null)} title={open?.title.toUpperCase() ?? ''}>
        {open && (
          <>
            <Body style={{ marginBottom: 14 }}>{open.description}</Body>
            {open.topics.map((t, i) => {
              const key = `${open.id}:${i}`;
              const isDone = done.has(key);
              return (
                <Pressable
                  key={key}
                  onPress={() => play(open, i)}
                  disabled={isDone || busy === key}
                  style={[styles.lesson, isDone && { backgroundColor: '#D7F5B0' }]}
                  accessibilityRole="button"
                  accessibilityLabel={`Lesson ${i + 1}: ${t}`}
                >
                  <View style={[styles.lessonNum, isDone && { backgroundColor: C.pipe }]}>
                    <PText size={9} color={C.white}>
                      {isDone ? '✓' : i + 1}
                    </PText>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <PText size={8}>{t.toUpperCase()}</PText>
                    <Body size={12} style={{ marginTop: 3 }}>
                      {isDone ? 'Cleared' : busy === key ? 'Saving...' : 'Tap to play • +50 XP'}
                    </Body>
                  </View>
                  {!isDone && <Sprite name="star" scale={2} />}
                </Pressable>
              );
            })}
          </>
        )}
      </PixelSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  levelNum: { width: 50, height: 56, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', borderWidth: BORDER, borderColor: C.ink },
  tag: { borderWidth: 2, borderColor: C.ink, paddingHorizontal: 6, paddingVertical: 3 },
  lesson: { flexDirection: 'row', alignItems: 'center', padding: 10, borderWidth: BORDER, borderColor: C.ink, backgroundColor: C.white, marginBottom: 8 },
  lessonNum: { width: 32, height: 32, backgroundColor: C.blue, borderWidth: 2, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },
});
