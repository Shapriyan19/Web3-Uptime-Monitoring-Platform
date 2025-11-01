// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract DomainRegistry{
    
    struct DomainInfo {
        string _domainURL;
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

    function registerDomain(string memory _domainURL, uint256 _interval) public payable checkStaking(0.1 ether) {
        require(domains[_domainURL].owner == address(0), "Domain already registered");
        userDomains[msg.sender].push(_domainURL);
        domains[_domainURL] = DomainInfo(_domainURL, msg.sender, msg.value, _interval);
        emit DomainRegistered(msg.sender, _domainURL);

    }

    function unRegisterDomain(string memory _domainURL) public payable onlyOwner(_domainURL){
        // need to implement
    }

    function stakeTokens(string memory _domainURL) public payable onlyOwner(_domainURL) validDomain(_domainURL) {
        domains[_domainURL].stakingBalance += msg.value;
        emit TokensStaked(_domainURL, domains[_domainURL].stakingBalance);
    }

    function withdrawStake(string memory _domainURL, uint256 _withdrawalStake) public payable onlyOwner(_domainURL) {
        DomainInfo storage domain = domains[_domainURL];
        require(domains[_domainURL].stakingBalance>=_withdrawalStake,"The stake available is less than the withdrawal stake");
        domain.stakingBalance -= _withdrawalStake;
        (bool sent, ) = payable(msg.sender).call{value: _withdrawalStake}("");
        require(sent, "Withdrawal failed");

        emit StakeWithdrawn(_domainURL, _withdrawalStake);
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
}