import { setAppLanguage, translateText } from './strings';

describe('translateText', () => {
  afterEach(() => {
    setAppLanguage('vi');
  });

  it('translates exact UI strings to Vietnamese', () => {
    expect(translateText('Settings')).toBe('Cài đặt');
    expect(translateText('Quick capture')).toBe('Ghi nhanh');
    expect(translateText('Receipt draft')).toBe('Bản nháp hóa đơn');
  });

  it('translates dynamic UI strings without changing user values', () => {
    expect(translateText('Budget period 2026-05-01 to 2026-05-31.')).toBe(
      'Kỳ ngân sách 2026-05-01 đến 2026-05-31.',
    );
    expect(translateText('Math is used by 2 saved records.')).toBe(
      'Math đang được dùng bởi 2 ghi chép đã lưu.',
    );
  });

  it('leaves unknown strings unchanged', () => {
    expect(translateText('Custom user category')).toBe('Custom user category');
  });

  it('returns source strings when English is selected', () => {
    setAppLanguage('en');

    expect(translateText('Settings')).toBe('Settings');
    expect(translateText('Budget period 2026-05-01 to 2026-05-31.')).toBe(
      'Budget period 2026-05-01 to 2026-05-31.',
    );
  });
});
