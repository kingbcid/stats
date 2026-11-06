COURTSIDE MATCH STATS V1.1 — PUBLIC PREVIEW
Presented by KING Basketball Community

PERUBAHAN
- Master Roster dan menu Players dihapus.
- Semua pemain dimasukkan manual saat membuat pertandingan (1 nama per baris).
- Nama pemain yang sama pada dua tim diperbolehkan karena identitas bersifat per pertandingan.
- Pertandingan Scrimmage, Antarkelas, Turnamen, Persahabatan.
- HOME / AWAY, lima starter teratas, substitusi, statistik, Undo, CSV, History.

CARA PAKAI
1. Upload seluruh file ke root repository basketball-match-stats di GitHub Pages.
2. Buka New Match; isi nama tim dan pemain HOME/AWAY per baris.
3. Klik Mulai Pertandingan dan catat statistik.
4. Buka History untuk melihat pertandingan sebelumnya.

BATASAN PREVIEW
- Data tersimpan di localStorage browser/perangkat ini saja.
- Belum mendukung dua operator pada dua perangkat secara real-time.
- Game Clock Firebase hanya-baca bersifat percobaan.
- Tidak ada login, database publik, atau publikasi Box Score online.
- Sebelum menghapus data situs/browser, ekspor CSV terlebih dahulu.
- Update dari preview sebelumnya mempertahankan riwayat di browser yang sama bila data situs tidak dihapus.


V1.2 UPDATES:
- QUICK SUB: tekan Quick Sub, tap pemain ON COURT yang keluar, lalu tap pemain BENCH yang masuk. Tidak perlu dropdown. Tap Batal Sub untuk keluar mode.
- BOX SCORE otomatis diurutkan dari PTS tertinggi ke terendah untuk masing-masing tim, tie-break nama.
- Tetap preview lokal; Firebase untuk sinkronisasi operator belum diaktifkan.
