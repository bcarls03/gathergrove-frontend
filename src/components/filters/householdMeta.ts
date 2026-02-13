// src/components/filters/householdMeta.ts
import { UsersRound, Home, UserRound } from "lucide-react";

export type HouseholdType = "Family with Kids" | "Empty Nesters" | "Singles/Couples";

export const HOUSEHOLD_TYPE_META: Record<
  HouseholdType,
  { Icon: typeof UsersRound; iconColor: string; iconBorder: string; iconBg: string }
> = {
  "Family with Kids": {
    Icon: UsersRound,
    iconColor: "#334155", // slate-700
    iconBorder: "#cbd5e1", // slate-300
    iconBg: "#f1f5f9", // slate-100
  },
  "Empty Nesters": {
    Icon: Home,
    iconColor: "#334155", // slate-700
    iconBorder: "#cbd5e1", // slate-300
    iconBg: "#f1f5f9", // slate-100
  },
  "Singles/Couples": {
    Icon: UserRound,
    iconColor: "#334155", // slate-700
    iconBorder: "#cbd5e1", // slate-300
    iconBg: "#f1f5f9", // slate-100
  },
};
