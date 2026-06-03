Panduan Menjalankan Proyek School Fee App di Perangkat Baru

Ringkasan: langkah ini menjelaskan cara menyiapkan perangkat Windows yang belum terinstal apa-apa untuk menjalankan aplikasi Next.js ini (menggunakan SQLite/Prisma).

Prasyarat

- Git (opsional jika meng-clone repo). Download: https://git-scm.com/
- Node.js 18 atau lebih baru (direkomendasikan). Download: https://nodejs.org/
- pnpm (direkomendasikan) — bisa diaktifkan lewat Corepack atau diinstal global.
- (Opsional) VS Code atau editor lain.

Langkah 1 — Dapatkan kode

1. Jika mendapatkan lewat Git:

```bash
git clone <REPO_URL>
cd school-fee-app
```

2. Jika Anda menerima folder ZIP, ekstrak lalu buka folder proyek.

Langkah 2 — Aktifkan Corepack / Pasang pnpm
Corepack direkomendasikan (tersedia di Node.js modern):

```powershell
corepack enable
corepack prepare pnpm@latest --activate
```

Alternatif (jika tidak pakai corepack):

```powershell
npm install -g pnpm
```

Langkah 3 — Pasang dependensi

```bash
pnpm install
```

Langkah 4 — Siapkan variabel lingkungan (.env)
Buat file `.env` di root proyek. Minimal yang diperlukan untuk pengembangan lokal (SQLite):

```
DATABASE_URL="file:./dev.db"
# Tambahkan variabel lain bila proyek Anda memerlukannya, mis. JWT_SECRET, NEXTAUTH_URL, dsb.
```

Langkah 5 — Generate Prisma Client dan buat DB

```bash
npx prisma generate
npx prisma db push
```

- `db push` akan membuat schema ke file SQLite (`dev.db`) tanpa migrasi yang kompleks. Jika repo menggunakan migrasi, Anda bisa jalankan `npx prisma migrate dev`.

Langkah 6 — Seed database (opsional tetapi direkomendasikan)
Proyek sudah memiliki script seed di `package.json`.

```bash
pnpm run seed
```

Langkah 7 — Menjalankan aplikasi dalam mode development

```bash
pnpm dev
```

Buka http://localhost:3000 di browser.

Langkah 8 — Build untuk produksi (opsional)

```bash
pnpm build
pnpm start
```

Catatan tambahan

- Port default: `3000`. Jika sudah ada aplikasi lain pada port tersebut, ubah environment atau hentikan aplikasi lain.
- Jika menemui error terkait versi Node, pastikan Node >= 18.
- Jika ada error Prisma/SQLite, hapus `dev.db` lalu ulangi `npx prisma db push` dan `pnpm run seed` (hati-hati, ini akan menghapus data lokal).
- Jika ada dependensi native atau masalah install pada Windows, jalankan PowerShell sebagai Administrator.

Troubleshooting singkat

- Error `command not found pnpm`: jalankan `corepack enable` atau `npm i -g pnpm`.
- Error Prisma: jalankan `npx prisma generate` lalu `npx prisma db push`.
- Jika `pnpm dev` keluar dengan kode error, baca log di terminal untuk pesan spesifik. Biasanya masalah umum: env yang belum di-set, Node versi tidak cocok, atau dependency yang belum terinstall.

Kontak/Referensi

- Lihat file `prisma/seed.ts` untuk detail data awal yang di-seed.
- Jika repo punya `README.md`, cek juga instruksi tambahan di sana.

Selesai — setelah mengikuti langkah di atas, aplikasi harus berjalan di perangkat baru.
