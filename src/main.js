import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

// ── Config ────────────────────────────────────────────────────────────────────
const SITE_URL = 'https://theme-coup-83657991.figma.site';

// iPhone 15 Pro dimensions (scaled ~5×)
const PW  = 355;   // body width
const PH  = 726;   // body height
const PD  = 40;    // depth
const PR  = 54;    // corner radius (rounder than X)

// Screen — near-edge-to-edge with thin bezels
const SW  = 326;   // screen width
const SH  = 664;   // screen height
const SCREEN_Y = -8; // slight chin offset

const CAM_Z = 1300;

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

// ── iPhone X body ─────────────────────────────────────────────────────────────
function createPhone() {
  const g = new THREE.Group();
  const hw = PW / 2, hh = PH / 2;
  const shw = SW / 2, shh = SH / 2;

  // Materials — Space Black Titanium
  const frame    = new THREE.MeshStandardMaterial({ color: 0x1c1c1e, roughness: 0.12, metalness: 0.95 });
  const glassBack= new THREE.MeshStandardMaterial({ color: 0x0d0d12, roughness: 0.08, metalness: 0.15 });
  const frontGlass=new THREE.MeshStandardMaterial({ color: 0x060609, roughness: 0.05, metalness: 0.10 });
  const camMetal = new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.10, metalness: 0.98 });
  const camLens  = new THREE.MeshStandardMaterial({ color: 0x020205, roughness: 0.04, metalness: 0.05 });
  const camSapph = new THREE.MeshStandardMaterial({ color: 0x0d0d20, roughness: 0.04, metalness: 0.10,
    transparent: true, opacity: 0.92 });
  const flash    = new THREE.MeshStandardMaterial({ color: 0xfffbe0, roughness: 0.25,
    emissive: new THREE.Color(0xaa9955), emissiveIntensity: 0.3 });
  const port     = new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 0.9 });

  // ── Front face (bezel ring with screen hole) ──────────────────────────────
  const frontShape = rrShape(PW, PH, PR);
  // Screen hole
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

  // ── Stainless steel side frame (4 bars) ──────────────────────────────────
  const T = 16; // frame thickness
  [
    [0,   hh - T / 2, 0, PW,       T,     PD],
    [0,  -hh + T / 2, 0, PW,       T,     PD],
    [-hw + T / 2, 0,  0, T,  PH - T*2, PD],
    [ hw - T / 2, 0,  0, T,  PH - T*2, PD],
  ].forEach(([x, y, z, bw, bh, bd]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), frame);
    m.position.set(x, y, z);
    g.add(m);
  });

  // ── Back glass ────────────────────────────────────────────────────────────
  const backFace = new THREE.Mesh(
    new THREE.ShapeGeometry(rrShape(PW - 4, PH - 4, PR - 2), 64), glassBack
  );
  backFace.rotation.y = Math.PI;
  backFace.position.z = -PD / 2 - 0.5;
  g.add(backFace);

  // Back body fill (sides show the frame frame wrapping around)
  const backBody = new THREE.Mesh(new THREE.BoxGeometry(PW, PH, PD), glassBack);
  g.add(backBody);

  // ── Back camera module ────────────────────────────────────────────────────
  // Raised glass square (top-left of back)
  const camPad = new THREE.Mesh(
    new THREE.BoxGeometry(110, 120, 8),
    new THREE.MeshStandardMaterial({ color: 0x111116, roughness: 0.10, metalness: 0.15 })
  );
  camPad.position.set(-55, hh - 140, -PD / 2 - 4);
  g.add(camPad);

  // Camera module frame
  const camFrame = new THREE.Mesh(
    new THREE.BoxGeometry(108, 118, 10),
    new THREE.MeshStandardMaterial({ color: 0x2c2c34, roughness: 0.08, metalness: 0.95 })
  );
  camFrame.position.set(-55, hh - 140, -PD / 2 - 5.5);
  g.add(camFrame);

  // Dual lenses (vertical arrangement)
  [[0, 26], [0, -26]].forEach(([lx, ly]) => {
    // Outer ring
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(26, 26, 8, 48), camMetal);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(-55 + lx, hh - 140 + ly, -PD / 2 - 10);
    g.add(ring);

    // Inner ring
    const innerRing = new THREE.Mesh(new THREE.CylinderGeometry(20, 20, 10, 48), camLens);
    innerRing.rotation.x = Math.PI / 2;
    innerRing.position.set(-55 + lx, hh - 140 + ly, -PD / 2 - 10.5);
    g.add(innerRing);

    // Sapphire lens glass
    const glass = new THREE.Mesh(new THREE.CircleGeometry(16, 48), camSapph);
    glass.rotation.y = Math.PI;
    glass.position.set(-55 + lx, hh - 140 + ly, -PD / 2 - 15.5);
    g.add(glass);
  });

  // Flash
  const flashMesh = new THREE.Mesh(new THREE.CircleGeometry(9, 24), flash);
  flashMesh.rotation.y = Math.PI;
  flashMesh.position.set(-18, hh - 140, -PD / 2 - 10);
  g.add(flashMesh);

  // Microphone dot (between lenses, right of module)
  const mic = new THREE.Mesh(new THREE.CircleGeometry(4, 16),
    new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.8 }));
  mic.rotation.y = Math.PI;
  mic.position.set(-22, hh - 140 - 30, -PD / 2 - 8.5);
  g.add(mic);

  // ── Dynamic Island (front, top-centre pill) ───────────────────────────────
  const diMat = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.5 });
  const di = new THREE.Mesh(new THREE.ShapeGeometry(rrShape(126, 34, 17), 48), diMat);
  di.position.set(0, SCREEN_Y + shh - 28, PD / 2 + 1.2);
  g.add(di);

  // ── Lightning port (bottom centre) ───────────────────────────────────────
  const lightningPort = new THREE.Mesh(new THREE.BoxGeometry(52, 16, PD + 2), port);
  lightningPort.position.set(0, -hh, 0);
  g.add(lightningPort);

  // Speaker grilles (symmetric bottom)
  [-90, 90].forEach(x => {
    for (let i = 0; i < 5; i++) {
      const dot = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, PD + 2, 8), port);
      dot.rotation.x = Math.PI / 2;
      dot.position.set(x + i * 9 - 18, -hh, 0);
      g.add(dot);
    }
  });

  // ── Power button (right side) ─────────────────────────────────────────────
  const power = new THREE.Mesh(new THREE.BoxGeometry(6, 80, 12), frame);
  power.position.set(hw + 3, 60, 0);
  g.add(power);

  // ── Volume buttons (left side) ────────────────────────────────────────────
  [[-90, 50], [30, 72], [130, 72]].forEach(([y, bh]) => {
    const vol = new THREE.Mesh(new THREE.BoxGeometry(6, bh, 12), frame);
    vol.position.set(-hw - 3, y, 0);
    g.add(vol);
  });

  return g;
}

// ── Live website iframe (CSS3DObject) ─────────────────────────────────────────
function createScreenObject() {
  const wrap = document.createElement('div');
  Object.assign(wrap.style, {
    position: 'relative',
    width: `${SW}px`, height: `${SH}px`,
    overflow: 'hidden', background: '#000',
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    borderRadius: '6px',
  });

  // Dynamic Island overlay (pill centred at top of iframe)
  const notchEl = document.createElement('div');
  Object.assign(notchEl.style, {
    position: 'absolute', top: '11px', left: '50%',
    transform: 'translateX(-50%)',
    width: '126px', height: '34px',
    background: '#000',
    borderRadius: '17px',
    zIndex: '5',
  });
  wrap.appendChild(notchEl);

  // Status bar tint
  const statusBar = document.createElement('div');
  Object.assign(statusBar.style, {
    position: 'absolute', top: '0', left: '0', right: '0',
    height: '44px', zIndex: '4',
    background: 'linear-gradient(rgba(0,0,0,0.35), transparent)',
    pointerEvents: 'none',
  });
  wrap.appendChild(statusBar);

  const iframe = document.createElement('iframe');
  iframe.src = SITE_URL;
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

// ── UI toggle ─────────────────────────────────────────────────────────────────
function setupUI(css3dEl, controls) {
  let interactMode = false;
  const btn = document.createElement('button');
  btn.textContent = '🖱  Interact with site';
  Object.assign(btn.style, {
    position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
    zIndex: '10', background: 'rgba(255,255,255,0.1)', color: '#fff',
    border: '1px solid rgba(255,255,255,0.25)', borderRadius: '24px',
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
    document.body.style.background = '#ffffff';

    const camera = new THREE.PerspectiveCamera(
      45, window.innerWidth / window.innerHeight, 1, 10000
    );
    camera.position.set(0, 60, CAM_Z);
    camera.lookAt(0, 0, 0);

    // ── CSS3D renderer (z-index 1, on top) ──────────────────────────────
    const css3dScene = new THREE.Scene();
    const css3dRenderer = new CSS3DRenderer();
    css3dRenderer.setSize(window.innerWidth, window.innerHeight);
    Object.assign(css3dRenderer.domElement.style, {
      position: 'fixed', top: '0', left: '0', zIndex: '1', pointerEvents: 'none',
    });
    document.body.appendChild(css3dRenderer.domElement);
    css3dScene.add(createScreenObject());

    // ── WebGL renderer (z-index 0, below) ───────────────────────────────
    status('Starting renderer…');
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    Object.assign(renderer.domElement.style, {
      position: 'fixed', top: '0', left: '0', zIndex: '0',
    });
    document.body.appendChild(renderer.domElement);

    // ── Lighting ─────────────────────────────────────────────────────────
    // Strong ambient so metallic objects are never pitch black
    scene.add(new THREE.AmbientLight(0xffffff, 0.9));

    const key = new THREE.DirectionalLight(0xffffff, 3.5);
    key.position.set(400, 700, 900);
    scene.add(key);

    const rim = new THREE.DirectionalLight(0xffffff, 1.5);
    rim.position.set(-600, 100, -500);
    scene.add(rim);

    const fill = new THREE.DirectionalLight(0xffffff, 0.8);
    fill.position.set(0, -600, 400);
    scene.add(fill);

    // ── Phone ─────────────────────────────────────────────────────────────
    scene.add(createPhone());

    // ── Futuristic green axis rings ───────────────────────────────────────
    const axisMat = new THREE.MeshBasicMaterial({
      color: 0x00ff88, transparent: true, opacity: 0.28, side: THREE.DoubleSide,
    });
    const R = 500, tube = 0.7;
    const yRing = new THREE.Mesh(new THREE.TorusGeometry(R, tube, 4, 160), axisMat);
    const xRing = new THREE.Mesh(new THREE.TorusGeometry(R, tube, 4, 160), axisMat);
    xRing.rotation.x = Math.PI / 2;
    const zRing = new THREE.Mesh(new THREE.TorusGeometry(R, tube, 4, 160), axisMat);
    zRing.rotation.y = Math.PI / 2;
    // Tick marks — small bright segments at 90° intervals on each ring
    const tickMat = new THREE.MeshBasicMaterial({ color: 0x00ffaa, transparent: true, opacity: 0.7 });
    [yRing, xRing, zRing].forEach(ring => {
      for (let i = 0; i < 4; i++) {
        const tick = new THREE.Mesh(new THREE.TorusGeometry(R, tube * 2, 4, 12, 0.05), tickMat);
        tick.rotation.copy(ring.rotation);
        tick.rotation.y += (i * Math.PI) / 2;
        scene.add(tick);
      }
    });
    scene.add(yRing, xRing, zRing);

    // ── Subtle ground shadow plane ────────────────────────────────────────
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
    controls.maxDistance = 3000;
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

    status('Three.js WebGL — iPhone 15 Pro');

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
