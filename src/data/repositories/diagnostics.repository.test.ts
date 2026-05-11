import { createDiagnosticsRepository } from './diagnostics.repository';

class FakeDiagnosticsClient {
  rows: {
    appVersion: string;
    createdAt: string;
    errorCategory: string;
    id: string;
    metadataJson: string | null;
    name: string;
    occurredAt: string;
  }[] = [];

  runSync(_source: string, ...params: unknown[]): unknown {
    const [id, name, occurredAt, appVersion, errorCategory, metadataJson, createdAt] = params;

    this.rows.push({
      appVersion: appVersion as string,
      createdAt: createdAt as string,
      errorCategory: errorCategory as string,
      id: id as string,
      metadataJson: metadataJson as string | null,
      name: name as string,
      occurredAt: occurredAt as string,
    });

    return { changes: 1 };
  }
}

describe('diagnostics repository', () => {
  it('persists only redacted diagnostic metadata JSON', async () => {
    const client = new FakeDiagnosticsClient();
    const repository = createDiagnosticsRepository({ $client: client } as never);

    const result = await repository.recordEvent({
      appVersion: '1.0.0',
      createdAt: '2026-05-09T02:40:00.000Z',
      errorCategory: 'unavailable',
      id: 'diagnostic-1',
      metadata: {
        amountMinor: 1200,
        jobState: 'failed',
        ocrText: 'raw receipt text',
        receiptImageUri: 'file:///private/receipts/a.jpg',
        retryCount: 2,
      } as never,
      name: 'receipt_parsing_failed',
      occurredAt: '2026-05-09T02:40:00.000Z',
    });

    expect(result.ok).toBe(true);
    expect(client.rows).toHaveLength(1);
    expect(JSON.parse(client.rows[0].metadataJson ?? '{}')).toEqual({ jobState: 'failed', retryCount: 2 });
    expect(JSON.stringify(client.rows[0])).not.toContain('file:///private');
    expect(JSON.stringify(client.rows[0])).not.toContain('raw receipt text');
  });

  it('rejects invalid diagnostic events before persistence', async () => {
    const client = new FakeDiagnosticsClient();
    const repository = createDiagnosticsRepository({ $client: client } as never);

    const result = await repository.recordEvent({
      appVersion: '1.0.0',
      createdAt: '2026-05-09T02:40:00.000Z',
      errorCategory: 'unavailable',
      id: 'diagnostic-2',
      name: 'unsupported_event' as never,
      occurredAt: '2026-05-09T02:40:00.000Z',
    });

    expect(result.ok).toBe(false);
    expect(client.rows).toHaveLength(0);
  });
});
