task("execute-proposal", async function (taskArgs, hre, sunSuper) {
    const IDLE_USDT_ABI = require("../abi/idleusdt.json")

    const idleUSDTContract = await hre.ethers.getContractAt(IDLE_USDT_ABI, "0xF34842d05A1c888Ca02769A633DF37177415C2f8");

    const signer = hre.ethers.getSigner(0);
    let proposal = hre.proposals.builders.alpha()
        .setProposer(signer)
        .addContractAction(idleUSDTContract, "setFeeAddress", ["0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"])
        .setDescription("TEST PROPOSAL\nSet fee address to 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045")
        .build()

    // await proposal.printProposalInfo()
    let feeAddress = await idleUSDTContract.feeAddress()
    console.log(`The fee address is now: ${feeAddress}`)

    await proposal.simulate()

    feeAddress = await idleUSDTContract.feeAddress()
    
    console.log(`The fee address is now after proposal: ${feeAddress}`)
})
