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

    // Track registered domain URLs for iteration
    string[] public monitoredDomains;

    constructor(address _monitoringScheduler, address _domainRegistry){
        monitoringScheduler = MonitoringScheduler(_monitoringScheduler);
        domainRegistry = DomainRegistry(_domainRegistry);
    }

    struct ValidatorResult {    // for single validator submission
        address validator;
        // string domainURL;
        bool isUp;
        uint16 httpStatusCode;
        // uint256 responseTime;
        uint256 submissionTime;
        bytes signature;
    }

    struct CheckCycle { // groups all validator submission
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

    // struct Incident {   //records when domain goes down
    //     string domainURL;
    //     uint256 incidentId;
    //     uint256 detectedTime;
    //     uint256 resolvedTime;
    //     uint256 isOngoing;
    //     uint16[] httpCodes;
    //     address[] reportingValidators;
    // }

    struct DomainStats {
        string domainURL;
        uint256 totalChecks;
        uint256 successfulChecks;
        uint256 failedChecks;
        uint256 uptimePercentage;
        uint256 totalDownTime;
        bool currentStatus;
    }
    
    mapping(string=>mapping(uint256=>CheckCycle)) public cycles;    //Access check cycles by domain and cycleId
    // mapping(string=>mapping(uint256=>mapping(address=>ValidationResult))) public results;   //store each validator's submission for each cycle
    // mapping(string => Incident[]) public incidents; //Uptime statistics per domain
    mapping(string => uint256) public currentCycleId;   //Track the latest cycle number for each domain
    mapping(string => bool) public isDomainMonitored; // To avoid duplicates
    mapping(string => address[]) internal urlValidator;
    mapping(string => DomainStats) public domainStats;
    // mapping(address => bool) public authorizedContracts;    //Only MonitoringScheduler can trigger new cycles

    // Events
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

    // Register domain for monitoring automation (call this when domain registered)
    function addDomainForMonitoring(string memory _domainURL) external {
        require(!isDomainMonitored[_domainURL], "Domain already monitored");
        isDomainMonitored[_domainURL] = true;
        monitoredDomains.push(_domainURL);
    }

    // Chainlink Keeper check if upkeep needed
    // Chainlink Keeper check if upkeep needed
    function checkUpkeep(bytes calldata) external view override returns (bool upkeepNeeded, bytes memory performData) {
        // Find domains that need a new check cycle (based on last scheduled time + interval)
        string memory domainToCheck = "";
        bool found = false;
        uint256 length = monitoredDomains.length;

        for (uint256 i = 0; i < length; i++) {
            string memory domain = monitoredDomains[i];
            (, uint256 lastScheduledTime,) = monitoringScheduler.getSchedule(domain);
            uint256 interval = domainRegistry.getDomainInterval(domain);
            if (block.timestamp >= lastScheduledTime + interval) {
                domainToCheck = domain;
                found = true;
                break;
            }
        }
        upkeepNeeded = found;
        // both branches now return bytes memory
        performData = found ? abi.encode(domainToCheck) : bytes("");
    }


    // Chainlink Keeper performs upkeep by calling initiateCheckCycle
    function performUpkeep(bytes calldata performData) external override {
        require(performData.length > 0, "No data");
        (string memory domainURL) = abi.decode(performData, (string));
        initiateCheckCycle(domainURL);
    }

    function updateConsensusThreshold(string memory _domainURL, uint256 _newConsensusThreshold) private {
        // Get domain info from DomainRegistry
        DomainRegistry.DomainInfo memory info = domainRegistry.getDomainInfo(_domainURL);
        require(info.owner != address(0), "Domain not registered");
        require(msg.sender == info.owner);
        consensusThreshold = _newConsensusThreshold;
    }

    function initiateCheckCycle(string memory _domainURL) public {
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

        // Increment cycleId (assume currentCycleId initialized to 0)
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


        // Store the cycle and the assignedValidators if you track them!
        cycles[_domainURL][cycleId] = newCycle;
        emit CheckCycleInitiated(_domainURL, cycleId, assignedValidators);
    }

    function submitResult(string memory _domainURL, uint256 _cycleId, bool _isUp, uint16 _httpStatusCode, bytes memory _signature) public onlyValidator(_domainURL){
        CheckCycle storage cycle = cycles[_domainURL][_cycleId];
        require(cycle.cycleId != 0, "Check cycle doesn't exist");
        require(block.timestamp <= cycle.submissionDeadline, "Submission window closed");
        require(!cycle.isFinalized, "Cycle already finalized");

        // Check if validator already submitted (linear search, could optimize)
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

            // Notify RewardsManager of consensus
            if (rewardsManager != address(0)) {
                address[] memory honestValidators = new address[](upVotes > downVotes ? upVotes : downVotes);
                uint256 idx = 0;
                for (uint256 i = 0; i < cycle.validationResults.length; i++) {
                    if (keccak256(bytes(cycle.consensusStatus)) == keccak256(bytes(cycle.validationResults[i].isUp ? "UP" : "DOWN"))) {
                        honestValidators[idx] = cycle.validationResults[i].validator;
                        idx++;
                    }
                }
                RewardsManager(rewardsManager).distributeRewards(_domainURL, _cycleId, honestValidators);
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

            // Calculate uptime percentage
            if (stats.totalChecks > 0) {
                stats.uptimePercentage = (stats.successfulChecks * 100) / stats.totalChecks;
            }

            emit ConsensusReached(_domainURL, _cycleId, cycle.consensusStatus, upVotes, downVotes);
            } 
        else {
                emit ConsensusFailed(_domainURL, _cycleId, "No majority consensus");
        }
    }

    // Get the latest cycle for a domain
    function getLatestCycle(string memory _domainURL) external view returns (CheckCycle memory) {
        uint256 latestCycleId = currentCycleId[_domainURL];
        require(latestCycleId > 0, "No cycles exist for this domain");
        return cycles[_domainURL][latestCycleId];
    }

    // Get current status of a domain (UP/DOWN)
    function getDomainStatus(string memory _domainURL) external view returns (bool isUp, string memory status) {
        DomainStats memory stats = domainStats[_domainURL];
        return (stats.currentStatus, stats.currentStatus ? "UP" : "DOWN");
    }

    // Get recent check cycles (last N cycles)
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

interface RewardsManager {
    function distributeRewards(string memory domainURL, uint256 cycleId, address[] memory honestValidators) external;
}