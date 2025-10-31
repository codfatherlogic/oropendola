/**
 * Conversation Fork State Management Hook
 *
 * Provides state and actions for managing conversation branches.
 */

import { useState, useCallback, useMemo } from 'react'
import { ClineMessage } from '../types/cline-message'
import {
  BranchId,
  ConversationBranch,
  ForkPoint,
  ForkState,
  ForkActions,
  SerializableForkState,
} from '../types/conversation-fork'

const ROOT_BRANCH_ID = 'root'

/**
 * Initialize fork state with a root branch
 */
function initializeForkState(initialMessages: ClineMessage[] = []): ForkState {
  const rootBranch: ConversationBranch = {
    id: ROOT_BRANCH_ID,
    name: 'Main',
    parentId: null,
    forkPointTs: null,
    messages: initialMessages,
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
  }

  return {
    branches: new Map([[ROOT_BRANCH_ID, rootBranch]]),
    activeBranchId: ROOT_BRANCH_ID,
    forkPoints: new Map(),
  }
}

/**
 * Generate a unique branch ID
 */
function generateBranchId(): BranchId {
  return `branch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Get default branch name based on count
 */
function getDefaultBranchName(existingBranches: Map<BranchId, ConversationBranch>): string {
  const branchCount = existingBranches.size
  return `Branch ${branchCount}`
}

/**
 * Save fork state to localStorage
 */
function saveForkState(state: ForkState): void {
  try {
    const serializable: SerializableForkState = {
      branches: Array.from(state.branches.entries()),
      activeBranchId: state.activeBranchId,
      forkPoints: Array.from(state.forkPoints.entries()),
    }
    localStorage.setItem('conversationForks', JSON.stringify(serializable))
  } catch (err) {
    console.error('[Fork] Failed to save fork state:', err)
  }
}

/**
 * Load fork state from localStorage
 */
function loadForkState(): ForkState | null {
  try {
    const stored = localStorage.getItem('conversationForks')
    if (!stored) return null

    const serializable: SerializableForkState = JSON.parse(stored)
    return {
      branches: new Map(serializable.branches),
      activeBranchId: serializable.activeBranchId,
      forkPoints: new Map(serializable.forkPoints),
    }
  } catch (err) {
    console.error('[Fork] Failed to load fork state:', err)
    return null
  }
}

/**
 * Hook for managing conversation forks
 */
export function useConversationForks(initialMessages: ClineMessage[] = []) {
  // Initialize state (try to load from storage first)
  const [forkState, setForkState] = useState<ForkState>(() => {
    const loaded = loadForkState()
    return loaded || initializeForkState(initialMessages)
  })

  // Get current active branch
  const activeBranch = useMemo(() => {
    return forkState.branches.get(forkState.activeBranchId)
  }, [forkState.branches, forkState.activeBranchId])

  // Get messages for current branch
  const messages = useMemo(() => {
    return activeBranch?.messages || []
  }, [activeBranch])

  /**
   * Create a new fork from a specific message
   */
  const createFork = useCallback(
    async (messageTs: number, branchName?: string): Promise<BranchId> => {
      return new Promise((resolve) => {
        setForkState((prev) => {
          const currentBranch = prev.branches.get(prev.activeBranchId)
          if (!currentBranch) {
            console.error('[Fork] Cannot create fork: no active branch')
            resolve(prev.activeBranchId)
            return prev
          }

          // Find the fork point in the current branch's messages
          const forkPointIndex = currentBranch.messages.findIndex((m) => m.ts === messageTs)
          if (forkPointIndex === -1) {
            console.error('[Fork] Cannot create fork: message not found')
            resolve(prev.activeBranchId)
            return prev
          }

          // Create new branch with messages up to fork point
          const newBranchId = generateBranchId()
          const newBranch: ConversationBranch = {
            id: newBranchId,
            name: branchName || getDefaultBranchName(prev.branches),
            parentId: prev.activeBranchId,
            forkPointTs: messageTs,
            messages: currentBranch.messages.slice(0, forkPointIndex + 1),
            createdAt: Date.now(),
            lastActiveAt: Date.now(),
          }

          // Update fork points
          const newForkPoints = new Map(prev.forkPoints)
          const existingForkPoint = newForkPoints.get(messageTs)
          if (existingForkPoint) {
            existingForkPoint.branchIds.push(newBranchId)
          } else {
            newForkPoints.set(messageTs, {
              messageTs,
              branchIds: [newBranchId],
            })
          }

          // Create new state
          const newBranches = new Map(prev.branches)
          newBranches.set(newBranchId, newBranch)

          const newState: ForkState = {
            branches: newBranches,
            activeBranchId: newBranchId, // Switch to new branch
            forkPoints: newForkPoints,
          }

          // Persist to storage
          saveForkState(newState)

          console.log(`[Fork] Created new branch: ${newBranch.name} (${newBranchId})`)
          resolve(newBranchId)
          return newState
        })
      })
    },
    []
  )

  /**
   * Switch to a different branch
   */
  const switchBranch = useCallback(async (branchId: BranchId): Promise<void> => {
    setForkState((prev) => {
      const targetBranch = prev.branches.get(branchId)
      if (!targetBranch) {
        console.error(`[Fork] Cannot switch to branch: ${branchId} not found`)
        return prev
      }

      // Update last active timestamp for new branch
      const updatedBranch: ConversationBranch = {
        ...targetBranch,
        lastActiveAt: Date.now(),
      }

      const newBranches = new Map(prev.branches)
      newBranches.set(branchId, updatedBranch)

      const newState: ForkState = {
        ...prev,
        branches: newBranches,
        activeBranchId: branchId,
      }

      // Persist to storage
      saveForkState(newState)

      console.log(`[Fork] Switched to branch: ${targetBranch.name} (${branchId})`)
      return newState
    })
  }, [])

  /**
   * Rename a branch
   */
  const renameBranch = useCallback(async (branchId: BranchId, newName: string): Promise<void> => {
    setForkState((prev) => {
      const branch = prev.branches.get(branchId)
      if (!branch) {
        console.error(`[Fork] Cannot rename branch: ${branchId} not found`)
        return prev
      }

      const updatedBranch: ConversationBranch = {
        ...branch,
        name: newName,
      }

      const newBranches = new Map(prev.branches)
      newBranches.set(branchId, updatedBranch)

      const newState: ForkState = {
        ...prev,
        branches: newBranches,
      }

      // Persist to storage
      saveForkState(newState)

      console.log(`[Fork] Renamed branch ${branchId} to: ${newName}`)
      return newState
    })
  }, [])

  /**
   * Delete a branch and all its descendants
   */
  const deleteBranch = useCallback(async (branchId: BranchId): Promise<void> => {
    setForkState((prev) => {
      // Cannot delete root branch
      if (branchId === ROOT_BRANCH_ID) {
        console.error('[Fork] Cannot delete root branch')
        return prev
      }

      const branch = prev.branches.get(branchId)
      if (!branch) {
        console.error(`[Fork] Cannot delete branch: ${branchId} not found`)
        return prev
      }

      // Find all descendant branches (recursive)
      const branchesToDelete = new Set<BranchId>([branchId])
      const findDescendants = (parentId: BranchId) => {
        prev.branches.forEach((b) => {
          if (b.parentId === parentId) {
            branchesToDelete.add(b.id)
            findDescendants(b.id)
          }
        })
      }
      findDescendants(branchId)

      // Remove branches
      const newBranches = new Map(prev.branches)
      branchesToDelete.forEach((id) => newBranches.delete(id))

      // Update fork points
      const newForkPoints = new Map(prev.forkPoints)
      if (branch.forkPointTs !== null) {
        const forkPoint = newForkPoints.get(branch.forkPointTs)
        if (forkPoint) {
          forkPoint.branchIds = forkPoint.branchIds.filter((id) => !branchesToDelete.has(id))
          if (forkPoint.branchIds.length === 0) {
            newForkPoints.delete(branch.forkPointTs)
          }
        }
      }

      // If active branch was deleted, switch to parent or root
      let newActiveBranchId = prev.activeBranchId
      if (branchesToDelete.has(prev.activeBranchId)) {
        newActiveBranchId = branch.parentId || ROOT_BRANCH_ID
      }

      const newState: ForkState = {
        branches: newBranches,
        activeBranchId: newActiveBranchId,
        forkPoints: newForkPoints,
      }

      // Persist to storage
      saveForkState(newState)

      console.log(`[Fork] Deleted branch ${branchId} and ${branchesToDelete.size - 1} descendants`)
      return newState
    })
  }, [])

  /**
   * Get all child branches of a branch
   */
  const getChildBranches = useCallback(
    (branchId: BranchId): ConversationBranch[] => {
      const children: ConversationBranch[] = []
      forkState.branches.forEach((branch) => {
        if (branch.parentId === branchId) {
          children.push(branch)
        }
      })
      return children.sort((a, b) => b.lastActiveAt - a.lastActiveAt)
    },
    [forkState.branches]
  )

  /**
   * Get the branch path from root to a specific branch
   */
  const getBranchPath = useCallback(
    (branchId: BranchId): BranchId[] => {
      const path: BranchId[] = []
      let currentId: BranchId | null = branchId

      while (currentId !== null) {
        path.unshift(currentId)
        const branch = forkState.branches.get(currentId)
        currentId = branch?.parentId || null
      }

      return path
    },
    [forkState.branches]
  )

  /**
   * Update messages in active branch
   */
  const updateBranchMessages = useCallback((messages: ClineMessage[]) => {
    setForkState((prev) => {
      const currentBranch = prev.branches.get(prev.activeBranchId)
      if (!currentBranch) return prev

      const updatedBranch: ConversationBranch = {
        ...currentBranch,
        messages,
        lastActiveAt: Date.now(),
      }

      const newBranches = new Map(prev.branches)
      newBranches.set(prev.activeBranchId, updatedBranch)

      const newState: ForkState = {
        ...prev,
        branches: newBranches,
      }

      // Persist to storage
      saveForkState(newState)

      return newState
    })
  }, [])

  /**
   * Clear all forks and reset to root branch
   */
  const clearForks = useCallback(() => {
    setForkState(initializeForkState([]))
    localStorage.removeItem('conversationForks')
    console.log('[Fork] Cleared all forks')
  }, [])

  // Fork actions interface
  const forkActions: ForkActions = {
    createFork,
    switchBranch,
    renameBranch,
    deleteBranch,
    getChildBranches,
    getBranchPath,
  }

  return {
    // State
    forkState,
    activeBranch,
    messages,

    // Actions
    ...forkActions,
    updateBranchMessages,
    clearForks,

    // Derived data
    hasForks: forkState.branches.size > 1,
    branchCount: forkState.branches.size,
    allBranches: Array.from(forkState.branches.values()),
  }
}
