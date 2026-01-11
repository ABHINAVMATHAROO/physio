type SlotItem = {
  key: string;
  startTime: string;
  available: boolean;
};

type SlotSection = {
  label: string;
  slots: SlotItem[];
};

type SlotPickerProps = {
  sections: SlotSection[];
  selectedSlotKey: string | null;
  onSelect: (slot: SlotItem) => void;
  error?: string;
};

const SlotPicker = ({ sections, selectedSlotKey, onSelect, error }: SlotPickerProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Available time slots</h3>
        <span className="text-xs text-slate-500">15-min slots</span>
      </div>
      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.label} className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {section.label}
            </p>
            <div className="flex flex-wrap gap-2">
              {section.slots.length === 0 ? (
                <p className="text-xs text-slate-400">No slots available.</p>
              ) : (
                section.slots.map((slot) => {
                  const isSelected = selectedSlotKey === slot.key;
                  const isDisabled = !slot.available;
                  return (
                    <button
                      key={slot.key}
                      type="button"
                      onClick={() => onSelect(slot)}
                      disabled={isDisabled}
                      className={[
                        "rounded-full px-3 py-1 text-xs font-medium transition",
                        isSelected
                          ? "bg-slate-900 text-white"
                          : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                        isDisabled
                          ? "cursor-not-allowed border-slate-100 bg-slate-100 text-slate-400"
                          : "",
                      ].join(" ")}
                    >
                      {slot.startTime}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
};

export default SlotPicker;
