import { persistReceiptImageReference } from './receipt-file-store';

describe('receipt file store foundation', () => {
  it('does not include raw receipt uris in expected error messages', async () => {
    const uri = 'file:///private/receipts/abc.jpg';
    const result = await persistReceiptImageReference(uri);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).not.toContain(uri);
      expect(result.error.message).not.toContain('file://');
    }
  });
});
