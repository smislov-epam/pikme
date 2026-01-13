import type { AlertColor } from '@mui/material'
import { createContext, useContext } from 'react'

export type ToastSeverity = AlertColor

export interface ToastOptions {
  message: string
  severity?: ToastSeverity
  autoHideMs?: number
  actionLabel?: string
  onAction?: () => void
}

export interface ToastApi {
  show: (options: ToastOptions) => void
  success: (
    message: string,
    options?: Omit<ToastOptions, 'message' | 'severity'>
  ) => void
  info: (
    message: string,
    options?: Omit<ToastOptions, 'message' | 'severity'>
  ) => void
  warning: (
    message: string,
    options?: Omit<ToastOptions, 'message' | 'severity'>
  ) => void
  error: (
    message: string,
    options?: Omit<ToastOptions, 'message' | 'severity'>
  ) => void
}

export const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within <ToastProvider>')
  }
  return ctx
}
