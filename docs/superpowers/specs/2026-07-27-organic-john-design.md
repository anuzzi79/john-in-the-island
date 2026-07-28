# Organic John: rounded body + jointed limbs

## Context

John, the player character, is currently built from flat primitives declared inline
in `index.html`: a single `BoxGeometry` for the torso, a `SphereGeometry` for the
head, and two `BoxGeometry` legs that swing rigidly from the hip as one piece each
(`leg1.rotation.x=Math.sin(t*10)*.6`). Arms (`leftArm`/`rightArm`, also boxes) are
added separately by `hidden-falls.js` and are only posed by feature-specific code
(water slide, hawk grab) — there is no walk-cycle arm swing, no idle animation, and
no jump pose at all. Visually and in motion, John reads as a rigid Roblox-style
block figure, which clashes with the goal of a softer, more "alive" character while
the rest of the island (trees, rocks, animals) keeps its intentionally simple
low-poly look.

The user wants John reshaped to be more organic in form and movement, without
introducing an external rigged model (unlike the hawk, which is a GLB import) — the
character should stay built from simple Three.js primitives, consistent with the
rest of the scene, but rounder and with genuinely jointed limbs (visible knees and
elbows) instead of single rigid segments.

## Visual form

Replace box geometry with `THREE.CapsuleGeometry` (available in the three.js r160
build already loaded by the game) for torso and all limb segments:

- **Torso**: a capsule scaled non-uniformly on x/z (oval cross-section) to replace
  the current 1.1×1.6×0.65 box — rounded, tapered silhouette instead of a slab.
- **Head**: stays a sphere (already organic); position it slightly closer to the
  torso top for visual continuity (small or no neck gap).
- **Legs and arms**: each limb becomes two capsule segments (see hierarchy below).
  Capsules have hemispherical caps at both ends, so hands and feet read as
  naturally rounded terminals for free — no separate hand/foot meshes needed.
- **Materials/colors**: unchanged (red shirt material for torso/arms, skin
  material for head/hands, shorts material for legs) — only geometry changes.

## Joint hierarchy

Each limb is two pivot-driven segments, mirroring a standard 2-bone game-character
rig:

- **Hip/shoulder group** (position fixed at the attachment point on the torso) →
  rotates for the whole-limb swing → contains the thigh/upper-arm capsule (offset
  so the capsule's own pivot sits at the joint, extending outward) → contains a
  **knee/elbow group** (positioned at the far end of the upper segment) → rotates
  for the bend → contains the calf/forearm capsule.

To avoid breaking existing feature code, the top-level variable names are
preserved as the hip/shoulder groups:

- `leg1`, `leg2` — existing names, now refer to the hip pivot group (declared in
  `index.html`). Code that does `leg1.rotation.x = ...` keeps working unchanged
  for whole-leg swing.
- `leftArm`, `rightArm` — existing names (declared in `hidden-falls.js`), now
  refer to the shoulder pivot group.
- New: `leg1Knee`, `leg2Knee`, `leftElbow`, `rightElbow` — the new bend joints.
  Any pose code that doesn't set these keeps a natural relaxed slight bend
  (a small default, not perfectly straight) rather than breaking or looking odd.

## Movement

### Walking (`index.html`, main `animate()` loop)
- Knee/elbow bend uses a rectified sine (`Math.max(0, Math.sin(phase))`) so each
  leg bends while swinging forward and straightens during the ground-push phase —
  a standard cheap walk-cycle approximation.
- Arms swing in counter-phase to the legs, with a smaller, similarly-phased elbow
  bend.
- Torso gets a small vertical bob (double the leg swing frequency, since each
  footfall produces one bob) and a slight counter-rotation twist relative to the
  hip swing.
- Head gets a small counter-sway with a slight phase lag behind the torso twist.
- All of the above is driven by the existing `forward`/`strafe` input magnitude
  already computed each frame in `animate()` — no new input plumbing needed.

### Idle (no movement input)
- Slow, low-amplitude "breathing" motion (gentle vertical torso oscillation) so
  John is never perfectly frozen.
- The walk pose and idle pose blend continuously based on movement magnitude
  (lerp, not a hard if/else snap) so there's no visible pop when starting/stopping.

### Jump (airborne)
- Jump physics (height, gravity, `airborne`/`verticalVelocity`) live in the
  remote base engine and are out of scope — we only key the *pose* off the
  already-shared `airborne` and `verticalVelocity` globals (already referenced
  the same way by `bird-rider.js`), read defensively with `typeof` guards.
- Knees/elbows tuck while rising (`verticalVelocity > 0`) and legs extend toward
  landing while falling (`verticalVelocity <= 0`), arms open slightly for
  balance.
- Pose only applies when John isn't riding a hawk or on the water slide (those
  states already own the pose via their own code paths).

### Slide / hawk grab (polish, lower priority)
- `hidden-falls.js`'s `resetSlidePose`/water-slide arm rotations and
  `bird-rider.js`'s `setHangingPose`/`updateGrabSequence`/ridden-flight pose
  currently pose a single mesh per arm. Update them to pose the shoulder group
  and set a sensible elbow bend (instead of leaving elbow at the walk-cycle
  default), so the new joint doesn't look accidentally stiff or off-model during
  these states.

## Files touched

- `index.html` — rebuild the `john` hierarchy (torso capsule, head placement,
  hip+knee groups for both legs) and extend `animate()` with the walk/idle/jump
  pose logic described above.
- `hidden-falls.js` — rebuild the arm hierarchy (shoulder+elbow groups,
  capsule segments) and update the water-slide pose functions for the new
  joints.
- `bird-rider.js` — update `setHangingPose`, `updateGrabSequence`, and the
  ridden-flight pose code to pose the new arm/leg joints.
- `play.html` — bump the cache-busting query versions for the changed script
  fetches (`hidden-falls.js`, `bird-rider.js`), following the existing
  versioning convention.

## Testing / verification

1. Serve the repo locally and load `play.html` in a headless browser (same
   Playwright + local Chromium setup used for the hawk fixes).
2. Screenshot John standing still, mid-walk (drive the joystick input
   programmatically), mid-jump, and while riding a hawk, to visually confirm:
   rounded capsule silhouette, visible bent knee/elbow during walk and jump, no
   T-pose or inverted-joint glitches, no regression in the hawk-grab/slide poses.
3. Poll `john.rotation`/limb rotations over a few seconds during walk input to
   confirm the knee/elbow rectified-sine motion is finite (no NaN) and cycles
   smoothly, and that idle breathing blends in without a pop when input stops.
4. Confirm no page errors/console errors before deploying.
5. Deploy (push to `origin` per current instruction — `auto_gherk` is no longer
   updated unless asked) and re-run the same visual/behavioral checks live.
