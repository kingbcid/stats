COURTSIDE MATCH STATS V1.4 — KING Basketball Community
Deploy all files to root of kingbcid/stats GitHub Pages repository.

CHANGES
- MIN: reads /matches/main/state gameSec, period, gameRunning and syncedAt (read-only).
- Uses a Firebase transaction on each stats match to accumulate the difference in scoreboard time
  only once across operator devices. Counts time for the players on court.
- Quick Sub first settles elapsed minutes before changing lineup.
- Scoreboard scores are NEVER read into stats or written by this app.
- History: finished matches have a permanent Delete action with confirmation.
- Live matches must be finished before deleting.

IMPORTANT LIMITATIONS
- MIN starts when the stats match is created / scoreboard first connected, not retroactively.
- Quarter transitions establish a new baseline; a small interval between final clock sample
  and quarter switch may not be counted.
- A scoreboard reset within the same quarter pauses MIN accumulation and shows a warning.
  Create a NEW stats match for a new scoreboard game.
- The clock must be reachable online. A gap in connectivity can be recovered within a quarter
  using the clock difference, but quarter changes during a gap cannot be reconstructed.
- MIN shown in the box score is committed at the latest successful sync; it may lag ~1-2 sec.
- Existing Firebase Rules must allow the operator UID read access to /matches/main/state and
  write access to /matchStatsV13. No scoreboard rules need to be changed.
- Delete is permanent and cannot be undone.

Public View is not included.
