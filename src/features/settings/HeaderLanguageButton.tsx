import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { saveStoredAppLanguage } from '@/i18n/language-storage';
import { useAppLanguage, type AppLanguage } from '@/i18n/strings';

const languageOptions: { flag: string; label: string; value: AppLanguage }[] = [
  { flag: '🇻🇳', label: 'Tiếng Việt', value: 'vi' },
  { flag: '🇺🇸', label: 'English', value: 'en' },
  { flag: '🇹🇼', label: '繁體中文', value: 'zh-Hant' },
];

function optionFor(language: AppLanguage) {
  return languageOptions.find((option) => option.value === language) ?? languageOptions[0];
}

export function HeaderLanguageButton() {
  const language = useAppLanguage();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const activeOption = optionFor(language);

  const chooseLanguage = async (nextLanguage: AppLanguage) => {
    setOpen(false);

    if (nextLanguage === language) {
      return;
    }

    setSaving(true);
    try {
      await saveStoredAppLanguage(nextLanguage);
    } catch {
      // Keep the current language if the device cannot persist the selection.
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityLabel="Change language"
        accessibilityRole="button"
        disabled={saving}
        onPress={() => setOpen((current) => !current)}
        style={[styles.button, saving ? styles.buttonDisabled : null]}
      >
        <View style={styles.buttonInner}>
          <Text style={styles.flagText}>{activeOption.flag}</Text>
        </View>
      </Pressable>

      {open ? (
        <View style={styles.dropdown}>
          {languageOptions.map((option) => {
            const selected = option.value === language;

            return (
              <Pressable
                accessibilityRole="button"
                key={option.value}
                onPress={() => {
                  void chooseLanguage(option.value);
                }}
                style={[styles.option, selected ? styles.optionSelected : null]}
              >
                <Text style={styles.optionFlag}>{option.flag}</Text>
                <Text
                  numberOfLines={1}
                  style={[styles.optionLabel, selected ? styles.optionLabelSelected : null]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EEF3F5',
    borderRadius: 20,
    borderWidth: 1,
    elevation: 5,
    height: 40,
    justifyContent: 'center',
    shadowColor: '#8BA7B0',
    shadowOffset: {
      height: 6,
      width: 0,
    },
    shadowOpacity: 0.18,
    shadowRadius: 11,
    width: 40,
  },
  buttonDisabled: {
    opacity: 0.72,
  },
  buttonInner: {
    alignItems: 'center',
    borderColor: '#EDF3F4',
    borderRadius: 15,
    borderWidth: 1,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  dropdown: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E4EEF2',
    borderRadius: 18,
    borderWidth: 1,
    elevation: 8,
    gap: 2,
    minWidth: 156,
    padding: 6,
    position: 'absolute',
    right: 0,
    shadowColor: '#8BA7B0',
    shadowOffset: {
      height: 8,
      width: 0,
    },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    top: 48,
    zIndex: 20,
  },
  flagText: {
    fontSize: 19,
    lineHeight: 24,
  },
  option: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    minHeight: 40,
    paddingHorizontal: 10,
  },
  optionFlag: {
    fontSize: 18,
    lineHeight: 23,
  },
  optionLabel: {
    color: '#253030',
    flex: 1,
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0,
    lineHeight: 18,
  },
  optionLabelSelected: {
    color: '#14BBB7',
  },
  optionSelected: {
    backgroundColor: '#E5F7F5',
  },
  wrap: {
    position: 'relative',
    zIndex: 50,
  },
});
