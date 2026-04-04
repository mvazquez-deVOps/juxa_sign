import { dbHomeDashboardCounts } from "@/lib/data/repository";

export type HomeDashboardCounts = {
  companies: number;
  signatories: number;
  documents: number;
  placements: number;
};

export async function getHomeDashboardCounts(organizationId: string): Promise<HomeDashboardCounts> {
  return dbHomeDashboardCounts(organizationId);
}
