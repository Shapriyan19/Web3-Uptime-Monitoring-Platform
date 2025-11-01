// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract DomainRegistry{
    
    constructor(){
        regStake = 0.25 ether;
        minStake = 0.1 ether;
    }

    //constants
    uint256 regStake;
    uint256 minStake;
    address public rewardsManager;
    address public resultAggregator;

    struct DomainInfo {
        address owner;  //address of the domain owner
        uint256 stakingBalance;    // used for incentivizing the validators
        uint256 interval;   // time interval to check
    }

    mapping(address => string[]) public userDomains;
    mapping (string => DomainInfo) public domains;

    modifier checkStaking(uint256 _stakingBalance){
        require(msg.value>=_stakingBalance, "Not enough ether");
        _;
    }

    modifier onlyOwner(string memory _domainURL) {
        require(domains[_domainURL].owner == msg.sender, "Not domain owner");
        _;
    }

    modifier validDomain(string memory _domainURL) {
        require(domains[_domainURL].owner != address(0), "Domain not registered");
        _;
    }

    event DomainRegistered(address owner, string domainURL);
    event TokensStaked(string domainURL, uint256 newStake);
    event IntervalUpdated(string domainURL, uint256 newInterval);
    event StakeWithdrawn(string domainURL, uint256 withdrawalStake);

    function setRewardsManager(address _rewardsManager) external {
        require(rewardsManager == address(0), "Already set");
        rewardsManager = _rewardsManager;
    }

    function setResultAggregator(address _resultAggregator) external {
        require(resultAggregator == address(0), "Already set");
        resultAggregator = _resultAggregator;
    }

    function registerDomain(string memory _domainURL, uint256 _interval) public payable checkStaking(regStake) {
        require(domains[_domainURL].owner == address(0), "Domain already registered");
        userDomains[msg.sender].push(_domainURL);
        domains[_domainURL] = DomainInfo(msg.sender, msg.value, _interval);
        ResultAggregator(resultAggregator).addDomainForMonitoring(_domainURL);
        emit DomainRegistered(msg.sender, _domainURL);
    }

    function unRegisterDomain(string memory _domainURL) public payable onlyOwner(_domainURL){
        // need to implement
        uint256 remainingStake = domains[_domainURL].stakingBalance;
        delete domains[_domainURL];
        for (uint256 i = 0; i< userDomains[msg.sender].length; i++){
            if (keccak256(bytes(userDomains[msg.sender][i]))==keccak256(bytes(_domainURL))){
                userDomains[msg.sender][i]=userDomains[msg.sender][(userDomains[msg.sender].length)-1];
                userDomains[msg.sender].pop();
                break;
            }
        }
        (bool sent, ) = payable(msg.sender).call{value: remainingStake}("");
        require(sent, "Transfer of stake failed");
    }

    function stakeTokens(string memory _domainURL) public payable onlyOwner(_domainURL) validDomain(_domainURL) {
        domains[_domainURL].stakingBalance += msg.value;
        emit TokensStaked(_domainURL, domains[_domainURL].stakingBalance);
    }

    function withdrawStake(string memory _domainURL) public payable onlyOwner(_domainURL) {
        DomainInfo storage domain = domains[_domainURL];
        require(domains[_domainURL].stakingBalance>=msg.value,"The stake available is less than the withdrawal stake");
        require(((domains[_domainURL].stakingBalance)-msg.value)>=minStake, "Cannot withdraw");
        domain.stakingBalance -= msg.value;
        (bool sent, ) = payable(msg.sender).call{value: msg.value}("");
        require(sent, "Withdrawal failed");

        emit StakeWithdrawn(_domainURL, msg.value);
    }

    function updateInterval(string memory _domainURL, uint256 _interval) public onlyOwner(_domainURL){
        domains[_domainURL].interval = _interval;
        emit IntervalUpdated(_domainURL, domains[_domainURL].interval);
    }

    function getDomainInfo(string memory _domainURL) public view returns(DomainInfo memory){
        return (domains[_domainURL]);
    }

    function getOwnerDomains() public view returns(string[] memory){
        return(userDomains[msg.sender]);
    }

    function deductStake(string memory _domainURL, uint256 _totalReward) external {
        require(msg.sender == address(rewardsManager), "Only RewardsManager");
        require(domains[_domainURL].stakingBalance >= _totalReward, "Insufficient stake");
        domains[_domainURL].stakingBalance -= _totalReward;

        (bool sent, ) = payable(rewardsManager).call{value: _totalReward}("");
        require(sent, "Transfer to RewardsManager failed");
    }

    function getDomainInterval(string memory _domainURL) public view returns (uint256) {
        return domains[_domainURL].interval;
    }
}

interface ResultAggregator {
    function addDomainForMonitoring(string memory _domainURL) external;
}