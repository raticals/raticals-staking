require('dotenv').config();
const axios = require('axios');

const RATICALS_CONTRACT  = process.env.RATICALS_CONTRACT.toLowerCase();
const RATPOISON_CONTRACT = process.env.RATPOISON_CONTRACT.toLowerCase();

async function checkContract(walletAddress, contractAddress) {
  try {
    const url = `https://deep-index.moralis.io/api/v2.2/${walletAddress}/nft/${contractAddress}`;
    const response = await axios.get(url, {
      headers: {
        accept: 'application/json',
        'X-API-Key': process.env.MORALIS_API_KEY,
      },
      params: {
        chain: 'eth',
        format: 'decimal',
        limit: 1,
        media_items: false,
      },
      timeout: 10000,
    });

    const count = response.data?.result?.length || 0;
    console.log(`[Moralis] ${walletAddress} — contract ${contractAddress} — found ${count}`);
    return count > 0;

  } catch (err) {
    console.error(`[Moralis] Error checking ${contractAddress}:`, err.message);
    return false;
  }
}

async function checkWalletNFTs(walletAddress) {
  try {
    const [hasRat, hasPoison] = await Promise.all([
      checkContract(walletAddress, RATICALS_CONTRACT),
      checkContract(walletAddress, RATPOISON_CONTRACT),
    ]);

    console.log(`[Moralis] Result — hasRat: ${hasRat}, hasPoison: ${hasPoison}`);
    return { hasRat, hasPoison };

  } catch (err) {
    console.error('[Moralis] Fatal:', err.message);
    return { hasRat: false, hasPoison: false };
  }
}

module.exports = { checkWalletNFTs };
