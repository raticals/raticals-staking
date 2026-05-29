const RAT_POINTS_EACH   = 250;
const POISON_POINTS_EACH = 100;
const BOTH_MULTIPLIER   = 4;
const SNAPSHOTS_PER_DAY = 48;

// Keep for legacy compatibility
const POINTS_PER_DAY = {
  both: 1000,
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
  const base = (ratCount * RAT_POINTS_EACH) + (poisonCount * POISON_POINTS_EACH);
  const multiplier = (ratCount > 0 && poisonCount > 0) ? BOTH_MULTIPLIER : 1;
  return base * multiplier;
}

function calcSnapshotPoints(ratCount, poisonCount) {
  const daily = calcDailyPoints(ratCount, poisonCount);
  return parseFloat((daily / SNAPSHOTS_PER_DAY).toFixed(4));
}

function getTierLabel(tier) {
  const labels = {
    both:         '☠ Rat + Poison — 4x MULTIPLIER',
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
