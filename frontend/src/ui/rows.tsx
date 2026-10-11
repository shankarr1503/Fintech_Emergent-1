// App-specific list rows shared by several screens.
import React from 'react';
import { formatDate } from '../utils/format';
import { Amount, IconMark, IconName, Row } from './kit';
import { C, CATEGORY_ICON } from './theme';

export type Txn = {
  id?: string;
  merchant: string;
  category: string;
  amount: number;
  type: 'credit' | 'debit';
  date?: string;
  is_recurring?: boolean;
};

export const categoryLabel = (c: string) => (c === 'emi' ? 'EMI' : (c.charAt(0).toUpperCase() + c.slice(1)).replace(/_/g, ' '));

export function TxnRow({ txn, showDate, categoryName, onPress }: { txn: Txn; showDate?: boolean; categoryName?: string; onPress?: () => void }) {
  const credit = txn.type === 'credit';
  const bits = [categoryName ?? categoryLabel(txn.category), txn.is_recurring ? 'Repeats' : null, showDate && txn.date ? formatDate(txn.date) : null].filter(Boolean);
  return (
    <Row
      left={<IconMark icon={(CATEGORY_ICON[txn.category] ?? 'circle') as IconName} tint={txn.category} />}
      title={txn.merchant}
      subtitle={bits.join(' · ')}
      right={<Amount value={txn.amount} size={15} sign={credit ? '+' : undefined} color={credit ? C.green : C.ink} />}
      onPress={onPress}
    />
  );
}
