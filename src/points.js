const POINTS_PER_DAY = {
  poison_only: 100,
  rat_only: 250,
  both: 1000,
  none: 0,
};

const SNAPSHOTS_PER_DAY = 48;

function getTier(hasRat, hasPoison) {
  if (hasRat && hasPoison) return 'both';
  if (hasRat && !hasPoison) return 'rat_only';
  if (!hasRat && hasPoison) return 'poison_only';
  return 'none';
}

function calcSnapshotPoints(tier) {
  const daily = POINTS_PER_DAY[tier] || 0;
  return parseFloat((daily / SNAPSHOTS_PER_DAY).toFixed(4));
}

function getTierLabel(tier) {
  const labels = {
    both: '☠ Rat + Poison — MAX MULTIPLIER',
    rat_only: '🐀 Rat Only',
    poison_only: '🧪 Poison Only',
    none: 'Not Staking',
  };
  return labels[tier] || 'Unknown';
}

module.exports = { getTier, calcSnapshotPoints, getTierLabel, POINTS_PER_DAY };
