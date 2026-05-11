import { useSyncExternalStore } from 'react';

export type AppLanguage = 'en' | 'vi' | 'zh-Hant';

const appLanguages = ['en', 'vi', 'zh-Hant'] as const satisfies readonly AppLanguage[];
const appLanguageListeners = new Set<() => void>();
let currentAppLanguage: AppLanguage = 'vi';

export const appLanguageOptions: { label: string; value: AppLanguage }[] = [
  { label: 'Tiếng Việt', value: 'vi' },
  { label: 'English', value: 'en' },
  { label: '繁體中文', value: 'zh-Hant' },
];

export function isAppLanguage(value: unknown): value is AppLanguage {
  return typeof value === 'string' && appLanguages.includes(value as AppLanguage);
}

export function getAppLanguage(): AppLanguage {
  return currentAppLanguage;
}

export function setAppLanguage(language: AppLanguage): void {
  if (currentAppLanguage === language) {
    return;
  }

  currentAppLanguage = language;
  for (const listener of appLanguageListeners) {
    listener();
  }
}

export function subscribeAppLanguage(listener: () => void): () => void {
  appLanguageListeners.add(listener);
  return () => {
    appLanguageListeners.delete(listener);
  };
}

export function useAppLanguage(): AppLanguage {
  return useSyncExternalStore(subscribeAppLanguage, getAppLanguage, getAppLanguage);
}

export function useTranslateText(): typeof translateText {
  const language = useAppLanguage();
  return (value: string) => translateTextForLanguage(language, value);
}

const viTranslations: Record<string, string> = {
  Add: 'Thêm',
  'Add money record': 'Thêm ghi chép tiền',
  'Add savings goal': 'Thêm mục tiêu tiết kiệm',
  Amount: 'Số tiền',
  'Any category': 'Mọi danh mục',
  'Any topic': 'Mọi chủ đề',
  'Apply filters': 'Áp dụng bộ lọc',
  Available: 'Có thể chọn',
  'Budget and savings': 'Ngân sách và tiết kiệm',
  'Budget needs attention': 'Ngân sách cần chú ý',
  'Budget not set': 'Chưa đặt ngân sách',
  'Budget on track': 'Ngân sách ổn định',
  'Budget planning': 'Lập kế hoạch ngân sách',
  'Budget planning uses your saved currency and monthly reset day.':
    'Kế hoạch ngân sách dùng đơn vị tiền và ngày đặt lại hằng tháng đã lưu.',
  Cancel: 'Hủy',
  'Cancel edit': 'Hủy chỉnh sửa',
  'Cancel task edit': 'Hủy chỉnh sửa nhiệm vụ',
  Capture: 'Ghi nhanh',
  'Capture could not open.': 'Không thể mở ghi nhanh.',
  'Capture one item': 'Ghi một mục',
  'Categories and topics': 'Danh mục và chủ đề',
  'Categories are optional. Add them later in Settings.':
    'Danh mục là tùy chọn. Bạn có thể thêm sau trong Cài đặt.',
  Category: 'Danh mục',
  'Check highlighted fields': 'Kiểm tra các trường được đánh dấu',
  'Check task fields': 'Kiểm tra thông tin nhiệm vụ',
  'Check work fields': 'Kiểm tra thông tin công việc',
  'Choose a day from 1 to 31. Short months use their last day.':
    'Chọn ngày từ 1 đến 31. Tháng ngắn sẽ dùng ngày cuối tháng.',
  'Clear filters': 'Xóa bộ lọc',
  'Clear for now': 'Tạm thời ổn',
  'Close sheet': 'Đóng bảng',
  'Core capture stays local. Network-dependent features can wait until connectivity returns.':
    'Ghi nhanh cốt lõi vẫn lưu cục bộ. Các tính năng cần mạng có thể chờ đến khi có kết nối.',
  Currency: 'Tiền tệ',
  Daily: 'Hằng ngày',
  'Data controls': 'Quản lý dữ liệu',
  Date: 'Ngày',
  'Date range': 'Khoảng ngày',
  'Default hourly wage': 'Lương theo giờ mặc định',
  'Delete local data': 'Xóa dữ liệu cục bộ',
  'Direct hours': 'Giờ trực tiếp',
  'Draft saved': 'Đã lưu bản nháp',
  'Due today': 'Đến hạn hôm nay',
  Edit: 'Sửa',
  'Edit money record': 'Sửa ghi chép tiền',
  'Each highlighted field includes the next correction to make.':
    'Mỗi trường được đánh dấu có hướng dẫn cần sửa tiếp theo.',
  Earned: 'Đã kiếm',
  Expense: 'Chi tiêu',
  'Estimated context': 'Ngữ cảnh ước tính',
  'Filters active': 'Đang bật bộ lọc',
  History: 'Lịch sử',
  Income: 'Thu nhập',
  'Keep reusable labels for future money, work, task, and reflection records.':
    'Giữ các nhãn dùng lại cho ghi chép tiền, công việc, nhiệm vụ và phản tư sau này.',
  Locale: 'Ngôn ngữ/khu vực',
  'Loading Today': 'Đang tải Hôm nay',
  'Loading capture': 'Đang mở ghi nhanh',
  'Loading preferences': 'Đang tải tùy chọn',
  'Loading recurring money.': 'Đang tải tiền định kỳ.',
  'Loading today': 'Đang tải hôm nay',
  'Local workspace': 'Không gian cục bộ',
  'Local workspace controls': 'Cài đặt cục bộ',
  'Manual capture': 'Ghi thủ công',
  Monthly: 'Hằng tháng',
  'Monthly budget': 'Ngân sách tháng',
  'Monthly reset day': 'Ngày đặt lại hằng tháng',
  'Money and Budget': 'Tiền và ngân sách',
  'Money record action did not finish': 'Thao tác ghi chép tiền chưa hoàn tất',
  'Money record removed': 'Đã xóa ghi chép tiền',
  'Money record saved': 'Đã lưu ghi chép tiền',
  'Money record updated': 'Đã cập nhật ghi chép tiền',
  'Money records use your saved currency and locale so amounts stay consistent.':
    'Ghi chép tiền dùng tiền tệ và ngôn ngữ/khu vực đã lưu để số tiền luôn nhất quán.',
  Net: 'Ròng',
  'No account, cloud sync, or setup is needed.':
    'Không cần tài khoản, đồng bộ đám mây hay thiết lập thêm.',
  'No activity yet': 'Chưa có hoạt động',
  'No category': 'Không có danh mục',
  'No deadline': 'Không có hạn',
  'No money records today': 'Hôm nay chưa có ghi chép tiền',
  'No records yet': 'Chưa có ghi chép',
  'No savings goal yet': 'Chưa có mục tiêu tiết kiệm',
  'No summary yet': 'Chưa có tóm tắt',
  'No topic': 'Không có chủ đề',
  Note: 'Ghi chú',
  'Offline-ready': 'Sẵn sàng khi offline',
  Open: 'Đang mở',
  'Open Settings': 'Mở Cài đặt',
  'Open tasks': 'Nhiệm vụ mở',
  'Opening local workspace': 'Đang mở không gian cục bộ',
  'Opening your local workspace': 'Đang mở không gian cục bộ của bạn',
  'Optional income source.': 'Nguồn thu tùy chọn.',
  'Optional merchant.': 'Người bán tùy chọn.',
  'Optional note, kept local.': 'Ghi chú tùy chọn, chỉ lưu cục bộ.',
  'Optional occurrence to skip. Use YYYY-MM-DD.': 'Lần lặp muốn bỏ qua, tùy chọn. Dùng YYYY-MM-DD.',
  'Optional. Use YYYY-MM-DD.': 'Tùy chọn. Dùng YYYY-MM-DD.',
  'Pplant could not open local data.': 'Pplant không thể mở dữ liệu cục bộ.',
  'Pplant is gathering your local overview.': 'Pplant đang tổng hợp phần nhìn cục bộ của bạn.',
  'Pplant is opening your local money settings.': 'Pplant đang mở cài đặt tiền cục bộ của bạn.',
  'Pplant is opening your local settings.': 'Pplant đang mở cài đặt cục bộ của bạn.',
  'Past due': 'Quá hạn',
  Paid: 'Đã trả',
  Plan: 'Lên kế hoạch',
  Preferences: 'Tùy chọn',
  'Preferences needed': 'Cần lưu tùy chọn',
  'Preview the impact before removing local records, drafts, receipt images, diagnostics, or workspace data.':
    'Xem trước tác động trước khi xóa ghi chép, bản nháp, ảnh hóa đơn, chẩn đoán hoặc dữ liệu không gian làm việc cục bộ.',
  Privacy: 'Quyền riêng tư',
  'Privacy controls': 'Quản lý quyền riêng tư',
  'Quick capture': 'Ghi nhanh',
  'Recent Activity': 'Hoạt động gần đây',
  'Recent money records': 'Ghi chép tiền gần đây',
  Receipt: 'Hóa đơn',
  'Record organization': 'Tổ chức ghi chép',
  'Record allowance, pay, or other income.': 'Ghi tiền trợ cấp, lương hoặc nguồn thu khác.',
  'Record spending manually.': 'Ghi khoản chi thủ công.',
  'Recurring category': 'Danh mục định kỳ',
  'Recurring money': 'Tiền định kỳ',
  'Recurring topics': 'Chủ đề định kỳ',
  Recovery: 'Khôi phục',
  Refreshing: 'Đang làm mới',
  Reminder: 'Nhắc nhở',
  Retry: 'Thử lại',
  'Retry after saving preferences': 'Thử lại sau khi lưu tùy chọn',
  'Return to Today': 'Quay lại Hôm nay',
  Review: 'Tổng kết',
  'Review how Pplant handles local data, receipt photos, parsing, notifications, and diagnostics.':
    'Xem cách Pplant xử lý dữ liệu cục bộ, ảnh hóa đơn, phân tích, thông báo và chẩn đoán.',
  'Review items': 'Xem các mục',
  'Review source': 'Xem nguồn',
  'Review drafts': 'Xem bản nháp',
  Routines: 'Thói quen',
  Save: 'Lưu',
  'Save a local expense or income record with the context you know now.':
    'Lưu khoản chi hoặc thu nhập cục bộ với ngữ cảnh bạn biết hiện tại.',
  'Save a receipt photo as a local expense draft.':
    'Lưu ảnh hóa đơn thành bản nháp chi tiêu cục bộ.',
  'Save preferences first': 'Hãy lưu tùy chọn trước',
  'Save preferences first.': 'Hãy lưu tùy chọn trước.',
  'Save predictable expenses or income as templates, then materialize only due occurrences.':
    'Lưu các khoản chi hoặc thu nhập lặp lại thành mẫu, rồi chỉ tạo ghi chép thật khi đến hạn.',
  'Save changes': 'Lưu thay đổi',
  'Save expense': 'Lưu chi tiêu',
  'Save income': 'Lưu thu nhập',
  'Save preferences': 'Lưu tùy chọn',
  Savings: 'Tiết kiệm',
  'Savings goals': 'Mục tiêu tiết kiệm',
  'Screen unavailable': 'Màn hình chưa khả dụng',
  Selected: 'Đã chọn',
  Settings: 'Cài đặt',
  'Settings could not open.': 'Không thể mở Cài đặt.',
  'Set a monthly budget to see remaining money for the current reset period.':
    'Đặt ngân sách tháng để xem số tiền còn lại trong kỳ hiện tại.',
  'Set a monthly limit and basic savings goals for later Today and Review summaries.':
    'Đặt giới hạn tháng và mục tiêu tiết kiệm cơ bản cho các tóm tắt Hôm nay và Tổng kết sau này.',
  'Set reminder with local-only fallback if notifications are off.':
    'Đặt nhắc nhở với phương án cục bộ nếu thông báo bị tắt.',
  'Set the local defaults Pplant uses for money, calendar grouping, and work-time context.':
    'Đặt mặc định cục bộ mà Pplant dùng cho tiền, nhóm lịch và ngữ cảnh thời gian làm việc.',
  Source: 'Nguồn',
  'Some context is approximate or derived from saved defaults. The source label stays visible.':
    'Một số ngữ cảnh là ước tính hoặc suy ra từ mặc định đã lưu. Nhãn nguồn vẫn được hiển thị.',
  'Some items need a calm check. Recovery actions are optional and local.':
    'Một số mục cần kiểm tra nhẹ nhàng. Hành động khôi phục là tùy chọn và chỉ cục bộ.',
  'Some items need attention': 'Một số mục cần chú ý',
  Start: 'Bắt đầu',
  'Start expense capture': 'Bắt đầu ghi chi tiêu',
  'Start income capture': 'Bắt đầu ghi thu nhập',
  'Start one focused flow. Receipt capture saves a local draft first.':
    'Bắt đầu một luồng tập trung. Ghi hóa đơn sẽ lưu bản nháp cục bộ trước.',
  'Start receipt capture': 'Bắt đầu ghi hóa đơn',
  'Start reminder capture': 'Bắt đầu tạo nhắc nhở',
  'Start task capture': 'Bắt đầu tạo nhiệm vụ',
  'Start with one money record, task, reminder, or work entry when the day gives you something concrete.':
    'Bắt đầu bằng một ghi chép tiền, nhiệm vụ, nhắc nhở hoặc ca làm khi trong ngày có việc cụ thể.',
  'Start work entry capture': 'Bắt đầu ghi ca làm',
  'Starts on': 'Bắt đầu vào',
  Task: 'Nhiệm vụ',
  'Tap a saved record to edit or remove it from active records.':
    'Chạm vào ghi chép đã lưu để sửa hoặc xóa khỏi danh sách đang hoạt động.',
  'Tasks and Reminders': 'Nhiệm vụ và nhắc nhở',
  'That change was not saved': 'Thay đổi đó chưa được lưu',
  'The last overview stays visible while local data reloads.':
    'Phần nhìn gần nhất vẫn hiển thị trong khi dữ liệu cục bộ tải lại.',
  'This overview is from the last successful local load. Try refreshing when ready.':
    'Phần nhìn này đến từ lần tải cục bộ thành công gần nhất. Hãy thử làm mới khi sẵn sàng.',
  'This Pplant surface has not been connected yet.': 'Màn hình Pplant này chưa được kết nối.',
  Time: 'Thời gian',
  Today: 'Hôm nay',
  'Today could not open': 'Không thể mở Hôm nay',
  'Today is ready with the latest local data Pplant could load.':
    'Hôm nay đã sẵn sàng với dữ liệu cục bộ mới nhất Pplant tải được.',
  'Today is clear': 'Hôm nay đang trống',
  'Today loaded': 'Đã tải Hôm nay',
  'Today needs your currency, locale, reset day, and wage defaults.':
    'Hôm nay cần tiền tệ, ngôn ngữ/khu vực, ngày đặt lại và lương mặc định của bạn.',
  'Today will fill in as you capture money, work, and tasks.':
    'Hôm nay sẽ được lấp đầy khi bạn ghi tiền, công việc và nhiệm vụ.',
  Topics: 'Chủ đề',
  'Topics are optional. Add them later in Settings.':
    'Chủ đề là tùy chọn. Bạn có thể thêm sau trong Cài đặt.',
  'Try again. Current edits are still on screen.':
    'Thử lại. Các chỉnh sửa hiện tại vẫn còn trên màn hình.',
  'Update the active record. Manual changes become the source of truth.':
    'Cập nhật ghi chép đang hoạt động. Thay đổi thủ công sẽ là nguồn sự thật.',
  Unpaid: 'Chưa trả',
  'Use local capture': 'Dùng ghi nhanh cục bộ',
  'Use YYYY-MM-DD.': 'Dùng YYYY-MM-DD.',
  'Use a 3-letter code such as USD, TWD, JPY, or VND.':
    'Dùng mã tiền tệ 3 chữ như USD, TWD, JPY hoặc VND.',
  'Use a locale tag such as en-US or vi-VN.': 'Dùng mã ngôn ngữ/khu vực như en-US hoặc vi-VN.',
  Weekly: 'Hằng tuần',
  Wait: 'Chờ',
  'Work Context': 'Ngữ cảnh công việc',
  'Work entry': 'Ca làm',
  Work: 'Công việc',
  'Action did not finish': 'Thao tác chưa hoàn tất',
  'Add category': 'Thêm danh mục',
  'Add topic': 'Thêm chủ đề',
  'Affected data': 'Dữ liệu bị ảnh hưởng',
  'Affected data categories': 'Nhóm dữ liệu bị ảnh hưởng',
  All: 'Tất cả',
  'Apply work filters': 'Áp dụng bộ lọc công việc',
  'Back to capture': 'Quay lại ghi nhanh',
  'Before enablement': 'Trước khi bật',
  'Blank uses saved default wage.': 'Để trống sẽ dùng lương mặc định đã lưu.',
  Break: 'Nghỉ giữa ca',
  'Cancel recurring edit': 'Hủy chỉnh sửa định kỳ',
  Captured: 'Đã chụp',
  'Category and topics': 'Danh mục và chủ đề',
  'Check filters': 'Kiểm tra bộ lọc',
  'Check recurring task fields': 'Kiểm tra thông tin định kỳ',
  'Check the highlighted receipt fields before saving.':
    'Kiểm tra các trường hóa đơn được đánh dấu trước khi lưu.',
  'Checking recovery options': 'Đang kiểm tra tùy chọn khôi phục',
  'Checking saved drafts.': 'Đang kiểm tra bản nháp đã lưu.',
  'Cleanup notes': 'Ghi chú dọn dẹp',
  'Clear diagnostics': 'Xóa chẩn đoán',
  'Clear work filters': 'Xóa bộ lọc công việc',
  'Confidence: high': 'Độ tin cậy: cao',
  'Confidence: low - review needed': 'Độ tin cậy: thấp - cần kiểm tra',
  'Confidence: medium': 'Độ tin cậy: trung bình',
  'Confidence: unknown - review needed': 'Độ tin cậy: không rõ - cần kiểm tra',
  'Create one-time reminders for student deadlines and routines.':
    'Tạo nhắc nhở một lần cho hạn học tập và thói quen.',
  'Current saved': 'Đã tiết kiệm hiện tại',
  'Daily tasks': 'Nhiệm vụ hằng ngày',
  Day: 'Ngày',
  Deadline: 'Hạn',
  'Delete all personal data': 'Xóa toàn bộ dữ liệu cá nhân',
  'Delete after save': 'Xóa sau khi lưu',
  'Delete image after receipt expense is saved': 'Xóa ảnh sau khi chi tiêu từ hóa đơn được lưu',
  'Delete image, keep expense': 'Xóa ảnh, giữ chi tiêu',
  'Delete money records': 'Xóa ghi chép tiền',
  'Delete receipt images': 'Xóa ảnh hóa đơn',
  'Delete reflections': 'Xóa phản tư',
  'Delete reminders': 'Xóa nhắc nhở',
  'Delete series': 'Xóa chuỗi',
  'Delete tasks': 'Xóa nhiệm vụ',
  'Delete work entries': 'Xóa ca làm',
  'Deleted data is hidden from active app views and summaries.':
    'Dữ liệu đã xóa sẽ bị ẩn khỏi các màn hình và tóm tắt đang hoạt động.',
  'Deleting locally': 'Đang xóa cục bộ',
  'Deletion could not start': 'Không thể bắt đầu xóa',
  'Deletion did not finish': 'Xóa chưa hoàn tất',
  'Discard active drafts': 'Bỏ bản nháp đang hoạt động',
  'Discard draft': 'Bỏ bản nháp',
  Done: 'Xong',
  'Draft discarded': 'Đã bỏ bản nháp',
  'Draft updated': 'Bản nháp đã cập nhật',
  'Edit draft fields': 'Sửa trường bản nháp',
  'Edit review fields': 'Sửa trường kiểm tra',
  'End date': 'Ngày kết thúc',
  'End of day': 'Cuối ngày',
  'End time': 'Giờ kết thúc',
  'Ends on': 'Kết thúc vào',
  'Enter hours, like 2 or 1.5.': 'Nhập số giờ, ví dụ 2 hoặc 1.5.',
  File: 'Tệp',
  Filters: 'Bộ lọc',
  From: 'Từ',
  'Goal name': 'Tên mục tiêu',
  Habit: 'Thói quen',
  High: 'Cao',
  Hours: 'Giờ',
  'Ignore item': 'Bỏ qua mục',
  'Ignore line items': 'Bỏ qua dòng hàng',
  'Ignored by you': 'Bạn đã bỏ qua',
  'Image deleted; expense details remain.': 'Ảnh đã xóa; chi tiết chi tiêu vẫn còn.',
  Item: 'Mục',
  'Keep draft': 'Giữ bản nháp',
  'Keep history': 'Giữ lịch sử',
  'Keep image': 'Giữ ảnh',
  'Keep image until you delete it': 'Giữ ảnh cho đến khi bạn xóa',
  'Legacy policy: keep until saved or discarded': 'Chính sách cũ: giữ đến khi lưu hoặc bỏ',
  'Line items': 'Dòng hàng',
  'Line items ignored; saving total only.': 'Đã bỏ qua dòng hàng; chỉ lưu tổng tiền.',
  'Load more': 'Tải thêm',
  'Load more work': 'Tải thêm công việc',
  'Loading Review': 'Đang tải Tổng kết',
  'Loading budget planning': 'Đang tải kế hoạch ngân sách',
  'Loading end-of-day review': 'Đang tải tổng kết cuối ngày',
  'Loading history': 'Đang tải lịch sử',
  'Loading organization': 'Đang tải tổ chức',
  'Loading period summary': 'Đang tải tóm tắt kỳ',
  'Loading receipt draft': 'Đang tải bản nháp hóa đơn',
  'Loading receipt draft.': 'Đang tải bản nháp hóa đơn.',
  'Loading recurring tasks and habits.': 'Đang tải nhiệm vụ và thói quen định kỳ.',
  'Loading recurring tasks': 'Đang tải nhiệm vụ định kỳ',
  'Loading reminders.': 'Đang tải nhắc nhở.',
  'Loading tasks.': 'Đang tải nhiệm vụ.',
  'Loading work entry capture.': 'Đang tải ghi ca làm.',
  'Loading work entries': 'Đang tải ca làm',
  'Loading work history.': 'Đang tải lịch sử công việc.',
  'Local data updated': 'Dữ liệu cục bộ đã cập nhật',
  'Local-first by default': 'Mặc định ưu tiên cục bộ',
  Low: 'Thấp',
  'Manual alternative': 'Cách làm thủ công',
  'Manual expense': 'Nhập chi tiêu thủ công',
  'Manual progress for now; money records can update this later.':
    'Hiện tiến độ nhập thủ công; ghi chép tiền có thể cập nhật phần này sau.',
  'Max amount': 'Số tiền tối đa',
  Medium: 'Trung bình',
  Merchant: 'Người bán',
  'Merchant or source': 'Người bán hoặc nguồn',
  'Min amount': 'Số tiền tối thiểu',
  'Money history': 'Lịch sử tiền',
  Month: 'Tháng',
  Newest: 'Mới nhất',
  'Next action': 'Hành động tiếp theo',
  'No duplicate signal': 'Không có tín hiệu trùng lặp',
  'No matching records': 'Không có ghi chép phù hợp',
  'No matching work entries': 'Không có ca làm phù hợp',
  'No receipt parsing has started. Manual expense entry remains available.':
    'Chưa bắt đầu phân tích hóa đơn. Bạn vẫn có thể nhập chi tiêu thủ công.',
  'No recurring tasks yet': 'Chưa có nhiệm vụ định kỳ',
  'No retained receipt image needed deletion.': 'Không có ảnh hóa đơn đã giữ cần xóa.',
  'No savings goals yet': 'Chưa có mục tiêu tiết kiệm',
  'No saved reflections yet': 'Chưa có phản tư đã lưu',
  'No tasks yet': 'Chưa có nhiệm vụ',
  'No work entries yet': 'Chưa có ca làm',
  'No work summary yet': 'Chưa có tóm tắt công việc',
  'Not proposed': 'Chưa được đề xuất',
  'Nothing recorded for this day': 'Chưa có gì được ghi trong ngày này',
  'Nothing recorded in this period': 'Chưa có gì được ghi trong kỳ này',
  'Note search': 'Tìm trong ghi chú',
  Oldest: 'Cũ nhất',
  'Optional for quick capture.': 'Tùy chọn cho ghi nhanh.',
  'Optional for quick planning.': 'Tùy chọn cho lập kế hoạch nhanh.',
  'Optional for quick setup.': 'Tùy chọn cho thiết lập nhanh.',
  'Optional unpaid break minutes.': 'Số phút nghỉ không lương, tùy chọn.',
  'Organization could not load': 'Không thể tải tổ chức',
  'Organization saved': 'Đã lưu tổ chức',
  'Organization was not saved': 'Chưa lưu tổ chức',
  'Past Reflections': 'Phản tư đã qua',
  Pause: 'Tạm dừng',
  'Possible duplicate': 'Có thể trùng lặp',
  'Possible duplicate receipt': 'Hóa đơn có thể trùng lặp',
  'Preferences could not be loaded': 'Không thể tải tùy chọn',
  'Preferences saved': 'Đã lưu tùy chọn',
  'Preferences were not saved': 'Chưa lưu tùy chọn',
  'Preparing impact': 'Đang chuẩn bị tác động',
  'Preview date range deletion': 'Xem trước xóa theo khoảng ngày',
  'Proposed fields': 'Trường được đề xuất',
  'Receipt Review Desk': 'Bàn kiểm tra hóa đơn',
  'Receipt draft': 'Bản nháp hóa đơn',
  'Receipt draft could not open': 'Không thể mở bản nháp hóa đơn',
  'Receipt draft discarded. No expense was created.':
    'Đã bỏ bản nháp hóa đơn. Không tạo chi tiêu nào.',
  'Receipt draft is not active': 'Bản nháp hóa đơn không còn hoạt động',
  'Receipt draft kept for later.': 'Đã giữ bản nháp hóa đơn để xem sau.',
  'Receipt expense saved': 'Đã lưu chi tiêu từ hóa đơn',
  'Receipt fields need review': 'Trường hóa đơn cần kiểm tra',
  'Receipt fields proposed': 'Đã đề xuất trường hóa đơn',
  'Receipt image': 'Ảnh hóa đơn',
  'Receipt image deleted': 'Ảnh hóa đơn đã xóa',
  'Receipt image retention': 'Giữ ảnh hóa đơn',
  'Receipt image retention controls': 'Điều khiển giữ ảnh hóa đơn',
  'Receipt image will be deleted after this expense is saved.':
    'Ảnh hóa đơn sẽ được xóa sau khi chi tiêu này được lưu.',
  'Receipt image will be kept until you delete it.': 'Ảnh hóa đơn sẽ được giữ cho đến khi bạn xóa.',
  'Receipt parsing failed': 'Phân tích hóa đơn thất bại',
  'Receipt parsing in progress': 'Đang phân tích hóa đơn',
  'Receipt parsing not started': 'Chưa bắt đầu phân tích hóa đơn',
  'Receipt parsing queued': 'Đã xếp hàng phân tích hóa đơn',
  'Receipt parsing queued. You can still enter the expense manually.':
    'Đã xếp hàng phân tích hóa đơn. Bạn vẫn có thể nhập chi tiêu thủ công.',
  'Receipt parsing started.': 'Đã bắt đầu phân tích hóa đơn.',
  'Receipt parsing unavailable': 'Chưa thể phân tích hóa đơn',
  'Receipt photo saved privately': 'Ảnh hóa đơn đã được lưu riêng tư',
  'Receipt recovery actions': 'Hành động khôi phục hóa đơn',
  'Receipt review could not load. Manual expense remains available.':
    'Không thể tải phần kiểm tra hóa đơn. Nhập chi tiêu thủ công vẫn khả dụng.',
  'Receipt reviewed': 'Hóa đơn đã được kiểm tra',
  'Record direct hours or a shift with a wage snapshot for this entry.':
    'Ghi số giờ trực tiếp hoặc một ca làm với mức lương chụp tại thời điểm này.',
  'Recurring notes': 'Ghi chú định kỳ',
  'Recurring task action did not finish': 'Thao tác nhiệm vụ định kỳ chưa hoàn tất',
  'Recurring task updated': 'Đã cập nhật nhiệm vụ định kỳ',
  'Recurring tasks and habits': 'Nhiệm vụ và thói quen định kỳ',
  'Recurring tasks could not load': 'Không thể tải nhiệm vụ định kỳ',
  'Recurring title': 'Tiêu đề định kỳ',
  Reassign: 'Gán lại',
  'Reassign target': 'Đích gán lại',
  'Recovery options are not available right now': 'Hiện chưa có tùy chọn khôi phục',
  Refresh: 'Làm mới',
  'Remove from active tasks': 'Xóa khỏi nhiệm vụ đang hoạt động',
  'Remove from active work': 'Xóa khỏi công việc đang hoạt động',
  'Remove item': 'Xóa mục',
  Resume: 'Tiếp tục',
  'Resume parsing': 'Tiếp tục phân tích',
  Retention: 'Lưu giữ',
  'Review active work entries, hours, earned income, and wage snapshots.':
    'Xem các ca làm đang hoạt động, số giờ, thu nhập và mức lương đã ghi.',
  'Review line items': 'Kiểm tra dòng hàng',
  'Review optional': 'Kiểm tra nếu muốn',
  'Review proposed fields before saving.': 'Kiểm tra các trường được đề xuất trước khi lưu.',
  'Review records': 'Xem ghi chép',
  'Review summary': 'Tóm tắt tổng kết',
  'Restore item': 'Khôi phục mục',
  'Retry budget planning': 'Thử lại kế hoạch ngân sách',
  'Retry manually': 'Thử lại thủ công',
  'Retry organization': 'Thử lại tổ chức',
  'Retry parsing': 'Thử phân tích lại',
  'Retry recurring tasks': 'Thử lại nhiệm vụ định kỳ',
  'Retry tasks': 'Thử lại nhiệm vụ',
  'Retry work history': 'Thử lại lịch sử công việc',
  'Saved reflection': 'Phản tư đã lưu',
  'Save budget': 'Lưu ngân sách',
  'Save corrected receipt': 'Lưu hóa đơn đã sửa',
  'Save direct hours or a shift above.': 'Lưu số giờ trực tiếp hoặc ca làm ở trên.',
  'Save goal': 'Lưu mục tiêu',
  'Save recurring changes': 'Lưu thay đổi định kỳ',
  'Save recurring item': 'Lưu mục định kỳ',
  'Save task': 'Lưu nhiệm vụ',
  'Save task changes': 'Lưu thay đổi nhiệm vụ',
  'Save total-only expense': 'Lưu chi tiêu chỉ có tổng tiền',
  'Save work changes': 'Lưu thay đổi ca làm',
  'Save work entry': 'Lưu ca làm',
  'Saved drafts': 'Bản nháp đã lưu',
  'Saving budget': 'Đang lưu ngân sách',
  'Saving goal': 'Đang lưu mục tiêu',
  'Saving preferences': 'Đang lưu tùy chọn',
  'Saving reviewed receipt expense.': 'Đang lưu chi tiêu hóa đơn đã kiểm tra.',
  'Set a simple daily, weekly, or monthly routine with completion by day.':
    'Đặt thói quen hằng ngày, hằng tuần hoặc hằng tháng với trạng thái hoàn thành theo ngày.',
  Shift: 'Ca làm',
  'Similar expense': 'Chi tiêu tương tự',
  'Size unavailable': 'Không có kích thước',
  'Skip next': 'Bỏ lần tiếp theo',
  Standalone: 'Độc lập',
  'Start date': 'Ngày bắt đầu',
  'Start parsing': 'Bắt đầu phân tích',
  'Start time': 'Giờ bắt đầu',
  State: 'Trạng thái',
  'Stop series': 'Dừng chuỗi',
  'Stored as integer minor units so wage math stays exact.':
    'Lưu bằng đơn vị tiền nhỏ nhất để tính lương chính xác.',
  'Stored as minor units after validation.': 'Lưu bằng đơn vị tiền nhỏ nhất sau khi xác thực.',
  'Stored size': 'Kích thước đã lưu',
  Summary: 'Tóm tắt',
  'Summary could not open': 'Không thể mở tóm tắt',
  'Summary calculated from local records': 'Tóm tắt tính từ ghi chép cục bộ',
  'Target amount': 'Số tiền mục tiêu',
  'Target date': 'Ngày mục tiêu',
  'Task action did not finish': 'Thao tác nhiệm vụ chưa hoàn tất',
  'Task category': 'Danh mục nhiệm vụ',
  'Task link': 'Liên kết nhiệm vụ',
  'Task removed': 'Đã xóa nhiệm vụ',
  'Task saved': 'Đã lưu nhiệm vụ',
  'Task title': 'Tên nhiệm vụ',
  'Task topics': 'Chủ đề nhiệm vụ',
  'Tasks could not load': 'Không thể tải nhiệm vụ',
  'Text label: duplicate indicator': 'Nhãn văn bản: dấu hiệu trùng lặp',
  'Text label: parsed line items': 'Nhãn văn bản: dòng hàng đã phân tích',
  'Text label: parsed, unknown, or corrected.': 'Nhãn văn bản: đã phân tích, không rõ hoặc đã sửa.',
  'Text label: unknown fields': 'Nhãn văn bản: trường không rõ',
  'The current review stays visible while local data reloads.':
    'Tổng kết hiện tại vẫn hiển thị trong khi dữ liệu cục bộ tải lại.',
  'The current summary stays visible while local data reloads.':
    'Tóm tắt hiện tại vẫn hiển thị trong khi dữ liệu cục bộ tải lại.',
  'The image file reference was removed. Saved expense details remain available.':
    'Tham chiếu tệp ảnh đã được xóa. Chi tiết chi tiêu đã lưu vẫn khả dụng.',
  'The image reference is stored in the local expense draft. Parsing is optional and no expense is saved automatically.':
    'Tham chiếu ảnh được lưu trong bản nháp chi tiêu cục bộ. Phân tích là tùy chọn và không tự động lưu chi tiêu.',
  'This month': 'Tháng này',
  'This receipt photo is still a draft. Save a final expense only after manual review in later receipt steps.':
    'Ảnh hóa đơn này vẫn là bản nháp. Chỉ lưu chi tiêu cuối cùng sau khi bạn kiểm tra thủ công ở bước hóa đơn sau.',
  'This week': 'Tuần này',
  To: 'Đến',
  'To Do': 'Cần làm',
  Total: 'Tổng',
  'Try again from Today or Capture. Manual expense entry is still available.':
    'Thử lại từ Hôm nay hoặc Ghi nhanh. Nhập chi tiêu thủ công vẫn khả dụng.',
  'Try again or choose another step.': 'Thử lại hoặc chọn bước khác.',
  'Try the local deletion again.': 'Thử xóa cục bộ lại.',
  Unknown: 'Không rõ',
  'Unknown fields': 'Trường không rõ',
  Unnamed: 'Chưa đặt tên',
  'Updated locally': 'Đã cập nhật cục bộ',
  'Use HH:MM.': 'Dùng HH:MM.',
  Week: 'Tuần',
  'Work category': 'Danh mục công việc',
  'Work entry action did not finish': 'Thao tác ca làm chưa hoàn tất',
  'Work entry capture could not load': 'Không thể tải ghi ca làm',
  'Work entry updated': 'Đã cập nhật ca làm',
  'Work filters': 'Bộ lọc công việc',
  'Work filters active': 'Đang bật bộ lọc công việc',
  'Work history': 'Lịch sử công việc',
  'Work history could not load': 'Không thể tải lịch sử công việc',
  'Work note': 'Ghi chú công việc',
  'Work records': 'Ghi chép công việc',
  'Work summary': 'Tóm tắt công việc',
  'Work topic': 'Chủ đề công việc',
  'Work topics': 'Chủ đề công việc',
  'Create one-time or repeating reminders with local notification fallback.':
    'Tạo nhắc nhở một lần hoặc lặp lại với phương án thông báo cục bộ.',
  'History could not open.': 'Không thể mở Lịch sử.',
  'History uses your saved currency and locale for amount filters.':
    'Lịch sử dùng tiền tệ và ngôn ngữ/khu vực đã lưu cho bộ lọc số tiền.',
  'Local workspace could not be opened': 'Không thể mở không gian cục bộ',
  'Opening receipt capture.': 'Đang mở ghi hóa đơn.',
  'Parser signal: possible duplicate.': 'Tín hiệu phân tích: có thể trùng lặp.',
  'Plan school and personal work with simple state, priority, and deadline context.':
    'Lên kế hoạch việc học và cá nhân với trạng thái, độ ưu tiên và hạn đơn giản.',
  'Pplant is gathering the local activity for today.':
    'Pplant đang tổng hợp hoạt động cục bộ hôm nay.',
  'Pplant is opening local money records.': 'Pplant đang mở ghi chép tiền cục bộ.',
  'Receipt capture': 'Ghi hóa đơn',
  Records: 'Ghi chép',
  'Recent tasks': 'Nhiệm vụ gần đây',
  'Recent work entries': 'Ca làm gần đây',
  Reminders: 'Nhắc nhở',
  'Resume an unfinished capture, discard it, or keep it for later.':
    'Tiếp tục ghi nhanh chưa xong, bỏ đi, hoặc giữ lại để làm sau.',
  'Review could not open.': 'Không thể mở Tổng kết.',
  'Review saved receipt': 'Kiểm tra hóa đơn đã lưu',
  'Review uses your currency, locale, reset day, and wage defaults.':
    'Tổng kết dùng tiền tệ, ngôn ngữ/khu vực, ngày đặt lại và lương mặc định của bạn.',
  'Routine link': 'Liên kết thói quen',
  'Save a receipt draft': 'Lưu bản nháp hóa đơn',
  'Save a recurring task or habit first, or switch this reminder to standalone.':
    'Hãy lưu nhiệm vụ hoặc thói quen định kỳ trước, hoặc chuyển nhắc nhở này sang độc lập.',
  'Save a task first, or switch this reminder to standalone.':
    'Hãy lưu nhiệm vụ trước, hoặc chuyển nhắc nhở này sang độc lập.',
  'Tap a saved task to edit its title, state, priority, deadline, or notes.':
    'Chạm vào nhiệm vụ đã lưu để sửa tiêu đề, trạng thái, độ ưu tiên, hạn hoặc ghi chú.',
  'Tap an entry to edit or remove it from active work entries.':
    'Chạm vào ca làm để sửa hoặc xóa khỏi danh sách ca đang hoạt động.',
  Topic: 'Chủ đề',
  'Active categories and topics are ready for future records.':
    'Danh mục và chủ đề đang hoạt động đã sẵn sàng cho các ghi chép sau.',
  'Add a goal in Settings to track manual saved amount without changing money records.':
    'Thêm mục tiêu trong Cài đặt để theo dõi số tiền đã tiết kiệm thủ công mà không đổi ghi chép tiền.',
  Adjust: 'Điều chỉnh',
  'Adjust completed task': 'Điều chỉnh nhiệm vụ đã hoàn thành',
  'Adjust filters or save a money record from Capture.':
    'Điều chỉnh bộ lọc hoặc lưu ghi chép tiền từ Ghi nhanh.',
  'Adjust filters or save a work entry from Capture.':
    'Điều chỉnh bộ lọc hoặc lưu ca làm từ Ghi nhanh.',
  'Adjust work entry': 'Điều chỉnh ca làm',
  'Answered prompts will appear here by period. Skipped prompts stay out of history.':
    'Câu hỏi đã trả lời sẽ xuất hiện ở đây theo kỳ. Câu hỏi đã bỏ qua sẽ không vào lịch sử.',
  'Budget and Savings': 'Ngân sách và tiết kiệm',
  'Budget and savings summaries appear after those settings are saved.':
    'Tóm tắt ngân sách và tiết kiệm sẽ xuất hiện sau khi bạn lưu cài đặt đó.',
  'Budget left': 'Ngân sách còn lại',
  'Budget planning could not load': 'Không thể tải kế hoạch ngân sách',
  'Budget planning saved': 'Đã lưu kế hoạch ngân sách',
  'Budget planning was not saved': 'Chưa lưu kế hoạch ngân sách',
  'Budget rules and savings goals are ready for future summaries.':
    'Quy tắc ngân sách và mục tiêu tiết kiệm đã sẵn sàng cho các tóm tắt sau.',
  'Capture could not be loaded': 'Không thể tải Ghi nhanh',
  'Check reminder fields': 'Kiểm tra thông tin nhắc nhở',
  'Check work filters': 'Kiểm tra bộ lọc công việc',
  'Choose review period': 'Chọn kỳ tổng kết',
  'Completed, open, and ready-to-review tasks will appear here when saved records exist.':
    'Nhiệm vụ đã hoàn thành, đang mở và sẵn sàng tổng kết sẽ xuất hiện khi có ghi chép đã lưu.',
  'Create a goal above to make it available for later budget and review summaries.':
    'Tạo mục tiêu ở trên để dùng cho các tóm tắt ngân sách và tổng kết sau.',
  'Data deletion below runs locally and does not require network access.':
    'Việc xóa dữ liệu bên dưới chạy cục bộ và không cần mạng.',
  Dismiss: 'Ẩn',
  'Dismissed pairs stay hidden for this period. Muted pairs stay hidden in future reviews.':
    'Các cặp đã ẩn sẽ ẩn trong kỳ này. Các cặp đã tắt sẽ ẩn ở các lần tổng kết sau.',
  Discard: 'Bỏ',
  'Draft action did not finish': 'Thao tác bản nháp chưa hoàn tất',
  'Drafts could not load': 'Không thể tải bản nháp',
  'Edit reminder timing': 'Sửa thời gian nhắc nhở',
  'Editing reminder timing': 'Đang sửa thời gian nhắc nhở',
  End: 'Kết thúc',
  'End-of-day review could not be loaded': 'Không thể tải tổng kết cuối ngày',
  Entries: 'Mục',
  'Feature ready': 'Tính năng đã sẵn sàng',
  'Foundation ready': 'Nền tảng đã sẵn sàng',
  Goals: 'Mục tiêu',
  'HH:mm.': 'HH:mm.',
  'History could not be loaded': 'Không thể tải lịch sử',
  'Insight preference did not save': 'Chưa lưu tùy chọn gợi ý',
  Keep: 'Giữ',
  Listed: 'Đã liệt kê',
  'Loading prompts': 'Đang tải câu hỏi',
  'Loading reflection history': 'Đang tải lịch sử phản tư',
  'Loading reminders': 'Đang tải nhắc nhở',
  'Loading saved drafts': 'Đang tải bản nháp đã lưu',
  'Loading tasks': 'Đang tải nhiệm vụ',
  'Loading work history': 'Đang tải lịch sử công việc',
  Log: 'Ghi',
  'Matching records are shown below. Clear filters to return to the full money history.':
    'Các ghi chép phù hợp hiển thị bên dưới. Xóa bộ lọc để quay lại toàn bộ lịch sử tiền.',
  'Matching work entries and summaries are shown below.':
    'Ca làm và tóm tắt phù hợp hiển thị bên dưới.',
  'Money Today': 'Tiền hôm nay',
  'Money This Period': 'Tiền kỳ này',
  'Money record': 'Ghi chép tiền',
  'Money records will store integer minor units, currency codes, source labels, and student context.':
    'Ghi chép tiền sẽ lưu đơn vị nhỏ nhất dạng số nguyên, mã tiền tệ, nhãn nguồn và ngữ cảnh học sinh.',
  'Names are kept local and can be updated later.': 'Tên được lưu cục bộ và có thể cập nhật sau.',
  'No activity list yet': 'Chưa có danh sách hoạt động',
  'No budget or savings setup yet': 'Chưa thiết lập ngân sách hoặc tiết kiệm',
  'No reminder activity in this period': 'Không có hoạt động nhắc nhở trong kỳ này',
  'No reminder needs review': 'Không có nhắc nhở cần tổng kết',
  'No reminders yet': 'Chưa có nhắc nhở',
  'No spending or income in this period': 'Không có chi tiêu hoặc thu nhập trong kỳ này',
  'No spending or income logged today': 'Hôm nay chưa ghi chi tiêu hoặc thu nhập',
  'No task activity in this period': 'Không có hoạt động nhiệm vụ trong kỳ này',
  'No task activity to review': 'Không có hoạt động nhiệm vụ để tổng kết',
  'No work logged in this period': 'Không có công việc trong kỳ này',
  'No work logged today': 'Hôm nay chưa ghi công việc',
  Notes: 'Ghi chú',
  Occurrences: 'Lần xuất hiện',
  'Optional note': 'Ghi chú tùy chọn',
  'Optional, YYYY-MM-DD.': 'Tùy chọn, YYYY-MM-DD.',
  'Optional for repeating reminders. Use YYYY-MM-DD.':
    'Tùy chọn cho nhắc nhở lặp lại. Dùng YYYY-MM-DD.',
  'Pplant is calculating this summary from local records.':
    'Pplant đang tính tóm tắt này từ ghi chép cục bộ.',
  'Pplant is checking the local deletion plan.': 'Pplant đang kiểm tra kế hoạch xóa cục bộ.',
  'Pplant is looking for items that may need a next step.':
    'Pplant đang tìm các mục có thể cần bước tiếp theo.',
  'Pplant is opening your local budget and savings settings.':
    'Pplant đang mở cài đặt ngân sách và tiết kiệm cục bộ.',
  'Pplant is opening your local categories and topics.':
    'Pplant đang mở danh mục và chủ đề cục bộ.',
  'Positive remaining budget becomes savings-fund context. Over-budget months can show a negative remaining amount without blocking expense entry.':
    'Ngân sách còn dư sẽ trở thành ngữ cảnh quỹ tiết kiệm. Tháng vượt ngân sách có thể hiển thị số còn lại âm mà không chặn ghi chi tiêu.',
  'Ready to review': 'Sẵn sàng tổng kết',
  'Ready to set up': 'Sẵn sàng thiết lập',
  'Recurring amount': 'Số tiền định kỳ',
  'Recurring money action did not finish': 'Thao tác tiền định kỳ chưa hoàn tất',
  'Recurring money could not load': 'Không thể tải tiền định kỳ',
  'Recurring money updated': 'Đã cập nhật tiền định kỳ',
  'Recurring money uses your saved currency and locale.':
    'Tiền định kỳ dùng tiền tệ và ngôn ngữ/khu vực đã lưu.',
  'Recurring note': 'Ghi chú định kỳ',
  'Reflection Prompts': 'Câu hỏi phản tư',
  'Reflection Pairs': 'Cặp phản tư',
  'Reflection action did not finish': 'Thao tác phản tư chưa hoàn tất',
  'Reflection history did not update': 'Lịch sử phản tư chưa cập nhật',
  'Reflection pairs hidden': 'Cặp phản tư đã ẩn',
  'Reminder action did not finish': 'Thao tác nhắc nhở chưa hoàn tất',
  'Reminder timing, missed items, and local-only states will appear here when present.':
    'Thời gian nhắc nhở, mục bị lỡ và trạng thái chỉ cục bộ sẽ xuất hiện ở đây khi có.',
  'Reminders This Period': 'Nhắc nhở kỳ này',
  'Reminders could not load': 'Không thể tải nhắc nhở',
  'Remove from active records': 'Xóa khỏi ghi chép đang hoạt động',
  'Review receipt draft': 'Kiểm tra bản nháp hóa đơn',
  'Save a daily task above when there is something to plan.':
    'Lưu nhiệm vụ hằng ngày ở trên khi có việc cần lên kế hoạch.',
  'Save a manual expense or income record above.': 'Lưu chi tiêu hoặc thu nhập thủ công ở trên.',
  'Save a money record or adjust filters.': 'Lưu ghi chép tiền hoặc điều chỉnh bộ lọc.',
  'Save a recurring expense or income template above.':
    'Lưu mẫu chi tiêu hoặc thu nhập định kỳ ở trên.',
  'Save a recurring task or habit above when a routine should repeat.':
    'Lưu nhiệm vụ hoặc thói quen định kỳ ở trên khi một thói quen cần lặp lại.',
  'Save a reminder above when something should come back to attention.':
    'Lưu nhắc nhở ở trên khi có việc cần quay lại chú ý.',
  'Save a work entry or adjust filters.': 'Lưu ca làm hoặc điều chỉnh bộ lọc.',
  'Save changes to update the reminder schedule, or cancel to leave it unchanged.':
    'Lưu thay đổi để cập nhật lịch nhắc, hoặc hủy để giữ nguyên.',
  'Saved prompt states are loading from local data.':
    'Trạng thái câu hỏi đã lưu đang tải từ dữ liệu cục bộ.',
  'Saved reflections are loading from local data.': 'Phản tư đã lưu đang tải từ dữ liệu cục bộ.',
  'Scheduled and ready-to-review reminder states will appear here when present.':
    'Trạng thái nhắc nhở đã lên lịch và sẵn sàng tổng kết sẽ xuất hiện ở đây khi có.',
  'Snooze reminder 30 min': 'Nhắc lại sau 30 phút',
  Spent: 'Đã chi',
  'Take photo': 'Chụp ảnh',
  'Tasks and Habits': 'Nhiệm vụ và thói quen',
  'Tasks and Habits This Period': 'Nhiệm vụ và thói quen kỳ này',
  'Tasks and habits will appear here when they are due, open, or completed today.':
    'Nhiệm vụ và thói quen sẽ xuất hiện ở đây khi đến hạn, đang mở hoặc hoàn thành hôm nay.',
  'That is only a data state. Capture something later if it helps the day make more sense.':
    'Đó chỉ là trạng thái dữ liệu. Ghi thêm sau nếu điều đó giúp ngày này rõ hơn.',
  'That is only a data state. This summary will fill in when records are saved.':
    'Đó chỉ là trạng thái dữ liệu. Tóm tắt này sẽ có nội dung khi ghi chép được lưu.',
  'The review can still be useful with partial data; nothing here means there is nothing recorded for this day.':
    'Tổng kết vẫn hữu ích với dữ liệu một phần; không có gì ở đây nghĩa là ngày này chưa ghi dữ liệu.',
  'The review refreshed from the saved task record.': 'Tổng kết đã làm mới từ nhiệm vụ đã lưu.',
  'These controls explain current behavior. Data deletion below runs locally and does not require network access.':
    'Các điều khiển này giải thích hành vi hiện tại. Việc xóa dữ liệu bên dưới chạy cục bộ và không cần mạng.',
  'These defaults are editable and stay local until you save them.':
    'Các mặc định này có thể chỉnh sửa và vẫn ở cục bộ cho đến khi bạn lưu.',
  'This screen is intentionally light until its owning story adds local data and full behavior.':
    'Màn hình này tạm thời tối giản cho đến khi story sở hữu nó thêm dữ liệu cục bộ và hành vi đầy đủ.',
  'This section will fill in when money records are saved for this date.':
    'Phần này sẽ có nội dung khi ghi chép tiền được lưu cho ngày này.',
  'This summary is calculated from saved local money records.':
    'Tóm tắt này được tính từ ghi chép tiền cục bộ đã lưu.',
  'Today could not be loaded': 'Không thể tải Hôm nay',
  'Try again. Current recurring edits are still on screen.':
    'Thử lại. Các chỉnh sửa định kỳ hiện tại vẫn còn trên màn hình.',
  'Try the action again. Current edits are still on screen.':
    'Thử thao tác lại. Các chỉnh sửa hiện tại vẫn còn trên màn hình.',
  'Try the action again. Current items are still on screen.':
    'Thử thao tác lại. Các mục hiện tại vẫn còn trên màn hình.',
  'Use YYYY-MM-DD. Use the next date for overnight shifts.':
    'Dùng YYYY-MM-DD. Dùng ngày tiếp theo cho ca qua đêm.',
  'Wage override': 'Lương ghi đè',
  'Weekly and monthly summaries use your currency, locale, reset day, and wage defaults.':
    'Tóm tắt tuần và tháng dùng tiền tệ, ngôn ngữ/khu vực, ngày đặt lại và lương mặc định.',
  'Work This Period': 'Công việc kỳ này',
  'Work date': 'Ngày làm việc',
  'Work entries will appear here when hours or shifts are saved for this date.':
    'Ca làm sẽ xuất hiện ở đây khi số giờ hoặc ca được lưu cho ngày này.',
  'Work entries use your saved default hourly wage and locale.':
    'Ca làm dùng lương theo giờ mặc định và ngôn ngữ/khu vực đã lưu.',
  'Work history uses your saved locale and wage currency.':
    'Lịch sử công việc dùng ngôn ngữ/khu vực và tiền lương đã lưu.',
  'Work time and earned income will appear here when entries are saved.':
    'Thời gian làm việc và thu nhập sẽ xuất hiện ở đây khi ca làm được lưu.',
  'YYYY-MM-DD': 'YYYY-MM-DD',
  'Your local data is unchanged. Try loading reminders again.':
    'Dữ liệu cục bộ không đổi. Hãy thử tải nhắc nhở lại.',
  'Your local money records are unchanged. Try again when local data is available.':
    'Ghi chép tiền cục bộ không đổi. Hãy thử lại khi dữ liệu cục bộ sẵn sàng.',
  'Your saved records are unchanged. Try loading history again when ready.':
    'Ghi chép đã lưu không đổi. Hãy thử tải lịch sử lại khi sẵn sàng.',
  'Your saved records are unchanged. Try opening this screen again.':
    'Ghi chép đã lưu không đổi. Hãy thử mở lại màn hình này.',
  'Your review can continue. Try dismissing or muting again when ready.':
    'Bạn vẫn có thể tiếp tục tổng kết. Hãy thử ẩn hoặc tắt lại khi sẵn sàng.',
  'Your local data is unchanged. Try the action again when ready.':
    'Dữ liệu cục bộ không đổi. Hãy thử thao tác lại khi sẵn sàng.',
  Activity: 'Hoạt động',
  'Cancel reminder edit': 'Hủy chỉnh sửa nhắc nhở',
  'Check recurring fields': 'Kiểm tra trường định kỳ',
  'Choose photo': 'Chọn ảnh',
  'Delete reminder': 'Xóa nhắc nhở',
  'It may already be saved or discarded. Manual expense entry is still available.':
    'Có thể bản nháp đã được lưu hoặc bỏ. Nhập chi tiêu thủ công vẫn khả dụng.',
  'Loading recurring money': 'Đang tải tiền định kỳ',
  'Money, locale, reset-day, and wage defaults are ready for future records.':
    'Tiền, ngôn ngữ/khu vực, ngày đặt lại và lương mặc định đã sẵn sàng cho các ghi chép sau.',
  'No expense is created and no receipt is sent to parsing until a later review step asks for confirmation.':
    'Không tạo chi tiêu và không gửi hóa đơn đi phân tích cho đến khi bước kiểm tra sau yêu cầu xác nhận.',
  'No recurring money yet': 'Chưa có tiền định kỳ',
  'No rollover to next month': 'Không chuyển dư sang tháng sau',
  'Optional.': 'Tùy chọn.',
  Reached: 'Đã đạt',
  'Reminder title': 'Tiêu đề nhắc nhở',
  'Retry reminders': 'Thử lại nhắc nhở',
  'Saving receipt draft': 'Đang lưu bản nháp hóa đơn',
  'Skip next occurrence': 'Bỏ lần xuất hiện tiếp theo',
  'Skip occurrence': 'Bỏ lần xuất hiện',
  'Task updated': 'Đã cập nhật nhiệm vụ',
  'Try again. The draft is still saved locally.': 'Thử lại. Bản nháp vẫn được lưu cục bộ.',
  'Try saving again. Your current edits are still on screen.':
    'Thử lưu lại. Các chỉnh sửa hiện tại vẫn còn trên màn hình.',
  'Use a local date like 2026-05-08.': 'Dùng ngày cục bộ như 2026-05-08.',
  'You can still add, edit, or complete items manually.':
    'Bạn vẫn có thể thêm, sửa hoặc hoàn thành mục thủ công.',
  'You stay in control': 'Bạn vẫn kiểm soát',
  'Your local task data is unchanged. Try loading recurring tasks again.':
    'Dữ liệu nhiệm vụ cục bộ không đổi. Hãy thử tải nhiệm vụ định kỳ lại.',
  'App labels and messages now use the selected language.':
    'Nhãn và thông báo trong app hiện dùng ngôn ngữ đã chọn.',
  'App language': 'Ngôn ngữ ứng dụng',
  'Choose the language used for app labels and messages.':
    'Chọn ngôn ngữ dùng cho nhãn và thông báo trong app.',
  Display: 'Hiển thị',
  English: 'Tiếng Anh',
  'Language saved': 'Đã lưu ngôn ngữ',
  'Language was not saved': 'Chưa lưu ngôn ngữ',
  'Pplant is saving the selected app language.': 'Pplant đang lưu ngôn ngữ ứng dụng đã chọn.',
  'Saving language': 'Đang lưu ngôn ngữ',
  'Try changing language again. The app keeps using the current language.':
    'Thử đổi ngôn ngữ lại. Ứng dụng vẫn dùng ngôn ngữ hiện tại.',
  Vietnamese: 'Tiếng Việt',
  on: 'vào',
  'Your local data is unchanged. Try loading it again.':
    'Dữ liệu cục bộ không đổi. Hãy thử tải lại.',
  'Your local data is unchanged. Try loading recurring tasks again.':
    'Dữ liệu nhiệm vụ cục bộ không đổi. Hãy thử tải nhiệm vụ định kỳ lại.',
  'Your local data is unchanged. Try loading tasks again.':
    'Dữ liệu cục bộ không đổi. Hãy thử tải nhiệm vụ lại.',
  'Your local data is unchanged. Try loading the review again.':
    'Dữ liệu cục bộ không đổi. Hãy thử tải tổng kết lại.',
  'Your local data is unchanged. Try loading the summary again.':
    'Dữ liệu cục bộ không đổi. Hãy thử tải tóm tắt lại.',
  'Your local data is unchanged. Try opening Capture again.':
    'Dữ liệu cục bộ không đổi. Hãy thử mở Ghi nhanh lại.',
  'Your local records are unchanged. Try loading history again.':
    'Ghi chép cục bộ không đổi. Hãy thử tải lịch sử lại.',
  'Your local work entries are unchanged. Try loading history again.':
    'Ca làm cục bộ không đổi. Hãy thử tải lịch sử lại.',
  'Your preferences stay on this device. Try loading them again.':
    'Tùy chọn của bạn vẫn nằm trên thiết bị này. Hãy thử tải lại.',
  'Your review can continue. Try saving or skipping the prompt again when ready.':
    'Bạn vẫn có thể tiếp tục tổng kết. Hãy thử lưu hoặc bỏ qua câu hỏi lại khi sẵn sàng.',
  'Your local data is unchanged. Try opening capture again.':
    'Dữ liệu cục bộ không đổi. Hãy thử mở lại ghi nhanh.',
  'Your planner stays on this device. Try opening the local workspace again.':
    'Sổ kế hoạch vẫn nằm trên thiết bị này. Hãy thử mở lại không gian cục bộ.',
};

const zhHantTranslations: Record<string, string> = {
  Add: '新增',
  'Add category': '新增分類',
  'Add money record': '新增收支紀錄',
  'Add savings goal': '新增儲蓄目標',
  'Add topic': '新增主題',
  Adjust: '調整',
  'Adjust filters or save a money record from Capture.': '調整篩選，或先從輸入頁儲存一筆收支紀錄。',
  All: '全部',
  Amount: '金額',
  'Any category': '所有分類',
  'Any topic': '所有主題',
  'App labels and messages now use the selected language.': '應用程式標籤與提示已改用所選語言。',
  'App language': '應用程式語言',
  'Apply filters': '套用篩選',
  Available: '可選',
  'Back to capture': '回到輸入',
  'Basic settings': '基本設定',
  'Budget and Savings': '預算與儲蓄',
  'Budget and savings': '預算與儲蓄',
  'Budget and savings summaries appear after those settings are saved.':
    '儲存設定後會顯示預算與儲蓄摘要。',
  'Budget left': '剩餘預算',
  'Budget needs attention': '預算需要注意',
  'Budget not set': '尚未設定預算',
  'Budget on track': '預算狀態良好',
  'Budget planning': '預算規劃',
  'Budget planning could not load': '無法載入預算規劃',
  'Budget planning saved': '已儲存預算規劃',
  'Budget planning was not saved': '預算規劃尚未儲存',
  'Budget planning uses your saved currency and monthly reset day.':
    '預算規劃會使用已儲存的幣別與每月重設日。',
  'Budget rules and savings goals are ready for future summaries.':
    '預算規則與儲蓄目標已可用於之後的摘要。',
  Cancel: '取消',
  'Cancel edit': '取消編輯',
  'Cancel reminder edit': '取消提醒編輯',
  'Cancel task edit': '取消任務編輯',
  Capture: '輸入',
  'Capture could not be loaded': '無法載入輸入頁',
  'Capture could not open.': '無法開啟輸入頁。',
  'Capture one item': '輸入一筆項目',
  Categories: '分類',
  'Categories and topics': '分類與主題',
  'Categories are optional. Add them later in Settings.': '分類可留空，也可以之後在設定中新增。',
  Category: '分類',
  'Category and topics': '分類與主題',
  'Check highlighted fields': '請檢查標示欄位',
  'Check reminder fields': '請檢查提醒欄位',
  'Check task fields': '請檢查任務欄位',
  'Check work fields': '請檢查工作欄位',
  'Choose photo': '選擇照片',
  'Choose review period': '選擇回顧期間',
  'Choose the language used for app labels and messages.': '選擇應用程式標籤與訊息使用的語言。',
  'Clear filters': '清除篩選',
  'Clear for now': '先清除',
  'Close sheet': '關閉面板',
  'Create one-time or repeating reminders with local notification fallback.':
    '建立一次性或重複提醒，並在通知不可用時保留本機備援。',
  'Create one-time reminders for student deadlines and routines.':
    '建立學生截止日與日常事項的一次性提醒。',
  Currency: '幣別',
  Daily: '每日',
  'Data controls': '資料控制',
  Date: '日期',
  'Date range': '日期範圍',
  Delete: '刪除',
  'Delete local data': '刪除本機資料',
  'Delete reminder': '刪除提醒',
  'Direct hours': '直接時數',
  Discard: '捨棄',
  Dismiss: '略過',
  Display: '顯示',
  Done: '完成',
  'Draft saved': '草稿已儲存',
  'Due today': '今日到期',
  Edit: '編輯',
  'Edit money record': '編輯收支紀錄',
  English: '英文',
  Entries: '紀錄',
  Expense: '支出',
  Filters: '篩選',
  'Filters active': '篩選中',
  Goals: '目標',
  'HH:mm.': 'HH:mm。',
  Habit: '習慣',
  Help: '說明',
  History: '歷史',
  Hours: '小時',
  Income: '收入',
  Journal: '日記',
  Keep: '保留',
  'Language saved': '語言已儲存',
  'Language was not saved': '語言尚未儲存',
  Listed: '已列出',
  Loading: '載入中',
  'Loading Today': '正在載入今日',
  'Loading capture': '正在載入輸入頁',
  'Loading history': '正在載入歷史',
  'Loading preferences': '正在載入偏好設定',
  'Loading prompts': '正在載入提示',
  'Loading reminders': '正在載入提醒',
  'Loading saved drafts': '正在載入已儲存草稿',
  'Loading tasks': '正在載入任務',
  'Loading today': '正在載入今日',
  'Loading work history': '正在載入工作歷史',
  Locale: '地區格式',
  'Local data updated': '本機資料已更新',
  'Local workspace': '本機工作區',
  'Local workspace controls': '本機工作區控制',
  'Local-first by default': '預設本機優先',
  Log: '紀錄',
  Manual: '手動',
  'Manual capture': '手動輸入',
  'Manual expense': '手動支出',
  'Money Today': '今日收支',
  'Money This Period': '本期間收支',
  'Money and Budget': '收支與預算',
  'Money history': '收支歷史',
  'Money record': '收支紀錄',
  'Money record action did not finish': '收支紀錄操作尚未完成',
  'Money record removed': '已移除收支紀錄',
  'Money record saved': '已儲存收支紀錄',
  'Money record updated': '已更新收支紀錄',
  'Money records use your saved currency and locale so amounts stay consistent.':
    '收支紀錄會使用已儲存的幣別與地區格式，讓金額保持一致。',
  Month: '月',
  Monthly: '每月',
  'Monthly budget': '每月預算',
  'Monthly reset day': '每月重設日',
  Net: '總計',
  Newest: '最新',
  Next: '下一步',
  'Next action': '下一步操作',
  'No activity yet': '尚無活動',
  'No budget or savings setup yet': '尚未設定預算或儲蓄',
  'No category': '無分類',
  'No data': '無資料',
  'No deadline': '無截止日',
  'No money records today': '今日尚無收支紀錄',
  'No records yet': '尚無紀錄',
  'No reminders yet': '尚無提醒',
  'No savings goal yet': '尚無儲蓄目標',
  'No savings goals yet': '尚無儲蓄目標',
  'No spending or income in this period': '本期間尚無支出或收入',
  'No spending or income logged today': '今日尚未記錄支出或收入',
  'No summary yet': '尚無摘要',
  'No tasks yet': '尚無任務',
  'No topic': '無主題',
  'No work entries yet': '尚無工作紀錄',
  Note: '備註',
  Notes: '備註',
  Occurrences: '出現次數',
  'Offline-ready': '可離線使用',
  Oldest: '最舊',
  Open: '開啟',
  'Open Settings': '開啟設定',
  'Open tasks': '開啟任務',
  Optional: '選填',
  'Optional income source.': '選填收入來源。',
  'Optional merchant.': '選填商家。',
  'Optional note': '選填備註',
  'Optional note, kept local.': '選填備註，僅保存在本機。',
  'Pplant could not open local data.': 'Pplant 無法開啟本機資料。',
  'Pplant is calculating this summary from local records.': 'Pplant 正在根據本機紀錄計算摘要。',
  'Pplant is checking the local deletion plan.': 'Pplant 正在檢查本機刪除計畫。',
  'Pplant is gathering the local activity for today.': 'Pplant 正在彙整今日的本機活動。',
  'Pplant is gathering your local overview.': 'Pplant 正在彙整你的本機概覽。',
  'Pplant is opening local money records.': 'Pplant 正在開啟本機收支紀錄。',
  'Pplant is opening your local budget and savings settings.':
    'Pplant 正在開啟本機預算與儲蓄設定。',
  'Pplant is opening your local categories and topics.': 'Pplant 正在開啟本機分類與主題。',
  'Pplant is opening your local money settings.': 'Pplant 正在開啟本機收支設定。',
  'Pplant is opening your local settings.': 'Pplant 正在開啟本機設定。',
  'Pplant is saving the selected app language.': 'Pplant 正在儲存所選應用程式語言。',
  'Past due': '已逾期',
  Paid: '已付',
  Plan: '計畫',
  Preferences: '偏好設定',
  'Preferences saved': '偏好設定已儲存',
  Privacy: '隱私',
  'Privacy controls': '隱私控制',
  'Quick capture': '快速輸入',
  Reached: '已達成',
  Receipt: '收據',
  'Receipt capture': '收據輸入',
  'Receipt draft': '收據草稿',
  'Receipt image': '收據圖片',
  'Receipt review could not load. Manual expense remains available.':
    '無法載入收據檢查，仍可使用手動支出。',
  'Recent Activity': '近期活動',
  Records: '紀錄',
  Recovery: '復原',
  Refresh: '重新整理',
  Refreshing: '正在重新整理',
  Reminder: '提醒',
  Reminders: '提醒',
  'Reminders could not load': '無法載入提醒',
  Remove: '移除',
  Retry: '重試',
  Review: '回顧',
  'Review could not open.': '無法開啟回顧。',
  'Review items': '回顧項目',
  'Review records': '檢視紀錄',
  'Review source': '檢視來源',
  Routines: '例行事項',
  Save: '儲存',
  'Save changes': '儲存變更',
  'Save expense': '儲存支出',
  'Save income': '儲存收入',
  'Save preferences': '儲存偏好設定',
  'Save preferences first': '請先儲存偏好設定',
  'Savings goals': '儲蓄目標',
  'Screen unavailable': '畫面不可用',
  Selected: '已選取',
  Settings: '設定',
  'Settings could not open.': '無法開啟設定。',
  Shift: '班次',
  Source: '來源',
  Spent: '已花費',
  Start: '開始',
  'Start expense capture': '開始輸入支出',
  'Start income capture': '開始輸入收入',
  'Start receipt capture': '開始輸入收據',
  'Start reminder capture': '開始輸入提醒',
  'Start task capture': '開始輸入任務',
  'Start work entry capture': '開始輸入工作紀錄',
  Summary: '摘要',
  'Summary calculated from local records': '摘要根據本機紀錄計算',
  'Take photo': '拍照',
  Task: '任務',
  'Task saved': '任務已儲存',
  'Task title': '任務標題',
  Tasks: '任務',
  'Tasks and Habits': '任務與習慣',
  'Tasks and Reminders': '任務與提醒',
  'That change was not saved': '變更尚未儲存',
  'This month': '本月',
  'This week': '本週',
  Time: '時間',
  Today: '今日',
  'Today could not be loaded': '無法載入今日',
  'Today could not open': '無法開啟今日',
  'Today is clear': '今日很清爽',
  'Today loaded': '今日已載入',
  Topic: '主題',
  Topics: '主題',
  'Topics are optional. Add them later in Settings.': '主題可留空，也可以之後在設定中新增。',
  Total: '總計',
  'Try again. Current edits are still on screen.': '請再試一次。目前編輯內容仍保留在畫面上。',
  'Try changing language again. The app keeps using the current language.':
    '請再試一次切換語言。應用程式會先保留目前語言。',
  'Use YYYY-MM-DD.': '請使用 YYYY-MM-DD。',
  'Use a 3-letter code such as USD, TWD, JPY, or VND.':
    '請使用 USD、TWD、JPY 或 VND 等 3 位幣別代碼。',
  'Use a locale tag such as en-US or vi-VN.': '請使用 en-US、vi-VN 或 zh-TW 等地區標籤。',
  Vietnamese: '越南文',
  Wait: '等待',
  Week: '週',
  Weekly: '每週',
  Work: '工作',
  'Work Context': '工作脈絡',
  'Work This Period': '本期間工作',
  'Work entry': '工作紀錄',
  'Work history': '工作歷史',
  'Work summary': '工作摘要',
  'YYYY-MM-DD': 'YYYY-MM-DD',
  'You stay in control': '控制權在你手上',
  'Your local data is unchanged. Try loading it again.': '本機資料未變更。請再試一次載入。',
  'Your local data is unchanged. Try the action again when ready.':
    '本機資料未變更。準備好後可再試一次。',
  'Your preferences stay on this device. Try loading them again.':
    '你的偏好設定仍保存在這台裝置上。請再試一次載入。',
  'Your saved records are unchanged. Try opening this screen again.':
    '已儲存的紀錄未變更。請再試一次開啟此畫面。',
  繁體中文: '繁體中文',
  on: '於',
};

type DynamicTranslation = {
  pattern: RegExp;
  translate: (...matches: string[]) => string;
};

const dynamicViTranslations: DynamicTranslation[] = [
  {
    pattern: /^Budget period (.+) to (.+)\.$/,
    translate: (start, end) => `Kỳ ngân sách ${start} đến ${end}.`,
  },
  {
    pattern: /^Remaining this period: (.+)\.$/,
    translate: (amount) => `Còn lại kỳ này: ${amount}.`,
  },
  {
    pattern: /^Uses (.+)\.$/,
    translate: (currency) => `Dùng ${currency}.`,
  },
  {
    pattern: /^(.+) saved$/,
    translate: (value) => `Đã tiết kiệm ${value}`,
  },
  {
    pattern: /^(.+) of (.+)$/,
    translate: (current, target) => `${current} / ${target}`,
  },
  {
    pattern: /^(.+) saved of (.+)$/,
    translate: (current, target) => `Đã tiết kiệm ${current} / ${target}`,
  },
  {
    pattern: /^(\d+) bytes$/,
    translate: (bytes) => `${bytes} byte`,
  },
  {
    pattern: /^(\d+) proposed$/,
    translate: (count) => `${count} đề xuất`,
  },
  {
    pattern: /^(\d+) open$/,
    translate: (count) => `${count} đang mở`,
  },
  {
    pattern: /^(\d+) doing$/,
    translate: (count) => `${count} đang làm`,
  },
  {
    pattern: /^(\d+) done$/,
    translate: (count) => `${count} đã xong`,
  },
  {
    pattern: /^(\d+) overdue$/,
    translate: (count) => `${count} quá hạn`,
  },
  {
    pattern: /^Item (\d+)$/,
    translate: (index) => `Mục ${index}`,
  },
  {
    pattern: /^Item (\d+) amount$/,
    translate: (index) => `Số tiền mục ${index}`,
  },
  {
    pattern: /^Line item (\d+)$/,
    translate: (index) => `Dòng hàng ${index}`,
  },
  {
    pattern: /^Total \((.+)\)$/,
    translate: (currency) => `Tổng (${currency})`,
  },
  {
    pattern: /^Move (.+) up$/,
    translate: (name) => `Chuyển ${name} lên`,
  },
  {
    pattern: /^Move (.+) down$/,
    translate: (name) => `Chuyển ${name} xuống`,
  },
  {
    pattern: /^Remove (.+)$/,
    translate: (name) => `Xóa ${name}`,
  },
  {
    pattern: /^Open (.+) privacy details$/,
    translate: (title) => `Mở chi tiết quyền riêng tư của ${translateTextForLanguage('vi', title)}`,
  },
  {
    pattern: /^Add a local (category|topic) for future records\.$/,
    translate: (kind) =>
      `Thêm ${kind === 'category' ? 'danh mục' : 'chủ đề'} cục bộ cho các ghi chép sau.`,
  },
  {
    pattern: /^New (category|topic)$/,
    translate: (kind) => `${kind === 'category' ? 'Danh mục' : 'Chủ đề'} mới`,
  },
  {
    pattern: /^Edit (category|topic)$/,
    translate: (kind) => `Sửa ${kind === 'category' ? 'danh mục' : 'chủ đề'}`,
  },
  {
    pattern: /^Add (category|topic)$/,
    translate: (kind) => `Thêm ${kind === 'category' ? 'danh mục' : 'chủ đề'}`,
  },
  {
    pattern: /^No (categories|topics) yet$/,
    translate: (kind) => `Chưa có ${kind === 'categories' ? 'danh mục' : 'chủ đề'}`,
  },
  {
    pattern: /^Create a (category|topic) above to make it available for future records\.$/,
    translate: (kind) =>
      `Tạo ${kind === 'category' ? 'danh mục' : 'chủ đề'} ở trên để dùng cho các ghi chép sau.`,
  },
  {
    pattern: /^(.+) is used by (\d+) saved record(s?)\.$/,
    translate: (name, count) => `${name} đang được dùng bởi ${count} ghi chép đã lưu.`,
  },
  {
    pattern: /^(.+) is not used by saved records yet\.$/,
    translate: (name) => `${name} chưa được dùng bởi ghi chép đã lưu nào.`,
  },
  {
    pattern: /^Uses (.+); reset day (.+) comes from Preferences\.$/,
    translate: (currency, day) => `Dùng ${currency}; ngày đặt lại ${day} lấy từ Tùy chọn.`,
  },
  {
    pattern:
      /^(.+) saved from reviewed receipt fields\. The receipt draft is hidden from active drafts\.$/,
    translate: (amount) =>
      `${amount} đã được lưu từ các trường hóa đơn đã kiểm tra. Bản nháp hóa đơn đã ẩn khỏi bản nháp hoạt động.`,
  },
  {
    pattern: /^(.+) receipt expense saved\. Parsed data stayed as review context\.$/,
    translate: (amount) =>
      `Đã lưu chi tiêu hóa đơn ${amount}. Dữ liệu phân tích vẫn được giữ làm ngữ cảnh kiểm tra.`,
  },
  {
    pattern: /^(.+) Receipt image deleted by your retention choice\.$/,
    translate: (message) =>
      `${translateTextForLanguage('vi', message)} Ảnh hóa đơn đã được xóa theo lựa chọn lưu giữ của bạn.`,
  },
  {
    pattern: /^(.+) Receipt image stayed retained; you can delete it later\.$/,
    translate: (message) =>
      `${translateTextForLanguage('vi', message)} Ảnh hóa đơn vẫn được giữ; bạn có thể xóa sau.`,
  },
  {
    pattern: /^Image deleted; expense details remain\. (.+)$/,
    translate: (deletedAt) => `Ảnh đã xóa; chi tiết chi tiêu vẫn còn. ${deletedAt}`,
  },
  {
    pattern: /^(.+) confidence$/,
    translate: (confidence) =>
      `Độ tin cậy ${translateTextForLanguage('vi', confidence).toLowerCase()}`,
  },
  {
    pattern: /^Income (.+) - Expense (.+)$/,
    translate: (income, expense) => `Thu nhập ${income} - Chi tiêu ${expense}`,
  },
  {
    pattern: /^Earned (.+) - (.+) hours$/,
    translate: (earned, hours) => `Đã kiếm ${earned} - ${hours} giờ`,
  },
  {
    pattern: /^(.+) uses the latest saved records and does not write back to them\.$/,
    translate: (period) => `${period} dùng các ghi chép đã lưu mới nhất và không ghi ngược lại.`,
  },
  {
    pattern: /^(\d+) min$/,
    translate: (minutes) => `${minutes} phút`,
  },
  {
    pattern: /^(\d+) hr$/,
    translate: (hours) => `${hours} giờ`,
  },
  {
    pattern: /^(\d+) hr (\d+) min$/,
    translate: (hours, minutes) => `${hours} giờ ${minutes} phút`,
  },
  {
    pattern: /^(.+) priority$/,
    translate: (priority) => `Ưu tiên ${translateTextForLanguage('vi', priority).toLowerCase()}`,
  },
];

const dynamicZhHantTranslations: DynamicTranslation[] = [
  {
    pattern: /^Budget period (.+) to (.+)\.$/,
    translate: (start, end) => `預算期間：${start} 至 ${end}。`,
  },
  {
    pattern: /^Remaining this period: (.+)\.$/,
    translate: (amount) => `本期間剩餘：${amount}。`,
  },
  {
    pattern: /^Uses (.+)\.$/,
    translate: (currency) => `使用 ${currency}。`,
  },
  {
    pattern: /^(.+) saved$/,
    translate: (value) => `已儲蓄 ${value}`,
  },
  {
    pattern: /^(.+) of (.+)$/,
    translate: (current, target) => `${current} / ${target}`,
  },
  {
    pattern: /^(.+) saved of (.+)$/,
    translate: (current, target) => `已儲蓄 ${current} / ${target}`,
  },
  {
    pattern: /^(\d+) bytes$/,
    translate: (bytes) => `${bytes} 位元組`,
  },
  {
    pattern: /^(\d+) proposed$/,
    translate: (count) => `${count} 個建議`,
  },
  {
    pattern: /^(\d+) open$/,
    translate: (count) => `${count} 個開啟中`,
  },
  {
    pattern: /^(\d+) doing$/,
    translate: (count) => `${count} 個進行中`,
  },
  {
    pattern: /^(\d+) done$/,
    translate: (count) => `${count} 個已完成`,
  },
  {
    pattern: /^(\d+) overdue$/,
    translate: (count) => `${count} 個已逾期`,
  },
  {
    pattern: /^Item (\d+)$/,
    translate: (index) => `項目 ${index}`,
  },
  {
    pattern: /^Item (\d+) amount$/,
    translate: (index) => `項目 ${index} 金額`,
  },
  {
    pattern: /^Line item (\d+)$/,
    translate: (index) => `明細 ${index}`,
  },
  {
    pattern: /^Total \((.+)\)$/,
    translate: (currency) => `總計（${currency}）`,
  },
  {
    pattern: /^Move (.+) up$/,
    translate: (name) => `將 ${name} 上移`,
  },
  {
    pattern: /^Move (.+) down$/,
    translate: (name) => `將 ${name} 下移`,
  },
  {
    pattern: /^Remove (.+)$/,
    translate: (name) => `移除 ${name}`,
  },
  {
    pattern: /^Open (.+) privacy details$/,
    translate: (title) => `開啟 ${translateTextForLanguage('zh-Hant', title)} 的隱私詳細資訊`,
  },
  {
    pattern: /^Add a local (category|topic) for future records\.$/,
    translate: (kind) => `新增本機${kind === 'category' ? '分類' : '主題'}，供之後的紀錄使用。`,
  },
  {
    pattern: /^New (category|topic)$/,
    translate: (kind) => `新增${kind === 'category' ? '分類' : '主題'}`,
  },
  {
    pattern: /^Edit (category|topic)$/,
    translate: (kind) => `編輯${kind === 'category' ? '分類' : '主題'}`,
  },
  {
    pattern: /^Add (category|topic)$/,
    translate: (kind) => `新增${kind === 'category' ? '分類' : '主題'}`,
  },
  {
    pattern: /^No (categories|topics) yet$/,
    translate: (kind) => `尚無${kind === 'categories' ? '分類' : '主題'}`,
  },
  {
    pattern: /^Create a (category|topic) above to make it available for future records\.$/,
    translate: (kind) =>
      `在上方建立${kind === 'category' ? '分類' : '主題'}，即可供之後的紀錄使用。`,
  },
  {
    pattern: /^(.+) is used by (\d+) saved record(s?)\.$/,
    translate: (name, count) => `${name} 已被 ${count} 筆已儲存紀錄使用。`,
  },
  {
    pattern: /^(.+) is not used by saved records yet\.$/,
    translate: (name) => `${name} 尚未被已儲存紀錄使用。`,
  },
  {
    pattern: /^Uses (.+); reset day (.+) comes from Preferences\.$/,
    translate: (currency, day) => `使用 ${currency}；重設日 ${day} 來自偏好設定。`,
  },
  {
    pattern: /^Income (.+) - Expense (.+)$/,
    translate: (income, expense) => `收入 ${income} - 支出 ${expense}`,
  },
  {
    pattern: /^Earned (.+) - (.+) hours$/,
    translate: (earned, hours) => `已賺取 ${earned} - ${hours} 小時`,
  },
  {
    pattern: /^(.+) uses the latest saved records and does not write back to them\.$/,
    translate: (period) => `${period} 使用最新已儲存紀錄，且不會回寫資料。`,
  },
  {
    pattern: /^(\d+) min$/,
    translate: (minutes) => `${minutes} 分鐘`,
  },
  {
    pattern: /^(\d+) hr$/,
    translate: (hours) => `${hours} 小時`,
  },
  {
    pattern: /^(\d+) hr (\d+) min$/,
    translate: (hours, minutes) => `${hours} 小時 ${minutes} 分鐘`,
  },
  {
    pattern: /^(.+) priority$/,
    translate: (priority) => `${translateTextForLanguage('zh-Hant', priority)}優先`,
  },
];

const exactTranslationsByLanguage: Partial<Record<AppLanguage, Record<string, string>>> = {
  vi: viTranslations,
  'zh-Hant': zhHantTranslations,
};

const dynamicTranslationsByLanguage: Partial<Record<AppLanguage, DynamicTranslation[]>> = {
  vi: dynamicViTranslations,
  'zh-Hant': dynamicZhHantTranslations,
};

export function translateText(value: string): string {
  return translateTextForLanguage(currentAppLanguage, value);
}

export function translateTextForLanguage(language: AppLanguage, value: string): string {
  if (language === 'en') {
    return value;
  }

  const exact = exactTranslationsByLanguage[language]?.[value];

  if (exact) {
    return exact;
  }

  for (const dynamicTranslation of dynamicTranslationsByLanguage[language] ?? []) {
    const match = value.match(dynamicTranslation.pattern);

    if (match) {
      return dynamicTranslation.translate(...match.slice(1));
    }
  }

  return value;
}

export function translateOptionalText(value?: string | null): string | undefined {
  return value ? translateText(value) : undefined;
}
