const RAT_POINTS_EACH   = 250;
const POISON_POINTS_EACH = 100;
const BOTH_MULTIPLIER   = 4;
const SNAPSHOTS_PER_DAY = 48;

// Keep for legacy compatibility.
// Note: these are simple labels/defaults only.
// Real points are now calculated by calcDailyPoints()
// using 1:1 Rat + Poison pairing.
const POINTS_PER_DAY = {
  both: 1400,        // 1 Rat + 1 Poison paired = (250 + 100) * 4
  rat_only: 250,
  poison_only: 100,
  none: 0,
};

function getTier(hasRat, hasPoison) {
  if (hasRat && hasPoison) return 'both';
  if (hasRat && !hasPoison) return 'rat_only';
  if (!hasRat && hasPoison) return 'poison_only';
  return 'none';
}

function calcDailyPoints(ratCount, poisonCount) {
  ratCount = Number(ratCount || 0);
  poisonCount = Number(poisonCount || 0);

  const pairedCount = Math.min(ratCount, poisonCount);

  const unpairedRats = Math.max(ratCount - pairedCount, 0);
  const unpairedPoison = Math.max(poisonCount - pairedCount, 0);

  const pairedPoints =
    pairedCount * (RAT_POINTS_EACH + POISON_POINTS_EACH) * BOTH_MULTIPLIER;

  const unpairedRatPoints = unpairedRats * RAT_POINTS_EACH;
  const unpairedPoisonPoints = unpairedPoison * POISON_POINTS_EACH;

  return pairedPoints + unpairedRatPoints + unpairedPoisonPoints;
}

function calcSnapshotPoints(ratCount, poisonCount) {
  const daily = calcDailyPoints(ratCount, poisonCount);
  return parseFloat((daily / SNAPSHOTS_PER_DAY).toFixed(4));
}

function getTierLabel(tier) {
  const labels = {
    both:         '☠ Rat + Poison — 1:1 4x MULTIPLIER',
    rat_only:     '🐀 Rat Only',
    poison_only:  '🧪 Poison Only',
    none:         'Not Staking',
  };

  return labels[tier] || 'Unknown';
}

module.exports = {
  getTier,
  calcDailyPoints,
  calcSnapshotPoints,
  getTierLabel,
  POINTS_PER_DAY,
  RAT_POINTS_EACH,
  POISON_POINTS_EACH,
  BOTH_MULTIPLIER,
};
