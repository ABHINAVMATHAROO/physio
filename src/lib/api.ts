export type AvailabilitySlot = {
  key: string;
  startTime: string;
  endTime: string;
  available: boolean;
};

export type AvailabilityResponse = {
  dateISO: string;
  slotMinutes: number;
  slots: AvailabilitySlot[];
};

export type CreateAppointmentPayload = {
  dateISO: string;
  startTime: string;
  patientName: string;
  phone: string;
  reason?: string;
};

export type CreateAppointmentResponse = {
  appointmentId: string;
  slotKey: string;
};

export type ApiError = {
  code: string;
  message: string;
  status: number;
};

const getBaseUrl = () => {
  const raw = import.meta.env.VITE_FUNCTIONS_BASE_URL as string | undefined;
  if (!raw) {
    return "";
  }
  return raw.replace(/\/$/, "");
};

const requestJson = async <T>(path: string, body: unknown): Promise<T> => {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/${path}`.replace(/([^:]\/\/)+/g, "$1");
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => ({}))) as
    | { error?: { code: string; message: string } }
    | T;

  if (!response.ok) {
    const errorPayload = payload as { error?: { code: string; message: string } };
    const code = errorPayload.error?.code ?? "UNKNOWN_ERROR";
    const message = errorPayload.error?.message ?? "Request failed.";
    throw { code, message, status: response.status } satisfies ApiError;
  }

  return payload as T;
};

export const fetchAvailability = (dateISO: string) => {
  return requestJson<AvailabilityResponse>("getAvailability", { dateISO });
};

export const createAppointment = (payload: CreateAppointmentPayload) => {
  return requestJson<CreateAppointmentResponse>("createAppointment", payload);
};
