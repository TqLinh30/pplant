import type { JournalMoodId } from './types';

export type JournalMoodDefinition = {
  color: string;
  icon: string;
  id: JournalMoodId;
  labelEn: string;
  labelVi: string;
  softColor: string;
};

export const journalMoodCatalog: JournalMoodDefinition[] = [
  {
    color: '#E94E77',
    icon: 'heart',
    id: 'love',
    labelEn: 'Love',
    labelVi: 'Yêu',
    softColor: '#FFE8F0',
  },
  {
    color: '#F2A51A',
    icon: 'emoticon-excited-outline',
    id: 'excited',
    labelEn: 'Excited',
    labelVi: 'Hào hứng',
    softColor: '#FFF4D7',
  },
  {
    color: '#39BFAE',
    icon: 'emoticon-happy-outline',
    id: 'calm',
    labelEn: 'Calm',
    labelVi: 'Bình yên',
    softColor: '#DDF7F3',
  },
  {
    color: '#B88766',
    icon: 'emoticon-neutral-outline',
    id: 'tired',
    labelEn: 'Tired',
    labelVi: 'Mệt',
    softColor: '#F5E6DC',
  },
  {
    color: '#8B85D7',
    icon: 'sleep',
    id: 'sleepy',
    labelEn: 'Sleepy',
    labelVi: 'Buồn ngủ',
    softColor: '#EAE8FF',
  },
  {
    color: '#5C8ED8',
    icon: 'emoticon-sad-outline',
    id: 'sad',
    labelEn: 'Sad',
    labelVi: 'Buồn',
    softColor: '#E5F1FF',
  },
  {
    color: '#E46B6B',
    icon: 'emoticon-confused-outline',
    id: 'stressed',
    labelEn: 'Stressed',
    labelVi: 'Căng thẳng',
    softColor: '#FFE8E8',
  },
  {
    color: '#718282',
    icon: 'emoticon-outline',
    id: 'neutral',
    labelEn: 'Neutral',
    labelVi: 'Bình thường',
    softColor: '#EEF4F4',
  },
];

export function moodDefinitionFor(id: JournalMoodId): JournalMoodDefinition {
  return journalMoodCatalog.find((mood) => mood.id === id) ?? journalMoodCatalog[journalMoodCatalog.length - 1];
}
