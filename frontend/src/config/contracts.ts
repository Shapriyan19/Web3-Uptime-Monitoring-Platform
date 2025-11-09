// Contract addresses deployed on Sepolia testnet
export const CONTRACT_ADDRESSES = {
  domainRegistry: "0x3D5A4927a2a7E06d3F791d7BEe7A7bBBcA2965E1",
  monitoringScheduler: "0x4B9f4d7F2FC6CA0f3be5D17f4E830f18d57CE91d",
  resultAggregator: "0xBe25fe268c6c41f2346910b748BFF7e0cfF82bF0",
  rewardsManager: "0xc01719d334018BcB6AfEc40BC1C3f7a1A590Ec19",
};

// Sepolia network configuration
export const NETWORK_CONFIG = {
  chainId: "0xaa36a7", // 11155111 in hex
  chainName: "Sepolia",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: ["https://eth-sepolia.g.alchemy.com/v2/dVpZP5_4-Nj6O49fInAPMVEvNvxx_7il"],
  blockExplorerUrls: ["https://sepolia.etherscan.io"],
};

// Minimum registration stake (0.01 ETH)
export const MIN_REGISTRATION_STAKE = "0.01";

// Minimum stake required (0.001 ETH)
export const MIN_STAKE = "0.001";

