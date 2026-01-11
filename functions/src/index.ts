import { onRequest } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import {
  addDaysISO,
  createSlotKey,
  generateSlots,
  getTodayISO,
  type BreakWindow,
  type Slot,
  type WorkHours,
} from "./slots";

initializeApp();

const db = getFirestore();

type Request = {
  method: string;
  body?: unknown;
};

type Response = {
  status: (code: number) => Response;
  json: (payload: unknown) => void;
};

const sendError = (response: Response, status: number, code: string, message: string) => {
  response.status(status).json({ error: { code, message } });
};

const isValidDateISO = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const isValidTime = (value: string) => /^\d{2}:\d{2}$/.test(value);

const chunk = <T,>(items: T[], size: number) => {
  const results: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    results.push(items.slice(i, i + size));
  }
  return results;
};

type ClinicConfig = {
  slotMinutes: number;
  timezone: string;
  workHours: WorkHours;
  breaks?: BreakWindow[];
  maxDaysAhead: number;
};

const getClinicConfig = async (): Promise<ClinicConfig> => {
  const snapshot = await db.doc("config/clinic").get();
  if (!snapshot.exists) {
    throw new Error("Clinic configuration not found.");
  }
  return snapshot.data() as ClinicConfig;
};

const getSlotAvailability = async (slots: Slot[]) => {
  const slotKeys = slots.map((slot) => slot.key);
  const lockRefs = slotKeys.map((key) => db.doc(`slotLocks/${key}`));
  const lockSnapshots = await db.getAll(...lockRefs);
  const lockedKeys = new Set(lockSnapshots.filter((snap) => snap.exists).map((snap) => snap.id));

  const bookedKeys = new Set<string>();
  for (const group of chunk(slotKeys, 30)) {
    const appointmentQuery = await db
      .collection("appointments")
      .where("slotKey", "in", group)
      .where("status", "in", ["booked", "completed"])
      .get();
    appointmentQuery.forEach((doc) => bookedKeys.add(doc.get("slotKey")));
  }

  return slots.map((slot) => ({
    ...slot,
    available: !lockedKeys.has(slot.key) && !bookedKeys.has(slot.key),
  }));
};

export const getAvailability = onRequest(async (request: Request, response: Response) => {
  if (request.method !== "POST") {
    return sendError(response, 405, "METHOD_NOT_ALLOWED", "Use POST.");
  }

  const { dateISO } = (request.body as { dateISO?: string }) ?? {};

  if (!dateISO || typeof dateISO !== "string" || !isValidDateISO(dateISO)) {
    return sendError(response, 400, "INVALID_DATE", "Provide a valid dateISO.");
  }

  try {
    const config = await getClinicConfig();
    const todayISO = getTodayISO(config.timezone);
    const lastAllowed = addDaysISO(todayISO, config.maxDaysAhead);

    if (dateISO < todayISO || dateISO > lastAllowed) {
      return sendError(response, 400, "DATE_OUT_OF_RANGE", "Date is out of range.");
    }

    const slots = generateSlots({
      dateISO,
      workHours: config.workHours,
      breaks: config.breaks ?? [],
      slotMinutes: config.slotMinutes,
    });

    const availability = await getSlotAvailability(slots);

    response.json({
      dateISO,
      slotMinutes: config.slotMinutes,
      slots: availability,
    });
  } catch (error) {
    response.status(500).json({ error: { code: "SERVER_ERROR", message: "Failed to load." } });
  }
});

export const createAppointment = onRequest(async (request: Request, response: Response) => {
  if (request.method !== "POST") {
    return sendError(response, 405, "METHOD_NOT_ALLOWED", "Use POST.");
  }

  // TODO: Add App Check validation.
  // TODO: Add rate limiting.

  const { dateISO, startTime, patientName, phone, reason } =
    (request.body as {
      dateISO?: string;
      startTime?: string;
      patientName?: string;
      phone?: string;
      reason?: string;
    }) ?? {};

  if (!dateISO || typeof dateISO !== "string" || !isValidDateISO(dateISO)) {
    return sendError(response, 400, "INVALID_DATE", "Provide a valid dateISO.");
  }

  if (!startTime || typeof startTime !== "string" || !isValidTime(startTime)) {
    return sendError(response, 400, "INVALID_TIME", "Provide a valid startTime.");
  }

  if (!patientName || typeof patientName !== "string" || patientName.trim().length < 2) {
    return sendError(response, 400, "INVALID_NAME", "Provide a valid patient name.");
  }

  const phonePattern = /^\+?[0-9\s-]{7,15}$/;
  if (!phone || typeof phone !== "string" || !phonePattern.test(phone)) {
    return sendError(response, 400, "INVALID_PHONE", "Provide a valid phone number.");
  }

  if (reason && typeof reason !== "string") {
    return sendError(response, 400, "INVALID_REASON", "Reason must be a string.");
  }

  try {
    const config = await getClinicConfig();
    const todayISO = getTodayISO(config.timezone);
    const lastAllowed = addDaysISO(todayISO, config.maxDaysAhead);

    if (dateISO < todayISO || dateISO > lastAllowed) {
      return sendError(response, 400, "DATE_OUT_OF_RANGE", "Date is out of range.");
    }

    const slots = generateSlots({
      dateISO,
      workHours: config.workHours,
      breaks: config.breaks ?? [],
      slotMinutes: config.slotMinutes,
    });

    const chosenSlot = slots.find((slot) => slot.startTime === startTime);

    if (!chosenSlot) {
      return sendError(response, 400, "INVALID_SLOT", "Start time is not available.");
    }

    const slotKey = createSlotKey(dateISO, startTime);
    const lockRef = db.doc(`slotLocks/${slotKey}`);
    const appointmentRef = db.collection("appointments").doc();

    await db.runTransaction(async (transaction) => {
      const lockSnapshot = await transaction.get(lockRef);
      if (lockSnapshot.exists) {
        throw new Error("SLOT_TAKEN");
      }

      transaction.set(lockRef, {
        slotKey,
        createdAt: FieldValue.serverTimestamp(),
      });

      transaction.set(appointmentRef, {
        patientName: patientName.trim(),
        phone: phone.trim(),
        reason: reason?.trim() ?? "",
        date: dateISO,
        startTime,
        endTime: chosenSlot.endTime,
        status: "booked",
        source: "patient",
        createdAt: FieldValue.serverTimestamp(),
        lastUpdatedAt: FieldValue.serverTimestamp(),
        slotKey,
      });
    });

    response.json({
      appointmentId: appointmentRef.id,
      slotKey,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "SLOT_TAKEN") {
      return sendError(response, 409, "SLOT_TAKEN", "Slot is no longer available.");
    }

    response.status(500).json({ error: { code: "SERVER_ERROR", message: "Failed to book." } });
  }
});
