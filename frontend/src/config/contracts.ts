// Contract addresses deployed on Sepolia testnet
export const CONTRACT_ADDRESSES = {
  domainRegistry: "0xb36ba0396bB53341BA1238e0671b797777bC0148",
  monitoringScheduler: "0xFE391CC8A150ebAFc420A5C4f861330552c9D214",
  resultAggregator: "0xCfec24Ae2b825229762377f2E65C40B18D8a1157",
  rewardsManager: "0x2cdF1705a05752Fa30aa768c83f4569a047577FC",
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

// Minimum registration stake (0.25 ETH)
export const MIN_REGISTRATION_STAKE = "0.01";

// Minimum stake required (0.1 ETH)
export const MIN_STAKE = "0.001";

