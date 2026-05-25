/* =========================
   FIREDB ALIAS FOR SQLITE
   CritStrike uses SQLite via server API

   No Firebase needed - all data stored in local SQLite.
========================= */

// Wait for SQLiteDB to be available and alias it to FireDB
if (typeof window !== "undefined") {
  const checkDB = setInterval(() => {
    if (window.SQLiteDB) {
      window.FireDB = window.SQLiteDB;
      clearInterval(checkDB);
      console.log('[FireDB] Connected to SQLite backend');
    }
  }, 50);

  // Timeout after 5 seconds
  setTimeout(() => {
    clearInterval(checkDB);
    if (!window.FireDB) {
      console.error('[FireDB] Failed to load SQLite backend');
    }
  }, 5000);
}
