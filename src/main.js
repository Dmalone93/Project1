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
  'https://heart-engine-07151053.figma.site',
];

const PROTO_NAMES = ['Collection with Small Product Type Images', 'Collection with Colour Filter', 'Collection with Tabs', 'Quick Add with Matching Set feature'];


// Each insight is [sentiment, text] where sentiment is '+' (positive), '-' (negative), or '' (neutral).
const INSIGHTS = [
  // Prototype 1
  [
    ['+', 'Image filter buttons were intuitive, with clear visibility of active vs. default states.'],
    ['-', '~60% missed the grid toggle; of those who noticed, half valued it for quick browsing while the rest had no interest in the feature.'],
    ['',  'Colour filters were popular but users gravitated toward filtering by colour over product type; moving colour into the filter panel had no notable UX impact.'],
    ['+', 'Collection property scales were more informative than labels alone, giving users a clearer sense of collection DNA.'],
    ['+', 'Users found the model size button on the product image very useful as it is information they look for when making a purchase. DFYNE staff noted that it would help users as sizing is a very common issue from customers.'],
    ['',  'The user prefers a grid layout that she can change to allows her to scan a large amount of information quickly. She keeps her emails zoomed out to maximize visibility, which reflects her preference for seeing more content at once.'],
    ['+', 'Including a clear collection summary (e.g., highlighting key features like low-waist, sculpting, seamless, etc.) on the collection page is highly valuable and improves the browsing experience.'],
    ['-', 'Using DFYNE\'s true product colors instead of generic Shopify colors would create a more cohesive and premium brand feel.'],
    ['+', 'Across the board, users showed a clear preference for smaller filter thumbnails, as they make the interface feel cleaner and easier to navigate.'],
  ],
  // Prototype 2
  [
    ['+', 'All users navigated back to the collection page via the breadcrumb bar.'],
    ['+', 'Feature labels at the top of the collection were seen as useful and unobtrusive.'],
    ['-', 'One user flagged the product type images as too large, consuming unnecessary space.'],
    ['+', 'Colour filters were a standout — users bypassed product type images entirely and went straight to colour to find what they needed.'],
    ['+', 'The combination of 3-column grid + colour filtering proved an effective way to quickly scan the full catalogue.'],
    ['-', 'Some users did find the colors to be a distraction from the product type'],
    ['-', 'Using DFYNE’s true product colors instead of generic Shopify colors would create a more cohesive and premium brand feel.'],
  ],
  // Prototype 3
  [
    ['+', 'Users found the tab filter component clean and less invasive.'],
    ['-', 'The feature containers (low-waist etc) were getting clicked like buttons.'],
    ['-', 'Users did not like the placement of the more info — it distracted them from the tabs.'],
    ['+', 'Users liked being able to see the number of products their query resulted in.'],
    ['-', 'Users found the description modal information too busy.'],
  ],
  // Quick Add
  [
    ['+', 'All users had an initial reaction of delight when noticing the matching set feature in the quick add modal.'],
    ['+', 'Users dislike upselling in the basket as it feels pushy — but serving products at the point of buying intent feels more organic.'],
    ['-', 'Users were initially confused whether the single matching item was in their basket, but confidence grew when multiple products were shown in the container.'],
    ['-', 'Feedback noted the add-to-cart felt too instant with no visual feedback — this has since been rectified.'],
    ['+', 'Positive responses to the first modal screen — users liked seeing only relevant info, with the option to explore more on the product page.'],
    ['+', 'Users praised the clean UI: size buttons were easy to tap and add to cart was intuitive.'],
    ['+', 'Users very easily navigated back to the collection via the breadcrumb button on the product page.'],
    ['+', "When prompted to find a different colour, almost all users clicked '10 colors available' — they found it apparent and clear what the link would do."],
    ['+', 'All users agreed that adding the matching set at this point in their journey felt natural and delightful.'],
    ['+', 'Users liked the "Continue Shopping" primary CTA — they dislike being pushed to checkout and appreciated having the option to return to the collection easily.'],
  ],
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
  // Disabled by default so clicks fall through to the WebGL canvas.
  // focusPhone enables only the active screen wrapper + its iframe.
  wrap.style.pointerEvents = 'none';
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
  // Disabled initially so clicks pass through to the WebGL canvas for phone selection.
  // focusPhone enables only the active screen; unfocusPhone disables all.
  iframe.style.pointerEvents = 'none';
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
function isMobile() { return window.innerWidth < 768; }

function createNotesPanel() {
  const panel = document.createElement('div');
  panel.style.position = 'fixed';
  panel.style.transition = 'transform 0.42s cubic-bezier(0.34,1.56,0.64,1), opacity 0.32s ease';
  panel.style.opacity = '0';
  panel.style.pointerEvents = 'none';
  panel.style.overflowY = 'auto';
  panel.style.background = 'rgba(255,255,255,0.96)';
  panel.style.backdropFilter = 'blur(24px)';
  panel.style.boxShadow = '0 8px 40px rgba(0,0,0,0.13)';
  panel.style.zIndex = '30';
  panel.style.fontFamily = '-apple-system, BlinkMacSystemFont, sans-serif';
  panel.style.boxSizing = 'border-box';
  document.body.appendChild(panel);
  return panel;
}

function showPanel(panel, index, onClose) {
  const insightsHTML = INSIGHTS[index].map(([s, text]) => {
    const dot  = s === '+' ? '#34c759' : s === '-' ? '#ff3b30' : '#646cff';
    const bg   = s === '+' ? 'rgba(52,199,89,0.10)' : s === '-' ? 'rgba(255,59,48,0.08)' : 'transparent';
    const pad  = s ? '6px 8px 6px 8px' : '0';
    return `<li style="display:flex;gap:10px;align-items:flex-start;margin-bottom:8px;background:${bg};border-radius:8px;padding:${pad};">
       <span style="width:6px;height:6px;border-radius:50%;background:${dot};margin-top:6px;flex-shrink:0;"></span>
       <span style="font-size:13px;line-height:1.65;color:#3a3a3c;">${text}</span>
     </li>`;
  }).join('');

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
  panel.style.pointerEvents = 'auto';
  if (isMobile()) {
    // Full-screen sheet slides up from the bottom
    panel.style.left = '0'; panel.style.right = '0';
    panel.style.top = '0'; panel.style.bottom = '0';
    panel.style.width = '100%'; panel.style.maxHeight = '100%';
    panel.style.borderRadius = '0';
    panel.style.padding = '48px 24px 32px';
    panel.style.transform = 'translateY(0)';
  } else {
    panel.style.left = '24px'; panel.style.right = '';
    panel.style.top = '50%'; panel.style.bottom = '';
    panel.style.width = '300px'; panel.style.maxHeight = '82vh';
    panel.style.borderRadius = '20px';
    panel.style.padding = '26px 22px 24px';
    panel.style.transform = 'translateY(-50%) translateX(0)';
  }
}

function hidePanel(panel) {
  panel.style.opacity = '0';
  panel.style.pointerEvents = 'none';
  panel.style.transform = isMobile()
    ? 'translateY(100%)'
    : 'translateY(-50%) translateX(-120%)';
}

// ── Phone nav controls ────────────────────────────────────────────────────────
function createNavControls(onSelect) {
  const nav = document.createElement('div');
  nav.style.display = 'flex';
  nav.style.alignItems = 'center';
  nav.style.justifyContent = 'center';
  nav.style.gap = '6px';
  nav.style.background = 'rgba(255,255,255,0.88)';
  nav.style.backdropFilter = 'blur(12px)';
  nav.style.webkitBackdropFilter = 'blur(12px)';
  nav.style.borderRadius = '28px';
  nav.style.padding = '6px 10px';
  nav.style.border = '1px solid rgba(0,0,0,0.10)';
  nav.style.boxShadow = '0 4px 20px rgba(0,0,0,0.10)';
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
  btn.style.lineHeight = '1';
  btn.style.padding = '0';
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
  div.style.fontSize = '38px';
  div.style.fontWeight = '600';
  div.style.color = '#3a3a3c';
  div.style.letterSpacing = '-0.01em';
  div.style.background = 'rgba(255,255,255,0.65)';
  div.style.backdropFilter = 'blur(12px)';
  div.style.borderRadius = '12px';
  div.style.padding = '7px 16px';
  div.style.border = '1px solid rgba(0,0,0,0.06)';
  div.style.whiteSpace = 'nowrap';
  return new CSS3DSprite(div);
}


// ── Escape key ────────────────────────────────────────────────────────────────
function setupEscapeKey(onEscape) {
  document.addEventListener('keydown', e => { if (e.key === 'Escape') onEscape(); });
}


// ── Responsive overview distance ──────────────────────────────────────────────
// On portrait mobile the horizontal FOV is narrow — push the camera back far
// enough so all 4 phones are visible at once.
function calcOverviewZ() {
  const aspect = window.innerWidth / window.innerHeight;
  const halfFovY = (45 / 2) * (Math.PI / 180);
  const halfFovX = Math.atan(Math.tan(halfFovY) * aspect);
  // Need the frustum half-width ≥ outermost phone (1.5 × spacing) + padding
  const needed = (1.5 * PHONE_SPACING + 500) / Math.tan(halfFovX);
  return Math.max(CAM_Z, needed);
}

// Responsive focused distance — ensures the full phone body stays in frame on
// any screen size.  On narrow mobile viewports the horizontal FOV is very small
// so we must push the camera further back than the desktop FOCUSED_Z constant.
function calcFocusedZ() {
  const aspect = window.innerWidth / window.innerHeight;
  const halfFovY = (45 / 2) * (Math.PI / 180);
  const halfFovX = Math.atan(Math.tan(halfFovY) * aspect);
  // Width: keep phone within 80% of screen width
  const neededForW = (PW / 2) / (0.80 * Math.tan(halfFovX));
  // Height: camera sits 60 units above centre so bottom of phone is PH/2+60
  const neededForH = (PH / 2 + 60) / (0.88 * Math.tan(halfFovY));
  return Math.max(neededForW, neededForH, FOCUSED_Z);
}

// ── Main ──────────────────────────────────────────────────────────────────────
function init() {
  try {
    status('Booting…');
    document.body.style.background = '#f0f0f5';

    const camera = new THREE.PerspectiveCamera(
      45, window.innerWidth / window.innerHeight, 1, 20000
    );
    const initZ = calcOverviewZ();
    camera.position.set(0, 60, initZ);
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
    // CSS3DRenderer creates an internal cameraElement child div that defaults to
    // pointer-events:auto. Setting 'none' on the parent alone doesn't block it —
    // we must disable the child directly so clicks reach the WebGL canvas below.
    if (css3dRenderer.domElement.firstChild) {
      css3dRenderer.domElement.firstChild.style.pointerEvents = 'none';
    }

    // 4 phones evenly spaced, centred at x=0
    const phoneOffsets = [
      -1.5 * PHONE_SPACING,
      -0.5 * PHONE_SPACING,
       0.5 * PHONE_SPACING,
       1.5 * PHONE_SPACING,
    ];
    const screenObjs = SITES.map(url => {
      const obj = createScreenObject(url);
      css3dScene.add(obj);
      return obj;
    });

    // ── Phone title labels ───────────────────────────────────────────────
    const phoneLabels = PROTO_NAMES.map((name, i) => {
      const label = createPhoneLabel(name);
      css3dScene.add(label);
      return label;
    });

    function updateLabelLayout() {
      const mobile = isMobile();
      const y   = mobile ? -(PH / 2 + 80) : PH / 2 + 100;
      const fs  = mobile ? '22px' : '38px';
      const pad = mobile ? '5px 12px' : '7px 16px';
      phoneLabels.forEach((label, i) => {
        label.position.set(phoneOffsets[i], y, 0);
        label.element.style.fontSize = fs;
        label.element.style.padding  = pad;
      });
    }
    updateLabelLayout();

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

        // Override GLB's purple textures — only replace saturated (coloured)
        // materials; leave neutral metallic greys (camera rings etc.) intact
        const screenMesh = screenInfo?.mesh;
        model.traverse(child => {
          if (!child.isMesh || child === screenMesh) return;
          const mat = Array.isArray(child.material) ? child.material[0] : child.material;
          if (!mat?.color) return;
          const { r, g, b } = mat.color;
          const maxC = Math.max(r, g, b);
          const minC = Math.min(r, g, b);
          const saturation = maxC > 0.01 ? (maxC - minC) / maxC : 0;
          if (saturation > 0.12) child.material = darkMat; // only replace purple/coloured parts
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
    const camTarget  = new THREE.Vector3(0, 60, initZ);
    const lookTarget = new THREE.Vector3(0, 0, 0);
    let isCamAnimating = false;
    let focusedPhone = -1;

    // ── Notes panel + nav controls ────────────────────────────────────────
    const notesPanel = createNotesPanel();
    hidePanel(notesPanel); // sets correct initial hidden transform for current device

    // Mobile "View Notes" button — replaces the auto-show side panel on small screens
    const viewNotesBtn = document.createElement('button');
    viewNotesBtn.textContent = 'View Notes';
    viewNotesBtn.style.display = 'none';
    viewNotesBtn.style.background = 'rgba(255,255,255,0.88)';
    viewNotesBtn.style.backdropFilter = 'blur(12px)';
    viewNotesBtn.style.border = '1px solid rgba(0,0,0,0.10)';
    viewNotesBtn.style.borderRadius = '20px';
    viewNotesBtn.style.padding = '9px 18px';
    viewNotesBtn.style.fontSize = '14px';
    viewNotesBtn.style.fontWeight = '600';
    viewNotesBtn.style.fontFamily = '-apple-system, sans-serif';
    viewNotesBtn.style.cursor = 'pointer';
    viewNotesBtn.style.color = '#1c1c1e';
    viewNotesBtn.onclick = () => {
      if (focusedPhone >= 0) showPanel(notesPanel, focusedPhone, () => hidePanel(notesPanel));
    };

    const nav = createNavControls((target) => {
      if (target === 'prev') {
        focusPhone(focusedPhone <= 0 ? phoneOffsets.length - 1 : focusedPhone - 1);
      } else if (target === 'next') {
        focusPhone(focusedPhone < 0 ? 0 : (focusedPhone + 1) % phoneOffsets.length);
      } else {
        focusPhone(target);
      }
    });

    // Top-right bar — nav numbers + "View Notes" always sit here together
    const topRightBar = document.createElement('div');
    topRightBar.style.position = 'fixed';
    topRightBar.style.top = '20px';
    topRightBar.style.right = '20px';
    topRightBar.style.zIndex = '20';
    topRightBar.style.display = 'flex';
    topRightBar.style.alignItems = 'center';
    topRightBar.style.gap = '8px';
    topRightBar.appendChild(nav.el);
    topRightBar.appendChild(viewNotesBtn);
    document.body.appendChild(topRightBar);

    function unfocusPhone() {
      if (focusedPhone === -1) return;
      focusedPhone = -1;
      camTarget.set(0, 60, calcOverviewZ());
      lookTarget.set(0, 0, 0);
      isCamAnimating = true;
      controls.enabled = false;
      screenObjs.forEach(o => {
        o.element.style.pointerEvents = 'none';
        const f = o.element.querySelector('iframe');
        if (f) f.style.pointerEvents = 'none';
      });
      hidePanel(notesPanel);
      viewNotesBtn.style.display = 'none';
      nav.update(-1);
    }

    function focusPhone(index) {
      if (focusedPhone === index) return;
      // Disable all screens, then enable only the focused one (wrap + iframe)
      screenObjs.forEach((o, i) => {
        const active = i === index;
        o.element.style.pointerEvents = active ? 'auto' : 'none';
        const f = o.element.querySelector('iframe');
        if (f) f.style.pointerEvents = active ? 'auto' : 'none';
      });
      focusedPhone = index;
      const x = phoneOffsets[index];
      camTarget.set(x, 60, calcFocusedZ());
      lookTarget.set(x, 0, 0);
      isCamAnimating = true;
      controls.enabled = false;
      viewNotesBtn.style.display = 'block';
      if (isMobile()) {
        hidePanel(notesPanel);
      } else {
        showPanel(notesPanel, index, unfocusPhone);
      }
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
    controls.maxDistance = Math.max(8000, initZ * 1.5);
    controls.minPolarAngle = Math.PI * 0.1;
    controls.maxPolarAngle = Math.PI * 0.9;
    controls.target.set(0, 0, 0);
    controls.update();

    setupEscapeKey(unfocusPhone);

    window.addEventListener('resize', () => {
      const w = window.innerWidth, h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      css3dRenderer.setSize(w, h);
      // Recalculate overview distance for new orientation (e.g. portrait ↔ landscape)
      updateLabelLayout();
      if (focusedPhone === -1) {
        const oz = calcOverviewZ();
        controls.maxDistance = Math.max(8000, oz * 1.5);
        camTarget.set(0, 60, oz);
        camera.position.set(0, 60, oz);
        controls.update();
      }
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
