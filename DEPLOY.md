# Deploy lên Cloudflare Pages (miễn phí)

```text
Local dev → git commit → git push (main) → GitHub → Cloudflare Pages tự build → Production (HTTPS)
```

> **Project hiện tại chạy dạng Cloudflare Worker (static assets) tên `push-up`**, kết nối GitHub qua Workers Builds: push `main` → `npx wrangler deploy` (production), push nhánh khác → `npx wrangler preview` (preview). Cấu hình nằm trong `wrangler.jsonc` (`name` phải trùng tên Worker trên dashboard; khối `previews` bắt buộc cho preview; SPA fallback qua `not_found_handling`). `public/_headers` vẫn được áp dụng. Phần hướng dẫn Pages bên dưới giữ lại để tham khảo.

Không có backend, không database: toàn bộ dữ liệu nằm trong `localStorage` của trình duyệt. Gói **Free** của Cloudflare Pages là đủ (500 build/tháng, băng thông và request tĩnh không giới hạn, HTTPS miễn phí), không cần thẻ thanh toán.

## Build settings

| | |
|---|---|
| Framework | Vite 8 + React 19 + TypeScript (SPA, PWA) |
| Framework preset | `Vite` (hoặc `None`) |
| Build command | `npm run build` (= `tsc -b && vite build`) |
| Build output directory | `dist` |
| Root directory | *(để trống)* |
| Node.js | `22` (đọc từ file `.node-version`; Vite 8 cần ≥ 20.19) |
| Environment variables | Không có |

## File cấu hình trong repo

| File | Tác dụng |
|---|---|
| `.node-version` | Cloudflare dùng Node 22 khi build. |
| `public/_headers` | `sw.js` và `manifest.webmanifest` luôn revalidate (PWA nhận bản mới), `/assets/*` cache vĩnh viễn (tên file có hash), header bảo mật + HSTS. |
| `public/manifest.webmanifest`, `public/icon-*.png`, `public/apple-touch-icon.png` | PWA cài được trên Android/desktop và iOS (Add to Home Screen). |
| `.env.example` | Ghi chú: app hiện **không dùng** biến môi trường nào. |

**SPA routing:** app điều hướng bằng state (không có URL route riêng), và repo **không có `404.html`**, nên Cloudflare Pages tự bật chế độ SPA: mọi đường dẫn không tồn tại đều trả về `index.html` (đã kiểm tra bằng `wrangler pages dev`). Không cần `_redirects`. Đừng thêm `404.html` vào `public/`, vì nó sẽ tắt chế độ này.

**Biến môi trường (nếu sau này cần):** chỉ biến có tiền tố `VITE_` mới vào được code client, và chúng nằm công khai trong JS bundle, nên **không bao giờ** đặt secret ở đó. Dev: tạo `.env.local` (đã gitignore). Production: Cloudflare → project → **Settings → Variables and Secrets**, rồi deploy lại.

## Hướng dẫn từng bước

### 0. Đưa code lên GitHub

1. Tạo repo mới trên <https://github.com/new> (Private hoặc Public đều được), **không** tick "Add README".
2. Trong thư mục project:
   ```bash
   git remote add origin https://github.com/<user>/<repo>.git
   git push -u origin main
   ```

### 1. Tạo tài khoản Cloudflare

1. Vào <https://dash.cloudflare.com/sign-up>, đăng ký bằng email và xác nhận email.
2. Không cần thêm phương thức thanh toán, không cần domain.

### 2. Kết nối GitHub repository

1. Dashboard → **Workers & Pages** → **Create** → tab **Pages** → **Connect to Git**.
   *(Nếu giao diện chỉ hiện "Create Worker", chọn link "Looking to deploy Pages? Get started".)*
2. **Connect GitHub** → cài app "Cloudflare Workers and Pages" trên GitHub → chọn **Only select repositories** → chọn repo này → **Install & Authorize**.
3. Chọn repo → **Begin setup**.

### 3. Chọn build settings

- **Project name:** ví dụ `pushup30` (sẽ thành `pushup30.pages.dev`)
- **Production branch:** `main`
- **Framework preset:** `Vite`
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Environment variables:** không cần thêm gì

### 4. Deploy production

Nhấn **Save and Deploy**. Build mất khoảng 1 phút. Từ đó trở đi:

- `git push` lên `main` → tự build và deploy **production**.
- Push lên nhánh khác hoặc mở PR → tạo **preview deployment** với URL riêng (`<hash>.pushup30.pages.dev`), không ảnh hưởng production.
- Build lỗi thì bản production cũ vẫn chạy. Muốn rollback: **Deployments** → chọn bản cũ → **Rollback to this deployment**.

### 5. Lấy production URL

Sau khi deploy xong, URL hiện ở đầu trang project: `https://<project-name>.pages.dev`. HTTPS được bật sẵn và tự gia hạn chứng chỉ.

### 6. Custom domain (tùy chọn)

Project → **Custom domains** → **Set up a custom domain** → nhập domain.

- Domain đã quản lý DNS ở Cloudflare: bấm **Activate**, Cloudflare tự tạo record.
- Domain ở nhà cung cấp khác: dùng subdomain (vd. `app.example.com`) và tạo bản ghi **CNAME** `app` → `<project-name>.pages.dev` tại nhà cung cấp đó. Apex domain (`example.com`) bắt buộc phải chuyển nameserver sang Cloudflare (gói Free).

Thêm custom domain trên Pages miễn phí; chỉ có tiền mua domain là do bạn tự trả.

## Kiểm tra sau khi deploy

Mở production URL trên điện thoại:

- [ ] Onboarding hiện ra và đổi VI/EN được
- [ ] Tải lại trang hoặc mở `https://<url>/abc/xyz` vẫn vào app (SPA fallback)
- [ ] Bắt đầu workout, đồng hồ nghỉ đếm ngược; tải lại trang thì tiến độ vẫn còn (localStorage)
- [ ] Chrome DevTools → Application → Manifest không báo lỗi; Service Workers hiện `sw.js` *activated*
- [ ] Android/Chrome: menu → **Install app**. iOS Safari: Share → **Add to Home Screen** (iOS chỉ cho thông báo khi app đã được thêm vào màn hình chính, iOS 16.4+)
- [ ] Settings → bật nhắc nhở → cho phép thông báo. Nhắc nhở chỉ hiện khi app đang mở hoặc chạy nền (giới hạn của web không có backend); muốn nhắc chắc chắn thì dùng **Add to calendar**.

**Lưu ý dữ liệu:** `localStorage` gắn với từng domain. Dữ liệu ở `pushup30.pages.dev` **không** tự sang custom domain, và ngược lại. Nên chọn domain chính thức trước khi người dùng thật bắt đầu dùng.

## Deploy thủ công không qua GitHub (dự phòng)

```bash
npm run build
npx wrangler pages deploy dist --project-name pushup30   # cần Node 22+, đăng nhập qua trình duyệt lần đầu
```
