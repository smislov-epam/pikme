import type { ToastApi, ToastOptions } from './ToastContext'

let api: ToastApi | null = null

export function setToastApi(next: ToastApi | null): void {
  api = next
}

export const toast = {
  show(options: ToastOptions) {
    api?.show(options)
  },
  success(message: string, options?: Omit<ToastOptions, 'message' | 'severity'>) {
    api?.success(message, options)
  },
  info(message: string, options?: Omit<ToastOptions, 'message' | 'severity'>) {
    api?.info(message, options)
  },
  warning(message: string, options?: Omit<ToastOptions, 'message' | 'severity'>) {
    api?.warning(message, options)
  },
  error(message: string, options?: Omit<ToastOptions, 'message' | 'severity'>) {
    api?.error(message, options)
  },
}
