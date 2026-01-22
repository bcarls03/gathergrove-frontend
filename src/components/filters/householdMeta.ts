// src/components/filters/householdMeta.ts
import { Users, Home, Heart } from "lucide-react";

export type HouseholdType = "Family w/ Kids" | "Empty Nesters" | "Singles/Couples";

export const HOUSEHOLD_TYPE_META: Record<
  HouseholdType,
  { Icon: typeof Users; iconColor: string; iconBorder: string }
> = {
  "Family w/ Kids": {
    Icon: Users,
    iconColor: "#3b82f6", // blue-500
    iconBorder: "#93c5fd", // blue-300
  },
  "Empty Nesters": {
    Icon: Home,
    iconColor: "#f59e0b", // amber-500
    iconBorder: "#fcd34d", // amber-300
  },
  "Singles/Couples": {
    Icon: Heart,
    iconColor: "#ec4899", // pink-500
    iconBorder: "#f9a8d4", // pink-300
  },
};
