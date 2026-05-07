import {
  diagnosticMetadataKeys,
  type DiagnosticEvent,
  type DiagnosticMetadata,
  type DiagnosticMetadataKey,
  type DiagnosticMetadataValue,
} from './events';

const allowedMetadataKeys = new Set<string>(diagnosticMetadataKeys);
const sensitiveValuePattern = /(?:content|data|file|https?):\/\/|[a-z]:\\|[/\\](?:cache|documents?|receipts?|tmp)[/\\]/i;

function isAllowedMetadataKey(key: string): key is DiagnosticMetadataKey {
  return allowedMetadataKeys.has(key);
}

function isSafeMetadataValue(value: DiagnosticMetadataValue): boolean {
  if (typeof value !== 'string') {
    return true;
  }

  return value.length <= 80 && !sensitiveValuePattern.test(value);
}

export function redactDiagnosticEvent(event: DiagnosticEvent): DiagnosticEvent {
  if (!event.metadata) {
    return event;
  }

  const metadata: DiagnosticMetadata = {};

  for (const [key, value] of Object.entries(event.metadata)) {
    if (isAllowedMetadataKey(key) && isSafeMetadataValue(value)) {
      metadata[key] = value;
    }
  }

  if (Object.keys(metadata).length === 0) {
    const { metadata: _metadata, ...eventWithoutMetadata } = event;
    return eventWithoutMetadata;
  }

  return {
    ...event,
    metadata,
  };
}
