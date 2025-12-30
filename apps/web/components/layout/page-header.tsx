import { cn } from '@/lib/utils'

interface PageHeaderProps {
  /**
   * Page title.
   */
  title: string
  /**
   * Optional description below the title.
   */
  description?: string
  /**
   * Action buttons or controls to display on the right.
   */
  actions?: React.ReactNode
  /**
   * Additional className for the container.
   */
  className?: string
}

/**
 * Consistent page header with title, description, and actions.
 */
export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('mb-8 flex items-center justify-between', className)}>
      <div>
        <h1 className="text-foreground text-3xl font-bold">{title}</h1>
        {description && <p className="text-muted-foreground mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  )
}
