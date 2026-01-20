// src/lib/calendar.ts
import type { GGEvent } from './api';

/**
 * Generate an iCalendar (.ics) file for an event
 * Compatible with Apple Calendar, Google Calendar, Outlook, etc.
 */
export function generateICS(event: GGEvent): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  
  // Parse event dates
  const startDate = event.startAt || event.when;
  const endDate = event.expiresAt;
  
  if (!startDate) {
    throw new Error('Event must have a start date');
  }
  
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date(start.getTime() + 2 * 60 * 60 * 1000); // Default 2 hours
  
  // Format dates for iCalendar (YYYYMMDDTHHMMSSZ)
  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };
  
  const dtStart = formatDate(start);
  const dtEnd = formatDate(end);
  
  // Build location string
  const location = event.location || '';
  
  // Build description
  let description = event.details || event.title;
  if (event.hostLabel) {
    description += `\\n\\nHosted by: ${event.hostLabel}`;
  }
  if (event.category) {
    description += `\\n\\nCategory: ${event.category}`;
  }
  
  // Escape special characters
  const escapeText = (text: string) => {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  };
  
  const summary = escapeText(event.title);
  const desc = escapeText(description);
  const loc = escapeText(location);
  
  // Generate ICS content
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//GatherGrove//Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.id}@gathergrove.com`,
    `DTSTAMP:${timestamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${desc}`,
    loc ? `LOCATION:${loc}` : '',
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
  
  return ics;
}

/**
 * Download an .ics file for an event
 */
export function downloadICS(event: GGEvent): void {
  try {
    const ics = generateICS(event);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    // Create temporary download link
    const link = document.createElement('a');
    link.href = url;
    link.download = `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to generate calendar file:', error);
    alert('Failed to generate calendar file. Please try again.');
  }
}

/**
 * Get Google Calendar add URL
 */
export function getGoogleCalendarURL(event: GGEvent): string {
  const startDate = event.startAt || event.when;
  const endDate = event.expiresAt;
  
  if (!startDate) return '';
  
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
  
  // Format: YYYYMMDDTHHmmss / YYYYMMDDTHHmmss
  const formatGoogleDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };
  
  const dates = `${formatGoogleDate(start)}/${formatGoogleDate(end)}`;
  
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: dates,
    details: event.details || '',
    location: event.location || '',
  });
  
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
