// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import "./MonitoringScheduler.sol";
import "./DomainRegistry.sol";
import "./RewardsManager.sol";

contract ResultAggregator{

    MonitoringScheduler public monitoringScheduler;
    DomainRegistry public domainRegistry;
    // RewardsManager public rewardsManager;
    address owner;
    uint256 public consensusThreshold;
    uint256 public submissionWindow = 120;
    uint256 public minValidatorsRequired = 3;

    constructor(address _monitoringScheduler, address _domainRegistry){
        monitoringScheduler = MonitoringScheduler(_monitoringScheduler);
        domainRegistry = DomainRegistry(_domainRegistry);
        consensusThreshold = 60;
        owner=msg.sender;
    }

    struct ValidationResult {    // for single validator submission
        address validator;
        string domainURL;
        bool isUp;
        uint256 httpStatusCode;
        uint256 responseTime;
        uint256 timestamp;
        string signature;
        uint256 cycleId;
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

    struct Incident {   //records when domain goes down
        string domainURL;
        uint256 incidentId;
        uint256 detectedTime;
        uint256 resolvedTime;
        uint256 isOngoing;
        uint16[] httpCodes;
        address[] reportingValidators;
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
    
    mapping(string=>mapping(uint256=>CheckCycle)) public cycles;    //Access check cycles by domain and cycleId
    mapping(string=>mapping(uint256=>mapping(address=>ValidationResult))) public results;   //store each validator's submission for each cycle
    mapping(string => Incident[]) public incidents; //Uptime statistics per domain
    mapping(string => uint256) public currentCycleId;   //Track the latest cycle number for each domain
    mapping(address => bool) public authorizedContracts;    //Only MonitoringScheduler can trigger new cycles

    function setRewardsManager(_rewardsManager) public {
        require(msg.sender==owner);
        rewardsManager=RewardsManager(_rewardsManager);
    }

    function updateConsensusThreshold(uint256 _newConsensusThreshold) private {
        // Get domain info from DomainRegistry
        DomainRegistry.DomainInfo memory info = domainRegistry.getDomainInfo(_domainURL);
        require(info.owner != address(0), "Domain not registered");
        require(msg.sender == info.owner);
        consensusThreshold = _newConsensusThreshold;
    }

    function initiateCheckCycle(string memory _domainURL) public {
        // Assign jobs to validators
        for (uint256 i = 0; i < minValidatorsRequired; i++){
            monitoringScheduler.assignJob(_domainURL);
        }

        // Get all jobs for this domain
        MonitoringScheduler.MonitoringJob[] memory jobs = monitoringScheduler.getDomainHistory(_domainURL);

        // Extract the latest N assigned validators
        address[] memory latestValidators = new address[](minValidatorsRequired);
        for (uint256 j = 0; j < minValidatorsRequired; j++) {
            uint256 idx = jobs.length - minValidatorsRequired + j;     // index newest N jobs
            latestValidators[j] = jobs[idx].validator;
        }

        // Increment cycleId (assume currentCycleId initialized to 0)
        currentCycleId[_domainURL] += 1;
        uint256 cycleId = currentCycleId[_domainURL];

        // Initialize new CheckCycle struct
        CheckCycle memory newCycle = CheckCycle({
            domainURL: _domainURL,
            cycleId: cycleId,
            assignedTime: block.timestamp,
            submissionDeadline: block.timestamp + submissionWindow,
            requiredValidators: minValidatorsRequired,
            submittedCount: 0,
            validationResults: new ValidatorResult[](0), // Empty at start
            consensusReached: false,
            consensusStatus: "", // Consensus initially empty
            consensusTimestamp: 0,
            isFinalized: false
        });

        // Store the cycle and the assignedValidators if you track them!
        cycles[_domainURL][cycleId] = newCycle;
        emit CheckCycleInitiated(_domainURL, cycleId, block.timestamp, latestValidators);
    }

    function submitResult(_domainURL, cycleID, isUp, httpStatusCode, responseTime, signature){
        require();
    }
}