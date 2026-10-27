import Link from 'next/link'
import type { SiteLink } from '@/content/landing'
import { Icon, type IconName } from './icon'

interface SiteLinkProps {
  link: SiteLink
  className?: string
  /** Icon after the label for internal links (external links always get the outbound arrow). */
  icon?: IconName
  /** Set the icon apart from the label (the phone menu pushes it to the far edge). */
  iconApart?: boolean
}

/** The label, with its icon bound to the last word so the two never wrap apart. */
function label(text: string, trailing: IconName | undefined, apart: boolean) {
  if (!trailing) return <span>{text}</span>
  if (apart)
    return (
      <>
        <span>{text}</span>
        <Icon name={trailing} />
      </>
    )
  const cut = text.lastIndexOf(' ')
  return (
    <span>
      {cut > 0 ? text.slice(0, cut + 1) : ''}
      <span className="nw">
        {text.slice(cut + 1)}
        <Icon name={trailing} />
      </span>
    </span>
  )
}

/**
 * One link from the copy. Routes inside the site use `next/link`; hash links
 * and other sites are plain anchors, so they work without JavaScript.
 */
export function SiteLinkAnchor({ link, className, icon, iconApart = false }: SiteLinkProps) {
  const content = label(link.label, link.external ? 'external' : icon, iconApart)
  if (link.external) {
    return (
      <a className={className} href={link.href} target="_blank" rel="noopener noreferrer">
        {content}
        <span className="sr"> (opens in a new tab)</span>
      </a>
    )
  }
  if (link.href.startsWith('/') && !link.href.includes('#')) {
    return (
      <Link className={className} href={link.href}>
        {content}
      </Link>
    )
  }
  return (
    <a className={className} href={link.href}>
      {content}
    </a>
  )
}
