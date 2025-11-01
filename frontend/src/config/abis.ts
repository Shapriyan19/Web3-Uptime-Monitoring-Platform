// DomainRegistry ABI - extracted from artifact
export const DOMAIN_REGISTRY_ABI = [
  {
    inputs: [
      { internalType: "string", name: "_domainURL", type: "string" },
      { internalType: "uint256", name: "_interval", type: "uint256" }
    ],
    name: "registerDomain",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [{ internalType: "string", name: "_domainURL", type: "string" }],
    name: "unRegisterDomain",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [{ internalType: "string", name: "_domainURL", type: "string" }],
    name: "stakeTokens",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [{ internalType: "string", name: "_domainURL", type: "string" }],
    name: "withdrawStake",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "string", name: "_domainURL", type: "string" },
      { internalType: "uint256", name: "_interval", type: "uint256" }
    ],
    name: "updateInterval",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "string", name: "_domainURL", type: "string" }],
    name: "getDomainInfo",
    outputs: [
      {
        components: [
          { internalType: "address", name: "owner", type: "address" },
          { internalType: "uint256", name: "stakingBalance", type: "uint256" },
          { internalType: "uint256", name: "interval", type: "uint256" }
        ],
        internalType: "struct DomainRegistry.DomainInfo",
        name: "",
        type: "tuple"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "getOwnerDomains",
    outputs: [{ internalType: "string[]", name: "", type: "string[]" }],
    stateMutability: "view",
    type: "function"
  }
] as const;

// MonitoringScheduler ABI
export const MONITORING_SCHEDULER_ABI = [
  "function registerValidator() public",
  "function deactivateValidator() public",
  "function assignJob(string memory _domainURL) public returns(address)",
  "function completeJob(string memory _domainURL) public",
  "function getActiveValidators() public view returns(address[] memory)",
  "function getPendingJobs(address _validator) public view returns(string[] memory)",
  "function getDomainHistory(string memory _domainURL) public view returns(tuple(string domainURL, address validator, uint256 assignedTime, uint256 nextCheckTime, bool isCompleted)[] memory)",
  "event ValidatorRegistered(address validator)",
  "event JobAssigned(string domainURL, address validator, uint256 timestamp)",
  "event JobCompleted(string domainURL, address validator, uint256 timestamp)",
] as const;

