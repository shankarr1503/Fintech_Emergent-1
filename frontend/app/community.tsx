import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { getCommunityPosts, getLeaderboard } from '../src/services/api';
import { useUserData } from '../src/game/useData';
import { BORDER, C } from '../src/game/theme';
import { Body, Box, Chip, Loading, PText, Screen, SectionTitle, Sprite } from '../src/game/ui';

const AVATAR_COLORS = [C.red, C.blue, C.pipe, C.purple, C.orange];
const MEDALS = [C.coin, C.gray, C.brickLight];

export default function GuildScreen() {
  const [tab, setTab] = useState<'posts' | 'ranks'>('ranks');
  const { data, loading, refreshing, refresh } = useUserData(async (id) => {
    const [posts, board] = await Promise.all([getCommunityPosts(), getLeaderboard(id)]);
    return { posts: posts as any[], board: board as { rank: number; name: string; xp: number; level: number; is_you: boolean }[] };
  });

  if (loading || !data) return <Loading label="ENTERING GUILD" />;
  const me = data.board.find((r) => r.is_you);

  return (
    <Screen title="GUILD HALL" subtitle="THE 1% CLUB OF SAVERS" world="night" refreshing={refreshing} onRefresh={refresh}>
      <View style={{ flexDirection: 'row', marginBottom: 14 }}>
        <Chip label="Leaderboard" active={tab === 'ranks'} onPress={() => setTab('ranks')} />
        <Chip label="Discussions" active={tab === 'posts'} onPress={() => setTab('posts')} color={C.cyan} />
      </View>

      {tab === 'ranks' ? (
        <>
          {me && (
            <Box color={C.coin}>
              <View style={styles.row}>
                <Sprite name="hero" scale={3} />
                <View style={{ marginLeft: 14 }}>
                  <PText size={8}>YOUR RANK</PText>
                  <PText size={20} style={{ marginTop: 6 }}>
                    #{me.rank}
                  </PText>
                  <Body size={12} color={C.text}>
                    {me.xp.toLocaleString('en-IN')} XP • LV {me.level}
                  </Body>
                </View>
              </View>
            </Box>
          )}
          <SectionTitle>HIGH SCORES</SectionTitle>
          <Box color={C.ink} padding={12}>
            {data.board.map((r) => (
              <View key={`${r.rank}-${r.name}`} style={[styles.scoreRow, r.is_you && styles.scoreYou]}>
                <View style={[styles.rank, { backgroundColor: MEDALS[r.rank - 1] ?? C.grayDark }]}>
                  <PText size={8}>{r.rank}</PText>
                </View>
                <PText size={9} color={r.is_you ? C.coin : C.white} style={{ flex: 1, marginLeft: 12 }} numberOfLines={1}>
                  {r.name.toUpperCase()}
                  {r.is_you ? ' (YOU)' : ''}
                </PText>
                <PText size={8} color={C.cyan}>
                  LV{r.level}
                </PText>
                <PText size={9} color={C.white} style={{ width: 80, textAlign: 'right' }}>
                  {r.xp.toLocaleString('en-IN')}
                </PText>
              </View>
            ))}
          </Box>
          <Body size={12} color={C.gray} center style={{ marginTop: 10 }}>
            Earn XP by paying bills on time, saving and beating debt bosses.
          </Body>
        </>
      ) : (
        data.posts.map((p, i) => (
          <View key={p.id} style={{ marginBottom: 16 }}>
            <View style={[styles.row, { marginBottom: 8 }]}>
              <View style={[styles.avatar, { backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }]}>
                <PText size={12} color={C.white}>
                  {p.avatar}
                </PText>
              </View>
              <View style={{ marginLeft: 10 }}>
                <PText size={8} color={C.white}>
                  {p.author.toUpperCase()} {p.verified ? '★' : ''}
                </PText>
                <PText size={6} color={C.gray} style={{ marginTop: 4 }}>
                  {p.category.toUpperCase()} • {p.timestamp.toUpperCase()}
                </PText>
              </View>
            </View>
            <Box>
              <Body bold color={C.text}>
                {p.title}
              </Body>
              <Body size={13} style={{ marginTop: 6 }}>
                {p.content}
              </Body>
              <View style={[styles.row, { marginTop: 10, gap: 16 }]}>
                <View style={styles.row}>
                  <Sprite name="heart" scale={2} />
                  <PText size={8} style={{ marginLeft: 6 }}>
                    {p.likes}
                  </PText>
                </View>
                <View style={styles.row}>
                  <Sprite name="bubble" scale={1.5} />
                  <PText size={8} style={{ marginLeft: 6 }}>
                    {p.comments}
                  </PText>
                </View>
              </View>
            </Box>
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 38, height: 38, borderWidth: BORDER, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 4 },
  scoreYou: { backgroundColor: 'rgba(252,216,0,0.15)' },
  rank: { width: 28, height: 28, borderWidth: 2, borderColor: C.white, alignItems: 'center', justifyContent: 'center' },
});
