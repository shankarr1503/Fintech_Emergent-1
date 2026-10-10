import React from 'react';
import Svg, { Rect } from 'react-native-svg';
import { PALETTE, SPRITES } from './sprites';

/**
 * The one piece of pixel art we kept: CoinQuest's coin. It only appears where
 * coins are involved, which keeps it special instead of decorative.
 */
export function Coin({ size = 18 }: { size?: number }) {
  const rows = SPRITES.coin;
  const w = rows[0].length;
  const h = rows.length;
  const rects: React.ReactElement[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      let run = 1;
      while (x + run < row.length && row[x + run] === ch) run++;
      if (ch !== '.') rects.push(<Rect key={`${x}-${y}`} x={x} y={y} width={run} height={1} fill={PALETTE[ch]} />);
      x += run;
    }
  });
  return (
    <Svg width={(size * w) / h} height={size} viewBox={`0 0 ${w} ${h}`} {...({ shapeRendering: 'crispEdges' } as object)}>
      {rects}
    </Svg>
  );
}
