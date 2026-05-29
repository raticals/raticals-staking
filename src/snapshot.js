require('dotenv').config();
const supabase = require('./supabase');
const { checkWalletNFTs } = require('./alchemy');
const { checkIfListed } = require('./opensea');
const { getTier, calcSnapshotPoints } = require('./points');

async function runSnapshot() {
  console.log(`\n[Snapshot] Starting — ${new Date().toISOString()}`);

  const { data: wallets, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('is_staking', true);

  if (error) {
    console.error('[Snapshot] Failed to fetch wallets:', error.message);
    return;
  }

  console.log(`[Snapshot] Checking ${wallets.length} staking wallets...`);

  for (const wallet of wallets) {
    await processWallet(wallet);
    await sleep(300);
  }

  console.log(`[Snapshot] Complete — ${new Date().toISOString()}\n`);
}

async function processWallet(wallet) {
  const address = wallet.address;

  try {
    const { hasRat, hasPoison } = await checkWalletNFTs(address);
    const { isListed } = await checkIfListed(address);
    const tier = getTier(hasRat, hasPoison);
    const hasNFTs = hasRat || hasPoison;
    const shouldWipe = !hasNFTs || isListed;

    if (shouldWipe) {
      const reason = !hasNFTs ? 'wipe_sold' : 'wipe_listed';
      await wipePoints(wallet, reason, hasRat, hasPoison, isListed);
      return;
    }

    const pointsToAward = calcSnapshotPoints(wallet.rat_count || 0, wallet.poison_count || 0);
    await awardPoints(wallet, pointsToAward, tier, hasRat, hasPoison);

  } catch (err) {
    console.error(`[Snapshot] Error processing ${address}:`, err.message);
  }
}

async function wipePoints(wallet, reason, hasRat, hasPoison, isListed) {
  const address = wallet.address;
  const pointsBefore = wallet.total_points;

  console.log(`[WIPE] ${address} — reason: ${reason} — lost ${pointsBefore} points`);

  await supabase.from('points_history').insert({
    wallet_address: address,
    points_before: pointsBefore,
    points_after: 0,
    change_reason: reason,
  });

  await supabase.from('snapshots').insert({
    wallet_address: address,
    had_rat: hasRat,
    had_poison: hasPoison,
    was_listed: isListed,
    points_awarded: 0,
    tier: 'none',
    wiped: true,
  });

  await supabase.from('wallets').update({
    total_points: 0,
    is_staking: false,
    has_rat: hasRat,
    has_poison: hasPoison,
    current_tier: 'none',
    points_wiped_at: new Date().toISOString(),
    last_snapshot_at: new Date().toISOString(),
  }).eq('address', address);
}

async function awardPoints(wallet, pointsToAward, tier, hasRat, hasPoison) {
  const address = wallet.address;
  const pointsBefore = wallet.total_points;
  const pointsAfter = parseFloat((pointsBefore + pointsToAward).toFixed(4));

  console.log(`[AWARD] ${address} — tier: ${tier} — +${pointsToAward} pts — total: ${pointsAfter}`);

  await supabase.from('points_history').insert({
    wallet_address: address,
    points_before: pointsBefore,
    points_after: pointsAfter,
    change_reason: 'snapshot_award',
  });

  await supabase.from('snapshots').insert({
    wallet_address: address,
    had_rat: hasRat,
    had_poison: hasPoison,
    was_listed: false,
    points_awarded: pointsToAward,
    tier: tier,
    wiped: false,
  });

  await supabase.from('wallets').update({
    total_points: pointsAfter,
    has_rat: hasRat,
    has_poison: hasPoison,
    current_tier: tier,
    is_staking: true,
    last_snapshot_at: new Date().toISOString(),
  }).eq('address', address);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

if (require.main === module) {
  runSnapshot().then(() => process.exit(0)).catch(err => {
    console.error('[Snapshot] Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { runSnapshot };
