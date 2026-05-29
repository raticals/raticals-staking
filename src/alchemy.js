const { Alchemy, Network } = require('alchemy-sdk');

const alchemy = new Alchemy({
  apiKey: process.env.ALCHEMY_API_KEY,
  network: Network.ETH_MAINNET,
});

const RATICALS_CONTRACT = process.env.RATICALS_CONTRACT.toLowerCase();
const RATPOISON_CONTRACT = process.env.RATPOISON_CONTRACT.toLowerCase();

async function checkWalletNFTs(walletAddress) {
  try {
    const response = await alchemy.nft.getNftsForOwner(walletAddress, {
      contractAddresses: [RATICALS_CONTRACT, RATPOISON_CONTRACT],
      omitMetadata: true,
    });

    let hasRat = false;
    let hasPoison = false;

    console.log(`[Alchemy] Wallet ${walletAddress} owns ${response.totalCount} NFTs in these contracts`);

    for (const nft of response.ownedNfts) {
      const contract = nft.contract.address.toLowerCase();
      console.log(`[Alchemy] Found NFT from contract: ${contract}`);
      if (contract === RATICALS_CONTRACT) hasRat = true;
      if (contract === RATPOISON_CONTRACT) hasPoison = true;
    }

    return { hasRat, hasPoison };
  } catch (err) {
    console.error(`[Alchemy] Error checking wallet ${walletAddress}:`, err.message);
    // Fallback — try direct REST API call
    return await checkWalletNFTsFallback(walletAddress);
  }
}

async function checkWalletNFTsFallback(walletAddress) {
  try {
    const axios = require('axios');
    const url = `https://eth-mainnet.g.alchemy.com/nft/v3/${process.env.ALCHEMY_API_KEY}/getNFTsForOwner`;
    const response = await axios.get(url, {
      params: {
        owner: walletAddress,
        'contractAddresses[]': [RATICALS_CONTRACT, RATPOISON_CONTRACT],
        withMetadata: false,
        pageSize: 100,
      }
    });

    let hasRat = false;
    let hasPoison = false;

    console.log(`[Alchemy Fallback] Total NFTs found: ${response.data.totalCount}`);

    for (const nft of response.data.ownedNfts || []) {
      const contract = nft.contract.address.toLowerCase();
      console.log(`[Alchemy Fallback] Found NFT from contract: ${contract}`);
      if (contract === RATICALS_CONTRACT) hasRat = true;
      if (contract === RATPOISON_CONTRACT) hasPoison = true;
    }

    return { hasRat, hasPoison };
  } catch (err) {
    console.error(`[Alchemy Fallback] Error:`, err.message);
    return { hasRat: false, hasPoison: false };
  }
}

module.exports = { checkWalletNFTs };
