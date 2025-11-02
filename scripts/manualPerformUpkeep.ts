import { network } from "hardhat";

const { ethers } = await network.connect();

async function manualPerformUpkeep() {
  const resultAggregator = await ethers.getContractAt(
    "ResultAggregator",
    "0xC742f1E884998808cB57ccf2E78D16507D497672"
  );
  
  const monitoringScheduler = await ethers.getContractAt(
    "MonitoringScheduler",
    "0x5a0bA4275A8479ADF47AfDBE83242d48582DB846"
  );

  const domain = "www.example.com";

  console.log("=== MANUAL PERFORMUPKEEP TEST ===\n");

  // 1. Check current state BEFORE performUpkeep
  console.log("--- BEFORE performUpkeep ---");
  const cycleIdBefore = await resultAggregator.currentCycleId(domain);
  console.log("Current Cycle ID:", cycleIdBefore.toString());

  // 2. Check if upkeep is needed
  const [upkeepNeeded, performData] = await resultAggregator.checkUpkeep("0x");
  console.log("\nUpkeep Needed:", upkeepNeeded);
  
  if (!upkeepNeeded) {
    console.log("⚠️  Upkeep not needed yet. Wait for the interval to pass.");
    return;
  }

  const decodedDomain = ethers.AbiCoder.defaultAbiCoder().decode(['string'], performData)[0];
  console.log("Domain to check:", decodedDomain);

  // 3. Call performUpkeep
  console.log("\n--- CALLING performUpkeep ---");
  console.log("Sending transaction...");
  
  const tx = await resultAggregator.performUpkeep(performData);
  console.log("Transaction sent! Hash:", tx.hash);
  console.log("Waiting for confirmation...");

  // 4. Wait for transaction to be mined
  const receipt = await tx.wait();
  console.log("✓ Transaction confirmed in block:", receipt.blockNumber);
  console.log("Gas used:", receipt.gasUsed.toString());

  // 5. Parse events from the transaction receipt
  console.log("\n--- EMITTED EVENTS ---");
  
  // Filter for CheckCycleInitiated event
  const checkCycleEvents = receipt.logs
    .map(log => {
      try {
        return resultAggregator.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .filter(event => event !== null && event.name === "CheckCycleInitiated");

  if (checkCycleEvents.length > 0) {
    const event = checkCycleEvents[0];
    console.log("✓ CheckCycleInitiated Event:");
    console.log("  Domain:", event.args.domainURL);
    console.log("  Cycle ID:", event.args.cycleId.toString());
    console.log("  Assigned Validators:", event.args.assignedValidators);
  }

  // 6. Check current state AFTER performUpkeep
  console.log("\n--- AFTER performUpkeep ---");
  const cycleIdAfter = await resultAggregator.currentCycleId(domain);
  console.log("Current Cycle ID:", cycleIdAfter.toString());
  
  // 7. Verify the increment
  if (cycleIdAfter > cycleIdBefore) {
    console.log("✓ SUCCESS! Cycle ID incremented from", cycleIdBefore.toString(), "to", cycleIdAfter.toString());
  } else {
    console.log("✗ ERROR: Cycle ID did not increment!");
  }

  // 8. Get the newly created cycle details
  console.log("\n--- NEW CYCLE DETAILS ---");
  const latestCycle = await resultAggregator.cycles(domain, cycleIdAfter);
  console.log("Domain URL:", latestCycle.domainURL);
  console.log("Cycle ID:", latestCycle.cycleId.toString());
  console.log("Assigned Time:", new Date(Number(latestCycle.assignedTime) * 1000).toLocaleString());
  console.log("Submission Deadline:", new Date(Number(latestCycle.submissionDeadline) * 1000).toLocaleString());
  console.log("Required Validators:", latestCycle.requiredValidators.toString());
  console.log("Submitted Count:", latestCycle.submittedCount.toString());
  console.log("Consensus Reached:", latestCycle.consensusReached);
  console.log("Is Finalized:", latestCycle.isFinalized);

  console.log("\n=== TEST COMPLETE ===");
}

manualPerformUpkeep().catch(console.error);
