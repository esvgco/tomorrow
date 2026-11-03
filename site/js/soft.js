// A distinct illustrated anatomy on the shared rig. Rounded paddles rather
// than pointed anatomical ears; short muzzle, full head and pill-shaped feet.
import { SHAPES, G } from './rig.js';

export const SOFT_SHAPES = SHAPES.filter(s => s.g !== G.EAR_N && s.g !== G.EAR_F).map(s => {
  const sizes = {
    pelvis: [0.156, 0.142], mid: [0.142, 0.125], tail0: [0.06, 0.057],
    chest: [0.108, 0.12], headBack: [0.146, 0.128],
    shN: [0.062, 0.046], shF: [0.062, 0.046],
    elN: [0.046, 0.041], elF: [0.046, 0.041],
    wrN: [0.043, 0.043], wrF: [0.043, 0.043],
    hipN: [0.107, 0.073], hipF: [0.107, 0.073],
    knN: [0.064, 0.044], knF: [0.064, 0.044],
    hoN: [0.047, 0.044], hoF: [0.047, 0.044],
  };
  const [ra, rb] = sizes[s.a];
  return { ...s, ra, rb };
});

const widths = [0.035, 0.047, 0.055, 0.058, 0.055, 0.046, 0.034];
for (const side of ['N', 'F']) {
  for (let i = 0; i < 6; i++) SOFT_SHAPES.push({
    a: `softEar${side}${i}`, b: `softEar${side}${i+1}`,
    ra: widths[i], rb: widths[i+1], g: side === 'N' ? G.EAR_N : G.EAR_F, flat: 1.7,
  });
}
