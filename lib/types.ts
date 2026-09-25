export interface Exercise {
  id: string;
  name: string;
  muscle_group: string;
  description: string | null;
  wger_id: number | null;
  image_url: string | null;
  created_at: string;
}

export interface StrengthSession {
  id: string;
  date: string;
  time: string | null;
  duration_minutes: number | null;
  feeling: number | null;
  notes: string | null;
  created_at: string;
}

export interface StrengthSet {
  id: string;
  session_id: string;
  exercise_id: string;
  set_number: number;
  reps: number;
  weight_kg: number;
  side: 'gauche' | 'droit' | null;
  created_at: string;
}

export interface Run {
  id: string;
  date: string;
  distance_km: number;
  duration_seconds: number;
  avg_pace_seconds_per_km: number;
  run_type: 'footing' | 'fractionne' | 'sortie_longue' | 'autre';
  elevation_gain_m: number | null;
  weather: 'soleil' | 'pluie' | 'froid' | 'chaud' | null;
  feeling: string | null;
  notes: string | null;
  created_at: string;
}

export interface WeightEntry {
  id: string;
  date: string;
  weight_kg: number;
  created_at: string;
}

export interface SleepEntry {
  id: string;
  date: string;
  hours: number;
  created_at: string;
}

export type Meal = 'petit_dejeuner' | 'collation_matin' | 'dejeuner' | 'collation_apresmidi' | 'diner';

export interface FoodEntry {
  id: string;
  date: string;
  name: string;
  quantity_g: number;
  protein_g: number;
  calories_kcal: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  off_code: string | null;
  meal: Meal | null;
  created_at: string;
}

export interface CustomFood {
  id: string;
  name: string;
  ref_quantity_g: number;
  protein_g: number;
  calories_kcal: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  created_at: string;
}

export interface WaterEntry {
  id: string;
  date: string;
  amount_ml: number;
  created_at: string;
}

export interface Supplement {
  name: string;
}

export interface SupplementLog {
  id: string;
  supplement_name: string;
  date: string;
  created_at: string;
}

export type Sex = 'homme' | 'femme';
export type ActivityLevel = 'sedentaire' | 'leger' | 'modere' | 'actif' | 'tres_actif';
export type NutritionGoal = 'seche' | 'maintien' | 'prise_de_masse';

export interface Profile {
  user_id: string;
  email: string | null;
  pseudo: string | null;
  avatar_url: string | null;
  invite_code: string | null;
  sex: Sex | null;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  activity_level: ActivityLevel | null;
  goal: NutritionGoal | null;
  vma_kmh: number | null;
  water_goal_ml: number | null;
  unit_system: 'metric' | 'imperial';
  updated_at: string;
}

export type GoalType = 'generique' | 'course' | 'musculation';

export interface Goal {
  id: string;
  title: string;
  unit: string;
  start_value: number;
  target_value: number;
  current_value: number;
  target_date: string | null;
  goal_type: GoalType;
  distance_km: number | null;
  exercise_id: string | null;
  target_reps: number | null;
  created_at: string;
}

export interface Muscle {
  id: string;
  wger_id: number;
  name_fr: string;
  name_en: string;
  is_front: boolean;
}

export interface ExerciseMuscle {
  exercise_id: string;
  muscle_id: string;
  role: 'primaire' | 'secondaire';
}

export interface Friend {
  friend_id: string;
  friend_label: string;
  friend_avatar_url: string | null;
}

export interface FriendRequest {
  request_id: string;
  from_user_id: string;
  from_label: string;
}

export interface LeaderboardEntry {
  person_id: string;
  label: string;
  volume_7j: number;
  km_7j: number;
}

export type ChallengeStatus = 'pending' | 'done' | 'dismissed';

export interface Challenge {
  id: string;
  from_user_id: string;
  to_user_id: string;
  message: string;
  status: ChallengeStatus;
  created_at: string;
  completed_at: string | null;
}
