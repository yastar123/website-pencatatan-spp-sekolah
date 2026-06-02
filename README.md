# 📚 Schoboard - Sistem Manajemen Pembayaran SPP Sekolah

Aplikasi web modern untuk mengelola pembayaran SPP (Sumbangan Pembinaan Pendidikan) sekolah secara efisien dan terorganisir. Dibangun dengan Next.js 16, React, Prisma, dan SQLite.

## 🎯 Fitur Utama

### 1. **Sistem Autentikasi & Otorisasi**
- Login dengan email dan password yang aman (bcrypt hashing)
- Role-based access control (BENDAHARA dan SISWA)
- Session management menggunakan cookies HTTP-only
- Middleware proteksi untuk route-route terbatas
- Logout dengan clear session

**User Demo:**
- Bendahara: `bendahara@sekolah.com` / `bendahara123`
- Siswa: `sarah@sekolah.com` / `siswa123`

### 2. **Dashboard**
Ringkasan visual dari status keuangan sekolah:
- **Total Saldo**: Menampilkan total pendapatan SPP
- **Siswa Lunas**: Jumlah siswa yang sudah membayar
- **Siswa Menunggak**: Jumlah siswa yang belum membayar
- **Total Siswa**: Jumlah seluruh siswa
- **Grafik Pendapatan Bulanan**: Chart interaktif untuk melihat tren pendapatan per bulan
- **Status Siswa**: Pie chart perbandingan siswa lunas vs menunggak
- **Transaksi Terakhir**: Tabel 5 transaksi terbaru

### 3. **Input Pembayaran** (Bendahara Only)
Form untuk mencatat pembayaran SPP yang diterima:
- **Search Siswa**: Cari siswa berdasarkan NIS atau Nama
- **Info Siswa**: Tampil otomatis (Nama, Kelas, Status)
- **Jenis Pembayaran**: Dropdown pilihan (SPP, Uang Buku, Tunai, dll)
- **Nominal Bayar**: Input nominal pembayaran
- **Metode Pembayaran**: Pilihan metode (Transfer Bank, Tunai)
- **Upload Bukti**: Upload file bukti transfer (opsional)
- **Submit**: Simpan data pembayaran

### 4. **Data Siswa**
Manajemen data siswa yang terstruktur:
- **Tabel Data**: NIS, Nama, Kelas, Alamat, No. HP Orang Tua, Status Pembayaran
- **Search**: Cari siswa berdasarkan Nama atau NIS
- **Filter Kelas**: Filter data siswa per kelas
- **Pagination**: Navigasi antar halaman
- **Action Buttons** (Bendahara Only):
  - Edit: Ubah data siswa
  - Hapus: Hapus data siswa dari sistem
- **Status Badge**: Visual status pembayaran (Lunas/Menunggak)
- **Tambah Siswa Button**: Buka modal form untuk tambah siswa baru

### 5. **Riwayat Pembayaran**
Log lengkap semua transaksi pembayaran:
- **Tabel Riwayat**: No. Transaksi, Tanggal, NIS, Nama Siswa, Jenis, Nominal, Metode, Status, Aksi
- **Date Range Filter**: Filter berdasarkan tanggal (dropdown calendar)
- **Search**: Cari transaksi berdasarkan NIS/Nama
- **Status Filter**: Filter berdasarkan status (Berhasil, Gagal, Pending)
- **Pagination**: Navigasi data
- **Action Buttons**:
  - Lihat PDF: Cetak/lihat kuitansi transaksi
  - Edit (Bendahara): Ubah detail pembayaran
  - Hapus (Bendahara): Hapus transaksi dari log
- **Status Badges**: Warna berbeda (Hijau=Berhasil, Merah=Gagal, Kuning=Pending)

### 6. **Laporan & Rekapitulasi**
Analisis mendalam data pembayaran dengan berbagai sudut pandang:
- **Jenis Laporan** (Dropdown):
  - Rekap Bulanan: Ringkasan pembayaran per bulan
  - Tunggakan per Kelas: Daftar siswa yang menunggak per kelas
  - Tren Pendapatan: Grafik tren pendapatan tahunan
  - Rekap Susulan: Data pembayaran cicilan/susulan
- **Periode Selection**: Pilih tahun ajaran untuk laporan
- **Date Range**: Pilih rentang tanggal
- **Export PDF**: Download laporan dalam format PDF
- **Export Excel**: Download laporan dalam format Excel (.xlsx)
- **Chart Visualization**: Grafik interaktif untuk visualisasi data

### 7. **Pengaturan** (Bendahara Only)
Konfigurasi sistem dan manajemen master data:

#### **Kelola Kelas**
- Daftar semua kelas yang ada
- Tambah kelas baru
- Edit nama kelas
- Hapus kelas
- Asosiasi dengan tahun ajaran

#### **Kelola Tahun Ajaran**
- Daftar tahun ajaran (misal: 2023/2024, 2024/2025)
- Tentukan tahun ajaran aktif
- Set tanggal awal dan akhir tahun ajaran
- Edit/Hapus tahun ajaran

#### **Atur Tarif SPP**
- Kelola nominal tarif SPP per kelas per tahun ajaran
- Buat tarif baru untuk kombinasi kelas dan tahun ajaran
- Edit tarif yang sudah ada
- Support untuk jenis pembayaran berbeda

#### **Manajemen User**
- Daftar user sistem (Bendahara dan Siswa)
- Tambah user baru
- Edit data user
- Aktifkan/nonaktifkan user
- Reset password user

#### **Backup & Restore**
- **Export Database**: Download database SQLite sebagai file
- **Import Database**: Upload file backup untuk restore data
- Auto-backup dapat dikonfigurasi
- Version control untuk backup files

### 8. **Layout & Navigation**
- **Sidebar Navigation**: Menu utama di sisi kiri (collapsible di mobile)
- **Topbar**: Header dengan notifikasi dan user profile dropdown
- **Logo Branding**: Schoboard dengan icon
- **Responsive Design**: Optimal untuk desktop, tablet, dan mobile

## 🏗️ Struktur Database

### Models
- **User**: Akun pengguna sistem (BENDAHARA, SISWA)
- **Student**: Data siswa sekolah
- **Class**: Daftar kelas
- **AcademicYear**: Tahun ajaran akademik
- **SPPRate**: Tarif SPP per kelas per tahun ajaran
- **Payment**: Log transaksi pembayaran
- **Batch**: Pengelompokan pembayaran per bulan

### Relationships
```
User → Student (1-to-1)
Student → Class (Many-to-1)
Student → Payment (1-to-Many)
Class → AcademicYear (Many-to-1)
Class → SPPRate (1-to-Many)
SPPRate → AcademicYear (Many-to-1)
Payment → Batch (Many-to-1)
Batch → AcademicYear (Many-to-1)
```

## 🔐 Role-Based Access Control

### Bendahara (Admin)
✅ Login & Dashboard
✅ Input Pembayaran
✅ Edit/Hapus Data Pembayaran
✅ Lihat Data Siswa
✅ Kelola Data Siswa (Add/Edit/Delete)
✅ Kelola Kelas
✅ Kelola Tahun Ajaran
✅ Atur Tarif SPP
✅ Manajemen User
✅ Export Laporan (PDF/Excel)
✅ Backup & Restore Database
✅ Cetak Kuitansi
✅ Filter & Pencarian

### Siswa (Viewer)
✅ Login & Dashboard (Read-only)
✅ Lihat Data Pembayaran (Read-only)
✅ Export Laporan (PDF/Excel)
✅ Cetak Kuitansi
❌ Input/Edit/Delete Data
❌ Kelola Master Data
❌ Backup & Restore

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm, yarn, atau pnpm
- SQLite3 (included with Prisma)

### Installation

```bash
# Clone atau extract project
cd schoboard

# Install dependencies
pnpm install

# Setup environment variables
cp .env.example .env.local

# Initialize database & seed data
pnpm prisma db push
pnpm seed

# Start dev server
pnpm dev
```

### Access Application
- **URL**: http://localhost:3000
- **Bendahara Account**: bendahara@sekolah.com / bendahara123
- **Siswa Account**: sarah@sekolah.com / siswa123

## 📱 Responsive Design

Aplikasi dioptimalkan untuk semua ukuran layar:
- **Desktop** (1920px+): Full layout dengan sidebar tetap
- **Tablet** (768px - 1024px): Sidebar collapsible, optimized form layout
- **Mobile** (< 768px): Sidebar slide-out drawer, full-width components

## 🎨 Design System

- **Primary Color**: Blue (#2563EB)
- **Neutral Colors**: Gray scale untuk secondary elements
- **Accent Colors**: Green (success), Red (error), Yellow (warning)
- **Typography**: 2 font families (sans-serif for body, matching headers)
- **Icons**: Lucide React icons throughout UI
- **Charts**: Recharts untuk visualisasi data interaktif

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Check user session

### Students
- `GET /api/students` - Daftar semua siswa (with search/filter)
- `POST /api/students` - Tambah siswa baru
- `GET /api/students/[id]` - Detail siswa
- `PUT /api/students/[id]` - Edit data siswa
- `DELETE /api/students/[id]` - Hapus siswa

### Payments
- `GET /api/payments` - Daftar semua pembayaran
- `POST /api/payments` - Catat pembayaran baru
- `PUT /api/payments/[id]` - Edit pembayaran
- `DELETE /api/payments/[id]` - Hapus pembayaran

### Classes
- `GET /api/classes` - Daftar kelas
- `POST /api/classes` - Tambah kelas
- `DELETE /api/classes/[id]` - Hapus kelas

### Academic Years
- `GET /api/academic-years` - Daftar tahun ajaran
- `POST /api/academic-years` - Tambah tahun ajaran

### SPP Rates
- `GET /api/spp-rates` - Daftar tarif SPP
- `POST /api/spp-rates` - Tambah tarif SPP

### Dashboard
- `GET /api/dashboard/stats` - Dashboard statistics

### Reports
- `GET /api/reports` - Generate laporan dengan berbagai filter

### Backup
- `GET /api/backup/export` - Export database file

## 🛠️ Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: SQLite3 (offline/localhost friendly)
- **Authentication**: Custom session + bcrypt
- **UI Components**: shadcn/ui, Tailwind CSS v4
- **Charts**: Recharts
- **Icons**: Lucide React
- **Export**: jsPDF, XLSX libraries
- **Styling**: Tailwind CSS with custom design tokens

## 📁 Project Structure

```
schoboard/
├── app/
│   ├── api/                 # API route handlers
│   ├── dashboard/           # Main app pages
│   ├── data-siswa/
│   ├── input-pembayaran/
│   ├── riwayat/
│   ├── laporan/
│   ├── pengaturan/
│   ├── login/
│   └── layout.tsx
├── components/
│   ├── layout/              # Sidebar, Topbar
│   ├── modals/              # Form modals
│   └── ui/                  # Reusable UI components
├── hooks/
│   └── useAuth.ts           # Auth custom hook
├── lib/
│   ├── auth.ts              # Auth utilities
│   ├── session.ts           # Session management
│   └── utils.ts             # Helper functions
├── prisma/
│   ├── schema.prisma        # Database schema
│   ├── seed.ts              # Seeding script
│   └── migrations/
├── public/                  # Static assets
├── .env.local               # Environment variables
└── package.json
```

## 🔄 Database Seeding

Aplikasi dilengkapi dengan seed data untuk testing:

**Academic Year**:
- 2023/2024

**Classes**:
- 8A, 8B, 9A

**Students** (3 total):
- Jane Smith (8B, LUNAS)
- John Doe (8A, MENUNGGAK)
- Sarah Jones (8A, LUNAS)

**Users**:
- Bendahara Admin (bendahara@sekolah.com)
- Sarah Siswa (sarah@sekolah.com)

**Payments**:
- Sample transactions untuk testing

Jalankan: `pnpm seed` untuk reset dan reseed data.

## 🧪 Testing

### Manual Testing Checklist
- [ ] Login dengan Bendahara account
- [ ] Login dengan Siswa account
- [ ] Navigate ke semua halaman melalui sidebar
- [ ] Test search & filter di Data Siswa
- [ ] Tambah/Edit/Hapus siswa (Bendahara only)
- [ ] Input pembayaran baru
- [ ] Edit/Hapus pembayaran (Bendahara only)
- [ ] Lihat riwayat pembayaran dengan berbagai filter
- [ ] Generate laporan dan export PDF/Excel
- [ ] Akses Pengaturan dan kelola master data
- [ ] Test logout dan login kembali
- [ ] Verify role-based restrictions bekerja

### Run Build
```bash
pnpm build    # Test production build
pnpm start    # Run production server
```

## 🐛 Troubleshooting

### Database Issues
```bash
# Reset database
rm -f prisma/dev.db
pnpm prisma db push
pnpm seed
```

### Port Already in Use
```bash
# Change port
pnpm dev -p 3001
```

### Prisma Client Errors
```bash
pnpm prisma generate
```

## 📝 Environment Variables

Create `.env.local`:
```
DATABASE_URL="file:./prisma/dev.db"
NEXT_PUBLIC_API_URL="http://localhost:3000"
```

## 🚀 Deployment

### Development
```bash
pnpm dev      # Start dev server
```

### Production
```bash
pnpm build    # Build for production
pnpm start    # Run production server
```

**Note**: SQLite bagus untuk development/localhost. Untuk production, consider migrate ke PostgreSQL atau MySQL.

## 📄 License

Proyek ini adalah demonstrasi sistem manajemen SPP sekolah. Gratis untuk digunakan dalam konteks pendidikan.

## 📞 Support

Untuk issues, bugs, atau pertanyaan, silakan periksa:
1. Console logs untuk error messages
2. Server logs di `/tmp/dev.log`
3. Database state dengan `pnpm prisma studio`

---

**Dibuat dengan ❤️ untuk sekolah Indonesia**
# website-pencatatan-spp-sekolah
