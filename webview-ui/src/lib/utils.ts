import { clsx, type ClassValue } from "clsx"

// Simple className utility without tailwind-merge
export function cn(...inputs: ClassValue[]) {
	return clsx(inputs)
}
