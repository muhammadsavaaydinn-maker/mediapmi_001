'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = v => (Math.round(v * 100) / 100).toString().replace('.', ',');

/* =========================================================
   1. NAVIGASI & LEMBAR (halaman baru tanpa tab baru)
   ========================================================= */
let current = '';
function route() {
  const id = location.hash.replace(/^#\/?/, '');
  const target = id ? document.getElementById('p-' + id) : null;
  current = target ? id : '';
  $$('.sheet').forEach(s => s.classList.toggle('open', s === target));
  document.body.classList.toggle('lock', !!target);
  if (target) { target.scrollTop = 0; const b = $('.back', target); if (b) b.focus({ preventScroll: true }); }
}
function closeSheet() {
  if (location.hash) { try { history.pushState('', document.title, location.pathname + location.search); } catch (e) { location.hash = ''; } }
  route();
}
window.addEventListener('hashchange', route);
document.addEventListener('click', e => {
  const t = e.target.closest('[data-back],[data-open],[data-go]');
  if (!t) return;
  if (t.hasAttribute('data-back')) closeSheet();
  else if (t.dataset.open) location.hash = '#/' + t.dataset.open;
  else if (t.dataset.go) {
    const el = document.getElementById(t.dataset.go);
    if (el) el.scrollIntoView({ behavior: REDUCE ? 'auto' : 'smooth', block: 'start' });
  }
});
const menuBtn = $('#menuBtn'), menuBox = $('#menuBox');
const setMenu = o => { menuBox.hidden = !o; menuBtn.setAttribute('aria-expanded', String(o)); };
menuBtn.addEventListener('click', e => { e.stopPropagation(); setMenu(menuBox.hidden); });
document.addEventListener('click', e => { if (!menuBox.hidden && !e.target.closest('.menu-wrap')) setMenu(false); });
const KEYS = { a: 'materi', b: 'simulasi', c: 'kuis' };
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { if (!menuBox.hidden) setMenu(false); else if (current) closeSheet(); return; }
  if (current || e.ctrlKey || e.metaKey || e.altKey || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
  const k = KEYS[e.key.toLowerCase()]; if (k) location.hash = '#/' + k;
});

/* =========================================================
   2. SIMULASI: KOIN (modus) dan KARTU (median, mean, modus)
   ========================================================= */
// Aturan modus: nilai dengan frekuensi terbesar. Jika semua nilai yang ada muncul sama banyak (dan ada lebih dari satu nilai), tidak ada modus.
function modusOf(freq) { // freq: {nilai: banyak}
  const keys = Object.keys(freq).map(Number).filter(v => freq[v] > 0).sort((a, b) => a - b);
  if (!keys.length) return { list: [], none: false, max: 0 };
  const max = Math.max(...keys.map(v => freq[v]));
  const list = keys.filter(v => freq[v] === max);
  const none = keys.length > 1 && list.length === keys.length;
  return { list: none ? [] : list, none, max };
}
const medianOf = sorted => { const n = sorted.length, h = n >> 1; return n % 2 ? sorted[h] : (sorted[h - 1] + sorted[h]) / 2; };

const Sim = (() => {
  /* ---- tab ---- */
  $$('.stab').forEach(b => b.addEventListener('click', () => {
    $$('.stab').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', String(x === b)); });
    $('#simVisit').hidden = b.dataset.tab !== 'visit';
    $('#simCard').hidden = b.dataset.tab !== 'card';
  }));

  /* ---- KUNJUNGAN (modus hari) ---- */
  const DAY = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
  const vf = Array(7).fill(0), vlog = [];
  let vrun = 0, vbusy = false;
  const sleep = ms => new Promise(r => setTimeout(r, REDUCE ? Math.min(ms, 30) : ms));
  const vName = (el, d) => (el.value.trim() || d);
  $('#vDays').innerHTML = DAY.map((d, i) => `<button type="button" class="day" data-d="${i}">${d.slice(0, 3)}<small>${d}</small></button>`).join('');
  $('#vCols').innerHTML = DAY.map((d, i) => `<div class="vc" data-d="${i}"><div class="cnt">0</div><div class="vstack"></div><div class="lab">${d.slice(0, 3)}</div></div>`).join('');
  function vNames() {
    $('#vH1').textContent = 'Rumah ' + vName($('#vWho'), 'Pemain'); $('#vH2').textContent = 'Rumah ' + vName($('#vHome'), 'Teman');
    $('#vInit').textContent = vName($('#vWho'), 'P').charAt(0).toUpperCase(); vOut();
  }
  function vDraw() {
    const m = modusOf(Object.fromEntries(vf.map((c, d) => [d, c])));
    $$('.vc').forEach(col => {
      const d = +col.dataset.d;
      $('.vstack', col).innerHTML = '<i></i>'.repeat(vf[d]); $('.cnt', col).textContent = vf[d];
      col.classList.toggle('top', m.list.includes(d));
    });
    vOut(m);
  }
  function vOut(m) {
    m = m || modusOf(Object.fromEntries(vf.map((c, d) => [d, c])));
    const n = vlog.length, who = vName($('#vWho'), 'Pemain'), home = vName($('#vHome'), 'Teman'), o = $('#vOut');
    if (!n) { o.textContent = 'Belum ada kunjungan. Klik sebuah hari, atau tekan “Simulasikan otomatis”.'; return; }
    let r;
    if (m.none) r = `Semua hari muncul sama banyak (${m.max} kali), jadi <b>tidak ada modus</b>.`;
    else if (m.list.length === 1) r = `${esc(who)} paling sering main ke rumah ${esc(home)} pada hari <b>${DAY[m.list[0]]}</b> (${m.max} kali).<br>Modus = <b>${DAY[m.list[0]]}</b>`;
    else r = `Ada ${m.list.length} hari yang sama sering (${m.max} kali): <b>${m.list.map(d => DAY[d]).join(' dan ')}</b>.<br>Modus = <b>${m.list.map(d => DAY[d]).join(' dan ')}</b>`;
    o.innerHTML = `${r}<br><span class="mute">Data ${n} kunjungan: ${vlog.map(d => DAY[d].slice(0, 3)).join(', ')}</span>`;
  }
  async function visit(d) {
    const w = $('#vWalker'), b = $('#vBubble');
    b.textContent = DAY[d]; w.classList.add('go');
    await sleep(750);
    vf[d]++; vlog.push(d); vDraw();
    w.classList.remove('go'); b.textContent = '';
    await sleep(450);
  }
  $('#vDays').addEventListener('click', async e => {
    const bt = e.target.closest('.day'); if (!bt || vbusy) return;
    if (vf[+bt.dataset.d] >= 20) return;
    vbusy = true; await visit(+bt.dataset.d); vbusy = false;
  });
  $('#vAuto').addEventListener('click', async () => {
    if (vbusy) return; vbusy = true; const my = ++vrun;
    vf.fill(0); vlog.length = 0; vDraw();
    const fav = [Math.floor(Math.random() * 7), Math.floor(Math.random() * 7)];
    for (let i = 0; i < +$('#vN').value && my === vrun; i++) {
      const d = Math.random() < 0.55 ? fav[Math.floor(Math.random() * 2)] : Math.floor(Math.random() * 7);
      await visit(d);
    }
    vbusy = false;
  });
  $('#vClear').addEventListener('click', () => { vrun++; vbusy = false; vf.fill(0); vlog.length = 0; $('#vWalker').classList.remove('go'); $('#vBubble').textContent = ''; vDraw(); });
  $('#vWho').addEventListener('input', vNames); $('#vHome').addEventListener('input', vNames);
  vNames(); vDraw();

  /* ---- KARTU ---- */
  const row = $('#cardRow'), out = $('#cardOut'), mw = $('#meanWrap');
  let cards = [], sorted = false, timer = 0;
  const say = h => { out.innerHTML = h; };
  const clearMarks = () => { cards.forEach(c => c.el.classList.remove('mid', 'mod')); mw.hidden = true; };
  const place = () => cards.forEach((c, i) => c.el.style.setProperty('--k', i));
  function deal() {
    clearTimeout(timer);
    const n = +$('#cardN').value;
    cards = Array.from({ length: n }, () => ({ v: 1 + Math.floor(Math.random() * 10) }));
    row.style.setProperty('--n', n);
    row.innerHTML = '';
    cards.forEach(c => {
      const el = document.createElement('div');
      el.className = 'pcard';
      el.innerHTML = `<span class="c1">${c.v}</span><b>${c.v}</b><span class="c2">${c.v}</span>`;
      row.appendChild(el); c.el = el;
    });
    place(); sorted = false; mw.hidden = true;
    say(`${n} kartu sudah dibagikan. Data: <b>${cards.map(c => c.v).join(', ')}</b>.<br><span class="mute">Coba tebak dulu mediannya, lalu tekan “Cari median”.</span>`);
  }
  function sortNow() {
    if (sorted) return 0;
    cards.sort((a, b) => a.v - b.v); place(); sorted = true;
    return REDUCE ? 0 : 650;
  }
  $('#cardDeal').addEventListener('click', deal);
  $('#cardN').addEventListener('change', deal);
  $('#cardSort').addEventListener('click', () => {
    clearTimeout(timer); clearMarks(); const w = sortNow();
    say(`Kartu diurutkan dari kecil ke besar: <b>${cards.map(c => c.v).join(', ')}</b>.`);
    return w;
  });
  $('#cardMed').addEventListener('click', () => {
    clearTimeout(timer); clearMarks();
    const w = sortNow();
    timer = setTimeout(() => {
      const n = cards.length, vs = cards.map(c => c.v);
      if (n % 2) {
        const i = (n - 1) / 2; cards[i].el.classList.add('mid');
        say(`Setelah diurutkan: ${vs.join(', ')}.<br>Banyak kartu <b>${n}</b> (ganjil), jadi median adalah kartu ke-${i + 1} di tengah.<br>Median = <b>${vs[i]}</b>`);
      } else {
        const i = n / 2; cards[i - 1].el.classList.add('mid'); cards[i].el.classList.add('mid');
        say(`Setelah diurutkan: ${vs.join(', ')}.<br>Banyak kartu <b>${n}</b> (genap), jadi ambil dua kartu tengah (ke-${i} dan ke-${i + 1}).<br>Median = (${vs[i - 1]} + ${vs[i]}) ÷ 2 = <b>${fmt((vs[i - 1] + vs[i]) / 2)}</b>`);
      }
    }, w);
  });
  $('#cardMode').addEventListener('click', () => {
    clearTimeout(timer); clearMarks();
    const w = sortNow();
    timer = setTimeout(() => {
      const fr = {}; cards.forEach(c => (fr[c.v] = (fr[c.v] || 0) + 1));
      const m = modusOf(fr), vs = cards.map(c => c.v);
      if (m.none) say(`Data: ${vs.join(', ')}.<br>Semua nilai muncul sama banyak (${m.max} kali), jadi <b>tidak ada modus</b>.`);
      else {
        cards.forEach(c => c.el.classList.toggle('mod', m.list.includes(c.v)));
        say(`Data: ${vs.join(', ')}.<br>Kartu yang kembar dikelompokkan, nilai yang paling banyak adalah <b>${m.list.join(' dan ')}</b> (${m.max} kartu).<br>Modus = <b>${m.list.join(' dan ')}</b>${m.list.length > 1 ? ' (ada ' + m.list.length + ' modus)' : ''}`);
      }
    }, w);
  });
  $('#cardMean').addEventListener('click', () => {
    clearTimeout(timer); clearMarks();
    const vs = cards.map(c => c.v), n = vs.length, sum = vs.reduce((a, b) => a + b, 0), mean = sum / n;
    say(`Jumlah = ${vs.join(' + ')} = <b>${sum}</b><br>Banyak kartu = <b>${n}</b><br>Mean = ${sum} ÷ ${n} = <b>${fmt(mean)}</b>`);
    $('#meanBars').innerHTML = vs.map(v => `<div class="bar1" style="height:${v * 10}%"><span>${v}</span></div>`).join('') + `<div class="meanline" style="bottom:${mean * 10}%"><span>mean ${fmt(mean)}</span></div>`;
    mw.hidden = false;
  });
  deal();
  return {};
})();

/* =========================================================
   3. SOAL INDIVIDU – 10 SOAL (jawaban benar selalu di o[0], urutan diacak saat tampil)
   ========================================================= */
const QZ = [
  { q: 'Data nilai ulangan lima siswa: 6, 8, 7, 9, 5. Mean (rata-rata) data tersebut adalah …', o: ['7', '6', '8', '35'], why: 'Jumlah = 6 + 8 + 7 + 9 + 5 = 35. Mean = 35 ÷ 5 = 7.' },
  { q: 'Median dari data 9, 4, 7, 2, 5 adalah …', o: ['5', '7', '4', '5,4'], why: 'Urutkan dulu: 2, 4, 5, 7, 9. Karena banyak data 5 (ganjil), median adalah data di tengah, yaitu 5.' },
  { q: 'Modus dari data 3, 5, 4, 5, 2, 5, 4 adalah …', o: ['5', '4', '3', '2'], why: 'Angka 5 muncul 3 kali, angka 4 muncul 2 kali, angka lain 1 kali. Yang paling sering muncul adalah 5.' },
  { q: 'Median dari data 12, 15, 10, 18, 20, 16 adalah …', o: ['15,5', '15', '16', '16,5'], why: 'Urutkan: 10, 12, 15, 16, 18, 20. Banyak data 6 (genap), jadi median = (15 + 16) ÷ 2 = 15,5.' },
  { q: 'Rata-rata nilai 4 ulangan Sinta adalah 75. Agar rata-rata 5 ulangan menjadi 78, nilai ulangan kelima Sinta harus …', o: ['90', '78', '85', '80'], why: 'Jumlah 4 nilai = 4 × 75 = 300. Jumlah 5 nilai harus 5 × 78 = 390. Nilai kelima = 390 − 300 = 90.' },
  { q: 'Tabel nilai: nilai 6 (3 siswa), nilai 7 (4 siswa), nilai 8 (2 siswa), nilai 9 (1 siswa). Mean nilai tersebut adalah …', o: ['7,1', '7,5', '7', '7,4'], why: 'Jumlah = 6×3 + 7×4 + 8×2 + 9×1 = 18 + 28 + 16 + 9 = 71. Banyak siswa = 10. Mean = 71 ÷ 10 = 7,1.' },
  { q: 'Pemilik toko sepatu ingin mengetahui ukuran sepatu yang paling laku agar stoknya paling banyak. Ukuran pemusatan yang paling tepat dipakai adalah …', o: ['Modus', 'Mean', 'Median', 'Mean dan median'], why: 'Yang dicari adalah ukuran yang paling banyak dibeli (paling sering muncul), yaitu modus.' },
  { q: 'Data: 5, 6, 6, 7, 56. Pernyataan yang benar tentang data tersebut adalah …', o: ['Median (6) lebih mewakili data daripada mean (16)', 'Mean (16) lebih mewakili data daripada median (6)', 'Modusnya 56 karena nilai terbesar', 'Mean dan mediannya sama-sama 16'], why: 'Mean = 80 ÷ 5 = 16 terdorong naik oleh nilai 56. Median = 6 dan hampir semua data berada di sekitar 6, jadi median lebih mewakili. Modus adalah 6, bukan 56.' },
  { q: 'Modus dari data 2, 3, 3, 4, 4, 5, 6 adalah …', o: ['3 dan 4', '3', '4', 'Tidak ada modus'], why: 'Angka 3 dan angka 4 sama-sama muncul 2 kali, paling banyak. Jadi data ini memiliki dua modus: 3 dan 4.' },
  { q: 'Rata-rata nilai 9 siswa putra adalah 80 dan rata-rata nilai 6 siswa putri adalah 90. Rata-rata nilai seluruh siswa adalah …', o: ['84', '85', '83', '86'], why: 'Jumlah = 9 × 80 + 6 × 90 = 720 + 540 = 1.260. Banyak siswa = 15. Mean = 1.260 ÷ 15 = 84.' }
];
const Quiz = (() => {
  const form = $('#quizForm'), L = 'ABCD', btn = $('#qSend');
  let items = [], payload = null, sending = false;
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const k = Math.floor(Math.random() * (i + 1)); [a[i], a[k]] = [a[k], a[i]]; } return a; };
  function build() {
    items = QZ.map(z => ({ ...z, opts: shuffle(z.o.map((t, i) => ({ t, ok: i === 0 }))) }));
    form.innerHTML = items.map((z, i) => `<fieldset class="q" id="q${i}"><legend>Soal ${i + 1}</legend><p style="margin:0 0 6px"><b>${z.q}</b></p>${z.opts.map((o, j) => `<label><input type="radio" name="q${i}" value="${j}"> <span>${L[j]}. ${o.t}</span></label>`).join('')}<div class="why" hidden></div></fieldset>`).join('');
    $('#qResult').hidden = true; $('#qWarn').hidden = true; $('#qStatus').textContent = ''; payload = null;
  }
  const warn = t => { const w = $('#qWarn'); w.hidden = false; w.textContent = t; };
  function grade() {
    const name = $('#qName').value.trim(), kelas = $('#qKelas').value.trim();
    if (!name) { warn('Isi nama dulu sebelum mengirim.'); $('#qName').focus(); return null; }
    const ans = items.map((z, i) => { const c = form.querySelector(`input[name=q${i}]:checked`); return c ? +c.value : -1; });
    const miss = ans.map((v, i) => (v < 0 ? i + 1 : 0)).filter(Boolean);
    items.forEach((z, i) => $('#q' + i).classList.toggle('miss', ans[i] < 0));
    if (miss.length) { warn(`Masih ada ${miss.length} soal yang belum dijawab (nomor ${miss.join(', ')}).`); $('#q' + (miss[0] - 1)).scrollIntoView({ block: 'center' }); return null; }
    $('#qWarn').hidden = true;
    let right = 0; const det = [], sk = [];
    items.forEach((z, i) => {
      const ok = z.opts[ans[i]].ok; if (ok) right++; det.push((i + 1) + (ok ? ':benar' : ':salah')); sk.push(ok ? 1 : 0);
      const f = $('#q' + i); f.classList.remove('miss');
      $$('input', f).forEach(x => (x.disabled = true));
    });
    $('#qName').disabled = $('#qKelas').disabled = true;
    const score = right * 10, tuntas = score >= 80;
    return { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8), waktu: new Date().toLocaleString('id-ID'), nama: name, kelas, nilai: score, benar: right, status: tuntas ? 'Tuntas' : 'Belum tuntas', detail: det.join(', '), skor: sk };
  }
  async function post(url, body, noCors) {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 20000);
    try { return await fetch(url, { method: 'POST', mode: noCors ? 'no-cors' : 'cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body, signal: ctl.signal }); }
    finally { clearTimeout(t); }
  }
  async function send() {
    if (sending) return;
    if (!payload) { payload = grade(); if (!payload) return; $('#qStatus').scrollIntoView({ behavior: REDUCE ? 'auto' : 'smooth', block: 'center' }); }
    const st = $('#qStatus'); st.className = 'note';
    sending = true; btn.disabled = true; btn.textContent = 'Mengirim…'; st.textContent = '';
    const fail = m => { sending = false; btn.disabled = false; btn.textContent = 'Kirim ulang ke Guru'; st.className = 'err-msg'; st.textContent = m; };
    const url = (window.SHEET_URL || '').trim();
    if (!url) return fail('Jawaban belum bisa dikirim. Beri tahu gurumu.');
    const body = JSON.stringify(payload);
    try {                                              // 1) kirim dan baca balasan Google
      const r = await post(url, body, false), j = await r.json();
      if (!j.ok) return fail('Jawaban belum bisa dikirim. Tunjukkan layar ini kepada gurumu.');
    } catch (e1) {                                     // 2) balasan tidak terbaca: kirim ulang tanpa konfirmasi (ID yang sama, tidak membuat baris ganda)
      try { await post(url, body, true); } catch (e2) { return fail('Jawaban belum terkirim. Periksa koneksi internet, lalu tekan Kirim ulang.'); }
    }
    btn.hidden = true;
    st.className = 'ok-msg'; st.textContent = 'Jawaban sudah terkirim ke guru.';
  }
  btn.addEventListener('click', send);
  form.addEventListener('submit', e => e.preventDefault());
  build();
})();

route();
