import {
  loadStoredAppLanguage,
  saveStoredAppLanguage,
  type AppLanguageFileSystemAdapter,
} from './language-storage';
import { getAppLanguage, setAppLanguage } from './strings';

function createFileSystem(initialContents?: string): AppLanguageFileSystemAdapter & {
  written?: { contents: string; uri: string };
} {
  const fileSystem: AppLanguageFileSystemAdapter & { written?: { contents: string; uri: string } } =
    {
      documentDirectory: 'file:///app/documents/',
      async getInfoAsync() {
        return { exists: initialContents !== undefined || fileSystem.written !== undefined };
      },
      async makeDirectoryAsync() {
        return undefined;
      },
      async readAsStringAsync() {
        return fileSystem.written?.contents ?? initialContents ?? '';
      },
      async writeAsStringAsync(uri, contents) {
        fileSystem.written = { contents, uri };
      },
    };

  return fileSystem;
}

describe('app language storage', () => {
  afterEach(() => {
    setAppLanguage('vi');
  });

  it('loads a persisted language into the app language store', async () => {
    setAppLanguage('vi');

    await expect(
      loadStoredAppLanguage({
        fileSystem: createFileSystem(JSON.stringify({ language: 'en' })),
      }),
    ).resolves.toBe('en');
    expect(getAppLanguage()).toBe('en');
  });

  it('saves language and updates the app language store', async () => {
    const fileSystem = createFileSystem();

    await expect(saveStoredAppLanguage('en', { fileSystem })).resolves.toBe('en');

    expect(getAppLanguage()).toBe('en');
    expect(fileSystem.written?.uri).toBe('file:///app/documents/settings/app-language.json');
    expect(JSON.parse(fileSystem.written?.contents ?? '{}')).toEqual({ language: 'en' });
  });

  it('loads and saves Traditional Chinese language preference', async () => {
    await expect(
      loadStoredAppLanguage({
        fileSystem: createFileSystem(JSON.stringify({ language: 'zh-Hant' })),
      }),
    ).resolves.toBe('zh-Hant');
    expect(getAppLanguage()).toBe('zh-Hant');

    const fileSystem = createFileSystem();
    await expect(saveStoredAppLanguage('zh-Hant', { fileSystem })).resolves.toBe('zh-Hant');
    expect(JSON.parse(fileSystem.written?.contents ?? '{}')).toEqual({ language: 'zh-Hant' });
  });

  it('keeps the current language when stored contents are invalid', async () => {
    setAppLanguage('vi');

    await expect(
      loadStoredAppLanguage({ fileSystem: createFileSystem('{bad json') }),
    ).resolves.toBe('vi');
    expect(getAppLanguage()).toBe('vi');
  });
});
