COURTSIDE MATCH STATS V1.3 — KING BASKETBALL COMMUNITY

Website: https://kingbcid.github.io/stats/
Repository: kingbcid/stats
Firebase project: king-basketball-communit-311a2
Realtime Database statistics path: /matchStatsV13

INSTALL
1. Upload all files from ZIP root to the ROOT of repository stats, replacing existing files.
2. Ensure GitHub Pages publishes the correct branch/root.
3. Realtime Database Rules were already published by the owner: the matchStatsV13 node must allow the operator UID. DO NOT replace the whole rules with the partial JSON in this ZIP.
4. Firebase Authentication must contain operator@gmail.com with UID xXCO21qUL2gmYQPmBU71BPcGXHB3 in THIS KING project.
5. Login with the existing password (not included).
6. Create one match; other device opens the same active match and selects HOME or AWAY.
7. Scoreboard clock is read-only and expects /matches/main/state. If the KING scoreboard uses a different match ID, change COURTSIDE_SCOREBOARD_MATCH in firebase-config.js.
8. Player MIN is not automatically calculated in V1.3.
9. Public view is not enabled. Internet required.
10. If an older version is still visible after deploy, hard-refresh or clear website cache.

NOTES
- Firebase web apiKey is public client configuration, NOT an admin credential.
- The app currently permits only the operator UID at the login gate, even though published database rules also allow the KING UID.
- Existing scoreboard and KING Player Statistics paths are not modified by this ZIP.
- Two-device live synchronization has not been tested against your actual KING Firebase database.


V1.3.1 FIX LOGIN MODAL
- Login tampil sebagai popup overlay di tengah layar, bukan panel di atas halaman.
- Popup otomatis hilang ketika Firebase Authentication berhasil.
- Login kembali muncul jika logout / sesi tidak valid.
- Inline critical CSS mengatasi stylesheet lama yang tersimpan di cache.
- Service worker cache version diperbarui.
Jika browser masih menampilkan versi lama, tekan Ctrl+Shift+R atau hapus data situs.
