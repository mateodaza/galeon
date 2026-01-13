import Port from '#models/port'
import Receipt from '#models/receipt'
import SentPayment from '#models/sent_payment'
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
 * UIAF Resolution 314 threshold: ~$150 USD (Colombia)
 */
const UIAF_THRESHOLD_COP = 600_000

/**
 * IRS reporting threshold: $600 USD (US)
 * Note: 1099-K threshold for payment processors
 */
const IRS_THRESHOLD_USD = 600
const USD_TO_COP = 4_000 // Hardcoded rate for conversion
const IRS_THRESHOLD_COP = IRS_THRESHOLD_USD * USD_TO_COP // 2,400,000 COP

type PeriodType = 'annual' | 'quarterly' | 'monthly' | 'custom'
type Jurisdiction = 'US' | 'CO'

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

interface SentPaymentDetail {
  id: string
  recipientAddress: string
  recipientPortName: string | null
  amount: string
  amountFormatted: string
  amountCop: number
  currency: string
  tokenAddress: string | null
  source: 'wallet' | 'port' | 'pool'
  sourceLabel: string
  txHash: string
  chainId: number
  timestamp: string | null
  status: string
  memo: string | null
}

export interface TaxSummaryReport {
  reportId: string
  reportType: string
  generatedAt: string
  period: PeriodInfo
  user: { walletAddress: string }
  ports: PortSummary[]
  transactions: TransactionDetail[]
  sentPayments: SentPaymentDetail[]
  summary: {
    totalTransactions: number
    totalReceivedByToken: TokenSummary[]
    grandTotalReceivedCop: number
    totalSentTransactions: number
    totalSentByToken: TokenSummary[]
    grandTotalSentCop: number
    netBalanceCop: number
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
   * Calculate date range from period parameters with locale support
   */
  private calculatePeriod(params: PeriodParams, jurisdiction: Jurisdiction = 'US'): PeriodInfo {
    const { period, year, quarter, month, startDate, endDate } = params

    // Month names for each jurisdiction
    const monthNamesEN = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ]
    const monthNamesES = [
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
    const monthNames = jurisdiction === 'CO' ? monthNamesES : monthNamesEN

    switch (period) {
      case 'annual': {
        if (!year) throw new Error('Year is required for annual period')
        return {
          type: 'annual',
          year,
          startDate: `${year}-01-01`,
          endDate: `${year}-12-31`,
          label: jurisdiction === 'CO' ? `Año ${year}` : `Year ${year}`,
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
          label: jurisdiction === 'CO' ? `${startDate} a ${endDate}` : `${startDate} to ${endDate}`,
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
    portId?: string,
    jurisdiction: Jurisdiction = 'US'
  ): Promise<TaxSummaryReport> {
    const user = await User.findOrFail(userId)
    const periodInfo = this.calculatePeriod(params, jurisdiction)

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
      .whereNotNull('amount')
      .whereNot('amount', '0') // Filter out 0-value receipts (ghost registrations)
      .preload('port')

    // Get sent payments for the period - only confirmed payments for tax compliance
    // Pending payments haven't been verified on-chain and shouldn't be included in totals
    const sentPayments = await SentPayment.query()
      .where('userId', userId)
      .where('createdAt', '>=', startDate)
      .where('createdAt', '<=', endDate)
      .where('status', 'confirmed')
      .orderBy('createdAt', 'desc')

    // Calculate totals by token for received payments
    const byTokenReceived = this.aggregateByToken(receipts)
    const grandTotalReceivedCop = byTokenReceived.reduce((sum, t) => sum + t.totalCop, 0)

    // Calculate totals by token for sent payments
    const byTokenSent = this.aggregateSentByToken(sentPayments)
    const grandTotalSentCop = byTokenSent.reduce((sum, t) => sum + t.totalCop, 0)

    // Net balance = received - sent
    const netBalanceCop = grandTotalReceivedCop - grandTotalSentCop

    // Calculate transactions/payers above threshold based on jurisdiction
    // CO: Per-transaction threshold (UIAF Resolution 314)
    // US: Aggregate per-payer threshold (IRS 1099-K)
    const aboveThreshold =
      jurisdiction === 'CO'
        ? this.countTransactionsAboveThreshold(receipts, UIAF_THRESHOLD_COP)
        : this.countPayersAboveThreshold(receipts, IRS_THRESHOLD_COP)

    // Calculate port totals for this period only
    const portTotals = this.calculatePortTotals(receipts)

    // Map source to human-readable label
    const sourceLabels: Record<string, string> = {
      wallet: 'Quick Pay',
      port: 'Stealth Pay',
      pool: 'Private Send',
    }

    // Build jurisdiction-specific compliance info
    const complianceInfo = this.buildComplianceInfo(jurisdiction, aboveThreshold)

    return {
      reportId: crypto.randomUUID(),
      reportType: jurisdiction === 'CO' ? 'tax_summary_co' : 'tax_summary_us',
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
      sentPayments: sentPayments.map((s) => ({
        id: s.id,
        recipientAddress: s.recipientAddress,
        recipientPortName: s.recipientPortName,
        amount: s.amount,
        amountFormatted: this.formatAmount(s.amount, s.currency, s.tokenAddress),
        amountCop: this.calculateCop(s.amount, s.currency, s.tokenAddress),
        currency: s.currency,
        tokenAddress: s.tokenAddress,
        source: s.source,
        sourceLabel: sourceLabels[s.source] || s.source,
        txHash: s.txHash,
        chainId: s.chainId,
        timestamp: s.createdAt?.toISO() || null,
        status: s.status,
        memo: s.memo,
      })),
      summary: {
        totalTransactions: receipts.length,
        totalReceivedByToken: byTokenReceived,
        grandTotalReceivedCop,
        totalSentTransactions: sentPayments.length,
        totalSentByToken: byTokenSent,
        grandTotalSentCop,
        netBalanceCop,
      },
      compliance: complianceInfo,
      metadata: {
        ratesUsed: RATES_COP,
        rateSource: 'hardcoded_mvp',
        generatedBy: 'galeon-api',
      },
    }
  }

  /**
   * Build jurisdiction-specific compliance information
   */
  private buildComplianceInfo(
    jurisdiction: Jurisdiction,
    transactionsAboveThreshold: number
  ): TaxSummaryReport['compliance'] {
    if (jurisdiction === 'CO') {
      return {
        jurisdiction: 'CO',
        uiafThreshold: UIAF_THRESHOLD_COP,
        transactionsAboveThreshold,
        note: 'Transactions above 600,000 COP (~$150 USD) may require UIAF reporting per Resolution 314',
      }
    }

    // US jurisdiction - note: transactionsAboveThreshold represents PAYERS above threshold
    return {
      jurisdiction: 'US',
      uiafThreshold: IRS_THRESHOLD_COP, // Convert to COP for consistent API
      transactionsAboveThreshold, // For US: counts payers, not individual transactions
      note: 'Counts unique payers whose aggregate payments exceed $600 USD (1099-K threshold)',
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
   * Count individual transactions above threshold (for CO/UIAF reporting)
   */
  private countTransactionsAboveThreshold(receipts: Receipt[], thresholdCop: number): number {
    return receipts.filter(
      (r) => this.calculateCop(r.amount, r.currency, r.tokenAddress) >= thresholdCop
    ).length
  }

  /**
   * Count unique payers whose aggregate payments exceed threshold (for US/1099-K reporting)
   * Aggregates all payments from each payer address and counts those above threshold
   */
  private countPayersAboveThreshold(receipts: Receipt[], thresholdCop: number): number {
    // Aggregate payments by payer address
    const payerTotals = new Map<string, number>()

    for (const r of receipts) {
      const payer = r.payerAddress?.toLowerCase() || 'unknown'
      const amountCop = this.calculateCop(r.amount, r.currency, r.tokenAddress)
      const current = payerTotals.get(payer) || 0
      payerTotals.set(payer, current + amountCop)
    }

    // Count payers above threshold
    let count = 0
    for (const total of payerTotals.values()) {
      if (total >= thresholdCop) {
        count++
      }
    }

    return count
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

  /**
   * Aggregate sent payments by token
   */
  private aggregateSentByToken(sentPayments: SentPayment[]): TokenSummary[] {
    const tokenMap = new Map<
      string,
      { total: bigint; count: number; tokenAddress: string | null }
    >()

    for (const s of sentPayments) {
      const symbol = this.resolveTokenSymbol(s.currency, s.tokenAddress)
      const current = tokenMap.get(symbol) || { total: 0n, count: 0, tokenAddress: null }
      tokenMap.set(symbol, {
        total: current.total + BigInt(s.amount || '0'),
        count: current.count + 1,
        tokenAddress: s.tokenAddress || current.tokenAddress,
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
