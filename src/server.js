require('dotenv').config();
const express = require('express');
const cors = require('cors');
const supabase = require('./supabase');
const { checkWalletNFTs } = require('./alchemy');
const { getTier, getTierLabel, calcDailyPoints, POINTS_PER_DAY } = require('./points');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

app.post('/api/stake', async (req, res) => {
  const { address } = req.body;
  if (!address) return res.status(400).json({ error: 'Wallet address required' });

  const normalizedAddress = address.toLowerCase();

  try {
    const { hasRat, hasPoison, ratCount, poisonCount } = await checkWalletNFTs(normalizedAddress);
    const tier = getTier(hasRat, hasPoison);

    if (tier === 'none') {
      return res.status(400).json({
        error: 'No Raticals or RatPoison NFTs found in this wallet.',
        hasRat, hasPoison,
      });
    }

    const { data: existing } = await supabase
      .from('wallets')
      .select('*')
      .eq('address', normalizedAddress)
      .single();

if (existing && existing.is_staking) {
  const { data: updated, error: updateError } = await supabase
    .from('wallets')
    .update({
      has_rat: hasRat,
      has_poison: hasPoison,
      rat_count: ratCount,
      poison_count: poisonCount,
      current_tier: tier,
      last_snapshot_at: new Date().toISOString(),
    })
    .eq('address', normalizedAddress)
    .select()
    .single();

  if (updateError) throw updateError;

  return res.json({
    success: true,
    message: 'Stake updated',
    wallet: updated,
    tierLabel: getTierLabel(tier),
    dailyPoints: calcDailyPoints(ratCount, poisonCount),
  });
}

    const walletData = {
      address: normalizedAddress,
      is_staking: true,
      staking_started_at: new Date().toISOString(),
      has_rat: hasRat,
      has_poison: hasPoison,
      rat_count: ratCount,
      poison_count: poisonCount,
      current_tier: tier,
      last_snapshot_at: new Date().toISOString(),
    };

    if (!existing) walletData.total_points = 0;

    const { data, error } = await supabase
      .from('wallets')
      .upsert(walletData, { onConflict: 'address' })
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Staking activated',
      wallet: data,
      tierLabel: getTierLabel(tier),
      dailyPoints: calcDailyPoints(ratCount, poisonCount),
    });

  } catch (err) {
    console.error('[/api/stake]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/wallet/:address', async (req, res) => {
  const address = req.params.address.toLowerCase();

  try {
    const { hasRat, hasPoison, ratCount, poisonCount } = await checkWalletNFTs(address);
    const tier = getTier(hasRat, hasPoison);
    const dailyPoints = calcDailyPoints(ratCount, poisonCount);

    const { data: wallet } = await supabase
      .from('wallets')
      .select('*')
      .eq('address', address)
      .single();

    res.json({
      registered: !!wallet,
      wallet: wallet || null,
      liveCheck: {
        hasRat,
        hasPoison,
        ratCount,
        poisonCount,
        tier,
        tierLabel: getTierLabel(tier),
        dailyPoints,
      },
    });

  } catch (err) {
    console.error('[/api/wallet]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/leaderboard', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')
      .limit(50);

    if (error) throw error;
    res.json({ leaderboard: data });
  } catch (err) {
    console.error('[/api/leaderboard]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const { data: wallets, error } = await supabase
      .from('wallets')
      .select('current_tier, total_points, is_staking');

    if (error) throw error;

    const staking = wallets.filter(w => w.is_staking);
    const totalPoints = wallets.reduce((sum, w) => sum + (w.total_points || 0), 0);

    const tierCounts = {
      both:         staking.filter(w => w.current_tier === 'both').length,
      rat_only:     staking.filter(w => w.current_tier === 'rat_only').length,
      poison_only:  staking.filter(w => w.current_tier === 'poison_only').length,
    };

    res.json({ totalStakers: staking.length, totalPointsAwarded: totalPoints, tierCounts });
  } catch (err) {
    console.error('[/api/stats]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/unstake', async (req, res) => {
  const { address } = req.body;
  if (!address) return res.status(400).json({ error: 'Wallet address required' });

  const normalizedAddress = address.toLowerCase();

  try {
    const { data: wallet } = await supabase
      .from('wallets')
      .select('*')
      .eq('address', normalizedAddress)
      .single();

    if (!wallet) return res.status(404).json({ error: 'Wallet not found' });

    await supabase.from('points_history').insert({
      wallet_address: normalizedAddress,
      points_before: wallet.total_points,
      points_after: 0,
      change_reason: 'unstake_wipe',
    });

    await supabase.from('wallets').update({
      is_staking: false,
      total_points: 0,
      current_tier: 'none',
      points_wiped_at: new Date().toISOString(),
    }).eq('address', normalizedAddress);

    res.json({ success: true, message: 'Unstaked and points wiped' });

  } catch (err) {
    console.error('[/api/unstake]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`[Server] Raticals staking backend running on port ${PORT}`);
});

module.exports = app;
