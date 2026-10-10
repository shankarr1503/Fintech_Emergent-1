import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getCommunityPosts, getLeaderboard } from '../src/services/api';
import { useUserData } from '../src/game/useData';
import { Avatar, Body, Card, Divider, Pill, Row, Screen, Segmented, SkeletonScreen, Small, Strong } from '../src/ui/kit';
import { C, F } from '../src/ui/theme';

export default function Community() {
  const [tab, setTab] = useState<'posts' | 'board'>('posts');
  const { data, loading, refreshing, refresh } = useUserData(async (id) => {
    const [posts, board] = await Promise.all([getCommunityPosts(), getLeaderboard(id)]);
    return { posts: posts as any[], board: board as { rank: number; name: string; xp: number; level: number; is_you: boolean }[] };
  });

  return (
    <Screen title="Community" refreshing={refreshing} onRefresh={refresh}>
      <View style={{ marginTop: 14 }}>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'posts', label: 'Discussions' },
            { value: 'board', label: 'Leaderboard' },
          ]}
        />
      </View>
      {loading || !data ? (
        <SkeletonScreen />
      ) : tab === 'posts' ? (
        <View style={{ marginTop: 16, gap: 10 }}>
          {data.posts.map((p) => (
            <Card key={p.id}>
              <View style={styles.row}>
                <Avatar name={p.author} size={36} />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <View style={styles.row}>
                    <Strong>{p.author}</Strong>
                    {p.verified && <Feather name="check-circle" size={13} color={C.blue} style={{ marginLeft: 5 }} />}
                  </View>
                  <Small>{p.timestamp}</Small>
                </View>
                <Pill label={p.category} />
              </View>
              <Strong style={{ marginTop: 14, fontSize: 16, lineHeight: 22 }}>{p.title}</Strong>
              <Body style={{ marginTop: 4, fontSize: 14 }}>{p.content}</Body>
              <View style={[styles.row, { marginTop: 14, gap: 18 }]}>
                <View style={styles.row}>
                  <Feather name="heart" size={15} color={C.ink3} />
                  <Small style={{ marginLeft: 5 }}>{p.likes}</Small>
                </View>
                <View style={styles.row}>
                  <Feather name="message-circle" size={15} color={C.ink3} />
                  <Small style={{ marginLeft: 5 }}>{p.comments}</Small>
                </View>
              </View>
            </Card>
          ))}
        </View>
      ) : (
        <Card padded={false} style={{ marginTop: 16, paddingHorizontal: 16 }}>
          {data.board.map((r, i) => (
            <View key={`${r.rank}-${r.name}`}>
              {i > 0 && <Divider inset={86} />}
              <Row
                left={
                  <View style={styles.row}>
                    <Small style={{ width: 28, fontFamily: F.semibold, color: r.rank <= 3 ? C.goldDeep : C.ink3 }}>{r.rank}</Small>
                    <Avatar name={r.is_you ? '' : r.name} size={40} />
                  </View>
                }
                title={r.is_you ? `${r.name} (you)` : r.name}
                subtitle={`Level ${r.level}`}
                right={<Strong color={r.is_you ? C.goldDeep : C.ink}>{r.xp.toLocaleString('en-IN')} XP</Strong>}
              />
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
