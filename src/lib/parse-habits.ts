import { createServerFn } from '@tanstack/react-start';

const FALLBACK_SUPABASE_URL = 'https://tglfrgxkinkoxbocadum.supabase.co';
const FALLBACK_PUBLISHABLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnbGZyZ3hraW5rb3hib2NhZHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MDg4MjEsImV4cCI6MjA5MDE4NDgyMX0.l6qzeNnFKwKt6D1pj6qQvQ4jmPg6f2lZ9WFFGX6ZJck';

type ParseHabitsInput = {
  message: string;
};

type ParseHabitsResult = {
  habits: {
    smoking: number;
    alcohol: number;
    sleep: number;
    exercise: number;
    diet: number;
  };
  summary: string;
};

export const parseHabits = createServerFn({ method: 'POST' })
  .inputValidator((input: ParseHabitsInput) => input)
  .handler(async ({ data }) => {
    const message = data?.message?.trim();

    if (!message) {
      throw new Error('Please describe your habits first.');
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL;
    const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || FALLBACK_PUBLISHABLE_KEY;

    const response = await fetch(`${supabaseUrl}/functions/v1/parse-habits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${publishableKey}`,
        apikey: publishableKey,
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      const text = await response.text();
      let errorMessage = 'Something went wrong parsing your habits.';

      try {
        const parsed = JSON.parse(text) as { error?: string };
        errorMessage = parsed.error || errorMessage;
      } catch {
        if (text) errorMessage = text;
      }

      throw new Error(errorMessage);
    }

    return (await response.json()) as ParseHabitsResult;
  });
