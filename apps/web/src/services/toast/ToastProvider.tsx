import {
  Alert,
  Button,
  IconButton,
  Snackbar,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ToastApi, ToastOptions, ToastSeverity } from './ToastContext'
import { ToastContext } from './ToastContext'
import { setToastApi } from './toastService'


function defaultAutoHideMs(severity: ToastSeverity) {
  switch (severity) {
    case 'success':
      return 2500
    case 'info':
      return 3000
    case 'warning':
      return 4500
    case 'error':
      return 6000
    default:
      return 3000
  }
}

type QueuedToast = {
  id: number
  message: string
  severity: ToastSeverity
  autoHideMs: number
  actionLabel?: string
  onAction?: () => void
}

export function ToastProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [current, setCurrent] = useState<QueuedToast | null>(null)
  const queueRef = useRef<QueuedToast[]>([])
  const nextIdRef = useRef(1)

  const visibleToast: QueuedToast =
    current ??
    ({
      id: 0,
      message: '',
      severity: 'info',
      autoHideMs: defaultAutoHideMs('info'),
    } satisfies QueuedToast)

  const showNext = useCallback(() => {
    const next = queueRef.current.shift() ?? null
    setCurrent(next)
  }, [])

  const show = useCallback(
    (options: ToastOptions) => {
      const severity = options.severity ?? 'info'
      const toast: QueuedToast = {
        id: nextIdRef.current++,
        message: options.message,
        severity,
        autoHideMs: options.autoHideMs ?? defaultAutoHideMs(severity),
        actionLabel: options.actionLabel,
        onAction: options.onAction,
      }

      if (!current) {
        setCurrent(toast)
        return
      }

      // Keep the queue bounded so we don't spam toasts.
      if (queueRef.current.length >= 2) {
        queueRef.current.shift()
      }
      queueRef.current.push(toast)
    },
    [current]
  )

  const api = useMemo<ToastApi>(() => {
    return {
      show,
      success: (message, options) => show({ message, severity: 'success', ...options }),
      info: (message, options) => show({ message, severity: 'info', ...options }),
      warning: (message, options) => show({ message, severity: 'warning', ...options }),
      error: (message, options) => show({ message, severity: 'error', ...options }),
    }
  }, [show])

  useEffect(() => {
    setToastApi(api)
    return () => setToastApi(null)
  }, [api])

  const handleClose = useCallback(() => {
    setCurrent(null)
  }, [])

  const handleAction = useCallback(() => {
    const onAction = current?.onAction
    try {
      onAction?.()
    } finally {
      setCurrent(null)
    }
  }, [current])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <Snackbar
        key={current?.id ?? 0}
        open={!!current}
        autoHideDuration={visibleToast.autoHideMs}
        onClose={handleClose}
        TransitionProps={{ onExited: showNext }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{
          mb: { xs: 9, sm: 3 },
          width: '100%',
          '& .MuiPaper-root': {
            width: '100%',
            maxWidth: 680,
          },
        }}
      >
        <Alert
          severity={visibleToast.severity}
          variant="filled"
          action={
            <>
              {visibleToast.actionLabel && visibleToast.onAction ? (
                <Button
                  color="inherit"
                  size="small"
                  onClick={handleAction}
                  sx={{
                    minWidth: 72,
                    height: 36,
                    borderRadius: 1,
                    px: 1.25,
                    fontWeight: 700,
                  }}
                >
                  {visibleToast.actionLabel}
                </Button>
              ) : null}
              <IconButton
                aria-label="Dismiss notification"
                color="inherit"
                size="small"
                onClick={handleClose}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </>
          }
          sx={(theme) => ({
            width: '100%',
            borderRadius: 1,
            px: 2,
            py: 1.25,
            boxShadow: theme.shadows[6],
            fontSize: '0.95rem',
            lineHeight: 1.35,
            '& .MuiAlert-icon': {
              alignItems: 'center',
              py: 0.25,
            },
            '& .MuiAlert-action': {
              alignItems: 'center',
              pt: 0,
            },
          })}
        >
          {visibleToast.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  )
}
