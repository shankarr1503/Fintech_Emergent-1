import React from 'react';
import { Text, TextStyle } from 'react-native';
import { BUSINESS, BusinessKey, isTodo } from '../config/business';
import { C, F } from '../ui/theme';
import { UPDATED } from './documents';

const VALUES: Record<string, string> = { ...BUSINESS, updated: UPDATED };

/**
 * Text with {placeholders} filled from the business details. A detail that is still TODO is shown
 * highlighted, so a missing company name or address can't slip through unnoticed.
 */
export function Filled({ text, style }: { text: string; style?: TextStyle }) {
  const parts = text.split(/(\{\w+\})/g);
  return (
    <Text style={style}>
      {parts.map((part, i) => {
        const m = part.match(/^\{(\w+)\}$/);
        if (!m) return part;
        const value = VALUES[m[1] as BusinessKey] ?? part;
        return isTodo(value) ? (
          <Text key={i} style={{ backgroundColor: C.amberSoft, color: C.red, fontFamily: F.semibold }}>
            [{value.replace(/^TODO:\s*/, '')}]
          </Text>
        ) : (
          value
        );
      })}
    </Text>
  );
}

/** Plain-string version for places that can't render rich text (titles, alerts). */
export const fill = (text: string) => text.replace(/\{(\w+)\}/g, (_, k) => VALUES[k] ?? `{${k}}`);
