/* Public "Her work" portfolio — Ahleyia's own after-service photography from
   real Atlanta homes & short-term rentals. These are PUBLISHED marketing shots
   (portfolioData.ts), the only real images in the app. Client proof photos —
   reports, the active clean, the owner gallery — stay private washes and are
   never surfaced here. No account needed to browse. */
import React from 'react'
import { css } from '../css'
import { Button, Card, Chip, DetailHeader, NoteCard, SectionLabel } from '../../ds/components'
import { WORK_SHOTS, PORTFOLIO_SHOTS } from '../portfolioData'

export function PortfolioScreen({ v }: { v: any }) {
  return (
    <>
      <DetailHeader onBack={v.goBack} badge={v.badgePortfolio} title="Her work" subtitle="After-service photography · real Atlanta homes">
        <div style={css('display:flex;gap:var(--gap-chip);flex-wrap:wrap;margin-top:12px')}>
          <Chip tone="onBrand">🖼️ {v.portfolioCount} after-service photos</Chip>
          <Chip tone="onBrand">🌱 Eco-conscious</Chip>
        </div>
      </DetailHeader>
      <div style={css('padding:22px')}>
        <p style={css('margin:0 0 4px;font-size:13.5px;line-height:var(--leading-snug);color:var(--ink-soft)')}>After-service photography from real Atlanta homes and short-term rentals. Every clean finishes the same way — <b style={{ color: 'var(--ink)' }}>documented</b>.</p>

        <SectionLabel>Featured</SectionLabel>
        <div style={css('display:grid;grid-template-columns:1fr 1fr;gap:10px')}>
          {WORK_SHOTS.map((shot: any, i: number) => (
            <figure key={i} style={css('margin:0;position:relative;border-radius:var(--radius-lg);overflow:hidden;box-shadow:var(--shadow-card);aspect-ratio:3 / 4;background:var(--surface-cream)')}>
              <img src={shot.src} alt={shot.caption} loading="lazy" style={css('width:100%;height:100%;object-fit:cover;display:block')} />
              <div style={css('position:absolute;inset:0;background:linear-gradient(to top,rgba(42,23,32,.78),rgba(42,23,32,0) 46%)')} />
              <figcaption style={css('position:absolute;left:10px;right:10px;bottom:9px;color:#fff;font-size:11.5px;font-weight:var(--weight-semibold);line-height:var(--leading-snug);text-shadow:0 1px 6px rgba(42,23,32,.5)')}>{shot.caption}</figcaption>
            </figure>
          ))}
        </div>

        <NoteCard tone="eco" icon="🌱"><b>Eco & non-toxic, every home.</b> Hospital-grade clean, zero bleach or ammonia — finished with the owner’s signature scent.</NoteCard>

        <SectionLabel>The full gallery</SectionLabel>
        <div style={css('display:grid;grid-template-columns:1fr 1fr;gap:10px')}>
          {PORTFOLIO_SHOTS.map((shot: any, i: number) => (
            <figure key={i} style={css('margin:0;position:relative;border-radius:var(--radius-lg);overflow:hidden;box-shadow:var(--shadow-card);aspect-ratio:1 / 1;background:var(--surface-cream)')}>
              <img src={shot.src} alt={shot.caption} loading="lazy" style={css('width:100%;height:100%;object-fit:cover;display:block')} />
              <div style={css('position:absolute;inset:0;background:linear-gradient(to top,rgba(42,23,32,.72),rgba(42,23,32,0) 44%)')} />
              <figcaption style={css('position:absolute;left:9px;right:9px;bottom:8px;color:#fff;font-size:11px;font-weight:var(--weight-semibold);line-height:var(--leading-snug);text-shadow:0 1px 6px rgba(42,23,32,.5)')}>{shot.caption}</figcaption>
            </figure>
          ))}
        </div>

        <Card tone="blush" style={css('margin-top:20px')}>
          <div style={css('font-family:var(--font-serif-display);font-size:20px;line-height:1.1')}>Every clean follows The Kee Method™</div>
          <p style={css('margin:8px 0 0;font-size:12.5px;line-height:var(--leading-snug);color:var(--ink-soft)')}>Five phases, the same photo moments, every time — so your home looks like this whether you’re there or a thousand miles away.</p>
        </Card>
        <Button onClick={v.goServices}>See her services & get a quote</Button>
        <p style={css('margin:10px 2px 0;text-align:center;font-size:11px;color:var(--text-muted)')}>No account needed to browse. Serving Metro Atlanta.</p>
      </div>
    </>
  )
}
