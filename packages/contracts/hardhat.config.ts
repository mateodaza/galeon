import type { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.24',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    mantleSepolia: {
      url: process.env.MANTLE_SEPOLIA_RPC || 'https://rpc.sepolia.mantle.xyz',
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      chainId: 5003,
    },
    mantle: {
      url: process.env.MANTLE_RPC || 'https://rpc.mantle.xyz',
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      chainId: 5000,
    },
  },
  etherscan: {
    apiKey: {
      mantleSepolia: process.env.MANTLESCAN_API_KEY || '',
      mantle: process.env.MANTLESCAN_API_KEY || '',
    },
    customChains: [
      {
        network: 'mantleSepolia',
        chainId: 5003,
        urls: {
          apiURL: 'https://api-sepolia.mantlescan.xyz/api',
          browserURL: 'https://sepolia.mantlescan.xyz',
        },
      },
      {
        network: 'mantle',
        chainId: 5000,
        urls: {
          apiURL: 'https://api.mantlescan.xyz/api',
          browserURL: 'https://mantlescan.xyz',
        },
      },
    ],
  },
}

export default config
