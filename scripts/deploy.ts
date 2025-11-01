import {network} from "hardhat";

const {ethers} = await network.connect({
  network: "hardhatOp",
  chainType: "op",
});

async function main(){
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contract with account:", deployer.address);

    // Deploy contracts
    const domainRegistry = await ethers.deployContract("DomainRegistry");
    await domainRegistry.waitForDeployment();

    const monitoringScheduler = await ethers.deployContract("MonitoringScheduler", [
      domainRegistry.target,
    ]);
    await monitoringScheduler.waitForDeployment();

    const resultAggregator = await ethers.deployContract("ResultAggregator", [
      monitoringScheduler.target,
      domainRegistry.target,
    ]);
    await resultAggregator.waitForDeployment();

    const rewardsManager = await ethers.deployContract("RewardsManager", [
      domainRegistry.target,
    ]);
    await rewardsManager.waitForDeployment();

    // Link dependencies
    await domainRegistry.setResultAggregator(resultAggregator.target);
    await domainRegistry.setMonitoringScheduler(monitoringScheduler.target);
    await domainRegistry.setRewardsManager(rewardsManager.target);
    
    await resultAggregator.setRewardsManager(rewardsManager.target);
    await rewardsManager.setResultAggregator(resultAggregator.target);

    const domainRegistryAddress = await domainRegistry.getAddress();
    const monitoringSchedulerAddress = await monitoringScheduler.getAddress();
    const resultAggregatorAddress = await resultAggregator.getAddress();
    const rewardsManagerAddress = await rewardsManager.getAddress();

    console.log("domainRegistry deployed at: ", domainRegistryAddress);
    console.log("monitorScheduler deployed at: ", monitoringSchedulerAddress);
    console.log("resultAggregator deployed at: ", resultAggregatorAddress);
    console.log("rewardsManger deployed at: ", rewardsManagerAddress);
}

main().catch(console.error);