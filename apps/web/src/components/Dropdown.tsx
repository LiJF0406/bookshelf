import { useState, type CSSProperties } from "react";

export interface DropdownOption {
  value: string;
  label: string;
}

interface Props {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  style?: CSSProperties;
  block?: boolean;
}

export function Dropdown({ value, options, onChange, style, block }: Props) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);

  return (
    <div className={`dropdown-wrap ${block ? "block" : ""}`} style={style}>
      <button className="btn secondary dropdown-btn" onClick={() => setOpen((v) => !v)}>
        <span>{current?.label ?? value}</span>
        <span className="caret">▾</span>
      </button>
      {open && (
        <>
          <div className="context-overlay" onClick={() => setOpen(false)} />
          <div className="dropdown-menu">
            {options.map((o) => (
              <button
                key={o.value}
                className={o.value === value ? "active" : ""}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
