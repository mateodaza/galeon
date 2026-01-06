import { test } from '@japa/runner'
import ComplianceService from '#services/compliance_service'

/**
 * Type definition to access private methods for unit testing
 */
interface ComplianceServiceTestable {
  resolveTokenSymbol(currency: string | null, tokenAddress: string | null): string
  calculateCop(
    amountWei: string | null,
    currency: string | null,
    tokenAddress?: string | null
  ): number
  formatAmount(
    amountWei: string | null,
    currency: string | null,
    tokenAddress?: string | null
  ): string
}

/**
 * Helper to get testable service with private methods exposed
 */
function getTestableService(): ComplianceServiceTestable {
  const service = new ComplianceService()
  return service as unknown as ComplianceServiceTestable
}

test.group('ComplianceService', () => {
  test('resolves ERC20 USDC token correctly', async ({ assert }) => {
    const service = getTestableService()

    // Mantle mainnet USDC
    const symbol = service.resolveTokenSymbol('ERC20', '0x09bc4e0d864854c6afb6eb9a9cdf58ac190d0df9')
    assert.equal(symbol, 'USDC')
  })

  test('resolves ERC20 USDT token correctly', async ({ assert }) => {
    const service = getTestableService()

    // Mantle mainnet USDT
    const symbol = service.resolveTokenSymbol('ERC20', '0x201eba5cc46d216ce6dc03f6a759e8e766e956ae')
    assert.equal(symbol, 'USDT')
  })

  test('returns ERC20 for unknown token addresses', async ({ assert }) => {
    const service = getTestableService()

    // Unknown token address
    const symbol = service.resolveTokenSymbol('ERC20', '0x1234567890123456789012345678901234567890')
    assert.equal(symbol, 'ERC20')
  })

  test('passes through known symbols unchanged', async ({ assert }) => {
    const service = getTestableService()

    assert.equal(service.resolveTokenSymbol('MNT', null), 'MNT')
    assert.equal(service.resolveTokenSymbol('ETH', null), 'ETH')
    assert.equal(service.resolveTokenSymbol('USDC', null), 'USDC')
  })

  test('defaults to MNT for null currency', async ({ assert }) => {
    const service = getTestableService()

    assert.equal(service.resolveTokenSymbol(null, null), 'MNT')
  })

  test('calculates COP correctly for USDC (6 decimals)', async ({ assert }) => {
    const service = getTestableService()

    // 100 USDC = 100_000_000 in 6 decimals
    // Rate: 4000 COP per USDC
    // Expected: 100 * 4000 = 400,000 COP
    const cop = service.calculateCop('100000000', 'USDC', null)
    assert.equal(cop, 400_000)
  })

  test('calculates COP correctly for ERC20 USDC via token address', async ({ assert }) => {
    const service = getTestableService()

    // 100 USDC = 100_000_000 in 6 decimals
    // Currency is 'ERC20' but token address maps to USDC
    const cop = service.calculateCop(
      '100000000',
      'ERC20',
      '0x09bc4e0d864854c6afb6eb9a9cdf58ac190d0df9'
    )
    assert.equal(cop, 400_000)
  })

  test('calculates COP correctly for MNT (18 decimals)', async ({ assert }) => {
    const service = getTestableService()

    // 1 MNT = 10^18 wei
    // Rate: 4000 COP per MNT
    const cop = service.calculateCop('1000000000000000000', 'MNT', null)
    assert.equal(cop, 4_000)
  })

  test('calculates COP correctly for ETH (18 decimals)', async ({ assert }) => {
    const service = getTestableService()

    // 1 ETH = 10^18 wei
    // Rate: 16,000,000 COP per ETH
    const cop = service.calculateCop('1000000000000000000', 'ETH', null)
    assert.equal(cop, 16_000_000)
  })

  test('returns 0 COP for unknown ERC20 tokens', async ({ assert }) => {
    const service = getTestableService()

    // Unknown token address - should return 0
    const cop = service.calculateCop(
      '1000000000000000000',
      'ERC20',
      '0x1234567890123456789012345678901234567890'
    )
    assert.equal(cop, 0)
  })

  test('handles large wei values without precision loss', async ({ assert }) => {
    const service = getTestableService()

    // 1,000,000 USDC = 1_000_000_000_000 in 6 decimals
    // Rate: 4000 COP per USDC
    // Expected: 1,000,000 * 4000 = 4,000,000,000 COP
    const cop = service.calculateCop('1000000000000', 'USDC', null)
    assert.equal(cop, 4_000_000_000)
  })

  test('formats amount correctly for 6 decimal tokens', async ({ assert }) => {
    const service = getTestableService()

    // 123.456789 USDC = 123_456_789 in 6 decimals
    const formatted = service.formatAmount('123456789', 'USDC', null)
    assert.equal(formatted, '123.456789')
  })

  test('formats amount correctly for 18 decimal tokens', async ({ assert }) => {
    const service = getTestableService()

    // 1.5 ETH = 1_500_000_000_000_000_000 in 18 decimals
    const formatted = service.formatAmount('1500000000000000000', 'ETH', null)
    assert.equal(formatted, '1.500000')
  })

  test('UIAF threshold detection works for USDC above threshold', async ({ assert }) => {
    const service = getTestableService()

    // UIAF threshold is 600,000 COP
    // 150 USDC = 600,000 COP (at 4000 COP/USDC)
    // 151 USDC should be above threshold
    const cop151 = service.calculateCop('151000000', 'USDC', null) // 151 USDC
    assert.isAbove(cop151, 600_000)

    const cop150 = service.calculateCop('150000000', 'USDC', null) // 150 USDC
    assert.equal(cop150, 600_000)

    const cop149 = service.calculateCop('149000000', 'USDC', null) // 149 USDC
    assert.isBelow(cop149, 600_000)
  })

  test('UIAF threshold detection works for ERC20 USDC via token address', async ({ assert }) => {
    const service = getTestableService()

    // 151 USDC via ERC20 token address
    const cop = service.calculateCop(
      '151000000',
      'ERC20',
      '0x09bc4e0d864854c6afb6eb9a9cdf58ac190d0df9'
    )
    assert.isAbove(cop, 600_000)
  })
})
