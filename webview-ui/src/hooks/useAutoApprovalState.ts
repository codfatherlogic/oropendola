/**
 * useAutoApprovalState Hook
 *
 * Calculates effective auto-approval state based on toggles and master setting.
 * Matches Roo Code's implementation for determining if auto-approval is active.
 */

import { useMemo } from "react"
import { AutoApproveToggles } from "../types/auto-approve"

interface AutoApprovalState {
	hasEnabledOptions: boolean
	effectiveAutoApprovalEnabled: boolean
}

export function useAutoApprovalState(
	toggles: AutoApproveToggles,
	autoApprovalEnabled: boolean
): AutoApprovalState {
	return useMemo(() => {
		const hasEnabledOptions = Object.values(toggles).some((value) => value === true)

		return {
			hasEnabledOptions,
			effectiveAutoApprovalEnabled: autoApprovalEnabled,
		}
	}, [toggles, autoApprovalEnabled])
}
