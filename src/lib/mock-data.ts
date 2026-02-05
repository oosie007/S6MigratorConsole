// Mock data and types for migration console – replace with API calls later

export type MigrationStatus = "draft" | "validating" | "ready" | "in_progress" | "completed" | "failed";
export type PolicyValidationStatus = "pending" | "pass" | "fail";
export type PolicyMigrationStatus = "pending" | "migrating" | "success" | "failed";
export type PolicyVerificationStatus = "pending" | "pass" | "fail";

export interface PolicyPipelineStatus {
  validation: PolicyValidationStatus;
  migration: PolicyMigrationStatus;
  verification: PolicyVerificationStatus;
  validationErrors?: string[];
  verificationErrors?: string[];
}

export interface Policy {
  id: string;
  policyNumber: string;
  dateEffective: string;
  customerName: string;
  productName: string;
  status?: string; // e.g. Active, Cancelled (for live UAT data)
  validationStatus?: PolicyValidationStatus;
  migrationStatus?: PolicyMigrationStatus;
  validationErrors?: string[];
  verificationStatus?: PolicyVerificationStatus;
  verificationErrors?: string[];
}

export interface MigrationProject {
  id: string;
  name: string;
  createdAt: string;
  sourceProductId: string;
  targetProductId: string;
  status: MigrationStatus;
  totalPolicies: number;
  migratedCount: number;
  failedCount: number;
  inProgressCount: number;
}

export interface System6Product {
  id: string;
  name: string;
  policyCount: number;
}

export interface CatalystProduct {
  id: string;
  name: string;
}

// Mock System 6 products (source)
export const MOCK_SOURCE_PRODUCTS: System6Product[] = [
  { id: "s6-auto", name: "System 6 – Auto Liability", policyCount: 1247 },
  { id: "s6-property", name: "System 6 – Commercial Property", policyCount: 892 },
  { id: "s6-umbrella", name: "System 6 – Umbrella", policyCount: 334 },
  { id: "s6-workers", name: "System 6 – Workers Comp", policyCount: 2103 },
];

// Mock Catalyst products (target)
export const MOCK_TARGET_PRODUCTS: CatalystProduct[] = [
  { id: "cat-auto", name: "Catalyst – Auto Liability" },
  { id: "cat-property", name: "Catalyst – Commercial Property" },
  { id: "cat-umbrella", name: "Catalyst – Umbrella" },
  { id: "cat-workers", name: "Catalyst – Workers Comp" },
];

// Generate mock policies for a product (simplified – in real app this would be an API)
export function getMockPoliciesForProduct(productId: string, limit = 50): Policy[] {
  const product = MOCK_SOURCE_PRODUCTS.find((p) => p.id === productId);
  const count = product?.policyCount ?? 100;
  const policies: Policy[] = [];
  const firstNames = ["Acme", "Global", "Premier", "Summit", "Pacific", "Northern", "Metro", "Central"];
  const lastNames = ["Corp", "Industries", "Holdings", "Group", "Partners", "Ltd", "Inc", "Co"];

  for (let i = 0; i < Math.min(count, limit); i++) {
    const year = 2022 + (i % 3);
    const month = (i % 12) + 1;
    const day = (i % 28) + 1;
    const statuses: Array<Policy["status"]> = ["Active", "Cancelled", "Suspended"];
    policies.push({
      id: `pol-${productId}-${i}`,
      policyNumber: `S6-${String(10000 + i).padStart(5, "0")}`,
      dateEffective: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      customerName: `${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`,
      productName: product?.name ?? "Unknown",
      status: statuses[i % statuses.length],
      validationStatus: "pending",
      migrationStatus: "pending",
    });
  }
  return policies;
}

// Mock validation: mark ~10% as fail for demo
export function runMockValidation(policies: Policy[]): Policy[] {
  return policies.map((p, i) => {
    const fail = i % 9 === 2; // every 9th starting at 2 fails
    return {
      ...p,
      validationStatus: fail ? "fail" : "pass",
      validationErrors: fail ? ["Missing endorsement data", "Premium mismatch"] : undefined,
    };
  });
}

// Mock verification: compare attributes (dates, premium, customer); ~5% fail for demo
export function runMockVerification(policies: Policy[]): Policy[] {
  return policies.map((p, i) => {
    const fail = i % 19 === 7;
    return {
      ...p,
      verificationStatus: fail ? "fail" : "pass",
      verificationErrors: fail ? ["Premium mismatch", "Effective date drift"] : undefined,
    };
  });
}

// Create a new migration (for wizard). Caller adds to list.
export function createMigration(params: {
  name: string;
  date: string;
  sourceProductId: string;
  targetProductId: string;
}): MigrationProject {
  const product = MOCK_SOURCE_PRODUCTS.find((p) => p.id === params.sourceProductId);
  const id = `m-${Date.now()}`;
  return {
    id,
    name: params.name,
    createdAt: params.date,
    sourceProductId: params.sourceProductId,
    targetProductId: params.targetProductId,
    status: "draft",
    totalPolicies: product?.policyCount ?? 0,
    migratedCount: 0,
    failedCount: 0,
    inProgressCount: 0,
  };
}

// Mock migrations list
export const MOCK_MIGRATIONS: MigrationProject[] = [
  {
    id: "m1",
    name: "Auto Q1 2025",
    createdAt: "2025-01-15",
    sourceProductId: "s6-auto",
    targetProductId: "cat-auto",
    status: "completed",
    totalPolicies: 1247,
    migratedCount: 1200,
    failedCount: 12,
    inProgressCount: 0,
  },
  {
    id: "m2",
    name: "Property Pilot",
    createdAt: "2025-01-28",
    sourceProductId: "s6-property",
    targetProductId: "cat-property",
    status: "in_progress",
    totalPolicies: 892,
    migratedCount: 340,
    failedCount: 3,
    inProgressCount: 2,
  },
  {
    id: "m3",
    name: "Umbrella Migration",
    createdAt: "2025-02-01",
    sourceProductId: "s6-umbrella",
    targetProductId: "cat-umbrella",
    status: "ready",
    totalPolicies: 334,
    migratedCount: 0,
    failedCount: 0,
    inProgressCount: 0,
  },
];

// Get product names for a migration (for display in nested table)
export function getMigrationProductNames(m: MigrationProject): { source: string; target: string } {
  const source = MOCK_SOURCE_PRODUCTS.find((p) => p.id === m.sourceProductId);
  const target = MOCK_TARGET_PRODUCTS.find((p) => p.id === m.targetProductId);
  return { source: source?.name ?? m.sourceProductId, target: target?.name ?? m.targetProductId };
}

// Aggregate stats for dashboard (pass migrations from context for live count)
export function getDashboardStats(migrations: { totalPolicies: number; migratedCount: number; failedCount: number; inProgressCount?: number }[] = MOCK_MIGRATIONS) {
  return {
    totalPolicies: migrations.reduce((s, m) => s + m.totalPolicies, 0),
    totalMigrated: migrations.reduce((s, m) => s + m.migratedCount, 0),
    totalFailures: migrations.reduce((s, m) => s + m.failedCount, 0),
    inProgress: migrations.reduce((s, m) => s + (m.inProgressCount ?? 0), 0),
    migrationCount: migrations.length,
  };
}
