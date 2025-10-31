/**
 * Sound Notifications Hook
 *
 * Provides audio feedback for important events using Web Audio API.
 * Includes notification sounds for task completion, approvals, errors, etc.
 */

import { useCallback, useRef, useEffect, useState } from 'react'

export type SoundType =
  | 'taskComplete'
  | 'taskStart'
  | 'approvalNeeded'
  | 'error'
  | 'success'
  | 'notification'
  | 'message'

export interface SoundOptions {
  /** Volume (0-1) */
  volume?: number
  /** Whether sounds are enabled */
  enabled?: boolean
}

export interface UseSoundNotificationsResult {
  /** Play a notification sound */
  playSound: (type: SoundType) => void
  /** Enable/disable sounds */
  setEnabled: (enabled: boolean) => void
  /** Set volume (0-1) */
  setVolume: (volume: number) => void
  /** Whether sounds are enabled */
  enabled: boolean
  /** Current volume */
  volume: number
}

/**
 * Generate a tone using Web Audio API
 */
function generateTone(
  audioContext: AudioContext,
  frequency: number,
  duration: number,
  volume: number = 0.3
): void {
  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)

  oscillator.frequency.value = frequency
  oscillator.type = 'sine'

  // Envelope for smooth attack and release
  const now = audioContext.currentTime
  gainNode.gain.setValueAtTime(0, now)
  gainNode.gain.linearRampToValueAtTime(volume, now + 0.01) // Attack
  gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration) // Decay

  oscillator.start(now)
  oscillator.stop(now + duration)
}

/**
 * Play a notification sound pattern
 */
function playNotificationPattern(
  audioContext: AudioContext,
  pattern: Array<{ frequency: number; duration: number; delay: number }>,
  volume: number
): void {
  let currentTime = 0

  pattern.forEach(({ frequency, duration, delay }) => {
    setTimeout(() => {
      generateTone(audioContext, frequency, duration / 1000, volume)
    }, currentTime)
    currentTime += delay
  })
}

/**
 * Sound patterns for different notification types
 */
const SOUND_PATTERNS: Record<SoundType, Array<{ frequency: number; duration: number; delay: number }>> = {
  taskComplete: [
    { frequency: 523.25, duration: 100, delay: 0 },    // C5
    { frequency: 659.25, duration: 100, delay: 100 },  // E5
    { frequency: 783.99, duration: 200, delay: 200 },  // G5
  ],
  taskStart: [
    { frequency: 440, duration: 100, delay: 0 },       // A4
    { frequency: 523.25, duration: 100, delay: 100 },  // C5
  ],
  approvalNeeded: [
    { frequency: 659.25, duration: 150, delay: 0 },    // E5
    { frequency: 659.25, duration: 150, delay: 200 },  // E5 (repeat)
  ],
  error: [
    { frequency: 392, duration: 200, delay: 0 },       // G4 (low)
    { frequency: 349.23, duration: 300, delay: 200 },  // F4 (lower)
  ],
  success: [
    { frequency: 523.25, duration: 100, delay: 0 },    // C5
    { frequency: 783.99, duration: 200, delay: 100 },  // G5
  ],
  notification: [
    { frequency: 800, duration: 100, delay: 0 },       // High beep
  ],
  message: [
    { frequency: 440, duration: 80, delay: 0 },        // Quick A4
  ],
}

/**
 * Hook for playing sound notifications
 */
export function useSoundNotifications(options: SoundOptions = {}): UseSoundNotificationsResult {
  const [enabled, setEnabled] = useState(() => {
    // Load from localStorage
    const stored = localStorage.getItem('soundNotificationsEnabled')
    return stored !== null ? stored === 'true' : (options.enabled ?? true)
  })

  const [volume, setVolumeState] = useState(() => {
    // Load from localStorage
    const stored = localStorage.getItem('soundNotificationsVolume')
    return stored !== null ? parseFloat(stored) : (options.volume ?? 0.3)
  })

  const audioContextRef = useRef<AudioContext | null>(null)

  // Initialize Audio Context on first interaction
  useEffect(() => {
    const initAudioContext = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
    }

    // Audio Context must be created after user interaction
    window.addEventListener('click', initAudioContext, { once: true })
    window.addEventListener('keydown', initAudioContext, { once: true })

    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close()
      }
    }
  }, [])

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('soundNotificationsEnabled', String(enabled))
  }, [enabled])

  useEffect(() => {
    localStorage.setItem('soundNotificationsVolume', String(volume))
  }, [volume])

  /**
   * Play a notification sound
   */
  const playSound = useCallback(
    (type: SoundType) => {
      if (!enabled) return

      // Initialize audio context if needed
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }

      const audioContext = audioContextRef.current

      // Resume audio context if suspended (required by some browsers)
      if (audioContext.state === 'suspended') {
        audioContext.resume()
      }

      const pattern = SOUND_PATTERNS[type]
      if (pattern) {
        playNotificationPattern(audioContext, pattern, volume)
      }
    },
    [enabled, volume]
  )

  /**
   * Set volume with validation
   */
  const setVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume))
    setVolumeState(clampedVolume)
  }, [])

  return {
    playSound,
    setEnabled,
    setVolume,
    enabled,
    volume,
  }
}

/**
 * Play a sound without using the hook (for one-off uses)
 */
export function playOneTimeSound(type: SoundType, volume: number = 0.3): void {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  const pattern = SOUND_PATTERNS[type]

  if (pattern) {
    playNotificationPattern(audioContext, pattern, volume)
  }

  // Close context after playback
  setTimeout(() => {
    audioContext.close()
  }, 1000)
}
