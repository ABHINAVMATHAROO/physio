type AppointmentFormValues = {
  patientName: string;
  phone: string;
  reason: string;
};

type AppointmentFormErrors = Partial<Record<keyof AppointmentFormValues, string>>;

type AppointmentFormProps = {
  values: AppointmentFormValues;
  errors: AppointmentFormErrors;
  onChange: (field: keyof AppointmentFormValues, value: string) => void;
  onSubmit: () => void;
};

const AppointmentForm = ({ values, errors, onChange, onSubmit }: AppointmentFormProps) => {
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="patient-name">
          Patient name<span className="text-rose-500">*</span>
        </label>
        <input
          id="patient-name"
          type="text"
          value={values.patientName}
          onChange={(event) => onChange("patientName", event.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
          placeholder="Jane Doe"
        />
        {errors.patientName ? <p className="text-xs text-rose-600">{errors.patientName}</p> : null}
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="patient-phone">
          Phone number<span className="text-rose-500">*</span>
        </label>
        <input
          id="patient-phone"
          type="tel"
          value={values.phone}
          onChange={(event) => onChange("phone", event.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
          placeholder="+91 98765 43210"
        />
        {errors.phone ? <p className="text-xs text-rose-600">{errors.phone}</p> : null}
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="appointment-reason">
          Reason for visit
        </label>
        <textarea
          id="appointment-reason"
          rows={3}
          value={values.reason}
          onChange={(event) => onChange("reason", event.target.value)}
          className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
          placeholder="Optional details"
        />
      </div>
      <button
        type="submit"
        className="inline-flex w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
      >
        Confirm booking
      </button>
    </form>
  );
};

export type { AppointmentFormValues, AppointmentFormErrors };
export default AppointmentForm;
