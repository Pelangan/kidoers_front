/**
 * Unit tests for recurrence utility functions
 * 
 * These are pure functions that don't require component rendering
 */

import { 
  helperLabel, 
  optionFromTemplate, 
  optionToDays,
  normalizeWeekdays,
  type Weekday 
} from '@/app/components/routines/builder/utils/recurrence';

describe('Recurrence Utility Functions', () => {
  describe('helperLabel()', () => {
    it('should return "Every day" for all 7 days', () => {
      const days: Weekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const result = helperLabel(days, false);
      
      expect(result).toBe('Every day');
    });

    it('should return "Every Monday" for single day', () => {
      const result = helperLabel(['monday'], false);
      expect(result).toBe('Every Monday');
    });

    it('should return "Every Tuesday" for single day', () => {
      const result = helperLabel(['tuesday'], false);
      expect(result).toBe('Every Tuesday');
    });

    it('should return "Every Wednesday" for single day', () => {
      const result = helperLabel(['wednesday'], false);
      expect(result).toBe('Every Wednesday');
    });

    it('should return "Every Thursday" for single day', () => {
      const result = helperLabel(['thursday'], false);
      expect(result).toBe('Every Thursday');
    });

    it('should return "Every Friday" for single day', () => {
      const result = helperLabel(['friday'], false);
      expect(result).toBe('Every Friday');
    });

    it('should return "Every Saturday" for single day', () => {
      const result = helperLabel(['saturday'], false);
      expect(result).toBe('Every Saturday');
    });

    it('should return "Every Sunday" for single day', () => {
      const result = helperLabel(['sunday'], false);
      expect(result).toBe('Every Sunday');
    });

    it('should return "Weekdays" for Mon-Fri', () => {
      const weekdays: Weekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
      const result = helperLabel(weekdays, false);
      
      expect(result).toBe('Weekdays');
    });

    it('should return "Weekends" for Sat-Sun', () => {
      const weekends: Weekday[] = ['saturday', 'sunday'];
      const result = helperLabel(weekends, false);
      
      expect(result).toBe('Weekends');
    });

    it('should format 2 days as "Repeats: Mon, Wed"', () => {
      const result = helperLabel(['monday', 'wednesday'], false);
      
      expect(result).toContain('Repeats:');
      expect(result).toContain('Mon');
      expect(result).toContain('Wed');
    });

    it('should format 3 days as "Repeats: Mon, Wed, Fri"', () => {
      const result = helperLabel(['monday', 'wednesday', 'friday'], false);
      
      expect(result).toContain('Repeats:');
      expect(result).toContain('Mon');
      expect(result).toContain('Wed');
      expect(result).toContain('Fri');
    });

    it('should format 6 days correctly', () => {
      const sixDays: Weekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const result = helperLabel(sixDays, false);
      
      // Should show "Repeats: Mon, Tue, Wed, Thu, Fri, Sat"
      expect(result).toContain('Repeats:');
      expect(result).toContain('Mon');
      expect(result).toContain('Sat');
    });

    it('should handle unsorted days and still produce correct label', () => {
      // Days in random order
      const unsortedDays: Weekday[] = ['friday', 'monday', 'wednesday'];
      const result = helperLabel(unsortedDays, false);
      
      // Should still format nicely
      expect(result).toContain('Repeats:');
      expect(result).toContain('Mon');
      expect(result).toContain('Wed');
      expect(result).toContain('Fri');
    });
  });

  describe('optionFromTemplate()', () => {
    it('should return EVERY_DAY for 7 days', () => {
      const days: Weekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const result = optionFromTemplate(days, false);
      
      expect(result).toBe('EVERY_DAY');
    });

    it('should return SPECIFIC_DAYS for 1 day', () => {
      const result = optionFromTemplate(['monday'], false);
      
      expect(result).toBe('SPECIFIC_DAYS');
    });

    it('should return SPECIFIC_DAYS for 2-6 days', () => {
      const twoDays = optionFromTemplate(['monday', 'friday'], false);
      const threeDays = optionFromTemplate(['monday', 'wednesday', 'friday'], false);
      const sixDays: Weekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const sixDaysResult = optionFromTemplate(sixDays, false);
      
      expect(twoDays).toBe('SPECIFIC_DAYS');
      expect(threeDays).toBe('SPECIFIC_DAYS');
      expect(sixDaysResult).toBe('SPECIFIC_DAYS');
    });

    it('should return EVERY_DAY even with exceptions', () => {
      const days: Weekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const result = optionFromTemplate(days, true);
      
      // Even with exceptions, if 7 days selected, it's EVERY_DAY
      expect(result).toBe('EVERY_DAY');
    });

    it('should handle empty array gracefully', () => {
      const result = optionFromTemplate([], false);
      
      // Empty should be treated as SPECIFIC_DAYS (0 < 7)
      expect(result).toBe('SPECIFIC_DAYS');
    });
  });

  describe('optionToDays()', () => {
    it('should return all 7 days for EVERY_DAY', () => {
      const result = optionToDays('EVERY_DAY');
      
      expect(result).toHaveLength(7);
      expect(result).toContain('monday');
      expect(result).toContain('sunday');
    });

    it('should return empty array for SPECIFIC_DAYS', () => {
      const result = optionToDays('SPECIFIC_DAYS');
      
      // User needs to select specific days manually
      expect(result).toEqual([]);
    });
  });

  describe('normalizeWeekdays()', () => {
    it('should convert uppercase to lowercase', () => {
      const result = normalizeWeekdays(['Monday', 'TUESDAY', 'WeDnEsDaY']);
      
      expect(result).toEqual(['monday', 'tuesday', 'wednesday']);
    });

    it('should preserve duplicates (does not deduplicate)', () => {
      const result = normalizeWeekdays(['monday', 'monday', 'tuesday', 'monday']);
      
      // The function doesn't remove duplicates - it just normalizes case
      expect(result).toEqual(['monday', 'monday', 'tuesday', 'monday']);
    });

    it('should handle mixed case and preserve duplicates', () => {
      const result = normalizeWeekdays(['Monday', 'monday', 'MONDAY', 'Tuesday']);
      
      // Converts to lowercase but keeps all duplicates
      expect(result).toEqual(['monday', 'monday', 'monday', 'tuesday']);
    });

    it('should preserve original order including duplicates', () => {
      const result = normalizeWeekdays(['friday', 'monday', 'friday', 'wednesday', 'monday']);
      
      // Keeps all items in original order (no deduplication)
      expect(result).toEqual(['friday', 'monday', 'friday', 'wednesday', 'monday']);
    });

    it('should handle empty array', () => {
      const result = normalizeWeekdays([]);
      
      expect(result).toEqual([]);
    });

    it('should filter out invalid days', () => {
      const result = normalizeWeekdays(['monday', 'invalidday', 'tuesday', '']);
      
      // Should only keep valid weekday names
      expect(result).toEqual(['monday', 'tuesday']);
    });
  });
});
