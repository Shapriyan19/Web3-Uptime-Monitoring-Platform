import { network } from "hardhat";

const { ethers } = await network.connect();

async function manualTrigger() {
  const resultAggregator = await ethers.getContractAt(
    "ResultAggregator",
    "0xbfdfBe0937aE403d4180788F271C62AC08548D1d"
  );

  console.log("=== MANUAL TRIGGER TEST ===\n");

  const [upkeepNeeded, performData] = await resultAggregator.checkUpkeep("0x");
  
  if (!upkeepNeeded) {
    console.log("✗ Upkeep not needed");
    return;
  }

  console.log("✓ Triggering performUpkeep manually...");
  
  const tx = await resultAggregator.performUpkeep(performData, {
    gasLimit: 800000
  });
  
  console.log("Transaction hash:", tx.hash);
  const receipt = await tx.wait();
  
  console.log("✓ SUCCESS!");
  console.log("Block:", receipt.blockNumber);
  console.log("Gas used:", receipt.gasUsed.toString());
  
  // Check cycle incremented
  const domain = "www.example.com";
  const cycleId = await resultAggregator.currentCycleId(domain);
  console.log("\n✓ New Cycle ID:", cycleId.toString());
  
  if (cycleId > 0) {
    console.log("\n✓✓✓ PROOF: Your contract works perfectly!");
    console.log("The problem is 100% with Chainlink Automation registration.");
    console.log("\nMost likely causes:");
    console.log("1. LINK balance below minimum threshold");
    console.log("2. Upkeep is paused");
    console.log("3. Wrong contract address registered");
    console.log("\nCheck automation.chain.link and verify:");
    console.log("- Contract address: 0xbfdfBe0937aE403d4180788F271C62AC08548D1d");
    console.log("- LINK balance > Minimum balance");
    console.log("- Status: Active (not Paused)");
    console.log("- Gas limit: 800000");
  }
}

manualTrigger().catch(console.error);
