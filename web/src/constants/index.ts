// =============================================================================
// ResolveAgent WebUI - Constants
// =============================================================================

/** Base URL for the platform API. */
export const API_BASE_URL = "http://localhost:8080";

/** API version prefix for all REST endpoints. */
export const API_VERSION = "/api/v1";

/** Agent status enum values. */
export const AGENT_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  ERROR: "error",
} as const;

/** Workflow status enum values. */
export const WORKFLOW_STATUS = {
  DRAFT: "draft",
  ACTIVE: "active",
  ARCHIVED: "archived",
} as const;

/** Skill status enum values. */
export const SKILL_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
} as const;

/** Default pagination page size. */
export const DEFAULT_PAGE_SIZE = 20;

/** WebSocket reconnect interval in milliseconds. */
export const WS_RECONNECT_INTERVAL = 3000;
