import type { AppLanguage } from '@/i18n/strings';

import type { JournalMoodId } from './types';

export type JournalMoodDefinition = {
  color: string;
  icon: string;
  id: JournalMoodId;
  labelEn: string;
  labelVi: string;
  labelZhHant: string;
  softColor: string;
};

export const journalMoodCatalog: JournalMoodDefinition[] = [
  {
    color: '#E94E77',
    icon: 'heart',
    id: 'love',
    labelEn: 'Wonderful',
    labelVi: 'Tuyệt vời',
    labelZhHant: '超棒',
    softColor: '#FFE8F0',
  },
  {
    color: '#F2A51A',
    icon: 'emoticon-excited-outline',
    id: 'excited',
    labelEn: 'Excited',
    labelVi: 'Hào hứng',
    labelZhHant: '興奮',
    softColor: '#FFF4D7',
  },
  {
    color: '#39BFAE',
    icon: 'emoticon-happy-outline',
    id: 'calm',
    labelEn: 'Calm',
    labelVi: 'Bình yên',
    labelZhHant: '平靜',
    softColor: '#DDF7F3',
  },
  {
    color: '#B88766',
    icon: 'emoticon-neutral-outline',
    id: 'tired',
    labelEn: 'Tired',
    labelVi: 'Mệt',
    labelZhHant: '疲憊',
    softColor: '#F5E6DC',
  },
  {
    color: '#8B85D7',
    icon: 'sleep',
    id: 'sleepy',
    labelEn: 'Sleepy',
    labelVi: 'Buồn ngủ',
    labelZhHant: '想睡',
    softColor: '#EAE8FF',
  },
  {
    color: '#5C8ED8',
    icon: 'emoticon-sad-outline',
    id: 'sad',
    labelEn: 'Sad',
    labelVi: 'Buồn',
    labelZhHant: '難過',
    softColor: '#E5F1FF',
  },
  {
    color: '#E46B6B',
    icon: 'emoticon-confused-outline',
    id: 'stressed',
    labelEn: 'Stressed',
    labelVi: 'Căng thẳng',
    labelZhHant: '壓力大',
    softColor: '#FFE8E8',
  },
  {
    color: '#718282',
    icon: 'emoticon-outline',
    id: 'neutral',
    labelEn: 'Neutral',
    labelVi: 'Bình thường',
    labelZhHant: '普通',
    softColor: '#EEF4F4',
  },
];

export function moodDefinitionFor(id: JournalMoodId): JournalMoodDefinition {
  return journalMoodCatalog.find((mood) => mood.id === id) ?? journalMoodCatalog[journalMoodCatalog.length - 1];
}

export function journalMoodLabel(
  moodOrId: JournalMoodDefinition | JournalMoodId,
  language: AppLanguage,
): string {
  const mood = typeof moodOrId === 'string' ? moodDefinitionFor(moodOrId) : moodOrId;

  if (language === 'en') {
    return mood.labelEn;
  }

  if (language === 'zh-Hant') {
    return mood.labelZhHant;
  }

  return mood.labelVi;
}
