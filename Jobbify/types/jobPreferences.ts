// Improved Job Preferences types and helper option lists
// Keep this file UI-agnostic; only types and constants.

export type EmploymentType =
  | "full_time"
  | "part_time"
  | "contract"
  | "internship"
  | "temporary"
  | "freelance";

export type WorkMode = "remote" | "hybrid" | "onsite";

export type ExperienceLevel =
  | "intern"
  | "entry"
  | "mid"
  | "senior"
  | "lead"
  | "director";

export type CurrencyCode = "USD" | "EUR" | "GBP" | "INR" | "CAD" | "AUD";

export type SalaryRange = {
  min?: number;
  max?: number;
  currency?: CurrencyCode;
};

export type JobPreferences = {
  employmentTypes: EmploymentType[];
  workMode?: WorkMode;
  experience?: ExperienceLevel;
  locations?: string[]; // City, state, country, or remote-first regions
  technologies?: string[]; // Keywords like React, Node, Python
  salary?: SalaryRange;
  visaSponsorship?: boolean;
  active?: boolean; // Whether filters are active
};

export const EMPLOYMENT_TYPE_OPTIONS: { key: EmploymentType; label: string }[] = [
  { key: "full_time", label: "Full-time" },
  { key: "part_time", label: "Part-time" },
  { key: "contract", label: "Contract" },
  { key: "internship", label: "Internship" },
  { key: "temporary", label: "Temporary" },
  { key: "freelance", label: "Freelance" },
];

export const WORK_MODE_OPTIONS: { key: WorkMode; label: string }[] = [
  { key: "remote", label: "Remote" },
  { key: "hybrid", label: "Hybrid" },
  { key: "onsite", label: "Onsite" },
];

export const EXPERIENCE_OPTIONS: { key: ExperienceLevel; label: string }[] = [
  { key: "intern", label: "Intern" },
  { key: "entry", label: "Entry" },
  { key: "mid", label: "Mid" },
  { key: "senior", label: "Senior" },
  { key: "lead", label: "Lead" },
  { key: "director", label: "Director" },
];

export const CURRENCY_OPTIONS: CurrencyCode[] = [
  "USD",
  "EUR",
  "GBP",
  "INR",
  "CAD",
  "AUD",
];

export const DEFAULT_JOB_PREFERENCES: JobPreferences = {
  employmentTypes: ["full_time"],
  workMode: "remote",
  experience: "mid",
  locations: [],
  technologies: [],
  salary: { currency: "USD" },
  visaSponsorship: false,
  active: false,
};

export function isSalaryRangeValid(s?: SalaryRange): boolean {
  if (!s) return true;
  if (s.min != null && s.max != null && s.min > s.max) return false;
  if (s.min != null && s.min < 0) return false;
  if (s.max != null && s.max < 0) return false;
  return true;
}

export function hasActiveFilters(p: JobPreferences): boolean {
  const base = DEFAULT_JOB_PREFERENCES;
  const diffEmp = JSON.stringify(p.employmentTypes) !== JSON.stringify(base.employmentTypes);
  return (
    diffEmp ||
    p.workMode !== base.workMode ||
    p.experience !== base.experience ||
    (p.locations && p.locations.length > 0) ||
    (p.technologies && p.technologies.length > 0) ||
    (p.salary && (p.salary.min != null || p.salary.max != null || p.salary.currency !== base.salary?.currency)) ||
    !!p.visaSponsorship
  );
}

