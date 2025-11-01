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

    // Link dependencies
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

    // Assign jobs
    await monitoringScheduler.assignJob(domain1);
    await monitoringScheduler.assignJob(domain1);
    await monitoringScheduler.assignJob(domain1);
    
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

  it("should handle multiple check cycles independently", async function () {
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

    // === First Check Cycle ===
    await monitoringScheduler.assignJob(domain1);
    await monitoringScheduler.assignJob(domain1);
    await monitoringScheduler.assignJob(domain1);
    
    await resultAggregator.initiateCheckCycle(domain1);
    const cycleId1 = await resultAggregator.currentCycleId(domain1);
    expect(cycleId1).to.equal(1n);

    // All validators report UP for cycle 1
    await resultAggregator
      .connect(validator1)
      .submitResult(domain1, cycleId1, true, 200, "0x");
    await resultAggregator
      .connect(validator2)
      .submitResult(domain1, cycleId1, true, 200, "0x");
    await resultAggregator
      .connect(validator3)
      .submitResult(domain1, cycleId1, true, 200, "0x");

    const cycle1 = await resultAggregator.cycles(domain1, cycleId1);
    expect(cycle1.isFinalized).to.be.true;
    expect(cycle1.consensusStatus).to.equal("UP");

    // === Second Check Cycle ===
    await monitoringScheduler.assignJob(domain1);
    await monitoringScheduler.assignJob(domain1);
    await monitoringScheduler.assignJob(domain1);
    
    await resultAggregator.initiateCheckCycle(domain1);
    const cycleId2 = await resultAggregator.currentCycleId(domain1);
    expect(cycleId2).to.equal(2n);

    // Majority report DOWN for cycle 2
    await resultAggregator
      .connect(validator1)
      .submitResult(domain1, cycleId2, false, 503, "0x");
    await resultAggregator
      .connect(validator2)
      .submitResult(domain1, cycleId2, false, 503, "0x");
    await resultAggregator
      .connect(validator3)
      .submitResult(domain1, cycleId2, true, 200, "0x");

    const cycle2 = await resultAggregator.cycles(domain1, cycleId2);
    expect(cycle2.isFinalized).to.be.true;
    expect(cycle2.consensusStatus).to.equal("DOWN");

    // === Third Check Cycle ===
    await monitoringScheduler.assignJob(domain1);
    await monitoringScheduler.assignJob(domain1);
    await monitoringScheduler.assignJob(domain1);
    
    await resultAggregator.initiateCheckCycle(domain1);
    const cycleId3 = await resultAggregator.currentCycleId(domain1);
    expect(cycleId3).to.equal(3n);

    // Back to UP for cycle 3
    await resultAggregator
      .connect(validator1)
      .submitResult(domain1, cycleId3, true, 200, "0x");
    await resultAggregator
      .connect(validator2)
      .submitResult(domain1, cycleId3, true, 200, "0x");
    await resultAggregator
      .connect(validator3)
      .submitResult(domain1, cycleId3, true, 200, "0x");

    const cycle3 = await resultAggregator.cycles(domain1, cycleId3);
    expect(cycle3.isFinalized).to.be.true;
    expect(cycle3.consensusStatus).to.equal("UP");

    // Verify domain stats are updated correctly
    const stats = await resultAggregator.fetchDomainStats(domain1);
    expect(stats.totalChecks).to.equal(3n);
    expect(stats.successfulChecks).to.equal(2n); // cycles 1 and 3
    expect(stats.failedChecks).to.equal(1n); // cycle 2
    expect(stats.currentStatus).to.be.true; // Last cycle was UP
    expect(stats.uptimePercentage).to.equal(66n); // 2/3 * 100 = 66%
  });

  it("should track domain stats correctly across cycles", async function () {
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

    // Run 5 cycles with different outcomes
    const cycleResults = [true, true, false, true, true]; // 4 UP, 1 DOWN
    
    for (let i = 0; i < cycleResults.length; i++) {
      await monitoringScheduler.assignJob(domain1);
      await monitoringScheduler.assignJob(domain1);
      await monitoringScheduler.assignJob(domain1);
      
      await resultAggregator.initiateCheckCycle(domain1);
      const cycleId = await resultAggregator.currentCycleId(domain1);

      // All validators agree on the result
      const isUp = cycleResults[i];
      const statusCode = isUp ? 200 : 503;
      
      await resultAggregator
        .connect(validator1)
        .submitResult(domain1, cycleId, isUp, statusCode, "0x");
      await resultAggregator
        .connect(validator2)
        .submitResult(domain1, cycleId, isUp, statusCode, "0x");
      await resultAggregator
        .connect(validator3)
        .submitResult(domain1, cycleId, isUp, statusCode, "0x");
    }

    const stats = await resultAggregator.fetchDomainStats(domain1);
    expect(stats.totalChecks).to.equal(5n);
    expect(stats.successfulChecks).to.equal(4n);
    expect(stats.failedChecks).to.equal(1n);
    expect(stats.uptimePercentage).to.equal(80n); // 4/5 * 100 = 80%
    expect(stats.currentStatus).to.be.true; // Last cycle was UP
  });
});