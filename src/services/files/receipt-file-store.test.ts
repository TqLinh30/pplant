import {
  persistReceiptImageReference,
  type ReceiptFileSystemAdapter,
} from './receipt-file-store';

function createFileSystem(overrides: Partial<ReceiptFileSystemAdapter> = {}): ReceiptFileSystemAdapter {
  return {
    copyAsync: jest.fn(async () => undefined),
    documentDirectory: 'file:///app/documents/',
    getInfoAsync: jest.fn(async () => ({ exists: true, size: 1234 })),
    makeDirectoryAsync: jest.fn(async () => undefined),
    ...overrides,
  };
}

describe('receipt file store', () => {
  it('copies receipt images into app-private receipt storage', async () => {
    const fileSystem = createFileSystem();
    const result = await persistReceiptImageReference(
      {
        capturedAt: '2026-05-08T10:00:00.000Z',
        contentType: 'image/jpeg',
        originalFileName: 'campus-receipt.jpeg',
        sourceUri: 'file:///camera/tmp/original.jpeg',
      },
      {
        createReferenceId: () => 'receipt-1',
        fileSystem,
      },
    );

    expect(result.ok).toBe(true);
    expect(fileSystem.makeDirectoryAsync).toHaveBeenCalledWith('file:///app/documents/receipts/', {
      idempotent: true,
      intermediates: true,
    });
    expect(fileSystem.copyAsync).toHaveBeenCalledWith({
      from: 'file:///camera/tmp/original.jpeg',
      to: 'file:///app/documents/receipts/receipt-1.jpeg',
    });
    if (result.ok) {
      expect(result.value).toEqual({
        capturedAt: '2026-05-08T10:00:00.000Z',
        contentType: 'image/jpeg',
        originalFileName: 'campus-receipt.jpeg',
        retainedImageUri: 'file:///app/documents/receipts/receipt-1.jpeg',
        retentionAnchor: 'capture_draft',
        retentionPolicy: 'keep_until_saved_or_discarded',
        sizeBytes: 1234,
        storageScope: 'app_private_documents',
      });
    }
  });

  it('does not include raw receipt uris in expected error messages', async () => {
    const uri = 'file:///private/receipts/abc.jpg';
    const result = await persistReceiptImageReference(
      {
        sourceUri: uri,
      },
      {
        fileSystem: createFileSystem({
          copyAsync: jest.fn(async () => {
            throw new Error(`cannot copy ${uri}`);
          }),
        }),
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).not.toContain(uri);
      expect(result.error.message).not.toContain('file://');
      expect(result.error.cause).toBeUndefined();
    }
  });

  it('uses manual entry recovery when private document storage is unavailable', async () => {
    const result = await persistReceiptImageReference('file:///tmp/receipt.png', {
      fileSystem: createFileSystem({
        documentDirectory: null,
      }),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.recovery).toBe('manual_entry');
      expect(result.error.message).not.toContain('file:///tmp/receipt.png');
    }
  });
});
