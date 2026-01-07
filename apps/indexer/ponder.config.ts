import { createConfig, factory } from 'ponder'
import { parseAbiItem } from 'viem'

import { ERC5564AnnouncerAbi } from './abis/ERC5564Announcer'
import { ERC6538RegistryAbi } from './abis/ERC6538Registry'
import { GaleonRegistryAbi } from './abis/GaleonRegistry'
import { GaleonEntrypointAbi } from './abis/GaleonEntrypoint'
import { GaleonPrivacyPoolAbi } from './abis/GaleonPrivacyPool'

// Contract addresses on Mantle Mainnet
const ERC5564_ANNOUNCER = (process.env.ERC5564_ANNOUNCER_ADDRESS ||
  '0x8C04238c49e22EB687ad706bEe645698ccF41153') as `0x${string}`
const ERC6538_REGISTRY = (process.env.ERC6538_REGISTRY_ADDRESS ||
  '0xE6586103756082bf3E43D3BB73f9fE479f0BDc22') as `0x${string}`
const GALEON_REGISTRY = (process.env.GALEON_REGISTRY_ADDRESS ||
  '0x9bcDb96a9Ff9b492e07f9E4909DF143266271e9D') as `0x${string}`
// New entrypoint deployed Jan 4, 2026 with MergeDeposit support
const GALEON_ENTRYPOINT = (process.env.GALEON_ENTRYPOINT_ADDRESS ||
  '0x8633518fbbf23E78586F1456530c3452885efb21') as `0x${string}`

// Pool deployment block (new pool deployed around block 91000000)
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
    GaleonEntrypoint: {
      abi: GaleonEntrypointAbi,
      chain: 'mantle',
      address: GALEON_ENTRYPOINT,
      startBlock: START_BLOCK,
    },
    // Dynamic pool indexing: automatically discovers pools via PoolRegistered events
    GaleonPrivacyPool: {
      abi: GaleonPrivacyPoolAbi,
      chain: 'mantle',
      address: factory({
        // The Entrypoint emits PoolRegistered when new pools are added
        address: GALEON_ENTRYPOINT,
        // Event signature from GaleonEntrypoint
        event: parseAbiItem('event PoolRegistered(address _pool, address _asset, uint256 _scope)'),
        // The parameter containing the pool address
        parameter: '_pool',
      }),
      startBlock: START_BLOCK,
    },
  },
})
