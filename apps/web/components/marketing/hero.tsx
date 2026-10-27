import { HERO } from '@/content/landing'
import { DisplayTitle } from './display-title'
import { GlitchLayer } from './glitch-layer'
import { Phrased } from './phrased'
import { HeroMark } from './hero-mark'
import { MarkPlate } from './mark-plate'
import { SiteLinkAnchor } from './site-link'

/**
 * First screen: the headline on the left, the engraved mark on the right.
 * Below 900 px the mark comes first and the words follow it.
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
          <Phrased text={HERO.lede.lead} /> <strong>{HERO.lede.tech[0]}</strong>,{' '}
          <strong>{HERO.lede.tech[1]}</strong>, and <strong>{HERO.lede.tech[2]}</strong>.{' '}
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
      {/* the closing band's hover glitch, over the mark and the words (never the buttons) */}
      <GlitchLayer
        lines=".hero .eyebrow span, .hero h1 .ln, .hero .lede"
        blocks=".hero-plate .plate"
        scale={1.3}
      />
    </section>
  )
}
