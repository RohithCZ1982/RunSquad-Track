// India Standard Time (IST) timezone utilities
// IST is UTC+5:30

/**
 * Convert a datetime-local string to IST ISO string
 * @param {string} dateTimeLocal - String in format "YYYY-MM-DDTHH:mm"
 * @returns {string} ISO string with IST timezone (+05:30)
 */
export function convertLocalToIST(dateTimeLocal) {
  if (!dateTimeLocal) return null;
  
  // Parse the date components (datetime-local input is treated as IST)
  const [datePart, timePart] = dateTimeLocal.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = (timePart || '00:00').split(':').map(Number);
  
  // Format directly as IST ISO string (datetime-local input is treated as IST)
  const yearStr = String(year);
  const monthStr = String(month).padStart(2, '0');
  const dayStr = String(day).padStart(2, '0');
  const hourStr = String(hours).padStart(2, '0');
  const minStr = String(minutes).padStart(2, '0');
  
  return `${yearStr}-${monthStr}-${dayStr}T${hourStr}:${minStr}:00+05:30`;
}

/**
 * Convert IST ISO string to datetime-local format for input field
 * @param {string} istISOString - ISO string with IST timezone (+05:30)
 * @returns {string} String in format "YYYY-MM-DDTHH:mm" (as IST)
 */
export function convertISTToLocal(istISOString) {
  if (!istISOString) return '';
  
  try {
    // Extract date and time components from IST ISO string
    let datePart, timePart;
    if (istISOString.includes('+05:30')) {
      const withoutTz = istISOString.replace('+05:30', '').split('.')[0]; // Remove milliseconds if present
      [datePart, timePart] = withoutTz.split('T');
    } else if (istISOString.includes('Z')) {
      // If UTC, convert to IST by adding 5:30
      const withoutZ = istISOString.replace('Z', '').split('.')[0];
      const [dPart, tPart] = withoutZ.split('T');
      const [year, month, day] = dPart.split('-').map(Number);
      const [hours, minutes] = (tPart || '00:00').split(':').map(Number);
      const date = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
      date.setUTCHours(date.getUTCHours() + 5);
      date.setUTCMinutes(date.getUTCMinutes() + 30);
      return `${String(date.getUTCFullYear())}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}T${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
    } else {
      [datePart, timePart] = istISOString.split('T');
    }
    
    // Extract just hours and minutes (remove seconds/milliseconds)
    const timeOnly = (timePart || '00:00').split(':').slice(0, 2).join(':');
    
    return `${datePart}T${timeOnly}`;
  } catch (e) {
    console.error('Error converting IST to local:', e);
    return '';
  }
}

/**
 * Format a date string (in IST) to display string in IST
 * @param {string} istISOString - ISO string with IST timezone (+05:30)
 * @returns {string} Formatted date string in IST
 */
export function formatDateIST(istISOString) {
  if (!istISOString) return '';
  
  try {
    let date;
    if (istISOString.includes('+05:30')) {
      // Parse IST timezone string
      const withoutTz = istISOString.replace('+05:30', '').split('.')[0];
      const [datePart, timePart] = withoutTz.split('T');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hours, minutes] = (timePart || '00:00').split(':').map(Number);
      // Create date as if it were UTC, then format with IST timezone
      date = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
    } else {
      date = new Date(istISOString);
    }
    
    // Format for display in IST timezone
    const options = { 
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    };
    
    return new Intl.DateTimeFormat('en-IN', options).format(date);
  } catch (e) {
    console.error('Error formatting IST date:', e);
    return istISOString;
  }
}
