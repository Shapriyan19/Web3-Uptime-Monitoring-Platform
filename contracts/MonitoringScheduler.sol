// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import "./DomainRegistry.sol";

contract MonitoringScheduler {
    
    DomainRegistry public domainRegistry;

    constructor(address _domainRegistry) {
        domainRegistry = DomainRegistry(_domainRegistry);
    }

    struct Validator {
        address validatorAddress;
        bool isActive;
        uint256 totalJobsAssigned;
        uint256 lastAssignedTime;
    }

    struct MonitoringJob {
        string domainURL;
        address validator;
        uint256 assignedTime;
        uint256 nextCheckTime;
        bool isCompleted;
    }

    struct DomainSchedule {
        string domainURL;
        uint256 interval;
        address[] assignedValidators;
        uint256 lastScheduledTime;
    }

    mapping (address => Validator) public validators;
    address[] public validatorList;

    mapping(string => MonitoringJob[]) public domainJobs;
    mapping(address => string[]) public validatorJobs;

    mapping(string => DomainSchedule) public schedules;

    uint256 public totalJobsAssigned;
    uint256 private currentIndex = 0;

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
                break;
            }
        }
        emit ValidatorDeactivated(msg.sender);
    }

    function getActiveValidators() public view returns (address[] memory){
        return validatorList;
    }
    
    function assignJob(string memory _domainURL) public returns (address) {
        require(validatorList.length>0, "No validators active");

        DomainRegistry.DomainInfo memory info = domainRegistry.getDomainInfo(_domainURL);
        require(info.owner != address(0), "Domain not registered");

        if (currentIndex >= validatorList.length) {
            currentIndex = 0;
        }
        
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
        // REMOVED: schedule.lastScheduledTime = currentTime; ← This was the bug!
        schedule.assignedValidators.push(selectedValidator);

        totalJobsAssigned += 1;
        currentIndex = (currentIndex + 1) % validatorList.length;

        emit JobAssigned(_domainURL, selectedValidator, currentTime);
        return (selectedValidator);
    }

    function initializeSchedule(string memory _domainURL) external {
        DomainRegistry.DomainInfo memory info = domainRegistry.getDomainInfo(_domainURL);
        require(info.owner != address(0), "Domain not registered");
        
        DomainSchedule storage schedule = schedules[_domainURL];
        schedule.domainURL = _domainURL;
        schedule.interval = info.interval;
        schedule.lastScheduledTime = block.timestamp;
    }

    // NEW: Function to update schedule after a check cycle completes
    function updateScheduleAfterCheck(string memory _domainURL) external {
        DomainRegistry.DomainInfo memory info = domainRegistry.getDomainInfo(_domainURL);
        require(info.owner != address(0), "Domain not registered");
        
        DomainSchedule storage schedule = schedules[_domainURL];
        schedule.lastScheduledTime = block.timestamp;
        schedule.interval = info.interval; // Update interval in case it changed
    }

    function reassignJob(string memory _domainURL) public {
        require(validatorList.length>0, "No validators active");

        DomainRegistry.DomainInfo memory info = domainRegistry.getDomainInfo(_domainURL);
        require(info.owner != address(0), "Domain not registered");
        require(domainJobs[_domainURL].length > 0, "No existing job for this domain");

        MonitoringJob storage oldJob = domainJobs[_domainURL][domainJobs[_domainURL].length - 1];
        address oldValidator = oldJob.validator;

        address newValidator = validatorList[currentIndex];
        require(newValidator != oldValidator, "Reassignment unnecessary; same validator selected");

        oldJob.isCompleted = true;

        for (uint256 i=0; i<validatorJobs[oldValidator].length; i++){
            if (keccak256(bytes(validatorJobs[oldValidator][i]))==keccak256(bytes(_domainURL))){
                validatorJobs[oldValidator][i]=validatorJobs[oldValidator][(validatorJobs[oldValidator].length)-1];
                validatorJobs[oldValidator].pop();
                break;
            }
        }

        uint256 currentTime = block.timestamp;
        uint256 nextCheckTime = currentTime + info.interval;

        MonitoringJob memory newJob = MonitoringJob(_domainURL, newValidator, currentTime, nextCheckTime, false);
        domainJobs[_domainURL].push(newJob);
        validatorJobs[newValidator].push(_domainURL);

        validators[newValidator].totalJobsAssigned += 1;
        validators[newValidator].lastAssignedTime = currentTime;

        DomainSchedule storage schedule = schedules[_domainURL];
        schedule.interval = info.interval;
        // REMOVED: schedule.lastScheduledTime = currentTime;
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

        address nextValidator = validatorList[currentIndex];

        MonitoringJob memory nextJob = MonitoringJob(_domainURL, nextValidator, currentTime, nextCheckTime, false);

        domainJobs[_domainURL].push(nextJob);
        validatorJobs[nextValidator].push(_domainURL);

        validators[nextValidator].totalJobsAssigned += 1;
        validators[nextValidator].lastAssignedTime = currentTime;

        DomainSchedule storage schedule = schedules[_domainURL];
        schedule.interval = info.interval;
        schedule.lastScheduledTime = currentTime; // Update here when scheduling next check
        schedule.assignedValidators.push(nextValidator);

        currentIndex = (currentIndex + 1) % validatorList.length;

        emit JobAssigned(_domainURL, nextValidator, currentTime);
    }

    function completeJob(string memory _domainURL) public {
        DomainRegistry.DomainInfo memory info = domainRegistry.getDomainInfo(_domainURL);
        require(info.owner != address(0), "Domain not registered");
        require(domainJobs[_domainURL].length > 0, "No monitoring jobs found for this domain");

        MonitoringJob storage lastJob = domainJobs[_domainURL][domainJobs[_domainURL].length - 1];
        require(lastJob.validator==msg.sender);
        lastJob.isCompleted=true;

        for (uint256 i = 0; i < validatorJobs[msg.sender].length; i++) {
            if (keccak256(bytes(validatorJobs[msg.sender][i])) == keccak256(bytes(_domainURL))) {
                validatorJobs[msg.sender][i] = validatorJobs[msg.sender][validatorJobs[msg.sender].length - 1];
                validatorJobs[msg.sender].pop();
                break;
            }
        }

        emit JobCompleted(_domainURL, msg.sender, block.timestamp);

        updateNextSchedule(_domainURL);
    }

    function getPendingJobs(address _validator) public view returns(string[] memory) {
        return validatorJobs[_validator];
    }

    function getDomainHistory(string memory _domainURL) public view returns(MonitoringJob[] memory){
        return domainJobs[_domainURL];
    }

    function getSchedule(string memory _domain) public view returns (bool exists, uint256 lastScheduledTime, uint256 interval){
        DomainSchedule memory info = schedules[_domain];
        // Return true if schedule has been initialized (has a non-zero interval or domainURL set)
        exists = bytes(info.domainURL).length > 0 || info.interval > 0;
        return (exists, info.lastScheduledTime, info.interval);
    }
}