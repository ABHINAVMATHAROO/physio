import { useMemo, useState } from "react";
import AppointmentForm, {
  type AppointmentFormErrors,
  type AppointmentFormValues,
} from "../components/AppointmentForm";
import DatePicker from "../components/DatePicker";
import SlotPicker from "../components/SlotPicker";

const MORNING_SLOTS = [
  "06:00",
  "06:15",
  "06:30",
  "06:45",
  "07:00",
  "07:15",
  "07:30",
  "07:45",
  "08:00",
  "08:15",
  "08:30",
  "08:45",
  "09:00",
  "09:15",
  "09:30",
  "09:45",
  "10:00",
  "10:15",
  "10:30",
  "10:45",
  "11:00",
  "11:15",
  "11:30",
  "11:45",
];

const AFTERNOON_SLOTS = [
  "12:00",
  "12:15",
  "12:30",
  "12:45",
  "13:00",
  "13:15",
  "13:30",
  "13:45",
  "14:00",
  "14:15",
  "14:30",
  "14:45",
  "15:00",
  "15:15",
  "15:30",
  "15:45",
  "16:00",
  "16:15",
  "16:30",
  "16:45",
];

const EVENING_SLOTS = [
  "17:00",
  "17:15",
  "17:30",
  "17:45",
  "18:00",
  "18:15",
  "18:30",
  "18:45",
  "19:00",
  "19:15",
  "19:30",
  "19:45",
  "20:00",
  "20:15",
  "20:30",
  "20:45",
  "21:00",
  "21:15",
  "21:30",
  "21:45",
];

const SLOT_SECTIONS = [
  { label: "Morning", slots: MORNING_SLOTS },
  { label: "Afternoon", slots: AFTERNOON_SLOTS },
  { label: "Evening", slots: EVENING_SLOTS },
];

const BASE_UNAVAILABLE = new Set(["08:30", "13:45", "18:15"]);

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const fetchUnavailableSlots = (date: string) => {
  const today = new Date();
  const tomorrow = formatDate(addDays(today, 1));
  const nextWeek = formatDate(addDays(today, 7));

  const dateOverrides: Record<string, string[]> = {
    [tomorrow]: ["09:00", "09:15", "15:30"],
    [nextWeek]: ["11:00", "11:15", "19:00"],
  };

  const fromOverrides = dateOverrides[date] ?? [];
  return new Set([...BASE_UNAVAILABLE, ...fromOverrides]);
};

type ConfirmationDetails = {
  date: string;
  slot: string;
  values: AppointmentFormValues;
};

const Book = () => {
  const today = useMemo(() => new Date(), []);
  const minDate = formatDate(today);
  const maxDate = formatDate(addDays(today, 30));

  const [selectedDate, setSelectedDate] = useState<string>(minDate);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<AppointmentFormValues>({
    patientName: "",
    phone: "",
    reason: "",
  });
  const [formErrors, setFormErrors] = useState<AppointmentFormErrors>({});
  const [dateError, setDateError] = useState<string | undefined>();
  const [slotError, setSlotError] = useState<string | undefined>();
  const [confirmation, setConfirmation] = useState<ConfirmationDetails | null>(null);

  const unavailableSlots = useMemo(() => fetchUnavailableSlots(selectedDate), [selectedDate]);

  const handleDateChange = (value: string) => {
    setSelectedDate(value);
    setSelectedSlot(null);
    setDateError(undefined);
    setSlotError(undefined);
    setConfirmation(null);
  };

  const handleFormChange = (field: keyof AppointmentFormValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = () => {
    const nextErrors: AppointmentFormErrors = {};

    if (!formValues.patientName.trim()) {
      nextErrors.patientName = "Patient name is required.";
    }

    if (!formValues.phone.trim()) {
      nextErrors.phone = "Phone number is required.";
    }

    if (!selectedDate) {
      setDateError("Please choose a date.");
    }

    if (!selectedSlot) {
      setSlotError("Select a time slot to continue.");
    }

    setFormErrors(nextErrors);

    if (
      Object.keys(nextErrors).length > 0 ||
      !selectedDate ||
      !selectedSlot
    ) {
      return;
    }

    setConfirmation({
      date: selectedDate,
      slot: selectedSlot,
      values: formValues,
    });
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex-1 space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Book an appointment</h1>
            <p className="mt-2 text-sm text-slate-600">
              Choose a date, pick a time slot, and share your details to confirm.
            </p>
          </div>
          <DatePicker
            label="Select appointment date"
            value={selectedDate}
            min={minDate}
            max={maxDate}
            onChange={handleDateChange}
            error={dateError}
          />
          <SlotPicker
            sections={SLOT_SECTIONS}
            selectedSlot={selectedSlot}
            disabledSlots={unavailableSlots}
            onSelect={(slot) => {
              setSelectedSlot(slot);
              setSlotError(undefined);
              setConfirmation(null);
            }}
            error={slotError}
          />
        </div>
        <div className="w-full max-w-md space-y-6 lg:sticky lg:top-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-base font-semibold text-slate-900">Patient details</h2>
            <p className="mt-1 text-xs text-slate-500">
              Required fields are marked with an asterisk.
            </p>
            <div className="mt-4">
              <AppointmentForm
                values={formValues}
                errors={formErrors}
                onChange={handleFormChange}
                onSubmit={handleSubmit}
              />
            </div>
          </div>
          {confirmation ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <p className="text-sm font-semibold text-emerald-700">
                Appointment confirmed
              </p>
              <div className="mt-3 space-y-2 text-sm text-emerald-900">
                <p>
                  <span className="font-medium">Date:</span> {confirmation.date}
                </p>
                <p>
                  <span className="font-medium">Time:</span> {confirmation.slot}
                </p>
                <p>
                  <span className="font-medium">Patient:</span> {confirmation.values.patientName}
                </p>
                <p>
                  <span className="font-medium">Phone:</span> {confirmation.values.phone}
                </p>
                {confirmation.values.reason ? (
                  <p>
                    <span className="font-medium">Reason:</span> {confirmation.values.reason}
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-xs text-slate-500">
              Confirm your details to see the booking summary.
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default Book;
