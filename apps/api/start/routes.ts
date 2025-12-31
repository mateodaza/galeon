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
const FogPaymentsController = () => import('#controllers/fog_payments_controller')

// Health check
router.get('/', async () => {
  return { status: 'ok', service: 'galeon-api' }
})

// API v1
router
  .group(() => {
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

    // Fog Payments routes (protected)
    router
      .group(() => {
        router.get('/', [FogPaymentsController, 'index'])
        router.post('/', [FogPaymentsController, 'store'])
        router.get('/:id', [FogPaymentsController, 'show'])
        router.post('/:id/cancel', [FogPaymentsController, 'cancel'])
        router.patch('/:id/funding', [FogPaymentsController, 'updateFunding'])
        router.get('/:id/hop-chain', [FogPaymentsController, 'hopChain'])
      })
      .prefix('/fog-payments')
      .use(middleware.auth())
  })
  .prefix('/api/v1')
