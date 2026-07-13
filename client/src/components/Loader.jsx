import clsx from 'clsx';

/**
 * The app's loading vocabulary. One place for every "we're working" state so
 * spinners, bars and skeletons all read as the same blue-and-white system.
 */

const SPINNER_SIZES = {
  xs: 'h-3.5 w-3.5 border-[1.5px]',
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-[3px]',
};

/**
 * Ring spinner: a soft blue track with one bright arc sweeping around it.
 *
 * @param {{size?: 'xs'|'sm'|'md'|'lg', className?: string}} props
 */
export function Spinner({ size = 'sm', className }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={clsx(
        'inline-block animate-spin rounded-full border-brand-200 border-t-brand-600',
        SPINNER_SIZES[size],
        className
      )}
    />
  );
}

/**
 * Three bouncing dots — for inline "still thinking" text where a ring would
 * feel too heavy.
 */
export function Dots({ className }) {
  return (
    <span className={clsx('inline-flex items-center gap-1', className)} role="status" aria-label="Loading">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-bounce-dot rounded-full bg-brand-500"
          style={{ animationDelay: `${i * 0.16}s` }}
        />
      ))}
    </span>
  );
}

/**
 * Progress bar. Pass `value` (0–100) for a real percentage, or omit it for an
 * indeterminate sweep when the duration is unknown.
 *
 * @param {{value?: number, className?: string}} props
 */
export function ProgressBar({ value, className }) {
  const indeterminate = value === undefined || value === null;
  return (
    <div
      className={clsx('h-1.5 w-full overflow-hidden rounded-full bg-brand-100', className)}
      role="progressbar"
      aria-valuenow={indeterminate ? undefined : Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {indeterminate ? (
        <div className="h-full w-full animate-progress-indeterminate rounded-full bg-brand-gradient" />
      ) : (
        <div
          className="relative h-full rounded-full bg-brand-gradient transition-[width] duration-700 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        >
          <span className="absolute inset-0 animate-shimmer bg-sheen" />
        </div>
      )}
    </div>
  );
}

/**
 * Circular percentage ring — the headline progress indicator for a batch.
 *
 * @param {{value: number, size?: number, stroke?: number, children?: React.ReactNode}} props
 */
export function ProgressRing({ value = 0, size = 132, stroke = 8, children }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, value));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Expanding halo — makes the ring feel alive while the API is slow. */}
      <span className="absolute inset-0 animate-pulse-ring rounded-full bg-brand-400/20" />

      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#60a5fa" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#dbeafe"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#ring-gradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

/**
 * Shimmering placeholder block. Compose these into the shape of the content
 * that is about to arrive.
 */
export function Skeleton({ className }) {
  return <div className={clsx('skeleton rounded-xl', className)} />;
}

export default Spinner;
