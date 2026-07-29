interface LoggingStatusIndicatorProps {
  enabled: boolean
}

/** Small always-visible badge so it's obvious whether logging is on, without opening Settings to check. */
export function LoggingStatusIndicator({ enabled }: LoggingStatusIndicatorProps): JSX.Element {
  return (
    <span
      title={enabled ? 'Logging is enabled' : 'Logging is disabled'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '11px',
        color: enabled ? 'var(--color-accent)' : 'var(--color-text-muted)',
        marginLeft: 'auto',
        paddingRight: 'var(--spacing-3)'
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: enabled ? 'var(--color-accent)' : 'var(--color-text-muted)',
          display: 'inline-block'
        }}
      />
      {enabled ? 'Logging on' : 'Logging off'}
    </span>
  )
}
