import { useEffect, useState, type InputHTMLAttributes } from 'react';
/** Keep the user's control value stable while the asynchronous native engine acknowledges it. */
export function RangeControl({
  value,
  onValue,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  value: number;
  onValue: (value: number) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <input
      {...props}
      type="range"
      value={draft}
      onChange={(event) => {
        const next = Number(event.currentTarget.value);
        setDraft(next);
        onValue(next);
      }}
    />
  );
}
