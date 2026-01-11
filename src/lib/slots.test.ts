import { generateSlots } from "./slots";

const assert = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

export const runSlotTests = () => {
  const slots = generateSlots({
    dateISO: "2024-01-10",
    workHours: { start: "09:00", end: "10:00" },
    slotMinutes: 15,
  });

  assert(slots.length === 4, "Expected four slots between 09:00 and 10:00.");
  assert(slots[0]?.startTime === "09:00", "First slot should start at 09:00.");
  assert(slots[3]?.endTime === "10:00", "Last slot should end at 10:00.");
  assert(slots[0]?.key === "2024-01-10_09:00", "Slot key should include date and time.");

  const slotsWithBreak = generateSlots({
    dateISO: "2024-01-10",
    workHours: { start: "09:00", end: "10:00" },
    breaks: [{ start: "09:15", end: "09:30" }],
    slotMinutes: 15,
  });

  assert(slotsWithBreak.length === 3, "Expected break to remove one slot.");
  assert(
    slotsWithBreak.every((slot) => slot.startTime !== "09:15"),
    "Slot overlapping break should be removed."
  );

  const unevenSlots = generateSlots({
    dateISO: "2024-01-10",
    workHours: { start: "09:00", end: "09:30" },
    slotMinutes: 20,
  });

  assert(unevenSlots.length === 1, "Slots should only include full intervals.");
};
