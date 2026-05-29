const { Alchemy, Network } = require('alchemy-sdk');

const alchemy = new Alchemy({
  apiKey: process.env.ALCHEMY_API_KEY,
  network: Network.ETH_MAINNET,
});

const RATICALS_CONTRACT = process.env.RATICALS_CONTRACT.toLowerCase();
const RATPOISON_CONTRACT = process.env.RATPOISON_CONTRACT.toLowerCase();

async function checkWalletNFTs(walletAddress) {
  try {
    const nfts = await alchemy.nft.getNftsForOwner(walletAddress, {
      contractAddresses: [RATICALS_CONTRACT, RATPOISON_CONTRACT],
    });

    let hasRat = false;
    let hasPoison = false;

    for (const nft of nfts.ownedNfts) {
      const contract = nft.contract.address.toLowerCase();
      if (contract === RATICALS_CONTRACT) hasRat = true;
      if (contract === RATPOISON_CONTRACT) hasPoison = true;
    }

    return { hasRat, hasPoison };
  } catch (err) {
    console.error(`[Alchemy] Error checking wallet ${walletAddress}:`, err.message);
    return { hasRat: false, hasPoison: false };
  }
}

module.exports = { checkWalletNFTs };
