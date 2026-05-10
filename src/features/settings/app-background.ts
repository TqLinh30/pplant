import { useSyncExternalStore } from 'react';
import * as FileSystem from 'expo-file-system/legacy';

export type AppBackgroundId = 'cream' | 'lavender' | 'mint' | 'rose' | 'sky';

export type AppBackgroundOption = {
  colors: {
    appBackground: string;
    softPanel: string;
  };
  id: AppBackgroundId;
  labelEn: string;
  labelVi: string;
};

export type AppBackgroundState =
  | {
      id: AppBackgroundId;
      kind: 'preset';
      photoUri: null;
    }
  | {
      id: 'photo';
      kind: 'photo';
      photoUri: string;
    };

export type ResolvedAppBackground = {
  colors: AppBackgroundOption['colors'];
  id: AppBackgroundId | 'photo';
  kind: AppBackgroundState['kind'];
  photoUri: string | null;
};

export type AppBackgroundFileInfo = {
  exists: boolean;
};

export type AppBackgroundFileSystemAdapter = {
  copyAsync(options: { from: string; to: string }): Promise<void>;
  documentDirectory: string | null;
  getInfoAsync(uri: string): Promise<AppBackgroundFileInfo>;
  makeDirectoryAsync(uri: string, options: { idempotent: boolean; intermediates: boolean }): Promise<void>;
  readAsStringAsync(uri: string): Promise<string>;
  writeAsStringAsync(uri: string, contents: string): Promise<void>;
};

export type AppBackgroundStorageDependencies = {
  fileSystem?: AppBackgroundFileSystemAdapter;
};

export const appBackgroundOptions: AppBackgroundOption[] = [
  {
    colors: {
      appBackground: '#F2F7F7',
      softPanel: '#DDF3F0',
    },
    id: 'mint',
    labelEn: 'Mint',
    labelVi: 'Mint nhẹ',
  },
  {
    colors: {
      appBackground: '#EAF3FF',
      softPanel: '#DDEBFF',
    },
    id: 'sky',
    labelEn: 'Blue sky',
    labelVi: 'Trời xanh',
  },
  {
    colors: {
      appBackground: '#FFF0F5',
      softPanel: '#FFE1EC',
    },
    id: 'rose',
    labelEn: 'Rose',
    labelVi: 'Hồng dịu',
  },
  {
    colors: {
      appBackground: '#FFF8EA',
      softPanel: '#FFEBC6',
    },
    id: 'cream',
    labelEn: 'Cream',
    labelVi: 'Kem ấm',
  },
  {
    colors: {
      appBackground: '#F3F0FF',
      softPanel: '#E5DEFF',
    },
    id: 'lavender',
    labelEn: 'Lavender',
    labelVi: 'Tím mơ',
  },
];

const defaultBackgroundId: AppBackgroundId = 'mint';
const appBackgroundListeners = new Set<() => void>();
let currentAppBackground: AppBackgroundState = {
  id: defaultBackgroundId,
  kind: 'preset',
  photoUri: null,
};

const defaultFileSystem: AppBackgroundFileSystemAdapter = {
  copyAsync: FileSystem.copyAsync,
  documentDirectory: FileSystem.documentDirectory,
  getInfoAsync: FileSystem.getInfoAsync,
  makeDirectoryAsync: FileSystem.makeDirectoryAsync,
  readAsStringAsync: FileSystem.readAsStringAsync,
  writeAsStringAsync: FileSystem.writeAsStringAsync,
};

function ensureTrailingSlash(path: string): string {
  return path.endsWith('/') ? path : `${path}/`;
}

function backgroundDirectoryFor(fileSystem: AppBackgroundFileSystemAdapter): string | null {
  if (!fileSystem.documentDirectory) {
    return null;
  }

  return `${ensureTrailingSlash(fileSystem.documentDirectory)}settings/`;
}

function backgroundFileFor(fileSystem: AppBackgroundFileSystemAdapter): string | null {
  const directory = backgroundDirectoryFor(fileSystem);
  return directory ? `${directory}app-background.json` : null;
}

function backgroundImageDirectoryFor(fileSystem: AppBackgroundFileSystemAdapter): string | null {
  const directory = backgroundDirectoryFor(fileSystem);
  return directory ? `${directory}background/` : null;
}

function extensionForUri(uri: string): string {
  const cleanUri = uri.split('?')[0] ?? uri;
  const match = cleanUri.match(/\.([a-zA-Z0-9]+)$/);
  const extension = match?.[1]?.toLowerCase();

  if (extension === 'heic' || extension === 'heif' || extension === 'png' || extension === 'webp') {
    return extension;
  }

  return 'jpg';
}

export function isAppBackgroundId(value: unknown): value is AppBackgroundId {
  return (
    typeof value === 'string' &&
    appBackgroundOptions.some((option) => option.id === value)
  );
}

export function getAppBackgroundId(): AppBackgroundId {
  return currentAppBackground.kind === 'preset' ? currentAppBackground.id : defaultBackgroundId;
}

export function getAppBackgroundState(): AppBackgroundState {
  return currentAppBackground;
}

export function getAppBackgroundOption(id: AppBackgroundId = getAppBackgroundId()): AppBackgroundOption {
  return appBackgroundOptions.find((option) => option.id === id) ?? appBackgroundOptions[0];
}

export function resolveAppBackground(state: AppBackgroundState = currentAppBackground): ResolvedAppBackground {
  const option = state.kind === 'preset' ? getAppBackgroundOption(state.id) : getAppBackgroundOption(defaultBackgroundId);

  return {
    colors: option.colors,
    id: state.id,
    kind: state.kind,
    photoUri: state.photoUri,
  };
}

export function setAppBackgroundId(id: AppBackgroundId): void {
  if (currentAppBackground.kind === 'preset' && currentAppBackground.id === id) {
    return;
  }

  currentAppBackground = {
    id,
    kind: 'preset',
    photoUri: null,
  };
  for (const listener of appBackgroundListeners) {
    listener();
  }
}

export function setAppBackgroundPhoto(photoUri: string): void {
  if (currentAppBackground.kind === 'photo' && currentAppBackground.photoUri === photoUri) {
    return;
  }

  currentAppBackground = {
    id: 'photo',
    kind: 'photo',
    photoUri,
  };
  for (const listener of appBackgroundListeners) {
    listener();
  }
}

export function subscribeAppBackground(listener: () => void): () => void {
  appBackgroundListeners.add(listener);
  return () => {
    appBackgroundListeners.delete(listener);
  };
}

export function useAppBackground(): ResolvedAppBackground {
  const state = useSyncExternalStore(
    subscribeAppBackground,
    getAppBackgroundState,
    getAppBackgroundState,
  );

  return resolveAppBackground(state);
}

function parseStoredBackground(contents: string): AppBackgroundState | null {
  try {
    const parsed = JSON.parse(contents) as {
      backgroundId?: unknown;
      kind?: unknown;
      photoUri?: unknown;
    };

    if (parsed.kind === 'photo' && typeof parsed.photoUri === 'string' && parsed.photoUri.length > 0) {
      return {
        id: 'photo',
        kind: 'photo',
        photoUri: parsed.photoUri,
      };
    }

    if (isAppBackgroundId(parsed.backgroundId)) {
      return {
        id: parsed.backgroundId,
        kind: 'preset',
        photoUri: null,
      };
    }

    return null;
  } catch {
    return null;
  }
}

export async function loadStoredAppBackground(
  dependencies: AppBackgroundStorageDependencies = {},
): Promise<AppBackgroundState> {
  const fileSystem = dependencies.fileSystem ?? defaultFileSystem;
  const fileUri = backgroundFileFor(fileSystem);

  if (!fileUri) {
    return getAppBackgroundState();
  }

  const info = await fileSystem.getInfoAsync(fileUri);

  if (!info.exists) {
    return getAppBackgroundState();
  }

  const storedBackground = parseStoredBackground(await fileSystem.readAsStringAsync(fileUri));

  if (!storedBackground) {
    return getAppBackgroundState();
  }

  if (storedBackground.kind === 'photo') {
    setAppBackgroundPhoto(storedBackground.photoUri);
  } else {
    setAppBackgroundId(storedBackground.id);
  }
  return storedBackground;
}

export async function saveStoredAppBackground(
  id: AppBackgroundId,
  dependencies: AppBackgroundStorageDependencies = {},
): Promise<AppBackgroundState> {
  const fileSystem = dependencies.fileSystem ?? defaultFileSystem;
  const directory = backgroundDirectoryFor(fileSystem);
  const fileUri = backgroundFileFor(fileSystem);
  const state: AppBackgroundState = {
    id,
    kind: 'preset',
    photoUri: null,
  };

  if (!directory || !fileUri) {
    setAppBackgroundId(id);
    return state;
  }

  await fileSystem.makeDirectoryAsync(directory, {
    idempotent: true,
    intermediates: true,
  });
  await fileSystem.writeAsStringAsync(fileUri, JSON.stringify({ backgroundId: id, kind: 'preset' }));
  setAppBackgroundId(id);
  return state;
}

export async function saveStoredAppBackgroundPhoto(
  sourceUri: string,
  dependencies: AppBackgroundStorageDependencies = {},
): Promise<AppBackgroundState> {
  const fileSystem = dependencies.fileSystem ?? defaultFileSystem;
  const directory = backgroundDirectoryFor(fileSystem);
  const imageDirectory = backgroundImageDirectoryFor(fileSystem);
  const fileUri = backgroundFileFor(fileSystem);

  if (!directory || !imageDirectory || !fileUri) {
    setAppBackgroundPhoto(sourceUri);
    return {
      id: 'photo',
      kind: 'photo',
      photoUri: sourceUri,
    };
  }

  await fileSystem.makeDirectoryAsync(directory, {
    idempotent: true,
    intermediates: true,
  });
  await fileSystem.makeDirectoryAsync(imageDirectory, {
    idempotent: true,
    intermediates: true,
  });

  const targetUri = `${imageDirectory}app-background-${Date.now()}.${extensionForUri(sourceUri)}`;
  await fileSystem.copyAsync({ from: sourceUri, to: targetUri });

  const state: AppBackgroundState = {
    id: 'photo',
    kind: 'photo',
    photoUri: targetUri,
  };

  await fileSystem.writeAsStringAsync(fileUri, JSON.stringify(state));
  setAppBackgroundPhoto(targetUri);
  return state;
}
