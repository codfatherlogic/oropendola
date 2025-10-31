/**
 * Branch Selector Component
 *
 * Dropdown to switch between conversation branches and manage them.
 */

import React, { useState, useRef, useEffect } from 'react'
import { GitBranch, ChevronDown, Edit2, Trash2, Check, X } from 'lucide-react'
import { ConversationBranch, BranchId } from '../../types/conversation-fork'
import './BranchSelector.css'

export interface BranchSelectorProps {
  /** All available branches */
  branches: ConversationBranch[]

  /** Currently active branch */
  activeBranchId: BranchId

  /** Callback when branch is switched */
  onSwitchBranch: (branchId: BranchId) => void

  /** Callback when branch is renamed */
  onRenameBranch?: (branchId: BranchId, newName: string) => void

  /** Callback when branch is deleted */
  onDeleteBranch?: (branchId: BranchId) => void

  /** Helper to get child branches */
  getChildBranches?: (branchId: BranchId) => ConversationBranch[]
}

export const BranchSelector: React.FC<BranchSelectorProps> = ({
  branches,
  activeBranchId,
  onSwitchBranch,
  onRenameBranch,
  onDeleteBranch,
  getChildBranches,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [editingBranchId, setEditingBranchId] = useState<BranchId | null>(null)
  const [editName, setEditName] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  const activeBranch = branches.find((b) => b.id === activeBranchId)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setEditingBranchId(null)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSwitchBranch = (branchId: BranchId) => {
    onSwitchBranch(branchId)
    setIsOpen(false)
  }

  const handleStartEdit = (branchId: BranchId, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingBranchId(branchId)
    setEditName(currentName)
  }

  const handleSaveEdit = (branchId: BranchId) => {
    if (onRenameBranch && editName.trim()) {
      onRenameBranch(branchId, editName.trim())
    }
    setEditingBranchId(null)
    setEditName('')
  }

  const handleCancelEdit = () => {
    setEditingBranchId(null)
    setEditName('')
  }

  const handleDelete = (branchId: BranchId, e: React.MouseEvent) => {
    e.stopPropagation()
    if (onDeleteBranch && confirm('Delete this branch and all its children?')) {
      onDeleteBranch(branchId)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, branchId: BranchId) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSaveEdit(branchId)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancelEdit()
    }
  }

  // Group branches by parent
  const rootBranches = branches.filter((b) => b.parentId === null)
  const branchTree = getChildBranches
    ? buildBranchTree(rootBranches, branches, getChildBranches)
    : rootBranches

  return (
    <div className="branch-selector" ref={dropdownRef}>
      <button className="branch-selector-trigger" onClick={() => setIsOpen(!isOpen)}>
        <GitBranch size={16} />
        <span className="branch-selector-name">{activeBranch?.name || 'Main'}</span>
        {branches.length > 1 && <span className="branch-selector-count">({branches.length})</span>}
        <ChevronDown size={14} className={`branch-selector-chevron ${isOpen ? 'open' : ''}`} />
      </button>

      {isOpen && (
        <div className="branch-selector-dropdown">
          <div className="branch-selector-list">
            {branchTree.map((item) => (
              <BranchItem
                key={item.branch.id}
                item={item}
                activeBranchId={activeBranchId}
                editingBranchId={editingBranchId}
                editName={editName}
                onSetEditName={setEditName}
                onSwitch={handleSwitchBranch}
                onStartEdit={handleStartEdit}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={handleCancelEdit}
                onDelete={handleDelete}
                onKeyDown={handleKeyDown}
                canRename={!!onRenameBranch}
                canDelete={!!onDeleteBranch}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface BranchTreeItem {
  branch: ConversationBranch
  children: BranchTreeItem[]
  depth: number
}

function buildBranchTree(
  branches: ConversationBranch[],
  allBranches: ConversationBranch[],
  getChildBranches: (id: BranchId) => ConversationBranch[],
  depth: number = 0
): BranchTreeItem[] {
  return branches.map((branch) => ({
    branch,
    children: buildBranchTree(getChildBranches(branch.id), allBranches, getChildBranches, depth + 1),
    depth,
  }))
}

interface BranchItemProps {
  item: BranchTreeItem
  activeBranchId: BranchId
  editingBranchId: BranchId | null
  editName: string
  onSetEditName: (name: string) => void
  onSwitch: (id: BranchId) => void
  onStartEdit: (id: BranchId, name: string, e: React.MouseEvent) => void
  onSaveEdit: (id: BranchId) => void
  onCancelEdit: () => void
  onDelete: (id: BranchId, e: React.MouseEvent) => void
  onKeyDown: (e: React.KeyboardEvent, id: BranchId) => void
  canRename: boolean
  canDelete: boolean
}

const BranchItem: React.FC<BranchItemProps> = ({
  item,
  activeBranchId,
  editingBranchId,
  editName,
  onSetEditName,
  onSwitch,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onKeyDown,
  canRename,
  canDelete,
}) => {
  const isActive = item.branch.id === activeBranchId
  const isEditing = editingBranchId === item.branch.id
  const isRoot = item.branch.parentId === null

  return (
    <>
      <div
        className={`branch-selector-item ${isActive ? 'active' : ''}`}
        style={{ paddingLeft: `${12 + item.depth * 20}px` }}
        onClick={() => !isEditing && onSwitch(item.branch.id)}
      >
        <GitBranch size={14} className="branch-selector-item-icon" />

        {isEditing ? (
          <div className="branch-selector-item-edit" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              className="branch-selector-item-input"
              value={editName}
              onChange={(e) => onSetEditName(e.target.value)}
              onKeyDown={(e) => onKeyDown(e, item.branch.id)}
              autoFocus
            />
            <button
              className="branch-selector-item-action"
              onClick={() => onSaveEdit(item.branch.id)}
              title="Save"
            >
              <Check size={12} />
            </button>
            <button className="branch-selector-item-action" onClick={onCancelEdit} title="Cancel">
              <X size={12} />
            </button>
          </div>
        ) : (
          <>
            <span className="branch-selector-item-name">{item.branch.name}</span>
            <div className="branch-selector-item-actions">
              {canRename && (
                <button
                  className="branch-selector-item-action"
                  onClick={(e) => onStartEdit(item.branch.id, item.branch.name, e)}
                  title="Rename branch"
                >
                  <Edit2 size={12} />
                </button>
              )}
              {canDelete && !isRoot && (
                <button
                  className="branch-selector-item-action branch-selector-item-delete"
                  onClick={(e) => onDelete(item.branch.id, e)}
                  title="Delete branch"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {item.children.map((child) => (
        <BranchItem
          key={child.branch.id}
          item={child}
          activeBranchId={activeBranchId}
          editingBranchId={editingBranchId}
          editName={editName}
          onSetEditName={onSetEditName}
          onSwitch={onSwitch}
          onStartEdit={onStartEdit}
          onSaveEdit={onSaveEdit}
          onCancelEdit={onCancelEdit}
          onDelete={onDelete}
          onKeyDown={onKeyDown}
          canRename={canRename}
          canDelete={canDelete}
        />
      ))}
    </>
  )
}

BranchSelector.displayName = 'BranchSelector'
