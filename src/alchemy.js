require('dotenv').config();
const axios = require('axios');

const RATICALS_CONTRACT  = process.env.RATICALS_CONTRACT.toLowerCase();
const RATPOISON_CONTRACT = process.env.RATPOISON_CONTRACT.toLowerCase();

async function getContractCount(walletAddress, contractAddress) {
  try {
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
        timeout: 10000,
      });

      const results = response.data?.result || [];
      count += results.length;
      cursor = response.data?.cursor || null;

    } while (cursor);

    console.log(`[Moralis] ${walletAddress} — contract ${contractAddress} — count: ${count}`);
    return count;

  } catch (err) {
    console.error(`[Moralis] Error checking ${contractAddress}:`, err.message);
    return 0;
  }
}

async function checkWalletNFTs(walletAddress) {
  try {
    const [ratCount, poisonCount] = await Promise.all([
      getContractCount(walletAddress, RATICALS_CONTRACT),
      getContractCount(walletAddress, RATPOISON_CONTRACT),
    ]);

    const hasRat    = ratCount > 0;
    const hasPoison = poisonCount > 0;

    console.log(`[Moralis] Result — ratCount: ${ratCount}, poisonCount: ${poisonCount}`);
    return { hasRat, hasPoison, ratCount, poisonCount };

  } catch (err) {
    console.error('[Moralis] Fatal:', err.message);
    return { hasRat: false, hasPoison: false, ratCount: 0, poisonCount: 0 };
  }
}

module.exports = { checkWalletNFTs };
