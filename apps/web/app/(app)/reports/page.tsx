'use client'

/**
 * Shipwreck Reports Page
 *
 * Generate payment reports for tax compliance and record-keeping.
 * Supports annual, quarterly, monthly, and custom date range reports.
 * Features PDF export for official filing.
 */

import { useState } from 'react'
import { FileText, Download, Calendar, Filter, Ship, AlertCircle, CheckCircle } from 'lucide-react'
import * as m from 'motion/react-m'
import { useReducedMotion } from 'motion/react'
import { AppShell, PageHeader } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  complianceApi,
  type TaxSummaryReport,
  type TaxSummaryParams,
  type PeriodType,
  type Jurisdiction,
} from '@/lib/api'
import { usePorts } from '@/hooks/use-ports'
import { formatUnits } from 'viem'

type ViewMode = 'form' | 'report'

export default function ReportsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('form')
  const [report, setReport] = useState<TaxSummaryReport | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction>('US')
  // Track the selected port filter to pass to PDF download
  const [selectedPortId, setSelectedPortId] = useState<string | undefined>(undefined)

  const handleGenerateReport = async (params: TaxSummaryParams) => {
    // Store portId for PDF download
    setSelectedPortId(params.portId)
    setIsLoading(true)
    setError(null)
    try {
      const data = await complianceApi.getTaxSummary(params)
      setReport(data)
      setViewMode('report')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadPdf = async () => {
    if (!report) return
    setIsLoading(true)
    try {
      const params: TaxSummaryParams = {
        period: report.period.type,
        year: report.period.year,
        quarter: report.period.quarter,
        month: report.period.month,
        startDate: report.period.type === 'custom' ? report.period.startDate : undefined,
        endDate: report.period.type === 'custom' ? report.period.endDate : undefined,
        portId: selectedPortId, // Include port filter in PDF download
        jurisdiction,
      }
      const blob = await complianceApi.getTaxSummaryPdf(params)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `shipwreck-report-${report.period.label.replace(/\s+/g, '-').toLowerCase()}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download PDF')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    setViewMode('form')
    setReport(null)
    setSelectedPortId(undefined)
  }

  return (
    <AppShell requireAuth>
      <PageHeader
        title="Shipwreck Reports"
        description="Payment reports for tax compliance and record-keeping"
      />

      {viewMode === 'form' ? (
        <ReportForm
          onGenerate={handleGenerateReport}
          isLoading={isLoading}
          error={error}
          jurisdiction={jurisdiction}
          onJurisdictionChange={setJurisdiction}
        />
      ) : report ? (
        <ReportView
          report={report}
          onBack={handleBack}
          onDownload={handleDownloadPdf}
          isDownloading={isLoading}
          jurisdiction={jurisdiction}
        />
      ) : null}
    </AppShell>
  )
}

interface ReportFormProps {
  onGenerate: (params: TaxSummaryParams) => void
  isLoading: boolean
  error: string | null
  jurisdiction: Jurisdiction
  onJurisdictionChange: (j: Jurisdiction) => void
}

function ReportForm({
  onGenerate,
  isLoading,
  error,
  jurisdiction,
  onJurisdictionChange,
}: ReportFormProps) {
  const prefersReducedMotion = useReducedMotion()
  const { ports } = usePorts()
  const currentYear = new Date().getFullYear()

  const [periodType, setPeriodType] = useState<PeriodType>('annual')
  const [year, setYear] = useState(currentYear)
  const [quarter, setQuarter] = useState(1)
  const [month, setMonth] = useState(1)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedPort, setSelectedPort] = useState<string>('')

  const fadeInUp = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3 },
      }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const params: TaxSummaryParams = {
      period: periodType,
      year: periodType !== 'custom' ? year : undefined,
      quarter: periodType === 'quarterly' ? quarter : undefined,
      month: periodType === 'monthly' ? month : undefined,
      startDate: periodType === 'custom' ? startDate : undefined,
      endDate: periodType === 'custom' ? endDate : undefined,
      portId: selectedPort || undefined,
      jurisdiction,
    }
    onGenerate(params)
  }

  // Only show 2025 and later (we weren't live before 2025)
  const years = Array.from({ length: currentYear - 2024 }, (_, i) => currentYear - i)
  const quarters = [1, 2, 3, 4]
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]

  return (
    <m.div {...fadeInUp}>
      {/* Info Banner */}
      <Card variant="glass" className="mb-6 border-cyan-500/30 bg-cyan-500/5">
        <CardContent className="flex items-start gap-4 pt-0">
          <Ship className="h-8 w-8 shrink-0 text-cyan-500" />
          <div>
            <h3 className="text-foreground font-semibold">About Shipwreck Reports</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Generate detailed payment reports for your crypto transactions. Reports include token
              breakdowns, transaction history, and estimated fiat values. Export to PDF for tax
              filing or record-keeping.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Form Card */}
      <Card variant="glass">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-lg">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Generate Report</CardTitle>
              <CardDescription>Select the period and filters for your report</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Period Type */}
            <div>
              <label className="text-foreground mb-2 block text-sm font-medium">
                <Calendar className="mr-2 inline h-4 w-4" />
                Report Period
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(['annual', 'quarterly', 'monthly', 'custom'] as PeriodType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setPeriodType(type)}
                    className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                      periodType === type
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {type === 'annual' && 'Annual'}
                    {type === 'quarterly' && 'Quarterly'}
                    {type === 'monthly' && 'Monthly'}
                    {type === 'custom' && 'Custom'}
                  </button>
                ))}
              </div>
            </div>

            {/* Year selector (for annual, quarterly, monthly) */}
            {periodType !== 'custom' && (
              <div>
                <label className="text-foreground mb-2 block text-sm font-medium">Year</label>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="bg-background border-border w-full rounded-lg border px-3 py-2"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Quarter selector */}
            {periodType === 'quarterly' && (
              <div>
                <label className="text-foreground mb-2 block text-sm font-medium">Quarter</label>
                <div className="grid grid-cols-4 gap-2">
                  {quarters.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setQuarter(q)}
                      className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                        quarter === q
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/50 text-muted-foreground'
                      }`}
                    >
                      Q{q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Month selector */}
            {periodType === 'monthly' && (
              <div>
                <label className="text-foreground mb-2 block text-sm font-medium">Month</label>
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="bg-background border-border w-full rounded-lg border px-3 py-2"
                >
                  {months.map((m, i) => (
                    <option key={i} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Custom date range */}
            {periodType === 'custom' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-foreground mb-2 block text-sm font-medium">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-background border-border w-full rounded-lg border px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="text-foreground mb-2 block text-sm font-medium">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-background border-border w-full rounded-lg border px-3 py-2"
                    required
                  />
                </div>
              </div>
            )}

            {/* Jurisdiction selector */}
            <div>
              <label className="text-foreground mb-2 block text-sm font-medium">
                Report Jurisdiction
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onJurisdictionChange('US')}
                  className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                    jurisdiction === 'US'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className="font-medium">United States</div>
                  <div className="text-xs opacity-70">English / USD</div>
                </button>
                <button
                  type="button"
                  onClick={() => onJurisdictionChange('CO')}
                  className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                    jurisdiction === 'CO'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className="font-medium">Colombia</div>
                  <div className="text-xs opacity-70">Spanish / COP</div>
                </button>
              </div>
            </div>

            {/* Port filter */}
            {ports && ports.length > 0 && (
              <div>
                <label className="text-foreground mb-2 block text-sm font-medium">
                  <Filter className="mr-2 inline h-4 w-4" />
                  Filter by Port (optional)
                </label>
                <select
                  value={selectedPort}
                  onChange={(e) => setSelectedPort(e.target.value)}
                  className="bg-background border-border w-full rounded-lg border px-3 py-2"
                >
                  <option value="">All Ports</option>
                  {ports.map((port) => (
                    <option key={port.id} value={port.id}>
                      {port.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-3 text-red-500">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Submit */}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Report
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </m.div>
  )
}

interface ReportViewProps {
  report: TaxSummaryReport
  onBack: () => void
  onDownload: () => void
  isDownloading: boolean
  jurisdiction: Jurisdiction
}

function ReportView({ report, onBack, onDownload, isDownloading, jurisdiction }: ReportViewProps) {
  const prefersReducedMotion = useReducedMotion()

  const fadeInUp = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3 },
      }

  // Format currency based on jurisdiction
  const formatValue = (amount: number) => {
    if (jurisdiction === 'CO') {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
      }).format(amount)
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(amount / 4000)
  }

  const formatToken = (amount: string, decimals: number, symbol: string) => {
    try {
      const formatted = formatUnits(BigInt(amount), decimals)
      const num = parseFloat(formatted)
      return `${num.toLocaleString('en-US', { maximumFractionDigits: 6 })} ${symbol}`
    } catch {
      return `${amount} ${symbol}`
    }
  }

  const shortenAddress = (addr: string | null) =>
    addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '-'

  // Format threshold based on jurisdiction
  const isUSJurisdiction = report.compliance.jurisdiction === 'US'
  const thresholdDisplay = isUSJurisdiction
    ? `$${(report.compliance.uiafThreshold / 4000).toFixed(0)}`
    : formatValue(report.compliance.uiafThreshold)

  return (
    <m.div {...fadeInUp} className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack}>
          Back to Form
        </Button>
        <Button onClick={onDownload} disabled={isDownloading}>
          {isDownloading ? (
            <>
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Downloading...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </>
          )}
        </Button>
      </div>

      {/* Report Header */}
      <Card variant="glass">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-foreground text-xl font-bold">
                Payment Report - {report.period.label}
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Generated: {new Date(report.generatedAt).toLocaleString()}
              </p>
              <p className="text-muted-foreground text-sm">
                Wallet: {shortenAddress(report.user.walletAddress)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground text-sm">Report ID</p>
              <p className="text-foreground font-mono text-xs">{report.reportId.slice(0, 8)}...</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card variant="glass">
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-sm">Received</p>
            <p className="text-foreground mt-1 text-2xl font-bold text-green-500">
              +{formatValue(report.summary.grandTotalReceivedCop)}
            </p>
            <p className="text-muted-foreground text-xs">
              {report.summary.totalTransactions} transaction
              {report.summary.totalTransactions !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-sm">Sent</p>
            <p className="text-foreground mt-1 text-2xl font-bold text-red-500">
              -{formatValue(report.summary.grandTotalSentCop)}
            </p>
            <p className="text-muted-foreground text-xs">
              {report.summary.totalSentTransactions} payment
              {report.summary.totalSentTransactions !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-sm">
              Net Balance ({jurisdiction === 'CO' ? 'COP' : 'USD'})
            </p>
            <p
              className={`text-foreground mt-1 text-2xl font-bold ${report.summary.netBalanceCop >= 0 ? 'text-green-500' : 'text-red-500'}`}
            >
              {report.summary.netBalanceCop >= 0 ? '+' : ''}
              {formatValue(report.summary.netBalanceCop)}
            </p>
          </CardContent>
        </Card>
        <Card
          variant="glass"
          className={
            report.compliance.transactionsAboveThreshold > 0
              ? 'border-amber-500/30'
              : 'border-green-500/30'
          }
        >
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-sm">
              {isUSJurisdiction ? 'Payers' : 'Transactions'} Above {thresholdDisplay}
            </p>
            <div className="mt-1 flex items-center gap-2">
              {report.compliance.transactionsAboveThreshold > 0 ? (
                <AlertCircle className="h-5 w-5 text-amber-500" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              <p className="text-foreground text-2xl font-bold">
                {report.compliance.transactionsAboveThreshold}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Token Breakdown */}
      {report.summary.totalReceivedByToken.length > 0 && (
        <Card variant="glass">
          <CardHeader>
            <CardTitle>Token Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {report.summary.totalReceivedByToken.map((token) => (
                <div
                  key={token.symbol}
                  className="flex items-center justify-between rounded-lg bg-slate-100 p-3 dark:bg-slate-800"
                >
                  <div>
                    <p className="text-foreground font-medium">{token.symbol}</p>
                    <p className="text-muted-foreground text-sm">
                      {token.transactionCount} transaction{token.transactionCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-foreground font-medium">
                      {formatToken(token.totalWei, token.decimals, token.symbol)}
                    </p>
                    <p className="text-muted-foreground text-sm">{formatValue(token.totalCop)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transactions Table */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
          <CardDescription>All payments received during this period</CardDescription>
        </CardHeader>
        <CardContent>
          {report.transactions.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">
              No transactions found for this period
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-border border-b">
                    <th className="text-muted-foreground px-3 py-2 text-left font-medium">Date</th>
                    <th className="text-muted-foreground px-3 py-2 text-left font-medium">Port</th>
                    <th className="text-muted-foreground px-3 py-2 text-left font-medium">From</th>
                    <th className="text-muted-foreground px-3 py-2 text-right font-medium">
                      Amount
                    </th>
                    <th className="text-muted-foreground px-3 py-2 text-right font-medium">
                      Est. {jurisdiction === 'CO' ? 'COP' : 'USD'}
                    </th>
                    <th className="text-muted-foreground px-3 py-2 text-center font-medium">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {report.transactions.map((tx) => (
                    <tr key={tx.id} className="border-border border-b last:border-0">
                      <td className="px-3 py-3">
                        {tx.timestamp ? new Date(tx.timestamp).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-3 py-3">{tx.portName || '-'}</td>
                      <td className="px-3 py-3 font-mono text-xs">
                        {shortenAddress(tx.payerAddress)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono">
                        {tx.amountFormatted} {tx.currency}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {formatValue(tx.amountCop)}
                        {tx.amountCop >= report.compliance.uiafThreshold && (
                          <AlertCircle className="ml-1 inline h-3 w-3 text-amber-500" />
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            tx.status === 'collected'
                              ? 'bg-green-500/10 text-green-500'
                              : tx.status === 'confirmed'
                                ? 'bg-blue-500/10 text-blue-500'
                                : 'bg-amber-500/10 text-amber-500'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sent Payments Table */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Sent Payments</CardTitle>
          <CardDescription>All payments sent during this period</CardDescription>
        </CardHeader>
        <CardContent>
          {report.sentPayments.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">
              No sent payments found for this period
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-border border-b">
                    <th className="text-muted-foreground px-3 py-2 text-left font-medium">Date</th>
                    <th className="text-muted-foreground px-3 py-2 text-left font-medium">To</th>
                    <th className="text-muted-foreground px-3 py-2 text-left font-medium">
                      Source
                    </th>
                    <th className="text-muted-foreground px-3 py-2 text-right font-medium">
                      Amount
                    </th>
                    <th className="text-muted-foreground px-3 py-2 text-right font-medium">
                      Est. {jurisdiction === 'CO' ? 'COP' : 'USD'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {report.sentPayments.map((sp) => (
                    <tr key={sp.id} className="border-border border-b last:border-0">
                      <td className="px-3 py-3">
                        {sp.timestamp ? new Date(sp.timestamp).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-3 py-3 font-mono text-xs">
                        {sp.recipientPortName || shortenAddress(sp.recipientAddress)}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            sp.source === 'wallet'
                              ? 'bg-cyan-500/10 text-cyan-500'
                              : sp.source === 'port'
                                ? 'bg-amber-500/10 text-amber-500'
                                : 'bg-emerald-500/10 text-emerald-500'
                          }`}
                        >
                          {sp.sourceLabel}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-mono">
                        -{sp.amountFormatted} {sp.currency}
                      </td>
                      <td className="px-3 py-3 text-right text-red-500">
                        -{formatValue(sp.amountCop)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Note */}
      <Card variant="glass" className="border-slate-500/20 bg-slate-500/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-slate-500" />
            <div>
              <p className="text-foreground font-medium">Report Information</p>
              <p className="text-muted-foreground mt-1 text-sm">
                USD values are estimates based on hardcoded rates. For tax purposes, consult with a
                tax professional regarding proper valuation methods in your jurisdiction.
              </p>
              <p className="text-muted-foreground mt-2 text-xs">
                Rates source: {report.metadata.rateSource} | Generated by:{' '}
                {report.metadata.generatedBy}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </m.div>
  )
}
