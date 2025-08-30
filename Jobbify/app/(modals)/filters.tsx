import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  TextInput,
  Switch,
  Pressable,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import type {
  JobPreferences,
  EmploymentType,
  WorkMode,
  ExperienceLevel,
} from "../../types/jobPreferences";

import {
  EMPLOYMENT_TYPE_OPTIONS,
  WORK_MODE_OPTIONS,
  EXPERIENCE_OPTIONS,
  DEFAULT_JOB_PREFERENCES,
  hasActiveFilters,
} from "../../types/jobPreferences";

type StepKey =
  | "employmentTypes"
  | "workMode"
  | "experience"
  | "locations"
  | "technologies"
  | "salary"
  | "visa";

type Step = {
  key: StepKey;
  title: string;
  subtitle?: string;
  required?: boolean;
};

const steps: Step[] = [
  { key: "employmentTypes", title: "What types of roles?", subtitle: "Pick all that apply", required: true },
  { key: "workMode", title: "Preferred work mode?", subtitle: "Remote, hybrid, or onsite" },
  { key: "experience", title: "Experience level?" },
  { key: "locations", title: "Preferred locations", subtitle: "Add cities, states, or countries" },
  { key: "technologies", title: "Tech you care about", subtitle: "e.g., React, Python, SQL" },
  { key: "salary", title: "Salary range (optional)", subtitle: "Set a min and/or max" },
  { key: "visa", title: "Need visa sponsorship?" },
];

const dot = (active: boolean) => (
  <View
    key={Math.random().toString()}
    style={[styles.dot, active ? styles.dotActive : styles.dotInactive]}
  />
);

function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected ? styles.chipSelected : styles.chipUnselected,
        pressed && { opacity: 0.9 },
      ]}
    >
      <Text style={[styles.chipText, selected ? styles.chipTextSelected : styles.chipTextUnselected]}>{label}</Text>
    </Pressable>
  );
}

export default function FiltersModal() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [prefs, setPrefs] = useState<JobPreferences>({ ...DEFAULT_JOB_PREFERENCES });
  const locationInputRef = useRef<TextInput | null>(null);
  const techInputRef = useRef<TextInput | null>(null);

  const progress = useMemo(() => steps.map((_, i) => dot(i === index)), [index]);

  function next() {
    setIndex((i) => Math.min(i + 1, steps.length - 1));
  }

  function back() {
    if (index === 0) {
      router.back();
    } else {
      setIndex((i) => Math.max(i - 1, 0));
    }
  }

  function applyAndClose() {
    const active = hasActiveFilters(prefs);
    // If your app expects params/state, wire it up here as needed.
    // For now, we simply navigate back; caller can read any global store if used.
    if (!active) {
      router.back();
      return;
    }
    router.back();
  }

  const step = steps[index];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={back} style={styles.navBtn}><Text style={styles.navBtnText}>{"<"}</Text></Pressable>
          <Text style={styles.headerTitle}>Filters</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.progress}>{progress}</View>

        <View style={styles.card}>
          <Text style={styles.title}>{step.title}</Text>
          {step.subtitle ? <Text style={styles.subtitle}>{step.subtitle}</Text> : null}

          <ScrollView contentContainerStyle={styles.content}>
            {step.key === "employmentTypes" && (
              <View style={styles.rowWrap}>
                {EMPLOYMENT_TYPE_OPTIONS.map((o) => (
                  <Chip
                    key={o.key}
                    label={o.label}
                    selected={prefs.employmentTypes.includes(o.key)}
                    onPress={() => {
                      setPrefs((p) => {
                        const exists = p.employmentTypes.includes(o.key);
                        const nextList = exists
                          ? p.employmentTypes.filter((k) => k !== o.key)
                          : [...p.employmentTypes, o.key];
                        return { ...p, employmentTypes: nextList };
                      });
                    }}
                  />
                ))}
              </View>
            )}

            {step.key === "workMode" && (
              <View style={styles.rowWrap}>
                {WORK_MODE_OPTIONS.map((o) => (
                  <Chip
                    key={o.key}
                    label={o.label}
                    selected={prefs.workMode === o.key}
                    onPress={() => setPrefs((p) => ({ ...p, workMode: o.key }))}
                  />
                ))}
              </View>
            )}

            {step.key === "experience" && (
              <View style={styles.rowWrap}>
                {EXPERIENCE_OPTIONS.map((o) => (
                  <Chip
                    key={o.key}
                    label={o.label}
                    selected={prefs.experience === o.key}
                    onPress={() => setPrefs((p) => ({ ...p, experience: o.key }))}
                  />
                ))}
              </View>
            )}

            {step.key === "locations" && (
              <View>
                <TextInput
                  placeholder="Add a location and press Enter"
                  placeholderTextColor="#9AA0A6"
                  style={styles.input}
                  ref={(r) => (locationInputRef.current = r)}
                  onSubmitEditing={(e) => {
                    const v = e.nativeEvent.text.trim();
                    if (!v) return;
                    setPrefs((p) => ({ ...p, locations: [ ...(p.locations ?? []), v ] }));
                    locationInputRef.current?.clear?.();
                  }}
                  returnKeyType="done"
                />
                <View style={styles.rowWrap}>
                  {(prefs.locations ?? []).map((loc, i) => (
                    <Chip
                      key={`${loc}-${i}`}
                      label={loc}
                      onPress={() =>
                        setPrefs((p) => ({
                          ...p,
                          locations: (p.locations ?? []).filter((x) => x !== loc),
                        }))
                      }
                    />
                  ))}
                </View>
              </View>
            )}

            {step.key === "technologies" && (
              <View>
                <TextInput
                  placeholder="Add a technology and press Enter"
                  placeholderTextColor="#9AA0A6"
                  style={styles.input}
                  ref={(r) => (techInputRef.current = r)}
                  onSubmitEditing={(e) => {
                    const v = e.nativeEvent.text.trim();
                    if (!v) return;
                    setPrefs((p) => ({ ...p, technologies: [ ...(p.technologies ?? []), v ] }));
                    techInputRef.current?.clear?.();
                  }}
                  returnKeyType="done"
                />
                <View style={styles.rowWrap}>
                  {(prefs.technologies ?? []).map((t, i) => (
                    <Chip
                      key={`${t}-${i}`}
                      label={t}
                      onPress={() =>
                        setPrefs((p) => ({
                          ...p,
                          technologies: (p.technologies ?? []).filter((x) => x !== t),
                        }))
                      }
                    />
                  ))}
                </View>
              </View>
            )}

            {step.key === "salary" && (
              <View>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Min</Text>
                    <TextInput
                      keyboardType="number-pad"
                      placeholder="e.g., 80000"
                      placeholderTextColor="#9AA0A6"
                      style={styles.input}
                      defaultValue={prefs.salary?.min?.toString()}
                      onChangeText={(v) =>
                        setPrefs((p) => ({
                          ...p,
                          salary: { ...p.salary, min: Number(v) || undefined },
                        }))
                      }
                    />
                  </View>
                  <View style={{ width: 16 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Max</Text>
                    <TextInput
                      keyboardType="number-pad"
                      placeholder="e.g., 150000"
                      placeholderTextColor="#9AA0A6"
                      style={styles.input}
                      defaultValue={prefs.salary?.max?.toString()}
                      onChangeText={(v) =>
                        setPrefs((p) => ({
                          ...p,
                          salary: { ...p.salary, max: Number(v) || undefined },
                        }))
                      }
                    />
                  </View>
                </View>
              </View>
            )}

            {step.key === "visa" && (
              <View style={styles.row}>
                <Chip
                  label={prefs.visaSponsorship ? "Yes, sponsorship needed" : "No, not needed"}
                  selected={!!prefs.visaSponsorship}
                  onPress={() => setPrefs((p) => ({ ...p, visaSponsorship: !p.visaSponsorship }))}
                />
              </View>
            )}
          </ScrollView>
        </View>

        <View style={styles.footer}>
          {index < steps.length - 1 ? (
            <Pressable style={[styles.cta, styles.ctaPrimary]} onPress={next}>
              <Text style={styles.ctaPrimaryText}>Next</Text>
            </Pressable>
          ) : (
            <Pressable style={[styles.cta, styles.ctaPrimary]} onPress={applyAndClose}>
              <Text style={styles.ctaPrimaryText}>Apply Filters</Text>
            </Pressable>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B0F1A" },
  container: { flex: 1, paddingHorizontal: 16, paddingBottom: 16 },
  header: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111626",
  },
  navBtnText: { color: "#DCE1EB", fontSize: 18, fontWeight: "600" },
  headerTitle: { color: "#DCE1EB", fontSize: 18, fontWeight: "700" },
  progress: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, marginHorizontal: 4 },
  dotActive: { backgroundColor: "#6EA8FE" },
  dotInactive: { backgroundColor: "#2B3350" },
  card: {
    flex: 1,
    marginTop: 16,
    backgroundColor: "#0E1426",
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#1E2746",
  },
  title: { color: "#E6ECF7", fontSize: 20, fontWeight: "700" },
  subtitle: { color: "#A9B3C9", marginTop: 6 },
  content: { paddingVertical: 16 },
  row: { flexDirection: "row", alignItems: "center" },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    marginHorizontal: 4,
    marginBottom: 8,
  },
  chipSelected: { backgroundColor: "#16213D", borderColor: "#6EA8FE" },
  chipUnselected: { backgroundColor: "#0B0F1A", borderColor: "#2B3350" },
  chipText: { fontWeight: "600" },
  chipTextSelected: { color: "#CFE2FF" },
  chipTextUnselected: { color: "#B6C0D9" },
  input: {
    backgroundColor: "#0B0F1A",
    borderColor: "#2B3350",
    borderWidth: 1,
    borderRadius: 12,
    color: "#E6ECF7",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  label: { color: "#A9B3C9", marginBottom: 6 },
  footer: { marginTop: 12 },
  cta: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaPrimary: { backgroundColor: "#2E6CF6" },
  ctaPrimaryText: { color: "#FFFFFF", fontWeight: "700", fontSize: 16 },
});
