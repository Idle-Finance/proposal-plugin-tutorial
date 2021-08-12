# Introducing Hardhat Proposal Plugin

The hard hat proposal plugin is an initative developed by the idle dev league to help build test and deploy compound-like governance proposals.
This will reduce the development overhead for proposals, specifically reducing the time required for prototyping and evaluating proposals.

## Why

One of the major issues with proposals currently is the scripting overheads required for simulating proposals, which in the past have involved contract imitations, and transferring the required amounts of ETH and IDLE to addresses in order to accurately simulate proposals. Furthermore migrating a proposal from testing to the on-chain governance was previously a non-trivial task.

With the hardhat proposal plugin proposals can be rapidly developed by using existing `ethers` contracts to build up each action for a proposal into a `Proposal` object. In combination with other ethereum testing libraries such as Waffle it is possible to achieve a higher level of testing coverage of proposals 

The proposal object includes helpful feasures such as proposal simulation, which is optimised for quickly executing proposal avoiding the delay of mining certain number of block in order to place the proposal in the correct state.
Simulating the proposal through the plugin also allows for detailed debugging messages to be retrieved, which will help in debugging proposals.

## Features

1. Integrate ethers contracts to build proposals
2. Simulate proposals quickly
3. Receive detailed revert messages for each action of a proposal
4. Receive detailed information about each proposal action
5. Deploy proposals on-chain
6. Inspect proposals on-chain

## Tutorial Walkthrough
In this section I will walk through a simple example of creating a proposal from scratch.
For this tutorial we will create a proposal to update the fee address of idle usdt.
To begin lets create a new directory for our proposal

```
~$ mkdir ~/tutorial
~$ cd ~/tutorial/
~/tutorial$ 
```

Lets bootstrap this directory with hardhat
```
~/tutorial$ npm init --yes
~/tutorial$ npm install --save-dev hardhat
```

Now lets initialise hardhat with an empty project
```
~/tutorial$ npx hardhat
```

And finally we can now install the plugin
```
~/tutorial$ npm install --save-dev @idle-finance/hardhat-proposals-plugin @nomiclabs/hardhat-ethers ethers
```

Now that we have all the dependencies installed its time to configure the `hardhat.config.js` file
We need to tell hardhat to register the plugin, but also to configure the network, and the proposals plugin.

```js
// hardhat.config.js

require("@nomiclabs/hardhat-ethers");
require("@idle-finance/hardhat-proposals-plugin");

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.7.3",
  networks: {
    hardhat: {
      forking: {
        url: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
        blockNumber: 12725152, // Used just as an example
      }
    },
  },
  proposals: {
    governor: "0x2256b25CFC8E35c3135664FD03E77595042fe31B",
    votingToken: "0x875773784Af8135eA0ef43b5a374AaD105c5D39e"
  }
};
```

Now that hard hat is configured lets create a proposal.
The first step is to add the ABI for each of the contracts we want to interact with to the project.

For this tutorial we will need the `IDLE USDT Best Yield` ABI which can be extracted from etherscan https://etherscan.io/address/0xF34842d05A1c888Ca02769A633DF37177415C2f8#code

under the contract ABI.

We will put this in a new directory

```
~/tutorial$ mkdir abi
~/tutorial$ cd abi
~/tutorial/abi$ touch idleusdt.json
```

We can then paste the ABI data into `abi/idleusdt.json`

We will write the proposal script under the `scripts/` sub directory

```
~/tutorial$ mkdir scripts
~/tutorial$ cd scripts

~/tutorial/scripts$ touch deploy-cream.js
~/tutorial/scripts$ touch propose.js
```

For the purposes of this tutorial the instructions for deploying the C.R.E.A.M. wrapper is out of scope, however if you did want to follow along the full instructions can be accessed at this repo: https://github.com/asafsilman/test-usdt-proposal

We can develop the proposal script under `scripts/propose.js`

First lets setup some boilerplate task defenition

```js
// scripts/propose.js

task("execute-proposal", async function (taskArgs, hre, sunSuper) {

})
```

Add task to `hardhat.config.js`
```js
// hardhat.config.js

require(...)

require('./scripts/propose')
```

Next we will load the contract using the ABI

```js
task(...{
  const IDLE_USDT_ABI = require("../abi/idleusdt.json")

  const idleUSDTContract = await hre.ethers.getContractAt(IDLE_USDT_ABI, "0xF34842d05A1c888Ca02769A633DF37177415C2f8")
})
```

Now we can add the proposal step
```js
const signer = hre.ethers.getSigner(0);
let proposal = hre.proposals.builders.alpha()
    .setProposer(signer)
    .addContractAction(idleUSDTContract, "setFeeAddress", ["0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"])
    .setDescription("TEST PROPOSAL\nSet fee address to 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045")
    .build()

await proposal.printProposalInfo()
```

This step does a number of things so lets break it down.

The first line is to initialise a signer who has enough VotingToken (in this case IDLE) to propose the proposal. Because we are just testing here we can just use the default signer.
When we want to deploy this proposal on chain, we will need to swap out the signer for a legitimat signer.

Lines 2-6 Build the proposal using the governor alpha proposal template.
The governor alpha and voting token parameters for the proposal are automatically loaded from the hardhat config previously configured.

The proposer is set to default signer. Following this step a contract interaction is added to the proposal via `addContractAction`, The contract, method and arguments are registered.
Next a description is added to the proposal, and finally the `build()` step uses all the information passed to the builder to return the proposal object.
At this point the proposal is built, but it not yet deployed or simulated.

Before we proceed we can add the final line to print some info regarding the proposal using `await proposal.printProposalInfo()`

If we run this task now, we can see some info that the hardhat propoal plugins shows.

```
~/tutorial$ npx hardhat execute-proposal
--------------------------------------------------------
Unsubmitted proposal
Description: TEST PROPOSAL
Set fee address to 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
Action 0
 ├─ target ───── 0xF34842d05A1c888Ca02769A633DF37177415C2f8 (name: IdleUSDT v4 [Best yield])
 ├─ signature ── setFeeAddress(address)
 └─ args [ 0 ] ─ 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
```

Finally we can now add a method to simulate the proposal to the task. This will simulate the proposal in the hardhat fork.

```js
await proposal.simulate()
```

And we can add a basic check after this to confirm that the proposal indeed worked as intended

```js
let feeAddress = await idleUSDTContract.feeAddress()
    
console.log(`The fee address is now after proposal: ${feeAddress}`)
```

Running the task once again shows us the the proposal was successfully simulated
```
~/tutorial$ npx hardhat execute-proposal
The fee address before proposal: 0xBecC659Bfc6EDcA552fa1A67451cC6b38a0108E4
--------------------------------------------------------
Unsubmitted proposal
Description: TEST PROPOSAL
Set fee address to 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
Action 0
 ├─ target ───── 0xF34842d05A1c888Ca02769A633DF37177415C2f8 (name: IdleUSDT v4 [Best yield])
 ├─ signature ── setFeeAddress(address)
 └─ args [ 0 ] ─ 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
The fee address is now: 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
```

And with that you have successfully simulated a proposal. The final script looks like this

```js
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
```
