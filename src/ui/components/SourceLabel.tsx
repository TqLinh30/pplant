import { Chip } from '@/ui/primitives/Chip';

type SourceLabelProps = {
  source: 'manual' | 'parsed' | 'estimated' | 'low-confidence' | 'user-corrected';
};

export function SourceLabel({ source }: SourceLabelProps) {
  return <Chip label={source.replace('-', ' ')} tone={source === 'manual' ? 'success' : 'neutral'} />;
}
