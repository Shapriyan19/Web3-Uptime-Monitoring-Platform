// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./DomainRegistry.sol";

contract RewardsManager {
    DomainRegistry public domainRegistry;
    address public resultAggregator;

    uint256 public rewardPerCheck = 0.001 ether;
    uint256 public slashAmount = 0.005 ether;

    event RewardsPaid(string indexed domainURL, uint256 indexed cycleId, address indexed validator, uint256 amount);
    event ValidatorsSlashed(string indexed domainURL, uint256 indexed cycleId, address indexed validator, uint256 amount);

    modifier onlyResultAggregator() {
        require(msg.sender == resultAggregator, "Only ResultAggregator allowed");
        _;
    }

    constructor(address _domainRegistry) {
        domainRegistry = DomainRegistry(_domainRegistry);
    }

    function setResultAggregator(address _resultAggregator) external {
        require(resultAggregator == address(0), "ResultAggregator already set");
        resultAggregator = _resultAggregator;
    }

    function distributeRewards(string memory _domainURL, uint256 _cycleId, address[] memory honestValidators) external onlyResultAggregator {
        // Reward honest validators from domain owner's stakingBalance

        // Get domain info
        (,uint256 domainStake,) = domainRegistry.domains(_domainURL);
        uint256 totalReward = rewardPerCheck * honestValidators.length;
        require(domainStake >= totalReward, "Insufficient stake for rewards");
        domainRegistry.deductStake(_domainURL, totalReward);

        for (uint256 i = 0; i < honestValidators.length; i++) {
            // Transfer reward - here simulated by payable call or internal balance update
            payable(honestValidators[i]).transfer(rewardPerCheck);
            emit RewardsPaid(_domainURL, _cycleId, honestValidators[i], rewardPerCheck);
        }

        // Deduct totalReward from domain staking balance
        // Implement a setter function in DomainRegistry or a function to reduce staking balance (not implemented here)
        // domainRegistry.deductStake(_domainURL, totalReward); <-- Needs implementation in DomainRegistry
    }

    // Fallback function to receive ETH for rewards
    receive() external payable {}
}
