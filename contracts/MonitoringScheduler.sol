// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import "./DomainRegistry.sol";

contract MonitoringScheduler {
    
    DomainRegistry public domainRegistry;

    constructor(address _domainRegistry) {
        domainRegistry = DomainRegistry(_domainRegistry);
    }

    struct Validator { // for each validator in the system
        address validatorAddress;
        bool isActive;
        uint256 totalJobsAssigned;
        uint256 lastAssignedTime;
    }

    struct MonitoringJob {  // represents single monitoring task assigned to validator for specific domain
        string domainURL;
        address validator;
        uint256 assignedTime;
        uint256 nextCheckTime;
        bool isCompleted;
    }

    struct DomainSchedule { // represents scheduling info for each domain
        string domainURL;
        uint256 interval;
        address[] assignedValidators;
        uint256 lastScheduledTime;
    }

    // Validator management
    mapping (address => Validator) public validators; //Stores validator information
    address[] public validatorList; //For iteration or random selection.

    //Job Management
    mapping(string => MonitoringJob[]) public domainJobs; //Tracks all jobs per domain.
    mapping(address => string[]) public validatorJobs;  //Tracks all jobs a validator is handling.

    //DomainScheduling
    mapping(string => DomainSchedule) public schedules; //Keeps track of assignment intervals and history per domain.

    //Counters
    uint256 public totalJobsAssigned;   //Useful for monitoring activity and load balancing.
    uint256 private currentIndex = 0; // Round-robin pointer

    event ValidatorRegistered(address validator);
    event ValidatorDeactivated(address validator);
    event JobAssigned(string domainURL, address validator, uint256 timestamp);
    event JobCompleted(string domainURL, address validator, uint256 timestamp);
    event JobReassigned(string domainURL, address oldValidator, address newValidator);

    function registerValidator() public {
        require(!validators[msg.sender].isActive, "Already registered");
        validators[msg.sender]= Validator(msg.sender, true, 0, 0);
        validatorList.push(msg.sender);
        emit ValidatorRegistered(msg.sender);
    }

    function deactivateValidator() public {
        validators[msg.sender].isActive = false;
        for (uint256 i=0; i<validatorList.length; i++){
            if (validatorList[i]==msg.sender){
                validatorList[i]=validatorList[(validatorList.length)-1];
                validatorList.pop();
            }
        }   
        //might need to remove from validatorjobs also
        emit ValidatorDeactivated(msg.sender);
    }

    function getActiveValidators() public view returns (address[] memory){
        return validatorList;
    }
    
    function assignJob(string memory _domainURL) public {
        require(validatorList.length>0, "No validators active");

        // Get domain info from DomainRegistry
        DomainRegistry.DomainInfo memory info = domainRegistry.getDomainInfo(_domainURL);
        require(info.owner != address(0), "Domain not registered");

        if (currentIndex >= validatorList.length) {
            currentIndex = 0;
        }
        // Select validator in round-robin fashion
        address selectedValidator = validatorList[currentIndex];
        uint256 currentTime = block.timestamp;
        uint256 nextCheckTime = currentTime + info.interval;

        MonitoringJob memory newJob = MonitoringJob(_domainURL, selectedValidator, currentTime, nextCheckTime, false);
        domainJobs[_domainURL].push(newJob);
        validatorJobs[selectedValidator].push(_domainURL);

        validators[selectedValidator].totalJobsAssigned += 1;
        validators[selectedValidator].lastAssignedTime = currentTime;

        DomainSchedule storage schedule = schedules[_domainURL];
        schedule.interval = info.interval;
        schedule.lastScheduledTime = currentTime;
        schedule.assignedValidators.push(selectedValidator);

        totalJobsAssigned += 1;
        currentIndex = (currentIndex + 1) % validatorList.length;

        emit JobAssigned(_domainURL, selectedValidator, currentTime);
    }

    function reassignJob(string memory _domainURL) public {
        require(validatorList.length>0, "No validators active");

        // Get domain info from DomainRegistry
        DomainRegistry.DomainInfo memory info = domainRegistry.getDomainInfo(_domainURL);
        require(info.owner != address(0), "Domain not registered");

        require(domainJobs[_domainURL].length > 0, "No existing job for this domain");

        // Get last assigned validator and job
        MonitoringJob storage oldJob = domainJobs[_domainURL][domainJobs[_domainURL].length - 1];
        address oldValidator = oldJob.validator;

        address newValidator = validatorList[currentIndex];
        require(newValidator != oldValidator, "Reassignment unnecessary; same validator selected");

        // Mark old job as completed
        oldJob.isCompleted = true;

        for (uint256 i=0; i<validatorJobs[oldValidator].length; i++){
            if (keccak256(bytes(validatorJobs[oldValidator][i]))==keccak256(bytes(_domainURL))){
                validatorJobs[oldValidator][i]=validatorJobs[oldValidator][(validatorJobs[oldValidator].length)-1];
                validatorJobs[oldValidator].pop();
            }
        }

        uint256 currentTime = block.timestamp;
        uint256 nextCheckTime = currentTime + info.interval;

        // Create new job
        MonitoringJob memory newJob = MonitoringJob(_domainURL, newValidator, currentTime, nextCheckTime, false);
        domainJobs[_domainURL].push(newJob);
        validatorJobs[newValidator].push(_domainURL);

        validators[newValidator].totalJobsAssigned += 1;
        validators[newValidator].lastAssignedTime = currentTime;

        DomainSchedule storage schedule = schedules[_domainURL];
        schedule.interval = info.interval;
        schedule.lastScheduledTime = currentTime;
        schedule.assignedValidators.push(newValidator);

        currentIndex = (currentIndex + 1) % validatorList.length;
        
        emit JobReassigned(_domainURL, oldValidator, newValidator);
    }

    function updateNextSchedule(string memory _domainURL) internal {
        require(validatorList.length > 0, "No active validators");
        
        DomainRegistry.DomainInfo memory info = domainRegistry.getDomainInfo(_domainURL);
        require(info.owner != address(0), "Domain not registered");

        uint256 currentTime = block.timestamp;
        uint256 nextCheckTime = currentTime + info.interval;

        // Select next validator in round-robin
        address nextValidator = validatorList[currentIndex];

        // Create new job
        MonitoringJob memory nextJob = MonitoringJob(_domainURL, nextValidator, currentTime, nextCheckTime, false);

        // Store new job
        domainJobs[_domainURL].push(nextJob);
        validatorJobs[nextValidator].push(_domainURL);

        // Update validator stats
        validators[nextValidator].totalJobsAssigned += 1;
        validators[nextValidator].lastAssignedTime = currentTime;

        // Update schedule info
        DomainSchedule storage schedule = schedules[_domainURL];
        schedule.interval = info.interval;
        schedule.lastScheduledTime = currentTime;
        schedule.assignedValidators.push(nextValidator);

        // Update round-robin pointer
        currentIndex = (currentIndex + 1) % validatorList.length;

        emit JobAssigned(_domainURL, nextValidator, currentTime);
    }

    function completeJob(string memory _domainURL) public {
        DomainRegistry.DomainInfo memory info = domainRegistry.getDomainInfo(_domainURL);
        require(info.owner != address(0), "Domain not registered");
        require(domainJobs[_domainURL].length > 0, "No monitoring jobs found for this domain");

        // Get the last job for the domain
        MonitoringJob storage lastJob = domainJobs[_domainURL][domainJobs[_domainURL].length - 1];
        require(lastJob.validator==msg.sender);
        lastJob.isCompleted=true;

        // Remove from validator’s pending list
        for (uint256 i = 0; i < validatorJobs[msg.sender].length; i++) {
            if (keccak256(bytes(validatorJobs[msg.sender][i])) == keccak256(bytes(_domainURL))) {
                validatorJobs[msg.sender][i] = validatorJobs[msg.sender][validatorJobs[msg.sender].length - 1];
                validatorJobs[msg.sender].pop();
                break;
            }
        }

        emit JobCompleted(_domainURL, msg.sender, block.timestamp);

        // Trigger scheduling of next cycle
        updateNextSchedule(_domainURL);
    }

    function getPendingJobs(address _validator) public view returns(string[] memory) {
        return validatorJobs[_validator];
    }

    function getDomainHistory(string memory _domainURL) public view returns(MonitoringJob[] ){
        return domainJobs[_domainURL];
    }
}