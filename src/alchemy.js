require('dotenv').config();
const axios = require('axios');

const RATICALS_CONTRACT  = process.env.RATICALS_CONTRACT.toLowerCase();
const RATPOISON_CONTRACT = process.env.RATPOISON_CONTRACT.toLowerCase();

async function checkWalletNFTs(walletAddress) {
  try {
    const results = await Promise.all([
      checkContract(walletAddress, RATICALS_CONTRACT),
      checkContract(walletAddress, RATPOISON_CONTRACT),
    ]);

    const hasRat    = results[0];
    const hasPoison = results[1];

    console.log(`[Moralis] ${walletAddress} — hasRat: ${hasRat}, hasPoison: ${hasPoison}`);
    return { hasRat, hasPoison };

  } catch (err) {
    console.error('[Moralis] Fatal error:', err.message);
    return { hasRat: false, hasPoison: false };
  }
}

async function checkContract(walletAddress, contractAddress) {
  try {
    const url = `https://deep-index.moralis.io/api/v2.2/${walletAddress}/nft`;
    const response = await axios.get(url, {
      headers: {
        accept: 'application/json',
        'X-API-Key': process.env.MORALIS_API_KEY,
      },
      params: {
        chain: 'eth',
        token_addresses: [contractAddress],
        limit: 1,
        media_items: false,
      },
      timeout: 10000,
    });

    const count = response.data?.result?.length || 0;
    console.log(`[Moralis] Contract ${contractAddress} — found ${count} NFTs`);
    return count > 0;

  } catch (err) {
    console.error(`[Moralis] Error checking ${contractAddress}:`, err.message);
    return false;
  }
}

module.exports = { checkWalletNFTs };
