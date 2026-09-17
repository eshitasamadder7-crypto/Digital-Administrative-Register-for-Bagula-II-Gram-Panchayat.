import { useState, forwardRef } from "react";
import { Eye, EyeOff } from "lucide-react";

interface MaskedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  visibleSuffix?: number; // chars left visible at end when masked
}

/**
 * MaskedInput — visually masks the value (Aadhaar / mobile) while keeping the
 * real value in the underlying state. Shows last `visibleSuffix` chars in clear.
 * Toggle eye icon to temporarily reveal full value.
 */
const MaskedInput = forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ visibleSuffix = 4, value, onChange, className = "", ...rest }, ref) => {
    const [revealed, setRevealed] = useState(false);
    const [focused, setFocused] = useState(false);
    const raw = String(value ?? "");

    const masked = raw.length <= visibleSuffix
      ? raw
      : "•".repeat(raw.length - visibleSuffix) + raw.slice(-visibleSuffix);

    // While focused or revealed → show real text input. Otherwise show masked text overlay.
    const showReal = revealed || focused;

    const blockWhenMasked = (e: React.ClipboardEvent<HTMLInputElement>) => {
      if (!revealed) {
        e.preventDefault();
        try { e.clipboardData?.setData("text/plain", ""); } catch { /* noop */ }
      }
    };

    return (
      <div className="relative">
        <input
          ref={ref}
          {...rest}
          type={showReal ? "text" : "text"}
          value={showReal ? raw : masked}
          onChange={onChange}
          onFocus={(e) => { setFocused(true); rest.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); rest.onBlur?.(e); }}
          onCopy={blockWhenMasked}
          onCut={blockWhenMasked}
          onContextMenu={(e) => { if (!revealed) e.preventDefault(); }}
          onDragStart={(e) => { if (!revealed) e.preventDefault(); }}
          className={`pr-10 ${className}`}
          autoComplete="off"
          inputMode="numeric"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setRevealed(v => !v)}
          aria-label={revealed ? "Hide value" : "Reveal value"}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
        >
          {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    );
  }
);
MaskedInput.displayName = "MaskedInput";

export default MaskedInput;
