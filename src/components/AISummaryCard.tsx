import { motion, AnimatePresence } from 'framer-motion';
import type { OrganRisk, TimelineYear } from '@/lib/health-types';

interface AISummaryCardProps {
  risks: OrganRisk[];
  years: TimelineYear;
}

export default function AISummaryCard({ risks, years }: AISummaryCardProps) {
  const highestRisk = risks.reduce((a, b) => (a.score > b.score ? a : b), risks[0]);
  const avgScore = Math.round(risks.reduce((sum, r) => sum + r.score, 0) / risks.length);
  const topOrgans = [...risks].sort((a, b) => b.score - a.score).slice(0, 3);

  const levelTone =
    avgScore < 20
      ? 'Low'
      : avgScore < 45
        ? 'Moderate'
        : avgScore < 70
          ? 'High'
          : 'Critical';

  const riskColor =
    avgScore < 20
      ? 'var(--color-risk-low)'
      : avgScore < 45
        ? 'var(--color-risk-moderate)'
        : avgScore < 70
          ? 'var(--color-risk-high)'
          : 'var(--color-risk-critical)';

  const overallSummary =
    avgScore < 15
      ? `At ${years} years, your projected outlook remains stable and low-risk overall. The model sees no major red flags across key organs, and your trend lines stay relatively flat over time. Keeping these habits consistent is likely to preserve this pattern.`
      : avgScore < 35
        ? `At ${years} years, mild strain is starting to appear in a few organs, but the overall profile is still manageable. This is the stage where small adjustments can have outsized impact, especially around sleep quality and weekly activity consistency.`
        : avgScore < 60
          ? `By year ${years}, the model shows a moderate-to-high load across several organs. The largest concern is your ${highestRisk.label.toLowerCase()}, and the current pattern suggests risk accumulation rather than one isolated issue. Reducing one or two high-impact habits now can meaningfully flatten the long-term curve.`
          : `At year ${years}, the projected trajectory is severe across multiple systems. The strongest pressure appears in your ${highestRisk.label.toLowerCase()}, and nearby organs are also rising quickly. The key takeaway is urgency: meaningful routine changes are needed now to reduce long-term strain.`;

  const quickGuidance =
    avgScore < 20
      ? 'Keep your routine steady and monitor changes over time.'
      : avgScore < 45
        ? 'Focus on one habit first, then improve a second habit after one week.'
        : avgScore < 70
          ? 'Prioritize daily movement and sleep consistency to slow progression.'
          : 'Start with immediate reduction of highest-risk behaviors and track weekly.';

  const topDriverText = topOrgans
    .map((organ) => organ.label)
    .join(', ')
    .replace(/, ([^,]*)$/, ' and $1');

  return (
    <div className="card-vibrant rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <h3 className="text-sm font-semibold text-foreground">AI Summary 🤖</h3>
        </div>
        <span className="text-xs px-2 py-1 rounded-full border border-border/70 bg-card/70 text-foreground">
          {levelTone} Risk {avgScore >= 45 ? '⚠️' : '✅'}
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-muted-foreground">
          <span>📊 Overall load</span>
          <span>{avgScore}/100</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: riskColor }}
            initial={{ width: 0 }}
            animate={{ width: `${avgScore}%` }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {topOrgans.map((organ) => (
          <span
            key={organ.organ}
            className="text-xs px-2 py-1 rounded-lg border border-border/70 bg-card/60 text-muted-foreground"
          >
            {organ.score >= 60 ? '🔥' : organ.score >= 35 ? '⚡' : '🟢'} {organ.label}: {organ.score}
          </span>
        ))}
      </div>

      <div className="rounded-xl border border-border/70 bg-card/60 px-3 py-2 space-y-1">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">🔎 Main drivers</p>
        <p className="text-xs text-foreground/90 leading-relaxed">
          The strongest projected pressure is in <strong>{highestRisk.label}</strong>, with additional trend movement in{' '}
          <strong>{topDriverText}</strong> over the next <strong>{years} years</strong>.
        </p>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${years}-${avgScore}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.3 }}
          className="space-y-1"
        >
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">🧠 Detailed outlook</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{overallSummary}</p>
        </motion.div>
      </AnimatePresence>

      <div className="rounded-xl border border-border/70 bg-card/60 px-3 py-2">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">✅ Recommended next step</p>
        <p className="text-xs text-foreground/90 leading-relaxed">
          <strong>Simple action:</strong> {quickGuidance}
        </p>
      </div>
    </div>
  );
}
