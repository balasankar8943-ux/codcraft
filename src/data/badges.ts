export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export const BADGES: Badge[] = [
  {
    id: 'first_solve',
    name: 'First Blood',
    description: 'Solved your first coding problem on CodCraft!',
    icon: '⚡',
    color: '#f59e0b,#d97706'
  },
  {
    id: 'dp_solve',
    name: 'Dynamic Master',
    description: 'Successfully solved a Dynamic Programming problem!',
    icon: '🧬',
    color: '#3b82f6,#6366f1'
  },
  {
    id: 'streak_7',
    name: '7-Day Blaze',
    description: 'Maintained a coding streak for 7 consecutive days!',
    icon: '🔥',
    color: '#f43f5e,#f97316'
  },
  {
    id: 'tier_promotion',
    name: 'Rank Ascendant',
    description: 'Promoted to a higher knowledge track!',
    icon: '👑',
    color: '#a855f7,#d946ef'
  }
];
