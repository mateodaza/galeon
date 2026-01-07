import Port from '#models/port'
import Receipt from '#models/receipt'
import User from '#models/user'

/**
 * Hardcoded rates for MVP (COP per 1 token unit)
 * TODO: Replace with PriceOracleService post-hackathon
 */
const RATES_COP: Record<string, number> = {
  MNT: 4_000, // ~$1 USD * 4000 COP/USD
  ETH: 16_000_000, // ~$4000 USD * 4000 COP/USD
  USDC: 4_000, // $1 USD * 4000 COP/USD
  USDT: 4_000, // $1 USD * 4000 COP/USD
}

/**
 * Known ERC20 token addresses to symbol mapping
 * Used when currency is 'ERC20' to look up actual token
 */
const TOKEN_ADDRESS_TO_SYMBOL: Record<string, string> = {
  // Mantle mainnet (chainId: 5000)
  '0x09bc4e0d864854c6afb6eb9a9cdf58ac190d0df9': 'USDC', // USDC on Mantle
  '0x201eba5cc46d216ce6dc03f6a759e8e766e956ae': 'USDT', // USDT on Mantle
  // Mantle Sepolia testnet (chainId: 5003)
  '0x0000000000000000000000000000000000000000': 'MNT', // Native token placeholder
}

/**
 * UIAF Resolution 314 threshold: ~$150 USD
 */
const UIAF_THRESHOLD_COP = 600_000

type PeriodType = 'annual' | 'quarterly' | 'monthly' | 'custom'

export interface PeriodParams {
  period: PeriodType
  year?: number
  quarter?: number // 1-4
  month?: number // 1-12
  startDate?: string // ISO 8601 (YYYY-MM-DD)
  endDate?: string // ISO 8601 (YYYY-MM-DD)
}

interface PeriodInfo {
  type: PeriodType
  year?: number
  quarter?: number
  month?: number
  startDate: string
  endDate: string
  label: string
}

interface TokenSummary {
  token: string
  symbol: string
  decimals: number
  totalWei: string
  totalFormatted: string
  totalCop: number
  transactionCount: number
  rateCop: number
}

interface PortSummary {
  portId: string
  portName: string
  type: string
  chainId: number
  totalReceived: string
  totalReceivedCop: number
  transactionCount: number
  status: string
}

interface TransactionDetail {
  id: string
  portId: string
  portName: string | undefined
  receiptHash: string | null
  stealthAddress: string | null
  payerAddress: string | null
  amount: string | null
  amountFormatted: string
  amountCop: number
  currency: string | null
  tokenAddress: string | null
  txHash: string
  blockNumber: string | null
  timestamp: string | null
  status: string
}

export interface TaxSummaryReport {
  reportId: string
  reportType: string
  generatedAt: string
  period: PeriodInfo
  user: { walletAddress: string }
  ports: PortSummary[]
  transactions: TransactionDetail[]
  summary: {
    totalTransactions: number
    totalReceivedByToken: TokenSummary[]
    grandTotalCop: number
  }
  compliance: {
    jurisdiction: string
    uiafThreshold: number
    transactionsAboveThreshold: number
    note: string
  }
  metadata: {
    ratesUsed: Record<string, number>
    rateSource: string
    generatedBy: string
  }
}

export default class ComplianceService {
  /**
   * Calculate date range from period parameters
   */
  private calculatePeriod(params: PeriodParams): PeriodInfo {
    const { period, year, quarter, month, startDate, endDate } = params

    switch (period) {
      case 'annual': {
        if (!year) throw new Error('Year is required for annual period')
        return {
          type: 'annual',
          year,
          startDate: `${year}-01-01`,
          endDate: `${year}-12-31`,
          label: `Año ${year}`,
        }
      }

      case 'quarterly': {
        if (!year || !quarter) throw new Error('Year and quarter are required')
        if (quarter < 1 || quarter > 4) throw new Error('Quarter must be 1-4')
        const quarterStartMonth = (quarter - 1) * 3 + 1
        const quarterEndMonth = quarter * 3
        const lastDay = new Date(year, quarterEndMonth, 0).getDate()
        return {
          type: 'quarterly',
          year,
          quarter,
          startDate: `${year}-${String(quarterStartMonth).padStart(2, '0')}-01`,
          endDate: `${year}-${String(quarterEndMonth).padStart(2, '0')}-${lastDay}`,
          label: `Q${quarter} ${year}`,
        }
      }

      case 'monthly': {
        if (!year || !month) throw new Error('Year and month are required')
        if (month < 1 || month > 12) throw new Error('Month must be 1-12')
        const lastDay = new Date(year, month, 0).getDate()
        const monthNames = [
          'Ene',
          'Feb',
          'Mar',
          'Abr',
          'May',
          'Jun',
          'Jul',
          'Ago',
          'Sep',
          'Oct',
          'Nov',
          'Dic',
        ]
        return {
          type: 'monthly',
          year,
          month,
          startDate: `${year}-${String(month).padStart(2, '0')}-01`,
          endDate: `${year}-${String(month).padStart(2, '0')}-${lastDay}`,
          label: `${monthNames[month - 1]} ${year}`,
        }
      }

      case 'custom': {
        if (!startDate || !endDate)
          throw new Error('startDate and endDate required for custom period')
        return {
          type: 'custom',
          startDate,
          endDate,
          label: `${startDate} a ${endDate}`,
        }
      }

      default:
        throw new Error(`Invalid period type: ${period}`)
    }
  }

  /**
   * Generate a tax summary report for a user
   */
  async generateTaxSummary(
    userId: number,
    params: PeriodParams,
    portId?: string
  ): Promise<TaxSummaryReport> {
    const user = await User.findOrFail(userId)
    const periodInfo = this.calculatePeriod(params)

    // Get user's ports
    let portsQuery = Port.query().where('userId', userId)
    if (portId) {
      portsQuery = portsQuery.where('id', portId)
    }
    const ports = await portsQuery

    // Get receipts for the period
    const startDate = new Date(`${periodInfo.startDate}T00:00:00`)
    const endDate = new Date(`${periodInfo.endDate}T23:59:59`)

    const receipts = await Receipt.query()
      .whereIn(
        'portId',
        ports.map((p) => p.id)
      )
      .where('createdAt', '>=', startDate)
      .where('createdAt', '<=', endDate)
      .whereIn('status', ['confirmed', 'collected'])
      .preload('port')

    // Calculate totals by token
    const byToken = this.aggregateByToken(receipts)
    const grandTotalCop = byToken.reduce((sum, t) => sum + t.totalCop, 0)
    const aboveThreshold = receipts.filter(
      (r) => this.calculateCop(r.amount, r.currency, r.tokenAddress) >= UIAF_THRESHOLD_COP
    ).length

    // Calculate port totals for this period only
    const portTotals = this.calculatePortTotals(receipts)

    return {
      reportId: crypto.randomUUID(),
      reportType: 'tax_summary_co',
      generatedAt: new Date().toISOString(),
      period: periodInfo,
      user: { walletAddress: user.walletAddress },
      ports: ports.map((p) => ({
        portId: p.id,
        portName: p.name,
        type: p.type,
        chainId: p.chainId,
        totalReceived: portTotals.get(p.id)?.total.toString() || '0',
        totalReceivedCop: portTotals.get(p.id)?.cop || 0,
        transactionCount: portTotals.get(p.id)?.count || 0,
        status: p.active ? 'active' : 'inactive',
      })),
      transactions: receipts.map((r) => ({
        id: r.id,
        portId: r.portId,
        portName: r.port?.name,
        receiptHash: r.receiptHash,
        stealthAddress: r.stealthAddress,
        payerAddress: r.payerAddress,
        amount: r.amount,
        amountFormatted: this.formatAmount(r.amount, r.currency, r.tokenAddress),
        amountCop: this.calculateCop(r.amount, r.currency, r.tokenAddress),
        currency: this.resolveTokenSymbol(r.currency, r.tokenAddress),
        tokenAddress: r.tokenAddress,
        txHash: r.txHash,
        blockNumber: r.blockNumber,
        timestamp: r.createdAt?.toISO() || null,
        status: r.status,
      })),
      summary: {
        totalTransactions: receipts.length,
        totalReceivedByToken: byToken,
        grandTotalCop,
      },
      compliance: {
        jurisdiction: 'CO',
        uiafThreshold: UIAF_THRESHOLD_COP,
        transactionsAboveThreshold: aboveThreshold,
        note: 'Transactions above 600,000 COP (~$150 USD) may require UIAF reporting',
      },
      metadata: {
        ratesUsed: RATES_COP,
        rateSource: 'hardcoded_mvp',
        generatedBy: 'galeon-api',
      },
    }
  }

  /**
   * Calculate port totals for a given set of receipts
   */
  private calculatePortTotals(receipts: Receipt[]) {
    const portMap = new Map<string, { total: bigint; cop: number; count: number }>()

    for (const r of receipts) {
      const current = portMap.get(r.portId) || { total: 0n, cop: 0, count: 0 }
      const amountCop = this.calculateCop(r.amount, r.currency, r.tokenAddress)
      portMap.set(r.portId, {
        total: current.total + BigInt(r.amount || '0'),
        cop: current.cop + amountCop,
        count: current.count + 1,
      })
    }

    return portMap
  }

  /**
   * Resolve the actual token symbol from currency and tokenAddress
   * Handles 'ERC20' currency by looking up known token addresses
   */
  private resolveTokenSymbol(currency: string | null, tokenAddress: string | null): string {
    if (!currency) return 'MNT' // Default to native token

    // If currency is already a known symbol, use it
    if (currency !== 'ERC20') {
      return currency.toUpperCase()
    }

    // For ERC20, look up by token address
    if (tokenAddress) {
      const symbol = TOKEN_ADDRESS_TO_SYMBOL[tokenAddress.toLowerCase()]
      if (symbol) return symbol
    }

    // Unknown ERC20 token - return as-is (will get 0 rate)
    return 'ERC20'
  }

  /**
   * Convert token amount (wei) to COP using hardcoded rates
   * Uses BigInt for precision with large wei values
   */
  private calculateCop(
    amountWei: string | null,
    currency: string | null,
    tokenAddress: string | null = null
  ): number {
    if (!amountWei) return 0

    const symbol = this.resolveTokenSymbol(currency, tokenAddress)
    const rate = RATES_COP[symbol] || 0
    if (rate === 0) return 0

    const decimals = this.getTokenDecimals(symbol)

    // Use BigInt math to avoid precision loss with large values
    // COP = (amountWei * rate) / 10^decimals
    const amountBigInt = BigInt(amountWei)
    const rateBigInt = BigInt(rate)
    const divisor = BigInt(10 ** decimals)

    // Result in COP (integer)
    return Number((amountBigInt * rateBigInt) / divisor)
  }

  /**
   * Format token amount from wei to human readable
   */
  private formatAmount(
    amountWei: string | null,
    currency: string | null,
    tokenAddress: string | null = null
  ): string {
    if (!amountWei) return '0'
    const symbol = this.resolveTokenSymbol(currency, tokenAddress)
    const decimals = this.getTokenDecimals(symbol)

    // Use BigInt for precision, then convert to decimal string
    const amountBigInt = BigInt(amountWei)
    const divisor = BigInt(10 ** decimals)
    const wholePart = amountBigInt / divisor
    const fractionalPart = amountBigInt % divisor

    // Format with 6 decimal places
    const fractionalStr = fractionalPart.toString().padStart(decimals, '0').slice(0, 6)
    return `${wholePart}.${fractionalStr}`
  }

  /**
   * Get token decimals (6 for stablecoins, 18 for native)
   */
  private getTokenDecimals(symbol: string | null): number {
    if (!symbol) return 18
    const upper = symbol.toUpperCase()
    return upper === 'USDC' || upper === 'USDT' ? 6 : 18
  }

  /**
   * Aggregate receipts by token
   * Resolves ERC20 tokens to their actual symbols when possible
   */
  private aggregateByToken(receipts: Receipt[]): TokenSummary[] {
    const tokenMap = new Map<
      string,
      { total: bigint; count: number; tokenAddress: string | null }
    >()

    for (const r of receipts) {
      // Resolve the actual token symbol (handles ERC20 -> USDC/USDT)
      const symbol = this.resolveTokenSymbol(r.currency, r.tokenAddress)
      const current = tokenMap.get(symbol) || { total: 0n, count: 0, tokenAddress: null }
      tokenMap.set(symbol, {
        total: current.total + BigInt(r.amount || '0'),
        count: current.count + 1,
        tokenAddress: r.tokenAddress || current.tokenAddress,
      })
    }

    return Array.from(tokenMap.entries()).map(([symbol, data]) => ({
      token: symbol,
      symbol: symbol,
      decimals: this.getTokenDecimals(symbol),
      totalWei: data.total.toString(),
      totalFormatted: this.formatAmount(data.total.toString(), symbol, data.tokenAddress),
      totalCop: this.calculateCop(data.total.toString(), symbol, data.tokenAddress),
      transactionCount: data.count,
      rateCop: RATES_COP[symbol] || 0,
    }))
  }
}
