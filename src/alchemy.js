require('dotenv').config();
const axios = require('axios');

const RATICALS_CONTRACT  = process.env.RATICALS_CONTRACT.toLowerCase();
const RATPOISON_CONTRACT = process.env.RATPOISON_CONTRACT.toLowerCase();

// ── 1. Alchemy SDK ──────────────────────────────────────────────────────────
async function checkViaAlchemySDK(walletAddress) {
  const { Alchemy, Network } = require('alchemy-sdk');
  const alchemy = new Alchemy({
    apiKey: process.env.ALCHEMY_API_KEY,
    network: Network.ETH_MAINNET,
  });

  const response = await alchemy.nft.getNftsForOwner(walletAddress, {
    contractAddresses: [RATICALS_CONTRACT, RATPOISON_CONTRACT],
    omitMetadata: true,
  });

  let hasRat = false, hasPoison = false;
  console.log(`[Alchemy SDK] ${walletAddress} owns ${response.totalCount} NFTs`);

  for (const nft of response.ownedNfts) {
    const contract = nft.contract.address.toLowerCase();
    if (contract === RATICALS_CONTRACT)  hasRat    = true;
    if (contract === RATPOISON_CONTRACT) hasPoison = true;
  }
  return { hasRat, hasPoison };
}

// ── 2. Alchemy REST ─────────────────────────────────────────────────────────
async function checkViaAlchemyREST(walletAddress) {
  const url = `https://eth-mainnet.g.alchemy.com/nft/v3/${process.env.ALCHEMY_API_KEY}/getNFTsForOwner`;
  const response = await axios.get(url, {
    params: {
      owner: walletAddress,
      'contractAddresses[]': [RATICALS_CONTRACT, RATPOISON_CONTRACT],
      withMetadata: false,
      pageSize: 100,
    },
    timeout: 10000,
  });

  let hasRat = false, hasPoison = false;
  console.log(`[Alchemy REST] Total NFTs: ${response.data.totalCount}`);

  for (const nft of response.data.ownedNfts || []) {
    const contract = nft.contract.address.toLowerCase();
    if (contract === RATICALS_CONTRACT)  hasRat    = true;
    if (contract === RATPOISON_CONTRACT) hasPoison = true;
  }
  return { hasRat, hasPoison };
}

// ── 3. OpenSea fallback ─────────────────────────────────────────────────────
async function checkViaOpenSea(walletAddress) {
  const headers = {
    accept: 'application/json',
    'x-api-key': process.env.OPENSEA_API_KEY,
  };

  let hasRat = false, hasPoison = false;

  // Check Raticals
  try {
    const url = `https://api.opensea.io/api/v2/chain/ethereum/account/${walletAddress}/nfts?collection=${RATICALS_CONTRACT}&limit=1`;
    const res = await axios.get(url, { headers, timeout: 10000 });
    if (res.data?.nfts?.length > 0) hasRat = true;
    console.log(`[OpenSea] Rat check: ${hasRat}`);
  } catch (e) {
    console.error('[OpenSea] Rat check failed:', e.message);
  }

  // Check RatPoison
  try {
    const url = `https://api.opensea.io/api/v2/chain/ethereum/account/${walletAddress}/nfts?collection=${RATPOISON_CONTRACT}&limit=1`;
    const res = await axios.get(url, { headers, timeout: 10000 });
    if (res.data?.nfts?.length > 0) hasPoison = true;
    console.log(`[OpenSea] Poison check: ${hasPoison}`);
  } catch (e) {
    console.error('[OpenSea] Poison check failed:', e.message);
  }

  return { hasRat, hasPoison };
}

// ── Main export — tries each method in order ────────────────────────────────
async function checkWalletNFTs(walletAddress) {
  // Try Alchemy SDK
  try {
    return await checkViaAlchemySDK(walletAddress);
  } catch (err) {
    console.warn('[NFT Check] Alchemy SDK failed, trying REST:', err.message);
  }

  // Try Alchemy REST
  try {
    return await checkViaAlchemyREST(walletAddress);
  } catch (err) {
    console.warn('[NFT Check] Alchemy REST failed, trying OpenSea:', err.message);
  }

  // Try OpenSea
  try {
    return await checkViaOpenSea(walletAddress);
  } catch (err) {
    console.error('[NFT Check] All methods failed:', err.message);
  }

  return { hasRat: false, hasPoison: false };
}

module.exports = { checkWalletNFTs };
