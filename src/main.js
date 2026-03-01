// @ts-nocheck
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS3DRenderer, CSS3DObject, CSS3DSprite } from 'three/addons/renderers/CSS3DRenderer.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ── Config ────────────────────────────────────────────────────────────────────
const SITES = [
  'https://theme-coup-83657991.figma.site',
  'https://dried-grasp-84721794.figma.site',
  'https://tiny-viral-56311712.figma.site',
];

const PROTO_NAMES = ['Prototype 1', 'Prototype 2', 'Prototype 3'];

const INSIGHTS = [
  'Initial reaction of delight when noticing the matching set feature in the quick add modal.',
  'Users dislike upselling in the basket as it feels pushy — but serving products at the point of buying intent feels more organic.',
  'Initially confused whether the single matching item was in their basket, but confidence grew when multiple products were shown in the container.',
  'Feedback noted the add-to-cart felt too instant with no visual feedback — this has since been resolved.',
  'Positive responses to the first modal screen — users liked seeing only relevant info, with the option to explore more on the product page.',
  'Users praised the clean UI: size buttons were easy to tap and add to cart was intuitive.',
  'Users effortlessly navigated back to the collection via the breadcrumb button on the product page.',
  "When prompted to find a different colour, almost all users clicked '10 colors available' — they found it clear and obvious.",
  'All users agreed that adding the matching set at this stage in their journey felt natural and delightful.',
  'The "Continue Shopping" primary CTA was well received — users liked not being pushed to checkout and found it easy to return to the collection.',
];

// iPhone dimensions (393×852 screen, scaled to PH)
const PW  = 430;
const PH  = 940;
const PD  = 38;
const PR  = 58;

const SW  = 393;
const SH  = 852;
const SCREEN_Y = -6;
const SCREEN_CORNER_R = 65;

const PHONE_SPACING = 850;
const CAM_Z     = 3000;  // overview camera Z
const FOCUSED_Z = 1200;  // camera Z when zoomed in on a phone

// ── Status helper ─────────────────────────────────────────────────────────────
const infoEl = document.getElementById('info');
function status(msg) { infoEl.textContent = msg; }

window.addEventListener('unhandledrejection', e => {
  infoEl.style.background = 'rgba(180,0,0,0.85)';
  infoEl.textContent = 'ERR: ' + (e.reason?.message ?? e.reason);
  console.error(e.reason);
});

// ── Shape helper ──────────────────────────────────────────────────────────────
function rrShape(w, h, r) {
  const hw = w / 2, hh = h / 2, s = new THREE.Shape();
  s.moveTo(-hw + r, -hh);
  s.lineTo( hw - r, -hh); s.quadraticCurveTo( hw, -hh,  hw, -hh + r);
  s.lineTo( hw,  hh - r); s.quadraticCurveTo( hw,  hh,  hw - r,  hh);
  s.lineTo(-hw + r,  hh); s.quadraticCurveTo(-hw,  hh, -hw,  hh - r);
  s.lineTo(-hw, -hh + r); s.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
  return s;
}

// ── Procedural phone body ─────────────────────────────────────────────────────
function createPhone() {
  const g = new THREE.Group();
  const hw = PW / 2, hh = PH / 2;
  const shw = SW / 2, shh = SH / 2;

  const frame    = new THREE.MeshStandardMaterial({ color: 0xd8d8dc, roughness: 0.14, metalness: 0.80 });
  const glassBack= new THREE.MeshStandardMaterial({ color: 0x1c1c1e, roughness: 0.06, metalness: 0.15 });
  const frontGlass=new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.04, metalness: 0.10 });
  const camMetal = new THREE.MeshStandardMaterial({ color: 0xb8b8be, roughness: 0.08, metalness: 0.96 });
  const camLens  = new THREE.MeshStandardMaterial({ color: 0x010103, roughness: 0.03, metalness: 0.05 });
  const camSapph = new THREE.MeshStandardMaterial({ color: 0x06060f, roughness: 0.03, metalness: 0.06, transparent: true, opacity: 0.95 });
  const flash    = new THREE.MeshStandardMaterial({ color: 0xfffbe0, roughness: 0.20, emissive: new THREE.Color(0xffee88), emissiveIntensity: 0.4 });
  const port     = new THREE.MeshStandardMaterial({ color: 0x888890, roughness: 0.5, metalness: 0.6 });

  const frontShape = rrShape(PW, PH, PR);
  const screenHole = new THREE.Path();
  const sr = 6;
  screenHole.moveTo(-shw + sr, SCREEN_Y - shh);
  screenHole.lineTo( shw - sr, SCREEN_Y - shh);
  screenHole.quadraticCurveTo( shw, SCREEN_Y - shh,  shw, SCREEN_Y - shh + sr);
  screenHole.lineTo( shw, SCREEN_Y + shh - sr);
  screenHole.quadraticCurveTo( shw, SCREEN_Y + shh,  shw - sr, SCREEN_Y + shh);
  screenHole.lineTo(-shw + sr, SCREEN_Y + shh);
  screenHole.quadraticCurveTo(-shw, SCREEN_Y + shh, -shw, SCREEN_Y + shh - sr);
  screenHole.lineTo(-shw, SCREEN_Y - shh + sr);
  screenHole.quadraticCurveTo(-shw, SCREEN_Y - shh, -shw + sr, SCREEN_Y - shh);
  frontShape.holes.push(screenHole);
  const frontFace = new THREE.Mesh(new THREE.ShapeGeometry(frontShape, 64), frontGlass);
  frontFace.position.z = PD / 2 + 0.5;
  g.add(frontFace);

  const bodyGeo = new THREE.ExtrudeGeometry(rrShape(PW, PH, PR), {
    depth: PD, bevelEnabled: true, bevelThickness: 5, bevelSize: 4, bevelSegments: 12,
  });
  bodyGeo.translate(0, 0, -PD / 2);
  g.add(new THREE.Mesh(bodyGeo, frame));

  const backFace = new THREE.Mesh(new THREE.ShapeGeometry(rrShape(PW - 6, PH - 6, PR - 3), 80), glassBack);
  backFace.rotation.y = Math.PI;
  backFace.position.z = -PD / 2 - 0.5;
  g.add(backFace);

  const appleDisc = new THREE.Mesh(new THREE.CircleGeometry(38, 64),
    new THREE.MeshStandardMaterial({ color: 0x48484a, roughness: 0.10, metalness: 0.85, transparent: true, opacity: 0.75 }));
  appleDisc.rotation.y = Math.PI;
  appleDisc.position.set(0, 60, -PD / 2 - 0.6);
  g.add(appleDisc);

  const camCX = -58, camCY = hh - 160;
  const camPad = new THREE.Mesh(new THREE.BoxGeometry(140, 148, 10),
    new THREE.MeshStandardMaterial({ color: 0x2c2c2e, roughness: 0.08, metalness: 0.35 }));
  camPad.position.set(camCX, camCY, -PD / 2 - 5);
  g.add(camPad);

  [[-30, 32], [30, 32], [0, -28]].forEach(([lx, ly], idx) => {
    const outerR = idx === 2 ? 28 : 26, innerR = idx === 2 ? 22 : 20, glassR = idx === 2 ? 17 : 16;
    [[new THREE.CylinderGeometry(outerR, outerR, 10, 64), camMetal, -12],
     [new THREE.CylinderGeometry(innerR, innerR, 12, 64), camLens, -12.5]].forEach(([geo, mat, dz]) => {
      const m = new THREE.Mesh(geo, mat);
      m.rotation.x = Math.PI / 2;
      m.position.set(camCX + lx, camCY + ly, -PD / 2 + dz);
      g.add(m);
    });
    const gr = new THREE.Mesh(new THREE.CircleGeometry(glassR, 64), camSapph);
    gr.rotation.y = Math.PI;
    gr.position.set(camCX + lx, camCY + ly, -PD / 2 - 18);
    g.add(gr);
  });

  const fm = new THREE.Mesh(new THREE.CylinderGeometry(11, 11, 9, 32), flash);
  fm.rotation.x = Math.PI / 2;
  fm.position.set(camCX + 48, camCY + 45, -PD / 2 - 12);
  g.add(fm);

  const diMat = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.5 });
  const di = new THREE.Mesh(new THREE.ShapeGeometry(rrShape(130, 36, 18), 64), diMat);
  di.position.set(0, SCREEN_Y + shh - 30, PD / 2 + 1.2);
  g.add(di);

  const usbcOuter = new THREE.Mesh(new THREE.BoxGeometry(34, 12, PD + 2), port);
  usbcOuter.position.set(0, -hh, 0);
  g.add(usbcOuter);

  [-90, 90].forEach(x => {
    for (let i = 0; i < 5; i++) {
      const dot = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, PD + 2, 8), port);
      dot.rotation.x = Math.PI / 2;
      dot.position.set(x + i * 9 - 18, -hh, 0);
      g.add(dot);
    }
  });

  const power = new THREE.Mesh(new THREE.BoxGeometry(6, 90, 13), frame);
  power.position.set(hw + 3, 80, 0);
  g.add(power);

  const ccBody = new THREE.Mesh(new THREE.BoxGeometry(7, 60, 13), frame);
  ccBody.position.set(hw + 3, -80, 0);
  g.add(ccBody);

  [[-110, 48], [10, 80], [110, 80]].forEach(([y, bh]) => {
    const vol = new THREE.Mesh(new THREE.BoxGeometry(6, bh, 13), frame);
    vol.position.set(-hw - 3, y, 0);
    g.add(vol);
  });

  return g;
}

// ── Live website iframe (CSS3DObject) ─────────────────────────────────────────
function createScreenObject(url) {
  const wrap = document.createElement('div');
  wrap.style.position = 'relative';
  wrap.style.width = `${SW}px`;
  wrap.style.height = `${SH}px`;
  wrap.style.overflow = 'hidden';
  wrap.style.background = '#000';
  wrap.style.backfaceVisibility = 'hidden';
  wrap.style.webkitBackfaceVisibility = 'hidden';
  wrap.style.borderRadius = '44px';

  const statusBar = document.createElement('div');
  statusBar.style.position = 'absolute';
  statusBar.style.top = '0';
  statusBar.style.left = '0';
  statusBar.style.right = '0';
  statusBar.style.height = '44px';
  statusBar.style.zIndex = '4';
  statusBar.style.background = 'linear-gradient(rgba(0,0,0,0.35), transparent)';
  statusBar.style.pointerEvents = 'none';
  wrap.appendChild(statusBar);

  const iframe = document.createElement('iframe');
  iframe.src = url;
  iframe.style.position = 'absolute';
  iframe.style.inset = '0';
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';
  iframe.style.display = 'block';
  iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups');
  wrap.appendChild(iframe);

  const obj = new CSS3DObject(wrap);
  obj.position.set(0, SCREEN_Y, PD / 2 + 1);
  return obj;
}

// ── Detect screen mesh in a GLB model clone ────────────────────────────────────
function findScreenMesh(model) {
  const TARGET_ASPECT = SW / SH;
  const meshInfo = [];
  model.traverse(child => {
    if (!child.isMesh) return;
    const mb = new THREE.Box3().setFromObject(child);
    const ms = new THREE.Vector3();
    const mc = new THREE.Vector3();
    mb.getSize(ms); mb.getCenter(mc);
    const d = [ms.x, ms.y, ms.z].sort((a, b) => b - a);
    const faceAspect = d[1] / Math.max(d[0], 1e-9);
    const flatness   = d[2] / Math.max(d[0], 1e-9);
    meshInfo.push({ mesh: child, size: ms, center: mc, faceAspect, flatness });
  });

  const namePatterns = ['screen', 'display', 'glass_front', 'front_glass', 'lcd', 'panel'];
  let found = meshInfo.find(({ mesh }) =>
    namePatterns.some(p => mesh.name.toLowerCase().includes(p))
  );

  if (!found) {
    const cands = meshInfo
      .filter(({ faceAspect, flatness }) => faceAspect > 0.35 && faceAspect < 0.65 && flatness < 0.12)
      .sort((a, b) => {
        const da = Math.abs(a.faceAspect - TARGET_ASPECT);
        const db = Math.abs(b.faceAspect - TARGET_ASPECT);
        if (Math.abs(da - db) < 0.02) return b.center.z - a.center.z;
        return da - db;
      });
    found = cands[0] ?? null;
  }
  return found;
}

// ── Notes panel ───────────────────────────────────────────────────────────────
function createNotesPanel() {
  const panel = document.createElement('div');
  panel.style.position = 'fixed';
  panel.style.left = '24px';
  panel.style.top = '50%';
  panel.style.transform = 'translateY(-50%) translateX(-120%)';
  panel.style.transition = 'transform 0.45s cubic-bezier(0.34,1.56,0.64,1), opacity 0.35s ease';
  panel.style.opacity = '0';
  panel.style.pointerEvents = 'none';
  panel.style.width = '300px';
  panel.style.maxHeight = '82vh';
  panel.style.overflowY = 'auto';
  panel.style.background = 'rgba(255,255,255,0.93)';
  panel.style.backdropFilter = 'blur(24px)';
  panel.style.borderRadius = '20px';
  panel.style.padding = '26px 22px 24px';
  panel.style.boxShadow = '0 8px 40px rgba(0,0,0,0.13)';
  panel.style.zIndex = '20';
  panel.style.fontFamily = '-apple-system, BlinkMacSystemFont, sans-serif';
  panel.style.boxSizing = 'border-box';
  document.body.appendChild(panel);
  return panel;
}

function showPanel(panel, index, onClose) {
  const insightsHTML = INSIGHTS.map(text =>
    `<li style="display:flex;gap:10px;align-items:flex-start;margin-bottom:12px;">
       <span style="width:6px;height:6px;border-radius:50%;background:#646cff;margin-top:6px;flex-shrink:0;"></span>
       <span style="font-size:13px;line-height:1.65;color:#3a3a3c;">${text}</span>
     </li>`
  ).join('');

  panel.innerHTML = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px;">
      <div>
        <div style="font-size:10px;font-weight:700;letter-spacing:0.1em;color:#999;text-transform:uppercase;margin-bottom:4px;">User Testing</div>
        <div style="font-size:19px;font-weight:700;color:#1c1c1e;line-height:1.2;">${PROTO_NAMES[index]}</div>
      </div>
      <button id="panel-close" style="flex-shrink:0;width:28px;height:28px;border-radius:50%;border:none;background:rgba(0,0,0,0.07);cursor:pointer;font-size:13px;color:#555;margin-top:2px;">✕</button>
    </div>
    <div style="height:1px;background:rgba(0,0,0,0.08);margin-bottom:14px;"></div>
    <div style="font-size:11px;font-weight:600;letter-spacing:0.06em;color:#aaa;text-transform:uppercase;margin-bottom:10px;">Key Insights</div>
    <ul style="margin:0;padding:0;list-style:none;">${insightsHTML}</ul>
  `;
  panel.querySelector('#panel-close').onclick = onClose;
  panel.style.opacity = '1';
  panel.style.transform = 'translateY(-50%) translateX(0)';
  panel.style.pointerEvents = 'auto';
}

function hidePanel(panel) {
  panel.style.opacity = '0';
  panel.style.transform = 'translateY(-50%) translateX(-120%)';
  panel.style.pointerEvents = 'none';
}

// ── Phone nav controls ────────────────────────────────────────────────────────
function createNavControls(onSelect) {
  const nav = document.createElement('div');
  nav.style.position = 'fixed';
  nav.style.bottom = '80px';
  nav.style.left = '50%';
  nav.style.transform = 'translateX(-50%)';
  nav.style.zIndex = '10';
  nav.style.display = 'flex';
  nav.style.alignItems = 'center';
  nav.style.gap = '6px';
  nav.style.background = 'rgba(255,255,255,0.72)';
  nav.style.backdropFilter = 'blur(12px)';
  nav.style.borderRadius = '28px';
  nav.style.padding = '6px 10px';
  nav.style.border = '1px solid rgba(0,0,0,0.08)';
  nav.style.fontFamily = '-apple-system, sans-serif';

  const prevBtn = document.createElement('button');
  prevBtn.textContent = '←';
  styleNavBtn(prevBtn, false);
  prevBtn.onclick = () => onSelect('prev');
  nav.appendChild(prevBtn);

  const dotBtns = PROTO_NAMES.map((name, i) => {
    const btn = document.createElement('button');
    btn.textContent = String(i + 1);
    styleNavBtn(btn, false);
    btn.title = name;
    btn.onclick = () => onSelect(i);
    nav.appendChild(btn);
    return btn;
  });

  const nextBtn = document.createElement('button');
  nextBtn.textContent = '→';
  styleNavBtn(nextBtn, false);
  nextBtn.onclick = () => onSelect('next');
  nav.appendChild(nextBtn);

  document.body.appendChild(nav);

  function update(activeIndex) {
    dotBtns.forEach((btn, i) => {
      const active = i === activeIndex;
      btn.style.background = active ? '#646cff' : 'transparent';
      btn.style.color = active ? '#fff' : '#1c1c1e';
      btn.style.fontWeight = active ? '700' : '500';
    });
  }

  return { el: nav, update };
}

function styleNavBtn(btn, active) {
  btn.style.width = '32px';
  btn.style.height = '32px';
  btn.style.borderRadius = '50%';
  btn.style.border = 'none';
  btn.style.background = 'transparent';
  btn.style.color = '#1c1c1e';
  btn.style.fontSize = '14px';
  btn.style.fontWeight = '500';
  btn.style.cursor = 'pointer';
  btn.style.display = 'flex';
  btn.style.alignItems = 'center';
  btn.style.justifyContent = 'center';
  btn.style.transition = 'background 0.2s, color 0.2s';
}

// ── Phone title label (CSS3DSprite — always faces camera) ─────────────────────
function createPhoneLabel(name) {
  const div = document.createElement('div');
  div.textContent = name;
  div.style.fontFamily = '-apple-system, BlinkMacSystemFont, sans-serif';
  div.style.fontSize = '72px';
  div.style.fontWeight = '700';
  div.style.color = '#1c1c1e';
  div.style.letterSpacing = '-0.02em';
  div.style.background = 'rgba(255,255,255,0.82)';
  div.style.backdropFilter = 'blur(16px)';
  div.style.borderRadius = '20px';
  div.style.padding = '12px 28px';
  div.style.border = '1px solid rgba(0,0,0,0.07)';
  div.style.whiteSpace = 'nowrap';
  div.style.boxShadow = '0 4px 24px rgba(0,0,0,0.08)';
  return new CSS3DSprite(div);
}

// ── UI toggle ─────────────────────────────────────────────────────────────────
function setupUI(css3dEl, controls, onEscape) {
  let interactMode = false;
  const btn = document.createElement('button');
  btn.textContent = '🖱  Interact with site';
  btn.style.position = 'fixed';
  btn.style.bottom = '24px';
  btn.style.left = '50%';
  btn.style.transform = 'translateX(-50%)';
  btn.style.zIndex = '10';
  btn.style.background = 'rgba(255,255,255,0.72)';
  btn.style.color = '#1c1c1e';
  btn.style.border = '1px solid rgba(0,0,0,0.10)';
  btn.style.borderRadius = '24px';
  btn.style.padding = '10px 24px';
  btn.style.fontSize = '13px';
  btn.style.cursor = 'pointer';
  btn.style.backdropFilter = 'blur(12px)';
  btn.style.fontFamily = '-apple-system, sans-serif';
  document.body.appendChild(btn);

  function setMode(on) {
    interactMode = on;
    css3dEl.style.pointerEvents = on ? 'all' : 'none';
    controls.enabled = !on;
    btn.textContent = on ? '↩  Back to orbit' : '🖱  Interact with site';
  }
  btn.addEventListener('click', () => setMode(!interactMode));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { setMode(false); onEscape(); }
  });
}


// ── Main ──────────────────────────────────────────────────────────────────────
function init() {
  try {
    status('Booting…');
    document.body.style.background = '#f0f0f5';

    const camera = new THREE.PerspectiveCamera(
      45, window.innerWidth / window.innerHeight, 1, 10000
    );
    camera.position.set(0, 60, CAM_Z);
    camera.lookAt(0, 0, 0);

    // ── CSS3D renderer ───────────────────────────────────────────────────
    const css3dScene = new THREE.Scene();
    const css3dRenderer = new CSS3DRenderer();
    css3dRenderer.setSize(window.innerWidth, window.innerHeight);
    css3dRenderer.domElement.style.position = 'fixed';
    css3dRenderer.domElement.style.top = '0';
    css3dRenderer.domElement.style.left = '0';
    css3dRenderer.domElement.style.zIndex = '1';
    css3dRenderer.domElement.style.pointerEvents = 'none';
    document.body.appendChild(css3dRenderer.domElement);

    const phoneOffsets = [-PHONE_SPACING, 0, PHONE_SPACING];
    const screenObjs = SITES.map(url => {
      const obj = createScreenObject(url);
      css3dScene.add(obj);
      return obj;
    });

    // ── Phone title labels ───────────────────────────────────────────────
    const labelY = PH / 2 + 100; // just above the top of each phone
    PROTO_NAMES.forEach((name, i) => {
      const label = createPhoneLabel(name);
      label.position.set(phoneOffsets[i], labelY, 0);
      css3dScene.add(label);
    });

    // ── WebGL renderer ───────────────────────────────────────────────────
    status('Starting renderer…');
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f5);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.domElement.style.position = 'fixed';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.zIndex = '0';
    document.body.appendChild(renderer.domElement);

    // ── Lighting ─────────────────────────────────────────────────────────
    scene.add(new THREE.HemisphereLight(0xffffff, 0xe8e8f0, 1.0));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(400, 600, 800);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xdde8ff, 0.7);
    fill.position.set(-500, 100, 400);
    scene.add(fill);
    const bounce = new THREE.DirectionalLight(0xffffff, 0.4);
    bounce.position.set(0, -600, 300);
    scene.add(bounce);

    // ── Procedural phone placeholders ────────────────────────────────────
    const proceduralPhones = phoneOffsets.map(x => {
      const p = createPhone();
      p.position.x = x;
      scene.add(p);
      return p;
    });

    // ── Load GLB ─────────────────────────────────────────────────────────
    const loader = new GLTFLoader();
    loader.load('/i_phone12.glb', (gltf) => {
      const template = gltf.scene;
      template.updateMatrixWorld(true);
      const rawBox = new THREE.Box3().setFromObject(template);
      const rawSize = new THREE.Vector3();
      rawBox.getSize(rawSize);
      const scaleFactor = PH / rawSize.y;

      // Space Black material — replaces GLB's baked purple textures
      const darkMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1e, roughness: 0.08, metalness: 0.20 });

      phoneOffsets.forEach((offsetX, i) => {
        const model = template.clone(true);
        scene.add(model);
        model.scale.setScalar(scaleFactor);
        model.updateMatrixWorld(true);

        const scaledBox = new THREE.Box3().setFromObject(model);
        const centre = new THREE.Vector3();
        scaledBox.getCenter(centre);
        model.position.set(offsetX - centre.x, -centre.y, -centre.z);
        model.updateMatrixWorld(true);

        const screenInfo = findScreenMesh(model);
        if (screenInfo) {
          const sb = new THREE.Box3().setFromObject(screenInfo.mesh);
          const sc = new THREE.Vector3(); sb.getCenter(sc);
          const ss = new THREE.Vector3(); sb.getSize(ss);
          const screenObj = screenObjs[i];
          screenObj.quaternion.identity();
          screenObj.position.set(sc.x, sc.y, sc.z + 0.2);
          screenObj.scale.set(ss.x / SW, ss.y / SH, 1);
          const cssRadius = SCREEN_CORNER_R / (ss.x / SW);
          screenObj.element.style.borderRadius = `${cssRadius.toFixed(1)}px`;
        }

        // Override GLB's purple textures with Space Black
        const screenMesh = screenInfo?.mesh;
        model.traverse(child => {
          if (!child.isMesh || child === screenMesh) return;
          const mat = Array.isArray(child.material) ? child.material[0] : child.material;
          if (!mat?.color) return;
          const { r, g, b } = mat.color;
          if ((r + g + b) / 3 < 0.08) return; // keep near-black (lenses, screen bezel)
          child.material = darkMat;
        });
      });

      proceduralPhones.forEach(p => p.visible = false);
      status('Three.js WebGL — 3 × iPhone (GLB loaded)');
    }, undefined, (err) => {
      console.error('GLB load error:', err);
      status('ERR: could not load GLTF model — check console');
    });

    // ── Invisible hit planes for click detection (one per phone) ─────────
    // FrontSide only — clicking the back of the phone does nothing
    const hitMat = new THREE.MeshBasicMaterial({ visible: false, side: THREE.FrontSide });
    const hitPlanes = phoneOffsets.map(x => {
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(700, 1100), hitMat);
      plane.position.set(x, 0, 60);
      scene.add(plane);
      return plane;
    });

    // ── Camera animation state ────────────────────────────────────────────
    const camTarget  = new THREE.Vector3(0, 60, CAM_Z);
    const lookTarget = new THREE.Vector3(0, 0, 0);
    let isCamAnimating = false;
    let focusedPhone = -1;

    // ── Notes panel + nav controls ────────────────────────────────────────
    const notesPanel = createNotesPanel();
    const nav = createNavControls((target) => {
      if (target === 'prev') {
        focusPhone(focusedPhone <= 0 ? phoneOffsets.length - 1 : focusedPhone - 1);
      } else if (target === 'next') {
        focusPhone(focusedPhone < 0 ? 0 : (focusedPhone + 1) % phoneOffsets.length);
      } else {
        focusPhone(target);
      }
    });

    function unfocusPhone() {
      if (focusedPhone === -1) return;
      focusedPhone = -1;
      camTarget.set(0, 60, CAM_Z);
      lookTarget.set(0, 0, 0);
      isCamAnimating = true;
      controls.enabled = false;
      hidePanel(notesPanel);
      nav.update(-1);
    }

    function focusPhone(index) {
      if (focusedPhone === index) return;
      focusedPhone = index;
      const x = phoneOffsets[index];
      camTarget.set(x, 60, FOCUSED_Z);
      lookTarget.set(x, 0, 0);
      isCamAnimating = true;
      controls.enabled = false;
      showPanel(notesPanel, index, unfocusPhone);
      nav.update(index);
    }

    // ── Click → focus phone ───────────────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let pointerDownX = 0, pointerDownY = 0;

    renderer.domElement.addEventListener('pointerdown', e => {
      pointerDownX = e.clientX;
      pointerDownY = e.clientY;
    });

    renderer.domElement.addEventListener('click', e => {
      // Ignore drags (moved more than 5px)
      const dx = e.clientX - pointerDownX;
      const dy = e.clientY - pointerDownY;
      if (dx * dx + dy * dy > 25) return;

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.set(
        ((e.clientX - rect.left) / rect.width)  *  2 - 1,
        ((e.clientY - rect.top)  / rect.height) * -2 + 1
      );
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(hitPlanes);

      if (hits.length > 0) {
        const idx = hitPlanes.indexOf(hits[0].object);
        if (idx >= 0) focusPhone(idx);
      } else {
        unfocusPhone();
      }
    });

    // ── Orbit rings ───────────────────────────────────────────────────────
    const axisMat = new THREE.MeshBasicMaterial({
      color: 0xc0c8d8, transparent: true, opacity: 0.18, side: THREE.DoubleSide,
    });
    const R = 500, tube = 0.8;
    const yRing = new THREE.Mesh(new THREE.TorusGeometry(R, tube, 4, 160), axisMat);
    const xRing = new THREE.Mesh(new THREE.TorusGeometry(R, tube, 4, 160), axisMat);
    xRing.rotation.x = Math.PI / 2;
    const zRing = new THREE.Mesh(new THREE.TorusGeometry(R, tube, 4, 160), axisMat);
    zRing.rotation.y = Math.PI / 2;
    const tickMat = new THREE.MeshBasicMaterial({ color: 0xa0aec0, transparent: true, opacity: 0.35 });
    [yRing, xRing, zRing].forEach(ring => {
      for (let i = 0; i < 4; i++) {
        const tick = new THREE.Mesh(new THREE.TorusGeometry(R, tube * 2.5, 4, 12, 0.05), tickMat);
        tick.rotation.copy(ring.rotation);
        tick.rotation.y += (i * Math.PI) / 2;
        scene.add(tick);
      }
    });
    scene.add(yRing, xRing, zRing);

    // ── Ground plane ──────────────────────────────────────────────────────
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(6000, 6000),
      new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 1, metalness: 0 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -PH / 2 - 60;
    scene.add(ground);

    // ── Orbit controls ────────────────────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = false;
    controls.minDistance = 400;
    controls.maxDistance = 5000;
    controls.minPolarAngle = Math.PI * 0.1;
    controls.maxPolarAngle = Math.PI * 0.9;
    controls.target.set(0, 0, 0);
    controls.update();

    setupUI(css3dRenderer.domElement, controls, unfocusPhone);

    window.addEventListener('resize', () => {
      const w = window.innerWidth, h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      css3dRenderer.setSize(w, h);
    });

    status('Three.js WebGL — iPhone 16');

    renderer.setAnimationLoop((time) => {
      const t = time * 0.00008;
      yRing.rotation.y = t;
      xRing.rotation.z = t * 0.65;
      zRing.rotation.x = t * 0.45;

      // Smooth camera focus animation
      if (isCamAnimating) {
        camera.position.lerp(camTarget, 0.07);
        controls.target.lerp(lookTarget, 0.07);
        const settled =
          camera.position.distanceTo(camTarget) < 1 &&
          controls.target.distanceTo(lookTarget) < 1;
        if (settled) {
          camera.position.copy(camTarget);
          controls.target.copy(lookTarget);
          isCamAnimating = false;
          controls.enabled = true;
          controls.update();
        }
      }

      controls.update();
      css3dRenderer.render(css3dScene, camera);
      renderer.render(scene, camera);
    });

  } catch (err) {
    infoEl.style.background = 'rgba(180,0,0,0.85)';
    status('ERROR: ' + err.message);
    console.error(err);
  }
}

init();
