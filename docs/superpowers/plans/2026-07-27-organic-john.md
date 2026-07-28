# Organic John Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace John's flat box body/limbs with rounded capsule geometry and real
knee/elbow joints, and drive them with an organic walk/idle/jump pose instead of
the current rigid single-axis leg swing.

**Architecture:** Pure Three.js primitives (`THREE.CapsuleGeometry`, r160, already
loaded) — no external model. Each limb becomes a 2-segment pivot hierarchy (hip/
shoulder group → segment mesh → knee/elbow group → segment mesh). All new pose
logic is layered on top of the *existing* rigid-swing code without touching it,
because — critically — the remote base engine injects jump/water-slide/hawk-ride
behavior into `index.html` at runtime by searching for exact literal substrings of
its *current* text (see Global Constraints). Breaking one of those substrings
silently disables the feature it powers, with no error.

**Tech Stack:** Three.js r160 (`CapsuleGeometry`, `Group`, `MathUtils.lerp`),
vanilla JS, no build step — same as the rest of the repo.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-27-organic-john-design.md`.
- **Never alter these exact substrings in `index.html`** — the remote base engine
  (fetched at runtime from a frozen historical commit) finds and extends them via
  non-global `String.replace()`; changing so much as one character makes that
  injection silently no-op:
  - `}else{leg1.rotation.x=leg2.rotation.x=0}const target=` — this is where the
    base injects the jump leg-pose override and the `updateWaterSlide`/
    `updateBirdRide` per-frame calls. **Do not add/remove any code inside this
    literal span.** All new pose logic in this plan is added *elsewhere* in
    `animate()`, never inside this exact block.
  - `const nx=john.position.x+fx*forward+rx*strafe,nz=john.position.z+fz*forward+rz*strafe`
  - `john.position.y=heightAt(john.position.x,john.position.z);`
  - `const dist=8,camPos=new THREE.Vector3(john.position.x-Math.sin(yaw)*dist,john.position.y+5.2,john.position.z-Math.cos(yaw)*dist)`
  - `}else{a.g.position.x+=Math.cos(a.a)*a.s*dt;a.g.position.z+=Math.sin(a.a)*a.s*dt;a.g.position.y=13+Math.sin(t+a.a)*2;a.g.rotation.y=-a.a;if(Math.hypot(a.g.position.x,a.g.position.z)>75)a.a+=Math.PI}`
    (already has a `continue`-guard prepended from an earlier fix — do not touch
    this specific tail substring)
  - `John in the Island</div>` and `setWeather('sun');animate();` and `</body>`
  - None of these tasks touch any of the above — this list is here so the
    engineer recognizes them and doesn't "clean up" or reformat that code.
- `leg1`, `leg2` stay the hip pivot `Group`s; `leftArm`, `rightArm` stay the
  shoulder pivot `Group`s (existing code in `bird-rider.js`/`hidden-falls.js`
  already references these names — preserve them exactly).
- New names introduced: `leg1Knee`, `leg2Knee`, `leftElbow`, `rightElbow`.
- Every cross-file reference to a limb/joint variable that might not exist yet
  (because another task hasn't landed) must be guarded with `typeof x!=='undefined'`
  — same convention already used in `bird-rider.js`. This keeps every task
  independently deployable without crashing `animate()`.
- Deploy target: push to `origin` (the `john-in-the-island` repo) only — the user
  said not to keep updating `auto_gherk` unless asked.
- `play.html`'s `Promise.all([...])` fetch list uses cache-busting `?v=N` query
  strings per file — bump the version for every file a task modifies, following
  the existing convention (see Task 4).

---

## File Structure

- `index.html` — John's torso/head/leg geometry (Task 1), new pose logic block
  (Task 2).
- `hidden-falls.js` — arm geometry + `isSlidingWaterfall` getter (Task 1 for the
  getter, Task 3 for arms), slide pose functions (Task 3).
- `bird-rider.js` — hawk-grab/carry pose functions (Task 3).
- `play.html` — cache-busting version bumps (Task 4).

No test framework exists in this repo (it's a static, no-build Three.js page
served via GitHub Pages). "Tests" here means scripted Playwright checks against a
locally-served copy, using the same headless-Chromium setup already used earlier
this session (`playwright@1.48.0` npm package + the cached Chromium binary at
`C:\Users\Antonio Nuzzi\AppData\Local\ms-playwright\chromium-1228\chrome-win64\chrome.exe`).
Every task's verification follows this pattern:

```bash
cd "C:\Users\Antonio Nuzzi\john-in-the-island"
nohup python -m http.server 8935 --directory "C:\Users\Antonio Nuzzi\john-in-the-island" > server_test.log 2>&1 &
mkdir -p .pwtest && cd .pwtest && npm init -y >/dev/null 2>&1 && npm install playwright@1.48.0
```

Then run a small `.mjs` script with `node` against `http://localhost:8935/play.html`,
using `page.on('pageerror', ...)` to catch any error, and
`chromium.launch({ executablePath: String.raw\`C:\Users\Antonio Nuzzi\AppData\Local\ms-playwright\chromium-1228\chrome-win64\chrome.exe\` })`.
After each task, kill the python server (`for pid in $(netstat -ano | grep ":8935" | awk '{print $5}' | sort -u); do taskkill //F //PID $pid 2>/dev/null; done`)
and `rm -rf .pwtest`.

---

### Task 1: Torso/head/leg geometry + a small cross-file visibility hook

**Files:**
- Modify: `index.html` (the `john`/`body`/`head`/`leg1`/`leg2` creation block)
- Modify: `hidden-falls.js` (add one line exposing slide state)

**Interfaces:**
- Produces: `leg1`, `leg2` (now `THREE.Group` hip pivots, same names as before),
  `leg1Knee`, `leg2Knee` (new `THREE.Group` knee pivots), `body` (now a capsule
  mesh, same variable name), `head` (unchanged sphere, repositioned).
- Produces: `window.isSlidingWaterfall` — `() => boolean`, true while John is on
  the water slide. Consumed by Task 2.

- [ ] **Step 1: Replace the torso/head/leg creation block in `index.html`**

Find this exact substring (it appears once, deep inside the single-line inline
`<script>`):

```
const john=new THREE.Group();const shirt=new THREE.MeshStandardMaterial({color:0xf04c45,roughness:.8});const skin=new THREE.MeshStandardMaterial({color:0xf1bd8b,roughness:.9});const shorts=new THREE.MeshStandardMaterial({color:0x235aa6,roughness:.9});const body=new THREE.Mesh(new THREE.BoxGeometry(1.1,1.6,.65),shirt);body.position.y=2.25;body.castShadow=true;john.add(body);const head=new THREE.Mesh(new THREE.SphereGeometry(.42,16,12),skin);head.position.y=3.45;head.castShadow=true;john.add(head);const leg1=new THREE.Mesh(new THREE.BoxGeometry(.38,1.25,.42),shorts),leg2=leg1.clone();leg1.position.set(-.28,1.05,0);leg2.position.set(.28,1.05,0);john.add(leg1,leg2);john.position.set(0,heightAt(0,0),18);scene.add(john);
```

Replace it with:

```js
const john=new THREE.Group();const shirt=new THREE.MeshStandardMaterial({color:0xf04c45,roughness:.8});const skin=new THREE.MeshStandardMaterial({color:0xf1bd8b,roughness:.9});const shorts=new THREE.MeshStandardMaterial({color:0x235aa6,roughness:.9});
const body=new THREE.Mesh(new THREE.CapsuleGeometry(.42,.76,4,8),shirt);
body.scale.set(1.31,1,.77);
body.position.y=2.25;
body.castShadow=true;
john.add(body);
const head=new THREE.Mesh(new THREE.SphereGeometry(.42,16,12),skin);
head.position.y=3.35;
head.castShadow=true;
john.add(head);
function johnMakeLeg(side){
  const hip=new THREE.Group();
  hip.position.set(side*.28,1.675,0);
  const thigh=new THREE.Mesh(new THREE.CapsuleGeometry(.17,.32,4,8),shorts);
  thigh.position.y=-.33;
  thigh.castShadow=true;
  hip.add(thigh);
  const knee=new THREE.Group();
  knee.position.y=-.66;
  hip.add(knee);
  const calf=new THREE.Mesh(new THREE.CapsuleGeometry(.13,.32,4,8),skin);
  calf.position.y=-.29;
  calf.castShadow=true;
  knee.add(calf);
  return {hip,knee};
}
const johnLegL=johnMakeLeg(-1),johnLegR=johnMakeLeg(1);
const leg1=johnLegL.hip,leg2=johnLegR.hip,leg1Knee=johnLegL.knee,leg2Knee=johnLegR.knee;
john.add(leg1,leg2);
john.position.set(0,heightAt(0,0),18);
scene.add(john);
```

This preserves overall proportions: hip at the same height the old leg-top was
(`1.675`), foot tip lands within a few centimeters of the old leg-bottom
(`~0.435` vs the old `0.425`), torso spans the same vertical range as the old box
(capsule total height `.76+2*.42=1.6`, matching the box's `1.6`). Thigh capsule
uses the `shorts` material, calf uses `skin` (bare lower leg below the shorts —
free organic detail from splitting into two segments).

- [ ] **Step 2: Add the slide-state getter in `hidden-falls.js`**

Find:

```js
  let sliding=false,slideIndex=0,slideProgress=0,slideEscapeCooldown=0;

  function nearestSlideIndex(){
```

Replace with:

```js
  let sliding=false,slideIndex=0,slideProgress=0,slideEscapeCooldown=0;
  window.isSlidingWaterfall=()=>sliding;

  function nearestSlideIndex(){
```

- [ ] **Step 3: Verify locally**

Serve the repo and check with Playwright (per the File Structure section):

```js
import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: String.raw`C:\Users\Antonio Nuzzi\AppData\Local\ms-playwright\chromium-1228\chrome-win64\chrome.exe` });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = [];
page.on('pageerror', e => errs.push(e.message));
await page.goto('http://localhost:8935/play.html', { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(2000);
const info = await page.evaluate(() => ({
  hasKnees: typeof window.isSlidingWaterfall === 'function' ? 'n/a-scoped' : 'n/a', // isSlidingWaterfall is on window, leg1Knee is not (module-scoped) — see note below
  slidingNow: window.isSlidingWaterfall ? window.isSlidingWaterfall() : 'MISSING',
}));
console.log('INFO', JSON.stringify(info));
console.log('ERRORS', errs);
await page.screenshot({ path: 'john_geometry.png' });
await browser.close();
```

`leg1`/`leg1Knee`/`body`/`head` are **not** on `window` (they're local consts
inside the page's inline script, same as `john` always was) — you cannot read
them from `page.evaluate` in a fresh isolated call. To confirm the geometry
visually, rely on the screenshot: `errs` must be empty (no `CapsuleGeometry is
not a constructor` or similar), `window.isSlidingWaterfall()` must return `false`
(not `'MISSING'`), and `john_geometry.png` must show a rounded torso, rounded
head sitting close to it, and legs with a visible bend point roughly at knee
height (even though nothing is animating the knee yet in this task, the capsule
geometry itself should already look like two connected rounded segments instead
of one straight box).

Also confirm the critical anchor substring is untouched:

```bash
cd "C:\Users\Antonio Nuzzi\john-in-the-island"
grep -c "}else{leg1.rotation.x=leg2.rotation.x=0}const target=" index.html
```

Expected: `1`.

- [ ] **Step 4: Commit**

```bash
git add index.html hidden-falls.js
git commit -m "Rebuild John's torso/head/legs as rounded capsule joints"
```

---

### Task 2: Organic pose — walk knee-bend, torso bob/twist, head sway, guarded arm-swing, idle breathing, jump tuck

**Files:**
- Modify: `index.html` (`animate()`, near the end, right before the render call)

**Interfaces:**
- Consumes: `leg1`, `leg2`, `leg1Knee`, `leg2Knee`, `body`, `head`, `john`
  (Task 1). `forward`, `strafe`, `t`, `dt` (already local to `animate()`).
  Defensively: `airborne`, `verticalVelocity` (shared globals owned by the
  remote base engine), `isRidingBird` (from `bird-rider.js`),
  `isSlidingWaterfall` (from Task 1), `leftArm`, `rightArm`, `leftElbow`,
  `rightElbow` (don't exist yet until Task 3 — guarded so this task is safe to
  ship alone).
- Produces: nothing new for other tasks to consume — this task only *reads*
  the existing swing values (`leg1.rotation.x`/`leg2.rotation.x`, already set by
  the untouched original code earlier in the same `animate()` call) and layers
  additional rotations/positions on top.

- [ ] **Step 1: Insert the new pose block in `index.html`**

Find (unique, near the very end of `animate()`):

```
sea.material.color.offsetHSL(0,0,Math.sin(t*.7)*.01);renderer.render(scene,camera)
```

Replace with:

```js
const johnMoveMag=Math.abs(forward)+Math.abs(strafe);
const johnAirborne=typeof airborne!=='undefined'&&airborne;
const johnRiding=typeof isRidingBird==='function'&&isRidingBird();
const johnSliding=typeof isSlidingWaterfall==='function'&&isSlidingWaterfall();
if(!johnRiding&&!johnSliding){
  if(johnAirborne){
    const rising=typeof verticalVelocity!=='undefined'&&verticalVelocity>0;
    leg1.rotation.x=rising?-.75:-.25;
    leg2.rotation.x=rising?-.55:.35;
    leg1Knee.rotation.x=rising?1.15:.35;
    leg2Knee.rotation.x=rising?.85:.15;
    body.position.y=2.25;
    body.rotation.y=0;
    head.rotation.z=0;
    john.rotation.x=rising?-.12:.08;
    if(typeof leftArm!=='undefined'&&typeof rightArm!=='undefined'){
      leftArm.rotation.x=rising?-1.9:-1.1;
      rightArm.rotation.x=rising?-1.9:-1.1;
      if(typeof leftElbow!=='undefined'&&typeof rightElbow!=='undefined'){
        leftElbow.rotation.x=.3;
        rightElbow.rotation.x=.3;
      }
    }
  }else if(johnMoveMag>.005){
    leg1Knee.rotation.x=Math.max(0,leg1.rotation.x/.6)*.85;
    leg2Knee.rotation.x=Math.max(0,leg2.rotation.x/.6)*.85;
    body.position.y=2.25+Math.abs(leg1.rotation.x/.6)*.06;
    body.rotation.y=-leg1.rotation.x*.15;
    head.rotation.z=leg2.rotation.x*.08;
    john.rotation.x=0;
    if(typeof leftArm!=='undefined'&&typeof rightArm!=='undefined'){
      leftArm.rotation.x=-leg1.rotation.x*1.2;
      rightArm.rotation.x=-leg2.rotation.x*1.2;
      if(typeof leftElbow!=='undefined'&&typeof rightElbow!=='undefined'){
        leftElbow.rotation.x=Math.abs(leg1.rotation.x/.6)*.35;
        rightElbow.rotation.x=Math.abs(leg2.rotation.x/.6)*.35;
      }
    }
  }else{
    const breathe=Math.sin(t*1.6)*.015;
    leg1Knee.rotation.x=THREE.MathUtils.lerp(leg1Knee.rotation.x,.06,.08);
    leg2Knee.rotation.x=THREE.MathUtils.lerp(leg2Knee.rotation.x,.06,.08);
    body.position.y=2.25+breathe;
    body.rotation.y=THREE.MathUtils.lerp(body.rotation.y,0,.08);
    head.rotation.z=THREE.MathUtils.lerp(head.rotation.z,0,.08);
    john.rotation.x=THREE.MathUtils.lerp(john.rotation.x,0,.08);
    if(typeof leftArm!=='undefined'&&typeof rightArm!=='undefined'){
      leftArm.rotation.x=THREE.MathUtils.lerp(leftArm.rotation.x,0,.08);
      rightArm.rotation.x=THREE.MathUtils.lerp(rightArm.rotation.x,0,.08);
      if(typeof leftElbow!=='undefined'&&typeof rightElbow!=='undefined'){
        leftElbow.rotation.x=THREE.MathUtils.lerp(leftElbow.rotation.x,0,.08);
        rightElbow.rotation.x=THREE.MathUtils.lerp(rightElbow.rotation.x,0,.08);
      }
    }
  }
}
sea.material.color.offsetHSL(0,0,Math.sin(t*.7)*.01);renderer.render(scene,camera)
```

Why this works without touching the protected anchor: the original
`leg1.rotation.x=Math.sin(t*10)*.6` / `leg2.rotation.x=-Math.sin(t*10)*.6` (walk)
or `=0` (idle) code earlier in `animate()` — untouched — already runs first each
frame. This new block runs later in the *same* frame and *reads* whatever value
`leg1.rotation.x`/`leg2.rotation.x` ended up with, deriving knee bend, torso
bob/twist, head sway and arm swing straight from it (dividing by `.6`, the known
swing amplitude, to normalize). That keeps knee motion perfectly in sync with hip
motion without duplicating the sine/phase math, and (for the airborne branch) it
runs *after* the base engine's own injected jump-pose override
(`leg1.rotation.x=-.55;leg2.rotation.x=.35;...`, added at the protected anchor),
so this block's airborne case intentionally overrides that with a richer pose —
this is expected and correct, not a conflict.

- [ ] **Step 2: Verify walk pose (drive forward movement, sample rotations)**

```js
import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: String.raw`C:\Users\Antonio Nuzzi\AppData\Local\ms-playwright\chromium-1228\chrome-win64\chrome.exe` });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = [];
page.on('pageerror', e => errs.push(e.message));
await page.goto('http://localhost:8935/play.html', { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(1500);
await page.keyboard.down('KeyW');
await page.waitForTimeout(1500);
await page.screenshot({ path: 'john_walk.png' });
await page.keyboard.up('KeyW');
await page.waitForTimeout(1000);
await page.screenshot({ path: 'john_idle.png' });
console.log('ERRORS', errs);
await browser.close();
```

Expected: `errs` is empty. `john_walk.png` shows John mid-stride with a visibly
bent knee on the forward leg and a straight(er) knee on the back leg (not two
identical straight legs). `john_idle.png` (taken ~1s after releasing `KeyW`)
shows legs settled back near neutral, no sudden T-pose or snapped-back limb.

- [ ] **Step 3: Verify jump pose**

```js
// same setup as Step 2, after goto+waitForTimeout(1500):
const jumped = await page.evaluate(() => {
  if (typeof window.requestJump !== 'function') return 'requestJump not on window';
  window.requestJump();
  return 'ok';
});
console.log('JUMP TRIGGER', jumped);
await page.waitForTimeout(150); // near jump apex, still rising
await page.screenshot({ path: 'john_jump_rise.png' });
await page.waitForTimeout(500); // falling
await page.screenshot({ path: 'john_jump_fall.png' });
```

Expected: `jumped === 'ok'`. `john_jump_rise.png` shows knees tucked up and arms
raised; `john_jump_fall.png` shows legs more extended, arms still raised but
less tucked. If `requestJump` is not found on `window`, fall back to clicking
the jump button element instead: `await page.click('#jumpButton')` (the button
is injected by the base engine — confirm its id via
`await page.evaluate(() => document.querySelector('button[aria-label="Salta"]')?.id)`
if `#jumpButton` doesn't work) and use that in place of `window.requestJump()`.

- [ ] **Step 4: Re-confirm the protected anchor substring is intact**

```bash
cd "C:\Users\Antonio Nuzzi\john-in-the-island"
grep -c "}else{leg1.rotation.x=leg2.rotation.x=0}const target=" index.html
```

Expected: `1`.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "Add organic walk/idle/jump pose for John (knee bend, torso bob, head sway)"
```

---

### Task 3: Jointed arms + fix slide/hawk-grab poses to use rotation instead of repositioning the shoulder

**Files:**
- Modify: `hidden-falls.js` (arm creation, `resetSlidePose`, water-slide pose)
- Modify: `bird-rider.js` (`setHangingPose`, ridden-flight pose)

**Interfaces:**
- Consumes: `leg1Knee`, `leg2Knee` (Task 1, guarded), `shirt`, `skin` materials
  (already shared scope, used by the original arm code too).
- Produces: `leftArm`, `rightArm` (now `THREE.Group` shoulder pivots, same names
  as before), `leftElbow`, `rightElbow` (new `THREE.Group` elbow pivots) — these
  are what Task 2's guarded `typeof leftArm!=='undefined'` checks light up once
  this task lands.

- [ ] **Step 1: Replace the arm creation block in `hidden-falls.js`**

Find:

```js
  const armGeo=new THREE.BoxGeometry(.3,1.35,.34);
  const leftArm=new THREE.Mesh(armGeo,shirt);
  const rightArm=new THREE.Mesh(armGeo,shirt);
  leftArm.position.set(-.72,2.25,0);
  rightArm.position.set(.72,2.25,0);
  leftArm.castShadow=rightArm.castShadow=true;
  john.add(leftArm,rightArm);
```

Replace with:

```js
  function johnMakeArm(side){
    const shoulder=new THREE.Group();
    shoulder.position.set(side*.72,2.925,0);
    const upper=new THREE.Mesh(new THREE.CapsuleGeometry(.15,.4,4,8),shirt);
    upper.position.y=-.35;
    upper.castShadow=true;
    shoulder.add(upper);
    const elbow=new THREE.Group();
    elbow.position.y=-.7;
    shoulder.add(elbow);
    const forearm=new THREE.Mesh(new THREE.CapsuleGeometry(.12,.4,4,8),skin);
    forearm.position.y=-.32;
    forearm.castShadow=true;
    elbow.add(forearm);
    return {shoulder,elbow};
  }
  const johnArmL=johnMakeArm(-1),johnArmR=johnMakeArm(1);
  const leftArm=johnArmL.shoulder,rightArm=johnArmR.shoulder,leftElbow=johnArmL.elbow,rightElbow=johnArmR.elbow;
  john.add(leftArm,rightArm);
```

Shoulder position (`2.925`) matches the old arm box's top (`2.25+1.35/2`); the
two-segment total length (`(.4+.3)+(.4+.24)=1.34`) matches the old box's length
(`1.35`) closely, so hands end up within a couple centimeters of where the old
box hands were.

- [ ] **Step 2: Fix `resetSlidePose` in `hidden-falls.js`**

Find:

```js
  function resetSlidePose(){
    john.rotation.x=0;
    john.rotation.z=0;
    leftArm.rotation.set(0,0,0);
    rightArm.rotation.set(0,0,0);
    leftArm.position.set(-.72,2.25,0);
    rightArm.position.set(.72,2.25,0);
  }
```

Replace with:

```js
  function resetSlidePose(){
    john.rotation.x=0;
    john.rotation.z=0;
    leftArm.rotation.set(0,0,0);
    rightArm.rotation.set(0,0,0);
    leftElbow.rotation.x=0;
    rightElbow.rotation.x=0;
    leg1Knee.rotation.x=0;
    leg2Knee.rotation.x=0;
  }
```

(No `typeof` guards needed here — `resetSlidePose` is declared in the same file
and after the same task's own arm/elbow creation, and `leg1Knee`/`leg2Knee` are
guaranteed to exist because Task 1 must land before Task 3 is meaningful; this
function is never called before `john`/legs/arms all exist.)

The old `.position.set(...)` calls are removed — the shoulder `Group`'s position
is now fixed at the anatomical attachment point (`side*.72, 2.925, 0`, set once
at creation) and must never move; only rotation should change to pose the arm.

- [ ] **Step 3: Add elbow/knee bend to the water-slide pose in `hidden-falls.js`**

Find:

```js
    leftArm.rotation.z=-1.25+Math.sin(t*6)*.12;
    rightArm.rotation.z=1.25-Math.sin(t*6+.8)*.12;
    leftArm.rotation.x=.25;
    rightArm.rotation.x=.25;
    leg1.rotation.x=.75+Math.sin(t*8)*.16;
    leg2.rotation.x=.48+Math.sin(t*8+1.2)*.16;
```

Replace with:

```js
    leftArm.rotation.z=-1.25+Math.sin(t*6)*.12;
    rightArm.rotation.z=1.25-Math.sin(t*6+.8)*.12;
    leftArm.rotation.x=.25;
    rightArm.rotation.x=.25;
    leftElbow.rotation.x=.6;
    rightElbow.rotation.x=.6;
    leg1.rotation.x=.75+Math.sin(t*8)*.16;
    leg2.rotation.x=.48+Math.sin(t*8+1.2)*.16;
    leg1Knee.rotation.x=.9+Math.sin(t*8)*.1;
    leg2Knee.rotation.x=.75+Math.sin(t*8+1.2)*.1;
```

- [ ] **Step 4: Fix `setHangingPose` in `bird-rider.js`**

Find:

```js
  function setHangingPose(active){
    if(typeof leftArm!=='undefined'&&typeof rightArm!=='undefined'){
      if(active){
        leftArm.rotation.set(-.18,0,-2.82);
        rightArm.rotation.set(-.18,0,2.82);
        leftArm.position.set(-.43,2.94,.03);
        rightArm.position.set(.43,2.94,.03);
      }else if(typeof resetSlidePose==='function'){
        resetSlidePose();
      }else{
        leftArm.rotation.set(0,0,0);rightArm.rotation.set(0,0,0);
        leftArm.position.set(-.72,2.25,0);rightArm.position.set(.72,2.25,0);
      }
    }
    if(active){
      leg1.rotation.x=.42;leg2.rotation.x=-.28;
      john.rotation.x=0;
      john.rotation.z=0;
    }
  }
```

Replace with:

```js
  function setHangingPose(active){
    if(typeof leftArm!=='undefined'&&typeof rightArm!=='undefined'){
      if(active){
        leftArm.rotation.set(-2.6,0,-.35);
        rightArm.rotation.set(-2.6,0,.35);
        if(typeof leftElbow!=='undefined'&&typeof rightElbow!=='undefined'){
          leftElbow.rotation.x=1.75;
          rightElbow.rotation.x=1.75;
        }
      }else if(typeof resetSlidePose==='function'){
        resetSlidePose();
      }else{
        leftArm.rotation.set(0,0,0);rightArm.rotation.set(0,0,0);
        if(typeof leftElbow!=='undefined'&&typeof rightElbow!=='undefined'){
          leftElbow.rotation.x=0;
          rightElbow.rotation.x=0;
        }
      }
    }
    if(active){
      leg1.rotation.x=.42;leg2.rotation.x=-.28;
      if(typeof leg1Knee!=='undefined'&&typeof leg2Knee!=='undefined'){
        leg1Knee.rotation.x=.55;
        leg2Knee.rotation.x=.4;
      }
      john.rotation.x=0;
      john.rotation.z=0;
    }
  }
```

`rotation.set(-2.6,0,-.35)` (~-149° pitch + a slight outward roll) is a starting
guess for "arms reaching up to grip the hawk's legs," replacing the old hack of
physically relocating the shoulder box up near the hawk. Because it's a visual
pose with no functional consequence, tune it directly from the Step 6
screenshot: if the arms look wrong (clipping through the torso, not reaching
up believably), adjust the first number in `rotation.set(x, 0, ±z)` in ~0.2
increments and re-screenshot until the arm visibly reaches up over John's head.

- [ ] **Step 5: Add knee sway to the ridden-flight pose in `bird-rider.js`**

Find:

```js
    setHangingPose(true);
    leg1.rotation.x=.30+Math.sin(t*4)*.13;
    leg2.rotation.x=-.20+Math.sin(t*4+1.1)*.13;
    return true;
```

Replace with:

```js
    setHangingPose(true);
    leg1.rotation.x=.30+Math.sin(t*4)*.13;
    leg2.rotation.x=-.20+Math.sin(t*4+1.1)*.13;
    if(typeof leg1Knee!=='undefined'&&typeof leg2Knee!=='undefined'){
      leg1Knee.rotation.x=.5+Math.sin(t*4)*.1;
      leg2Knee.rotation.x=.35+Math.sin(t*4+1.1)*.1;
    }
    return true;
```

- [ ] **Step 6: Verify — arms render, slide pose, hawk-grab pose, no NaN**

```js
import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: String.raw`C:\Users\Antonio Nuzzi\AppData\Local\ms-playwright\chromium-1228\chrome-win64\chrome.exe` });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = [];
page.on('pageerror', e => errs.push(e.message));
await page.goto('http://localhost:8935/play.html', { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: 'john_arms_idle.png' });
await page.keyboard.down('KeyW');
await page.waitForTimeout(1200);
await page.screenshot({ path: 'john_arms_walk.png' });
await page.keyboard.up('KeyW');
console.log('ERRORS', errs);
await browser.close();
```

Expected: `errs` empty, `john_arms_idle.png` shows both arms hanging naturally
(rounded upper-arm/forearm segments, no gap or overlap at the elbow),
`john_arms_walk.png` shows arms swinging opposite the legs with a visible elbow
bend on the swinging-forward arm.

Manually re-verify the hawk-grab pose and water-slide pose visually is out of
scope for an automated script (they require specific game state — being airborne
near a swooping hawk, or standing at the waterfall) but re-read
`setHangingPose`/`resetSlidePose`/the water-slide pose code one more time to
confirm no leftover `.position.set(...)` calls remain on `leftArm`/`rightArm`
(a `grep -c "leftArm.position.set" bird-rider.js hidden-falls.js` should report
`0` for both files — those calls must all be gone, since the shoulder position is
now fixed).

- [ ] **Step 7: Commit**

```bash
git add hidden-falls.js bird-rider.js
git commit -m "Rebuild John's arms as jointed capsules, fix slide/hawk-grab poses to use rotation only"
```

---

### Task 4: Cache-bust and deploy

**Files:**
- Modify: `play.html`

**Interfaces:**
- Consumes: nothing new — this task only bumps version query strings so
  GitHub Pages / browsers don't serve stale cached copies of the files changed
  in Tasks 1-3.

- [ ] **Step 1: Bump versions in `play.html`**

Find:

```
Promise.all([fetch('index.html?v=33').then(r=>r.text()),fetch('hidden-falls.js?v=8').then(r=>r.text()),fetch('bird-rider.js?v=8').then(r=>r.text()),fetch('hawk-integration.js?v=12').then(r=>r.text()),fetch('hide-primitive-birds.js?v=1').then(r=>r.text()),fetch('hawk-visibility-guard.js?v=2').then(r=>r.text())]).then(([html,waterCode,birdCode,hawkCode,hidePrimitiveCode,hawkGuardCode])=>{
```

Replace with:

```
Promise.all([fetch('index.html?v=34').then(r=>r.text()),fetch('hidden-falls.js?v=9').then(r=>r.text()),fetch('bird-rider.js?v=9').then(r=>r.text()),fetch('hawk-integration.js?v=12').then(r=>r.text()),fetch('hide-primitive-birds.js?v=1').then(r=>r.text()),fetch('hawk-visibility-guard.js?v=2').then(r=>r.text())]).then(([html,waterCode,birdCode,hawkCode,hidePrimitiveCode,hawkGuardCode])=>{
```

(Only `index.html` v33→34, `hidden-falls.js` v8→9, and `bird-rider.js` v8→9
change — those are the three files Tasks 1-3 touched. The hawk-related files are
untouched by this plan and keep their current versions.)

- [ ] **Step 2: Commit**

```bash
git add play.html
git commit -m "Bump cache-busting versions for organic John changes"
```

- [ ] **Step 3: Push to `origin` (not `auto-gherk`, per current instruction)**

```bash
git push origin main
```

- [ ] **Step 4: Wait for GitHub Pages redeploy, then verify live**

```bash
until curl -s "https://anuzzi79.github.io/john-in-the-island/index.html" | grep -q "johnMakeLeg"; do sleep 3; done; echo "LIVE"
```

- [ ] **Step 5: Final live check**

Re-run the Task 2 Step 2/3 and Task 3 Step 6 Playwright scripts, pointed at
`https://anuzzi79.github.io/john-in-the-island/play.html` instead of
`http://localhost:8935/play.html`. Confirm: no page errors, walk screenshot
shows bent knee, jump screenshot shows tucked knees, idle screenshot shows
settled rounded limbs, and
`grep -c "}else{leg1.rotation.x=leg2.rotation.x=0}const target=" index.html`
still reports `1` in the deployed file
(`curl -s https://anuzzi79.github.io/john-in-the-island/index.html | grep -c "..."`).

---

## Self-Review Notes

- **Spec coverage:** capsule torso/head/limbs (Task 1, Task 3) ✓; jointed
  knees/elbows (Task 1, Task 3) ✓; walk knee-bend + torso bob/twist + head sway +
  arm swing (Task 2) ✓; idle breathing + smooth blend (Task 2) ✓; jump tuck/extend
  + arm balance keyed off `airborne`/`verticalVelocity` (Task 2) ✓; slide/hawk-grab
  pose polish (Task 3) ✓; cache-bust + deploy (Task 4) ✓.
- **Placeholder scan:** no TBD/TODO; the one place with "tune if it looks wrong"
  (Task 3 Step 4, hanging-pose rotation) is a concrete starting number plus an
  explicit, actionable adjustment instruction — not an unspecified placeholder.
- **Type/name consistency:** `leg1`/`leg2`/`leg1Knee`/`leg2Knee` and
  `leftArm`/`rightArm`/`leftElbow`/`rightElbow` are used with the same names and
  meaning (Group pivots) across every task and file.
