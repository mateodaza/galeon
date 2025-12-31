import { createConfig } from 'ponder'

import { ERC5564AnnouncerAbi } from './abis/ERC5564Announcer'
import { ERC6538RegistryAbi } from './abis/ERC6538Registry'
import { GaleonRegistryAbi } from './abis/GaleonRegistry'
import { GaleonTenderAbi } from './abis/GaleonTender'

// Contract addresses on Mantle Mainnet (deployed block 89365202)
const ERC5564_ANNOUNCER = (process.env.ERC5564_ANNOUNCER_ADDRESS ||
  '0x8C04238c49e22EB687ad706bEe645698ccF41153') as `0x${string}`
const ERC6538_REGISTRY = (process.env.ERC6538_REGISTRY_ADDRESS ||
  '0xE6586103756082bf3E43D3BB73f9fE479f0BDc22') as `0x${string}`
const GALEON_REGISTRY = (process.env.GALEON_REGISTRY_ADDRESS ||
  '0x85F23B63E2a40ba74cD418063c43cE19bcbB969C') as `0x${string}`
const GALEON_TENDER = (process.env.GALEON_TENDER_ADDRESS ||
  '0x29D52d01947d91e241e9c7A4312F7463199e488c') as `0x${string}`

const START_BLOCK = Number(process.env.START_BLOCK || 89365202)

export default createConfig({
  // Use PostgreSQL - connectionString defaults to DATABASE_URL env var
  database: {
    kind: 'postgres',
  },
  chains: {
    mantle: {
      id: 5000,
      rpc: process.env.PONDER_RPC_URL_5000 || 'https://rpc.mantle.xyz',
    },
  },
  contracts: {
    ERC5564Announcer: {
      abi: ERC5564AnnouncerAbi,
      chain: 'mantle',
      address: ERC5564_ANNOUNCER,
      startBlock: START_BLOCK,
    },
    ERC6538Registry: {
      abi: ERC6538RegistryAbi,
      chain: 'mantle',
      address: ERC6538_REGISTRY,
      startBlock: START_BLOCK,
    },
    GaleonRegistry: {
      abi: GaleonRegistryAbi,
      chain: 'mantle',
      address: GALEON_REGISTRY,
      startBlock: START_BLOCK,
    },
    GaleonTender: {
      abi: GaleonTenderAbi,
      chain: 'mantle',
      address: GALEON_TENDER,
      startBlock: START_BLOCK,
    },
  },
})
