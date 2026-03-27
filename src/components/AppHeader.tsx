import { useState, useEffect } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { Activity, User, FlaskConical, RotateCcw, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

const NAV_ITEMS = [
  { to: '/' as const, label: 'Dashboard', icon: Activity },
  { to: '/profile' as const, label: 'Profile & Habits', icon: User },
  { to: '/health-data' as const, label: 'Blood Work', icon: FlaskConical },
];

interface AppHeaderProps {
  onReset?: () => void;
  extraActions?: React.ReactNode;
}

export default function AppHeader({ onReset, extraActions }: AppHeaderProps) {
  const location = useLocation();
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('theme') === 'dark' || 
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <header className="sticky top-0 z-20 border-b border-white/40 bg-white/70 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-orange/85 via-brand-pink/85 to-brand-teal/75 text-sm font-bold text-white shadow-lg shadow-brand-orange/20">
              FY
            </div>
            <div>
              <p className="section-kicker mb-1">Health Forecast Studio</p>
              <h1 className="font-display text-base font-bold tracking-tight text-foreground">Future You</h1>
            </div>
          </Link>
          <nav className="hidden items-center gap-1 rounded-full border border-white/60 bg-white/55 p-1 shadow-sm sm:flex">
            {NAV_ITEMS.map(item => {
              const isActive = location.pathname === item.to || 
                (item.to !== '/' && location.pathname.startsWith(item.to));
              return (
                <Link key={item.to} to={item.to}>
                  <button className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition-all ${
                    isActive 
                      ? 'bg-foreground text-background shadow-sm' 
                      : 'text-muted-foreground hover:bg-white/70 hover:text-foreground'
                  }`}>
                    <item.icon className="w-3.5 h-3.5" />
                    {item.label}
                  </button>
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {extraActions}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDark(!dark)}
            className="h-9 w-9 rounded-full border border-white/60 bg-white/60 p-0 shadow-sm"
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          {onReset && (
            <Button variant="outline" size="sm" onClick={onReset} className="h-9 rounded-full border-white/70 bg-white/60 px-4 text-xs gap-1.5 shadow-sm">
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </Button>
          )}
        </div>
      </div>
      <nav className="mt-3 flex items-center gap-1 overflow-x-auto pb-1 sm:hidden">
        {NAV_ITEMS.map(item => {
          const isActive = location.pathname === item.to ||
            (item.to !== '/' && location.pathname.startsWith(item.to));
          return (
            <Link key={item.to} to={item.to}>
              <button className={`flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-medium transition-all ${
                isActive
                  ? 'bg-foreground text-background'
                  : 'border border-white/70 bg-white/60 text-muted-foreground'
              }`}>
                <item.icon className="w-3 h-3" />
                {item.label}
              </button>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
