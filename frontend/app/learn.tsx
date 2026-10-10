import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { completeModule, errorMessage, getArticles, getCourses, getLearningProgress } from '../src/services/api';
import { useGame } from '../src/game/GameContext';
import { useUserData } from '../src/game/useData';
import { Alert } from '../src/ui/dialog';
import { Body, Card, Divider, Label, Pill, Progress, Row, Screen, Section, Sheet, SkeletonScreen, Small, Strong, Title } from '../src/ui/kit';
import { C, tintFor } from '../src/ui/theme';

type Course = { id: string; title: string; description: string; modules: number; duration: string; level: string; rating: number; instructor: string; topics: string[]; badge: string };

export default function Learn() {
  const { celebrate } = useGame();
  const [open, setOpen] = useState<Course | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const { data, loading, refreshing, refresh, reload, userId } = useUserData(async (id) => {
    const [courses, articles, progress] = await Promise.all([getCourses(), getArticles(), getLearningProgress(id)]);
    return { courses: courses as Course[], articles: articles as any[], progress };
  });

  if (loading || !data)
    return (
      <Screen title="Learn">
        <SkeletonScreen />
      </Screen>
    );

  const done = new Set<string>(data.progress.modules_done ?? []);
  const count = (c: Course) => c.topics.filter((_, i) => done.has(`${c.id}:${i}`)).length;
  const inProgress = data.courses.find((c) => count(c) > 0 && count(c) < c.topics.length);

  const finish = async (c: Course, i: number) => {
    const key = `${c.id}:${i}`;
    if (done.has(key)) return;
    setBusy(key);
    try {
      const res = await completeModule(userId, c.id, String(i));
      celebrate(`Lesson done: ${c.topics[i]}`, res.reward);
      reload();
    } catch (e) {
      Alert.alert("Couldn't save progress", errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen title="Learn" kicker="Five minutes a day" refreshing={refreshing} onRefresh={refresh}>
      <Body style={{ marginTop: 6 }}>Short lessons from people who&apos;ve made the mistakes already. Each one earns 50 XP.</Body>

      {inProgress && (
        <Card dark style={{ marginTop: 18 }} onPress={() => setOpen(inProgress)} accessibilityLabel={`Continue ${inProgress.title}`}>
          <Label color={C.nightMuted}>Continue</Label>
          <Title color={C.nightText} style={{ marginTop: 6 }}>{inProgress.title}</Title>
          <View style={{ marginTop: 14 }}>
            <Progress value={count(inProgress)} max={inProgress.topics.length} color={C.gold} track={C.night3} height={4} />
          </View>
          <Small color={C.nightMuted} style={{ marginTop: 6 }}>
            {count(inProgress)} of {inProgress.topics.length} lessons
          </Small>
        </Card>
      )}

      <Section title="Courses">
        <View style={{ gap: 10 }}>
          {data.courses.map((c) => {
            const n = count(c);
            const t = tintFor(c.title);
            return (
              <Card key={c.id} onPress={() => setOpen(c)} accessibilityLabel={c.title} padded={false}>
                <View style={[styles.cover, { backgroundColor: t.bg }]}>
                  <Feather name="book-open" size={20} color={t.fg} />
                  <Pill label={c.level} />
                </View>
                <View style={{ padding: 16 }}>
                  <Strong style={{ fontSize: 16 }}>{c.title}</Strong>
                  <Small style={{ marginTop: 2 }}>
                    {c.instructor} · {c.duration} · ★ {c.rating}
                  </Small>
                  {n > 0 && (
                    <View style={{ marginTop: 12 }}>
                      <Progress value={n} max={c.topics.length} color={n === c.topics.length ? C.green : C.ink} height={4} />
                    </View>
                  )}
                </View>
              </Card>
            );
          })}
        </View>
      </Section>

      <Section title="Quick reads">
        <Card padded={false} style={{ paddingHorizontal: 16 }}>
          {data.articles.map((a, i) => (
            <View key={a.id}>
              {i > 0 && <Divider />}
              <Row title={a.title} subtitle={`${a.category} · ${a.read_time}`} />
            </View>
          ))}
        </Card>
      </Section>

      <Sheet visible={!!open} onClose={() => setOpen(null)} title={open?.title ?? ''}>
        {open && (
          <>
            <Body style={{ marginBottom: 12 }}>{open.description}</Body>
            {open.topics.map((t, i) => {
              const key = `${open.id}:${i}`;
              const isDone = done.has(key);
              return (
                <Pressable key={key} onPress={() => finish(open, i)} disabled={isDone || busy === key} style={styles.lesson} accessibilityRole="button" accessibilityLabel={`Lesson ${i + 1}: ${t}${isDone ? ', done' : ''}`}>
                  <View style={[styles.num, isDone && { backgroundColor: C.green, borderColor: C.green }]}>
                    {isDone ? <Feather name="check" size={14} color="#fff" /> : <Small color={C.ink}>{i + 1}</Small>}
                  </View>
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Strong color={isDone ? C.ink3 : C.ink}>{t}</Strong>
                    <Small>{isDone ? 'Done' : busy === key ? 'Saving…' : 'Tap to complete · +50 XP'}</Small>
                  </View>
                  {!isDone && <Feather name="play-circle" size={22} color={C.ink} />}
                </Pressable>
              );
            })}
            <Small style={{ marginTop: 12 }}>Finish every lesson to earn the {open.badge} badge.</Small>
          </>
        )}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cover: { height: 72, borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lesson: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  num: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: C.lineStrong, alignItems: 'center', justifyContent: 'center' },
});
