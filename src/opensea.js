const axios = require('axios');

const COLLECTION_SLUGS = [
  process.env.RATICALS_COLLECTION_SLUG || 'raticalseth',
  process.env.RATPOISON_COLLECTION_SLUG || 'ratpoison',
];

async function checkIfListed(walletAddress) {
  try {
    const headers = {
      accept: 'application/json',
      'x-api-key': process.env.OPENSEA_API_KEY,
    };

    for (const slug of COLLECTION_SLUGS) {
      const url = `https://api.opensea.io/api/v2/listings/collection/${slug}/all?limit=100`;

      const response = await axios.get(url, {
        headers,
        timeout: 15000,
      });

      const listings = response.data?.listings || [];

      for (const listing of listings) {
        const maker = listing?.protocol_data?.parameters?.offerer?.toLowerCase();

        if (maker === walletAddress.toLowerCase()) {
          return { ok: true, isListed: true };
        }
      }
    }

    return { ok: true, isListed: false };
  } catch (err) {
    console.error(`[OpenSea] Listing check failed for ${walletAddress}:`, err.response?.data || err.message);

    return {
      ok: false,
      isListed: false,
      error: err.message,
    };
  }
}

module.exports = { checkIfListed };
