import type { HttpContext } from '@adonisjs/core/http'
import ComplianceService from '#services/compliance_service'
import PdfGeneratorService from '#services/pdf_generator_service'
import { taxSummaryValidator } from '#validators/compliance'

export default class ComplianceController {
  /**
   * GET /compliance/tax-summary
   * Generate a tax summary report for the authenticated user (JSON)
   *
   * Query params:
   * - period: 'annual' | 'quarterly' | 'monthly' | 'custom' (required)
   * - year: number (required for annual/quarterly/monthly)
   * - quarter: 1-4 (required for quarterly)
   * - month: 1-12 (required for monthly)
   * - startDate: YYYY-MM-DD (required for custom)
   * - endDate: YYYY-MM-DD (required for custom)
   * - portId: UUID (optional, filter by specific port)
   */
  async taxSummary({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const data = await taxSummaryValidator.validate(request.qs())

    const service = new ComplianceService()
    const jurisdiction = data.jurisdiction || 'US'

    try {
      const report = await service.generateTaxSummary(
        user.id,
        {
          period: data.period,
          year: data.year,
          quarter: data.quarter,
          month: data.month,
          startDate: data.startDate,
          endDate: data.endDate,
        },
        data.portId,
        jurisdiction
      )

      return response.ok(report)
    } catch (error) {
      if (error instanceof Error) {
        return response.badRequest({ error: error.message })
      }
      throw error
    }
  }

  /**
   * GET /compliance/tax-summary/pdf
   * Generate a tax summary report as PDF download
   *
   * Same query params as /tax-summary
   */
  async taxSummaryPdf({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const data = await taxSummaryValidator.validate(request.qs())

    const complianceService = new ComplianceService()
    const pdfService = new PdfGeneratorService()
    const jurisdiction = data.jurisdiction || 'US'

    try {
      const report = await complianceService.generateTaxSummary(
        user.id,
        {
          period: data.period,
          year: data.year,
          quarter: data.quarter,
          month: data.month,
          startDate: data.startDate,
          endDate: data.endDate,
        },
        data.portId,
        jurisdiction
      )

      const pdfBuffer = await pdfService.generateTaxSummaryPdf(report, jurisdiction)

      // Generate filename from period
      const filenamePrefix = jurisdiction === 'CO' ? 'resumen-tributario' : 'tax-summary'
      const filename = `${filenamePrefix}-${report.period.label.replace(/\s+/g, '-').toLowerCase()}.pdf`

      response.header('Content-Type', 'application/pdf')
      response.header('Content-Disposition', `attachment; filename="${filename}"`)
      response.header('Content-Length', pdfBuffer.length.toString())

      return response.send(pdfBuffer)
    } catch (error) {
      if (error instanceof Error) {
        return response.badRequest({ error: error.message })
      }
      throw error
    }
  }
}
