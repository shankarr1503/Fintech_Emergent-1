import raw from './business.json';

export type BusinessKey = Exclude<keyof typeof raw, '_readme'>;

/** Company details shown in legal pages, Help and the footer. Edit business.json, not this file. */
export const BUSINESS = raw as Record<BusinessKey, string>;

/** A value still waiting for the real detail. Shown highlighted so it can't be missed. */
export const isTodo = (value: string) => value.startsWith('TODO');

export const telLink = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;
export const mailLink = (email: string, subject?: string) => `mailto:${email}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`;
