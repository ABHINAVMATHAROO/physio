type DatePickerProps = {
  label: string;
  value: string;
  min: string;
  max: string;
  onChange: (value: string) => void;
  error?: string;
};

const DatePicker = ({ label, value, min, max, onChange, error }: DatePickerProps) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700" htmlFor="appointment-date">
        {label}
      </label>
      <input
        id="appointment-date"
        type="date"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
      />
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
};

export default DatePicker;
