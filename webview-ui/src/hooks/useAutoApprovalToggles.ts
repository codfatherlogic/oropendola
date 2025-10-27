/**
 * useAutoApprovalToggles Hook
 *
 * Aggregates 10 auto-approval toggle values from ChatContext.
 * Matches Roo Code's implementation for retrieving current toggle states.
 */

import { useMemo } from "react"
import { useChatContext } from "../context/ChatContext"
import { AutoApproveToggles } from "../types/auto-approve"

export function useAutoApprovalToggles(): AutoApproveToggles {
	const { autoApproveToggles } = useChatContext()

	return useMemo(
		() => ({
			alwaysAllowReadOnly: autoApproveToggles.alwaysAllowReadOnly ?? false,
			alwaysAllowWrite: autoApproveToggles.alwaysAllowWrite ?? false,
			alwaysAllowExecute: autoApproveToggles.alwaysAllowExecute ?? false,
			alwaysAllowBrowser: autoApproveToggles.alwaysAllowBrowser ?? false,
			alwaysAllowMcp: autoApproveToggles.alwaysAllowMcp ?? false,
			alwaysAllowModeSwitch: autoApproveToggles.alwaysAllowModeSwitch ?? false,
			alwaysAllowSubtasks: autoApproveToggles.alwaysAllowSubtasks ?? false,
			alwaysApproveResubmit: autoApproveToggles.alwaysApproveResubmit ?? false,
			alwaysAllowFollowupQuestions:
				autoApproveToggles.alwaysAllowFollowupQuestions ?? false,
			alwaysAllowUpdateTodoList:
				autoApproveToggles.alwaysAllowUpdateTodoList ?? false,
		}),
		[autoApproveToggles]
	)
}
