// @ts-nocheck
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ── Config ────────────────────────────────────────────────────────────────────
const SITE_URL = 'https://theme-coup-83657991.figma.site';

// iPhone 16 dimensions (393×852 screen, scaled ~5×)
const PW  = 430;   // body width
const PH  = 940;   // body height
const PD  = 38;    // depth (7.8 mm — thinner than 15 Pro)
const PR  = 58;    // corner radius (iPhone 16 squircle)

// Screen — near-edge-to-edge with very thin bezels
const SW  = 393;   // screen width  (iPhone 16 logical pts)
const SH  = 852;   // screen height (iPhone 16 logical pts)
const SCREEN_Y = -6; // minimal chin offset
// Corner radius in world units — tune this one value to match the GLB model.
// world unit ≈ 1 CSS px at scale 1; iPhone 12 ≈ 47pt at 390pt wide ≈ 12 %.
const SCREEN_CORNER_R = 65;

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

  // Materials — iPhone 16 White / Natural Titanium
  const frame    = new THREE.MeshStandardMaterial({ color: 0xd8d8dc, roughness: 0.14, metalness: 0.80 });
  const glassBack= new THREE.MeshStandardMaterial({ color: 0xf0f0f5, roughness: 0.05, metalness: 0.12,
    envMapIntensity: 1.2 });
  const frontGlass=new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.04, metalness: 0.10 });
  const camMetal = new THREE.MeshStandardMaterial({ color: 0xb8b8be, roughness: 0.08, metalness: 0.96 });
  const camLens  = new THREE.MeshStandardMaterial({ color: 0x010103, roughness: 0.03, metalness: 0.05 });
  const camSapph = new THREE.MeshStandardMaterial({ color: 0x06060f, roughness: 0.03, metalness: 0.06,
    transparent: true, opacity: 0.95 });
  const flash    = new THREE.MeshStandardMaterial({ color: 0xfffbe0, roughness: 0.20,
    emissive: new THREE.Color(0xffee88), emissiveIntensity: 0.4 });
  const port     = new THREE.MeshStandardMaterial({ color: 0x888890, roughness: 0.5, metalness: 0.6 });

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

  // ── Phone body — single ExtrudeGeometry for true rounded corners ─────────
  // Bevel rounds the front/back edges; rrShape rounds the corners in XY.
  const bodyGeo = new THREE.ExtrudeGeometry(rrShape(PW, PH, PR), {
    depth: PD,
    bevelEnabled: true,
    bevelThickness: 5,
    bevelSize: 4,
    bevelSegments: 12,
  });
  // Centre along Z so z=0 is the phone midpoint
  bodyGeo.translate(0, 0, -PD / 2);
  const body = new THREE.Mesh(bodyGeo, frame);
  g.add(body);

  // ── Back glass overlay ────────────────────────────────────────────────────
  const backFace = new THREE.Mesh(
    new THREE.ShapeGeometry(rrShape(PW - 6, PH - 6, PR - 3), 80), glassBack
  );
  backFace.rotation.y = Math.PI;
  backFace.position.z = -PD / 2 - 0.5;
  g.add(backFace);

  // ── Apple logo (back, vertically centred, slightly above mid) ─────────────
  // Approximated as a circle with a subtle metallic sheen
  const appleMat = new THREE.MeshStandardMaterial({
    color: 0xc8c8d0, roughness: 0.10, metalness: 0.85,
    transparent: true, opacity: 0.75,
  });
  const appleDisc = new THREE.Mesh(new THREE.CircleGeometry(38, 64), appleMat);
  appleDisc.rotation.y = Math.PI;
  appleDisc.position.set(0, 60, -PD / 2 - 0.6);
  g.add(appleDisc);

  // ── Back camera module — triple-lens triangle (Pro style) ────────────────
  const camCX = -58;          // module centre X (top-left quadrant of back)
  const camCY = hh - 160;     // module centre Y

  // Raised glass pad — squarish, slightly rounded
  const camPadMat = new THREE.MeshStandardMaterial({
    color: 0xd0d0d8, roughness: 0.08, metalness: 0.22
  });
  const camPad = new THREE.Mesh(new THREE.BoxGeometry(140, 148, 10), camPadMat);
  camPad.position.set(camCX, camCY, -PD / 2 - 5);
  g.add(camPad);

  // Brushed aluminum module frame ring
  const camFrameMat = new THREE.MeshStandardMaterial({
    color: 0xc0c0c8, roughness: 0.06, metalness: 0.97
  });
  const camFrame = new THREE.Mesh(new THREE.BoxGeometry(138, 146, 12), camFrameMat);
  camFrame.position.set(camCX, camCY, -PD / 2 - 6.5);
  g.add(camFrame);

  // Triple lenses — triangle arrangement (top-left, top-right, bottom-centre)
  // Matches the Figma reference design
  const triLenses = [
    { offset: [-30, 32],  outerR: 26, innerR: 20, glassR: 16 }, // wide (top-left)
    { offset: [ 30, 32],  outerR: 26, innerR: 20, glassR: 16 }, // ultrawide (top-right)
    { offset: [  0, -28], outerR: 28, innerR: 22, glassR: 17 }, // telephoto (bottom-centre)
  ];
  triLenses.forEach(({ offset: [lx, ly], outerR, innerR, glassR }) => {
    // Outer housing ring
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(outerR, outerR, 10, 64), camMetal);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(camCX + lx, camCY + ly, -PD / 2 - 12);
    g.add(ring);

    // Inner lens barrel
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(innerR, innerR, 12, 64), camLens);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(camCX + lx, camCY + ly, -PD / 2 - 12.5);
    g.add(barrel);

    // Sapphire cover glass — outer ring accent
    const glassRing = new THREE.Mesh(new THREE.CircleGeometry(glassR + 2, 64), camMetal);
    glassRing.rotation.y = Math.PI;
    glassRing.position.set(camCX + lx, camCY + ly, -PD / 2 - 17.5);
    g.add(glassRing);

    // Sapphire cover glass — dark lens face
    const glassFace = new THREE.Mesh(new THREE.CircleGeometry(glassR, 64), camSapph);
    glassFace.rotation.y = Math.PI;
    glassFace.position.set(camCX + lx, camCY + ly, -PD / 2 - 18);
    g.add(glassFace);

    // Specular highlight dot (centre of lens)
    const specMat = new THREE.MeshStandardMaterial({
      color: 0x8888cc, roughness: 0.0, metalness: 0.0,
      transparent: true, opacity: 0.28
    });
    const spec = new THREE.Mesh(new THREE.CircleGeometry(glassR * 0.35, 32), specMat);
    spec.rotation.y = Math.PI;
    spec.position.set(camCX + lx - 3, camCY + ly + 3, -PD / 2 - 18.2);
    g.add(spec);
  });

  // Flash — top-right corner of module
  const flashMesh = new THREE.Mesh(new THREE.CylinderGeometry(11, 11, 9, 32), flash);
  flashMesh.rotation.x = Math.PI / 2;
  flashMesh.position.set(camCX + 48, camCY + 45, -PD / 2 - 12);
  g.add(flashMesh);
  const flashInner = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 11, 32),
    new THREE.MeshStandardMaterial({ color: 0xfff8dd, roughness: 0.10,
      emissive: new THREE.Color(0xffe070), emissiveIntensity: 0.6 }));
  flashInner.rotation.x = Math.PI / 2;
  flashInner.position.set(camCX + 48, camCY + 45, -PD / 2 - 13);
  g.add(flashInner);

  // Microphone pinhole — below flash
  const micMat = new THREE.MeshStandardMaterial({ color: 0x505055, roughness: 0.8 });
  const mic = new THREE.Mesh(new THREE.CircleGeometry(4.5, 16), micMat);
  mic.rotation.y = Math.PI;
  mic.position.set(camCX + 48, camCY + 20, -PD / 2 - 10);
  g.add(mic);

  // ── Dynamic Island (front, top-centre pill) ───────────────────────────────
  const diMat = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.5 });
  const di = new THREE.Mesh(new THREE.ShapeGeometry(rrShape(130, 36, 18), 64), diMat);
  di.position.set(0, SCREEN_Y + shh - 30, PD / 2 + 1.2);
  g.add(di);

  // ── USB-C port (bottom centre) — narrower than Lightning ─────────────────
  const usbcOuter = new THREE.Mesh(new THREE.BoxGeometry(34, 12, PD + 2), port);
  usbcOuter.position.set(0, -hh, 0);
  g.add(usbcOuter);

  // USB-C inner connector detail
  const usbcInner = new THREE.Mesh(new THREE.BoxGeometry(24, 7, PD + 4),
    new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.5, metalness: 0.6 }));
  usbcInner.position.set(0, -hh, 0);
  g.add(usbcInner);

  // Speaker grilles (symmetric bottom)
  [-90, 90].forEach(x => {
    for (let i = 0; i < 5; i++) {
      const dot = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, PD + 2, 8), port);
      dot.rotation.x = Math.PI / 2;
      dot.position.set(x + i * 9 - 18, -hh, 0);
      g.add(dot);
    }
  });

  // ── Power button (right side, upper) ─────────────────────────────────────
  const power = new THREE.Mesh(new THREE.BoxGeometry(6, 90, 13), frame);
  power.position.set(hw + 3, 80, 0);
  g.add(power);

  // ── Camera Control button (right side, lower — iPhone 16 exclusive) ───────
  // Capsule-shaped button below the power button
  const ccShape = rrShape(60, 13, 6);
  const ccBtn = new THREE.Mesh(new THREE.ShapeGeometry(ccShape, 32),
    new THREE.MeshStandardMaterial({ color: 0x3a3a3c, roughness: 0.15, metalness: 0.82 }));
  ccBtn.rotation.y = Math.PI / 2;
  // Extrude via a thin box + the shape for the side face
  const ccBody = new THREE.Mesh(new THREE.BoxGeometry(7, 60, 13), frame);
  ccBody.position.set(hw + 3, -80, 0);
  g.add(ccBody);

  // ── Volume buttons (left side) ────────────────────────────────────────────
  // Mute/silent switch (top), vol-up, vol-down
  [[-110, 48], [10, 80], [110, 80]].forEach(([y, bh]) => {
    const vol = new THREE.Mesh(new THREE.BoxGeometry(6, bh, 13), frame);
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
    borderRadius: '44px',   // matches iPhone 12 screen corner radius at 393px div width
  });

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

    // ── CSS3D renderer (z-index 1, on top) ──────────────────────────────
    const css3dScene = new THREE.Scene();
    const css3dRenderer = new CSS3DRenderer();
    css3dRenderer.setSize(window.innerWidth, window.innerHeight);
    Object.assign(css3dRenderer.domElement.style, {
      position: 'fixed', top: '0', left: '0', zIndex: '1', pointerEvents: 'none',
    });
    document.body.appendChild(css3dRenderer.domElement);
    const screenObj = createScreenObject();
    css3dScene.add(screenObj);

    // ── WebGL renderer (z-index 0, below) ───────────────────────────────
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

    // ── Lighting — soft natural studio (matches Figma reference) ─────────
    // Hemisphere: warm sky above, neutral ground below
    scene.add(new THREE.HemisphereLight(0xffffff, 0xe8e8f0, 1.0));

    // Key light — soft upper-right (main highlight on silver)
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(400, 600, 800);
    scene.add(key);

    // Left fill — cool, very soft (opens up the shadow side)
    const fill = new THREE.DirectionalLight(0xdde8ff, 0.7);
    fill.position.set(-500, 100, 400);
    scene.add(fill);

    // Ground bounce — simulates light reflecting off white studio floor
    const bounce = new THREE.DirectionalLight(0xffffff, 0.4);
    bounce.position.set(0, -600, 300);
    scene.add(bounce);

    // ── Procedural phone — shown as placeholder while GLB loads ──────────
    const proceduralPhone = createPhone();
    scene.add(proceduralPhone);

    // ── Load hand + phone GLB ─────────────────────────────────────────────
    const loader = new GLTFLoader();
    loader.load('/i_phone12.glb', (gltf) => {
      const model = gltf.scene;

      // 1. Add at native scale, force matrix update before any Box3 calls.
      scene.add(model);
      model.updateMatrixWorld(true);

      // 2. Scale so total model height = PH — predictable, camera-friendly.
      const rawBox = new THREE.Box3().setFromObject(model);
      const rawSize = new THREE.Vector3();
      rawBox.getSize(rawSize);
      model.scale.setScalar(PH / rawSize.y);
      model.updateMatrixWorld(true);

      // 3. Centre at world origin.
      const scaledBox = new THREE.Box3().setFromObject(model);
      const centre = new THREE.Vector3();
      scaledBox.getCenter(centre);
      model.position.set(-centre.x, -centre.y, -centre.z);
      model.updateMatrixWorld(true);

      // 4. Find the screen mesh — log all meshes so the name is visible in console.
      const TARGET_ASPECT = SW / SH;          // ≈ 0.461
      const meshInfo = [];
      model.traverse(child => {
        if (!child.isMesh) return;
        const mb = new THREE.Box3().setFromObject(child);
        const ms = new THREE.Vector3();
        const mc = new THREE.Vector3();
        mb.getSize(ms); mb.getCenter(mc);
        const d = [ms.x, ms.y, ms.z].sort((a, b) => b - a); // desc
        const faceAspect = d[1] / Math.max(d[0], 1e-9);
        const flatness   = d[2] / Math.max(d[0], 1e-9);
        console.log('[GLB]', `"${child.name}"`,
          `w:${ms.x.toFixed(1)} h:${ms.y.toFixed(1)} d:${ms.z.toFixed(1)}`,
          `face:${faceAspect.toFixed(3)} flat:${flatness.toFixed(3)}`,
          `cz:${mc.z.toFixed(1)}`);
        meshInfo.push({ mesh: child, size: ms, center: mc, dims: d, faceAspect, flatness });
      });

      // Pass A — explicit name match.
      const namePatterns = ['screen', 'display', 'glass_front', 'front_glass', 'lcd', 'panel'];
      let screenInfo = meshInfo.find(({ mesh }) =>
        namePatterns.some(p => mesh.name.toLowerCase().includes(p))
      );

      // Pass B — flat portrait rect, nearest to iPhone aspect, most positive Z centre.
      if (!screenInfo) {
        const cands = meshInfo
          .filter(({ faceAspect, flatness }) =>
            faceAspect > 0.35 && faceAspect < 0.65 && flatness < 0.12
          )
          .sort((a, b) => {
            const da = Math.abs(a.faceAspect - TARGET_ASPECT);
            const db = Math.abs(b.faceAspect - TARGET_ASPECT);
            // Among equally-close matches prefer frontmost Z (highest Z centre).
            if (Math.abs(da - db) < 0.02) return b.center.z - a.center.z;
            return da - db;
          });
        screenInfo = cands[0] ?? null;
        if (screenInfo)
          console.log('[GLB] screen by heuristic →', `"${screenInfo.mesh.name}"`);
        else
          console.warn('[GLB] no screen mesh — overlay stays at default position');
      }

      // 5. Pin CSS3D overlay to screen face.
      //    IMPORTANT: do NOT copy worldQuat — that rotates the div to face the
      //    wrong direction (down, back, etc).  The CSS3DObject must keep identity
      //    rotation so it faces +Z toward the camera, same as a flat phone screen.
      if (screenInfo) {
        const sb = new THREE.Box3().setFromObject(screenInfo.mesh);
        const sc = new THREE.Vector3(); sb.getCenter(sc);
        const ss = new THREE.Vector3(); sb.getSize(ss);
        console.log('[GLB] screen →',
          `x:${sc.x.toFixed(1)} y:${sc.y.toFixed(1)} z:${sc.z.toFixed(1)}`,
          `| ${ss.x.toFixed(1)} × ${ss.y.toFixed(1)}`);

        screenObj.quaternion.identity();            // always face the camera (+Z)
        screenObj.position.set(sc.x, sc.y, sc.z + 0.2); // flush against the glass
        screenObj.scale.set(ss.x / SW, ss.y / SH, 1);

        // Compute CSS border-radius so it matches the GLB model's physical corner.
        // SCREEN_CORNER_R is in world units; divide by the scale factor to get CSS px.
        const cssRadius = SCREEN_CORNER_R / (ss.x / SW);
        screenObj.element.style.borderRadius = `${cssRadius.toFixed(1)}px`;
      }

      // 6. Hide procedural phone now that GLB is live.
      proceduralPhone.visible = false;
      status('Three.js WebGL — iPhone 12 (GLB)');
    }, undefined, (err) => {
      console.error('GLB load error:', err);
      status('ERR: could not load i_phone12.glb');
    });

    // ── Subtle orbit rings — light gray to complement natural lighting ────
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
