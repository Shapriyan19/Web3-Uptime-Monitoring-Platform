// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import "./MonitoringScheduler.sol";
import "./DomainRegistry.sol";
import "@chainlink/contracts/src/v0.8/automation/interfaces/AutomationCompatibleInterface.sol";

contract ResultAggregator is AutomationCompatibleInterface {

    MonitoringScheduler public monitoringScheduler;
    DomainRegistry public domainRegistry;
    address public rewardsManager;
    uint256 public consensusThreshold = 60;
    uint256 public submissionWindow = 5 minutes;
    uint256 public minValidatorsRequired = 3;

    string[] public monitoredDomains;
     uint256 public lastCheckedDomainIndex = 0; // NEW: Track which domain to check next

    constructor(address _monitoringScheduler, address _domainRegistry){
        monitoringScheduler = MonitoringScheduler(_monitoringScheduler);
        domainRegistry = DomainRegistry(_domainRegistry);
    }

    struct ValidatorResult {
        address validator;
        bool isUp;
        uint16 httpStatusCode;
        uint256 submissionTime;
        bytes signature;
    }

    struct CheckCycle {
        string domainURL;
        uint256 cycleId;
        uint256 assignedTime;
        uint256 submissionDeadline;
        uint256 requiredValidators;
        uint256 submittedCount;
        ValidatorResult[] validationResults;
        bool consensusReached;
        string consensusStatus;
        uint256 consensusTimestamp;
        bool isFinalized;
    }

    struct DomainStats {
        string domainURL;
        uint256 totalChecks;
        uint256 successfulChecks;
        uint256 failedChecks;
        uint256 uptimePercentage;
        uint256 totalDownTime;
        bool currentStatus;
    }
    
    mapping(string=>mapping(uint256=>CheckCycle)) public cycles;
    mapping(string => uint256) public currentCycleId;
    mapping(string => bool) public isDomainMonitored;
    mapping(string => address[]) internal urlValidator;
    mapping(string => DomainStats) public domainStats;

    event CheckCycleInitiated(string indexed domainURL, uint256 indexed cycleId, address[] assignedValidators);
    event ResultSubmitted(string indexed domainURL, uint256 indexed cycleId, address indexed validator, bool isUp, uint256 timestamp);
    event ConsensusReached(string indexed domainURL, uint256 indexed cycleId, string consensusStatus, uint256 upVotes, uint256 downVotes);
    event ConsensusFailed(string indexed domainURL, uint256 indexed cycleId, string reason);

    modifier onlyMonitoringScheduler() {
        require(msg.sender == address(monitoringScheduler), "Only MonitoringScheduler allowed");
        _;
    }

    modifier onlyValidator(string memory _domainURL){
        bool isValidator = false;
        for (uint256 i=0; i<urlValidator[_domainURL].length; i++){
            if (urlValidator[_domainURL][i]==msg.sender){
                isValidator = true;
                break;
            }
        }
        require(isValidator, "Only validator allowed to submit result");
        _;
    }

    modifier onlyRewardsManager() {
        require(msg.sender == rewardsManager, "Only RewardsManager allowed");
        _;
    }

    function setRewardsManager(address _rewardsManager) external {
        require(rewardsManager == address(0), "RewardsManager already set");
        rewardsManager = _rewardsManager;
    }

    function addDomainForMonitoring(string memory _domainURL) external {
        require(!isDomainMonitored[_domainURL], "Domain already monitored");
        isDomainMonitored[_domainURL] = true;
        monitoredDomains.push(_domainURL);
    }

    /**
     * CRITICAL FIX #1: Optimized checkUpkeep with round-robin domain checking
     * This prevents gas limit issues when you have many domains
     */
    function checkUpkeep(bytes calldata /* checkData */) 
        external 
        view 
        override 
        returns (bool upkeepNeeded, bytes memory performData) 
    {
        if (monitoredDomains.length == 0) {
            return (false, bytes(""));
        }
        
        // Check only ONE domain per call (round-robin)
        uint256 startIndex = lastCheckedDomainIndex;
        uint256 domainsLength = monitoredDomains.length;
        
        for (uint256 i = 0; i < domainsLength; i++) {
            uint256 currentIndex = (startIndex + i) % domainsLength;
            string memory domain = monitoredDomains[currentIndex];
            
            try monitoringScheduler.getSchedule(domain) returns (
                bool isActive, 
                uint256 lastScheduledTime, 
                uint256 interval
            ) {
                if (isActive && block.timestamp >= lastScheduledTime + interval) {
                    // Found a domain that needs checking!
                    return (true, abi.encode(domain, currentIndex));
                }
            } catch {
                // Skip domains that cause errors
                continue;
            }
        }
        
        return (false, bytes(""));
    }
    
    /**
     * CRITICAL FIX #2: Updated performUpkeep to handle new data format
     */
    function performUpkeep(bytes calldata performData) external override {
        require(performData.length > 0, "No data");
        
        (string memory domainURL, uint256 checkedIndex) = abi.decode(performData, (string, uint256));
        
        // Update the round-robin index for next check
        lastCheckedDomainIndex = (checkedIndex + 1) % monitoredDomains.length;
        
        // Verify upkeep is still needed (safety check)
        (bool isActive, uint256 lastScheduledTime, uint256 interval) = 
            monitoringScheduler.getSchedule(domainURL);
        
        require(isActive, "Domain not active");
        require(block.timestamp >= lastScheduledTime + interval, "Too early");
        
        // Initiate the check cycle
        initiateCheckCycle(domainURL);
    }
    
    /**
     * HELPER: Get upkeep status for debugging
     */
    function getUpkeepStatus() external view returns (
        uint256 totalDomains,
        uint256 nextDomainIndex,
        string memory nextDomain,
        bool nextDomainReady
    ) {
        totalDomains = monitoredDomains.length;
        nextDomainIndex = lastCheckedDomainIndex;
        
        if (totalDomains == 0) {
            return (0, 0, "", false);
        }
        
        nextDomain = monitoredDomains[lastCheckedDomainIndex];
        
        try monitoringScheduler.getSchedule(nextDomain) returns (
            bool isActive, 
            uint256 lastScheduledTime, 
            uint256 interval
        ) {
            nextDomainReady = isActive && (block.timestamp >= lastScheduledTime + interval);
        } catch {
            nextDomainReady = false;
        }
        
        return (totalDomains, nextDomainIndex, nextDomain, nextDomainReady);
    }

    function updateConsensusThreshold(string memory _domainURL, uint256 _newConsensusThreshold) private {
        DomainRegistry.DomainInfo memory info = domainRegistry.getDomainInfo(_domainURL);
        require(info.owner != address(0), "Domain not registered");
        require(msg.sender == info.owner);
        consensusThreshold = _newConsensusThreshold;
    }

    function initiateCheckCycle(string memory _domainURL) public {
        address[] memory validators = monitoringScheduler.getActiveValidators();
        require(validators.length >= minValidatorsRequired, "Not enough validators registered");
        require(isDomainMonitored[_domainURL], "Domain not monitored");
        
        // Assign jobs to validators
        delete urlValidator[_domainURL];
        address validator;
        for (uint256 i = 0; i < minValidatorsRequired; i++){
            validator = monitoringScheduler.assignJob(_domainURL);
            urlValidator[_domainURL].push(validator);
        }

        // Get all jobs for this domain
        MonitoringScheduler.MonitoringJob[] memory jobs = monitoringScheduler.getDomainHistory(_domainURL);
        require(jobs.length >= minValidatorsRequired, "Insufficient validator assignments");

        // Extract the latest N assigned validators
        address[] memory assignedValidators = new address[](minValidatorsRequired);
        uint256 len = jobs.length;
        for (uint256 i = 0; i < minValidatorsRequired; i++) {
            assignedValidators[i] = jobs[len - minValidatorsRequired + i].validator;
        }

        // Increment cycleId
        currentCycleId[_domainURL] += 1;
        uint256 cycleId = currentCycleId[_domainURL];

        // Initialize new CheckCycle struct
        CheckCycle storage newCycle = cycles[_domainURL][cycleId];
        newCycle.domainURL = _domainURL;
        newCycle.cycleId = cycleId;
        newCycle.assignedTime = block.timestamp;
        newCycle.submissionDeadline = block.timestamp + submissionWindow;
        newCycle.requiredValidators = minValidatorsRequired;
        newCycle.submittedCount = 0;
        newCycle.consensusReached = false;
        newCycle.consensusStatus = "";
        newCycle.consensusTimestamp = 0;
        newCycle.isFinalized = false;

        cycles[_domainURL][cycleId] = newCycle;
        
        // CRITICAL FIX: Update the schedule AFTER initiating the check cycle
        // This resets the timer so checkUpkeep won't trigger again immediately
        monitoringScheduler.updateScheduleAfterCheck(_domainURL);
        
        emit CheckCycleInitiated(_domainURL, cycleId, assignedValidators);
    }

    function submitResult(string memory _domainURL, uint256 _cycleId, bool _isUp, uint16 _httpStatusCode, bytes memory _signature) public onlyValidator(_domainURL){
        CheckCycle storage cycle = cycles[_domainURL][_cycleId];
        require(cycle.cycleId != 0, "Check cycle doesn't exist");
        require(block.timestamp <= cycle.submissionDeadline, "Submission window closed");
        require(!cycle.isFinalized, "Cycle already finalized");

        for (uint256 i = 0; i < cycle.validationResults.length; i++) {
            require(cycle.validationResults[i].validator != msg.sender, "Validator already submitted");
        }

        ValidatorResult memory result = ValidatorResult({
            validator: msg.sender,
            isUp: _isUp,
            httpStatusCode: _httpStatusCode,
            submissionTime: block.timestamp,
            signature: _signature
        });

        cycle.validationResults.push(result);
        cycle.submittedCount++;

        emit ResultSubmitted(_domainURL, _cycleId, msg.sender, _isUp, block.timestamp);

        if (cycle.submittedCount >= cycle.requiredValidators) {
            finalizeConsensus(_domainURL, _cycleId);
        }
    }

    function finalizeConsensus (string memory _domainURL, uint256 _cycleId) internal {
        CheckCycle storage cycle = cycles[_domainURL][_cycleId];
        require(!cycle.isFinalized, "Already finalized");

        uint256 upVotes = 0;
        uint256 downVotes = 0;
        for (uint256 i = 0; i < cycle.validationResults.length; i++){
            if (cycle.validationResults[i].isUp) {
                upVotes++;
            } else {
                downVotes++;
            }
        }
        uint256 totalVotes = upVotes + downVotes;

        if (totalVotes < minValidatorsRequired) {
            emit ConsensusFailed(_domainURL, _cycleId, "Not enough votes");
            return;
        }

        uint256 agreementPercent = (upVotes > downVotes) ? (upVotes * 100) / totalVotes : (downVotes * 100) / totalVotes;

        if (agreementPercent >= consensusThreshold) {
            cycle.consensusReached = true;
            cycle.isFinalized = true;
            if (upVotes > downVotes) {
                cycle.consensusStatus = "UP";
            } else {
                cycle.consensusStatus = "DOWN";
            }
            cycle.consensusTimestamp = block.timestamp;

            if (rewardsManager != address(0)) {
                address[] memory honestValidators = new address[](upVotes > downVotes ? upVotes : downVotes);
                uint256 idx = 0;
                for (uint256 i = 0; i < cycle.validationResults.length; i++) {
                    if (keccak256(bytes(cycle.consensusStatus)) == keccak256(bytes(cycle.validationResults[i].isUp ? "UP" : "DOWN"))) {
                        honestValidators[idx] = cycle.validationResults[i].validator;
                        idx++;
                    }
                }
                IRewardsManager(rewardsManager).distributeRewards(_domainURL, _cycleId, honestValidators);
            }

            DomainStats storage stats = domainStats[_domainURL];
            stats.domainURL = _domainURL;
            stats.totalChecks++;
            
            if (keccak256(bytes(cycle.consensusStatus)) == keccak256(bytes("UP"))) {
                stats.successfulChecks++;
                stats.currentStatus = true;
            } else {
                stats.failedChecks++;
                stats.currentStatus = false;
            }

            if (stats.totalChecks > 0) {
                stats.uptimePercentage = (stats.successfulChecks * 100) / stats.totalChecks;
            }

            emit ConsensusReached(_domainURL, _cycleId, cycle.consensusStatus, upVotes, downVotes);
        } else {
            emit ConsensusFailed(_domainURL, _cycleId, "No majority consensus");
        }
    }

    function getLatestCycle(string memory _domainURL) external view returns (CheckCycle memory) {
        uint256 latestCycleId = currentCycleId[_domainURL];
        require(latestCycleId > 0, "No cycles exist for this domain");
        return cycles[_domainURL][latestCycleId];
    }

    function getDomainStatus(string memory _domainURL) external view returns (bool isUp, string memory status) {
        DomainStats memory stats = domainStats[_domainURL];
        return (stats.currentStatus, stats.currentStatus ? "UP" : "DOWN");
    }

    function getRecentCycles(string memory _domainURL, uint256 count) external view returns (CheckCycle[] memory) {
        uint256 latestCycleId = currentCycleId[_domainURL];
        require(latestCycleId > 0, "No cycles exist");
        
        uint256 startId = latestCycleId > count ? latestCycleId - count + 1 : 1;
        uint256 resultCount = latestCycleId - startId + 1;
        
        CheckCycle[] memory recentCycles = new CheckCycle[](resultCount);
        for (uint256 i = 0; i < resultCount; i++) {
            recentCycles[i] = cycles[_domainURL][startId + i];
        }
        return recentCycles;
    }
    
    function fetchDomainStats(string memory _domainURL) external view returns (DomainStats memory) {
        return domainStats[_domainURL];
    }
}

interface IRewardsManager {
    function distributeRewards(string memory domainURL, uint256 cycleId, address[] memory honestValidators) external;
}