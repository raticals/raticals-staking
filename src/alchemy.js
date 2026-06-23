require('dotenv').config();
const axios = require('axios');

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is missing`);
  return value;
}

const RATICALS_CONTRACT = requireEnv('RATICALS_CONTRACT').toLowerCase();
const RATPOISON_CONTRACT = requireEnv('RATPOISON_CONTRACT').toLowerCase();

async function getContractCount(walletAddress, contractAddress) {
  let count = 0;
  let cursor = null;

  do {
    const params = {
      chain: 'eth',
      format: 'decimal',
      limit: 100,
      media_items: false,
    };

    if (cursor) params.cursor = cursor;

    const url = `https://deep-index.moralis.io/api/v2.2/${walletAddress}/nft/${contractAddress}`;

    const response = await axios.get(url, {
      headers: {
        accept: 'application/json',
        'X-API-Key': process.env.MORALIS_API_KEY,
      },
      params,
      timeout: 15000,
    });

    const results = response.data?.result || [];
    count += results.length;
    cursor = response.data?.cursor || null;
  } while (cursor);

  console.log(`[Moralis] ${walletAddress} — contract ${contractAddress} — count: ${count}`);
  return count;
}

async function checkWalletNFTs(walletAddress) {
  try {
    const [ratCount, poisonCount] = await Promise.all([
      getContractCount(walletAddress, RATICALS_CONTRACT),
      getContractCount(walletAddress, RATPOISON_CONTRACT),
    ]);

    return {
      ok: true,
      hasRat: ratCount > 0,
      hasPoison: poisonCount > 0,
      ratCount,
      poisonCount,
    };
  } catch (err) {
    console.error('[Moralis] NFT check failed:', err.response?.data || err.message);

    return {
      ok: false,
      error: err.message,
      hasRat: null,
      hasPoison: null,
      ratCount: null,
      poisonCount: null,
    };
  }
}

module.exports = { checkWalletNFTs };
