import { BaseCommand, args, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'
import Port from '#models/port'
import User from '#models/user'

/**
 * Sync Ports Command
 *
 * One-time sync to import existing on-chain port registrations from Ponder
 * indexer into the API database. This is useful when:
 * - Initial deployment with existing on-chain ports
 * - Recovery after database reset
 * - Manual sync if scheduled jobs missed ports
 *
 * Usage:
 *   node ace sync:ports                    # Sync all ports
 *   node ace sync:ports --dry-run          # Preview without changes
 *   node ace sync:ports --chain-id=5003    # Sync specific chain
 */
export default class SyncPorts extends BaseCommand {
  static commandName = 'sync:ports'
  static description = 'Sync on-chain port registrations from Ponder indexer to API database'

  static options: CommandOptions = {
    startApp: true,
  }

  @flags.boolean({ description: 'Preview changes without modifying database' })
  declare dryRun: boolean

  @flags.number({ description: 'Filter by chain ID' })
  declare chainId: number

  @args.string({ description: 'Optional wallet address to sync ports for', required: false })
  declare walletAddress: string

  async run() {
    this.logger.info('Starting port sync from Ponder indexer...')

    try {
      // Query all ports from Ponder
      const query = db.connection('ponder').from('ports').orderBy('block_number', 'asc')

      if (this.chainId) {
        query.where('chain_id', this.chainId)
        this.logger.info(`Filtering by chain ID: ${this.chainId}`)
      }

      if (this.walletAddress) {
        query.where('owner', this.walletAddress.toLowerCase())
        this.logger.info(`Filtering by wallet: ${this.walletAddress}`)
      }

      const ponderPorts = await query

      this.logger.info(`Found ${ponderPorts.length} ports in Ponder indexer`)

      if (ponderPorts.length === 0) {
        this.logger.warning('No ports found in Ponder indexer')
        return
      }

      let synced = 0
      let skipped = 0
      let noUser = 0

      for (const ponderPort of ponderPorts) {
        const portId = String(ponderPort.id)
        const owner = String(ponderPort.owner).toLowerCase()
        const name = String(ponderPort.name)
        const stealthMetaAddress = String(ponderPort.stealth_meta_address)
        const txHash = String(ponderPort.transaction_hash)
        const chainId = Number(ponderPort.chain_id)

        // Check if port already exists in API database
        const existingPort = await Port.query()
          .where('indexerPortId', portId)
          .orWhere('txHash', txHash)
          .first()

        if (existingPort) {
          this.logger.debug(`Port ${portId} already exists, skipping`)
          skipped++
          continue
        }

        // Find user by wallet address
        const user = await User.query().where('walletAddress', owner).first()

        if (!user) {
          this.logger.warning(`No user found for wallet ${owner}, port ${name} (${portId})`)
          noUser++
          continue
        }

        if (this.dryRun) {
          this.logger.info(`[DRY RUN] Would sync port: ${name} (${portId}) for user ${user.id}`)
          synced++
          continue
        }

        // Create port in API database
        await Port.create({
          userId: user.id,
          indexerPortId: portId,
          name: name,
          type: 'permanent', // Default type for imported ports
          stealthMetaAddress: stealthMetaAddress,
          viewingKeyEncrypted: null, // User needs to re-register viewing key
          status: 'confirmed', // Already on-chain
          txHash: txHash,
          chainId: chainId,
          verificationAttempts: 0,
          verificationError: null,
          active: Boolean(ponderPort.active),
          archived: false,
          totalReceived: '0',
          totalCollected: '0',
          paymentCount: 0,
        })

        this.logger.info(`Synced port: ${name} (${portId}) for user ${user.id}`)
        synced++
      }

      this.logger.info('---')
      this.logger.info(`Sync complete:`)
      this.logger.info(`  - Synced: ${synced}`)
      this.logger.info(`  - Skipped (already exists): ${skipped}`)
      this.logger.info(`  - No user found: ${noUser}`)

      if (this.dryRun) {
        this.logger.warning('This was a dry run. No changes were made.')
      }

      if (noUser > 0) {
        this.logger.warning(
          `${noUser} ports could not be synced because their owners are not registered users.`
        )
        this.logger.warning(
          'These users need to sign in with SIWE first, then you can re-run this command.'
        )
      }
    } catch (error) {
      this.logger.error(`Sync failed: ${error}`)
      throw error
    }
  }
}
