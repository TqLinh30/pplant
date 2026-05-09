import * as FileSystem from 'expo-file-system/legacy';

import { getAppLanguage, isAppLanguage, setAppLanguage, type AppLanguage } from './strings';

export type AppLanguageFileInfo = {
  exists: boolean;
};

export type AppLanguageFileSystemAdapter = {
  documentDirectory: string | null;
  getInfoAsync(uri: string): Promise<AppLanguageFileInfo>;
  makeDirectoryAsync(uri: string, options: { idempotent: boolean; intermediates: boolean }): Promise<void>;
  readAsStringAsync(uri: string): Promise<string>;
  writeAsStringAsync(uri: string, contents: string): Promise<void>;
};

export type AppLanguageStorageDependencies = {
  fileSystem?: AppLanguageFileSystemAdapter;
};

const defaultFileSystem: AppLanguageFileSystemAdapter = {
  documentDirectory: FileSystem.documentDirectory,
  getInfoAsync: FileSystem.getInfoAsync,
  makeDirectoryAsync: FileSystem.makeDirectoryAsync,
  readAsStringAsync: FileSystem.readAsStringAsync,
  writeAsStringAsync: FileSystem.writeAsStringAsync,
};

function ensureTrailingSlash(path: string): string {
  return path.endsWith('/') ? path : `${path}/`;
}

function languageDirectoryFor(fileSystem: AppLanguageFileSystemAdapter): string | null {
  if (!fileSystem.documentDirectory) {
    return null;
  }

  return `${ensureTrailingSlash(fileSystem.documentDirectory)}settings/`;
}

function languageFileFor(fileSystem: AppLanguageFileSystemAdapter): string | null {
  const directory = languageDirectoryFor(fileSystem);
  return directory ? `${directory}app-language.json` : null;
}

function parseStoredLanguage(contents: string): AppLanguage | null {
  try {
    const parsed = JSON.parse(contents) as { language?: unknown };
    return isAppLanguage(parsed.language) ? parsed.language : null;
  } catch {
    return null;
  }
}

export async function loadStoredAppLanguage(
  dependencies: AppLanguageStorageDependencies = {},
): Promise<AppLanguage> {
  const fileSystem = dependencies.fileSystem ?? defaultFileSystem;
  const fileUri = languageFileFor(fileSystem);

  if (!fileUri) {
    return getAppLanguage();
  }

  const info = await fileSystem.getInfoAsync(fileUri);

  if (!info.exists) {
    return getAppLanguage();
  }

  const storedLanguage = parseStoredLanguage(await fileSystem.readAsStringAsync(fileUri));

  if (!storedLanguage) {
    return getAppLanguage();
  }

  setAppLanguage(storedLanguage);
  return storedLanguage;
}

export async function saveStoredAppLanguage(
  language: AppLanguage,
  dependencies: AppLanguageStorageDependencies = {},
): Promise<AppLanguage> {
  const fileSystem = dependencies.fileSystem ?? defaultFileSystem;
  const directory = languageDirectoryFor(fileSystem);
  const fileUri = languageFileFor(fileSystem);

  if (!directory || !fileUri) {
    setAppLanguage(language);
    return language;
  }

  await fileSystem.makeDirectoryAsync(directory, {
    idempotent: true,
    intermediates: true,
  });
  await fileSystem.writeAsStringAsync(fileUri, JSON.stringify({ language }));
  setAppLanguage(language);
  return language;
}
