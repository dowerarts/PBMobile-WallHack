# pbq — pbmobile assist (userscript)

Assist untuk [pbmobile.app](https://pbmobile.app) yang dibungkus sebagai **userscript**
(Violentmonkey / Tampermonkey) — jadi tidak perlu buka console setiap main.

Isi utamanya: **box ESP musuh**, **aimbot auto headshot** dengan target lock, **no recoil**,
radar kecil, dan panel in-game untuk saklar fitur. Semua aksinya lewat input asli
(mouse/touch), bukan menambal fungsi game.

- Versi: **4.2**
- Build: `pbq.user.js` · sha256 `480f75768c5d85fb60b69723b417251bed3f2c0b0fc7f5dd54d440a8ba4ee960`
- Status verifikasi: `run10.py` **124/124 PASS** (2 build + konteks HP), headshot **12/12** di tes

---

## Fitur

| Fitur | Keterangan |
|---|---|
| **Box ESP** | Satu kotak per musuh, tembus tembok. Warna: hijau = target terkunci, merah = musuh terlihat, oranye redup = di balik tembok (tidak akan ditembak). |
| **Auto headshot** | Titik bidik = **tengah hitbox kepala** (`Head` ↔ `Bone_HeadGearAttach`, radius 0.11 — definisi client sendiri), dihitung per musuh setiap frame. |
| **Auto lock** | Musuh terdekat yang **terlihat** (LOS bersih) dalam 40° langsung dikunci. |
| **Snap saat menembak** | Kamera langsung menuju kepala begitu tombol tembak ditekan (bisa sampai 180°). |
| **No recoil** | Kamera ditahan di "garis bidik" selama menembak — peluru tidak naik. |
| **Pilih target** | Mode target: DEKAT / CROSS / JAUH, plus tombol **X** untuk ganti target manual. |
| **Lengket (sticky)** | Setelah terkunci, target dipertahankan sampai sudut yang bisa diatur (slider 10–180°). |
| **Jeda menunduk** | Tahan **Control** (crouch) → lock istirahat (kamera tidak ditarik, tidak menembak). Berdiri → lock kembali otomatis. |
| **Deteksi mayat** | Kotak & lock hilang begitu musuh rebah, kembali saat respawn. |
| **Filter tim** | Teammate tidak pernah dikotak/dikunci (dibaca dari texture band model; kalau sinyal tim tidak terbaca, kotak ditampilkan untuk semua). |
| **Radar + dot** | Radar DOM kecil di kiri bawah (posisi musuh relatif arah pandang) dan dot 5 px di tengah layar. |
| **Panel in-game** | 3 saklar + 1 slider, bisa di-drag, **F8** untuk sembunyikan. |

### Yang TIDAK bisa (dan alasannya)

Ini batasan arsitektur client, bukan setelan yang lupa dibuat:

- **Tembus tembok (wallbang)** — client raycast ke dunia dulu (`Xt()` @167544), peluru berhenti di tembok.
- **Peluru tidak habis** — ammo ada di `Fe.inv[slot].ammo` di dalam closure bundle; tidak bisa ditulis dari luar, dan server memvalidasi tembakan.
- **Terbang / speed / god mode** — posisi pemain (`Fe.s.mover.pos`) juga closure + server mengecek `voo` / `posicao invalida`.
- **Aim menembus tembok** — sengaja dimatikan: target di balik tembok tidak pernah dikunci/ditembak (LOS wajib).

---

## Persyaratan

- Akun pbmobile (guest juga bisa, kalau perangkat/jaringan tidak diblokir).
- **Violentmonkey** (gratis, open source) atau Tampermonkey.
- Browser yang mendukung userscript:
  - Desktop: Chrome / Edge / Firefox / Brave
  - Android: **Firefox for Android** (add-on Violentmonkey), **Kiwi Browser** atau **Lemur** (ekstensi Chrome)
  - iOS: app **Userscripts** (Safari) atau browser Orion

> Tampermonkey di HP/iOS berbayar. Violentmonkey gratis dan jalan di semua tempat di atas.

---

## Instalasi via Violentmonkey

### 1. Pasang Violentmonkey

| Platform | Langkah |
|---|---|
| Chrome / Edge / Brave | Buka Chrome Web Store → cari **Violentmonkey** → *Add to Chrome* |
| Firefox (desktop & Android) | Buka addons.mozilla.org → **Violentmonkey** → *Add to Firefox* |
| Kiwi / Lemur (Android) | Buka Chrome Web Store di browser itu → **Violentmonkey** |

**Chrome 138+ / Edge baru:** setelah ekstensi terpasang, buka `chrome://extensions` →
*Developer mode* ON → di kartu Violentmonkey aktifkan **Allow User Scripts**.
Kalau toggle ini mati, semua userscript **tidak akan jalan** (tanpa pesan error).

### 2. Pasang script — cara A (paling gampang, dari URL)

Setelah `pbq.user.js` ada di repo GitHub kamu:

1. Buka file `pbq.user.js` di GitHub → klik **Raw**.
2. Copy URL-nya (bentuknya seperti
   `https://raw.githubusercontent.com/<USER>/<REPO>/main/pbq.user.js`).
3. Buka URL itu di browser yang sudah ada Violentmonkey-nya.
   Violentmonkey akan menampilkan halaman **Install** → klik **Install**.

> Kalau halaman hanya menampilkan kode mentah (bukan layar install), klik ikon
> Violentmonkey → **+** (New) → tempel URL tadi di kolom *Install from URL*.

### 3. Pasang script — cara B (paste manual)

1. Klik ikon Violentmonkey → **Dashboard** → **+** → **New**.
2. Hapus isi contoh, lalu **paste seluruh isi `pbq.user.js`** (termasuk blok `// ==UserScript==`).
3. **Ctrl+S** / *Save*. Pastikan statusnya aktif.

### 4. Buka game

| Device | URL |
|---|---|
| PC | `https://pbmobile.app/jogo?test=1` |
| HP | `https://pbmobile.app/jogo` |

`?test=1` **wajib di PC**: client hanya membaca mouse-look kalau ada parameter itu
(`let mt = d.has("test")` di bundle). Tanpa `?test=1`, wallhack tetap jalan tapi aimbot diam.

Kalau panel tidak muncul sama sekali, baca bagian [Troubleshooting](#troubleshooting).

---

## Cara pakai

### Panel (default muncul di kiri atas)

| Kontrol | Fungsi |
|---|---|
| **Kotak** | Box ESP on/off |
| **Aim** | Aimbot on/off |
| **Auto tembak** | Auto-fire saat target terkunci (default **OFF**) |
| **Lengket °** | Seberapa "lengket" lock: 10° = gampang lepas, 180° = nempel sekali |

Panel bisa digeser (tahan judulnya) dan disembunyikan dengan **F8** / Insert.

### Hotkey

| Tombol | Fungsi |
|---|---|
| `F1` | Kotak ESP on/off |
| `F2` | Aimbot on/off |
| `F3` | Auto tembak on/off |
| `F4` | Master on/off |
| `F8` / `Insert` | Panel on/off |
| `X` | Ganti target manual (urut jarak, snap ke kepala) |
| Tahan `E` | Rage lock (cone lebar, tanpa delay) |
| Tahan `Control` | Jeda lock (crouch) |

### Status di panel

Baris status menampilkan: `input` (mouse/sentuh) · `kRad` · `cal` · `pSign` · tim · jumlah musuh · lock.

- `kRad > 0` dan `cal 2` = input terbaca, aimbot aktif.
- `kRad 0` = kamera tidak merespon input sintetis (di PC: berarti belum pakai `?test=1`).

---

## Konfigurasi (opsional, dari console)

Semua bisa diubah live tanpa reload: `qz.cfg.<nama> = nilai`.

| Key | Default | Arti |
|---|---|---|
| `boxes` | `true` | Box ESP |
| `aim` | `true` | Aimbot |
| `trigger` | `false` | Auto-fire |
| `autoLockFov` | `40` | Sudut mencari musuh (derajat) |
| `stickyFov` | `35` | Sudut menahan target terkunci (slider panel) |
| `smooth` | `0.5` | Kecepatan aim (0.5 = 50% error per frame) |
| `maxStep` | `12` | Batas derajat per frame |
| `deadzone` | `0.25` | Koreksi lebih kecil dari ini diabaikan (anti getar) |
| `fireDeadzone` | `0.25` | Deadzone saat menembak |
| `fireTol` | `0.4` | Error maksimum sebelum pelatuk ditarik (derajat) |
| `headUp` | `0.15` | Offset cadangan kalau model tidak punya bone top kepala |
| `targetMode` | `'near'` | `'near'` / `'crosshair'` / `'far'` |
| `cycleKey` | `'KeyX'` | Tombol ganti target |
| `range` | `260` | Jarak maksimum target (meter) |
| `losFire` | `true` | Wajib `true`: tidak menembak kalau ada tembok |
| `chamRange` | `200` | Jarak maksimum menggambar kotak |

Helper:

```js
qz.state                       // status mentah (kRad, cal, target, paused, dll)
qz.info()                      // per musuh: posisi, tim, dead, headY, drawn
qz.drop()                      // lepas lock sekarang
qz.recal()                     // ukur ulang sensitivitas + arah pitch (setelah ubah sens)
qz.newid()                     // reroll device id (kalau kena device ban)
qz.test()                      // reload ke ?test=1
qz.useTouch(true)              // paksa driver sentuh (HP yang tidak mendeteksi touch)
qz.ui.hide() / qz.ui.show()    // panel
```

---

## Troubleshooting

| Gejala | Penyebab & solusi |
|---|---|
| Panel tidak muncul | Violentmonkey tidak jalan di domain itu. Cek: `chrome://extensions` → **Allow User Scripts** ON, lalu reload. Di console: `typeof qz` harus `"object"`. |
| `kRad 0`, aim tidak jalan (PC) | Belum pakai `?test=1`. Buka `https://pbmobile.app/jogo?test=1`, atau jalankan `qz.test()`. |
| `kRad 0` (HP) | Browser menolak sentuhan sintetis. Jalankan `qz.useTouch(true)` lalu reload. Kotak/ESP tetap jalan. |
| Login: *"hack detectado neste aparelho"* | Device id di-banned. Jalankan `qz.newid()` (atau hapus `pbq_id` di localStorage) lalu reload. |
| Login: *"hack detectado nesta rede"* | **Jaringan/IP** yang di-flag server, bukan device/akun. Ganti jaringan (hotspot HP / VPN / wifi lain), baru login lagi. Jangan menekan *Masuk* berulang di jaringan yang masih kena. |
| Mau tahu blokirnya nempel di mana | Paste `diag.js` di console `https://pbmobile.app` — hasilnya ada baris **VERDICT** (DEVICE / FP / NETWORK). |
| Aim terasa meleset di jarak jauh | Kepala di 40–60 m cuma beberapa piksel. Batasi `qz.cfg.range = 80` supaya hanya menembak target dekat. |
| Peluru kena leher, bukan kepala | `qz.cfg.headUp = 0.18` (naikkan). Kalau lewat atas kepala: `0.10`. |

---

## Struktur repo

```
pbq.user.js          userscript siap install (versi 4.2)
pbq.js               payload inti (bisa juga di-paste ke console)
diag.js              cek blokir: device / fingerprint / network
unban.js             snippet console: hapus device id yang kena ban
build_userjs.py      builder: pbq.js -> pbq.user.js
build_mobile.py      builder: halaman pasang HP (mobile/install.html)
build_apk.sh         builder: APK wrapper Android (dist/qb.apk)
android/             source APK (WebView + injeksi script)
harness/             test harness + port scanner client (ac.js, run10.py)
README.txt           catatan teknis lengkap (bahasa Indonesia)
```

### Build & test

```bash
python3 build_userjs.py     # pbq.js -> pbq.user.js
python3 harness/run10.py    # 124 check: scanner AC, ESP, aim, recoil, LOS, HP, panel
```

Test harness memuat **port verbatim scanner client** (`harness/ac.js`, dari bundle @366800–372600):
setiap build harus menghasilkan `[]` (0 flag) plus satu kontrol positif (wallhack lama → `wall.boneco-ordem`).

---

## Changelog ringkas

- **4.2** — titik bidik = tengah hitbox kepala (`Head` ↔ `Bone_HeadGearAttach`), bukan offset tetap.
- **4.1** — `fireTol` 0.4°, `fireDeadzone` 0.25° (presisi headshot).
- **4.0** — target tidak bisa dicuri crosshair selama burst.
- **3.9** — aimbot disederhanakan: satu jalur pilih target, snap hanya untuk perubahan < 20°.
- **3.4** — panel bisa disembunyikan; **3.3** target mode + tombol X; **3.2** lengket 180° + jeda menunduk.
- **2.6** — wallbang dihapus (terbukti tidak mungkin: client raycast dunia).
- **2.0+** — no recoil mode "kunci garis bidik", dev/FP identity manager.

---

## Catatan

- Gunakan dengan risiko sendiri. Semua pembatasan di atas diturunkan dari pembacaan
  `bundle.js` (hash `bf4fec64…`, v=202610242100) — bukan asumsi.
- Jangan spam login/daftar akun dari satu jaringan: server punya flag tingkat jaringan dan
  efeknya ke semua login dari IP itu.
- Proyek ini tidak berafiliasi dengan pbmobile.
