# Web3 Uptime Monitoring Platform

**This codebase includes a README file (markdown format) for deployment purposes.**

## Overview

This is a decentralized, Web3-based uptime monitoring platform that leverages blockchain technology, smart contracts, and distributed validators to provide tamper-proof website uptime monitoring. The platform ensures transparency and trust through on-chain verification of downtime incidents, making it ideal for high-stakes web services such as fintech, SaaS, and public infrastructure.

## Website Details

The platform consists of two main components:

1. **Smart Contracts** (Solidity): A suite of blockchain contracts deployed on Ethereum-compatible networks that handle:
   - Domain registration with token staking
   - Validator assignment and consensus
   - Result aggregation and incident recording
   - Rewards and slashing mechanisms

2. **Frontend Dashboard** (React + TypeScript + Vite): A user-friendly web interface that provides:
   - Website registration and domain management
   - Token staking interface
   - Real-time uptime analytics and incident reports
   - Validator status and performance metrics
   - Wallet connection and Web3 integration

The frontend connects to the deployed smart contracts via ethers.js, allowing users to interact with the decentralized monitoring system through a modern web interface.

## Background & Problem Statement

Traditional website uptime monitoring solutions are centralized and susceptible to manipulation or failure by a single authority, undermining trust in published outage records. This issue is acute for high-stakes web services, such as fintech, SaaS, and public infrastructure, where independently-verifiable uptime is crucial for transparency and SLAs.

Centralized monitoring services face several critical problems:
- **Single Point of Failure**: If the monitoring service goes down, all monitoring data is lost or inaccessible
- **Trust Issues**: Users must trust a single authority to accurately report uptime without manipulation
- **Lack of Transparency**: Outage records can be altered or hidden without public verification
- **No Accountability**: There's no mechanism to ensure validators are honest in their reporting

## Project Objective (MVP & Goals)

To design and develop a decentralized, Web3-based uptime monitoring platform that leverages blockchain, smart contracts, and distributed validators.

### MVP Scope

1. **User Dashboard**: Site registration, token staking, and viewing of incident analytics
2. **Smart Contracts**: Handling of validator assignment, result aggregation, rewards/slashing, and data posting
3. **Validator Agent System**: Performing checks and submitting signed results

## Feature Requirements

### 1. Registration with Staking
- Users can register their websites/domains on the platform
- Registration requires token staking to ensure commitment and prevent spam
- Staked tokens serve as collateral and can be slashed for malicious behavior

### 2. Validator Assignment with On-Chain Consensus and Reporting
- Validators are assigned to monitor registered domains through on-chain consensus mechanisms
- Multiple validators monitor each domain to ensure redundancy and accuracy
- Validators perform periodic uptime checks and submit signed results to the blockchain

### 3. Tamper-Proof Aggregation of Downtime Incidents (On-Chain)
- All monitoring results and downtime incidents are recorded on-chain
- Blockchain immutability ensures that incident records cannot be altered or deleted
- Aggregation logic combines results from multiple validators to determine consensus

### 4. Incentive and Slashing Logic for Validator Honesty
- Validators are rewarded with tokens for honest and accurate reporting
- Validators who report false information or fail to perform checks face token slashing
- Economic incentives align validator behavior with platform integrity

## Future Improvements

### 1. Geo-Distributed Validator Requirements
- Implement requirements for validators to be geographically distributed
- Ensures monitoring from multiple locations to detect region-specific outages
- Provides learning opportunities about decentralized network topologies

### 2. HTTPS Certificate/Content Hash Verification
- Add cryptographic verification of HTTPS certificates
- Implement content hash verification to detect tampering or changes
- Enhances security and trust through cryptographic proofs

### 3. Uptime NFT Badges (ERC721 Smart Contracts)
- Issue NFT badges based on uptime performance
- Creates gamification and open user engagement
- Provides verifiable proof of uptime achievements

### 4. Open API for Integrations
- Develop REST/Web3 API endpoints for third-party integrations
- Enables other services to query uptime data programmatically
- Bridges traditional REST APIs with Web3 functionality

## Project Structure

```
├── contracts/              # Solidity smart contracts
│   ├── DomainRegistry.sol      # Domain registration and management
│   ├── MonitoringScheduler.sol # Validator assignment and scheduling
│   ├── ResultAggregator.sol    # Result aggregation logic
│   └── RewardsManager.sol      # Rewards and slashing mechanisms
├── frontend/              # React frontend application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom React hooks
│   │   └── config/        # Contract ABIs and addresses
├── scripts/               # Deployment and utility scripts
└── test/                  # Test files
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Hardhat
- A Web3 wallet (MetaMask recommended)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Shapriyan19/Web3-Uptime-Monitoring-Platform.git
cd "Web3 Uptime Monitoring Platform"
```

2. Install dependencies:
```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

3. Configure environment variables:
   - Create a `.env` file in the root directory
   - Add your private key and network configuration

### Deployment

> **Note**: If you are using the already deployed contracts (see [Deployed Contracts](#deployed-contracts) section below), you do **not** need to deploy the contracts yourself. Simply skip step 1 and proceed to step 2.

1. Deploy smart contracts (only if deploying new contracts):
```bash
npx hardhat run scripts/deploy.ts --network <network-name>
```

2. Update contract addresses in `frontend/src/config/contracts.ts` with the deployed contract addresses

3. Start the frontend development server:
```bash
cd frontend
npm run dev
```

### Running Tests

```bash
# Run all tests
npx hardhat test
```

## Deployed Contracts

The following smart contracts have been deployed to the blockchain:

| Contract | Address | Description |
|----------|---------|-------------|
| **DomainRegistry** | `0x3D5A4927a2a7E06d3F791d7BEe7A7bBBcA2965E1` | Handles domain registration and management |
| **MonitoringScheduler** | `0x4B9f4d7F2FC6CA0f3be5D17f4E830f18d57CE91d` | Manages validator assignment and scheduling |
| **ResultAggregator** | `0xBe25fe268c6c41f2346910b748BFF7e0cfF82bF0` | Aggregates monitoring results and records incidents |
| **RewardsManager** | `0xc01719d334018BcB6AfEc40BC1C3f7a1A590Ec19` | Handles rewards distribution and slashing |

**Deployment Account**: `0x235e0E6383467b03d0D03Db0E474E447a571ac48`

> **Note**: These addresses should be updated in `frontend/src/config/contracts.ts` to connect the frontend to the deployed contracts.

### Important: Validator Requirements

**At least 3 validators are required** to see monitoring results. The platform uses a consensus mechanism that requires multiple validators to agree on uptime status before results are aggregated and recorded on-chain. This ensures accuracy and prevents single points of failure. Without a minimum of 3 active validators monitoring a domain, results will not be processed or displayed.

## Technology Stack

- **Smart Contracts**: Solidity 0.8.28
- **Development Framework**: Hardhat 3.0
- **Frontend**: React 19, TypeScript, Vite
- **Web3 Library**: ethers.js 6.15.0
- **Testing**: Mocha, Chai
- **Chainlink**: Automation and oracle services

## License

ISC

## Contributing

This is a project for SC4053.
