import {
  getAppBackgroundId,
  loadStoredAppBackground,
  saveStoredAppBackground,
  saveStoredAppBackgroundPhoto,
  setAppBackgroundId,
  type AppBackgroundFileSystemAdapter,
} from './app-background';

function createFileSystem(initialContents?: string): AppBackgroundFileSystemAdapter & {
  written?: { contents: string; uri: string };
} {
  const fileSystem: AppBackgroundFileSystemAdapter & { written?: { contents: string; uri: string } } = {
    copyAsync: jest.fn(async () => undefined),
    documentDirectory: 'file:///app/documents/',
    getInfoAsync: jest.fn(async () => ({ exists: initialContents !== undefined })),
    makeDirectoryAsync: jest.fn(async () => undefined),
    readAsStringAsync: jest.fn(async () => initialContents ?? ''),
    writeAsStringAsync: jest.fn(async (uri, contents) => {
      fileSystem.written = { contents, uri };
    }),
  };

  return fileSystem;
}

describe('app background storage', () => {
  beforeEach(() => {
    setAppBackgroundId('mint');
  });

  it('loads a saved app background id', async () => {
    const result = await loadStoredAppBackground({
      fileSystem: createFileSystem(JSON.stringify({ backgroundId: 'rose' })),
    });

    expect(result).toEqual({ id: 'rose', kind: 'preset', photoUri: null });
    expect(getAppBackgroundId()).toBe('rose');
  });

  it('keeps current background when storage is missing or invalid', async () => {
    setAppBackgroundId('sky');

    await expect(loadStoredAppBackground({ fileSystem: createFileSystem() })).resolves.toEqual({
      id: 'sky',
      kind: 'preset',
      photoUri: null,
    });
    await expect(loadStoredAppBackground({ fileSystem: createFileSystem('{bad json') })).resolves.toEqual({
      id: 'sky',
      kind: 'preset',
      photoUri: null,
    });
  });

  it('saves the selected app background id', async () => {
    const fileSystem = createFileSystem();

    const result = await saveStoredAppBackground('lavender', { fileSystem });

    expect(result).toEqual({ id: 'lavender', kind: 'preset', photoUri: null });
    expect(getAppBackgroundId()).toBe('lavender');
    expect(fileSystem.written?.uri).toBe('file:///app/documents/settings/app-background.json');
    expect(fileSystem.written?.contents).toBe(JSON.stringify({ backgroundId: 'lavender', kind: 'preset' }));
  });

  it('copies and saves a selected app background photo', async () => {
    const fileSystem = createFileSystem();

    const result = await saveStoredAppBackgroundPhoto('file:///picker/background.png', { fileSystem });

    expect(result).toEqual({
      id: 'photo',
      kind: 'photo',
      photoUri: expect.stringMatching(/^file:\/\/\/app\/documents\/settings\/background\/app-background-\d+\.png$/),
    });
    expect(fileSystem.copyAsync).toHaveBeenCalledWith({
      from: 'file:///picker/background.png',
      to: result.photoUri,
    });
    expect(fileSystem.written?.contents).toBe(JSON.stringify(result));
  });
});
