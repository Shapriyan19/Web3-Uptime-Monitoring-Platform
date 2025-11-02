import { network } from "hardhat";

const { ethers } = await network.connect();

async function diagnose() {
  const resultAggregator = await ethers.getContractAt(
    "ResultAggregator",
    "0xCfec24Ae2b825229762377f2E65C40B18D8a1157"
  );
  
  const monitoringScheduler = await ethers.getContractAt(
    "MonitoringScheduler",
    "0xFE391CC8A150ebAFc420A5C4f861330552c9D214"
  );

  const domain = "www.google.com";

  console.log("=== DIAGNOSIS START ===\n");

  // 1. Check validators
  try {
    const validators = await monitoringScheduler.getActiveValidators();
    console.log("✓ Active Validators:", validators.length);
    validators.forEach((v, i) => console.log(`  ${i + 1}. ${v}`));
  } catch (e) {
    console.log("✗ No validators registered!");
  }

  // 2. Check if domain monitored
  const isMonitored = await resultAggregator.isDomainMonitored(domain);
  console.log(`\n${isMonitored ? '✓' : '✗'} Domain Monitored:`, isMonitored);

  // 3. Check schedule
  try {
    const [, lastScheduled, interval] = await monitoringScheduler.getSchedule(domain);
    console.log("\n✓ Schedule Info:");
    console.log("  Last Scheduled:", new Date(Number(lastScheduled) * 1000).toLocaleString());
    console.log("  Interval:", interval.toString(), "seconds");
    
    const now = Math.floor(Date.now() / 1000);
    const nextCheck = Number(lastScheduled) + Number(interval);
    console.log("  Next Check:", new Date(nextCheck * 1000).toLocaleString());
    console.log("  Time Until Next:", nextCheck - now, "seconds");
  } catch (e) {
    console.log("\n✗ Schedule not initialized!");
  }

  // 4. Check upkeep
  const [upkeepNeeded, performData] = await resultAggregator.checkUpkeep("0x");
  console.log(`\n${upkeepNeeded ? '✓' : '✗'} Upkeep Needed:`, upkeepNeeded);
  
  if (upkeepNeeded) {
    const decodedDomain = ethers.AbiCoder.defaultAbiCoder().decode(['string'], performData)[0];
    console.log("  Domain to check:", decodedDomain);
    console.log("  ⚠️  You can manually call performUpkeep now!");
  }

  // 5. Check current cycle
  const cycleId = await resultAggregator.currentCycleId(domain);
  console.log("\nCurrent Cycle ID:", cycleId.toString());

  console.log("\n=== DIAGNOSIS END ===");
}

diagnose().catch(console.error);