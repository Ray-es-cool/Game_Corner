/* =========================
   FIREDB ALIAS FOR SQLITE
   CritStrike uses SQLite via server API

   No Firebase needed - all data stored in local SQLite.
========================= */

// Directly alias SQLiteDB to FireDB (sqlite-db.js loads first)
if (typeof window !== "undefined" && window.SQLiteDB) {
  window.FireDB = window.SQLiteDB;
  console.log('[FireDB] Using SQLite backend');
}
