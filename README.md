# Pplant

Pplant là ứng dụng mobile-first, local-first để quản lý đời sống hằng ngày của sinh viên và người đi làm tự do: ghi thu chi, xem lịch chi tiêu, báo cáo theo danh mục, lưu nhật ký ảnh theo cảm xúc, theo dõi công việc, nhiệm vụ, nhắc nhở, ngân sách, tiết kiệm và các luồng hồi phục dữ liệu cục bộ.

Ở giao diện hiện tại, sản phẩm đang được đóng gói dưới trải nghiệm **MoneyNote**: một sổ thu chi dễ nhìn, có phong cách minh họa mềm, thao tác nhanh, phù hợp với người cần nhập tiền ngay trên điện thoại mà không muốn đi qua nhiều bước kế toán nặng nề.

## Mục Tiêu Sản Phẩm

Pplant tập trung vào 4 nguyên tắc:

- **Local-first**: dữ liệu chính nằm trên thiết bị. MVP không yêu cầu tài khoản, cloud sync hay backend.
- **Nhập nhanh**: người dùng có thể ghi một khoản chi, khoản thu hoặc nhật ký ảnh chỉ bằng vài thao tác.
- **Dễ đọc lại**: lịch, báo cáo, nhật ký và màn tổng quan giúp nhìn lại ngày/tháng thay vì chỉ lưu dữ liệu thô.
- **An toàn và riêng tư**: ảnh hóa đơn, ảnh nhật ký, ghi chú, chẩn đoán lỗi và dữ liệu cá nhân được xử lý theo chính sách lưu cục bộ, có lớp xóa dữ liệu riêng.

## Tính Năng Chính

### 1. Sổ thu chi MoneyNote

Màn nhập thu chi là luồng trung tâm của app:

- Chọn loại giao dịch: `Chi tiêu` hoặc `Thu nhập`.
- Chọn ngày ghi nhận.
- Nhập ghi chú ngắn.
- Nhập số tiền theo đơn vị tiền đang lưu.
- Chọn danh mục bằng lưới icon minh họa.
- Lưu khoản chi hoặc khoản thu vào SQLite local.
- Hỗ trợ chỉnh sửa và xóa bản ghi đã lưu.

Danh mục chi tiêu mặc định:

- Ăn uống
- Chi tiêu hằng ngày
- Quần áo
- Mỹ phẩm
- Phí giao lưu
- Y tế
- Giáo dục
- Tiền điện
- Đi lại
- Phí liên lạc
- Tiền nhà

Danh mục thu nhập mặc định:

- Tiền lương
- Tiền phụ cấp
- Tiền thưởng
- Thu nhập phụ
- Đầu tư
- Thu nhập tạm thời

Người dùng cũng có thể thêm danh mục tùy chỉnh trong màn danh mục.

### 2. Lịch thu chi

Màn lịch hiển thị dữ liệu theo tháng:

- Lưới ngày theo thứ tự tuần.
- Tổng thu/chi theo từng ngày.
- Chọn ngày để xem danh sách giao dịch.
- Tab chi tiêu và nhật ký trong ngày.
- Điều hướng tháng trước/tháng sau.
- Định dạng ngày thay đổi theo ngôn ngữ app.

Luồng dữ liệu:

1. Màn lịch lấy tháng hiện tại.
2. Gọi service lịch sử tiền để đọc money records từ SQLite.
3. Tính tổng thu, chi, net theo ngày.
4. Hiển thị summary và danh sách bản ghi tương ứng với ngày được chọn.

### 3. Báo cáo

Màn báo cáo giúp người dùng nhìn lại chi tiêu và thu nhập:

- Tổng thu nhập.
- Tổng chi tiêu.
- Tổng net.
- Biểu đồ donut theo danh mục.
- Hiển thị tối đa 4 danh mục có tỷ lệ cao nhất.
- Danh sách breakdown theo danh mục.
- Báo cáo tháng, năm, toàn kỳ và danh mục.

Biểu đồ báo cáo hiện được thiết kế theo hướng dễ đọc trên mobile: các nhãn quan trọng được tách khỏi chart, nối bằng đường callout, tránh nhồi quá nhiều nhãn vào vòng tròn.

### 4. Nhật ký ảnh theo cảm xúc

Màn nhật ký hỗ trợ lưu một khoảnh khắc trong ngày kèm cảm xúc:

- Nút camera ở bottom navigation mở thẳng màn tạo nhật ký.
- Camera được nhúng trực tiếp trong vùng ảnh của màn tạo nhật ký.
- Người dùng bấm chụp, ảnh preview hiện ngay trong vùng đó.
- Ảnh được persist local trong nền.
- Người dùng chọn cảm xúc, nhập ghi chú và lưu nhật ký.
- Màn nhật ký hiển thị timeline theo ngày và thống kê cảm xúc theo tháng.

Luồng mới của camera nhật ký:

1. Người dùng bấm nút camera ở bottom navigation.
2. App điều hướng tới `journal/new`.
3. `JournalCaptureScreen` mở `CameraView` inline trong khung ảnh.
4. Khi bấm chụp, `previewUri` được đưa vào state ngay lập tức để ảnh hiện nhanh.
5. Hook `useJournalCapture` persist ảnh bằng `persistJournalImageReference`.
6. Khi ảnh đã persist và người dùng đã chọn mood, nút lưu nhật ký được bật.
7. `saveJournalEntry` lưu record vào SQLite.

### 5. Cài đặt

Màn cài đặt/khác hiện hỗ trợ:

- Đổi ngôn ngữ ứng dụng.
- Đổi tiền tệ nhanh.
- Đổi locale.
- Đổi background preset hoặc chọn ảnh nền từ máy.
- Xem các entry báo cáo phụ như báo cáo năm, báo cáo toàn kỳ, báo cáo danh mục.
- Export CSV.
- Tạo backup JSON.

### 6. Đa ngôn ngữ

App hiện hỗ trợ:

- Tiếng Việt: `vi`
- English: `en`
- Traditional Chinese: `zh-Hant`

Cơ chế i18n gồm 2 lớp:

- `src/i18n/strings.ts`: store ngôn ngữ global, danh sách ngôn ngữ, exact translations và dynamic translations.
- `src/i18n/language-storage.ts`: lưu lựa chọn ngôn ngữ vào file local trong document directory.

MoneyNote có thêm copy riêng trong `src/features/moneynote/MoneyNoteScreens.tsx` vì màn này có phong cách UI riêng, nhiều nhãn đặc thù và cần dịch danh mục, tab, CTA, thông báo lưu, báo cáo, ngày tháng.

## Công Nghệ

### Runtime và framework

- **Expo SDK 55**: nền tảng build và chạy app React Native.
- **React Native 0.83**: UI native mobile.
- **React 19.2**: component runtime.
- **Expo Router 55**: file-based routing trong `src/app`.
- **TypeScript 5.9**: type safety toàn dự án.

### UI và trải nghiệm

- **React Navigation Bottom Tabs**: bottom navigation.
- **React Native SVG**: icon/chart custom và vector UI.
- **Expo Image**: hiển thị ảnh local, ảnh nhật ký và asset.
- **Expo Camera**: camera inline cho nhật ký.
- **Expo Image Picker**: chọn ảnh nền hoặc luồng ảnh cần lấy từ thư viện.
- **Expo Status Bar/System UI**: status bar và hệ màu hệ thống.
- **Montserrat** qua `@expo-google-fonts/montserrat`: font chính của giao diện MoneyNote.

### Dữ liệu

- **Expo SQLite**: database local trên thiết bị.
- **Drizzle ORM / drizzle-kit**: schema và migration hỗ trợ typed database.
- **Zod**: validate boundary data, row parsing và form/domain input.
- **Local file store**: lưu reference ảnh hóa đơn, ảnh nhật ký, background và file setting.

### Kiểm thử và chất lượng

- **Jest + jest-expo**: unit test cho domain, service, repository và hook logic.
- **ESLint + eslint-config-expo**: lint TypeScript/React Native.
- **Prettier**: format code.
- **tsc --noEmit**: typecheck toàn dự án.

## Kiến Trúc Dự Án

```text
src/
  app/                 Route files của Expo Router
  data/                SQLite client, schema, migrations, repositories
  diagnostics/         Diagnostic event, redaction và validation
  domain/              Business rules thuần, schema, type, calculations
  features/            UI screen, hook và orchestration theo feature
  i18n/                Ngôn ngữ app và lưu lựa chọn ngôn ngữ
  services/            Use-case/application services
  ui/                  Primitive UI và design tokens
```

### Quy tắc phân lớp

- `src/app` chỉ nên mỏng: route file import screen từ `src/features`.
- `src/features` điều phối UI, hook và state cục bộ của màn hình.
- `src/services` là tầng use-case: mở database, gọi repository, xử lý AppResult/AppError.
- `src/domain` chứa business logic thuần, không phụ thuộc React Native.
- `src/data` chứa repository và SQLite access. UI không import SQLite trực tiếp.
- `src/i18n` quản lý ngôn ngữ, nhưng các màn có copy đặc thù có thể có copy map riêng miễn vẫn dùng `AppLanguage`.

## Luồng Chương Trình Chính

### App boot

1. Expo khởi động từ `expo-router/entry`.
2. Root layout trong `src/app/_layout.tsx` load font, theme, status bar và stored language.
3. Workspace gate đảm bảo local workspace tồn tại.
4. Bottom tabs trong `src/app/(tabs)/_layout.tsx` render các màn chính.

### Nhập khoản chi/thu

1. Người dùng vào tab nhập.
2. `MoneyNoteEntryScreen` dùng `useManualMoneyCapture`.
3. Người dùng chọn kind, ngày, danh mục, nhập amount/note.
4. Hook validate amount và draft.
5. Service `createManualMoneyRecord` lưu record.
6. Event `subscribeMoneyRecordsChanged` thông báo các màn lịch/báo cáo reload.

### Xem lịch

1. `MoneyNoteCalendarScreen` xác định tháng đang xem.
2. Gọi `loadMoneyHistory`.
3. `moneyNoteModel` tính daily totals.
4. UI render month grid và detail panel theo ngày được chọn.

### Xem báo cáo

1. `MoneyNoteReportScreen` lấy records theo tháng.
2. `calculateMoneyNoteTotals` tính tổng.
3. `buildReportBreakdownRows` gom record theo danh mục.
4. Donut chart chỉ dùng các category có tỷ lệ cao nhất để tránh loạn nhãn.

### Tạo nhật ký ảnh

1. Bottom nav camera push `/journal/new`.
2. Màn tạo nhật ký request camera permission nếu cần.
3. `CameraView` chạy inline trong `cameraPanel`.
4. Bấm chụp tạo `CameraCapturedPicture`.
5. `acceptInlinePhoto` set preview ngay bằng URI tạm.
6. File store persist ảnh và trả `PersistedJournalImageReference`.
7. Người dùng chọn mood/note rồi lưu entry.

### Đổi ngôn ngữ

1. Người dùng chọn ngôn ngữ trong màn Khác hoặc Settings.
2. `saveStoredAppLanguage` ghi `{ language }` vào document directory.
3. `setAppLanguage` cập nhật external store.
4. Các component dùng `useAppLanguage` hoặc `useTranslateText` tự render lại.

## Database Và Local Storage

Database local nằm sau `src/data/db`:

- `client.ts`: mở database.
- `schema.ts`: định nghĩa bảng.
- `migrations/migrate.ts`: migrate schema.
- `repositories/*`: thao tác từng aggregate.

Các nhóm dữ liệu chính:

- Workspace cục bộ.
- Preferences người dùng.
- Money records.
- Category/topic.
- Budget rules và savings goals.
- Capture drafts.
- Receipt parse jobs.
- Journal entries.
- Tasks, reminders, recurrence.
- Work entries.
- Reflection prompts/history.
- Diagnostics đã redact.
- Recovery events.

Ảnh và file phụ trợ:

- Ảnh hóa đơn: `src/services/files/receipt-file-store.ts`.
- Ảnh nhật ký: `src/services/files/journal-file-store.ts`.
- Ảnh nền và lựa chọn background: `src/features/settings/app-background.ts`.
- Ngôn ngữ app: `src/i18n/language-storage.ts`.

## Quy Ước Dữ Liệu Tiền

Pplant không lưu tiền dạng float. Tất cả amount chính được lưu bằng **minor units**:

- `amountMinor = 1250` với `USD` nghĩa là `$12.50`.
- `amountMinor = 29100` với `TWD` nghĩa là `NT$291`.
- Tiền Việt và các định dạng không có decimal vẫn dùng minor units theo quy tắc domain.

Lý do:

- Tránh lỗi làm tròn số thập phân.
- Dễ tổng hợp thu/chi/net.
- Dễ tính lương theo giờ và work-time equivalent.

## Quy Ước Lỗi

Expected failures dùng:

- `AppResult<T>`
- `AppError`
- `ok(...)`
- `err(...)`

UI không nên throw lỗi nghiệp vụ thông thường. Service trả `AppResult`; feature hook quyết định hiển thị warning, retry, disabled state hoặc fallback.

## Quyền Ứng Dụng

Android hiện dùng:

- `android.permission.CAMERA`: camera inline cho nhật ký và các luồng chụp ảnh.
- Các quyền ảnh/media do Expo Image Picker và Android target xử lý theo cấu hình native.

`app.json` cấu hình plugin:

- `expo-camera`
- `expo-image-picker`
- `expo-splash-screen`
- `expo-sqlite`
- `expo-router`

## Cài Đặt Môi Trường

Yêu cầu:

- Node.js 22 hoặc tương thích với Expo SDK 55.
- npm.
- Android Studio hoặc thiết bị Android thật nếu chạy Android.
- Expo CLI qua `npx`.

Cài dependencies:

```bash
npm install
```

Chạy Metro:

```bash
npm start
```

Chạy Android qua Expo:

```bash
npm run android
```

Nếu thêm native module mới, cần rebuild native app:

```bash
npx expo run:android
```

## Lệnh Kiểm Tra

Typecheck:

```bash
npm run typecheck
```

Lint:

```bash
npm run lint
```

Test:

```bash
npm test
```

Chạy test theo file:

```bash
npx jest --runInBand --runTestsByPath src/i18n/strings.test.ts
```

Kiểm tra whitespace trong diff:

```bash
git diff --check
```

## Git Flow Đề Xuất

Quy trình chuẩn cho repo này:

1. Không làm trực tiếp trên `main`.
2. Tạo nhánh theo format:

```bash
git checkout -b codex/<short-feature-name>
```

3. Commit theo scope rõ:

```bash
git add <files>
git commit -m "Add Traditional Chinese localization and journal camera flow"
```

4. Push branch:

```bash
git push -u origin codex/<short-feature-name>
```

5. Mở draft pull request để review.
6. Chỉ merge vào `main` sau khi typecheck, lint và test quan trọng đã pass.

## Các File Quan Trọng

- `src/app/_layout.tsx`: root app layout, theme, status bar, font, language load.
- `src/app/(tabs)/_layout.tsx`: bottom navigation.
- `src/features/moneynote/MoneyNoteScreens.tsx`: các màn MoneyNote chính.
- `src/features/moneynote/moneyNoteModel.ts`: helper tính toán, format ngày, format tiền.
- `src/features/journal/JournalScreen.tsx`: màn nhật ký.
- `src/features/journal/JournalCaptureScreen.tsx`: màn tạo nhật ký bằng camera inline.
- `src/features/journal/useJournalCapture.ts`: state machine cho chụp/lưu nhật ký.
- `src/i18n/strings.ts`: ngôn ngữ global.
- `src/i18n/language-storage.ts`: persist language preference.
- `src/services/journal/journal.service.ts`: service lưu/xóa/tải nhật ký.
- `src/services/money/money-record.service.ts`: service tạo/sửa/xóa money record.
- `src/services/money/money-history.service.ts`: service tải lịch sử tiền.
- `src/data/db/schema.ts`: database schema.
- `src/data/db/migrations/migrate.ts`: migration runner.

## Trạng Thái Hiện Tại

Đã có:

- App Expo React Native local-first.
- MoneyNote nhập thu/chi.
- Lịch thu chi.
- Báo cáo thu/chi theo danh mục.
- Nhật ký ảnh bằng camera inline.
- Cài đặt ngôn ngữ, tiền tệ, locale và background.
- Hỗ trợ `vi`, `en`, `zh-Hant`.
- SQLite repository/service architecture.
- Unit test cho domain/service/repository/hook quan trọng.

Định hướng tiếp theo:

- Hoàn thiện dịch toàn bộ những màn legacy còn ít xuất hiện.
- Chuẩn hóa mood label theo từng ngôn ngữ.
- Bổ sung e2e test cho luồng nhập thu chi và tạo nhật ký ảnh.
- Tối ưu export/backup để có restore flow rõ ràng hơn.
- Tách MoneyNote copy ra file riêng khi số lượng chuỗi tiếp tục tăng.
