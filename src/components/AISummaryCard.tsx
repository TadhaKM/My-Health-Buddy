import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, AlertTriangle, AlertCircle, CheckCircle2, Lightbulb } from 'lucide-react';
import type { OrganRisk, TimelineYear, RiskLevel } from '@/lib/health-types';

interface AISummaryCardProps {
  risks: OrganRisk[];
  years: TimelineYear;
}

const RISK_ICONS: Record<string, typeof AlertTriangle> = {
  critical: AlertCircle,
  high: AlertTriangle,
  moderate: AlertTriangle,
  low: CheckCircle2,
};

const RISK_CARD_STYLES: Record<string, { bg: string; border: string; icon: string; badge: string }> = {
  critical: { bg: 'bg-severity-bad/6', border: 'border-severity-bad/20', icon: 'text-severity-bad', badge: 'bg-severity-bad text-white' },
  high: { bg: 'bg-severity-bad/5', border: 'border-severity-bad/15', icon: 'text-severity-bad', badge: 'bg-severity-bad/80 text-white' },
  moderate: { bg: 'bg-severity-warn/5', border: 'border-severity-warn/20', icon: 'text-severity-warn', badge: 'bg-severity-warn text-severity-warn-foreground' },
  low: { bg: 'bg-severity-good/5', border: 'border-severity-good/20', icon: 'text-severity-good', badge: 'bg-severity-good text-severity-good-foreground' },
};

const ORGAN_ICONS: Record<string, string> = {
  brain: '🧠',
  heart: '❤️',
  lungs: '🫁',
  liver: '🫀',
  kidneys: '🫘',
  'body-fat': '🏋️',
};

function getAdvice(organ: string, risk: RiskLevel): string {
  const advice: Record<string, Record<string, string>> = {
    brain: {
      critical: 'Prioritize sleep consistency and stress reduction immediately.',
      high: 'Improve sleep quality and reduce sustained stress load.',
      moderate: 'Add recovery time and tighten sleep habits.',
      low: 'Keep maintaining strong sleep and stress habits.',
    },
    heart: {
      critical: 'Reduce smoking, improve movement, and tighten diet quality now.',
      high: 'Increase cardio exercise and reduce processed foods.',
      moderate: 'Add more weekly movement and improve recovery.',
      low: 'Your cardiovascular habits look strong.',
    },
    lungs: {
      critical: 'Reducing smoke exposure is the biggest lever right now.',
      high: 'Cut smoking and add more aerobic activity.',
      moderate: 'Reduce irritants and keep moving regularly.',
      low: 'Your lung-health profile looks strong.',
    },
    liver: {
      critical: 'Reduce alcohol and improve nutrition immediately.',
      high: 'Lower alcohol load and improve diet quality.',
      moderate: 'Add alcohol-free days and cleaner meals.',
      low: 'Your liver-health profile looks stable.',
    },
    kidneys: {
      critical: 'Increase hydration and reduce dietary strain now.',
      high: 'Focus on hydration and cleaner food choices.',
      moderate: 'Aim for steadier hydration and lower sodium intake.',
      low: 'Kidney support habits look healthy.',
    },
    'body-fat': {
      critical: 'Start with more daily movement and fewer processed calories.',
      high: 'Increase activity and simplify food quality improvements.',
      moderate: 'Add more movement and improve meal balance.',
      low: 'Body-composition signals look healthy.',
    },
  };

  return advice[organ]?.[risk] || 'Maintain healthy lifestyle habits.';
}

export default function AISummaryCard({ risks, years }: AISummaryCardProps) {
  const [expandedOrgan, setExpandedOrgan] = useState<string | null>(null);

  const criticalRisks = risks.filter((r) => r.risk === 'critical' || r.risk === 'high');
  const warningRisks = risks.filter((r) => r.risk === 'moderate');
  const healthyRisks = risks.filter((r) => r.risk === 'low');

  return (
    <div className="space-y-2.5">
      <div className="rounded-xl border border-border bg-card p-3.5">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">AI Summary</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {years === 0 ? 'Current health outlook' : `Projected outlook in ${years} years`} based on habits, demographics, and any biomarker data.
        </p>
      </div>

      {criticalRisks.map((risk, idx) => {
        const styles = RISK_CARD_STYLES[risk.risk];
        const Icon = RISK_ICONS[risk.risk];
        const isExpanded = expandedOrgan === risk.organ;

        return (
          <motion.div
            key={risk.organ}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={`overflow-hidden rounded-xl border ${styles.bg} ${styles.border}`}
          >
            <button
              onClick={() => setExpandedOrgan(isExpanded ? null : risk.organ)}
              className="flex w-full items-center gap-3 p-3.5 text-left transition-colors hover:bg-black/[0.02]"
            >
              <span className="text-lg">{ORGAN_ICONS[risk.organ]}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{risk.label} at Risk</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${styles.badge}`}>{risk.score.toFixed(2)}%</span>
                </div>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {risk.risk === 'critical' ? 'Immediate attention recommended' : 'Elevated risk detected'}
                </p>
              </div>
              <Icon className={`h-4 w-4 shrink-0 ${styles.icon}`} />
              <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2.5 px-3.5 pb-3.5">
                    <p className="text-xs leading-relaxed text-muted-foreground">{risk.summary}</p>
                    <div className="flex items-start gap-2 rounded-lg border border-primary/10 bg-primary/5 p-2.5">
                      <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      <p className="text-[11px] font-medium leading-relaxed text-primary">{getAdvice(risk.organ, risk.risk)}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}

      {warningRisks.length > 0 && (
        <div className="rounded-xl border border-severity-warn/[0.15] bg-severity-warn/[0.04] p-3.5">
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-severity-warn" />
            <span className="text-xs font-semibold text-foreground">Warnings</span>
          </div>
          <div className="space-y-1.5">
            {warningRisks.map((risk) => (
              <div key={risk.organ} className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span>{ORGAN_ICONS[risk.organ]}</span>
                  {risk.label}
                </span>
                <span className="rounded-full bg-severity-warn px-2 py-0.5 text-[10px] font-medium text-severity-warn-foreground">{risk.score.toFixed(2)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {healthyRisks.length > 0 && (
        <div className="rounded-xl border border-severity-good/[0.15] bg-severity-good/[0.04] p-3.5">
          <div className="mb-2 flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-severity-good" />
            <span className="text-xs font-semibold text-foreground">Healthy</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {healthyRisks.map((risk) => (
              <span key={risk.organ} className="flex items-center gap-1 rounded-full bg-severity-good/10 px-2 py-0.5 text-[11px] font-medium text-severity-good">
                {ORGAN_ICONS[risk.organ]} {risk.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
