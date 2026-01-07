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
 * Format number as Colombian Peso
 */
function formatCOP(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format date for display
 */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleDateString('es-CO', {
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
  async generateTaxSummaryPdf(report: TaxSummaryReport): Promise<Buffer> {
    const docDefinition = this.buildDocumentDefinition(report)
    return this.createPdfBuffer(docDefinition)
  }

  /**
   * Build the PDF document definition
   */
  private buildDocumentDefinition(report: TaxSummaryReport): TDocumentDefinitions {
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

    const content: Content = [
      // Title
      {
        text: 'RESUMEN TRIBUTARIO',
        style: 'title',
        alignment: 'center',
        margin: [0, 0, 0, 5],
      },
      {
        text: `Periodo: ${report.period.label}`,
        style: 'subtitle',
        alignment: 'center',
        margin: [0, 0, 0, 20],
      },

      // User Info
      this.buildUserSection(report),

      // Summary Section
      ...this.buildSummarySection(report),

      // Ports Section
      this.buildPortsSection(report),

      // Transactions Section
      ...this.buildTransactionsSection(report),

      // Compliance Notes
      ...this.buildComplianceSection(report),

      // Metadata
      ...this.buildMetadataSection(report),
    ]

    return {
      pageSize: 'LETTER',
      pageMargins: [40, 60, 40, 60],
      header: this.buildHeader(report),
      footer: this.buildFooter(report),
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
          text: `Reporte: ${report.reportId.slice(0, 8)}`,
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
  private buildFooter(report: TaxSummaryReport): DynamicContent {
    return () => ({
      columns: [
        {
          text: `Generado: ${formatDate(report.generatedAt)}`,
          style: { fontSize: 8, color: '#9ca3af' },
        },
        {
          text: 'Galeon - Pagos Privados',
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
  private buildUserSection(report: TaxSummaryReport): Content {
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
            { text: 'Periodo:', style: 'tableHeader', border: [false, false, false, false] },
            {
              text: `${report.period.startDate} a ${report.period.endDate}`,
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
  private buildSummarySection(report: TaxSummaryReport): Content[] {
    const tokenRows: TableCell[][] = report.summary.totalReceivedByToken.map((token) => [
      { text: token.symbol, style: 'tableCell' },
      { text: token.totalFormatted, style: 'tableCellRight' },
      { text: formatCOP(token.totalCop), style: 'tableCellRight' },
      { text: token.transactionCount.toString(), style: 'tableCellRight' },
    ])

    return [
      { text: 'Resumen por Token', style: 'sectionHeader' },
      {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto', 'auto'],
          body: [
            [
              { text: 'Token', style: 'tableHeader' },
              { text: 'Cantidad', style: 'tableHeader', alignment: 'right' },
              { text: 'Valor COP', style: 'tableHeader', alignment: 'right' },
              { text: 'Txs', style: 'tableHeader', alignment: 'right' },
            ],
            ...tokenRows,
            [
              { text: 'TOTAL', style: 'tableHeader', colSpan: 2 },
              {},
              {
                text: formatCOP(report.summary.grandTotalCop),
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
   * Build ports section
   */
  private buildPortsSection(report: TaxSummaryReport): Content {
    if (report.ports.length === 0) {
      return { text: '' }
    }

    const portRows: TableCell[][] = report.ports.map((port) => [
      { text: port.portName, style: 'tableCell' },
      { text: port.type, style: 'tableCell' },
      { text: formatCOP(port.totalReceivedCop), style: 'tableCellRight' },
      { text: port.transactionCount.toString(), style: 'tableCellRight' },
      { text: port.status, style: 'tableCell' },
    ])

    return [
      { text: 'Puertos', style: 'sectionHeader' },
      {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto', 'auto', 'auto'],
          body: [
            [
              { text: 'Nombre', style: 'tableHeader' },
              { text: 'Tipo', style: 'tableHeader' },
              { text: 'Total COP', style: 'tableHeader', alignment: 'right' },
              { text: 'Txs', style: 'tableHeader', alignment: 'right' },
              { text: 'Estado', style: 'tableHeader' },
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
  private buildTransactionsSection(report: TaxSummaryReport): Content[] {
    if (report.transactions.length === 0) {
      return [
        { text: 'Transacciones', style: 'sectionHeader' },
        { text: 'No hay transacciones en este periodo.', style: 'small', margin: [0, 0, 0, 15] },
      ]
    }

    // Limit to 50 transactions in PDF to avoid huge files
    const displayTransactions = report.transactions.slice(0, 50)
    const hasMore = report.transactions.length > 50

    const txRows: TableCell[][] = displayTransactions.map((tx) => [
      { text: formatDate(tx.timestamp), style: 'tableCell' },
      { text: tx.portName || '-', style: 'tableCell' },
      { text: truncateAddress(tx.payerAddress), style: 'tableCell' },
      { text: `${tx.amountFormatted} ${tx.currency || ''}`, style: 'tableCellRight' },
      { text: formatCOP(tx.amountCop), style: 'tableCellRight' },
    ])

    const content: Content[] = [
      { text: 'Transacciones', style: 'sectionHeader' },
      {
        table: {
          headerRows: 1,
          widths: ['auto', '*', 'auto', 'auto', 'auto'],
          body: [
            [
              { text: 'Fecha', style: 'tableHeader' },
              { text: 'Puerto', style: 'tableHeader' },
              { text: 'Pagador', style: 'tableHeader' },
              { text: 'Cantidad', style: 'tableHeader', alignment: 'right' },
              { text: 'COP', style: 'tableHeader', alignment: 'right' },
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
        text: `... y ${report.transactions.length - 50} transacciones mas. Consulte el reporte JSON para el listado completo.`,
        style: 'small',
        margin: [0, 0, 0, 15],
      })
    }

    return content
  }

  /**
   * Build compliance notes section
   */
  private buildComplianceSection(report: TaxSummaryReport): Content[] {
    return [
      { text: 'Notas de Cumplimiento', style: 'sectionHeader' },
      {
        table: {
          widths: ['auto', '*'],
          body: [
            [
              { text: 'Jurisdiccion:', style: 'tableCell', border: [false, false, false, false] },
              { text: 'Colombia (CO)', style: 'tableCell', border: [false, false, false, false] },
            ],
            [
              { text: 'Umbral UIAF:', style: 'tableCell', border: [false, false, false, false] },
              {
                text: formatCOP(report.compliance.uiafThreshold),
                style: 'tableCell',
                border: [false, false, false, false],
              },
            ],
            [
              {
                text: 'Transacciones sobre umbral:',
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
        text: report.compliance.note,
        style: 'small',
        margin: [0, 0, 0, 15],
      },
    ]
  }

  /**
   * Build metadata section
   */
  private buildMetadataSection(report: TaxSummaryReport): Content[] {
    const ratesText = Object.entries(report.metadata.ratesUsed)
      .map(([token, rate]) => `${token}: ${formatCOP(rate)}/unidad`)
      .join(', ')

    return [
      {
        canvas: [
          { type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#e5e7eb' },
        ],
        margin: [0, 10, 0, 10] as [number, number, number, number],
      },
      { text: 'Informacion del Reporte', style: 'small', bold: true, margin: [0, 0, 0, 5] },
      { text: `ID: ${report.reportId}`, style: 'small' },
      { text: `Fuente de tasas: ${report.metadata.rateSource}`, style: 'small' },
      { text: `Tasas usadas: ${ratesText}`, style: 'small' },
      { text: `Generado por: ${report.metadata.generatedBy}`, style: 'small' },
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
