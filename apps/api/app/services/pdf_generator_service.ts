// @ts-expect-error - pdfmake has complex module structure in v0.3.0
import printerModule from 'pdfmake/js/Printer.js'
import pdfmakeSingleton from 'pdfmake'
// @ts-expect-error - standard fonts module
import helveticaFonts from 'pdfmake/build/standard-fonts/Helvetica.js'
import type { TaxSummaryReport } from '#services/compliance_service'

// pdfmake 0.3.0 has double-wrapped exports
const PdfPrinter = printerModule.default
const pdfmake = pdfmakeSingleton as unknown as {
  virtualfs: { writeFileSync: (path: string, data: string) => void }
  urlResolver: () => unknown
}

// pdfmake type definitions
// Using inline types since pdfmake/interfaces may not resolve in pnpm monorepo
type Size = number | 'auto' | '*' | string
type Margins = number | [number, number] | [number, number, number, number]
type Alignment = 'left' | 'right' | 'center' | 'justify'

interface Style {
  fontSize?: number
  bold?: boolean
  italics?: boolean
  color?: string
  fillColor?: string
  alignment?: Alignment
  margin?: Margins
}

interface StyleDictionary {
  [name: string]: Style
}

interface TableCell {
  text?: string
  style?: string
  alignment?: Alignment
  colSpan?: number
  border?: [boolean, boolean, boolean, boolean]
}

interface TableLayout {
  hLineWidth?: (i: number, node: unknown) => number
  vLineWidth?: (i: number, node: unknown) => number
  hLineColor?: (i: number, node: unknown) => string
  paddingTop?: (i: number, node: unknown) => number
  paddingBottom?: (i: number, node: unknown) => number
}

interface Table {
  headerRows?: number
  widths?: Size[]
  body: TableCell[][]
}

interface Canvas {
  type: string
  x1: number
  y1: number
  x2: number
  y2: number
  lineWidth: number
  lineColor: string
}

interface ContentTable {
  table: Table
  layout?: TableLayout | string
  margin?: Margins
}

interface ContentText {
  text: string
  style?: string | Style
  alignment?: Alignment
  margin?: Margins
  bold?: boolean
}

interface ContentCanvas {
  canvas: Canvas[]
  margin?: Margins
}

interface ContentColumns {
  columns: ContentText[]
  margin?: Margins
}

type Content = string | ContentText | ContentTable | ContentCanvas | ContentColumns | Content[]

type DynamicContent = () => Content

interface TDocumentDefinitions {
  pageSize?: string
  pageMargins?: Margins
  header?: DynamicContent | Content
  footer?: DynamicContent | Content
  content: Content
  styles?: StyleDictionary
  defaultStyle?: { font?: string }
}

// Flag to track if fonts have been registered
let fontsRegistered = false

type Jurisdiction = 'US' | 'CO'

// Locale strings interface
interface LocaleStrings {
  title: string
  period: string
  summaryByToken: string
  token: string
  amount: string
  estValue: string
  txs: string
  total: string
  ports: string
  name: string
  type: string
  status: string
  transactions: string
  date: string
  port: string
  payer: string
  complianceNotes: string
  jurisdiction: string
  reportingThreshold: string
  txsAboveThreshold: string
  footer: string
  noTxs: string
  moreTransactions: (n: number) => string
  reportInfo: string
  rateSource: string
  ratesUsed: string
  generatedBy: string
  disclaimerNote: string
  // Sent payments
  sentPayments: string
  receivedSummary: string
  sentSummary: string
  recipient: string
  source: string
  netBalance: string
  noSentPayments: string
  moreSentPayments: (n: number) => string
}

/**
 * Register standard Helvetica fonts in pdfmake virtual file system
 */
function registerFonts(): void {
  if (fontsRegistered) return

  // Register font files in virtual file system
  for (const [path, fileData] of Object.entries(
    helveticaFonts.vfs as Record<string, { data: string }>
  )) {
    pdfmake.virtualfs.writeFileSync(path, fileData.data)
  }

  fontsRegistered = true
}

/**
 * Format currency based on jurisdiction
 */
function formatCurrency(amount: number, jurisdiction: Jurisdiction): string {
  if (jurisdiction === 'CO') {
    // COP format
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }
  // USD format - convert from COP-equivalent (~4000 COP = 1 USD)
  const usdAmount = amount / 4000
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(usdAmount)
}

/**
 * Format date for display based on jurisdiction
 */
function formatDate(dateStr: string | null, jurisdiction: Jurisdiction = 'US'): string {
  if (!dateStr) return '-'
  try {
    const locale = jurisdiction === 'CO' ? 'es-CO' : 'en-US'
    return new Date(dateStr).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

/**
 * Truncate wallet address for display
 */
function truncateAddress(address: string | null): string {
  if (!address) return '-'
  if (address.length <= 14) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export default class PdfGeneratorService {
  private printer: InstanceType<typeof PdfPrinter>

  constructor() {
    // Register fonts on first use
    registerFonts()

    // Create printer with Helvetica fonts and pdfmake's virtual file system
    this.printer = new PdfPrinter(helveticaFonts.fonts, pdfmake.virtualfs, pdfmake.urlResolver())
  }

  /**
   * Generate PDF buffer from tax summary report
   */
  async generateTaxSummaryPdf(
    report: TaxSummaryReport,
    jurisdiction: Jurisdiction = 'US'
  ): Promise<Buffer> {
    const docDefinition = this.buildDocumentDefinition(report, jurisdiction)
    return this.createPdfBuffer(docDefinition)
  }

  /**
   * Build the PDF document definition
   */
  private buildDocumentDefinition(
    report: TaxSummaryReport,
    jurisdiction: Jurisdiction
  ): TDocumentDefinitions {
    const styles: StyleDictionary = {
      title: { fontSize: 18, bold: true, color: '#1a1a1a' },
      subtitle: { fontSize: 12, color: '#666666' },
      sectionHeader: { fontSize: 14, bold: true, margin: [0, 15, 0, 8] },
      tableHeader: { fontSize: 10, bold: true, fillColor: '#f3f4f6', color: '#374151' },
      tableCell: { fontSize: 9, color: '#1f2937' },
      tableCellRight: { fontSize: 9, color: '#1f2937', alignment: 'right' },
      warning: { fontSize: 10, color: '#b45309', italics: true },
      small: { fontSize: 8, color: '#6b7280' },
    }

    // Localized strings
    const strings =
      jurisdiction === 'CO'
        ? {
            title: 'RESUMEN TRIBUTARIO',
            period: 'Periodo',
            summaryByToken: 'Resumen por Token',
            token: 'Token',
            amount: 'Cantidad',
            estValue: 'Est. COP',
            txs: 'Txs',
            total: 'TOTAL',
            ports: 'Puertos',
            name: 'Nombre',
            type: 'Tipo',
            status: 'Estado',
            transactions: 'Transacciones',
            date: 'Fecha',
            port: 'Puerto',
            payer: 'Pagador',
            complianceNotes: 'Notas de Cumplimiento',
            jurisdiction: 'Colombia (CO)',
            reportingThreshold: 'Umbral de Reporte',
            txsAboveThreshold: 'Transacciones sobre el umbral',
            footer: 'Galeon - Pagos Privados',
            noTxs: 'Sin transacciones en este periodo.',
            moreTransactions: (n: number) =>
              `... y ${n} transacciones más. Ver reporte JSON para la lista completa.`,
            reportInfo: 'Información del Reporte',
            rateSource: 'Fuente de tasas',
            ratesUsed: 'Tasas usadas',
            generatedBy: 'Generado por',
            disclaimerNote:
              'Este reporte es solo para fines informativos. Consulte con un profesional tributario para asesoría específica.',
            sentPayments: 'Pagos Enviados',
            receivedSummary: 'Resumen Recibido',
            sentSummary: 'Resumen Enviado',
            recipient: 'Destinatario',
            source: 'Origen',
            netBalance: 'Balance Neto',
            noSentPayments: 'Sin pagos enviados en este periodo.',
            moreSentPayments: (n: number) =>
              `... y ${n} pagos más. Ver reporte JSON para la lista completa.`,
          }
        : {
            title: 'TAX SUMMARY REPORT',
            period: 'Period',
            summaryByToken: 'Summary by Token',
            token: 'Token',
            amount: 'Amount',
            estValue: 'Est. USD',
            txs: 'Txs',
            total: 'TOTAL',
            ports: 'Ports',
            name: 'Name',
            type: 'Type',
            status: 'Status',
            transactions: 'Transactions',
            date: 'Date',
            port: 'Port',
            payer: 'Payer',
            complianceNotes: 'Compliance Notes',
            jurisdiction: 'United States (US)',
            reportingThreshold: 'Reporting Threshold',
            txsAboveThreshold: 'Payers above threshold',
            footer: 'Galeon - Private Payments',
            noTxs: 'No transactions in this period.',
            moreTransactions: (n: number) =>
              `... and ${n} more transactions. See JSON report for complete list.`,
            reportInfo: 'Report Information',
            rateSource: 'Rate source',
            ratesUsed: 'Rates used',
            generatedBy: 'Generated by',
            disclaimerNote:
              'This report is for informational purposes only. Consult a tax professional for specific advice.',
            sentPayments: 'Sent Payments',
            receivedSummary: 'Received Summary',
            sentSummary: 'Sent Summary',
            recipient: 'Recipient',
            source: 'Source',
            netBalance: 'Net Balance',
            noSentPayments: 'No sent payments in this period.',
            moreSentPayments: (n: number) =>
              `... and ${n} more payments. See JSON report for complete list.`,
          }

    const content: Content = [
      // Title
      {
        text: strings.title,
        style: 'title',
        alignment: 'center',
        margin: [0, 0, 0, 5],
      },
      {
        text: `${strings.period}: ${report.period.label}`,
        style: 'subtitle',
        alignment: 'center',
        margin: [0, 0, 0, 20],
      },

      // User Info
      this.buildUserSection(report, jurisdiction),

      // Summary Section (Received)
      ...this.buildSummarySection(report, jurisdiction, strings),

      // Sent Summary Section
      ...this.buildSentSummarySection(report, jurisdiction, strings),

      // Net Balance Section
      ...this.buildNetBalanceSection(report, jurisdiction, strings),

      // Ports Section
      this.buildPortsSection(report, jurisdiction, strings),

      // Transactions Section (Received)
      ...this.buildTransactionsSection(report, jurisdiction, strings),

      // Sent Payments Section
      ...this.buildSentPaymentsSection(report, jurisdiction, strings),

      // Compliance Notes
      ...this.buildComplianceSection(report, jurisdiction, strings),

      // Metadata
      ...this.buildMetadataSection(report, jurisdiction, strings),
    ]

    return {
      pageSize: 'LETTER',
      pageMargins: [40, 60, 40, 60],
      header: this.buildHeader(report),
      footer: this.buildFooter(report, jurisdiction, strings),
      content,
      styles,
      defaultStyle: { font: 'Helvetica' },
    }
  }

  /**
   * Build page header
   */
  private buildHeader(report: TaxSummaryReport): DynamicContent {
    return () => ({
      columns: [
        { text: 'GALEON', style: { fontSize: 12, bold: true, color: '#6366f1' } },
        {
          text: `Report: ${report.reportId.slice(0, 8)}`,
          alignment: 'right',
          style: { fontSize: 8, color: '#9ca3af' },
        },
      ],
      margin: [40, 20, 40, 0] as [number, number, number, number],
    })
  }

  /**
   * Build page footer
   */
  private buildFooter(
    report: TaxSummaryReport,
    jurisdiction: Jurisdiction,
    strings: LocaleStrings
  ): DynamicContent {
    return () => ({
      columns: [
        {
          text: `Generated: ${formatDate(report.generatedAt, jurisdiction)}`,
          style: { fontSize: 8, color: '#9ca3af' },
        },
        {
          text: strings.footer,
          alignment: 'right',
          style: { fontSize: 8, color: '#9ca3af' },
        },
      ],
      margin: [40, 0, 40, 20] as [number, number, number, number],
    })
  }

  /**
   * Build user information section
   */
  private buildUserSection(report: TaxSummaryReport, jurisdiction: Jurisdiction): Content {
    const periodConnector = jurisdiction === 'CO' ? 'a' : 'to'
    return {
      table: {
        widths: ['auto', '*'],
        body: [
          [
            { text: 'Wallet:', style: 'tableHeader', border: [false, false, false, false] },
            {
              text: report.user.walletAddress,
              style: 'tableCell',
              border: [false, false, false, false],
            },
          ],
          [
            {
              text: jurisdiction === 'CO' ? 'Periodo:' : 'Period:',
              style: 'tableHeader',
              border: [false, false, false, false],
            },
            {
              text: `${report.period.startDate} ${periodConnector} ${report.period.endDate}`,
              style: 'tableCell',
              border: [false, false, false, false],
            },
          ],
        ],
      },
      layout: 'noBorders',
      margin: [0, 0, 0, 15] as [number, number, number, number],
    }
  }

  /**
   * Build summary section with totals by token
   */
  private buildSummarySection(
    report: TaxSummaryReport,
    jurisdiction: Jurisdiction,
    strings: LocaleStrings
  ): Content[] {
    const tokenRows: TableCell[][] = report.summary.totalReceivedByToken.map((token) => [
      { text: token.symbol, style: 'tableCell' },
      { text: token.totalFormatted, style: 'tableCellRight' },
      { text: formatCurrency(token.totalCop, jurisdiction), style: 'tableCellRight' },
      { text: token.transactionCount.toString(), style: 'tableCellRight' },
    ])

    return [
      { text: strings.receivedSummary, style: 'sectionHeader' },
      {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto', 'auto'],
          body: [
            [
              { text: strings.token, style: 'tableHeader' },
              { text: strings.amount, style: 'tableHeader', alignment: 'right' },
              { text: strings.estValue, style: 'tableHeader', alignment: 'right' },
              { text: strings.txs, style: 'tableHeader', alignment: 'right' },
            ],
            ...tokenRows,
            [
              { text: strings.total, style: 'tableHeader', colSpan: 2 },
              {},
              {
                text: formatCurrency(report.summary.grandTotalReceivedCop, jurisdiction),
                style: 'tableHeader',
                alignment: 'right',
              },
              {
                text: report.summary.totalTransactions.toString(),
                style: 'tableHeader',
                alignment: 'right',
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0,
          hLineColor: () => '#e5e7eb',
          paddingTop: () => 6,
          paddingBottom: () => 6,
        },
        margin: [0, 0, 0, 15] as [number, number, number, number],
      },
    ]
  }

  /**
   * Build sent payments summary section
   */
  private buildSentSummarySection(
    report: TaxSummaryReport,
    jurisdiction: Jurisdiction,
    strings: LocaleStrings
  ): Content[] {
    if (report.summary.totalSentByToken.length === 0) {
      return []
    }

    const tokenRows: TableCell[][] = report.summary.totalSentByToken.map((token) => [
      { text: token.symbol, style: 'tableCell' },
      { text: token.totalFormatted, style: 'tableCellRight' },
      { text: formatCurrency(token.totalCop, jurisdiction), style: 'tableCellRight' },
      { text: token.transactionCount.toString(), style: 'tableCellRight' },
    ])

    return [
      { text: strings.sentSummary, style: 'sectionHeader' },
      {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto', 'auto'],
          body: [
            [
              { text: strings.token, style: 'tableHeader' },
              { text: strings.amount, style: 'tableHeader', alignment: 'right' },
              { text: strings.estValue, style: 'tableHeader', alignment: 'right' },
              { text: strings.txs, style: 'tableHeader', alignment: 'right' },
            ],
            ...tokenRows,
            [
              { text: strings.total, style: 'tableHeader', colSpan: 2 },
              {},
              {
                text: formatCurrency(report.summary.grandTotalSentCop, jurisdiction),
                style: 'tableHeader',
                alignment: 'right',
              },
              {
                text: report.summary.totalSentTransactions.toString(),
                style: 'tableHeader',
                alignment: 'right',
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0,
          hLineColor: () => '#e5e7eb',
          paddingTop: () => 6,
          paddingBottom: () => 6,
        },
        margin: [0, 0, 0, 15] as [number, number, number, number],
      },
    ]
  }

  /**
   * Build net balance section
   */
  private buildNetBalanceSection(
    report: TaxSummaryReport,
    jurisdiction: Jurisdiction,
    strings: LocaleStrings
  ): Content[] {
    const netBalance = report.summary.netBalanceCop
    const isPositive = netBalance >= 0

    return [
      {
        table: {
          widths: ['*', 'auto'],
          body: [
            [
              {
                text: strings.netBalance,
                style: 'tableHeader',
                border: [false, false, false, false],
              } as TableCell,
              {
                text: `${isPositive ? '+' : ''}${formatCurrency(netBalance, jurisdiction)}`,
                style: 'tableHeader',
                alignment: 'right' as Alignment,
                border: [false, false, false, false],
              } as TableCell,
            ],
          ],
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 15] as [number, number, number, number],
      },
    ]
  }

  /**
   * Build ports section
   */
  private buildPortsSection(
    report: TaxSummaryReport,
    jurisdiction: Jurisdiction,
    strings: LocaleStrings
  ): Content {
    if (report.ports.length === 0) {
      return { text: '' }
    }

    const portRows: TableCell[][] = report.ports.map((port) => [
      { text: port.portName, style: 'tableCell' },
      { text: port.type, style: 'tableCell' },
      { text: formatCurrency(port.totalReceivedCop, jurisdiction), style: 'tableCellRight' },
      { text: port.transactionCount.toString(), style: 'tableCellRight' },
      { text: port.status, style: 'tableCell' },
    ])

    return [
      { text: strings.ports, style: 'sectionHeader' },
      {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto', 'auto', 'auto'],
          body: [
            [
              { text: strings.name, style: 'tableHeader' },
              { text: strings.type, style: 'tableHeader' },
              { text: strings.estValue, style: 'tableHeader', alignment: 'right' },
              { text: strings.txs, style: 'tableHeader', alignment: 'right' },
              { text: strings.status, style: 'tableHeader' },
            ],
            ...portRows,
          ],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0,
          hLineColor: () => '#e5e7eb',
          paddingTop: () => 6,
          paddingBottom: () => 6,
        },
        margin: [0, 0, 0, 15] as [number, number, number, number],
      },
    ]
  }

  /**
   * Build transactions section
   */
  private buildTransactionsSection(
    report: TaxSummaryReport,
    jurisdiction: Jurisdiction,
    strings: LocaleStrings
  ): Content[] {
    if (report.transactions.length === 0) {
      return [
        { text: strings.transactions, style: 'sectionHeader' },
        { text: strings.noTxs, style: 'small', margin: [0, 0, 0, 15] },
      ]
    }

    // Limit to 50 transactions in PDF to avoid huge files
    const displayTransactions = report.transactions.slice(0, 50)
    const hasMore = report.transactions.length > 50

    const txRows: TableCell[][] = displayTransactions.map((tx) => [
      { text: formatDate(tx.timestamp, jurisdiction), style: 'tableCell' },
      { text: tx.portName || '-', style: 'tableCell' },
      { text: truncateAddress(tx.payerAddress), style: 'tableCell' },
      { text: `${tx.amountFormatted} ${tx.currency || ''}`, style: 'tableCellRight' },
      { text: formatCurrency(tx.amountCop, jurisdiction), style: 'tableCellRight' },
    ])

    const content: Content[] = [
      { text: strings.transactions, style: 'sectionHeader' },
      {
        table: {
          headerRows: 1,
          widths: ['auto', '*', 'auto', 'auto', 'auto'],
          body: [
            [
              { text: strings.date, style: 'tableHeader' },
              { text: strings.port, style: 'tableHeader' },
              { text: strings.payer, style: 'tableHeader' },
              { text: strings.amount, style: 'tableHeader', alignment: 'right' },
              { text: strings.estValue, style: 'tableHeader', alignment: 'right' },
            ],
            ...txRows,
          ],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0,
          hLineColor: () => '#e5e7eb',
          paddingTop: () => 4,
          paddingBottom: () => 4,
        },
        margin: [0, 0, 0, 10] as [number, number, number, number],
      },
    ]

    if (hasMore) {
      content.push({
        text: strings.moreTransactions(report.transactions.length - 50),
        style: 'small',
        margin: [0, 0, 0, 15],
      })
    }

    return content
  }

  /**
   * Build sent payments section
   */
  private buildSentPaymentsSection(
    report: TaxSummaryReport,
    jurisdiction: Jurisdiction,
    strings: LocaleStrings
  ): Content[] {
    if (report.sentPayments.length === 0) {
      return [
        { text: strings.sentPayments, style: 'sectionHeader' },
        { text: strings.noSentPayments, style: 'small', margin: [0, 0, 0, 15] },
      ]
    }

    // Limit to 50 sent payments in PDF
    const displayPayments = report.sentPayments.slice(0, 50)
    const hasMore = report.sentPayments.length > 50

    const paymentRows: TableCell[][] = displayPayments.map((p) => [
      { text: formatDate(p.timestamp, jurisdiction), style: 'tableCell' },
      { text: p.recipientPortName || truncateAddress(p.recipientAddress), style: 'tableCell' },
      { text: p.sourceLabel, style: 'tableCell' },
      { text: `${p.amountFormatted} ${p.currency}`, style: 'tableCellRight' },
      { text: formatCurrency(p.amountCop, jurisdiction), style: 'tableCellRight' },
    ])

    const content: Content[] = [
      { text: strings.sentPayments, style: 'sectionHeader' },
      {
        table: {
          headerRows: 1,
          widths: ['auto', '*', 'auto', 'auto', 'auto'],
          body: [
            [
              { text: strings.date, style: 'tableHeader' },
              { text: strings.recipient, style: 'tableHeader' },
              { text: strings.source, style: 'tableHeader' },
              { text: strings.amount, style: 'tableHeader', alignment: 'right' },
              { text: strings.estValue, style: 'tableHeader', alignment: 'right' },
            ],
            ...paymentRows,
          ],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0,
          hLineColor: () => '#e5e7eb',
          paddingTop: () => 4,
          paddingBottom: () => 4,
        },
        margin: [0, 0, 0, 10] as [number, number, number, number],
      },
    ]

    if (hasMore) {
      content.push({
        text: strings.moreSentPayments(report.sentPayments.length - 50),
        style: 'small',
        margin: [0, 0, 0, 15],
      })
    }

    return content
  }

  /**
   * Build compliance notes section
   */
  private buildComplianceSection(
    report: TaxSummaryReport,
    jurisdiction: Jurisdiction,
    strings: LocaleStrings
  ): Content[] {
    return [
      { text: strings.complianceNotes, style: 'sectionHeader' },
      {
        table: {
          widths: ['auto', '*'],
          body: [
            [
              {
                text: jurisdiction === 'CO' ? 'Jurisdicción:' : 'Jurisdiction:',
                style: 'tableCell',
                border: [false, false, false, false],
              },
              {
                text: strings.jurisdiction,
                style: 'tableCell',
                border: [false, false, false, false],
              },
            ],
            [
              {
                text: `${strings.reportingThreshold}:`,
                style: 'tableCell',
                border: [false, false, false, false],
              },
              {
                text: formatCurrency(report.compliance.uiafThreshold, jurisdiction),
                style: 'tableCell',
                border: [false, false, false, false],
              },
            ],
            [
              {
                text: `${strings.txsAboveThreshold}:`,
                style: 'tableCell',
                border: [false, false, false, false],
              },
              {
                text: report.compliance.transactionsAboveThreshold.toString(),
                style: report.compliance.transactionsAboveThreshold > 0 ? 'warning' : 'tableCell',
                border: [false, false, false, false],
              },
            ],
          ],
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 10] as [number, number, number, number],
      },
      {
        text: strings.disclaimerNote,
        style: 'small',
        margin: [0, 0, 0, 15],
      },
    ]
  }

  /**
   * Build metadata section
   */
  private buildMetadataSection(
    report: TaxSummaryReport,
    jurisdiction: Jurisdiction,
    strings: LocaleStrings
  ): Content[] {
    const ratesText = Object.entries(report.metadata.ratesUsed)
      .map(([token, rate]) => `${token}: ${formatCurrency(rate, jurisdiction)}/unit`)
      .join(', ')

    return [
      {
        canvas: [
          { type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#e5e7eb' },
        ],
        margin: [0, 10, 0, 10] as [number, number, number, number],
      },
      { text: strings.reportInfo, style: 'small', bold: true, margin: [0, 0, 0, 5] },
      { text: `ID: ${report.reportId}`, style: 'small' },
      { text: `${strings.rateSource}: ${report.metadata.rateSource}`, style: 'small' },
      { text: `${strings.ratesUsed}: ${ratesText}`, style: 'small' },
      { text: `${strings.generatedBy}: ${report.metadata.generatedBy}`, style: 'small' },
    ]
  }

  /**
   * Create PDF buffer from document definition
   */
  private async createPdfBuffer(docDefinition: TDocumentDefinitions): Promise<Buffer> {
    // pdfmake 0.3.0: createPdfKitDocument is now async
    const pdfDoc = await this.printer.createPdfKitDocument(docDefinition)

    return new Promise((resolve, reject) => {
      try {
        const chunks: Buffer[] = []

        pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk))
        pdfDoc.on('end', () => resolve(Buffer.concat(chunks)))
        pdfDoc.on('error', reject)

        pdfDoc.end()
      } catch (error) {
        reject(error)
      }
    })
  }
}
