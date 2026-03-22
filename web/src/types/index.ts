// Agent types
export type AgentType = 'mega' | 'skill' | 'fta' | 'rag' | 'custom';
export type AgentStatus = 'active' | 'inactive' | 'error';
export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed';

// Route types from Intelligent Selector
export type RouteType = 'fta' | 'skill' | 'rag' | 'multi' | 'direct';

export interface RouteDecision {
  route_type: RouteType;
  route_target: string;
  confidence: number;
  parameters: Record<string, unknown>;
  reasoning: string;
}

// FTA types
export type GateType = 'AND' | 'OR' | 'VOTING' | 'INHIBIT' | 'PRIORITY_AND';
export type EventType = 'top' | 'intermediate' | 'basic' | 'undeveloped';

export interface FTAEvent {
  id: string;
  name: string;
  description: string;
  type: EventType;
  evaluator: string;
  parameters: Record<string, unknown>;
}

export interface FTAGate {
  id: string;
  name: string;
  type: GateType;
  input_ids: string[];
  output_id: string;
  k_value?: number;
}

export interface FaultTree {
  id: string;
  name: string;
  top_event_id: string;
  events: FTAEvent[];
  gates: FTAGate[];
}

// Skill types
export interface SkillManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  entry_point: string;
  inputs: SkillParameter[];
  outputs: SkillParameter[];
  permissions: SkillPermissions;
}

export interface SkillParameter {
  name: string;
  type: string;
  description: string;
  required: boolean;
}

export interface SkillPermissions {
  network_access: boolean;
  file_system_read: boolean;
  file_system_write: boolean;
  timeout_seconds: number;
}
