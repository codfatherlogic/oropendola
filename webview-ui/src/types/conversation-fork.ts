/**
 * Conversation Fork Types
 *
 * Enables branching conversations at any point to explore different approaches.
 */

import { ClineMessage } from './cline-message'

/**
 * Unique identifier for a branch
 */
export type BranchId = string

/**
 * Branch metadata
 */
export interface ConversationBranch {
  /** Unique branch ID */
  id: BranchId

  /** Human-readable branch name */
  name: string

  /** Parent branch ID (null for root branch) */
  parentId: BranchId | null

  /** Message timestamp where this branch forked from parent */
  forkPointTs: number | null

  /** Messages in this branch (from start of conversation to current) */
  messages: ClineMessage[]

  /** Timestamp when branch was created */
  createdAt: number

  /** Timestamp when branch was last active */
  lastActiveAt: number
}

/**
 * Fork point visualization marker
 */
export interface ForkPoint {
  /** Message timestamp where fork occurred */
  messageTs: number

  /** Branch IDs that forked from this point */
  branchIds: BranchId[]
}

/**
 * Fork state management
 */
export interface ForkState {
  /** All branches in the conversation tree */
  branches: Map<BranchId, ConversationBranch>

  /** Currently active branch */
  activeBranchId: BranchId

  /** Fork points mapped by message timestamp */
  forkPoints: Map<number, ForkPoint>
}

/**
 * Fork action types
 */
export interface ForkActions {
  /** Create a new branch from a specific message */
  createFork: (messageTs: number, branchName?: string) => Promise<BranchId>

  /** Switch to a different branch */
  switchBranch: (branchId: BranchId) => Promise<void>

  /** Rename a branch */
  renameBranch: (branchId: BranchId, newName: string) => Promise<void>

  /** Delete a branch (and all its children) */
  deleteBranch: (branchId: BranchId) => Promise<void>

  /** Merge a branch into another branch */
  mergeBranch?: (sourceBranchId: BranchId, targetBranchId: BranchId) => Promise<void>

  /** Get all child branches of a branch */
  getChildBranches: (branchId: BranchId) => ConversationBranch[]

  /** Get the branch path from root to a specific branch */
  getBranchPath: (branchId: BranchId) => BranchId[]
}

/**
 * Serializable fork state for storage
 */
export interface SerializableForkState {
  branches: Array<[BranchId, ConversationBranch]>
  activeBranchId: BranchId
  forkPoints: Array<[number, ForkPoint]>
}
