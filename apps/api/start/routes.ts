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
const AnnouncementsController = () => import('#controllers/announcements_controller')
const DepositsController = () => import('#controllers/deposits_controller')
const RegistryController = () => import('#controllers/registry_controller')

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

    // Registry routes (protected - verified balance checks)
    router
      .group(() => {
        router.post('/verified-balances', [RegistryController, 'verifiedBalances'])
      })
      .prefix('/registry')
      .use(middleware.auth())
  })
  .prefix('/api/v1')
