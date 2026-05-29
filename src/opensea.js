const axios = require('axios');

const RATICALS_CONTRACT = process.env.RATICALS_CONTRACT.toLowerCase();
const RATPOISON_CONTRACT = process.env.RATPOISON_CONTRACT.toLowerCase();

async function checkIfListed(walletAddress) {
  try {
    const headers = {
      'accept': 'application/json',
      'x-api-key': process.env.OPENSEA_API_KEY,
    };

    const contracts = [RATICALS_CONTRACT, RATPOISON_CONTRACT];
    
    for (const contract of contracts) {
      const url = `https://api.opensea.io/api/v2/listings/collection/${contract}/all?limit=50`;
      const response = await axios.get(url, { headers });

      if (response.data && response.data.listings) {
        for (const listing of response.data.listings) {
          const maker = listing?.protocol_data?.parameters?.offerer?.toLowerCase();
          if (maker === walletAddress.toLowerCase()) {
            return { isListed: true };
          }
        }
      }
    }

    return { isListed: false };
  } catch (err) {
    console.error(`[OpenSea] Error checking listings for ${walletAddress}:`, err.message);
    return { isListed: false };
  }
}

module.exports = { checkIfListed };
