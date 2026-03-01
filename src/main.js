// @ts-nocheck
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ── Config ────────────────────────────────────────────────────────────────────
const SITES = [
  'https://theme-coup-83657991.figma.site',
  'https://dried-grasp-84721794.figma.site',
  'https://tiny-viral-56311712.figma.site',
];

// iPhone dimensions (393×852 screen, scaled to PH)
const PW  = 430;   // body width
const PH  = 940;   // body height
const PD  = 38;    // depth
const PR  = 58;    // corner radius

// Screen
const SW  = 393;   // screen width  (logical pts)
const SH  = 852;   // screen height (logical pts)
const SCREEN_Y = -6;
// Corner radius in world units — tune to match GLB model corners
const SCREEN_CORNER_R = 65;

const PHONE_SPACING = 850; // world units between phone centres
const CAM_Z = 3000;        // pulled back to fit all 3 phones

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
  const glassBack= new THREE.MeshStandardMaterial({ color: 0xf0f0f5, roughness: 0.05, metalness: 0.12 });
  const frontGlass=new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.04, metalness: 0.10 });
  const camMetal = new THREE.MeshStandardMaterial({ color: 0xb8b8be, roughness: 0.08, metalness: 0.96 });
  const camLens  = new THREE.MeshStandardMaterial({ color: 0x010103, roughness: 0.03, metalness: 0.05 });
  const camSapph = new THREE.MeshStandardMaterial({ color: 0x06060f, roughness: 0.03, metalness: 0.06, transparent: true, opacity: 0.95 });
  const flash    = new THREE.MeshStandardMaterial({ color: 0xfffbe0, roughness: 0.20, emissive: new THREE.Color(0xffee88), emissiveIntensity: 0.4 });
  const port     = new THREE.MeshStandardMaterial({ color: 0x888890, roughness: 0.5, metalness: 0.6 });

  // Front face with screen hole
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
    new THREE.MeshStandardMaterial({ color: 0xc8c8d0, roughness: 0.10, metalness: 0.85, transparent: true, opacity: 0.75 }));
  appleDisc.rotation.y = Math.PI;
  appleDisc.position.set(0, 60, -PD / 2 - 0.6);
  g.add(appleDisc);

  const camCX = -58, camCY = hh - 160;
  g.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(140, 148, 10),
    new THREE.MeshStandardMaterial({ color: 0xd0d0d8, roughness: 0.08, metalness: 0.22 })),
    { position: new THREE.Vector3(camCX, camCY, -PD / 2 - 5) }));

  [[-30, 32], [30, 32], [0, -28]].forEach(([lx, ly], idx) => {
    const outerR = idx === 2 ? 28 : 26, innerR = idx === 2 ? 22 : 20, glassR = idx === 2 ? 17 : 16;
    [
      [new THREE.CylinderGeometry(outerR, outerR, 10, 64), camMetal, -12],
      [new THREE.CylinderGeometry(innerR, innerR, 12, 64), camLens, -12.5],
    ].forEach(([geo, mat, dz]) => {
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
  Object.assign(wrap.style, {
    position: 'relative',
    width: `${SW}px`, height: `${SH}px`,
    overflow: 'hidden', background: '#000',
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    borderRadius: '44px',
  });

  const statusBar = document.createElement('div');
  Object.assign(statusBar.style, {
    position: 'absolute', top: '0', left: '0', right: '0',
    height: '44px', zIndex: '4',
    background: 'linear-gradient(rgba(0,0,0,0.35), transparent)',
    pointerEvents: 'none',
  });
  wrap.appendChild(statusBar);

  const iframe = document.createElement('iframe');
  iframe.src = url;
  Object.assign(iframe.style, {
    position: 'absolute', inset: '0',
    width: '100%', height: '100%',
    border: 'none', display: 'block',
  });
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

// ── UI toggle ─────────────────────────────────────────────────────────────────
function setupUI(css3dEl, controls) {
  let interactMode = false;
  const btn = document.createElement('button');
  btn.textContent = '🖱  Interact with site';
  Object.assign(btn.style, {
    position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
    zIndex: '10', background: 'rgba(255,255,255,0.72)', color: '#1c1c1e',
    border: '1px solid rgba(0,0,0,0.10)', borderRadius: '24px',
    padding: '10px 24px', fontSize: '13px', cursor: 'pointer',
    backdropFilter: 'blur(12px)', fontFamily: '-apple-system, sans-serif',
  });
  document.body.appendChild(btn);

  function setMode(on) {
    interactMode = on;
    css3dEl.style.pointerEvents = on ? 'all' : 'none';
    controls.enabled = !on;
    btn.textContent = on ? '↩  Back to orbit' : '🖱  Interact with site';
  }
  btn.addEventListener('click', () => setMode(!interactMode));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setMode(false); });
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
    Object.assign(css3dRenderer.domElement.style, {
      position: 'fixed', top: '0', left: '0', zIndex: '1', pointerEvents: 'none',
    });
    document.body.appendChild(css3dRenderer.domElement);

    // One CSS3D overlay per prototype, spaced to match phone positions
    const phoneOffsets = [-PHONE_SPACING, 0, PHONE_SPACING];
    const screenObjs = SITES.map(url => {
      const obj = createScreenObject(url);
      css3dScene.add(obj);
      return obj;
    });

    // ── WebGL renderer ───────────────────────────────────────────────────
    status('Starting renderer…');
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f5);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    Object.assign(renderer.domElement.style, {
      position: 'fixed', top: '0', left: '0', zIndex: '0',
    });
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

    // ── Procedural phone placeholders (one per slot while GLB loads) ──────
    const proceduralPhones = phoneOffsets.map(x => {
      const p = createPhone();
      p.position.x = x;
      scene.add(p);
      return p;
    });

    // ── Load GLB, clone once per phone slot ───────────────────────────────
    const loader = new GLTFLoader();
    loader.load('/1b338ec19f15ad72904b%20(1).gltf', (gltf) => {
      // Compute scale factor once from the template
      const template = gltf.scene;
      template.updateMatrixWorld(true);
      const rawBox = new THREE.Box3().setFromObject(template);
      const rawSize = new THREE.Vector3();
      rawBox.getSize(rawSize);
      const scaleFactor = PH / rawSize.y;

      phoneOffsets.forEach((offsetX, i) => {
        // Independent clone per phone — shares geometry/materials, not transforms
        const model = template.clone(true);
        scene.add(model);
        model.scale.setScalar(scaleFactor);
        model.updateMatrixWorld(true);

        // Centre clone at its X offset
        const scaledBox = new THREE.Box3().setFromObject(model);
        const centre = new THREE.Vector3();
        scaledBox.getCenter(centre);
        model.position.set(offsetX - centre.x, -centre.y, -centre.z);
        model.updateMatrixWorld(true);

        // Pin CSS3D overlay to the detected screen face
        const screenInfo = findScreenMesh(model);
        if (screenInfo) {
          const sb = new THREE.Box3().setFromObject(screenInfo.mesh);
          const sc = new THREE.Vector3(); sb.getCenter(sc);
          const ss = new THREE.Vector3(); sb.getSize(ss);

          const screenObj = screenObjs[i];
          screenObj.quaternion.identity();                    // must face +Z toward camera
          screenObj.position.set(sc.x, sc.y, sc.z + 0.2);
          screenObj.scale.set(ss.x / SW, ss.y / SH, 1);
          const cssRadius = SCREEN_CORNER_R / (ss.x / SW);
          screenObj.element.style.borderRadius = `${cssRadius.toFixed(1)}px`;
        }
      });

      proceduralPhones.forEach(p => p.visible = false);
      status('Three.js WebGL — 3 × iPhone (GLB loaded)');
    }, undefined, (err) => {
      console.error('GLB load error:', err);
      status('ERR: could not load GLTF model — check console');
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

    setupUI(css3dRenderer.domElement, controls);

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
