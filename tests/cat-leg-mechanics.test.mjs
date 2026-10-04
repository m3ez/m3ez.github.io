import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const svg = readFileSync(new URL('../assets/cat-walk-cycle.svg', import.meta.url), 'utf8');
const poses = [...svg.matchAll(/<g data-frame="(\d+)"[^>]*>([\s\S]*?)<\/g>/g)].map(([, index, pose]) => ({
  index: Number(index), pose,
  legs: [...pose.matchAll(/<path data-limb="([^"]+)" data-contact="([^"]+)"[^>]*d="([^"]+)"/g)].map(([, name, contact, d]) => {
    const values = d.match(/-?\d+(?:\.\d+)?/g).map(Number);
    return { name, contact: contact === 'true', points: Array.from({ length: values.length / 2 }, (_, i) => values.slice(i * 2, i * 2 + 2)) };
  }),
}));
const limb = (pose, name) => pose.legs.find(leg => leg.name === name);
const names = ['back-near', 'front-near', 'back-far', 'front-far'];
const toe = leg => leg.points.at(-1);
const STRIDE = 20;

// Removing the carpus/hock and using the old two-bone pendulum must fail this.
test('each cat leg includes an elbow or stifle, a raised wrist or hock, and a separate padded paw', () => {
  for (const pose of poses) for (const leg of pose.legs) {
    assert.equal(leg.points.length, 5, `${pose.index} ${leg.name}: root, hinge, carpus/hock, heel, toe`);
    const [, , ankle, heel] = leg.points;
    assert.ok(heel[1] - ankle[1] >= (leg.name.startsWith('back') ? 3.3 : 1.7), `${leg.name} must not stand on its ankle`);
  }
});

test('forelegs fold back at the elbow while rear stifles bend forward above the hock', () => {
  for (const pose of poses) for (const leg of pose.legs) {
    assert.equal(leg.points.length, 5, 'a wrist/hock is required before testing its hinge');
    const [root, hinge, ankle] = leg.points;
    const cross = (hinge[0] - root[0]) * (ankle[1] - root[1]) - (hinge[1] - root[1]) * (ankle[0] - root[0]);
    assert.ok(leg.name.startsWith('back') ? cross > 1 : cross < -1, `${pose.index} ${leg.name}: wrong bend direction`);
  }
});

test('planted toes stay stationary in world space throughout stance, independent of shoulder and hip movement', () => {
  for (let i = 0; i < poses.length - 1; i++) for (const name of names) {
    const a = limb(poses[i], name), b = limb(poses[i + 1], name);
    if (!a.contact || !b.contact) continue;
    assert.ok(Math.abs(toe(a)[0] - toe(b)[0] - STRIDE / poses.length) < .025, `${i} ${name}: paw slides against the ground`);
    assert.ok(Math.abs(toe(a)[1] - 26.8) < .015, `${i} ${name}: toe leaves the ground during stance`);
  }
});

test('forepaws carry a little longer than hindpaws without diagonal hopping', () => {
  for (const side of ['near', 'far']) {
    const front = poses.filter(p => limb(p, `front-${side}`).contact).length;
    const back = poses.filter(p => limb(p, `back-${side}`).contact).length;
    assert.ok(front > back && front - back <= 4, `different fore/hind stance timing: ${front} / ${back}`);
  }
  for (const pose of poses) assert.ok(pose.legs.filter(l => l.contact).length >= 2, `unsupported pose ${pose.index}`);
  const landings = poses.flatMap((pose, i) => names.filter(name => limb(pose, name).contact && !limb(poses[(i + 63) % 64], name).contact).map(name => ({ frame: i, name })));
  assert.deepEqual(landings, [{ frame: 0, name: 'back-near' }, { frame: 16, name: 'front-near' }, { frame: 32, name: 'back-far' }, { frame: 48, name: 'front-far' }]);
});

test('hind toes land close to the footprint previously left by the same-side front paw', () => {
  for (const [side, backFrame, frontFrame] of [['near', 0, 16], ['far', 32, 48]]) {
    const backX = toe(limb(poses[backFrame], `back-${side}`))[0];
    const priorFrontX = toe(limb(poses[frontFrame], `front-${side}`))[0] - .75 * STRIDE;
    assert.ok(Math.abs(backX - priorFrontX) < .65, `${side}: misplaced hind touchdown, delta=${backX - priorFrontX}`);
  }
});

test('the rounded belly leaves enough lower-leg clearance to read the folding joints', () => {
  for (const { pose } of poses) {
    const d = pose.match(/<path data-body="true" d="([^"]+)"/)[1];
    const values = d.match(/-?\d+(?:\.\d+)?/g).map(Number);
    const ys = values.filter((_, i) => i % 2);
    const underside = Math.max(...ys), top = Math.min(...ys);
    assert.ok(26.8 - underside >= 4.7, `belly hides the legs: clearance ${26.8 - underside}`);
    assert.ok(underside - top >= 14.5, 'retain the chubby body rather than shrinking it thin');
  }
});

test('painted toe positions have no extra SVG letterbox gap above the divider', () => {
  assert.match(svg.slice(0, svg.indexOf('>')), /preserveAspectRatio="none"/);
});

test('bone lengths and joint positions stay stable across the entire loop', () => {
  for (const name of names) {
    const first = limb(poses[0], name);
    assert.equal(first.points.length, 5);
    const lengths = [0, 1, 2, 3].map(i => Math.hypot(first.points[i + 1][0] - first.points[i][0], first.points[i + 1][1] - first.points[i][1]));
    for (let i = 0; i < poses.length; i++) {
      const a = limb(poses[i], name), b = limb(poses[(i + 1) % 64], name);
      for (let j = 0; j < 4; j++) {
        const length = Math.hypot(a.points[j + 1][0] - a.points[j][0], a.points[j + 1][1] - a.points[j][1]);
        assert.ok(Math.abs(length - lengths[j]) < .04, `${i} ${name} segment ${j} stretches`);
      }
      for (let j = 0; j < 5; j++) assert.ok(Math.hypot(a.points[j][0] - b.points[j][0], a.points[j][1] - b.points[j][1]) < 2, `${i} ${name} joint ${j} pops`);
    }
  }
});
