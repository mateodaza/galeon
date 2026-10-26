import { HERO } from '@/content/landing'
import { DisplayTitle } from './display-title'
import { Phrased } from './phrased'
import { HeroMark } from './hero-mark'
import { MarkPlate } from './mark-plate'
import { SiteLinkAnchor } from './site-link'

/**
 * First screen: the headline on the left, the engraved mark on the right.
 * On phones the mark follows the lede, so it stays inside the first screen.
 */
export function Hero() {
  return (
    <section className="hero" id="top" data-hero="">
      <div className="wrap hero-grid">
        <p className="eyebrow">
          <span>{HERO.eyebrow}</span>
        </p>
        <DisplayTitle as="h1" title={HERO.title} />
        <p className="lede">
          <Phrased text={HERO.lede.lead} /> <strong>{HERO.lede.levels[0]}</strong>,{' '}
          <strong>{HERO.lede.levels[1]}</strong>, and <strong>{HERO.lede.levels[2]}</strong>.{' '}
          <Phrased text={HERO.lede.tail} />
        </p>
        <div className="hero-plate">
          <HeroMark label={HERO.markLabel}>
            <MarkPlate id="hero-mark" className="fallback" />
          </HeroMark>
        </div>
        <div className="actions">
          <SiteLinkAnchor className="btn" link={HERO.primary} icon="arrow" />
          <SiteLinkAnchor className="link" link={HERO.secondary} />
        </div>
      </div>
    </section>
  )
}
