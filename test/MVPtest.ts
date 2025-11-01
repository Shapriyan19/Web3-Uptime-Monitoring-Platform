import { expect } from "chai";
import { network } from "hardhat";
// import type {
//   DomainRegistry,
//   MonitoringScheduler,
//   ResultAggregator,
//   RewardsManager,
// } from "../typechain-types/index.js";


const { ethers } = await network.connect();

describe("Decentralized Uptime Monitoring MVP", function () {
  let domainRegistry: any;
  let monitoringScheduler: any;
  let resultAggregator: any;
  let rewardsManager: any;

  let owner: any;
  let validator1: any;
  let validator2: any;
  let validator3: any;

  const domain1 = "example.com";
  const stakeAmount = ethers.parseEther("2");
  const rewardPerCheck = ethers.parseEther("0.01");

  beforeEach(async function () {
    [owner, validator1, validator2, validator3] = await ethers.getSigners();

    // Deploy contracts
    domainRegistry = await ethers.deployContract("DomainRegistry");
    await domainRegistry.waitForDeployment();

    monitoringScheduler = await ethers.deployContract("MonitoringScheduler", [
      domainRegistry.target,
    ]);
    await monitoringScheduler.waitForDeployment();

    resultAggregator = await ethers.deployContract("ResultAggregator", [
      monitoringScheduler.target,
      domainRegistry.target,
    ]);
    await resultAggregator.waitForDeployment();

    rewardsManager = await ethers.deployContract("RewardsManager", [
      domainRegistry.target,
    ]);
    await rewardsManager.waitForDeployment();

    // Link dependencies - ADD THESE LINES
    await domainRegistry.setResultAggregator(resultAggregator.target);
    await domainRegistry.setMonitoringScheduler(monitoringScheduler.target);
    await domainRegistry.setRewardsManager(rewardsManager.target);
    
    await resultAggregator.setRewardsManager(rewardsManager.target);
    await rewardsManager.setResultAggregator(resultAggregator.target);
  });


  it("should register domain with staking", async function () {
    await domainRegistry.connect(owner).registerDomain(domain1, 60, {
      value: stakeAmount,
    });

    const info = await domainRegistry.domains(domain1);
    expect(info.owner).to.equal(owner.address);
    expect(info.stakingBalance).to.equal(stakeAmount);
  });

  it("should register validators", async function () {
    await monitoringScheduler.connect(validator1).registerValidator();
    await monitoringScheduler.connect(validator2).registerValidator();

    const validators = await monitoringScheduler.getActiveValidators();
    expect(validators).to.include(validator1.address);
    expect(validators).to.include(validator2.address);
  });

  it("should assign jobs round-robin", async function () {
    await monitoringScheduler.connect(validator1).registerValidator();
    await monitoringScheduler.connect(validator2).registerValidator();

    await domainRegistry.connect(owner).registerDomain(domain1, 60, {
      value: stakeAmount,
    });

    await monitoringScheduler.assignJob(domain1);
    await monitoringScheduler.assignJob(domain1);

    const jobs = await monitoringScheduler.getDomainHistory(domain1);
    expect(jobs.length).to.equal(2);
    expect([validator1.address, validator2.address]).to.include(
      jobs[0].validator
    );
    expect([validator1.address, validator2.address]).to.include(
      jobs[1].validator
    );
  });

  it("should initiate check cycle and reach consensus", async function () {
    await monitoringScheduler.connect(validator1).registerValidator();
    await monitoringScheduler.connect(validator2).registerValidator();
    await monitoringScheduler.connect(validator3).registerValidator();

    await domainRegistry.connect(owner).registerDomain(domain1, 60, {
      value: stakeAmount,
    });

    // Assign jobs
    await monitoringScheduler.assignJob(domain1);
    await monitoringScheduler.assignJob(domain1);
    await monitoringScheduler.assignJob(domain1);

    // REMOVE THIS LINE:
    // await resultAggregator.addDomainForMonitoring(domain1);
    
    await resultAggregator.initiateCheckCycle(domain1);

    const cycleId = await resultAggregator.currentCycleId(domain1);
    expect(cycleId).to.equal(1n);

    await resultAggregator
      .connect(validator1)
      .submitResult(domain1, cycleId, true, 200, "0x");
    await resultAggregator
      .connect(validator2)
      .submitResult(domain1, cycleId, false, 500, "0x");
    await resultAggregator
      .connect(validator3)
      .submitResult(domain1, cycleId, true, 200, "0x");

    const cycle = await resultAggregator.cycles(domain1, cycleId);
    expect(cycle.isFinalized).to.be.true;
    expect(cycle.consensusStatus).to.equal("UP");
  });

  it("should distribute rewards to honest validators", async function () {
    // Fund RewardsManager contract
    await owner.sendTransaction({
      to: rewardsManager.target,
      value: ethers.parseEther("1"),
    });

    await monitoringScheduler.connect(validator1).registerValidator();
    await monitoringScheduler.connect(validator2).registerValidator();
    await monitoringScheduler.connect(validator3).registerValidator();

    await domainRegistry.connect(owner).registerDomain(domain1, 60, {
      value: stakeAmount,
    });

    await monitoringScheduler.assignJob(domain1);
    await monitoringScheduler.assignJob(domain1);
    await monitoringScheduler.assignJob(domain1);

    // REMOVE THIS LINE:
    // await resultAggregator.addDomainForMonitoring(domain1);
    
    await resultAggregator.initiateCheckCycle(domain1);

    const cycleId = await resultAggregator.currentCycleId(domain1);

    const balBefore1 = await ethers.provider.getBalance(validator1.address);
    const balBefore3 = await ethers.provider.getBalance(validator3.address);

    await resultAggregator
      .connect(validator1)
      .submitResult(domain1, cycleId, true, 200, "0x");
    await resultAggregator
      .connect(validator2)
      .submitResult(domain1, cycleId, false, 500, "0x");
    await resultAggregator
      .connect(validator3)
      .submitResult(domain1, cycleId, true, 200, "0x");

    const balAfter1 = await ethers.provider.getBalance(validator1.address);
    const balAfter3 = await ethers.provider.getBalance(validator3.address);

    expect(balAfter1).to.be.gt(balBefore1);
    expect(balAfter3).to.be.gt(balBefore3);
  });
});
