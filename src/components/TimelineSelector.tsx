import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TIMELINE_YEARS, type TimelineYear, type Habits, calculateOrganRisks, DEFAULT_HABITS, type Demographics } from '@/lib/health-types';

interface TimelineSelectorProps {
  value: TimelineYear;
  onChange: (year: TimelineYear) => void;
  habits?: Habits;
  demographics?: Demographics;
}

export default function TimelineSelector({ value, onChange, habits, demographics }: TimelineSelectorProps) {
  const sparkline = useMemo(() => {
    const h = habits || DEFAULT_HABITS;
    return TIMELINE_YEARS.map(year => {
      const risks = calculateOrganRisks(h, year, demographics);
      const avgRisk = risks.reduce((sum, r) => sum + r.score, 0) / risks.length;
      return { year, score: Math.max(0, 100 - avgRisk) };
    });
  }, [habits, demographics]);

  const activeIdx = TIMELINE_YEARS.indexOf(value);
  const activeScore = sparkline[activeIdx]?.score ?? 100;
  const scoreColor = activeScore >= 70 ? 'var(--severity-good)' : activeScore >= 40 ? 'var(--severity-warn)' : 'var(--severity-bad)';

  return (
    <div className="space-y-4">
      {/* Score display */}
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono" style={{ color: scoreColor }}>{Math.round(activeScore)}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">health score</span>
        </div>
        <span className="text-xs text-muted-foreground font-mono">
          {value === 0 ? 'Today' : `in ${value} years`}
        </span>
      </div>

      {/* Timeline buttons */}
      <div className="flex gap-1">
        {TIMELINE_YEARS.map((year, i) => {
          const isActive = value === year;
          const score = sparkline[i]?.score ?? 100;
          const color = score >= 70 ? 'bg-severity-good' : score >= 40 ? 'bg-severity-warn' : 'bg-severity-bad';
          const textColor = score >= 70 ? 'text-severity-good' : score >= 40 ? 'text-severity-warn' : 'text-severity-bad';

          return (
            <button
              key={year}
              onClick={() => onChange(year)}
              className={`flex-1 relative rounded-lg border py-2.5 px-2 transition-all ${
                isActive
                  ? 'border-foreground/20 bg-foreground/[0.03] shadow-sm'
                  : 'border-border hover:border-foreground/10 bg-transparent'
              }`}
            >
              <span className={`block text-[11px] font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                {year === 0 ? 'Now' : `${year}y`}
              </span>
              <span className={`block text-sm font-bold font-mono mt-0.5 ${isActive ? textColor : 'text-muted-foreground/60'}`}>
                {Math.round(score)}
              </span>
              {/* Mini bar */}
              <div className="h-1 rounded-full bg-muted/50 mt-1.5 overflow-hidden">
                <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${score}%`, opacity: isActive ? 1 : 0.4 }} />
              </div>
              {isActive && (
                <motion.div
                  layoutId="timeline-indicator"
                  className="absolute -bottom-px left-2 right-2 h-0.5 rounded-full bg-foreground"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
