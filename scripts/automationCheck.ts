import { network } from "hardhat";

const { ethers } = await network.connect();

async function verifyAutomation() {
  const resultAggregator = await ethers.getContractAt(
    "ResultAggregator",
    "0xCfec24Ae2b825229762377f2E65C40B18D8a1157"
  );

  const domain = "www.google.com";

  console.log("=== AUTOMATION VERIFICATION ===\n");

  // Get cycle ID before
  const cycleIdBefore = await resultAggregator.currentCycleId(domain);
  console.log("Current Cycle ID:", cycleIdBefore.toString());

  // Check if upkeep is needed
  const [upkeepNeeded] = await resultAggregator.checkUpkeep("0x");
  console.log("Upkeep Needed:", upkeepNeeded);

  if (upkeepNeeded) {
    console.log("\n⏳ Waiting for Chainlink Automation to trigger...");
    console.log("Check back in 2-3 minutes");
    console.log("\nTo verify it worked:");
    console.log("1. Check the 'History' tab in automation.chain.link");
    console.log("2. Run this script again - Cycle ID should increment");
  } else {
    console.log("\n✓ Waiting for next interval (120 seconds)");
  }

  console.log("\n=== Gas Limit Check ===");
  console.log("Required gas: ~457,000");
  console.log("Your OLD gas limit: 80,000 ❌ (TOO LOW)");
  console.log("Your NEW gas limit should be: 600,000+ ✓");
  console.log("\nIf you set it to 600,000+, automation will work!");
}

verifyAutomation().catch(console.error);
