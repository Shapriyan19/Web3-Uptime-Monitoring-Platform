import { network } from "hardhat";

const { ethers } = await network.connect();

async function diagnoseThreeValidators() {
  const resultAggregator = await ethers.getContractAt(
    "ResultAggregator",
    "0xCfec24Ae2b825229762377f2E65C40B18D8a1157" // Your new contract address
  );
  
  const monitoringScheduler = await ethers.getContractAt(
    "MonitoringScheduler",
    "0xFE391CC8A150ebAFc420A5C4f861330552c9D214"
  );

  const domain = "www.chatgpt.com";

  console.log("=== THREE VALIDATOR DIAGNOSIS ===\n");

  // 1. Check minValidatorsRequired
  const minRequired = await resultAggregator.minValidatorsRequired();
  console.log("minValidatorsRequired:", minRequired.toString());

  // 2. Check how many active validators exist
  const activeValidators = await monitoringScheduler.getActiveValidators();
  console.log("Active Validators:", activeValidators.length);
  
  if (activeValidators.length < 3) {
    console.log("✗ ERROR: You need at least 3 active validators!");
    console.log("   Current validators:", activeValidators.length);
    return;
  }

  // 3. Check if upkeep needed
  console.log("\n=== CHECKING UPKEEP ===");
  try {
    const [upkeepNeeded, performData] = await resultAggregator.checkUpkeep("0x");
    console.log("Upkeep Needed:", upkeepNeeded);

    if (upkeepNeeded) {
      // 4. Estimate gas for performUpkeep with 3 validators
      console.log("\n=== GAS ESTIMATION ===");
      try {
        const gasEstimate = await resultAggregator.performUpkeep.estimateGas(performData);
        console.log("✓ Estimated Gas:", gasEstimate.toString());
        console.log("  Your Gas Limit: 600,000");
        
        if (gasEstimate > 600000n) {
          console.log("  ✗ PROBLEM: Gas estimate EXCEEDS your limit!");
          console.log(`  Recommended: Increase to ${(Number(gasEstimate) * 1.3).toFixed(0)}`);
        } else {
          console.log("  ✓ Gas limit sufficient");
        }

        // 5. Try to simulate performUpkeep
        console.log("\n=== SIMULATION ===");
        try {
          await resultAggregator.performUpkeep.staticCall(performData);
          console.log("✓ performUpkeep simulation SUCCESSFUL");
          console.log("  The function will work if called");
        } catch (simError) {
          console.log("✗ performUpkeep simulation FAILED!");
          console.log("  Error:", simError.message);
          
          // Check if it's due to not enough validators
          if (simError.message.includes("Not enough validators")) {
            console.log("\n  ISSUE: Not enough active validators registered!");
          }
        }

      } catch (gasError) {
        console.log("✗ Gas estimation FAILED!");
        console.log("  Error:", gasError.message);
      }
    } else {
      console.log("ℹ️  Waiting for next interval");
    }
  } catch (checkError) {
    console.log("✗ checkUpkeep FAILED!");
    console.log("Error:", checkError.message);
  }

  // 6. Check current cycle
  const cycleId = await resultAggregator.currentCycleId(domain);
  console.log("\nCurrent Cycle ID:", cycleId.toString());

  console.log("\n=== POSSIBLE ISSUES ===");
  console.log("1. Gas limit too low (need ~700,000 for 3 validators)");
  console.log("2. Not enough active validators (need exactly 3)");
  console.log("3. Contract address not updated in Chainlink Automation");

  console.log("\n=== DIAGNOSIS END ===");
}

diagnoseThreeValidators().catch(console.error);
