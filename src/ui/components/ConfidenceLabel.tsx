import { Chip } from '@/ui/primitives/Chip';

type ConfidenceLabelProps = {
  confidence: 'high' | 'medium' | 'low' | 'unknown';
};

export function ConfidenceLabel({ confidence }: ConfidenceLabelProps) {
  return <Chip label={`${confidence} confidence`} tone={confidence === 'low' ? 'warning' : 'neutral'} />;
}
