export type WorkHours = {
  start: string;
  end: string;
};

export type BreakWindow = {
  start: string;
  end: string;
};

export type Slot = {
  startTime: string;
  endTime: string;
  key: string;
};

type GenerateSlotsParams = {
  dateISO: string;
  workHours: WorkHours;
  breaks?: BreakWindow[];
  slotMinutes: number;
};

const parseTimeToMinutes = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
};

const formatMinutesToTime = (value: number) => {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
};

const hasOverlap = (slotStart: number, slotEnd: number, breakStart: number, breakEnd: number) => {
  return slotStart < breakEnd && slotEnd > breakStart;
};

export const generateSlots = ({
  dateISO,
  workHours,
  breaks = [],
  slotMinutes,
}: GenerateSlotsParams): Slot[] => {
  if (slotMinutes <= 0) {
    return [];
  }

  const workStart = parseTimeToMinutes(workHours.start);
  const workEnd = parseTimeToMinutes(workHours.end);
  const breakWindows = breaks.map((breakWindow) => ({
    start: parseTimeToMinutes(breakWindow.start),
    end: parseTimeToMinutes(breakWindow.end),
  }));

  const slots: Slot[] = [];

  for (let start = workStart; start + slotMinutes <= workEnd; start += slotMinutes) {
    const end = start + slotMinutes;
    const overlapsBreak = breakWindows.some((breakWindow) =>
      hasOverlap(start, end, breakWindow.start, breakWindow.end)
    );

    if (overlapsBreak) {
      continue;
    }

    const startTime = formatMinutesToTime(start);
    const endTime = formatMinutesToTime(end);

    slots.push({
      startTime,
      endTime,
      key: `${dateISO}_${startTime}`,
    });
  }

  return slots;
};
