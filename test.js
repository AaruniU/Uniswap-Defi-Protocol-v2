const { expect, config } = require("chai");
const { Wallet, getDefaultProvider } = require("ethers");
const { hexStripZeros } = require("ethers/lib/utils");
const { ethers, network } = require("hardhat");
const hardhatConfig = require("../hardhat.config");

describe("Test run", () => {
    
    beforeEach(async function () {
        // Reset fork before each test
        await network.provider.send("hardhat_reset", [{
            forking: {
              jsonRpcUrl: hardhatConfig.networks.hardhat.forking.url,
              blockNumber: hardhatConfig.networks.hardhat.forking.blockNumber
            }
        }])
    })

    it("Swap Tokens", async() => {

    // Get the deployer address
    const [owner] = await ethers.getSigners();
    
   // Deploy TestUniswap.sol
    const testuniswapContract = await ethers.getContractFactory("TestUniswap")
    const testuniswap = await testuniswapContract.deploy();
    await testuniswap.deployed();

    const DAIAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
    const WBTCAddress = "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599"
    
    // Impersonate DAIWhale's address
    const DAIWhaleAddress = "0xF977814e90dA44bFA03b6295A0616a897441aceC"
    await network.provider.send("hardhat_impersonateAccount", [DAIWhaleAddress])
    const impersonatedSigner = await ethers.getSigner(DAIWhaleAddress)
    
    const erc20ABI = [
        "function balanceOf(address account) public view  returns (uint256)",
        "function transfer(address to, uint256 amount) public returns (bool)"
    ]

    const daiToken = await ethers.getContractAt(erc20ABI, DAIAddress)

    // Find the token holder's DAI balance
    console.log("\nDAIWhale's DAI balance is: ", await daiToken.balanceOf(DAIWhaleAddress))
    
    // Connect to the impersonatedSigner and send 100000 DAI to your signer
    await daiToken.connect(impersonatedSigner).transfer(testuniswap.address, (100000n * 1000000000000000000n))

    // Lets check the balance after DAI transfer
    console.log("TestUniswap's DAI balance after transfer is: ", await daiToken.balanceOf(testuniswap.address))

    // Amount of DAI we want to swap
    var DAIAmt = 25000n * 1000000000000000000n
    
    // Calculate how much WBTC we can expect for 25000 DAI
    var maxTokenAmt = await testuniswap.GetMaxTokenAmount(DAIAmt, DAIAddress, WBTCAddress)
    console.log("GetMaxTokenAmount is: ", maxTokenAmt)
    
    // Check Owner's WBTC balace before calling Uniswap
    const wbtcToken = await ethers.getContractAt(erc20ABI, WBTCAddress)
    console.log("Owner's WBTC balace before calling Uniswap is: ", await wbtcToken.balanceOf(owner.address))

    // Call TestUniswap.SwapTokens() to swap DAI for WBTC
    // Remember DAI has 18 decimals while WBTC has only 8 decimals
    // Set amountOutMin carefully to avoid front running: https://www.reddit.com/r/solidity/comments/w02kwp/how_important_is_it_to_properly_set_amountoutmin/
    // We set amountOutMin = maxTokenAmt
    await testuniswap.SwapTokens(DAIAmt, maxTokenAmt, DAIAddress, WBTCAddress, owner.address)

    // Check Owner's WBTC balace after calling Uniswap
    console.log("Owner's WBTC balace after calling Uniswap is: ", await wbtcToken.balanceOf(owner.address))
    })

    it("Add / Remove Liquidity", async() => {

    // Get the deployer address
    const [owner] = await ethers.getSigners();
    
    // Deploy TestUniswap.sol
    const testuniswapContract = await ethers.getContractFactory("TestUniswap")
    const testuniswap = await testuniswapContract.deploy();
    await testuniswap.deployed();

    const DAIAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
    const WBTCAddress = "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599"
    const DAIWhaleAddress = "0xF977814e90dA44bFA03b6295A0616a897441aceC"
    const WBTCWhaleAddress = "0x38720D56899d46cAD253d08f7cD6CC89d2c83190"

    const erc20ABI = [
        "function balanceOf(address account) public view  returns (uint256)",
        "function transfer(address to, uint256 amount) public returns (bool)"
    ]
    
    // Transfer some DAI from DAI Whale and transfer to our TestUniswap contract
    
    // Impersonate DAIWhale's address
    await network.provider.send("hardhat_impersonateAccount", [DAIWhaleAddress])
    var impersonatedSigner = await ethers.getSigner(DAIWhaleAddress)
    const daiToken = await ethers.getContractAt(erc20ABI, DAIAddress)
    // Connect to the impersonatedSigner and send 1000000 DAI to your signer
    await daiToken.connect(impersonatedSigner).transfer(testuniswap.address, (1000000n * 1000000000000000000n))
    // Lets check the balance after DAI transfer
    console.log("\nTestUniswap's DAI balance after transfer is: ", await daiToken.balanceOf(testuniswap.address))

    // Transfer some WBTC from WBTC Whale and transfer to our TestUniswap contract
    
    // Impersonate WBTC Whale's address
    await network.provider.send("hardhat_impersonateAccount", [WBTCWhaleAddress])
    impersonatedSigner = await ethers.getSigner(WBTCWhaleAddress)
    const wbtcToken = await ethers.getContractAt(erc20ABI, WBTCAddress)
    // Connect to the impersonatedSigner and send 500 WBTC to our TestUniswap contract
    await wbtcToken.connect(impersonatedSigner).transfer(testuniswap.address, (500n * 100000000n))
    // Lets check the balance after WBTC transfer
    console.log("TestUniswap's WBTC balance after transfer is: ", await wbtcToken.balanceOf(testuniswap.address))
    // Add liquidity
    await testuniswap.AddLiquidity(DAIAddress, WBTCAddress, 1000000n * 1000000000000000000n, 5n * 100000000n, 120000n * 1000000000000000000n, 5n * 100000000n, testuniswap.address)

    // Now we will remove DAI and WBTC tokens that we supplied to Uniswap
    testuniswap.RemoveLiquidity(DAIAddress, WBTCAddress, 1, 1, testuniswap.address)
    })

    it("Flash swap", async() => {

    // Get the deployer address
    const [owner] = await ethers.getSigners();
    
    // Deploy TestUniswap.sol
    const testuniswapContract = await ethers.getContractFactory("TestUniswap")
    const testuniswap = await testuniswapContract.deploy();
    await testuniswap.deployed();

    const DAIAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
    const DAIWhaleAddress = "0xF977814e90dA44bFA03b6295A0616a897441aceC"
    const WETHAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
    const WETHWhaleAddress = "0x2fEb1512183545f48f6b9C5b4EbfCaF49CfCa6F3"

    const erc20ABI = [
        "function balanceOf(address account) public view  returns (uint256)",
        "function transfer(address to, uint256 amount) public returns (bool)"
    ]

    // Impersonate DAIWhale's address
    await network.provider.send("hardhat_impersonateAccount", [DAIWhaleAddress])
    var impersonatedSigner = await ethers.getSigner(DAIWhaleAddress)
    const daiToken = await ethers.getContractAt(erc20ABI, DAIAddress)
    // Connect to the impersonatedSigner and send 1000000 DAI to your signer
    await daiToken.connect(impersonatedSigner).transfer(testuniswap.address, (1000000n * 1000000000000000000n))
    // Lets check the balance after DAI transfer
    console.log("\nTestUniswap's DAI balance after transfer from the whale is: ", await daiToken.balanceOf(testuniswap.address))

    // Impersonate WETHWhale's address
    await network.provider.send("hardhat_impersonateAccount", [WETHWhaleAddress])
    var impersonatedSigner = await ethers.getSigner(WETHWhaleAddress)
    const wethToken = await ethers.getContractAt(erc20ABI, WETHAddress)
    // Connect to the impersonatedSigner and send 50 WETH to your signer
    await wethToken.connect(impersonatedSigner).transfer(testuniswap.address, (50n * 1000000000000000000n))
    // Lets check the balance after WETH transfer
    console.log("TestUniswap's WETH balance after transfer from the whale is: ", await wethToken.balanceOf(testuniswap.address))

    await testuniswap.FlashSwap(DAIAddress, WETHAddress, 500n * 1000000000000000000n, 10n * 1000000000000000000n);
    
    })
})
