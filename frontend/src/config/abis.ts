// Import ABIs from artifacts
// These are simplified versions - you should import from actual JSON files

export const DOMAIN_REGISTRY_ABI = [
  {
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "address", name: "owner", type: "address" },
      { indexed: false, internalType: "string", name: "domainURL", type: "string" }
    ],
    name: "DomainRegistered",
    type: "event"
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
  },
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
    inputs: [
      { internalType: "string", name: "_domainURL", type: "string" }
    ],
    name: "stakeTokens",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "string", name: "_domainURL", type: "string" }
    ],
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
    inputs: [
      { internalType: "string", name: "_domainURL", type: "string" }
    ],
    name: "unRegisterDomain",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  }
];

export const RESULT_AGGREGATOR_ABI = [
  {
    inputs: [{ internalType: "string", name: "_domainURL", type: "string" }],
    name: "getDomainStatus",
    outputs: [
      { internalType: "bool", name: "isUp", type: "bool" },
      { internalType: "string", name: "status", type: "string" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "string", name: "_domainURL", type: "string" }],
    name: "fetchDomainStats",
    outputs: [
      {
        components: [
          { internalType: "string", name: "domainURL", type: "string" },
          { internalType: "uint256", name: "totalChecks", type: "uint256" },
          { internalType: "uint256", name: "successfulChecks", type: "uint256" },
          { internalType: "uint256", name: "failedChecks", type: "uint256" },
          { internalType: "uint256", name: "uptimePercentage", type: "uint256" },
          { internalType: "uint256", name: "totalDownTime", type: "uint256" },
          { internalType: "bool", name: "currentStatus", type: "bool" }
        ],
        internalType: "struct ResultAggregator.DomainStats",
        name: "",
        type: "tuple"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "string", name: "_domainURL", type: "string" },
      { internalType: "uint256", name: "count", type: "uint256" }
    ],
    name: "getRecentCycles",
    outputs: [
      {
        components: [
          { internalType: "string", name: "domainURL", type: "string" },
          { internalType: "uint256", name: "cycleId", type: "uint256" },
          { internalType: "uint256", name: "assignedTime", type: "uint256" },
          { internalType: "uint256", name: "submissionDeadline", type: "uint256" },
          { internalType: "uint256", name: "requiredValidators", type: "uint256" },
          { internalType: "uint256", name: "submittedCount", type: "uint256" },
          { internalType: "bool", name: "consensusReached", type: "bool" },
          { internalType: "string", name: "consensusStatus", type: "string" },
          { internalType: "uint256", name: "consensusTimestamp", type: "uint256" },
          { internalType: "bool", name: "isFinalized", type: "bool" }
        ],
        internalType: "struct ResultAggregator.CheckCycle[]",
        name: "",
        type: "tuple[]"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "string", name: "_domainURL", type: "string" }],
    name: "getLatestCycle",
    outputs: [
      {
        components: [
          { internalType: "string", name: "domainURL", type: "string" },
          { internalType: "uint256", name: "cycleId", type: "uint256" },
          { internalType: "uint256", name: "assignedTime", type: "uint256" },
          { internalType: "uint256", name: "submissionDeadline", type: "uint256" },
          { internalType: "uint256", name: "requiredValidators", type: "uint256" },
          { internalType: "uint256", name: "submittedCount", type: "uint256" },
          { internalType: "bool", name: "consensusReached", type: "bool" },
          { internalType: "string", name: "consensusStatus", type: "string" },
          { internalType: "uint256", name: "consensusTimestamp", type: "uint256" },
          { internalType: "bool", name: "isFinalized", type: "bool" }
        ],
        internalType: "struct ResultAggregator.CheckCycle",
        name: "",
        type: "tuple"
      }
    ],
    stateMutability: "view",
    type: "function"
  }
];

export const MONITORING_SCHEDULER_ABI = [
  {
    inputs: [{ internalType: "string", name: "_domainURL", type: "string" }],
    name: "getDomainHistory",
    outputs: [
      {
        components: [
          { internalType: "string", name: "domainURL", type: "string" },
          { internalType: "address", name: "validator", type: "address" },
          { internalType: "uint256", name: "assignedTime", type: "uint256" },
          { internalType: "uint256", name: "nextCheckTime", type: "uint256" },
          { internalType: "bool", name: "isCompleted", type: "bool" }
        ],
        internalType: "struct MonitoringScheduler.MonitoringJob[]",
        name: "",
        type: "tuple[]"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "registerValidator",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "deactivateValidator",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "_validator", type: "address" }],
    name: "getPendingJobs",
    outputs: [{ internalType: "string[]", name: "", type: "string[]" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "string", name: "_domainURL", type: "string" }],
    name: "completeJob",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "getActiveValidators",
    outputs: [{ internalType: "address[]", name: "", type: "address[]" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "validators",
    outputs: [
      { internalType: "address", name: "validatorAddress", type: "address" },
      { internalType: "bool", name: "isActive", type: "bool" },
      { internalType: "uint256", name: "totalJobsAssigned", type: "uint256" },
      { internalType: "uint256", name: "lastAssignedTime", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  }
];

export const RESULT_AGGREGATOR_SUBMIT_ABI = [
  {
    inputs: [
      { internalType: "string", name: "_domainURL", type: "string" },
      { internalType: "uint256", name: "_cycleId", type: "uint256" },
      { internalType: "bool", name: "_isUp", type: "bool" },
      { internalType: "uint16", name: "_httpStatusCode", type: "uint16" },
      { internalType: "bytes", name: "_signature", type: "bytes" }
    ],
    name: "submitResult",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
];

