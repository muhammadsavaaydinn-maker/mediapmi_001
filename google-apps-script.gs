// SKRIP GOOGLE SHEET - penerima jawaban soal statistika
// Mengisi tabel: judul "nama | kelas | nilai | 1 ... 10".
// Kolom 1..10 diisi tulisan "Benar" (hijau) atau "Salah" (merah). Kolom N = waktu, kolom O = ID kiriman.
const SHEET_ID = '1SdL6JTIvWswHxPTKseoEyDh7YbexYQhHL-J81Bif5oM';
const JUDUL = ['nama', 'kelas', 'nilai', 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 'waktu', 'id kiriman'];
const HIJAU = '#b7e1cd', MERAH = '#f4c7c3';

function tambah_(d) {
  const sh = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
  // 1) cari baris judul (sel kolom A berisi "nama") pada 30 baris pertama
  let hr = 0;
  const atas = sh.getRange(1, 1, Math.min(30, sh.getMaxRows()), 1).getValues();
  for (let i = 0; i < atas.length; i++) { if (String(atas[i][0]).trim().toLowerCase() === 'nama') { hr = i + 1; break; } }
  if (!hr) { hr = sh.getLastRow() + 1; sh.getRange(hr, 1, 1, JUDUL.length).setValues([JUDUL]).setFontWeight('bold'); }
  if (String(sh.getRange(hr, 14).getValue()) === '') sh.getRange(hr, 14, 1, 2).setValues([['waktu', 'id kiriman']]);
  // 2) cegah baris ganda jika kiriman yang sama diulang
  if (d.id && sh.getLastRow() > hr) {
    const ids = sh.getRange(hr + 1, 15, sh.getLastRow() - hr, 1).getValues();
    for (let i = 0; i < ids.length; i++) { if (String(ids[i][0]) === String(d.id)) return 'duplikat'; }
  }
  // 3) cari baris kosong pertama di bawah judul
  let row = sh.getLastRow() + 1;
  const kolA = sh.getRange(hr + 1, 1, Math.max(sh.getMaxRows() - hr, 1), 1).getValues();
  for (let i = 0; i < kolA.length; i++) { if (String(kolA[i][0]) === '') { row = hr + 1 + i; break; } }
  // 4) tulis: soal 1-10 berisi "Benar" / "Salah" lengkap dengan warna
  const skor = (d.skor || []).slice(0, 10); while (skor.length < 10) skor.push('');
  const benar = v => v === 1 || v === '1' || v === true || String(v).toLowerCase() === 'benar';
  const salah = v => v === 0 || v === '0' || v === false || String(v).toLowerCase() === 'salah';
  const teks = skor.map(v => (benar(v) ? 'Benar' : salah(v) ? 'Salah' : ''));
  const warna = skor.map(v => (benar(v) ? HIJAU : salah(v) ? MERAH : null));
  const waktu = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'dd/MM/yyyy HH:mm:ss');
  const isi = [String(d.nama || '').slice(0, 50), String(d.kelas || '').slice(0, 12), Number(d.nilai) || 0].concat(teks, [waktu, String(d.id || '')]);
  sh.getRange(row, 1, 1, 15).setValues([isi]);
  sh.getRange(row, 4, 1, 10).setBackgrounds([warna]).setHorizontalAlignment('center');
  return 'ok';
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);                         // aman jika banyak siswa mengirim bersamaan
  try {
    const hasil = tambah_(JSON.parse(e.postData.contents));
    return ContentService.createTextOutput(JSON.stringify({ ok: true, hasil: hasil })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet() { return ContentService.createTextOutput('Penerima nilai aktif.'); }

// UJI MANUAL: pilih fungsi "uji" di editor lalu klik Jalankan (juga memunculkan jendela IZIN yang wajib disetujui).
function uji() {
  Logger.log(tambah_({ nama: 'UJI COBA (hapus baris ini)', kelas: '-', nilai: 80, skor: [1, 1, 1, 1, 1, 1, 1, 1, 0, 0], id: 'uji-' + Date.now() }));
}
