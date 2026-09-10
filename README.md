# Airbnb Frontend - Next.js

Frontend application cho Airbnb clone được xây dựng với Next.js 14, TypeScript và Tailwind CSS.

## Cài đặt

```bash
npm install
```

## Chạy Development Server

```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000) trong browser.

## Build Production

```bash
npm run build
npm start
```

## Cấu trúc Project

- `/app` - Next.js App Router pages
- `/components` - React components
- `/lib` - Utilities và API helpers
- `/public` - Static assets

## Tính năng

- ✅ Homepage với các carousel sections
- ✅ Header với navigation tabs
- ✅ Search bar
- ✅ Listing cards với hình ảnh, giá, đánh giá
- ✅ Trang Experiences
- ✅ Trang Services
- ✅ Footer
- ✅ Responsive design
- ✅ Tích hợp với Backend API

## Deploy lên Render

File `render.yaml` ở **root repo** định nghĩa service `airbnb-homestay-frontend`.

Yêu cầu env var **build-time** (Render đọc trong quá trình build):

- `BACKEND_URL` — URL backend đã deploy, ví dụ `https://airbnb-homestay.onrender.com`. Được `next.config.js` đọc để cấu hình rewrite `/api/*` → backend. Nếu đổi backend, phải **rebuild** frontend.
- `NEXT_PUBLIC_API_URL` — `/api` (mặc định qua rewrite).
- `NODE_VERSION=20`.

Trên Render Dashboard → service → **Settings** → **Build Command**:
```
npm install && npm run build
```
**Start Command**:
```
npm run start
```

## Cấu hình Social Login (Firebase Auth)

Để popup Google/Facebook/GitHub hoạt động đúng, hãy đảm bảo:

1. Trong Firebase Console → Authentication → Settings → Authorized domains:
   - Thêm `localhost`, `localhost:3000`, `airbnb-nguyennpcoder.firebaseapp.com` và `airbnb-nguyennpcoder.web.app`.
2. Facebook Developers → Settings → Basic:
   - Thêm các domain ở trên vào **App Domains**.
   - Trong **Facebook Login → Settings**, thêm đầy đủ redirect URI của Firebase:
     - `https://airbnb-nguyennpcoder.firebaseapp.com/__/auth/handler`
     - `https://airbnb-nguyennpcoder.web.app/__/auth/handler`
3. GitHub Developer Settings → OAuth Apps:
   - Đặt **Authorization callback URL** thành `https://airbnb-nguyennpcoder.firebaseapp.com/__/auth/handler`.
   - Nếu cần chạy local bằng emulator, bổ sung `http://localhost:3000/__/auth/handler`.

Nếu gặp màn hình “redirect_uri is not associated”, hãy kiểm tra chính tả của URL và chắc chắn ứng dụng đã ở trạng thái Live (Facebook) hoặc không giới hạn domain (GitHub).