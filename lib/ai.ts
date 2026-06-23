import { supabase } from './supabase';

interface GoalGenerationInput {
  categories: { name: string; growth_description: string | null }[];
  recentEntries: { content: string; entry_date: string }[];
  coachingStyle: string | null;
}

export function generateDailyGoals(input: GoalGenerationInput) {
  const { categories, recentEntries, coachingStyle } = input;
  const goals: { title: string; description: string; categoryName: string }[] = [];

  const style = coachingStyle || 'gentle coach';

  categories.slice(0, 3).forEach((cat) => {
    const prefixes = {
      'strict coach': ['Push yourself to', 'Challenge:', 'No excuses:'],
      'gentle coach': ['Try to', 'Consider', 'When you can,'],
      'reflective prompts': ['Reflect on', 'Notice when', 'Ask yourself:'],
      'accountability': ['Commit to', 'Track:', 'Report back on'],
      'gamified streaks': ['Level up:', 'Quest:', 'Achievement:'],
    };

    const prefix = (prefixes[style as keyof typeof prefixes] || prefixes['gentle coach'])[
      Math.floor(Math.random() * 3)
    ];

    const actions = [
      `practice ${cat.name} for 10 minutes today`,
      `take one small step toward being a ${cat.name}`,
      `write down one thing you did well as a ${cat.name}`,
      `find one opportunity to be a ${cat.name}`,
    ];

    const action = actions[Math.floor(Math.random() * actions.length)];

    goals.push({
      title: `${prefix} ${action}`,
      description: cat.growth_description || `Working toward: ${cat.name}`,
      categoryName: cat.name,
    });
  });

  return goals;
}

export function generateReflection(
  entries: { content: string }[],
  coachingStyle: string | null
): string {
  const style = coachingStyle || 'gentle coach';

  const reflections = {
    'strict coach': [
      "You're showing up. That's the foundation. Now push harder.",
      "Consistency is building. Don't let up now.",
      "Progress is earned, not given. Keep the momentum.",
    ],
    'gentle coach': [
      "You're doing meaningful work on yourself. Be proud of showing up today.",
      "Every entry is a step forward. You're building something lasting.",
      "Your commitment to growth is inspiring. Keep going at your own pace.",
    ],
    'reflective prompts': [
      "What patterns do you notice in your recent reflections?",
      "How has your perspective shifted since you started this practice?",
      "What would your future self thank you for today?",
    ],
    'accountability': [
      "You've checked in consistently. That's accountability in action.",
      "Your streak shows real commitment. Keep the chain going.",
      "You said you'd show up, and you did. That matters.",
    ],
    'gamified streaks': [
      "Achievement unlocked: Consistent Reflector! Keep the streak alive.",
      "XP gained! Your self-awareness stat is leveling up.",
      "Daily quest complete. Tomorrow's challenge awaits.",
    ],
  };

  const options = reflections[style as keyof typeof reflections] || reflections['gentle coach'];
  return options[Math.floor(Math.random() * options.length)];
}

export function generateWeeklySummary(
  entries: { content: string; entry_date: string }[],
  goalsCompleted: number,
  totalGoals: number
): { summary: string; patterns: string } {
  const completionRate = totalGoals > 0 ? Math.round((goalsCompleted / totalGoals) * 100) : 0;

  const summary = `This week you journaled ${entries.length} time${entries.length !== 1 ? 's' : ''} and completed ${goalsCompleted} of ${totalGoals} goals (${completionRate}% completion rate). ${
    completionRate >= 70
      ? "You're building strong momentum!"
      : completionRate >= 40
        ? "You're making steady progress. Keep building consistency."
        : "Every step counts. Focus on showing up, even in small ways."
  }`;

  const patterns =
    entries.length >= 3
      ? "You're developing a regular journaling practice. Your entries show increasing self-awareness and intentionality."
      : "Building consistency is your current growth edge. Try setting a specific time each day for reflection.";

  return { summary, patterns };
}
