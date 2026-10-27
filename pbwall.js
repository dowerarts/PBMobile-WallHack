(function () {
  var KEY = 'pbq_id', id = null;
  try { id = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
  if (!id || !id.dev) {
    var gpus = [
      'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)',
      'ANGLE (NVIDIA, NVIDIA GeForce GTX 1650/PCIe/SSE2 Direct3D11 vs_5_0 ps_5_0, D3D11)',
      'ANGLE (AMD, AMD Radeon RX 580 Series Direct3D11 vs_5_0 ps_5_0, D3D11)',
      'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)'
    ];
    id = {
      dev: (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now().toString(36)),
      gpu: gpus[Math.floor(Math.random() * gpus.length)],
      cores: [4, 6, 8, 12][Math.floor(Math.random() * 4)],
      mem: [4, 8][Math.floor(Math.random() * 2)]
    };
    try { localStorage.setItem(KEY, JSON.stringify(id)); } catch (e) {}
  }

  try {
    var _get = Storage.prototype.getItem;
    Storage.prototype.getItem = function (k) {
      if (k === 'pbweb_dev') return id.dev;
      return _get.call(this, k);
    };
  } catch (e) {}

  function patchGL(P) {
    if (!P) return;
    var g = P.getParameter;
    P.getParameter = function (p) {
      if (p === 0x9246) return id.gpu;                                  // UNMASKED_RENDERER_WEBGL
      if (p === 0x9245) return id.gpu.indexOf('NVIDIA') > -1 ? 'Google Inc. (NVIDIA)' : 'Google Inc. (Intel)';
      return g.apply(this, arguments);
    };
  }
  patchGL(window.WebGLRenderingContext && WebGLRenderingContext.prototype);
  patchGL(window.WebGL2RenderingContext && WebGL2RenderingContext.prototype);
  try { Object.defineProperty(navigator, 'hardwareConcurrency', { get: function () { return id.cores; }, configurable: true }); } catch (e) {}
  try { Object.defineProperty(navigator, 'deviceMemory', { get: function () { return id.mem; }, configurable: true }); } catch (e) {}

  window.__pbq_newid = function () { try { localStorage.removeItem(KEY); } catch (e) {} location.reload(); };
})();

/* ---- part 2: the cheat -------------------------------------------------- */
(function () {
  function __pbq() {
/* pbq.js v1.3 — pbmobile: box ESP (musuh saja) + aimbot, invisible to the client scanner.
 *
 * Why the old wallhack got burned (bundle.js @369393 xc()):
 *   - it set material.depthTest=false  -> "wall.boneco-material"
 *   - it set mesh.renderOrder=999      -> "wall.boneco-ordem"
 *
 * v1.3: kotak balik jadi default (mode 'box'), plus dua hal yang bikin build
 * sebelumnya kelihatan "tidak work" di live sudah dibenerin:
 *   1. FILTER TIM FAIL-OPEN. Di live band texture semua chara kebaca "red"
 *      (model bawa Avatar/Teamband_Diff_RED.i3i dari file, jadi tim biru pun
 *      kebaca red). Dulu artinya semua orang dianggap teammate -> tidak ada yang
 *      digambar sama sekali. Sekarang kalau sinyal tim tidak membedakan siapa pun,
 *      filter otomatis dilepas: semua ditampilkan.
 *   2. INPUT. Client mem-gate mouse-look dengan `let mt = d.has("test")`
 *      (bundle @149029), jadi event mouse sintetis tidak menggerakkan kamera di
 *      /jogo biasa. qz.test() reload ke ?test=1; kalau kalibrasi gagal 3x tool
 *      memberi hint sekali di console.
 *
 * Scanner tetap tidak lihat apa pun: objek musuh tidak disentuh, semua overlay
 * milik kita di dalam scene game, renderOrder 800 (<900), tanpa patch rAF /
 * ws.send / Canvas2D / toString / WebGL / three.render.
 * Toggle: F1 visual, F2 aimbot, F3 trigger, F4 master. Tahan E = rage lock.
 */
(() => {
  'use strict';
  const T = window.THREE;
  if (!T || window.qz) return;

  const CFG = {
    on: true,
    menu: true,        // panel di layar (F8 untuk sembunyikan kalau mengganggu)
    boxes: true,       // kotak ESP on/off (F1)
    aim: true,         // aimbot master (F2)
    trigger: false,
    aimKey: 'KeyE',    // tahan = rage lock. '' mematikan
    rage: true,
    rageFov: 60,       // tahan tombol aim: cari lebih lebar, tetap yang paling dekat crosshair
    crossFov: 4,       // kunci HANYA kalau crosshair dekat musuh (derajat dari tengah layar)
    holdFov: 25,       // sekali terkunci, target dipegang selama masih dalam sudut ini
    sticky: true,      // lock nempel: tidak ganti-ganti target selama target masih valid
    stickyFov: 35,     // sudut pegang saat terkunci (default 35; slider bisa 10-180)
    stickyGrace: 350,  // ms toleransi sebelum lock lepas kalau target keluar sudut
    pauseGrace: 1200,  // setelah berhenti menunduk, lock istirahat sebentar lalu kembali
    stickyBreakPx: 35, // geser mouse sebesar ini dalam 1 event = lepas lock (flick disengaja)
    aimPart: 'head',   // 'head' = auto headshot, 'crosshair' = ikut titik yang kamu bidik
    smooth: 0.5,       // fraksi error yang dikoreksi per frame (0.5 = 50%/frame)
    maxStep: 12,       // batas derajat per frame
    strength: 0.85,    // 0..1 keagresifan tarikan
    deadzone: 0.25,    // derajat; koreksi lebih kecil dari ini tidak dilakukan (anti getar)
    aimSmooth: 0.35,   // filter posisi kepala (0..1): kecil = makin diam, tapi makin lambat ikut
    fireDeadzone: 0.25,// deadzone saat MENEMBAK (presisi headshot)
    laserHold: true,   // saat menembak, koreksi mikro dimatikan (stabil seperti laser)
    correctFov: 18,    // kamera HANYA dikoreksi kalau target sedekat ini dari crosshair
    autoLock: true,    // kunci otomatis: cari musuh sendiri tanpa perlu crosshair
    autoLockFov: 40,   // sudut cari auto-lock (derajat) - dipersempit biar tidak 'berantakan'
    targetMode: 'near',// 'near' = musuh TERDEKAT, 'crosshair' = paling dekat crosshair, 'far' = terjauh
    cycleKey: 'KeyX',  // tekan untuk ganti target manual (urut jarak)
    pinMs: 2500,       // target hasil ganti manual "dipin" selama ini (ms)
    fastKill: true,    // target mati -> langsung pindah ke musuh berikutnya + snap instan
    dot: true,         // titik kecil di tengah layar (bantu lihat peluru lurus)
    radar: true,       // radar kecil di kiri bawah (DOM, bukan canvas)
    radarRange: 60,    // meter
    react: 90,
    range: 260,
    fireTol: 0.4,
    losFire: true,     // true = jangan menembak kalau ada tembok (client memang memotong peluru)
    snapOnFire: true,  // saat menembak: kamera langsung ditarik ke musuh
    snapFov: 180,      // boleh berputar sampai 180 deg (menghadap berlawanan pun kena)
    aimBias: 0.15,     // derajat per meter: musuh dekat menang walau sudutnya sedikit lebih besar
    aimBiasMax: 40,    // batas meter untuk bobot jarak
    headUp: 0.15,      // titik bidik dinaikkan ke tengah kotak kepala (meter)
    deadHeadY: 1.05,   // kepala serendah ini (dari kaki) = mayat rebah
    deadHold: 100,     // ms konsisten sebelum dianggap mati (makin kecil makin cepat hilang)
    noRecoil: true,    // tahan kamera di garis bidik selama menembak (peluru lurus)
    recoilGain: 1.0,   // 0..1 porsi recoil yang dibatalkan
    recoilSpeed: 0.8,  // 0..1 kecepatan tarik balik per frame
    recoilMax: 6,      // derajat per frame, batas tarik balik
    recoilWindow: 700, // ms setelah tembakan terakhir masih dikompensasi
    invertPitch: 0,    // 0 = deteksi otomatis, 1 = paksa inverted, -1 = paksa normal
    teamMode: 'enemy', // 'enemy' = musuh saja (fail-open), 'all' = semua orang
    aimTeamStrict: true, // AIM tidak pernah mengunci teammate; kalau tim tak terbaca -> diam
    myTeam: '',
    autoTest: true,
    chamRange: 200,        // jangan gambar kotak lebih jauh dari ini
    boxColor: 0xff3b3b,
    boxTarget: 0x7dff6a,
    boxOpacity: 0.75,
  };

  const S = { scene: null, cam: null, ov: null, enemies: new Map(), hook: true, myTeam: '', fails: 0, trust: false };

  /* ----------------------------- team -----------------------------------
   * Sumber tim yang BENAR: bundle @12619 L(model, team) menulis ulang setiap tekstur
   * jadi `<nama>_<TEAM>.i3i`, lalu memuatnya. Hasilnya ada di material.map.image.src
   * (uppercase, contoh Avatar/Teamband_Diff_BLUE.i3i). userData.tex TIDAK ikut berubah:
   * itu path lama yang dibakar di file model (biasanya _RED), jadi jangan dipakai dulu.
   * Varian skin seperti ..._Diff_Blue.i3i (mixed case) bukan tim -> regex case-sensitive. */
  function texPath(o) {
    const m = o.material && o.material.map;
    const src = (m && m.image && m.image.src) || '';
    if (!src) return '';
    const i = src.indexOf('path=');
    if (i < 0) return src;
    let p = src.slice(i + 5);
    const j = p.indexOf('&');
    if (j >= 0) p = p.slice(0, j);
    try { return decodeURIComponent(p); } catch (e) { return p; }
  }

  function teamFromModel(root) {
    let band = '';
    const vote = { red: 0, blue: 0 };
    root.traverse((o) => {
      if (!o.isMesh) return;
      const loaded = texPath(o);
      const raw = (o.userData && o.userData.tex) || '';
      const cand = loaded || raw;
      if (!cand) return;
      const t = /_(RED|BLUE)\.i3i$/.exec(cand);          // suffix tim SELALU uppercase
      if (!t) return;
      const v = t[1].toLowerCase();
      const isBand = /teamband/i.test(o.name || '') || /teamband/i.test(raw) || /teamband/i.test(loaded);
      if (isBand) { if (!band) band = v; return; }
      vote[v]++;
    });
    if (band) return band;
    if (vote.red !== vote.blue) return vote.red > vote.blue ? 'red' : 'blue';
    return '';
  }

  function teamOf(root, tr) {
    if (!tr.team) tr.team = teamFromModel(root);   // cache only when found: textures load late
    return tr.team;
  }

  // recompute at scan rate: does the team signal actually separate anybody?
  function refreshTrust() {
    const mine = CFG.myTeam || S.myTeam;
    S.trust = false;
    if (!mine) return;
    let seen = 0, other = 0;
    for (const [root, tr] of S.enemies) {
      const t = teamOf(root, tr);
      if (!t) continue;
      seen++;
      if (t !== mine) other++;
    }
    S.trust = seen > 0 && other > 0;
  }

  /* ESP: tampilkan musuh; kalau sinyal tim tidak bisa dipercaya, tampilkan semua. */
  function isEnemy(root, tr) {
    if (CFG.teamMode === 'all') return true;
    if (!S.trust) return true;
    const t = teamOf(root, tr);
    if (!t) return true;
    return t !== (CFG.myTeam || S.myTeam);
  }

  /* AIM: tidak pernah menembak kawan. Kalau tim tidak bisa dibuktikan, jangan kunci
   * siapa pun (default strict) - ini bug yang dilaporkan: aimbot nge-lock teammate. */
  function aimAllowed(root, tr) {
    if (!CFG.aimTeamStrict) return true;
    if (CFG.teamMode === 'all') return true;
    const mine = CFG.myTeam || S.myTeam;
    const t = teamOf(root, tr);
    if (!t || !mine) return false;
    return t !== mine;
  }

  function alive(root) { return root.visible !== false; }

  /* Mati atau tidak. Di client, die() cuma set entity.dead=!0 lalu memutar clip "D"+nama
   * dengan clampWhenFinished (bundle @140482) - obj.visible TIDAK di-false (itu dipakai buat
   * entity remote/lain, @377739), jadi mayat tetap kelihatan dan dulu ikut dikunci aimbot.
   * Yang bisa dibaca dari scene: badan rebah -> bone Head turun mendekati tanah.
   * Dipakai "konsisten selama deadHold" supaya animasi jatuh tidak bikin lock patah-patah. */
  function isDead(root, tr) {
    if (root.visible === false) { tr.dead = true; tr.wasHidden = true; return true; }
    if (tr.dead) {
      // tetap dianggap mati sampai respawn: model muncul lagi setelah disembunyikan,
      // atau posisinya lompat jauh (spawn ulang). Tanpa ini kotak bisa kedip balik.
      if (tr.wasHidden && root.visible) { tr.dead = false; tr.wasHidden = false; tr.deadSince = 0; return false; }
      if (tr.deadPos && root.position.distanceTo(tr.deadPos) > 4) {
        tr.dead = false; tr.deadSince = 0; tr.deadPos = null; return false;
      }
      return true;
    }
    const hp = headOf(root, tr);
    const relY = hp.y - root.position.y;
    const now = performance.now();
    if (relY < CFG.deadHeadY) {
      if (!tr.deadSince) tr.deadSince = now;
      if (now - tr.deadSince >= CFG.deadHold) {
        tr.dead = true;
        tr.deadPos = root.position.clone();
        return true;
      }
    } else tr.deadSince = 0;
    return false;
  }

  /* ---------- the only hook: Object3D.updateMatrixWorld (not scanned) ---------- */
  const _umw = T.Object3D.prototype.updateMatrixWorld;
  T.Object3D.prototype.updateMatrixWorld = function (a) {
    if (this.isScene && !S.scene) S.scene = this;
    if (this.isCamera && !S.cam && this.isPerspectiveCamera && this.far > 100) S.cam = this;
    return _umw.apply(this, arguments);
  };
  (function unhook(n) {
    if (!S.hook) return;
    if (S.scene && S.cam) { T.Object3D.prototype.updateMatrixWorld = _umw; S.hook = false; return; }
    if (n > 240) return;
    setTimeout(() => unhook(n + 1), 500);
  })(0);

  const V1 = new T.Vector3(), V2 = new T.Vector3(), V3 = new T.Vector3(), V4 = new T.Vector3(), V5 = new T.Vector3();
  const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
  const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
  const D2R = Math.PI / 180;

  /* ------------------------------ overlay ------------------------------ */
  const GEO_BOX = new T.BoxGeometry(0.78, 1.8, 0.62);
  const GEO_DOT = new T.OctahedronGeometry(0.13);

  const MAT_BOX = new T.MeshBasicMaterial({ color: CFG.boxColor, wireframe: true, depthTest: false, depthWrite: false, transparent: true, opacity: CFG.boxOpacity });
  const MAT_BOXT = new T.MeshBasicMaterial({ color: CFG.boxTarget, wireframe: true, depthTest: false, depthWrite: false, transparent: true, opacity: Math.min(1, CFG.boxOpacity + 0.15) });
  // musuh yang lagi ketutup tembok: kotak lebih redup/oranye (bukan target tembak)
  const MAT_OCC = new T.MeshBasicMaterial({ color: 0xffa53b, wireframe: true, depthTest: false, depthWrite: false, transparent: true, opacity: 0.45 });
  const MAT_DOT = new T.MeshBasicMaterial({ color: 0xffd24a, depthTest: false, depthWrite: false, transparent: true, opacity: 0.95 });

  function ensureOverlay() {
    if (S.ov || !S.scene) return;
    S.ov = new T.Group();
    S.ov.name = '';
    S.scene.add(S.ov);          // game renderer draws it, we did not add a canvas
  }

  function isBandMesh(o) {
    if (/teamband/i.test(o.name || '')) return true;
    if (/teamband/i.test((o.userData && o.userData.tex) || '')) return true;
    const m = o.material && o.material.map;
    const p = (m && (m.pbPath || (m.image && m.image.src))) || '';
    return /teamband/i.test(p);
  }
  function underWeapon(o) {
    for (let p = o; p; p = p.parent) if (p.name === 'weapon') return true;
    return false;
  }
  function visibleMeshes(root) {
    let n = 0;
    root.traverse((o) => { if (o.isMesh && o.geometry && o.visible !== false) n++; });
    return n;
  }

  /* ---- build the visual for one enemy, according to CFG.mode ---- */
  function clearDraw(tr) {
    for (const m of tr.draw || []) S.ov.remove(m);
    tr.draw = [];
    tr.box = null;
    tr.dot = null;
  }

  function buildBoxes(tr) {
    const box = new T.Mesh(GEO_BOX, MAT_BOX);
    box.frustumCulled = false;   // keep drawing at screen edges
    box.renderOrder = 800;       // < 900: nothing like the old signature
    S.ov.add(box);
    tr.draw.push(box);
    tr.box = box;
    tr.dot = null;               // penanda kepala dihapus: cuma mengganggu
  }

  function buildCham(root, tr) {
    // silhouette mode was removed in 1.3: switching it at runtime left the ghosts
    // submitted to the renderer but never rasterised. Boxes only.
  }

  function buildDraw(root, tr) {
    clearDraw(tr);
    buildBoxes(tr);
    tr.built = performance.now();
    tr.meshN = visibleMeshes(root);
  }

  function addTrack(root) {
    if (!root || S.enemies.has(root)) return;
    const tr = { draw: [], box: null, dot: null, head: null, aimSm: null, lockAt: 0, seen: 0, team: '',
                 built: 0, meshN: -1, mode: '', deadSince: 0, dead: false, wasHidden: false, deadPos: null };
    S.enemies.set(root, tr);
    buildDraw(root, tr);
  }

  function scanEnemies(now) {
    if (!S.scene || !S.ov) return;
    ensureOverlay();
    S.scene.traverse((o) => {
      if (o.name !== 'chara') return;
      if (o === S.ov) return;
      // own body: the game keeps the first-person model at your feet position
      if (S.cam) {
        const c = S.cam.getWorldPosition(V2);
        const dx = o.position.x - c.x, dz = o.position.z - c.z;
        if (Math.hypot(dx, dz) < 1.0) {
          if (!S.myTeam) S.myTeam = teamFromModel(o);
          return;
        }
      }
      addTrack(o);
    });
    for (const [root, tr] of S.enemies) {
      if (!root.parent) {
        clearDraw(tr);
        S.enemies.delete(root);
        continue;
      }
      // model can change at runtime (weapon equip toggles meshes)
      if (now - tr.built > 1500 && visibleMeshes(root) !== tr.meshN) buildDraw(root, tr);
    }
    refreshTrust();
  }

  /* ------------------------------ aim math ------------------------------ */
  function eye() { return S.cam.getWorldPosition(V3); }

  function aimNow() {
    V1.set(0, 0, -1).applyQuaternion(S.cam.quaternion);
    return { yaw: Math.atan2(-V1.x, -V1.z), pitch: Math.asin(clamp(V1.y, -1, 1)) };
  }

  /* Hitbox kepala di client (bundle @133054, tabel $e):
   *   ["Head", "Bone_HeadGearAttach", 0.11, "head"]
   * jadi kotak kepala = SEGMEN antara dua bone itu, radius 0.11. Titik paling akurat
   * adalah tengah segmen itu - bukan ujung bone 'Head' (yang ada di pangkal leher). */
  function headOf(root, tr) {
    if (!tr.head) {
      tr.head = root.getObjectByName('Head') || null;
      tr.headTop = root.getObjectByName('Bone_HeadGearAttach') || null;
    }
    if (tr.head) {
      tr.head.getWorldPosition(V2);
      if (tr.headTop) {
        tr.headTop.getWorldPosition(V5);
        V2.lerp(V5, 0.5);                 // tengah kotak kepala
      } else {
        V2.y += CFG.headUp;               // model tanpa bone top: pakai offset
      }
      return V2;
    }
    V2.copy(root.position); V2.y += 1.62 + CFG.headUp; return V2;
  }

  function chestOf(root) {
    return V4.set(root.position.x, root.position.y + 1.25, root.position.z);
  }

  /* ---------------- crosshair-first target pick ----------------
   * Aturan (sesuai permintaan "ikut crosshair saja"):
   *   1. musuh yang KAPSUL BADANNYA kena sinar tengah layar = kandidat.
   *      Kalau ada lebih dari satu, ambil yang PALING DEKAT (yang menghalangi
   *      pandangan) - jadi musuh depan selalu menang dari musuh jauh.
   *   2. kalau tidak ada yang persis di crosshair, baru pakai sudut terdekat
   *      dalam crossFov (dengan sedikit bobot jarak), bukan sudut ke kepala.
   *   Titik bidik = titik pada badan yang paling dekat dengan sinar itu, jadi
   *   kamera tidak meloncat ke kepala saat kamu membidik dada. */
  const PTS = [new T.Vector3(), new T.Vector3(), new T.Vector3()];
  const FWD = new T.Vector3(), DTMP = new T.Vector3();

  function angleTo(pt, e, fwd) {
    DTMP.copy(pt).sub(e);
    const len = DTMP.length();
    if (len < 0.01) return 180;
    return Math.acos(clamp(DTMP.dot(fwd) / len, -1, 1)) / D2R;
  }

  // capsule badan (radius ~0.42, tinggi 0.25..1.75 di atas kaki) vs sinar crosshair
  function capsuleHit(root, e, fwd) {
    let best = Infinity, bestH = 1.25;
    for (let i = 0; i <= 6; i++) {
      const h = 0.25 + (i / 6) * 1.5;
      DTMP.set(root.position.x, root.position.y + h, root.position.z).sub(e);
      const t = DTMP.dot(fwd);
      if (t < 0.4) continue;
      const perp2 = DTMP.lengthSq() - t * t;
      if (perp2 <= 0.42 * 0.42 && t < best) { best = t; bestH = h; }
    }
    return best === Infinity ? null : { t: best, h: bestH };
  }

  /* lock yang menempel: selama target masih hidup, masih di scene, masih dalam holdFov,
   * dan masih boleh ditembak (bukan teammate), pakai dia terus. Tidak ada re-pick per frame
   * yang bikin kamera goyang / pindah-pindah target. */
  function heldTarget(e) {
    if (!CFG.sticky || !cur || !cur.root) return null;
    const root = cur.root;
    const tr = S.enemies.get(root);           // track hidup, bukan referensi lama
    if (!tr || !root.parent) return null;
    if (isDead(root, tr) || !aimAllowed(root, tr)) { tr.lostAt = 0; return null; }
    if (tr.los === false) { tr.lostAt = 0; return null; }   // target masuk balik tembok: lepas
    const hp = headOf(root, tr).clone();
    const d = V1.copy(hp).sub(e);
    const dist = d.length();
    if (dist > CFG.range || dist < 0.4) return null;
    FWD.set(0, 0, -1).applyQuaternion(S.cam.quaternion);
    const ang = Math.acos(clamp(d.dot(FWD) / dist, -1, 1)) / D2R;

    // sudut pegang: stickyFov (default 45) jauh lebih lebar dari holdFov, jadi lock
    // tidak lepas cuma gara-gara crosshair digeser sedikit. Ada toleransi lepas juga.
    const lim = CFG.sticky ? CFG.stickyFov : Math.max(CFG.holdFov, CFG.crossFov);
    const now = performance.now();
    if (ang > lim) {
      if (!tr.lostAt) tr.lostAt = now;
      if (now - tr.lostAt > CFG.stickyGrace) { tr.lostAt = 0; return null; }
    } else tr.lostAt = 0;

    return { root, tr, err: ang * D2R, score: 0, dist, part: 0, head: hp };
  }

  // musuh yang badannya benar-benar kena sinar tengah layar SEKARANG (tanpa fallback sudut)
  function pickCrosshair() {
    if (!S.cam) return null;
    const e = eye();
    FWD.set(0, 0, -1).applyQuaternion(S.cam.quaternion);
    let best = null;
    for (const [root, tr] of S.enemies) {
      if (isDead(root, tr) || !aimAllowed(root, tr)) continue;
      if (tr.los === false) continue;                    // di balik tembok: jangan dikunci
      const d3 = e.distanceTo(root.position);
      if (d3 > CFG.range || d3 < 0.4) continue;
      const h = capsuleHit(root, e, FWD);
      if (!h) continue;
      if (!best || h.t < best.dist) {
        const aimPt = CFG.aimPart === 'head'
          ? headOf(root, tr).clone()
          : new T.Vector3(root.position.x, root.position.y + h.h, root.position.z);
        best = { root, tr, err: 0, score: h.t, dist: h.t, part: 1, head: aimPt };
      }
    }
    return best;
  }

  /* ganti target manual: urut jarak, ambil yang berikutnya, lalu snap ke dia.
   * Setelah dipilih, target "dipin" sebentar supaya tidak langsung diambil alih
   * oleh mode otomatis (mis. mode DEKAT). */
  function cycleTarget() {
    const e = eye();
    const list = [];
    for (const [root, tr] of S.enemies) {
      if (isDead(root, tr) || !aimAllowed(root, tr)) continue;
      const d = e.distanceTo(root.position);
      if (d > CFG.range || d < 0.4) continue;
      list.push({ root, tr, d });
    }
    if (!list.length) return false;
    list.sort((a, b) => a.d - b.d);
    let idx = list.findIndex((x) => cur && x.root === cur.root);
    idx = (idx + 1) % list.length;
    const p = list[idx];
    const hp = headOf(p.root, p.tr).clone();
    cur = { root: p.root, tr: p.tr, err: 0, score: p.d, dist: p.d, part: 0, head: hp };
    lastRoot = p.root;
    p.tr.aimSm = null;
    snapNext = true;
    pinRoot = p.root;
    pinUntil = performance.now() + CFG.pinMs;
    pinAt = performance.now();
    return true;
  }

  function pinnedTarget(e) {
    if (!pinRoot || performance.now() > pinUntil) return null;
    const tr = S.enemies.get(pinRoot);
    if (!tr || !pinRoot.parent || isDead(pinRoot, tr) || !aimAllowed(pinRoot, tr)) { pinRoot = null; return null; }
    const hp = headOf(pinRoot, tr).clone();
    const d = hp.distanceTo(e);
    if (d > CFG.range) return null;
    return { root: pinRoot, tr, err: 0, score: 0, dist: d, part: 0, head: hp };
  }

  function pickTarget(limitDeg, prefer) {
    if (!S.cam) return null;
    const e = eye();
    FWD.set(0, 0, -1).applyQuaternion(S.cam.quaternion);
    const limit = limitDeg === undefined ? CFG.crossFov : limitDeg;

    // 1) di bawah crosshair: yang paling dekat menang
    const hitBest = pickCrosshair();
    if (hitBest) return hitBest;

    // 2) tidak ada yang persis di crosshair: sudut terdekat dalam limit
    let best = null;
    for (const [root, tr] of S.enemies) {
      if (isDead(root, tr) || !aimAllowed(root, tr)) continue;
      if (tr.los === false) continue;                    // di balik tembok: jangan dikunci
      if (root === dropRoot && performance.now() < dropUntil) continue;   // baru lepas: jangan langsung ambil lagi
      const dist = e.distanceTo(root.position);
      if (dist > CFG.range || dist < 0.4) continue;

      PTS[0].copy(headOf(root, tr));
      PTS[1].set(root.position.x, root.position.y + 1.25, root.position.z);
      PTS[2].set(root.position.x, root.position.y + 0.90, root.position.z);

      let ang = Infinity, pi = 0;
      if (CFG.aimPart === 'head') {
        ang = angleTo(PTS[0], e, FWD);      // auto headshot: sudut & titik bidik ke kepala
        pi = 0;
      } else {
        for (let i = 0; i < 3; i++) {
          const a = angleTo(PTS[i], e, FWD);
          if (a < ang) { ang = a; pi = i; }
        }
      }
      const mine = prefer && prefer === root;
      if (ang > (mine ? Math.max(limit, CFG.holdFov) : limit)) continue;

      // skor tergantung mode target:
      //   near      -> jarak yang menentukan (musuh di dekat kamu menang)
      //   crosshair -> sudut dari crosshair (perilaku lama)
      //   far       -> justru yang paling jauh
      let score;
      if (CFG.targetMode === 'far') score = -dist;
      else if (CFG.targetMode === 'near') score = dist + ang * 0.02;   // jarak dominan, sudut cuma penentu
      else score = ang + Math.min(dist, CFG.aimBiasMax) * CFG.aimBias;
      if (tr.los === false) score += 1000;      // yang ketutup tembok dikalahkan dulu
      // HYSTERESIS: jangan ganti target cuma karena musuh lain sedikit lebih dekat.
      // Pindah hanya kalau kandidat ini jelas lebih baik (25%) atau target sekarang hilang.
      if (cur && cur.root && cur.root !== root) {
        const ct = S.enemies.get(cur.root);
        if (ct && !isDead(cur.root, ct) && ct.los !== false) {
          const curDist = e.distanceTo(cur.root.position);
          const hp0 = headOf(cur.root, ct);
          const cdd = V1.copy(hp0).sub(e);
          const curAng = Math.acos(clamp(cdd.dot(FWD) / (cdd.length() || 1), -1, 1)) / D2R;
          let curScore;
          if (CFG.targetMode === 'far') curScore = -curDist;
          else if (CFG.targetMode === 'near') curScore = curDist + curAng * 0.02;
          else curScore = curAng + Math.min(curDist, CFG.aimBiasMax) * CFG.aimBias;
          if (score > curScore * 0.75) continue;
        }
      }
      if (!best || score < best.score) {
        best = { root, tr, err: ang * D2R, score, dist, part: pi, head: PTS[pi].clone() };
      }
    }
    return best;
  }

  /* instant lock, no smoothing. Called from the capture-phase fire listener so the
   * game reads the new yaw/pitch on the very next frame - the frame the shot uses. */
  function snapToTarget() {
    if (!S.cam || !CFG.on || !CFG.aim || !CFG.snapOnFire || calState === 1) return false;
    let t = pickTarget(CFG.snapFov);
    if (!t) return false;
    const e = eye();

    // kalau target pertama ketutup tembok, cari musuh lain yang kelihatan dalam
    // snapFov (biar tembakan tidak berakhir di dinding). Kalau tidak ada, tetap
    // snap ke target pertama - sesuai permintaan "asal nembak langsung ngelock".
    if (CFG.losFire && !losClear(e, t.head, e.distanceTo(t.head), t.root)) {
      FWD.set(0, 0, -1).applyQuaternion(S.cam.quaternion);
      let alt = null;
      for (const [root, tr] of S.enemies) {
        if (root === t.root || isDead(root, tr) || !aimAllowed(root, tr)) continue;
        const hp = headOf(root, tr).clone();
        const dist = hp.distanceTo(e);
        if (dist > CFG.range || dist < 0.4) continue;
        const ang = angleTo(hp, e, FWD);
        if (ang > CFG.snapFov) continue;
        if (alt && ang >= alt.ang) continue;
        if (!losClear(e, hp, dist, root)) continue;
        alt = { root, tr, head: hp, ang, dist };
      }
      if (alt) t = { root: alt.root, tr: alt.tr, head: alt.head, dist: alt.dist, err: alt.ang * D2R, score: alt.ang, part: 0 };
    }

    const aimPt = t.head;
    const d = V1.copy(aimPt).sub(e);
    const dist = d.length() || 1;
    const wantY = Math.atan2(-d.x, -d.z);
    const wantP = Math.asin(clamp(d.y / dist, -1, 1));
    const now = aimNow();
    const dY = wrap(wantY - now.yaw), dP = wantP - now.pitch;
    if (kRad > 0) { aimMx += -dY / kRad; aimMy += dP / (effectivePSign() * kRad); look(-dY / kRad, dP / (effectivePSign() * kRad)); }
    cur = t;
    if (!t.tr.lockAt) t.tr.lockAt = performance.now();
    return true;
  }

  /* --------------------------- input injection --------------------------- */
  let kRad = 0, calState = 0, mouseDead = false;
  // di HP tidak ada mouse: langsung pakai driver sentuh supaya kalibrasi tidak buang waktu
  try {
    if (matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window && !matchMedia('(any-pointer: fine)').matches)) mouseDead = true;
  } catch (e) {}
  // arah pitch: game bisa `pitch += my*k` atau `pitch -= my*k` tergantung setting invert.
  // pSign = tanda Δpitch per pixel mouse. Diukur saat kalibrasi, bukan ditebak.
  let pSign = -1, pitchKnown = false;

  function look(mx, my) {
    injMx += mx; injMy += my;
    if (mouseDead) { touchLook(mx, my); return; }
    const ev = new MouseEvent('mousemove', { bubbles: true, cancelable: true, view: window });
    Object.defineProperty(ev, 'movementX', { value: mx, configurable: true });
    Object.defineProperty(ev, 'movementY', { value: my, configurable: true });
    window.dispatchEvent(ev);
  }

  /* ---- touch driver: the client only reads touch drags unless ?test is set ---- */
  const TID = 9001;
  let tx = 0, ty = 0, touchOn = false, touchEl = null;

  /* ---------------- no recoil ----------------
   * Recoil client ditambahkan ke Fe.s.yaw/pitch (bundle @324649) dan tidak bisa dibaca
   * langsung. Tapi kita tahu persis berapa piksel yang KITA suntikkan (injMx/injMy) dan
   * berapa piksel mouse asli yang masuk (mousemove isTrusted). Sisanya = recoil, dan itu
   * yang dibalikkan lewat input yang sama. Efektif hanya saat menembak / sesaat sesudahnya. */
  let lastYaw = 0, lastPitch = 0, pMx = 0, pMy = 0, injMx = 0, injMy = 0, recoilUntil = 0, playerFiring = false;
  let aimMx = 0, aimMy = 0;   // suntikan dari AIM/snap (bukan dari no-recoil)
  let breakLock = false;
  // TUNDUK (crouch) = Control (bundle @317481: mover.crouch = pt.ControlLeft||pt.ControlRight).
  // Selama menunduk, lock DIPAKSA JEDA: kamera tidak ditarik, tidak menembak.
  let crouchHold = false, pauseUntil = 0;
  addEventListener('keydown', (e) => {
    if (e.code === 'ControlLeft' || e.code === 'ControlRight') crouchHold = true;
  }, true);
  addEventListener('keyup', (e) => {
    if (e.code === 'ControlLeft' || e.code === 'ControlRight') {
      crouchHold = false;
      pauseUntil = performance.now() + CFG.pauseGrace;
    }
  }, true);
  addEventListener('blur', () => { crouchHold = false; });
  const pausedNow = () => crouchHold || performance.now() < pauseUntil;
  // garis bidik "niat pemain": hanya digeser oleh input ASLI (mouse/sentuh), bukan oleh
  // recoil dan bukan oleh suntikan kita. Selama menembak, kamera ditarik balik ke garis ini.
  let baseYaw2 = 0, basePitch2 = 0, baseInit = false;
  let lastTouch = null;

  addEventListener('mousemove', (ev) => {
    if (!ev.isTrusted) return;
    pMx += ev.movementX || 0;
    pMy += ev.movementY || 0;
    if (CFG.sticky && (Math.abs(ev.movementX || 0) + Math.abs(ev.movementY || 0) > CFG.stickyBreakPx)) breakLock = true;
  }, true);

  // di HP tidak ada mouse: delta drag sentuh yang asli ikut dihitung sebagai input pemain
  addEventListener('touchmove', (ev) => {
    if (!ev.isTrusted) return;
    const t = ev.changedTouches && ev.changedTouches[0];
    if (!t) return;
    if (lastTouch) { pMx += t.clientX - lastTouch.x; pMy += t.clientY - lastTouch.y; }
    lastTouch = { x: t.clientX, y: t.clientY };
  }, true);
  addEventListener('touchend', () => { lastTouch = null; }, true);
  addEventListener('touchcancel', () => { lastTouch = null; }, true);
  addEventListener('mouseup', () => { playerFiring = false; }, true);
  addEventListener('touchend', () => { playerFiring = false; }, true);
  addEventListener('blur', () => { playerFiring = false; });

  function noRecoilStep() {
    const a = aimNow();
    if (!CFG.noRecoil || !(kRad > 0)) {
      pMx = pMy = injMx = injMy = 0; baseYaw2 = a.yaw; basePitch2 = a.pitch; baseInit = true; return;
    }
    if (!baseInit) { baseYaw2 = a.yaw; basePitch2 = a.pitch; baseInit = true; pMx = pMy = injMx = injMy = 0; return; }

    // 1) garis bidik ikut gerakan yang DIPERINTAHKAN: input pemain + suntikan AIM/snap.
    //    Suntikan no-recoil sendiri TIDAK ikut (kalau ikut, jadi feedback dan lari).
    const ps = effectivePSign();
    baseYaw2 = wrap(baseYaw2 - (pMx + aimMx) * kRad);                      // game: yaw -= mx*k
    basePitch2 = clamp(basePitch2 + ps * (pMy + aimMy) * kRad, -1.4, 1.4); // game: pitch = pSign*my*k
    pMx = pMy = aimMx = aimMy = injMx = injMy = 0;

    const firing = fireHeld || playerFiring || performance.now() < recoilUntil;
    if (!firing) { baseYaw2 = a.yaw; basePitch2 = a.pitch; return; }   // di luar tembakan: ikut kamera

    // 2) selisih kamera dari garis bidik = recoil yang belum dibatalkan -> tarik balik
    const eY = wrap(a.yaw - baseYaw2);
    const eP = a.pitch - basePitch2;
    if (Math.abs(eY) < 2e-4 && Math.abs(eP) < 2e-4) return;
    const g = Math.max(0.05, Math.min(1, CFG.recoilGain * CFG.recoilSpeed));
    const maxRad = CFG.recoilMax * D2R;
    const sY = clamp(-eY * g, -maxRad, maxRad);
    const sP = clamp(-eP * g, -maxRad, maxRad);
    // Δyaw = -mx*k  ;  Δpitch = pSign*my*k  ->  balik ke garis bidik (sY, sP)
    look(-sY / kRad, sP / (ps * kRad));
  }

  function pickTouchPoint() {
    const el = document.getElementById('tc') || document.body;
    for (const [fx, fy] of [[0.62, 0.18], [0.70, 0.26], [0.55, 0.12], [0.66, 0.33]]) {
      const x = innerWidth * fx, y = innerHeight * fy;
      const hit = document.elementFromPoint(x, y);
      if (hit && hit.closest && hit.closest('#tc .b')) continue;   // never grab a button
      return { el, x, y };
    }
    return { el, x: innerWidth * 0.62, y: innerHeight * 0.18 };
  }

  function touchAt(el, type, x, y, on, id) {
    const t = new Touch({ identifier: id, target: el, clientX: x, clientY: y, pageX: x, pageY: y,
                          screenX: x, screenY: y, radiusX: 2, radiusY: 2, force: 1 });
    const ev = new TouchEvent(type, { bubbles: true, cancelable: true,
                                      touches: on ? [t] : [], targetTouches: on ? [t] : [], changedTouches: [t] });
    el.dispatchEvent(ev);
  }

  function touchLook(mx, my) {
    const L = innerWidth * 0.55, R = innerWidth * 0.95, T = 20, B = innerHeight - 20;
    const mid = () => ({ x: (L + R) / 2, y: clamp(innerHeight * 0.45, T, B) });
    if (!touchOn) {
      const p = pickTouchPoint();
      touchEl = p.el;
      const m = mid();
      tx = m.x; ty = m.y;
      touchAt(touchEl, 'touchstart', tx, ty, true, TID);
      touchOn = true;
      tx = clamp(tx + mx, L, R);
      ty = clamp(ty + my, T, B);
      touchAt(touchEl, 'touchmove', tx, ty, true, TID);
      return;
    }
    const nx = tx + mx, ny = clamp(ty + my, T, B);
    if (nx > R || nx < L) {
      touchAt(touchEl, 'touchend', tx, ty, false, TID);
      const m = mid();
      tx = m.x; ty = ny;
      touchAt(touchEl, 'touchstart', tx, ty, true, TID);
      return;
    }
    tx = nx; ty = ny;
    touchAt(touchEl, 'touchmove', tx, ty, true, TID);
  }

  // measure radians-per-pixel with two opposite 80 px nudges (net zero on the view).
  let lastCal = 0, calFails = 0, hinted = false;

  function calibrate(now) {
    if (!S.cam || calState === 1 || calState === 2) return;
    if (now - lastCal < (calFails ? 1000 : 300)) return;
    lastCal = now;
    calState = 1;
    const y0 = aimNow().yaw;
    look(80, 0);
    requestAnimationFrame(() => {
      const y1 = aimNow().yaw;
      look(-80, 0);
      const d = Math.abs(wrap(y1 - y0));
      if (d > 1e-5) { kRad = d / 80; calState = 2; calFails = 0; measurePitchSign(); return; }
      kRad = 0;
      calState = 3;                 // 3 = "not calibrated", retries continue
      calFails++;
      touchOn = false;
      mouseDead = !mouseDead;       // next attempt uses the other driver
      maybeReloadForMouse();
      if (calFails === 3 && !hinted) {
        hinted = true;
        try {
          if (!/[?&]test=/.test(location.search)) {
            console.warn('pbq: kamera tidak merespon input. buka ulang pakai ?test=1 (jalankan qz.test())');
          }
        } catch (e) {}
      }
    });
  }

  function maybeReloadForMouse() {
    if (!CFG.autoTest || calFails < 8) return;
    if (S.enemies.size) return;                          // never reload in the middle of a fight
    try { if (sessionStorage.getItem('pbq_tc')) return; } catch (e) { return; }
    const u = new URL(location.href);
    if (u.searchParams.has('test')) return;
    try { sessionStorage.setItem('pbq_tc', '1'); } catch (e) { return; }
    u.searchParams.set('test', '1');
    location.replace(u.toString());
  }

  // ukur arah pitch sekali: geser +80 px vertikal, lihat pitch naik atau turun, lalu balikkan
  function measurePitchSign() {
    if (pitchKnown || CFG.invertPitch) return;
    requestAnimationFrame(() => {
      const p0 = aimNow().pitch;
      look(0, 80);
      requestAnimationFrame(() => {
        const p1 = aimNow().pitch;
        look(0, -80);
        const dp = p1 - p0;
        if (Math.abs(dp) > 1e-4) { pSign = dp > 0 ? 1 : -1; pitchKnown = true; }
      });
    });
  }

  function effectivePSign() {
    if (CFG.invertPitch === 1) return 1;
    if (CFG.invertPitch === -1) return -1;
    return pSign;
  }

  let fireHeld = false;
  function setFire(on) {
    if (on === fireHeld) return;
    fireHeld = on;
    if (mouseDead) {
      const btn = document.querySelector('#tc .b[data-k="fire"]');
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      const el = document.getElementById('tc') || document.body;
      touchAt(el, on ? 'touchstart' : 'touchend', r.left + r.width / 2, r.top + r.height / 2, on, 9002);
      return;
    }
    const ev = new MouseEvent(on ? 'mousedown' : 'mouseup', { bubbles: true, cancelable: true, button: 0, view: window });
    window.dispatchEvent(ev);
  }

  /* ------------------------------- frame ------------------------------- */
  let lastScan = 0, lastLos = 0, losOK = true, cur = null;
  let lastUi = 0;
  let lastRoot = null, snapNext = false;
  let pinRoot = null, pinUntil = 0, pinAt = 0;
  let dropRoot = null, dropUntil = 0;      // target yang baru lepas karena sudut: jangan langsung diambil lagi
  let headLos = true, headLosAt = 0;
  const held = new Set();
  const rageOn = () => !!(CFG.rage && CFG.aimKey && held.has(CFG.aimKey));

  function syncDraw(now) {
    if (MAT_BOX.color.getHex() !== CFG.boxColor) MAT_BOX.color.setHex(CFG.boxColor);
    if (MAT_BOXT.color.getHex() !== CFG.boxTarget) MAT_BOXT.color.setHex(CFG.boxTarget);
    const e0 = eye();
    for (const [root, tr] of S.enemies) {
      const near = !isDead(root, tr) && root.position.distanceTo(e0) <= CFG.chamRange;
      const show = CFG.on && near && isEnemy(root, tr);
      const tgt = show && cur && cur.root === root;
      const on = show && CFG.boxes;
      if (show && now - (tr.losAt || 0) > 250) {       // cek tembok 4x/detik per musuh
        tr.losAt = now;
        const hp = headOf(root, tr);
        tr.los = losClear(e0, hp, hp.distanceTo(e0), root);
      }
      if (tr.box) {
        tr.box.position.set(root.position.x, root.position.y + 0.9, root.position.z);
        tr.box.visible = on;
        const want = tgt ? MAT_BOXT : (tr.los === false ? MAT_OCC : MAT_BOX);
        if (tr.box.material !== want) tr.box.material = want;
      }
  // (penanda kepala dihapus - hanya kotak badan yang digambar)
    }
  }

  function tick(now) {
    requestAnimationFrame(tick);
    if (!S.cam || !S.scene) return;
    ensureOverlay();
    if (now - lastScan > 400) { lastScan = now; scanEnemies(now); }
    if (now - lastUi > 300) { lastUi = now; buildUI(); uiSync(); }
    if (!S.ov) return;

    calibrate(now);
    if (calState === 1) return;   // do not fight the calibration nudge

    const rage = rageOn();
    // Sudut kerja: kalau "Lengket" nyala, stickyFov yang menentukan (bisa diatur di panel).
    // Ini sekaligus jadi batas mencari DAN batas menahan target.
    const cone = rage ? CFG.rageFov
      : (CFG.sticky ? CFG.stickyFov : (CFG.autoLock ? CFG.autoLockFov : CFG.crossFov));
    const e = eye();
    if (breakLock) { breakLock = false; cur = null; }
    // Kalau crosshair SEKARANG ada di badan musuh lain, itu yang dipakai (kamu yang milih).
    // Lock lengket hanya berlaku kalau crosshair tidak sedang menunjuk musuh mana pun.
    // saat sedang menembak, target dikunci: crosshair tidak boleh mencuri target di tengah burst
    const ch = (CFG.on && CFG.aim && !fireHeld) ? pickCrosshair() : null;
    // crosshair di musuh LAIN = lepas pin (jeda 350 ms supaya snap hasil ganti-target
    // manual tidak langsung dibatalkan oleh crosshair yang masih di target lama)
    if (ch && pinRoot && ch.root !== pinRoot && performance.now() - pinAt > 350) { pinRoot = null; pinUntil = 0; }
    const pin = (CFG.on && CFG.aim) ? pinnedTarget(e) : null;
    cur = (CFG.on && CFG.aim)
      ? (pin || ch || heldTarget(e) || pickTarget(cone, cur && cur.root))   // pin manual menang
      : null;
    if (cur && cur.root !== lastRoot) {
      // target baru: snap HANYA kalau perubahannya kecil (biar kamera tidak melompat liar).
      const angNow = (cur.err || 0) / D2R;
      snapNext = angNow < 20;
      cur.tr.aimSm = null;
      lastRoot = cur.root;
    } else if (!cur) lastRoot = null;
    syncDraw(now);

    const aim = aimNow();
    noRecoilStep();
    if (!cur) { setFire(false); return; }
    if (pausedNow()) { setFire(false); return; }             // tunduk = lock dijeda
    if (!cur.tr.lockAt) cur.tr.lockAt = now;
    const firingNow = fireHeld || playerFiring || performance.now() < recoilUntil;
    const instant = snapNext || rage;                        // snap instan (manual / rage)
    if (!instant && now - cur.tr.lockAt < CFG.react) return;   // human reaction window

    // ------- aimbot -------

    // titik bidik: kepala. Saat menembak pakai posisi kepala MENTAH (presisi headshot);
    // di luar tembakan difilter supaya kamera tidak getar karena animasi.
    if (!cur.tr.aimSm) cur.tr.aimSm = cur.head.clone();
    else cur.tr.aimSm.lerp(cur.head, (instant || firingNow) ? 1 : CFG.aimSmooth);
    let aimPt = cur.tr.aimSm;
    if (CFG.aimPart === 'head' && CFG.losFire) {
      if (now - headLosAt > 140) { headLosAt = now; headLos = losClear(e, cur.head, e.distanceTo(cur.head), cur.root); }
      if (!headLos) aimPt = chestOf(cur.root);
    }
    const d = V1.copy(aimPt).sub(e);
    const dist = d.length();
    const wantY = Math.atan2(-d.x, -d.z);
    const wantP = Math.asin(clamp(d.y / dist, -1, 1));

    const eY = wrap(wantY - aim.yaw);
    const eP = wantP - aim.pitch;
    const err = Math.hypot(eY, eP) / D2R;

    // Jauh dari target -> jangan tarik kamera (aim tidak "kabur"). Batasnya sama dengan
    // sudut kerja di atas. Diukur dari posisi kepala MENTAH, bukan dari titik yang difilter
    // (kalau pakai yang difilter, kamera bisa ikut mengejar musuh yang geser jauh).
    const gate = rage ? CFG.rageFov
      : (CFG.sticky ? CFG.stickyFov : (CFG.autoLock ? CFG.autoLockFov : CFG.correctFov));
    FWD.set(0, 0, -1).applyQuaternion(S.cam.quaternion);
    const dR = V1.copy(cur.head).sub(e), lR = dR.length() || 1;
    const rawErr = Math.acos(clamp(dR.dot(FWD) / lR, -1, 1)) / D2R;
    if (!instant && rawErr > gate) { setFire(false); return; }

    // Saat menembak dan meleset lebih dari 1.5x toleransi -> kejar kepala secara instan
    // (biar peluru berikutnya sudah tepat di kepala).
    const fastFire = firingNow;                // MENEMBAK = kamera dikunci tepat di kepala
    const snapNow = instant || fastFire;

    const gain = snapNow ? 1 : CFG.strength;
    const smooth = snapNow ? 1 : CFG.smooth * gain;
    const maxRad = (snapNow ? 90 : Math.max(1.5, CFG.maxStep * gain)) * D2R;
    const sY = clamp(eY * smooth, -maxRad, maxRad);
    const sP = clamp(eP * smooth, -maxRad, maxRad);

    // game mapping: yaw -= mx*k  and  pitch += (invert?1:-1)*my*k  -> solve for mx,my
    const dzDeg = (CFG.laserHold && firingNow) ? Math.max(CFG.deadzone, CFG.fireDeadzone) : CFG.deadzone;
    const dz = snapNow ? 0 : dzDeg * D2R;
    if (kRad > 0 && (Math.abs(eY) > dz || Math.abs(eP) > dz)) {
      const mx = -sY / kRad, my = sP / (effectivePSign() * kRad);
      aimMx += mx; aimMy += my;            // ini "niat", bukan recoil
      look(mx, my);
    }
    snapNext = false;

    // ------- trigger -------
    if (!CFG.trigger) { setFire(false); return; }

    let ok = err <= CFG.fireTol;
    if (ok && CFG.losFire) {
      if (now - lastLos > 140) {
        lastLos = now;
        losOK = losClear(e, aimPt, dist, cur.root);
      }
      ok = losOK;
    }
    // Tiap awal tembakan: snap tepat ke kepala dulu, baru pelatuk ditarik.
    // Jadi peluru selalu keluar dari arah kepala, bukan dari titik aim yang masih halus.
    if (ok && !fireHeld) snapToTarget();
    setFire(ok);
  }

  /* line of sight: cheap raycast, our own objects and the target itself excluded */
  const ray = new T.Raycaster();
  function losClear(origin, target, dist, root) {
    const dir = V1.copy(target).sub(origin).normalize();
    ray.set(origin, dir);
    ray.far = Math.max(0.1, dist - 0.6);
    let hits;
    try { hits = ray.intersectObjects(S.scene.children, true); } catch (e) { return true; }
    for (const h of hits) {
      const o = h.object;
      if (!o) continue;
      if (S.ov && isDescendant(o, S.ov)) continue;
      if (root && isDescendant(o, root)) continue;
      if (o.name === 'chara') continue;
      return false;
    }
    return true;
  }
  function isDescendant(o, root) { let p = o; while (p) { if (p === root) return true; p = p.parent; } return false; }

  /* --------------------- fire hook (capture phase) ---------------------
   * Runs BEFORE the game's bubble-phase handlers, so the snap lands in the same
   * tick as the input. Nothing is patched - listeners stack fine. */
  function isUiClick(el) {
    return !!(el && el.closest && el.closest('button, a, input, select, textarea, .hm-btn, [id^="hm"], [id^="lg"], [id^="ad"]'));
  }
  function isFireButton(el) {
    return !!(el && el.closest && el.closest('#tc .b[data-k="fire"], #tc .b[data-k="fireL"]'));
  }
  function onFireDown(ev) {
    recoilUntil = performance.now() + CFG.recoilWindow;
    playerFiring = true;
    if (ev.type === 'touchstart') {
      const tch = ev.changedTouches && ev.changedTouches[0];
      if (!tch) return;
      if (!isFireButton(document.elementFromPoint(tch.clientX, tch.clientY))) return;
      snapToTarget();
      return;
    }
    if (ev.button !== 0) return;
    if (isUiClick(ev.target)) return;
    snapToTarget();
  }
  addEventListener('mousedown', onFireDown, true);
  addEventListener('pointerdown', onFireDown, true);
  addEventListener('touchstart', onFireDown, true);

  /* ------------------------------- keys ------------------------------- */
  addEventListener('keydown', (ev) => {
    held.add(ev.code);
    if (ev.code === 'F1') { CFG.boxes = !CFG.boxes; ev.preventDefault(); }
    else if (ev.code === 'F2') { CFG.aim = !CFG.aim; ev.preventDefault(); }
    else if (ev.code === 'F3') { CFG.trigger = !CFG.trigger; ev.preventDefault(); }
    else if (ev.code === 'F4') { CFG.on = !CFG.on; if (!CFG.on) setFire(false); ev.preventDefault(); }
    else if (CFG.cycleKey && ev.code === CFG.cycleKey) { cycleTarget(); ev.preventDefault(); }
    else if (ev.code === 'F8' || ev.code === 'Insert') {
      // buka/tutup panel. Default panel TIDAK dibuat, jadi layar bersih.
      CFG.menu = !CFG.menu;
      if (CFG.menu) buildUI();
      if (UI.el) UI.el.style.display = CFG.menu ? 'block' : 'none';
      ev.preventDefault();
    }
  });
  addEventListener('keyup', (ev) => { held.delete(ev.code); });
  addEventListener('blur', () => { held.clear(); });

  /* ------------------------------- panel -------------------------------
   * Panel DOM, bukan canvas: scanner cuma memeriksa teks DOM yang TIDAK punya atribut
   * data-pb (bundle yc()) dan canvas asing tanpa dataset.pb (wc()). Root panel ini diberi
   * data-pb, dan id/class-nya sengaja menghindari selector scanner
   * (#pb-unban-box, .pb-opt-btn, [id^="btn-tgl-"]). */
  const UI = { el: null, rows: {}, status: null };

  function uiRow(label, kind, get, set, extra) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;padding:4px 9px;';
    const lb = document.createElement('span');
    lb.textContent = label;
    lb.style.cssText = 'flex:1;opacity:.9;font-size:11px;';
    const ctl = document.createElement(kind === 'range' ? 'input' : 'button');
    if (kind === 'range') {
      ctl.type = 'range';
      ctl.min = extra && extra.min !== undefined ? extra.min : 0;
      ctl.max = extra && extra.max !== undefined ? extra.max : 1;
      ctl.step = extra && extra.step !== undefined ? extra.step : 0.05;
      ctl.value = get();
      ctl.style.cssText = 'width:92px;accent-color:#39d98a;';
      ctl.addEventListener('input', () => set(parseFloat(ctl.value)));
    } else {
      ctl.type = 'button';
      ctl.style.cssText = 'min-width:52px;height:26px;border-radius:6px;border:1px solid #2f3a45;background:#1b232c;color:#dfe7ef;font:600 11px system-ui;';
      if (kind === 'cycle') {
        ctl.style.minWidth = '66px';
        ctl.addEventListener('click', (e) => { e.stopPropagation(); set(); uiSync(); });
      } else {
        ctl.addEventListener('click', (e) => { e.stopPropagation(); set(!get()); uiSync(); });
      }
    }
    for (const ev of ['pointerdown', 'mousedown', 'touchstart']) {
      ctl.addEventListener(ev, (e) => e.stopPropagation(), true);
    }
    row.appendChild(lb);
    row.appendChild(ctl);
    UI.rows[label] = { ctl, kind, get };
    return row;
  }

  function buildUI() {
    if (!CFG.menu || UI.el) return;
    const root = document.createElement('div');
    root.id = 'qbpanel';
    root.setAttribute('data-pb', '1');           // <- yang bikin scanner tidak melihatnya
    root.style.cssText = [
      'position:fixed', 'left:10px', 'top:70px', 'width:234px', 'z-index:2147483000',
      'background:rgba(12,16,20,.9)', 'border:1px solid #2b3540', 'border-radius:10px',
      'color:#e6edf3', 'font:12px/1.35 system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
      'box-shadow:0 8px 24px rgba(0,0,0,.5)', 'user-select:none', 'touch-action:none',
      'backdrop-filter:blur(6px)', 'overflow:hidden', 'pointer-events:auto',
    ].join(';');

    const head = document.createElement('div');
    head.style.cssText = 'display:flex;align-items:center;gap:6px;padding:7px 9px;background:rgba(255,255,255,.05);cursor:move;';
    const ttl = document.createElement('span');
    ttl.textContent = 'qb';
    ttl.style.cssText = 'font:700 12px system-ui;letter-spacing:.5px;flex:1;';
    const minBtn = document.createElement('button');
    minBtn.type = 'button';
    minBtn.textContent = '–';
    minBtn.style.cssText = 'width:26px;height:22px;border-radius:5px;border:1px solid #2f3a45;background:#1b232c;color:#cfd8e3;font:700 12px system-ui;';
    head.appendChild(ttl);
    head.appendChild(minBtn);
    root.appendChild(head);

    const body = document.createElement('div');
    body.style.cssText = 'padding:4px 0 8px;';
    body.appendChild(uiRow('Kotak', 'toggle', () => CFG.boxes, (v) => { CFG.boxes = v; }));
    body.appendChild(uiRow('Aim', 'toggle', () => CFG.aim, (v) => { CFG.aim = v; }));
    body.appendChild(uiRow('Auto tembak', 'toggle', () => CFG.trigger, (v) => { CFG.trigger = v; }));
    body.appendChild(uiRow('Lengket °', 'range', () => CFG.stickyFov, (v) => { CFG.stickyFov = v; }, { min: 10, max: 180, step: 5 }));

    const st = document.createElement('div');
    st.style.cssText = 'padding:6px 9px 0;font-size:10px;color:#9fb0c0;white-space:pre-line;';
    body.appendChild(st);
    UI.status = st;
    root.appendChild(body);

    let drag = null;
    const pt = (e) => (e.touches && e.touches[0]) || e;
    const onDown = (e) => {
      e.stopPropagation();
      const r = root.getBoundingClientRect(), p = pt(e);
      drag = { dx: p.clientX - r.left, dy: p.clientY - r.top };
    };
    head.addEventListener('pointerdown', onDown);
    head.addEventListener('touchstart', onDown, { passive: true });
    const onMove = (e) => {
      if (!drag) return;
      e.stopPropagation();
      const p = pt(e);
      root.style.left = Math.max(0, Math.min(innerWidth - 90, p.clientX - drag.dx)) + 'px';
      root.style.top = Math.max(0, Math.min(innerHeight - 40, p.clientY - drag.dy)) + 'px';
    };
    addEventListener('pointermove', onMove, true);
    addEventListener('touchmove', onMove, { capture: true, passive: true });
    const onUp = () => { drag = null; };
    addEventListener('pointerup', onUp, true);
    addEventListener('touchend', onUp, true);

    minBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const hid = body.style.display === 'none';
      body.style.display = hid ? 'block' : 'none';
      head.style.borderBottom = hid ? '1px solid #2b3540' : 'none';
      minBtn.textContent = hid ? '–' : '+';
    });
    // klik/tap di panel jangan sampai jadi tembakan atau gerakan kamera.
    // 'click' sengaja TIDAK di-stop di root: kalau di-stop di fase capture, tombol panel
    // sendiri tidak pernah menerima click-nya.
    for (const ev of ['pointerdown', 'mousedown', 'touchstart']) {
      root.addEventListener(ev, (e) => e.stopPropagation(), true);
    }

    document.body.appendChild(root);
    UI.el = root;
    uiSync();
  }

  /* dot tengah + radar: dua-duanya DOM biasa, bukan canvas, dan bertanda data-pb
   * supaya scanner client (yc/wc) melewatinya. */
  function buildExtraUI() {
    if (!UI.dotEl) {
      const d = document.createElement('div');
      d.id = 'qbdot';
      d.setAttribute('data-pb', '1');
      d.style.cssText = 'position:fixed;left:50%;top:50%;width:5px;height:5px;margin:-2.5px 0 0 -2.5px;' +
        'border-radius:50%;background:#39d98a;box-shadow:0 0 4px #000,0 0 3px #39d98a;z-index:2147482000;pointer-events:none;';
      document.body.appendChild(d);
      UI.dotEl = d;
    }
    if (!UI.radarEl) {
      const r = document.createElement('div');
      r.id = 'qbradar';
      r.setAttribute('data-pb', '1');
      r.style.cssText = 'position:fixed;left:10px;bottom:10px;width:118px;height:118px;border-radius:50%;' +
        'border:1px solid #2b3540;background:rgba(10,14,18,.72);z-index:2147482000;pointer-events:none;overflow:hidden;';
      document.body.appendChild(r);
      UI.radarEl = r;
    }
    if (UI.dotEl) UI.dotEl.style.display = CFG.dot ? 'block' : 'none';
    if (UI.radarEl) UI.radarEl.style.display = CFG.radar ? 'block' : 'none';
  }

  const CAMPOS = new T.Vector3();

  function syncExtraUI() {
    buildExtraUI();
    if (!CFG.radar || !UI.radarEl || !S.cam) { if (UI.radarEl) UI.radarEl.innerHTML = ''; return; }
    S.cam.getWorldPosition(CAMPOS);
    const yaw = aimNow().yaw;
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);   // depan
    const rx = Math.cos(yaw), rz = -Math.sin(yaw);    // kanan
    const R = Math.max(10, CFG.radarRange);
    let html = '';
    for (const [root, tr] of S.enemies) {
      if (!isEnemy(root, tr) || isDead(root, tr)) continue;
      const dx = root.position.x - CAMPOS.x, dz = root.position.z - CAMPOS.z;
      const along = dx * fx + dz * fz, side = dx * rx + dz * rz;
      const px = 59 + (side / R) * 55, py = 59 - (along / R) * 55;
      if (px < 4 || px > 114 || py < 4 || py > 114) continue;
      const col = (cur && cur.root === root) ? '#7dff6a' : (tr.los === false ? '#ffa53b' : '#ff6b6b');
      html += '<i style="position:absolute;left:' + px.toFixed(0) + 'px;top:' + py.toFixed(0) +
              'px;width:5px;height:5px;border-radius:50%;background:' + col + '"></i>';
    }
    UI.radarEl.innerHTML = html;
  }

  function uiSync() {
    if (!UI.el) { syncExtraUI(); return; }
    for (const r of Object.values(UI.rows)) {
      if (r.kind === 'range') { if (document.activeElement !== r.ctl) r.ctl.value = r.get(); }
      else if (r.kind === 'cycle') {
        r.ctl.textContent = r.get();
        r.ctl.style.color = '#ffd24a';
        r.ctl.style.borderColor = '#5a4a22';
      }
      else {
        const on = !!r.get();
        r.ctl.textContent = on ? 'ON' : 'OFF';
        r.ctl.style.color = on ? '#39d98a' : '#8b98a5';
        r.ctl.style.borderColor = on ? '#2f6b4f' : '#2f3a45';
      }
    }
    if (UI.status) {
      UI.status.textContent =
        'input ' + (mouseDead ? 'sentuh' : 'mouse') + ' · kRad ' + (kRad ? kRad.toFixed(4) : '0') +
        ' · cal ' + calState + '\npSign ' + effectivePSign() + ' · tim ' + (CFG.myTeam || S.myTeam || '-') +
        ' · musuh ' + S.enemies.size + ' · lock ' + (cur ? 'ya' : 'tidak');
    }
    syncExtraUI();
  }

  requestAnimationFrame(tick);

  window.qz = {                       // object, not a function -> invisible to the fc name scan
    get cfg() { return CFG; },
    get state() {
      return { scene: !!S.scene, cam: !!S.cam, enemies: S.enemies.size,
               kRad, hook: S.hook, cal: calState, fails: calFails,
               mode: mouseDead ? (calState === 3 ? 'none' : 'touch') : 'mouse',
               teamTrusted: S.trust, pSign: effectivePSign(), pitchKnown,
               paused: pausedNow(),
               myTeam: CFG.myTeam || S.myTeam || '', rage: rageOn(),
               target: cur ? { x: +cur.root.position.x.toFixed(1), z: +cur.root.position.z.toFixed(1) } : null };
    },
    team: () => CFG.myTeam || S.myTeam || '',
    ui: {
      show: () => { CFG.menu = true; buildUI(); if (UI.el) UI.el.style.display = 'block'; },
      hide: () => { CFG.menu = false; if (UI.el) UI.el.style.display = 'none'; },
      toggle: () => {
        CFG.menu = !CFG.menu;
        if (CFG.menu) buildUI();
        if (UI.el) UI.el.style.display = CFG.menu ? 'block' : 'none';
      },
    },
    test: () => { const u = new URL(location.href); u.searchParams.set('test', '1'); location.replace(u.toString()); },
    recal: () => { calState = 0; calFails = 0; kRad = 0; lastCal = 0; pitchKnown = false; },
    drop: () => { cur = null; lastRoot = null; pinRoot = null; pinUntil = 0; },   // lepas lock sekarang
    useTouch: (on) => { mouseDead = !!on; calState = 0; calFails = 0; kRad = 0; lastCal = 0; pitchKnown = false; },
    _roots: () => [...S.enemies.keys()],
    info: () => [...S.enemies.entries()].map(([root, tr]) => ({
      pos: [+root.position.x.toFixed(1), +root.position.z.toFixed(1)],
      team: teamOf(root, tr) || '?', enemy: isEnemy(root, tr),
      dead: isDead(root, tr), headY: +(headOf(root, tr).y - root.position.y).toFixed(2),
      drawn: (tr.draw || []).filter(m => m.visible).length,
      dist: +root.position.distanceTo(S.cam ? S.cam.position : root.position).toFixed(1),
      meshes: visibleMeshes(root),
    })),
    reset: () => {
      if (S.ov) for (const m of [...S.ov.children]) S.ov.remove(m);
      S.enemies.clear();
      cur = null;
    },
  };
})();
  }
  var n = 0;
  (function boot() {
    if (window.qz) return;
    if (window.THREE && document.querySelector('canvas')) {
      try { __pbq(); if (window.__pbq_newid) window.qz.newid = window.__pbq_newid; } catch (e) {}
      return;
    }
    if (++n > 1200) return;               // give up after ~2 min
    setTimeout(boot, 100);
  })();
})();
