require('dotenv').config();

const supabase = require('./supabase');

// ── STAKING IS CLOSED ──
// This is the resource-saving switch: the script returns immediately, before
// making a single Moralis/OpenSea/Alchemy call, and before touching any
// wallet row. Whatever total_points each wallet has right now is exactly
// what it keeps for the airdrop. No awards, no wipes, no API spend.
const STAKING_CLOSED = true;

async function runSnapshot() {
  console.log(`\n[Snapshot] Run at ${new Date().toISOString()}`);

  if (STAKING_CLOSED) {
    console.log('[Snapshot] STAKING_CLOSED=true — skipping entirely. Points remain frozen.');

    // Optional: log how many wallets are sitting frozen, just for visibility.
    // This is a single lightweight read, no NFT/listing API calls.
    const { data: wallets, error } = await supabase
      .from('wallets')
      .select('address, total_points')
      .eq('is_staking', true);

    if (!error && wallets) {
      const totalLocked = wallets.reduce((sum, w) => sum + Number(w.total_points || 0), 0);
      console.log(`[Snapshot] ${wallets.length} wallets frozen, ${totalLocked.toLocaleString()} total points locked in.`);
    }

    return;
  }

  // Everything below only runs if STAKING_CLOSED is ever flipped back to false.
  const { checkWalletNFTs } = require('./alchemy');
  const { checkIfListed } = require('./opensea');
  const { getTier, calcDailyPoints, calcSnapshotPoints } = require('./points');
  const ALLOW_WIPES = process.env.ALLOW_WIPES === 'true';

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
    await processWallet(wallet, { checkWalletNFTs, checkIfListed, getTier, calcDailyPoints, calcSnapshotPoints, ALLOW_WIPES });
    await sleep(300);
  }

  console.log(`[Snapshot] Complete — ${new Date().toISOString()}\n`);
}

async function processWallet(wallet, deps) {
  const { checkWalletNFTs, checkIfListed, getTier, calcDailyPoints, calcSnapshotPoints, ALLOW_WIPES } = deps;
  const address = wallet.address;

  try {
    const nftCheck = await checkWalletNFTs(address);
    if (!nftCheck || nftCheck.ok !== true) {
      console.warn(`[SKIP] ${address} — NFT check failed, no award, no wipe`);
      return;
    }

    const { hasRat, hasPoison, ratCount, poisonCount } = nftCheck;
    const listingCheck = await checkIfListed(address);
    if (!listingCheck || listingCheck.ok !== true) {
      console.warn(`[SKIP] ${address} — OpenSea listing check failed, no award, no wipe`);
      return;
    }

    const { isListed } = listingCheck;
    const tier = getTier(hasRat, hasPoison);
    const hasNFTs = hasRat || hasPoison;
    const shouldWipe = !hasNFTs || isListed;

    console.log(`[Snapshot Check] ${address} — ratCount=${ratCount}, poisonCount=${poisonCount}, tier=${tier}, isListed=${isListed}`);

    if (shouldWipe) {
      const reason = !hasNFTs ? 'wipe_sold' : 'wipe_listed';
      await wipePoints(wallet, reason, hasRat, hasPoison, isListed, ratCount, poisonCount, ALLOW_WIPES, getTier);
      return;
    }

    const dailyPoints = calcDailyPoints(ratCount, poisonCount);
    const pointsToAward = calcSnapshotPoints(ratCount, poisonCount);

    console.log(`[Points Calc] ${address} — daily=${dailyPoints}, snapshot=${pointsToAward}`);

    await awardPoints(wallet, pointsToAward, tier, hasRat, hasPoison, ratCount, poisonCount);

  } catch (err) {
    console.error(`[Snapshot] Error processing ${address}:`, err.message);
  }
}

async function wipePoints(wallet, reason, hasRat, hasPoison, isListed, ratCount, poisonCount, ALLOW_WIPES, getTier) {
  const address = wallet.address;
  const pointsBefore = Number(wallet.total_points || 0);

  if (!ALLOW_WIPES) {
    console.warn(`[WIPE BLOCKED] ${address} — reason: ${reason} — would have wiped ${pointsBefore} points`);

    await supabase.from('snapshots').insert({
      wallet_address: address, had_rat: hasRat, had_poison: hasPoison,
      was_listed: isListed, points_awarded: 0, tier: getTier(hasRat, hasPoison), wiped: false,
    });

    await supabase.from('wallets').update({
      has_rat: hasRat, has_poison: hasPoison, rat_count: ratCount, poison_count: poisonCount,
      current_tier: getTier(hasRat, hasPoison), is_staking: true, last_snapshot_at: new Date().toISOString(),
    }).eq('address', address);

    return;
  }

  console.log(`[WIPE] ${address} — reason: ${reason} — lost ${pointsBefore} points`);

  await supabase.from('points_history').insert({
    wallet_address: address, points_before: pointsBefore, points_after: 0, change_reason: reason,
  });

  await supabase.from('snapshots').insert({
    wallet_address: address, had_rat: hasRat, had_poison: hasPoison,
    was_listed: isListed, points_awarded: 0, tier: 'none', wiped: true,
  });

  await supabase.from('wallets').update({
    total_points: 0, is_staking: false, has_rat: hasRat, has_poison: hasPoison,
    rat_count: ratCount, poison_count: poisonCount, current_tier: 'none',
    points_wiped_at: new Date().toISOString(), last_snapshot_at: new Date().toISOString(),
  }).eq('address', address);
}

async function awardPoints(wallet, pointsToAward, tier, hasRat, hasPoison, ratCount, poisonCount) {
  const address = wallet.address;
  const pointsBefore = Number(wallet.total_points || 0);
  const pointsAfter = parseFloat((pointsBefore + pointsToAward).toFixed(4));

  console.log(`[AWARD] ${address} — rats=${ratCount}, poison=${poisonCount}, tier=${tier} — +${pointsToAward} pts — total=${pointsAfter}`);

  await supabase.from('points_history').insert({
    wallet_address: address, points_before: pointsBefore, points_after: pointsAfter, change_reason: 'snapshot_award',
  });

  await supabase.from('snapshots').insert({
    wallet_address: address, had_rat: hasRat, had_poison: hasPoison,
    was_listed: false, points_awarded: pointsToAward, tier, wiped: false,
  });

  await supabase.from('wallets').update({
    total_points: pointsAfter, has_rat: hasRat, has_poison: hasPoison,
    rat_count: ratCount, poison_count: poisonCount, current_tier: tier,
    is_staking: true, last_snapshot_at: new Date().toISOString(),
  }).eq('address', address);
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

if (require.main === module) {
  runSnapshot()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('[Snapshot] Fatal error:', err);
      process.exit(1);
    });
}

module.exports = { runSnapshot };
