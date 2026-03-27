import { TIMELINE_YEARS, type TimelineYear } from '@/lib/health-types';
import { Button } from '@/components/ui/button';

interface TimelineSelectorProps {
  value: TimelineYear;
  onChange: (year: TimelineYear) => void;
}

export default function TimelineSelector({ value, onChange }: TimelineSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">Timeline</span>
        <span className="text-sm font-mono font-semibold text-primary">
          +{value} years
        </span>
      </div>
      <div className="flex gap-2">
        {TIMELINE_YEARS.map((year) => (
          <Button
            key={year}
            variant="pill"
            size="sm"
            data-active={value === year}
            onClick={() => onChange(year)}
            className="flex-1 font-mono text-xs"
          >
            {year === 0 ? 'Now' : `${year}y`}
          </Button>
        ))}
      </div>
      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-brand-pink transition-all duration-500 ease-out"
          style={{ width: `${Math.max(5, (value / 20) * 100)}%` }}
        />
      </div>
    </div>
  );
}
