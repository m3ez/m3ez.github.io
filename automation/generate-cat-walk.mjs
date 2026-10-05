// Development-only deterministic sprite generator; never loaded by the page.
// Run: node automation/generate-cat-walk.mjs [--stdout]
// Stylized mechanics, not a measured anatomical model. Fore/hind stance and
// joint roles are informed by "Stabilization of cat paw trajectory during
// locomotion" (2014), https://pmc.ncbi.nlm.nih.gov/articles/PMC4137248/.
import { writeFileSync } from 'node:fs';

const FRAMES = 64, WIDTH = 44, HEIGHT = 28;
// Must match --cat-stride-units in portfolio-theme.css. The browser computes
// cadence from this distance, not from the number of sampled poses.
const STRIDE = 20, GROUND = 26.8;
const fmt = n => (Math.abs(n) < .005 ? 0 : n).toFixed(2);
const point = (x, y) => `${fmt(x)} ${fmt(y)}`;
const smooth = t => { const s = Math.max(0, Math.min(1, t)); return s * s * (3 - 2 * s); };

function paw(phase, stance, lift) {
  const reach = STRIDE * stance / 2;
  if (phase < stance) {
    return { x: reach - STRIDE * phase, y: GROUND, contact: true, swing: 0,
      roll: .28 * smooth((phase / stance - .8) / .2) };
  }
  const s = (phase - stance) / (1 - stance);
  // Match the stance velocity at both ends: lift behind the body, fold,
  // reach forward, and lower the toes before loading the next step.
  const m = -STRIDE * (1 - stance);
  const x = (2*s**3 - 3*s**2 + 1) * -reach + (s**3 - 2*s**2 + s) * m
    + (-2*s**3 + 3*s**2) * reach + (s**3 - s**2) * m;
  return { x, y: GROUND - lift * Math.sin(Math.PI * s)**2, contact: false, swing: s,
    roll: .28 * (1 - s)**2 + .42 * Math.sin(Math.PI * s) };
}

function hinge(root, end, upper, lower, bend) {
  const dx = end[0] - root[0], dy = end[1] - root[1], distance = Math.hypot(dx, dy);
  // Do not silently stretch a bone or snap across an IK singularity.
  if (distance >= upper + lower - .01 || distance <= Math.abs(upper - lower) + .01) {
    throw new Error(`Unreachable cat joint: ${distance.toFixed(3)} for ${upper}/${lower}`);
  }
  const along = (upper**2 - lower**2 + distance**2) / (2 * distance);
  const perpendicular = Math.sqrt(upper**2 - along**2);
  return [root[0] + along * dx / distance - bend * perpendicular * dy / distance,
    root[1] + along * dy / distance + bend * perpendicular * dx / distance];
}

function leg(name, phase, attachmentX, bob) {
  const rear = name.startsWith('back'), stance = rear ? .60 : .64;
  const foot = paw(phase, stance, rear ? 3.25 : 3.6);
  // Use a fixed body reference for paw placement. Adding shoulder movement to
  // the toe coordinates would make planted paws skate even with correct cadence.
  const toe = [attachmentX + (rear ? 1.3 : -.9) + foot.x, foot.y];
  const heel = [toe[0] - 1.4 * Math.cos(foot.roll), toe[1] - 1.4 * Math.sin(foot.roll)];
  const fold = Math.sin(Math.PI * foot.swing);
  const ankleAngle = rear ? .57 + .12 * fold : .06 + .18 * fold;
  const distalLength = rear ? 5.1 : 2.4;
  const ankle = [heel[0] - distalLength * Math.sin(ankleAngle), heel[1] - distalLength * Math.cos(ankleAngle)];
  const root = [attachmentX + (rear ? .12 : .28) * Math.cos(2 * Math.PI * phase), (rear ? 13.8 : 14) + bob];
  // Front elbow points back; rear stifle points forward and the raised hock
  // points back. These are different chains, not four mirrored hinge legs.
  const joint = hinge(root, ankle, rear ? 6.1 : 6.7, rear ? 7.4 : 7.7, rear ? -1 : 1);
  const d = [root, joint, ankle, heel, toe].map((p, i) => `${i ? 'L' : 'M'}${point(...p)}`).join(' ');
  return `    <path data-limb="${name}" data-contact="${foot.contact}" opacity="${name.endsWith('far') ? '.42' : '1'}" d="${d}"/>`;
}

const frames = [];
for (let i = 0; i < FRAMES; i++) {
  const t = i / FRAMES, angle = 2 * Math.PI * t;
  const bob = .18 * Math.cos(2 * angle), cy = 13.8 + bob, sway = .65 * Math.sin(angle - .35);
  const tail = `M${point(9, 14 + bob)} C${point(2.4, 14.5 + bob)} ${point(1.9, 10)} ${point(4.2, 7.2)} C${point(6.8 + sway, 3.8)} ${point(5.3 + sway, 1.5)} ${point(3.3 + sway, 3.2)}`;
  // Preserve the broad belly, but give the lower legs room to fold visibly.
  const body = `M${point(8, cy)} C${point(8, cy - 5.8)} ${point(13, cy - 7.6)} ${point(20.8, cy - 7.4)} C${point(28, cy - 7.2)} ${point(35, cy - 4.7)} ${point(35, cy + .8)} C${point(35, cy + 6.4)} ${point(30, cy + 8)} ${point(22, cy + 8)} C${point(14, cy + 8)} ${point(8, cy + 5.7)} ${point(8, cy)} Z`;
  const h = .18 * Math.sin(angle - .2) + bob;
  const head = `M${point(29.2, 10.4 + h)} L${point(29.8, 3.6 + h)} Q${point(30, 2.7 + h)} ${point(31, 3.6 + h)} L${point(34, 6.3 + h)} L${point(37.8, 3.4 + h)} Q${point(38.5, 2.9 + h)} ${point(38.7, 4 + h)} L${point(39.6, 8.6 + h)} Q${point(40.1, 10.2 + h)} ${point(41.7, 11.2 + h)} Q${point(41.5, 15.4 + h)} ${point(36.5, 16.6 + h)} Q${point(29, 17.6 + h)} ${point(29.2, 10.4 + h)} Z`;
  // Touchdowns: near hind -> near front -> far hind -> far front. Contralateral
  // legs alternate at half a cycle; near hind lands at the prior front print.
  const renderLeg = (name, offset, x) => leg(name, (t + offset) % 1, x, bob);
  frames.push(`  <g data-frame="${i}" data-phase="${t.toFixed(6)}" transform="translate(${i * WIDTH} 0)">\n`
    + `    <path data-tail="true" d="${tail}" stroke-width="2.3"/>\n`
    + renderLeg('back-far', .5, 14) + '\n' + renderLeg('front-far', .25, 30.8) + '\n'
    + `    <path data-body="true" d="${body}" fill="black" stroke="none"/>\n`
    + renderLeg('back-near', 0, 14.5) + '\n' + renderLeg('front-near', .75, 31.3) + '\n'
    + `    <path data-head="true" d="${head}" fill="black" stroke="none"/>\n  </g>`);
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${FRAMES * WIDTH} ${HEIGHT}" width="${FRAMES * WIDTH}" height="${HEIGHT}" preserveAspectRatio="none" fill="none" stroke="black" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">\n  <!-- 64 grounded articulated poses. Generated by automation/generate-cat-walk.mjs. -->\n${frames.join('\n')}\n</svg>\n`;
if (process.argv.includes('--stdout')) process.stdout.write(svg);
else writeFileSync(new URL('../assets/cat-walk-cycle.svg', import.meta.url), svg);
