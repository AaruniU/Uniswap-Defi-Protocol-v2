require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-waffle");

module.exports = {
  solidity: {
    compilers: [
        {
            version: "0.8.8"
        }
    ]
},
  networks: {
    hardhat:  {
      forking:  {
        enabled: true,
        url: "Alchemy mainnet URL",
        blockNumber: 16837830
      }
    },
    goerli: {
      enabled: false,
      url: "Alchemy Goerli URL",
      accounts: ["<private key>"]
    }
  },
  etherscan: {
    apiKey: "Etherscan API Key"
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  mocha: {
    timeout: 100000000
  }
}
