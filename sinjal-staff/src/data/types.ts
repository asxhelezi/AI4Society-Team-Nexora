// Shared domain types for the SINJAL staff desktop. Mirrors the shapes built
// in design/mock-data.js so a real API can later fill the same contracts.

export type DeptId = 'infra' | 'sherbime' | 'mjedis' | 'ndricim' | 'uje' | (string & {});
export type CategoryId = 'mbetje' | 'gropa' | 'ndricim' | 'infra' | 'hapesira' | (string & {});

export type Status = 'I ri' | 'Në shqyrtim' | 'Caktuar' | 'Në punë' | 'Zgjidhur' | 'Mbyllur' | 'Dublikatë' | 'Refuzuar' | 'Kërkon informacion';

export type Priority = 'E ulët' | 'E mesme' | 'E lartë' | 'Urgjente';
export type Risk = 'I ulët' | 'I mesëm' | 'I lartë';
export type StatusTier = 'new' | 'review' | 'progress' | 'resolved';
export type ToneKey = 'critical' | 'warning' | 'success' | 'fresh' | 'pending' | 'reappeared';
export type ConfTier = 'high' | 'medium' | 'low';

export interface Department {
  id: DeptId;
  name: string;
}

export interface Employee {
  id: string;
  name: string;
  full: string;
  dept: DeptId;
  coverageZones: string[];
}

export interface Category {
  id: CategoryId;
  label: string;
  dept: DeptId;
  defaultPriority: Priority;
  exception: string;
}

export interface StatusMeta {
  bg: string;
  ink: string;
  dot: string;
  tier: StatusTier;
}

export interface PriorityMeta {
  color: string;
  weight: number;
}

export interface TimelineEvent {
  time: Date;
  label: string;
  kind: 'citizen' | 'system' | 'ai' | 'clerk';
}

export interface ResolutionEvidence {
  photo: string;
  note: string;
}

export interface Report {
  id: string;
  displayId: string;
  category: CategoryId;
  categoryLabel: string;
  title: string;
  description: string;
  zone: string;
  address: string;
  priority: Priority;
  status: Status;
  department: DeptId;
  departmentName: string;
  responsible: string | null;
  responsibleName: string | null;
  submittedAt: Date;
  submittedLabel: string;
  slaDeadline: Date;
  slaRemainingHours: number | null;
  slaLabel: string;
  slaBreached: boolean;
  slaAtRisk: boolean;
  citizenInitials: string;
  photo: string;
  ai: {
    suggestedPriority: Priority;
    confidence: number;
    risk: Risk;
    suggestedDepartment: string;
    rationale: string;
  };
  assignment: {
    department: DeptId;
    team: string;
    responsible: string | null;
    priority: Priority;
    deadline: Date;
    approved: boolean;
  };
  duplicateOf: string | null;
  duplicateCandidateId: string | null;
  duplicateSimilarity: number | null;
  reappeared: boolean;
  reappearedFromId: string | null;
  linkedIds: string[];
  resolutionEvidence: ResolutionEvidence[];
  timeline: TimelineEvent[];
  resolutionHours: number | null;
  firstResponseHours: number | null;
}

/** Pre-filter handed to Raportet (sinjal_incoming_filter / sinjal_report_filter). */
export interface ReportFilter {
  status?: Status;
  unassigned?: boolean;
  slaFlag?: boolean;
  done?: boolean;
  pendingClosure?: boolean;
  category?: CategoryId;
  [key: string]: unknown;
}

export interface Notification {
  id: string;
  type: 'action' | 'ai' | 'info' | 'completion' | 'system';
  group: string;
  title: string;
  body: string;
  reportId?: string;
  filter?: ReportFilter;
  time: Date;
  read: boolean;
}

export interface Automation {
  id: string;
  name: string;
  condition: string;
  action: string;
  active: boolean;
  lastRun: Date;
  affected: number;
}

export interface Activity {
  id: string;
  kind: 'resolved' | 'auto_assigned' | 'reviewed' | 'reappeared';
  reportId: string;
  minutesAgo: number;
  actor?: string;
}

export interface RoutingRule {
  id: string;
  no: number;
  category: CategoryId;
  zone: string | null;
  dept: DeptId;
  team: string;
  exception: string | null;
  active: boolean;
}

export interface TierMeta {
  label: string;
  color: string;
  bg: string;
  ink: string;
}

export type AutonomyId = 'auto' | 'auto_review' | 'threshold' | 'flag_review' | 'draft' | 'suggest';

export interface AutomationType {
  id: string;
  label: string;
  short: string;
  defaultAutonomy: AutonomyId;
  autonomyOptions: AutonomyId[];
}

export interface AutonomyMeta {
  label: string;
  color: string;
  note: string;
}

export interface ReviewDecision {
  decision: string;
  by: string;
  reason: string;
  editedText?: string;
  hoursAfterNewer?: number;
  hoursAfterSubmit?: number;
}

export interface DuplicateCandidate {
  id: string;
  a: string;
  b: string;
  dupe?: string;
  similarity: number;
  distanceM: number;
  textSim: number;
  imagesSimilar: boolean;
  autoLinked: boolean;
  decision?: ReviewDecision;
}

export interface ModerationType {
  id: string;
  label: string;
}

export interface ModerationFlag {
  id: string;
  reportId: string;
  type: string;
  confidence: number;
  excerpt: string;
  hoursAfterSubmit: number;
  decision?: ReviewDecision;
}

export interface MissingField {
  id: string;
  label: string;
}

export interface MissingInfoRequest {
  reportId: string;
  missing: string[];
  problem: string;
  message: string;
  hoursAfterSubmit: number;
  state: 'waiting' | 'answered';
  answer?: string;
  answeredHoursAfterSubmit?: number;
}

export interface SlaRule {
  id: string;
  no: number;
  condition: string;
  action: string;
  active: boolean;
}

export interface SlaTarget {
  priority: Priority;
  hours: number;
}

export interface Publication {
  id: string;
  caseIds: string[];
  hoursAgo: number;
  by: string;
  status: string;
  text: string;
}

export interface HistoricalOverride {
  kind: 'routing' | 'priority';
  reportId: string;
  from: string;
  to: string;
  by: string;
  reason: string;
  hoursAfterSubmit: number;
}

/** One closed case in the illustrative 90-day history. */
export interface HistoryRecord {
  live: false;
  id: string;
  displayId: string;
  category: CategoryId;
  dept: DeptId;
  zone: string;
  priority: Priority;
  basePriority: Priority;
  submittedAt: Date;
  slaH: number;
  assignH: number | null;
  responseH: number | null;
  startH: number | null;
  resolveH: number | null;
  status: Status;
  slaMet: boolean | null;
  reappeared: boolean;
  reopened: boolean;
  verified: boolean | null;
  responsible: string | null;
  title: string;
}

export interface ReassignLogEntry {
  at: string;
  from: string;
  to: string;
  by: string;
  reason: string;
}

export interface ReopenLogEntry {
  at: string;
  from: string;
  by: string;
  reason: string;
}

export interface AssignLogEntry {
  at: string;
  employee: string;
  by: string;
}

export interface CitizenRequest {
  at: string;
  label: string;
}

export interface InterventionNote {
  text: string;
  at: string;
}

/** Clerk edits to a live case, keyed by report id in sinjal_case_overrides. */
export interface CaseOverride {
  status?: Status;
  department?: DeptId;
  responsible?: string | null;
  priority?: Priority;
  assignLog?: AssignLogEntry[];
  reassignLog?: ReassignLogEntry[];
  reopenLog?: ReopenLogEntry[];
  escalated?: boolean;
  escalatedAt?: string | null;
  acceptedAt?: string;
  citizenRequests?: CitizenRequest[];
  notes?: (InterventionNote | string)[];
  dupDismissed?: boolean;
  [key: string]: unknown;
}

export type CaseOverrides = Record<string, CaseOverride>;

/** The unified record the performance engine computes over (history + live). */
export interface PerfRecord {
  live: boolean;
  id: string;
  displayId: string;
  title: string;
  category: CategoryId;
  dept: DeptId;
  zone: string;
  priority: Priority;
  basePriority?: Priority;
  submittedAt: Date;
  slaH: number;
  assignH: number | null;
  responseH: number | null;
  startH: number | null;
  resolveH: number | null;
  status: Status;
  slaMet: boolean | null;
  reappeared: boolean;
  reopened: boolean;
  verified: boolean | null;
  responsible: string | null;
  open: boolean;
  slaBreached: boolean;
  slaAtRisk: boolean;
}

export interface PerfFilter {
  dept?: string | null;
  category?: string | null;
  zone?: string | null;
}

export interface PerfWindow {
  from: Date;
  to: Date;
}

export interface PerfEngine {
  records(overrides?: CaseOverrides): PerfRecord[];
  window(days: number, shift?: number): PerfWindow;
  cohort(recs: PerfRecord[], f: PerfFilter, days: number, shift?: number): PerfRecord[];
  slaRate(recs: PerfRecord[], f: PerfFilter | null | undefined, days: number, shift?: number): number | null;
  avgResponse(recs: PerfRecord[], f: PerfFilter | null | undefined, days: number, shift?: number): number | null;
  avgResolution(recs: PerfRecord[], f: PerfFilter | null | undefined, days: number, shift?: number): number | null;
  newCount(recs: PerfRecord[], f: PerfFilter | null | undefined, days: number, shift?: number): number;
}
