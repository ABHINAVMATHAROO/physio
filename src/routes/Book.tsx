import { useCallback, useEffect, useMemo, useState } from "react";
import AppointmentForm, {
  type AppointmentFormErrors,
  type AppointmentFormValues,
} from "../components/AppointmentForm";
import DatePicker from "../components/DatePicker";
import SlotPicker from "../components/SlotPicker";
import {
  createAppointment,
  fetchAvailability,
  type AvailabilityResponse,
  type AvailabilitySlot,
  type ApiError,
} from "../lib/api";

const SLOT_MINUTES = 15;

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

const parseTimeToMinutes = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
};

type ConfirmationDetails = {
  date: string;
  slot: AvailabilitySlot;
  values: AppointmentFormValues;
  appointmentId: string;
};

type SlotSection = {
  label: string;
  slots: AvailabilitySlot[];
};

const getSlotSectionLabel = (slot: AvailabilitySlot) => {
  const hour = parseTimeToMinutes(slot.startTime) / 60;
  if (hour >= 6 && hour < 12) {
    return "Morning";
  }
  if (hour >= 12 && hour < 17) {
    return "Afternoon";
  }
  return "Evening";
};

const buildSections = (slots: AvailabilitySlot[]) => {
  const sorted = [...slots].sort((a, b) =>
    parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime)
  );

  const sections: Record<string, AvailabilitySlot[]> = {
    Morning: [],
    Afternoon: [],
    Evening: [],
  };

  sorted.forEach((slot) => {
    sections[getSlotSectionLabel(slot)].push(slot);
  });

  return Object.entries(sections).map(([label, sectionSlots]) => ({
    label,
    slots: sectionSlots,
  }));
};

const Book = () => {
  const today = useMemo(() => new Date(), []);
  const minDate = formatDate(today);
  const maxDate = formatDate(addDays(today, 30));

  const [selectedDate, setSelectedDate] = useState<string>(minDate);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [formValues, setFormValues] = useState<AppointmentFormValues>({
    patientName: "",
    phone: "",
    reason: "",
  });
  const [formErrors, setFormErrors] = useState<AppointmentFormErrors>({});
  const [dateError, setDateError] = useState<string | undefined>();
  const [slotError, setSlotError] = useState<string | undefined>();
  const [confirmation, setConfirmation] = useState<ConfirmationDetails | null>(null);
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadAvailability = useCallback(async () => {
    setIsLoadingAvailability(true);
    setAvailabilityError(null);

    try {
      const response = await fetchAvailability(selectedDate);
      setAvailability(response);
      setSelectedSlot((current) =>
        response.slots.find((slot) => slot.key === current?.key) ?? null
      );
    } catch (error) {
      const apiError = error as ApiError;
      setAvailabilityError(apiError.message ?? "Unable to load availability.");
    } finally {
      setIsLoadingAvailability(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    void loadAvailability();
  }, [loadAvailability]);

  const slotSections = useMemo<SlotSection[]>(
    () => buildSections(availability?.slots ?? []),
    [availability]
  );

  const handleDateChange = (value: string) => {
    setSelectedDate(value);
    setSelectedSlot(null);
    setDateError(undefined);
    setSlotError(undefined);
    setConfirmation(null);
    setSubmitError(null);
  };

  const handleFormChange = (field: keyof AppointmentFormValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async () => {
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

    if (Object.keys(nextErrors).length > 0 || !selectedDate || !selectedSlot) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await createAppointment({
        dateISO: selectedDate,
        startTime: selectedSlot.startTime,
        patientName: formValues.patientName,
        phone: formValues.phone,
        reason: formValues.reason || undefined,
      });

      setConfirmation({
        date: selectedDate,
        slot: selectedSlot,
        values: formValues,
        appointmentId: response.appointmentId,
      });
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError.code === "SLOT_TAKEN") {
        setSubmitError("That slot was just booked. Please pick another time.");
        await loadAvailability();
      } else {
        setSubmitError(apiError.message ?? "Unable to complete booking.");
      }
    } finally {
      setIsSubmitting(false);
    }
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
          {availabilityError ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {availabilityError}
            </div>
          ) : null}
          {isLoadingAvailability ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Loading availability...
            </div>
          ) : null}
          <SlotPicker
            sections={slotSections}
            selectedSlotKey={selectedSlot?.key ?? null}
            onSelect={(slot) => {
              if (!slot.available) {
                return;
              }
              setSelectedSlot(slot);
              setSlotError(undefined);
              setConfirmation(null);
              setSubmitError(null);
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
            <div className="mt-4 space-y-3">
              <AppointmentForm
                values={formValues}
                errors={formErrors}
                onChange={handleFormChange}
                onSubmit={handleSubmit}
              />
              {submitError ? (
                <p className="text-xs text-rose-600">{submitError}</p>
              ) : null}
              {isSubmitting ? (
                <p className="text-xs text-slate-500">Submitting booking...</p>
              ) : null}
            </div>
          </div>
          {confirmation ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <p className="text-sm font-semibold text-emerald-700">
                Appointment confirmed
              </p>
              <div className="mt-3 space-y-2 text-sm text-emerald-900">
                <p>
                  <span className="font-medium">Appointment ID:</span> {confirmation.appointmentId}
                </p>
                <p>
                  <span className="font-medium">Date:</span> {confirmation.date}
                </p>
                <p>
                  <span className="font-medium">Time:</span> {confirmation.slot.startTime} -{" "}
                  {confirmation.slot.endTime}
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
          <p className="text-xs text-slate-400">
            Slots are refreshed from the clinic schedule. {SLOT_MINUTES}-minute sessions.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Book;
