"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  MOCK_MIGRATIONS,
  type MigrationProject,
  type PolicyPipelineStatus,
} from "@/lib/mock-data";

const defaultPolicyStatus: PolicyPipelineStatus = {
  validation: "pending",
  migration: "pending",
  verification: "pending",
};

type PolicyStatusMap = Record<string, Record<string, PolicyPipelineStatus>>;

type MigrationsContextValue = {
  migrations: MigrationProject[];
  addMigration: (m: MigrationProject) => void;
  getMigration: (id: string) => MigrationProject | undefined;
  policyStatuses: PolicyStatusMap;
  getPolicyStatus: (migrationId: string, policyId: string) => PolicyPipelineStatus;
  updatePolicyStatuses: (
    migrationId: string,
    updates: Array<{ policyId: string; status: Partial<PolicyPipelineStatus> }>
  ) => void;
  setPolicyStatusBatch: (migrationId: string, statuses: Record<string, PolicyPipelineStatus>) => void;
  getAllValidationFailed: () => Array<{ migration: MigrationProject; policyId: string }>;
  getAllVerificationFailed: () => Array<{ migration: MigrationProject; policyId: string }>;
};

const MigrationsContext = createContext<MigrationsContextValue | null>(null);

export function MigrationsProvider({ children }: { children: ReactNode }) {
  const [migrations, setMigrations] = useState<MigrationProject[]>(MOCK_MIGRATIONS);
  const [policyStatuses, setPolicyStatusesState] = useState<PolicyStatusMap>({});

  const addMigration = useCallback((m: MigrationProject) => {
    setMigrations((prev) => [...prev, m]);
  }, []);

  const getMigration = useCallback(
    (id: string) => migrations.find((m) => m.id === id),
    [migrations]
  );

  const getPolicyStatus = useCallback(
    (migrationId: string, policyId: string): PolicyPipelineStatus => {
      const byMigration = policyStatuses[migrationId];
      if (!byMigration) return defaultPolicyStatus;
      const s = byMigration[policyId];
      if (!s) return defaultPolicyStatus;
      return s;
    },
    [policyStatuses]
  );

  const updatePolicyStatuses = useCallback(
    (
      migrationId: string,
      updates: Array<{ policyId: string; status: Partial<PolicyPipelineStatus> }>
    ) => {
      setPolicyStatusesState((prev) => {
        const byMigration = { ...prev[migrationId] };
        for (const { policyId, status } of updates) {
          const current = byMigration[policyId] ?? { ...defaultPolicyStatus };
          byMigration[policyId] = { ...current, ...status };
        }
        return { ...prev, [migrationId]: byMigration };
      });
    },
    []
  );

  const setPolicyStatusBatch = useCallback(
    (migrationId: string, statuses: Record<string, PolicyPipelineStatus>) => {
      setPolicyStatusesState((prev) => ({
        ...prev,
        [migrationId]: statuses,
      }));
    },
    []
  );

  const getAllValidationFailed = useCallback(() => {
    const out: Array<{ migration: MigrationProject; policyId: string }> = [];
    for (const m of migrations) {
      const byPolicy = policyStatuses[m.id];
      if (!byPolicy) continue;
      for (const [policyId, s] of Object.entries(byPolicy)) {
        if (s.validation === "fail") out.push({ migration: m, policyId });
      }
    }
    return out;
  }, [migrations, policyStatuses]);

  const getAllVerificationFailed = useCallback(() => {
    const out: Array<{ migration: MigrationProject; policyId: string }> = [];
    for (const m of migrations) {
      const byPolicy = policyStatuses[m.id];
      if (!byPolicy) continue;
      for (const [policyId, s] of Object.entries(byPolicy)) {
        if (s.verification === "fail") out.push({ migration: m, policyId });
      }
    }
    return out;
  }, [migrations, policyStatuses]);

  const value = useMemo<MigrationsContextValue>(
    () => ({
      migrations,
      addMigration,
      getMigration,
      policyStatuses,
      getPolicyStatus,
      updatePolicyStatuses,
      setPolicyStatusBatch,
      getAllValidationFailed,
      getAllVerificationFailed,
    }),
    [
      migrations,
      addMigration,
      getMigration,
      policyStatuses,
      getPolicyStatus,
      updatePolicyStatuses,
      setPolicyStatusBatch,
      getAllValidationFailed,
      getAllVerificationFailed,
    ]
  );

  return (
    <MigrationsContext.Provider value={value}>
      {children}
    </MigrationsContext.Provider>
  );
}

export function useMigrations() {
  const ctx = useContext(MigrationsContext);
  if (!ctx) throw new Error("useMigrations must be used within MigrationsProvider");
  return ctx;
}
