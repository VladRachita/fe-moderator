import type { VideoVisibility } from '@/types';

type OwnerLike = {
  ownerDisplayName?: string;
  ownerEmail?: string;
  ownerId?: string;
};

const visibilityLabels: Record<'PUBLIC' | 'PRIVATE', string> = {
  PUBLIC: 'Public',
  PRIVATE: 'Private',
};

const timestampFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export const resolveVideoOwner = (owner: OwnerLike): string => {
  return owner.ownerDisplayName ?? owner.ownerEmail ?? owner.ownerId ?? 'Unknown owner';
};

export const formatVideoVisibility = (type?: VideoVisibility): string => {
  if (!type) {
    return 'Unspecified visibility';
  }
  const normalized = type.toString().toUpperCase() as keyof typeof visibilityLabels;
  if (normalized in visibilityLabels) {
    return visibilityLabels[normalized];
  }
  return type.toString();
};

export const formatVideoTimestamp = (timestamp?: string): string | null => {
  if (!timestamp) {
    return null;
  }
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return timestampFormatter.format(date);
};
