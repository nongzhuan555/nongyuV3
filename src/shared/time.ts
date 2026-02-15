export type TimeSlot = '凌晨' | '清晨' | '上午' | '中午' | '午后' | '傍晚' | '夜间';

export function getDeviceTime(): Date {
  return new Date();
}

export function getISONow(): string {
  return new Date().toISOString();
}

export function getTimeSlotLabel(d: Date = new Date()): TimeSlot {
  const h = d.getHours();
  if (h < 5) return '凌晨';
  if (h < 8) return '清晨';
  if (h < 11) return '上午';
  if (h < 13) return '中午';
  if (h < 17) return '午后';
  if (h < 19) return '傍晚';
  return '夜间';
}
