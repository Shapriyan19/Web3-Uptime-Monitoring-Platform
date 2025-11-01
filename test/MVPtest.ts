import { expect } from "chai";
import { ethers } from "hardhat";

describe("Decentralized Uptime Monitoring MVP", function () {
  let DomainRegistry, MonitoringScheduler, ResultAggregator, RewardsManager;
  let domainRegistry, monitoringScheduler, resultAggregator, rewardsManager;
  let owner, validator1, validator2, validator3, other;

  const domain1 = "example.com";
  const stakeAmount = ethers.utils.parseEther("1.0");
  const rewardPerCheck = ethers.utils.parseEther("0.01");

  beforeEach(async () => {
    [owner, validator1, validator2, validator3, other] = await ethers.getSigners();

    // Deploy DomainRegistry and stake
    DomainRegistry = await ethers.getContractFactory("DomainRegistry");
    domainRegistry = await DomainRegistry.deploy();
    await domainRegistry.deployed();

    // Deploy MonitoringScheduler with DomainRegistry address
    MonitoringScheduler = await ethers.getContractFactory("MonitoringScheduler");
    monitoringScheduler = await MonitoringScheduler.deploy(domainRegistry.address);
    await monitoringScheduler.deployed();

    // Deploy ResultAggregator with domainRegistry and monitoringScheduler addresses
    ResultAggregator = await ethers.getContractFactory("ResultAggregator");
    resultAggregator = await ResultAggregator.deploy(domainRegistry.address, monitoringScheduler.address);
    await resultAggregator.deployed();

    // Deploy RewardsManager with DomainRegistry address
    RewardsManager = await ethers.getContractFactory("RewardsManager");
    rewardsManager = await RewardsManager.deploy(domainRegistry.address);
    await rewardsManager.deployed();

    // Link RewardsManager to ResultAggregator
    await resultAggregator.setRewardsManager(rewardsManager.address);

    // Link ResultAggregator to RewardsManager
    await rewardsManager.setResultAggregator(resultAggregator.address);
  });

  it("should register a domain with staking", async () => {
    await domainRegistry.connect(owner).registerDomain(domain1, 60, { value: stakeAmount });
    const info = await domainRegistry.domains(domain1);
    expect(info.owner).to.equal(owner.address);
    expect(info.stakingBalance).to.equal(stakeAmount);
  });

  it("should register validators", async () => {
    await monitoringScheduler.connect(validator1).registerValidator();
    await monitoringScheduler.connect(validator2).registerValidator();

    const activeValidators = await monitoringScheduler.getActiveValidators();
    expect(activeValidators).to.include.members([validator1.address, validator2.address]);
  });

  it("should assign jobs in round-robin and track correctly", async () => {
    // Register validators
    await monitoringScheduler.connect(validator1).registerValidator();
    await monitoringScheduler.connect(validator2).registerValidator();
    await monitoringScheduler.connect(validator3).registerValidator();

    await domainRegistry.connect(owner).registerDomain(domain1, 60, { value: stakeAmount });

    // Assign 3 jobs for domain1
    await monitoringScheduler.assignJob(domain1);
    await monitoringScheduler.assignJob(domain1);
    await monitoringScheduler.assignJob(domain1);

    const jobs = await monitoringScheduler.getDomainHistory(domain1);
    expect(jobs.length).to.equal(3);
    expect(jobs[0].validator).to.equal(validator1.address);
    expect(jobs[1].validator).to.equal(validator2.address);
    expect(jobs[2].validator).to.equal(validator3.address);
  });

  it("should initiate check cycle and accept validator submissions", async () => {
    await monitoringScheduler.connect(validator1).registerValidator();
    await monitoringScheduler.connect(validator2).registerValidator();
    await monitoringScheduler.connect(validator3).registerValidator();

    await domainRegistry.connect(owner).registerDomain(domain1, 60, { value: stakeAmount });

    // Assign validator jobs
    await monitoringScheduler.assignJob(domain1);
    await monitoringScheduler.assignJob(domain1);
    await monitoringScheduler.assignJob(domain1);

    // Initiate a check cycle
    await resultAggregator.connect(owner).initiateCheckCycle(domain1);

    const cycleId = await resultAggregator.currentCycleId(domain1);
    expect(cycleId).to.equal(1);

    // Validators submit results
    await resultAggregator.connect(validator1).submitResult(domain1, cycleId, true, 200, 100, "0x");
    await resultAggregator.connect(validator2).submitResult(domain1, cycleId, false, 500, 500, "0x");
    await resultAggregator.connect(validator3).submitResult(domain1, cycleId, true, 200, 120, "0x");

    // Consensus should auto-finalize (2/3 UP => UP)
    const cycle = await resultAggregator.cycles(domain1, cycleId);
    expect(cycle.isFinalized).to.be.true;
    expect(cycle.consensusStatus).to.equal("UP");
  });

  it("should distribute rewards to honest validators", async () => {
    // Fund RewardsManager contract with ether for rewards
    await owner.sendTransaction({
      to: rewardsManager.address,
      value: ethers.utils.parseEther("1.0"),
    });

    // Setup and executions as earlier for domain registration, validator registration,
    // job assignment, initiating cycle, submitting results (2 UP, 1 DOWN).
    await monitoringScheduler.connect(validator1).registerValidator();
    await monitoringScheduler.connect(validator2).registerValidator();
    await monitoringScheduler.connect(validator3).registerValidator();

    await domainRegistry.connect(owner).registerDomain(domain1, 60, { value: stakeAmount });

    await monitoringScheduler.assignJob(domain1);
    await monitoringScheduler.assignJob(domain1);
    await monitoringScheduler.assignJob(domain1);

    await resultAggregator.initiateCheckCycle(domain1);
    const cycleId = await resultAggregator.currentCycleId(domain1);

    // Capture balances before
    const balBefore1 = await ethers.provider.getBalance(validator1.address);
    const balBefore3 = await ethers.provider.getBalance(validator3.address);

    // Validator1 and Validator3 submit honest results ("UP")
    await resultAggregator.connect(validator1).submitResult(domain1, cycleId, true, 200, 100, "0x");
    await resultAggregator.connect(validator2).submitResult(domain1, cycleId, false, 500, 500, "0x");
    await resultAggregator.connect(validator3).submitResult(domain1, cycleId, true, 200, 120, "0x");

    // Rewards should be paid out (assumed payout is in Ether transferred)
    const balAfter1 = await ethers.provider.getBalance(validator1.address);
    const balAfter3 = await ethers.provider.getBalance(validator3.address);
    expect(balAfter1).to.be.gt(balBefore1);
    expect(balAfter3).to.be.gt(balBefore3);
  });

  it("should slash dishonest validators", async () => {
    // Implement slashing test similar to reward test,
    // by submitting malicious/fake results and checking slashing events and stake deduction.
  });
});
