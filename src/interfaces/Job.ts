// Parameters for bundle job
export interface BundleJobParameters {
  anonymize: boolean
  bundle_for: boolean
  bundle_for_time: number
  log_file_count: number
}

// Base job
interface BaseJob {
  ID: string
  AccountID: string
  CompletedAt: Date | null
  CreatedAt: Date
  FailedReason: string | null
  PeerID: string
  Result: string | null
  Status: "pending" | "successed" | "failed"
  TriggeredBy: string
}

// Discriminated union
export type Job =
  | (BaseJob & { Type: "bundle"; Parameters: BundleJobParameters })
  | (BaseJob & { Type: "other"; Parameters: Record<string, any> }) // fallback for unknown types

