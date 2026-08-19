# Kosong.Ltd — Affiliate Performance Dashboard

Dashboard untuk analisis & evaluasi performa creator afiliasi TikTok Shop Kosong.Ltd, bulan per bulan (Jan–Des). Data disimpan sebagai file JSON di folder `data/` repo ini sendiri — **tidak pakai Supabase/database eksternal**.

Cara kerja singkat: dashboard (`index.html`) upload file XLSX → di-parse di browser → dikirim ke `/api/data` (serverless function) → function itu yang commit/hapus file JSON ke GitHub lewat GitHub API, pakai token yang disimpan aman sebagai environment variable di Vercel (tidak pernah kekirim ke browser).

---

## 1. Push project ini ke repo

Repo kamu: `https://github.com/faris-ads/Affiliate-Existing-Kosongltd`

```bash
cd kosong-aff-dashboard
git init
git remote add origin https://github.com/faris-ads/Affiliate-Existing-Kosongltd.git
git add .
git commit -m "Initial commit: affiliate dashboard"
git branch -M main
git push -u origin main
```

## 2. Bikin GitHub token (fine-grained PAT)

1. Buka **github.com → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**
2. **Repository access**: pilih "Only select repositories" → pilih `Affiliate-Existing-Kosongltd` saja (jangan "All repositories")
3. **Permissions**: cari "Contents" → set ke **Read and write**. Semua permission lain biarkan "No access"
4. **Expiration**: pilih sesuai kenyamanan (bisa 1 tahun, nanti tinggal generate ulang)
5. Generate, lalu **copy token-nya** (cuma muncul sekali) — token ini yang akan kamu tempel ke Vercel di langkah 4, bukan ke saya/Claude

## 3. Deploy ke Vercel

1. Buka **vercel.com → Add New → Project**
2. Import repo `faris-ads/Affiliate-Existing-Kosongltd`
3. Framework preset: pilih **Other** (tidak perlu build command apa pun — ini static HTML + serverless function)
4. Klik **Deploy** dulu (nanti tambah env var di langkah 4, lalu redeploy)

## 4. Set Environment Variables di Vercel

Di project Vercel → **Settings → Environment Variables**, tambahkan:

| Key | Value |
|---|---|
| `GITHUB_TOKEN` | token dari langkah 2 |
| `GITHUB_OWNER` | `faris-ads` |
| `GITHUB_REPO` | `Affiliate-Existing-Kosongltd` |
| `GITHUB_BRANCH` | `main` |

Setelah menambahkan, buka tab **Deployments** → klik titik tiga pada deployment terakhir → **Redeploy** (supaya env var-nya kepakai).

## 5. Pakai dashboard-nya

- Buka URL Vercel kamu (misal `affiliate-existing-kosongltd.vercel.app`)
- Klik **"+ Upload data bulanan"**, pilih periode (bulan), lalu pilih file XLSX
- Setelah "Simpan ke GitHub", data langsung muncul di dashboard dan file JSON-nya otomatis nambah di folder `data/` repo kamu
- Ulangi tiap bulan (Jan s/d Des) — tiap bulan jadi 1 file, misal `data/2026-01.json`, `data/2026-02.json`, dst
- Kalau ada data yang salah upload, klik **"Hapus bulan ini"** untuk hapus filenya dari GitHub
- Begitu ada 2 bulan atau lebih, otomatis muncul grafik tren total GMV antar bulan

## Catatan format file XLSX

Dashboard mengharapkan format seperti file Kalodata/TikTok Shop Seller Center:
- Baris 1 = header kolom
- Baris 2 = deskripsi kolom (otomatis di-skip)
- Baris 3 dst = data per creator

Kalau ada bulan dengan format kolom sedikit berbeda, kolom yang tidak dikenali otomatis diabaikan (bukan error) — cek `COLUMN_MAP` di `index.html` kalau perlu menambah mapping kolom baru.

## Kalau mau ganti/rotate token

Token bisa di-revoke & generate baru kapan saja dari GitHub Settings, tinggal update value `GITHUB_TOKEN` di Vercel lalu redeploy. Tidak perlu ubah kode.
