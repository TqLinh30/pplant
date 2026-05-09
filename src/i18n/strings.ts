export type AppLanguage = 'en' | 'vi';

export const appLanguage: AppLanguage = 'vi';

const viTranslations: Record<string, string> = {
  'Add': 'Thêm',
  'Add money record': 'Thêm ghi chép tiền',
  'Add savings goal': 'Thêm mục tiêu tiết kiệm',
  'Amount': 'Số tiền',
  'Any category': 'Mọi danh mục',
  'Any topic': 'Mọi chủ đề',
  'Apply filters': 'Áp dụng bộ lọc',
  'Available': 'Có thể chọn',
  'Budget and savings': 'Ngân sách và tiết kiệm',
  'Budget needs attention': 'Ngân sách cần chú ý',
  'Budget not set': 'Chưa đặt ngân sách',
  'Budget on track': 'Ngân sách ổn định',
  'Budget planning': 'Lập kế hoạch ngân sách',
  'Budget planning uses your saved currency and monthly reset day.':
    'Kế hoạch ngân sách dùng đơn vị tiền và ngày đặt lại hằng tháng đã lưu.',
  'Cancel': 'Hủy',
  'Cancel edit': 'Hủy chỉnh sửa',
  'Cancel task edit': 'Hủy chỉnh sửa nhiệm vụ',
  'Capture': 'Ghi nhanh',
  'Capture could not open.': 'Không thể mở ghi nhanh.',
  'Capture one item': 'Ghi một mục',
  'Categories and topics': 'Danh mục và chủ đề',
  'Categories are optional. Add them later in Settings.':
    'Danh mục là tùy chọn. Bạn có thể thêm sau trong Cài đặt.',
  'Category': 'Danh mục',
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
  'Currency': 'Tiền tệ',
  'Daily': 'Hằng ngày',
  'Data controls': 'Quản lý dữ liệu',
  'Date': 'Ngày',
  'Date range': 'Khoảng ngày',
  'Default hourly wage': 'Lương theo giờ mặc định',
  'Delete local data': 'Xóa dữ liệu cục bộ',
  'Direct hours': 'Giờ trực tiếp',
  'Draft saved': 'Đã lưu bản nháp',
  'Due today': 'Đến hạn hôm nay',
  'Edit': 'Sửa',
  'Edit money record': 'Sửa ghi chép tiền',
  'Each highlighted field includes the next correction to make.':
    'Mỗi trường được đánh dấu có hướng dẫn cần sửa tiếp theo.',
  'Earned': 'Đã kiếm',
  'Expense': 'Chi tiêu',
  'Estimated context': 'Ngữ cảnh ước tính',
  'Filters active': 'Đang bật bộ lọc',
  'History': 'Lịch sử',
  'Income': 'Thu nhập',
  'Keep reusable labels for future money, work, task, and reflection records.':
    'Giữ các nhãn dùng lại cho ghi chép tiền, công việc, nhiệm vụ và phản tư sau này.',
  'Locale': 'Ngôn ngữ/khu vực',
  'Loading Today': 'Đang tải Hôm nay',
  'Loading capture': 'Đang mở ghi nhanh',
  'Loading preferences': 'Đang tải tùy chọn',
  'Loading recurring money.': 'Đang tải tiền định kỳ.',
  'Loading today': 'Đang tải hôm nay',
  'Local workspace': 'Không gian cục bộ',
  'Local workspace controls': 'Cài đặt cục bộ',
  'Manual capture': 'Ghi thủ công',
  'Monthly': 'Hằng tháng',
  'Monthly budget': 'Ngân sách tháng',
  'Monthly reset day': 'Ngày đặt lại hằng tháng',
  'Money and Budget': 'Tiền và ngân sách',
  'Money record action did not finish': 'Thao tác ghi chép tiền chưa hoàn tất',
  'Money record removed': 'Đã xóa ghi chép tiền',
  'Money record saved': 'Đã lưu ghi chép tiền',
  'Money record updated': 'Đã cập nhật ghi chép tiền',
  'Money records use your saved currency and locale so amounts stay consistent.':
    'Ghi chép tiền dùng tiền tệ và ngôn ngữ/khu vực đã lưu để số tiền luôn nhất quán.',
  'Net': 'Ròng',
  'No account, cloud sync, or setup is needed.': 'Không cần tài khoản, đồng bộ đám mây hay thiết lập thêm.',
  'No activity yet': 'Chưa có hoạt động',
  'No category': 'Không có danh mục',
  'No deadline': 'Không có hạn',
  'No money records today': 'Hôm nay chưa có ghi chép tiền',
  'No records yet': 'Chưa có ghi chép',
  'No savings goal yet': 'Chưa có mục tiêu tiết kiệm',
  'No summary yet': 'Chưa có tóm tắt',
  'No topic': 'Không có chủ đề',
  'Note': 'Ghi chú',
  'Offline-ready': 'Sẵn sàng khi offline',
  'Open': 'Đang mở',
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
  'Paid': 'Đã trả',
  'Plan': 'Lên kế hoạch',
  'Preferences': 'Tùy chọn',
  'Preferences needed': 'Cần lưu tùy chọn',
  'Preview the impact before removing local records, drafts, receipt images, diagnostics, or workspace data.':
    'Xem trước tác động trước khi xóa ghi chép, bản nháp, ảnh hóa đơn, chẩn đoán hoặc dữ liệu không gian làm việc cục bộ.',
  'Privacy': 'Quyền riêng tư',
  'Privacy controls': 'Quản lý quyền riêng tư',
  'Quick capture': 'Ghi nhanh',
  'Recent Activity': 'Hoạt động gần đây',
  'Recent money records': 'Ghi chép tiền gần đây',
  'Receipt': 'Hóa đơn',
  'Record organization': 'Tổ chức ghi chép',
  'Record allowance, pay, or other income.': 'Ghi tiền trợ cấp, lương hoặc nguồn thu khác.',
  'Record spending manually.': 'Ghi khoản chi thủ công.',
  'Recurring category': 'Danh mục định kỳ',
  'Recurring money': 'Tiền định kỳ',
  'Recurring topics': 'Chủ đề định kỳ',
  'Recovery': 'Khôi phục',
  'Refreshing': 'Đang làm mới',
  'Reminder': 'Nhắc nhở',
  'Retry': 'Thử lại',
  'Retry after saving preferences': 'Thử lại sau khi lưu tùy chọn',
  'Return to Today': 'Quay lại Hôm nay',
  'Review': 'Tổng kết',
  'Review how Pplant handles local data, receipt photos, parsing, notifications, and diagnostics.':
    'Xem cách Pplant xử lý dữ liệu cục bộ, ảnh hóa đơn, phân tích, thông báo và chẩn đoán.',
  'Review items': 'Xem các mục',
  'Review source': 'Xem nguồn',
  'Review drafts': 'Xem bản nháp',
  'Routines': 'Thói quen',
  'Save': 'Lưu',
  'Save a local expense or income record with the context you know now.':
    'Lưu khoản chi hoặc thu nhập cục bộ với ngữ cảnh bạn biết hiện tại.',
  'Save a receipt photo as a local expense draft.': 'Lưu ảnh hóa đơn thành bản nháp chi tiêu cục bộ.',
  'Save preferences first': 'Hãy lưu tùy chọn trước',
  'Save preferences first.': 'Hãy lưu tùy chọn trước.',
  'Save predictable expenses or income as templates, then materialize only due occurrences.':
    'Lưu các khoản chi hoặc thu nhập lặp lại thành mẫu, rồi chỉ tạo ghi chép thật khi đến hạn.',
  'Save changes': 'Lưu thay đổi',
  'Save expense': 'Lưu chi tiêu',
  'Save income': 'Lưu thu nhập',
  'Save preferences': 'Lưu tùy chọn',
  'Savings': 'Tiết kiệm',
  'Savings goals': 'Mục tiêu tiết kiệm',
  'Screen unavailable': 'Màn hình chưa khả dụng',
  'Selected': 'Đã chọn',
  'Settings': 'Cài đặt',
  'Settings could not open.': 'Không thể mở Cài đặt.',
  'Set a monthly budget to see remaining money for the current reset period.':
    'Đặt ngân sách tháng để xem số tiền còn lại trong kỳ hiện tại.',
  'Set a monthly limit and basic savings goals for later Today and Review summaries.':
    'Đặt giới hạn tháng và mục tiêu tiết kiệm cơ bản cho các tóm tắt Hôm nay và Tổng kết sau này.',
  'Set reminder with local-only fallback if notifications are off.':
    'Đặt nhắc nhở với phương án cục bộ nếu thông báo bị tắt.',
  'Set the local defaults Pplant uses for money, calendar grouping, and work-time context.':
    'Đặt mặc định cục bộ mà Pplant dùng cho tiền, nhóm lịch và ngữ cảnh thời gian làm việc.',
  'Source': 'Nguồn',
  'Some context is approximate or derived from saved defaults. The source label stays visible.':
    'Một số ngữ cảnh là ước tính hoặc suy ra từ mặc định đã lưu. Nhãn nguồn vẫn được hiển thị.',
  'Some items need a calm check. Recovery actions are optional and local.':
    'Một số mục cần kiểm tra nhẹ nhàng. Hành động khôi phục là tùy chọn và chỉ cục bộ.',
  'Some items need attention': 'Một số mục cần chú ý',
  'Start': 'Bắt đầu',
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
  'Task': 'Nhiệm vụ',
  'Tap a saved record to edit or remove it from active records.':
    'Chạm vào ghi chép đã lưu để sửa hoặc xóa khỏi danh sách đang hoạt động.',
  'Tasks and Reminders': 'Nhiệm vụ và nhắc nhở',
  'That change was not saved': 'Thay đổi đó chưa được lưu',
  'The last overview stays visible while local data reloads.':
    'Phần nhìn gần nhất vẫn hiển thị trong khi dữ liệu cục bộ tải lại.',
  'This overview is from the last successful local load. Try refreshing when ready.':
    'Phần nhìn này đến từ lần tải cục bộ thành công gần nhất. Hãy thử làm mới khi sẵn sàng.',
  'This Pplant surface has not been connected yet.': 'Màn hình Pplant này chưa được kết nối.',
  'Time': 'Thời gian',
  'Today': 'Hôm nay',
  'Today could not open': 'Không thể mở Hôm nay',
  'Today is ready with the latest local data Pplant could load.':
    'Hôm nay đã sẵn sàng với dữ liệu cục bộ mới nhất Pplant tải được.',
  'Today is clear': 'Hôm nay đang trống',
  'Today loaded': 'Đã tải Hôm nay',
  'Today needs your currency, locale, reset day, and wage defaults.':
    'Hôm nay cần tiền tệ, ngôn ngữ/khu vực, ngày đặt lại và lương mặc định của bạn.',
  'Today will fill in as you capture money, work, and tasks.':
    'Hôm nay sẽ được lấp đầy khi bạn ghi tiền, công việc và nhiệm vụ.',
  'Topics': 'Chủ đề',
  'Topics are optional. Add them later in Settings.':
    'Chủ đề là tùy chọn. Bạn có thể thêm sau trong Cài đặt.',
  'Try again. Current edits are still on screen.': 'Thử lại. Các chỉnh sửa hiện tại vẫn còn trên màn hình.',
  'Update the active record. Manual changes become the source of truth.':
    'Cập nhật ghi chép đang hoạt động. Thay đổi thủ công sẽ là nguồn sự thật.',
  'Unpaid': 'Chưa trả',
  'Use local capture': 'Dùng ghi nhanh cục bộ',
  'Use YYYY-MM-DD.': 'Dùng YYYY-MM-DD.',
  'Use a 3-letter code such as USD, TWD, JPY, or VND.':
    'Dùng mã tiền tệ 3 chữ như USD, TWD, JPY hoặc VND.',
  'Use a locale tag such as en-US or vi-VN.': 'Dùng mã ngôn ngữ/khu vực như en-US hoặc vi-VN.',
  'Weekly': 'Hằng tuần',
  'Wait': 'Chờ',
  'Work Context': 'Ngữ cảnh công việc',
  'Work entry': 'Ca làm',
  'Work': 'Công việc',
  'Action did not finish': 'Thao tác chưa hoàn tất',
  'Add category': 'Thêm danh mục',
  'Add topic': 'Thêm chủ đề',
  'Affected data': 'Dữ liệu bị ảnh hưởng',
  'Affected data categories': 'Nhóm dữ liệu bị ảnh hưởng',
  'All': 'Tất cả',
  'Apply work filters': 'Áp dụng bộ lọc công việc',
  'Back to capture': 'Quay lại ghi nhanh',
  'Before enablement': 'Trước khi bật',
  'Blank uses saved default wage.': 'Để trống sẽ dùng lương mặc định đã lưu.',
  'Break': 'Nghỉ giữa ca',
  'Cancel recurring edit': 'Hủy chỉnh sửa định kỳ',
  'Captured': 'Đã chụp',
  'Category and topics': 'Danh mục và chủ đề',
  'Check filters': 'Kiểm tra bộ lọc',
  'Check recurring task fields': 'Kiểm tra thông tin định kỳ',
  'Check the highlighted receipt fields before saving.': 'Kiểm tra các trường hóa đơn được đánh dấu trước khi lưu.',
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
  'Day': 'Ngày',
  'Deadline': 'Hạn',
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
  'Done': 'Xong',
  'Draft discarded': 'Đã bỏ bản nháp',
  'Draft updated': 'Bản nháp đã cập nhật',
  'Edit draft fields': 'Sửa trường bản nháp',
  'Edit review fields': 'Sửa trường kiểm tra',
  'End date': 'Ngày kết thúc',
  'End of day': 'Cuối ngày',
  'End time': 'Giờ kết thúc',
  'Ends on': 'Kết thúc vào',
  'Enter hours, like 2 or 1.5.': 'Nhập số giờ, ví dụ 2 hoặc 1.5.',
  'File': 'Tệp',
  'Filters': 'Bộ lọc',
  'From': 'Từ',
  'Goal name': 'Tên mục tiêu',
  'Habit': 'Thói quen',
  'High': 'Cao',
  'Hours': 'Giờ',
  'Ignore item': 'Bỏ qua mục',
  'Ignore line items': 'Bỏ qua dòng hàng',
  'Ignored by you': 'Bạn đã bỏ qua',
  'Image deleted; expense details remain.': 'Ảnh đã xóa; chi tiết chi tiêu vẫn còn.',
  'Item': 'Mục',
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
  'Low': 'Thấp',
  'Manual alternative': 'Cách làm thủ công',
  'Manual expense': 'Nhập chi tiêu thủ công',
  'Manual progress for now; money records can update this later.':
    'Hiện tiến độ nhập thủ công; ghi chép tiền có thể cập nhật phần này sau.',
  'Max amount': 'Số tiền tối đa',
  'Medium': 'Trung bình',
  'Merchant': 'Người bán',
  'Merchant or source': 'Người bán hoặc nguồn',
  'Min amount': 'Số tiền tối thiểu',
  'Money history': 'Lịch sử tiền',
  'Month': 'Tháng',
  'Newest': 'Mới nhất',
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
  'Oldest': 'Cũ nhất',
  'Optional for quick capture.': 'Tùy chọn cho ghi nhanh.',
  'Optional for quick planning.': 'Tùy chọn cho lập kế hoạch nhanh.',
  'Optional for quick setup.': 'Tùy chọn cho thiết lập nhanh.',
  'Optional unpaid break minutes.': 'Số phút nghỉ không lương, tùy chọn.',
  'Organization could not load': 'Không thể tải tổ chức',
  'Organization saved': 'Đã lưu tổ chức',
  'Organization was not saved': 'Chưa lưu tổ chức',
  'Past Reflections': 'Phản tư đã qua',
  'Pause': 'Tạm dừng',
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
  'Receipt draft discarded. No expense was created.': 'Đã bỏ bản nháp hóa đơn. Không tạo chi tiêu nào.',
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
  'Reassign': 'Gán lại',
  'Reassign target': 'Đích gán lại',
  'Recovery options are not available right now': 'Hiện chưa có tùy chọn khôi phục',
  'Refresh': 'Làm mới',
  'Remove from active tasks': 'Xóa khỏi nhiệm vụ đang hoạt động',
  'Remove from active work': 'Xóa khỏi công việc đang hoạt động',
  'Remove item': 'Xóa mục',
  'Resume': 'Tiếp tục',
  'Resume parsing': 'Tiếp tục phân tích',
  'Retention': 'Lưu giữ',
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
  'Shift': 'Ca làm',
  'Similar expense': 'Chi tiêu tương tự',
  'Size unavailable': 'Không có kích thước',
  'Skip next': 'Bỏ lần tiếp theo',
  'Standalone': 'Độc lập',
  'Start date': 'Ngày bắt đầu',
  'Start parsing': 'Bắt đầu phân tích',
  'Start time': 'Giờ bắt đầu',
  'State': 'Trạng thái',
  'Stop series': 'Dừng chuỗi',
  'Stored as integer minor units so wage math stays exact.':
    'Lưu bằng đơn vị tiền nhỏ nhất để tính lương chính xác.',
  'Stored as minor units after validation.': 'Lưu bằng đơn vị tiền nhỏ nhất sau khi xác thực.',
  'Stored size': 'Kích thước đã lưu',
  'Summary': 'Tóm tắt',
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
  'To': 'Đến',
  'To Do': 'Cần làm',
  'Total': 'Tổng',
  'Try again from Today or Capture. Manual expense entry is still available.':
    'Thử lại từ Hôm nay hoặc Ghi nhanh. Nhập chi tiêu thủ công vẫn khả dụng.',
  'Try again or choose another step.': 'Thử lại hoặc chọn bước khác.',
  'Try the local deletion again.': 'Thử xóa cục bộ lại.',
  'Unknown': 'Không rõ',
  'Unknown fields': 'Trường không rõ',
  'Unnamed': 'Chưa đặt tên',
  'Updated locally': 'Đã cập nhật cục bộ',
  'Use HH:MM.': 'Dùng HH:MM.',
  'Week': 'Tuần',
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
  'Pplant is gathering the local activity for today.': 'Pplant đang tổng hợp hoạt động cục bộ hôm nay.',
  'Pplant is opening local money records.': 'Pplant đang mở ghi chép tiền cục bộ.',
  'Receipt capture': 'Ghi hóa đơn',
  'Records': 'Ghi chép',
  'Recent tasks': 'Nhiệm vụ gần đây',
  'Recent work entries': 'Ca làm gần đây',
  'Reminders': 'Nhắc nhở',
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
  'Topic': 'Chủ đề',
  'Active categories and topics are ready for future records.':
    'Danh mục và chủ đề đang hoạt động đã sẵn sàng cho các ghi chép sau.',
  'Add a goal in Settings to track manual saved amount without changing money records.':
    'Thêm mục tiêu trong Cài đặt để theo dõi số tiền đã tiết kiệm thủ công mà không đổi ghi chép tiền.',
  'Adjust': 'Điều chỉnh',
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
  'Dismiss': 'Ẩn',
  'Dismissed pairs stay hidden for this period. Muted pairs stay hidden in future reviews.':
    'Các cặp đã ẩn sẽ ẩn trong kỳ này. Các cặp đã tắt sẽ ẩn ở các lần tổng kết sau.',
  'Discard': 'Bỏ',
  'Draft action did not finish': 'Thao tác bản nháp chưa hoàn tất',
  'Drafts could not load': 'Không thể tải bản nháp',
  'Edit reminder timing': 'Sửa thời gian nhắc nhở',
  'Editing reminder timing': 'Đang sửa thời gian nhắc nhở',
  'End': 'Kết thúc',
  'End-of-day review could not be loaded': 'Không thể tải tổng kết cuối ngày',
  'Entries': 'Mục',
  'Feature ready': 'Tính năng đã sẵn sàng',
  'Foundation ready': 'Nền tảng đã sẵn sàng',
  'Goals': 'Mục tiêu',
  'HH:mm.': 'HH:mm.',
  'History could not be loaded': 'Không thể tải lịch sử',
  'Insight preference did not save': 'Chưa lưu tùy chọn gợi ý',
  'Keep': 'Giữ',
  'Listed': 'Đã liệt kê',
  'Loading prompts': 'Đang tải câu hỏi',
  'Loading reflection history': 'Đang tải lịch sử phản tư',
  'Loading reminders': 'Đang tải nhắc nhở',
  'Loading saved drafts': 'Đang tải bản nháp đã lưu',
  'Loading tasks': 'Đang tải nhiệm vụ',
  'Loading work history': 'Đang tải lịch sử công việc',
  'Log': 'Ghi',
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
  'Notes': 'Ghi chú',
  'Occurrences': 'Lần xuất hiện',
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
  'Save a manual expense or income record above.':
    'Lưu chi tiêu hoặc thu nhập thủ công ở trên.',
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
  'Spent': 'Đã chi',
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
  'The review refreshed from the saved task record.':
    'Tổng kết đã làm mới từ nhiệm vụ đã lưu.',
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
  'Activity': 'Hoạt động',
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
  'Reached': 'Đã đạt',
  'Reminder title': 'Tiêu đề nhắc nhở',
  'Retry reminders': 'Thử lại nhắc nhở',
  'Saving receipt draft': 'Đang lưu bản nháp hóa đơn',
  'Skip next occurrence': 'Bỏ lần xuất hiện tiếp theo',
  'Skip occurrence': 'Bỏ lần xuất hiện',
  'Task updated': 'Đã cập nhật nhiệm vụ',
  'Try again. The draft is still saved locally.':
    'Thử lại. Bản nháp vẫn được lưu cục bộ.',
  'Try saving again. Your current edits are still on screen.':
    'Thử lưu lại. Các chỉnh sửa hiện tại vẫn còn trên màn hình.',
  'Use a local date like 2026-05-08.': 'Dùng ngày cục bộ như 2026-05-08.',
  'You can still add, edit, or complete items manually.':
    'Bạn vẫn có thể thêm, sửa hoặc hoàn thành mục thủ công.',
  'You stay in control': 'Bạn vẫn kiểm soát',
  'Your local task data is unchanged. Try loading recurring tasks again.':
    'Dữ liệu nhiệm vụ cục bộ không đổi. Hãy thử tải nhiệm vụ định kỳ lại.',
  'on': 'vào',
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
    translate: (title) => `Mở chi tiết quyền riêng tư của ${translateText(title)}`,
  },
  {
    pattern: /^Add a local (category|topic) for future records\.$/,
    translate: (kind) => `Thêm ${kind === 'category' ? 'danh mục' : 'chủ đề'} cục bộ cho các ghi chép sau.`,
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
    pattern: /^(.+) saved from reviewed receipt fields\. The receipt draft is hidden from active drafts\.$/,
    translate: (amount) => `${amount} đã được lưu từ các trường hóa đơn đã kiểm tra. Bản nháp hóa đơn đã ẩn khỏi bản nháp hoạt động.`,
  },
  {
    pattern: /^(.+) receipt expense saved\. Parsed data stayed as review context\.$/,
    translate: (amount) => `Đã lưu chi tiêu hóa đơn ${amount}. Dữ liệu phân tích vẫn được giữ làm ngữ cảnh kiểm tra.`,
  },
  {
    pattern: /^(.+) Receipt image deleted by your retention choice\.$/,
    translate: (message) => `${translateText(message)} Ảnh hóa đơn đã được xóa theo lựa chọn lưu giữ của bạn.`,
  },
  {
    pattern: /^(.+) Receipt image stayed retained; you can delete it later\.$/,
    translate: (message) => `${translateText(message)} Ảnh hóa đơn vẫn được giữ; bạn có thể xóa sau.`,
  },
  {
    pattern: /^Image deleted; expense details remain\. (.+)$/,
    translate: (deletedAt) => `Ảnh đã xóa; chi tiết chi tiêu vẫn còn. ${deletedAt}`,
  },
  {
    pattern: /^(.+) confidence$/,
    translate: (confidence) => `Độ tin cậy ${translateText(confidence).toLowerCase()}`,
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
    translate: (priority) => `Ưu tiên ${translateText(priority).toLowerCase()}`,
  },
];

export function translateText(value: string): string {
  if (appLanguage !== 'vi') {
    return value;
  }

  const exact = viTranslations[value];

  if (exact) {
    return exact;
  }

  for (const dynamicTranslation of dynamicViTranslations) {
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
