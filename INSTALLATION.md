# 🚀 Installation Guide - Schoboard

Panduan lengkap untuk menginstall dan menjalankan Schoboard di mesin lokal Anda.

## Prasyarat Sistem

Sebelum memulai, pastikan sistem Anda memiliki:

### Wajib
- **Node.js** versi 18.0 atau lebih tinggi
- **npm** atau **pnpm** atau **yarn** (Package Manager)
- **Git** (untuk clone repository)

### Opsional
- SQLite3 CLI (untuk debug database)
- Postman atau Thunder Client (untuk test API)

## Verifikasi Instalasi Prerequisites

```bash
# Cek Node.js version (harus >= 18.0)
node --version

# Cek npm version
npm --version

# Atau jika menggunakan pnpm
pnpm --version

# Atau jika menggunakan yarn
yarn --version
```

## Step-by-Step Installation

### 1. Clone atau Extract Project

Jika dari git:
```bash
git clone <repository-url>
cd schoboard
```

Atau jika sudah di-extract:
```bash
cd schoboard
```

### 2. Install Dependencies

Pilih salah satu sesuai package manager Anda:

**Menggunakan pnpm (Recommended):**
```bash
pnpm install
```

**Menggunakan npm:**
```bash
npm install
```

**Menggunakan yarn:**
```bash
yarn install
```

Proses ini akan:
- Download semua dependencies dari npm registry
- Create `node_modules` folder
- Generate lock file (`pnpm-lock.yaml`, `package-lock.json`, atau `yarn.lock`)

**Expected output:**
```
✓ 150 packages in 45s
✓ 892 packages in node_modules
```

### 3. Setup Environment Variables

Buat file `.env.local` di root project:

```bash
# Linux/Mac
touch .env.local

# Windows
type nul > .env.local
```

Isi dengan konfigurasi berikut:

```env
# Database
DATABASE_URL="file:./prisma/dev.db"

# API Base URL (gunakan untuk development)
NEXT_PUBLIC_API_URL="http://localhost:3000"

# JWT Secret (optional, bisa dikustomisasi)
NEXTAUTH_SECRET="your-secret-key-min-32-chars-long"
```

### 4. Initialize Database

**Generate Prisma Client:**
```bash
pnpm prisma generate
```

**Create Database Schema:**
```bash
pnpm prisma db push
```

Output yang diharapkan:
```
✓ Database created
✓ Migrations applied
✓ Generated Prisma Client
```

### 5. Seed Database dengan Data Demo

**Jalankan seed script:**
```bash
pnpm seed
```

Output yang diharapkan:
```
Starting database seed...
✓ Users created (2)
✓ Academic years created (1)
✓ Classes created (3)
✓ Students created (3)
✓ SPP rates created (3)
✓ Payments created (2)
✓ Batches created (1)
Database seed completed successfully!
```

### 6. Start Development Server

```bash
pnpm dev
```

Output yang diharapkan:
```
  ▲ Next.js 16.0.0
  - Local:        http://localhost:3000
  - Environments: .env.local

✓ Ready in 2.5s
```

### 7. Akses Aplikasi

Buka browser dan buka:
- **URL**: http://localhost:3000
- **Login Page**: http://localhost:3000/login

## Default Test Credentials

Setelah seeding berhasil, gunakan credentials berikut untuk login:

### Bendahara (Admin)
```
Email:    bendahara@sekolah.com
Password: bendahara123
Role:     BENDAHARA (Full Access)
```

### Siswa (Viewer)
```
Email:    sarah@sekolah.com
Password: siswa123
Role:     SISWA (Limited Access)
```

## Troubleshooting

### ❌ Error: "Cannot find module"

**Penyebab**: Dependencies belum ter-install
**Solusi**:
```bash
# Clear cache
rm -rf node_modules pnpm-lock.yaml

# Reinstall
pnpm install
```

### ❌ Error: "Port 3000 already in use"

**Penyebab**: Ada aplikasi lain menggunakan port 3000
**Solusi**:
```bash
# Gunakan port berbeda
pnpm dev -p 3001

# Atau matikan aplikasi yang menggunakan port 3000
```

### ❌ Error: "Database locked" atau "dev.db is locked"

**Penyebab**: Database masih digunakan process lain
**Solusi**:
```bash
# Matikan dev server (Ctrl+C)
# Hapus lock file
rm -f prisma/dev.db-journal

# Restart dev server
pnpm dev
```

### ❌ Error: "Prisma generate failed"

**Penyebab**: @prisma/client tidak cocok dengan versi Prisma
**Solusi**:
```bash
# Reinstall Prisma packages
pnpm install -D prisma@latest @prisma/client@latest
pnpm prisma generate
```

### ❌ Error: "Cannot POST /api/auth/login"

**Penyebab**: Server belum compile API routes
**Solusi**:
```bash
# Wait 5-10 seconds setelah pnpm dev
# Kemudian coba login lagi

# Atau rebuild
pnpm build
pnpm dev
```

## Verifikasi Instalasi

Pastikan semua berfungsi dengan baik:

```bash
# Test 1: Open login page
curl http://localhost:3000/login

# Test 2: Check API
curl http://localhost:3000/api/auth/me

# Test 3: Test login API
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"bendahara@sekolah.com","password":"bendahara123"}'
```

## Database Management

### View Database dengan Prisma Studio

Untuk melihat dan manage data database secara visual:

```bash
pnpm prisma studio
```

Ini akan membuka browser ke `http://localhost:5555` dengan UI untuk manage data.

### Reset Database

Jika ingin reset database ke state awal:

```bash
# Delete database file
rm -f prisma/dev.db

# Reinitialize
pnpm prisma db push

# Reseed data
pnpm seed
```

## Build untuk Production

Jika ingin build untuk production:

```bash
# Build
pnpm build

# Run production server
pnpm start
```

**Note**: Production server berjalan di port 3000 (atau sesuai setting)

## Common Commands Reference

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm start            # Start production server
pnpm lint             # Run ESLint

# Database
pnpm seed             # Seed database with demo data
pnpm prisma studio   # Open Prisma Studio UI
pnpm prisma migrate dev  # Create new migration
pnpm prisma db push   # Sync schema dengan database

# Cleanup
pnpm clean            # Delete build artifacts
pnpm reset           # Full reset (if script exists)
```

## System Requirements Penuh

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| Node.js | 18.0 LTS | 20.x LTS |
| RAM | 2GB | 4GB+ |
| Disk Space | 500MB | 1GB+ |
| CPU | Dual Core | Quad Core |
| OS | Any | Linux/Mac/Windows |

## File Structure Setelah Install

```
schoboard/
├── node_modules/           # Dependencies
├── .next/                  # Build cache
├── prisma/
│   ├── dev.db             # SQLite database (created after `pnpm seed`)
│   ├── schema.prisma      # Database schema
│   ├── seed.ts            # Seed script
│   └── migrations/        # Database migrations
├── app/                   # Next.js app directory
├── components/            # React components
├── lib/                   # Utility functions
├── public/                # Static files
├── .env.local            # Environment variables
├── next.config.mjs       # Next.js config
├── tsconfig.json         # TypeScript config
├── package.json          # Dependencies definition
├── README.md             # Documentation
└── INSTALLATION.md       # File ini
```

## Performance Tips

1. **First Time Loading Lambat?**
   - Normal untuk first build. Tunggu sampai proses compile selesai
   - Selanjutnya akan lebih cepat dengan hot reload

2. **Database Query Lambat?**
   - Check database size: `ls -lh prisma/dev.db`
   - Jika sudah besar, pertimbangkan archive old data
   - Atau migrate ke PostgreSQL untuk production

3. **Memory Usage Tinggi?**
   - Close browser tabs lainnya
   - Restart dev server
   - Check console untuk memory leaks

## Next Steps

Setelah instalasi berhasil:

1. ✅ Buka aplikasi di http://localhost:3000
2. ✅ Login dengan credentials yang disediakan
3. ✅ Explore dashboard dan fitur-fitur
4. ✅ Baca USER_GUIDE.md untuk panduan penggunaan
5. ✅ Baca README.md untuk dokumentasi lengkap

## Support & Issues

Jika mengalami masalah:

1. Check error message di console
2. Read troubleshooting section di atas
3. Check server logs: `tail -100 /tmp/dev.log` (Linux/Mac)
4. Try restart: `Ctrl+C` kemudian `pnpm dev` lagi
5. Try clean install: Delete `node_modules` dan install ulang

---

**Selamat! Instalasi berhasil! 🎉**

Lanjutkan dengan membaca USER_GUIDE.md untuk panduan lengkap penggunaan aplikasi.
