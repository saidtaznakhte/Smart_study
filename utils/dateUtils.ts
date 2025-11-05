/**
 * Checks if two Date objects represent the same day (ignoring time).
 * @param d1 First date.
 * @param d2 Second date.
 * @returns True if they are the same day, false otherwise.
 */
export const isSameDay = (d1: Date, d2: Date): boolean => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
};

/**
 * Returns the day of the week name for a given Date object.
 * @param date The Date object.
 * @returns The day name (e.g., 'Monday').
 */
export const getWeekDayName = (date: Date): string => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
};

/**
 * Calculates the next day of the week name based on the current day.
 * @param currentDayName The name of the current day (e.g., 'Monday').
 * @returns The name of the next day (e.g., 'Tuesday').
 */
export const getNextDayOfWeek = (currentDayName: string): string => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentIndex = days.indexOf(currentDayName);
    const nextIndex = (currentIndex + 1) % days.length;
    return days[nextIndex];
};

/**
 * Calculates the number of days until a target date from today.
 * If the target date is today, returns 0. If it's in the past, returns a negative number.
 * @param targetDate The date to calculate days until.
 * @returns The number of days until the target date.
 */
export const getDaysUntil = (targetDate: Date): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today to start of day
    targetDate.setHours(0, 0, 0, 0); // Normalize targetDate to start of day

    const diffTime = targetDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};