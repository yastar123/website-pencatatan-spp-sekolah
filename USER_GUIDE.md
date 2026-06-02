# 📖 User Guide - Schoboard

Panduan lengkap untuk menggunakan Schoboard - Sistem Manajemen Pembayaran SPP Sekolah.

## Daftar Isi
1. [Login & Navigation](#login--navigation)
2. [Dashboard](#dashboard)
3. [Input Pembayaran](#input-pembayaran)
4. [Data Siswa](#data-siswa)
5. [Riwayat Pembayaran](#riwayat-pembayaran)
6. [Laporan & Rekapitulasi](#laporan--rekapitulasi)
7. [Pengaturan](#pengaturan)
8. [Tips & Tricks](#tips--tricks)

---

## Login & Navigation

### Login ke Sistem

1. Buka aplikasi di http://localhost:3000
2. Anda akan diarahkan ke halaman login
3. Masukkan email dan password:
   - **Bendahara**: bendahara@sekolah.com / bendahara123
   - **Siswa**: sarah@sekolah.com / siswa123
4. Klik tombol "Masuk"
5. Tunggu beberapa detik hingga dashboard muncul

### Layout Aplikasi

```
┌─────────────────────────────────────────────────────────────┐
│ Schoboard          🔔  Admin Bendahara ▼                   │
├──────────────┬────────────────────────────────────────────────┤
│  📊Dashboard │                                                │
│                                                                │
│  ➕ Input   │  Konten Halaman Utama                          │
│  Pembayaran │                                                │
│                                                                │
│  👥 Data    │                                                │
│  Siswa      │                                                │
│                                                                │
│  📋 Riwayat │                                                │
│                                                                │
│  📊 Laporan │                                                │
│                                                                │
│  ⚙️ Pengatu  │                                                │
│     ran     │                                                │
└──────────────┴────────────────────────────────────────────────┘
```

### Navigasi Sidebar

Menu di sidebar kiri:
- **Dashboard** - Lihat overview keuangan
- **Input Pembayaran** - Catat pembayaran baru (Bendahara only)
- **Data Siswa** - Kelola data siswa
- **Riwayat** - Lihat log pembayaran
- **Laporan** - Generate laporan & export
- **Pengaturan** - Kelola master data (Bendahara only)

### Logout

1. Klik tombol profil user di top-right (dengan initial nama Anda)
2. Pilih "Keluar"
3. Anda akan diarahkan ke login page

---

## Dashboard

Halaman utama untuk monitoring status keuangan sekolah.

### Komponen Dashboard

#### 1. Stats Cards (Top)
Empat kartu menampilkan informasi ringkas:
- **Total Saldo**: Total pendapatan SPP bulan berjalan
- **Siswa Lunas**: Berapa siswa sudah membayar
- **Siswa Menunggak**: Berapa siswa belum membayar
- **Total Siswa**: Total jumlah siswa

#### 2. Grafik Pendapatan Bulanan
- **Tipe**: Line chart / Bar chart
- **Sumbu X**: Bulan (Jan-Dec)
- **Sumbu Y**: Nominal pendapatan (Rp)
- **Fitur**: 
  - Hover untuk lihat detail nilai
  - Dropdown "Bulan" untuk ubah tampilan
  - Zoom & pan support

#### 3. Status Siswa (Pie Chart)
- Menampilkan perbandingan siswa Lunas vs Menunggak
- Warna: Hijau (Lunas), Merah (Menunggak)
- Klik pada bagian untuk lihat detail

#### 4. Transaksi Terakhir (Table)
- Daftar 5 transaksi terbaru
- Kolom: Tanggal, NIS, Nama Siswa, Nominal, Status
- Klik row untuk lihat detail lengkap

### Refresh Data

Dashboard otomatis refresh setiap 30 detik. Atau:
1. Klik tombol refresh di top-right (jika ada)
2. Atau F5 untuk reload halaman

---

## Input Pembayaran

**Hanya accessible untuk BENDAHARA**

Form untuk mencatat pembayaran SPP yang diterima dari siswa.

### Step-by-Step Input Pembayaran

#### Step 1: Cari Siswa
1. Di field "Cari Siswa (NIS)" ketik NIS atau nama siswa
2. Sistem akan menampilkan hasil pencarian
3. Klik pada siswa yang sesuai
4. Data siswa akan populate otomatis di bawah form

#### Step 2: Pilih Jenis Pembayaran
1. Klik dropdown "Jenis Pembayaran"
2. Pilih salah satu:
   - SPP - Sumbangan Pembinaan Pendidikan (default)
   - Uang Buku - Biaya pembelian buku
   - Tunai - Pembayaran umum
   - OSIS - Biaya OSIS
   - Laboran - Biaya lab
3. Jenis yang dipilih akan tersimpan

#### Step 3: Input Nominal
1. Di field "Nominal Bayar" masukkan jumlah uang
2. Gunakan format angka tanpa tanda Rp
3. Contoh: 30000 (untuk Rp 30.000)
4. Sistem akan menampilkan format rupiah

#### Step 4: Pilih Metode Pembayaran
1. Klik dropdown "Metode Pembayaran"
2. Pilih salah satu:
   - **Transfer Bank** - Pembayaran via transfer bank
   - **Tunai** - Pembayaran tunai langsung
3. Jika Transfer Bank, field upload bukti akan muncul

#### Step 5: Upload Bukti (jika diperlukan)
1. Jika metode "Transfer Bank":
   - Klik "Upload file" atau drag-drop file
   - File yang disupport: JPG, PNG, PDF
   - Max ukuran: 5MB
2. Untuk "Tunai" bisa skip step ini

#### Step 6: Review & Submit
1. Check semua data sudah benar:
   - Nama siswa
   - Jenis pembayaran
   - Nominal
   - Metode
2. Klik tombol "Simpan Pembayaran" (hijau besar)
3. Tunggu sampai notification "Pembayaran berhasil disimpan"
4. Halaman akan refresh dan form kembali kosong

### Tips Input Pembayaran
- ✅ Cek nominal sebelum submit
- ✅ Upload bukti untuk Transfer Bank
- ✅ Catatan pembayaran bisa ditambah di field notes
- ❌ Jangan submit dua kali untuk siswa sama pada hari yang sama
- ❌ Jangan hapus pembayaran tanpa alasan yang jelas

---

## Data Siswa

Manajemen database siswa sekolah.

### Melihat Daftar Siswa

1. Klik "Data Siswa" di sidebar
2. Tabel akan menampilkan semua siswa dengan kolom:
   - **NIS**: Nomor Induk Siswa
   - **Nama Lengkap**: Nama siswa
   - **Kelas**: Kelas siswa saat ini
   - **Alamat**: Alamat rumah
   - **No. HP**: Nomor HP orang tua
   - **Status**: Lunas (✓) atau Menunggak (✗)

### Search Siswa

**Cari berdasarkan Nama/NIS:**
1. Klik field search "Cari Nama/NIS"
2. Ketik NIS atau nama siswa
3. Hasil akan filter otomatis
4. Search case-insensitive (tidak peduli besar-kecil)

**Filter berdasarkan Kelas:**
1. Klik dropdown "Filter Kelas"
2. Pilih kelas tertentu: 8A, 8B, 9A, dll
3. Tabel akan menampilkan siswa dari kelas tersebut saja
4. Gunakan "Semua Kelas" untuk menampilkan semua

### Pagination

Jika daftar siswa banyak:
1. Gunakan tombol navigasi di bawah tabel
2. Tombol: [<] [1] [2] [3] ... [>]
3. Klik nomor page untuk loncat ke page tertentu

### Edit Data Siswa (Bendahara only)

1. Cari siswa di tabel
2. Klik tombol "✏️ Edit" di kolom Action
3. Modal form akan terbuka
4. Edit field yang diperlukan:
   - Nama
   - NIS
   - Kelas
   - Alamat
   - No. HP Orang Tua
5. Klik "Simpan" untuk save perubahan
6. Klik "Batal" untuk cancel

### Hapus Data Siswa (Bendahara only)

1. Cari siswa di tabel
2. Klik tombol "🗑️ Hapus" di kolom Action
3. Confirmation dialog akan muncul
4. Klik "Ya, Hapus" untuk confirm
5. Siswa akan dihapus dari sistem
6. **Catatan**: Pembayaran siswa tetap tersimpan

### Tambah Siswa Baru (Bendahara only)

1. Klik tombol "+ Tambah Siswa" di top-right
2. Modal form akan terbuka
3. Isi field yang wajib:
   - **NIS** (Nomor Induk Siswa) - harus unik
   - **Nama**
   - **Kelas**
   - **Alamat** (opsional)
   - **No. HP Orang Tua** (opsional)
4. Klik "Simpan"
5. Siswa baru akan ditambahkan ke daftar

---

## Riwayat Pembayaran

Log lengkap semua transaksi pembayaran yang pernah dicatat.

### Melihat Riwayat

1. Klik "Riwayat" di sidebar
2. Tabel menampilkan semua pembayaran dengan kolom:
   - **No. Transaksi**: ID unik transaksi
   - **Tanggal**: Tanggal transaksi
   - **NIS**: Nomor Induk Siswa
   - **Nama Siswa**: Nama penerima
   - **Jenis**: Jenis pembayaran (SPP, Buku, dll)
   - **Nominal**: Jumlah uang (Rp)
   - **Metode**: Transfer Bank / Tunai
   - **Status**: Badge warna (Berhasil/Gagal/Pending)

### Filter & Search

**Filter berdasarkan Tanggal:**
1. Klik calendar icon di "Pilih Tanggal"
2. Select tanggal awal dan akhir
3. Tabel akan filter otomatis
4. Gunakan shortcut: "Bulan Ini", "Tahun Ini", etc

**Search berdasarkan NIS/Nama:**
1. Klik field search
2. Ketik NIS atau nama siswa
3. Hasil akan filter real-time

**Filter berdasarkan Status:**
1. Klik dropdown "Status"
2. Pilih: Semua, Berhasil, Gagal, Pending
3. Tabel akan menampilkan sesuai filter

### Melihat Detail Transaksi

1. Klik row pembayaran di tabel
2. Detail card akan expand/pop-up
3. Info yang ditampilkan:
   - Nama siswa lengkap
   - Nominal pembayaran
   - Status
   - Metode
   - Bukti (jika ada)
   - Tanggal transaksi

### Cetak Kuitansi (Semua Role)

1. Klik tombol "📄 Lihat PDF" di kolom Action
2. PDF kuitansi akan terbuka di tab baru
3. Klik "Print" untuk print, atau "Save" untuk download
4. Kuitansi berisi:
   - Nama dan kelas siswa
   - Nominal pembayaran
   - Tanggal terima
   - Tanda tangan/approval

### Edit Pembayaran (Bendahara only)

1. Klik tombol "✏️ Edit" di Action
2. Modal edit akan terbuka
3. Ubah field yang perlu dirubah
4. Klik "Simpan Perubahan"

### Hapus Pembayaran (Bendahara only)

1. Klik tombol "🗑️ Hapus" di Action
2. Confirmation dialog muncul
3. Klik "Ya, Hapus" untuk confirm
4. Transaksi akan dihapus dari history
5. **Catatan**: Data akan hilang permanen!

### Pagination

Navigasi halaman seperti di Data Siswa.

---

## Laporan & Rekapitulasi

Generate dan export laporan pembayaran dalam berbagai format.

### Jenis Laporan

**1. Rekap Bulanan**
- Ringkasan pembayaran per bulan
- Menampilkan total pembayaran, siswa yang bayar, siswa yang menunggak
- Format tabel dengan breakdown per kelas

**2. Tunggakan per Kelas**
- Daftar siswa yang belum membayar per kelas
- Kolom: NIS, Nama, Kelas, Total Tunggakan, Bulan Tunggakan
- Berguna untuk follow-up siswa menunggak

**3. Tren Pendapatan**
- Grafik tren pendapatan dari awal tahun
- Menampilkan apakah pendapatan naik/turun
- Support untuk analisis trend tahunan

**4. Rekap Susulan**
- Data pembayaran cicilan/susulan
- Untuk siswa yang bayar beberapa bulan sekaligus
- Breakdown pembayaran per siswa

### Generate Laporan

1. Buka halaman "Laporan"
2. Pilih "Jenis Laporan" dari dropdown
3. Pilih "Periode" (tahun ajaran)
4. Pilih "Rentang Tanggal" (opsional)
5. Klik "Generate Laporan"
6. Laporan akan ditampilkan di preview area

### Export Laporan

**Export ke PDF:**
1. Generate laporan terlebih dahulu
2. Klik tombol "📄 Cetak PDF"
3. PDF akan di-download
4. Buka di Adobe Reader atau preview

**Export ke Excel:**
1. Generate laporan terlebih dahulu
2. Klik tombol "📊 Ekspor Excel"
3. File .xlsx akan di-download
4. Buka di Microsoft Excel atau Google Sheets
5. Bisa di-edit, di-format, dan di-analisis lebih lanjut

### Tips Laporan
- ✅ Export Excel untuk analisis lebih detail
- ✅ Export PDF untuk dokumentasi resmi
- ✅ Gunakan Rekap Bulanan untuk monitoring rutin
- ✅ Gunakan Tunggakan untuk follow-up siswa
- ❌ Jangan edit PDF export secara sembarangan

---

## Pengaturan

**Hanya accessible untuk BENDAHARA**

Konfigurasi master data sistem.

### Kelola Kelas

**Melihat Daftar Kelas:**
1. Klik tab "Kelola Kelas"
2. Tabel menampilkan semua kelas yang ada
3. Kolom: Nama Kelas, Tahun Ajaran, Aksi

**Tambah Kelas Baru:**
1. Klik tombol "+ Tambah Kelas"
2. Masukkan nama kelas (contoh: 8A, 8B, 9A)
3. Pilih tahun ajaran
4. Klik "Simpan"

**Edit Kelas:**
1. Klik "✏️ Edit" di row kelas
2. Ubah nama atau tahun ajaran
3. Klik "Simpan"

**Hapus Kelas:**
1. Klik "🗑️ Hapus"
2. Confirm dialog
3. Kelas akan dihapus (perhatikan: siswa di kelas ini tidak dihapus)

### Kelola Tahun Ajaran

**Melihat Tahun Ajaran:**
1. Klik tab "Kelola Tahun Ajaran"
2. Tabel menampilkan tahun ajaran aktif dan non-aktif
3. Kolom: Tahun, Tanggal Mulai, Tanggal Akhir, Status, Aksi

**Tambah Tahun Ajaran:**
1. Klik "+ Tambah Tahun Ajaran"
2. Format tahun: 2024/2025, 2025/2026, dll
3. Tentukan tanggal awal (contoh: 1 Januari) dan akhir (31 Desember)
4. Set sebagai "Aktif" jika tahun ajaran berjalan
5. Klik "Simpan"

**Set Tahun Ajaran Aktif:**
1. Hanya satu tahun ajaran bisa aktif
2. Klik "Jadikan Aktif" untuk switch tahun ajaran
3. Sistem akan update semester/batch baru

### Atur Tarif SPP

**Melihat Tarif SPP:**
1. Klik tab "Atur Tarif SPP"
2. Tabel menampilkan tarif SPP per kelas per tahun ajaran
3. Kolom: Kelas, Tahun Ajaran, Nominal SPP, Aksi

**Tambah Tarif Baru:**
1. Klik "+ Tambah Tarif"
2. Pilih kelas
3. Pilih tahun ajaran
4. Masukkan nominal SPP bulanan (contoh: 30000)
5. Klik "Simpan"

**Edit Tarif:**
1. Klik "✏️ Edit"
2. Ubah nominal SPP
3. Klik "Simpan"

**Catatan**: Tarif yang sudah dibuat tidak bisa dihapus, hanya di-edit.

### Manajemen User

**Melihat Daftar User:**
1. Klik tab "Manajemen User"
2. Tabel menampilkan semua user (Bendahara & Siswa)
3. Kolom: Email, Nama, Role, Status, Aksi

**Tambah User:**
1. Klik "+ Tambah User"
2. Form akan muncul:
   - Email (harus unik)
   - Nama
   - Password (minimal 8 karakter)
   - Role: Bendahara atau Siswa
3. Klik "Buat User"

**Edit User:**
1. Klik "✏️ Edit"
2. Bisa ubah: Nama, Role, Status (aktif/nonaktif)
3. Password tidak bisa diedit dari sini (untuk security)
4. Klik "Simpan"

**Nonaktifkan User:**
1. Klik "Nonaktifkan" di Action
2. User tidak bisa login lagi
3. Untuk aktifkan: klik "Aktifkan"

### Backup & Restore

**Export Database:**
1. Klik tab "Backup & Restore"
2. Klik tombol "📥 Download Backup"
3. File database akan di-download sebagai `.db` file
4. Simpan file di tempat aman

**Import Backup:**
1. Klik "📤 Upload Backup"
2. Choose file backup yang sudah di-download sebelumnya
3. Klik "Upload"
4. **HATI-HATI**: Data saat ini akan di-replace!
5. Confirmation dialog akan muncul
6. Klik "Ya, Restore" untuk confirm

**Tips Backup:**
- ✅ Backup database setiap minggu
- ✅ Backup sebelum membuat perubahan besar
- ✅ Simpan backup di cloud atau eksternal drive
- ✅ Label backup dengan tanggal (contoh: backup-2026-06-02.db)

---

## Tips & Tricks

### 1. Shortcut Keyboard
- `Ctrl/Cmd + K` - Search global (jika implemented)
- `Ctrl/Cmd + Shift + M` - Buka menu (mobile)
- `Escape` - Tutup modal/dropdown

### 2. Performance Tips
- Jika tabel lambat, kurangi range tanggal filter
- Archive pembayaran tahun lalu untuk speed up
- Clear browser cache jika ada issue loading

### 3. Data Entry Best Practices
- Cek nominal sebelum submit pembayaran
- Gunakan format NIS yang konsisten
- Upload bukti untuk semua transfer bank
- Add notes untuk pembayaran yang unusual

### 4. Security Tips
- ❌ Jangan bagikan password login Anda
- ❌ Jangan logout di komputer umum
- ✅ Logout setiap akhir pekerjaan
- ✅ Gunakan password yang kuat untuk Bendahara
- ✅ Regularly change password

### 5. Troubleshooting Common Issues

**Data tidak update?**
- Refresh halaman (F5)
- Clear browser cache (Ctrl+Shift+Delete)
- Logout dan login kembali

**Export PDF/Excel tidak work?**
- Check pop-up blocker
- Try different browser
- Check file download folder
- Pastikan file size tidak terlalu besar

**Search tidak menemukan siswa?**
- Cek penulisan NIS/Nama
- Gunakan search case-insensitive
- Try partial search (contoh: cari "Sarah" bukan "Sarah Jones")

---

## Frequently Asked Questions (FAQ)

**Q: Bagaimana jika siswa bayar lebih dari nominal SPP?**
A: Input nominal sesuai yang diterima. Saldo berlebih bisa dicatat di note untuk dipertimbangkan bulan depan.

**Q: Bisa edit/hapus pembayaran yang sudah dicatat?**
A: Ya, Bendahara bisa edit/hapus. Gunakan dengan hati-hati karena akan mempengaruhi laporan.

**Q: Bagaimana export laporan untuk tahun ajaran lalu?**
A: Di tab Laporan, gunakan dropdown "Periode" untuk select tahun ajaran yang berbeda.

**Q: Apakah backup otomatis?**
A: Saat ini manual. Backup secara rutin via menu Backup & Restore.

**Q: Siswa menunggak berkali-kali, bagaimana?**
A: Gunakan laporan "Tunggakan per Kelas" untuk identify dan follow-up siswa menunggak.

---

## Contact & Support

Jika ada pertanyaan atau issue:
1. Baca dokumentasi di README.md
2. Check INSTALLATION.md untuk setup issues
3. Review server logs untuk debug
4. Contact administrator sistem

---

**Happy using Schoboard! 🎉**

Semoga aplikasi ini membantu kelancaran administrasi keuangan sekolah Anda.
