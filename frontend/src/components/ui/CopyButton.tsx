import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Tooltip } from './Tooltip';

interface CopyButtonProps {
  value: string;
  label?: string;
  compact?: boolean;
}

export const CopyButton: React.FC<CopyButtonProps> = ({
  value,
  label = 'Copy',
  compact = false,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Fallback for restricted clipboard contexts
      const area = document.createElement('textarea');
      area.value = value;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      document.body.removeChild(area);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }
  };

  const btn = (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? 'Copied to clipboard' : `Copy ${label}`}
      className={`h-10 inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-secondary)] hover:text-[var(--text)] active:scale-[0.98] transition-all duration-[var(--dur-micro)] ${
        compact ? 'w-10 px-0' : 'px-3 text-[13px] font-medium'
      }`}
    >
      {copied ? (
        <Check className="w-4 h-4 text-[var(--ok)] shrink-0" aria-hidden="true" />
      ) : (
        <Copy className="w-4 h-4 shrink-0" aria-hidden="true" />
      )}
      {!compact && <span>{copied ? 'Copied' : label}</span>}
    </button>
  );

  return (
    <>
      <span className="sr-only" aria-live="polite">
        {copied ? 'Copied to clipboard' : ''}
      </span>
      {compact ? <Tooltip content={copied ? 'Copied' : label}>{btn}</Tooltip> : btn}
    </>
  );
};
