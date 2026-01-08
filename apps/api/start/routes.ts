/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const AuthController = () => import('#controllers/auth_controller')
const PortsController = () => import('#controllers/ports_controller')
const ReceiptsController = () => import('#controllers/receipts_controller')
const CollectionsController = () => import('#controllers/collections_controller')
const ComplianceController = () => import('#controllers/compliance_controller')
const AnnouncementsController = () => import('#controllers/announcements_controller')
const DepositsController = () => import('#controllers/deposits_controller')
const RegistryController = () => import('#controllers/registry_controller')
const AspController = () => import('#controllers/asp_controller')
const PoolRelayController = () => import('#controllers/pool_relay_controller')
const NullifiersController = () => import('#controllers/nullifiers_controller')
const HealthController = () => import('#controllers/health_controller')

// Health check
router.get('/', async () => {
  return { status: 'ok', service: 'galeon-api' }
})

// API v1
router
  .group(() => {
    // Announcements (public - used for payment scanning)
    router.get('/announcements', [AnnouncementsController, 'index'])

    // Pool deposits (public - used for deposit recovery)
    router.get('/deposits', [DepositsController, 'index'])
    router.get('/deposits/merges', [DepositsController, 'merges'])

    // Nullifiers (public - check if a nullifier has been spent)
    router.get('/nullifiers/:hex', [NullifiersController, 'show'])

    // Auth routes (public)
    router
      .group(() => {
        router.get('/nonce', [AuthController, 'getNonce'])
        router.post('/verify', [AuthController, 'verify'])
        router.post('/refresh', [AuthController, 'refresh'])
      })
      .prefix('/auth')

    // Auth routes (protected)
    router
      .group(() => {
        router.post('/logout', [AuthController, 'logout'])
      })
      .prefix('/auth')
      .use(middleware.auth())

    // Ports routes (protected)
    router
      .group(() => {
        router.get('/', [PortsController, 'index'])
        router.post('/', [PortsController, 'store'])
        router.post('/sync', [PortsController, 'sync'])
        router.get('/:id', [PortsController, 'show'])
        router.patch('/:id', [PortsController, 'update'])
        router.delete('/:id', [PortsController, 'destroy'])
      })
      .prefix('/ports')
      .use(middleware.auth())

    // Receipts routes (protected)
    router
      .group(() => {
        router.get('/', [ReceiptsController, 'index'])
        router.post('/', [ReceiptsController, 'store'])
        router.get('/stats', [ReceiptsController, 'stats'])
        router.post('/mark-collected', [ReceiptsController, 'markCollected'])
        router.post('/recalculate-totals', [ReceiptsController, 'recalculateTotals'])
        router.get('/:id', [ReceiptsController, 'show'])
      })
      .prefix('/receipts')
      .use(middleware.auth())

    // Collections routes (protected)
    router
      .group(() => {
        router.get('/', [CollectionsController, 'index'])
        router.post('/', [CollectionsController, 'store'])
        router.get('/:id', [CollectionsController, 'show'])
        router.post('/:id/execute', [CollectionsController, 'execute'])
      })
      .prefix('/collections')
      .use(middleware.auth())

    // Compliance routes (protected)
    router
      .group(() => {
        router.get('/tax-summary', [ComplianceController, 'taxSummary'])
        router.get('/tax-summary/pdf', [ComplianceController, 'taxSummaryPdf'])
      })
      .prefix('/compliance')
      .use(middleware.auth())
    // Registry routes (protected - verified balance checks)
    router
      .group(() => {
        router.post('/verified-balances', [RegistryController, 'verifiedBalances'])
      })
      .prefix('/registry')
      .use(middleware.auth())

    // ASP routes (public - needed for withdrawal proofs)
    router
      .group(() => {
        router.get('/status', [AspController, 'status'])
        router.get('/proof/:label', [AspController, 'proof'])
        router.post('/rebuild', [AspController, 'rebuild'])
      })
      .prefix('/asp')

    // Pool Relayer routes (public - privacy pool withdrawal relay)
    router
      .group(() => {
        router.get('/status', [PoolRelayController, 'status'])
        router.get('/details', [PoolRelayController, 'details'])
        router.post('/quote', [PoolRelayController, 'quote'])
        router.post('/request', [PoolRelayController, 'request'])
      })
      .prefix('/relayer')

    // Health routes (public - sync status and pre-flight checks)
    router
      .group(() => {
        router.get('/status', [HealthController, 'status'])
        router.get('/preflight/:operation', [HealthController, 'preflight'])
        router.get('/indexer', [HealthController, 'indexer'])
      })
      .prefix('/health')
  })
  .prefix('/api/v1')
