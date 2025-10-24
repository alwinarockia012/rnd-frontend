/**
 * Format a date to dd/mm/yy format
 * @param {Date|Object} date - The date to format (can be Date object, Firebase timestamp, or date string)
 * @returns {string} Formatted date string in dd/mm/yy format
 */
export const formatDate = (date) => {
  try {
    let dateObj = date;
    
    // Handle Firebase timestamp objects
    if (date && typeof date === 'object' && date.seconds) {
      dateObj = new Date(date.seconds * 1000);
    }
    // Handle date strings
    else if (typeof date === 'string') {
      dateObj = new Date(date);
    }
    // Handle Firestore Timestamp objects (if toDate method exists)
    else if (date && typeof date === 'object' && date.toDate && typeof date.toDate === 'function') {
      dateObj = date.toDate();
    }
    // Handle Date objects
    else if (date instanceof Date) {
      dateObj = date;
    }
    
    // Validate that we have a valid Date object
    if (!dateObj || !(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
      return 'Date not available';
    }
    
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = String(dateObj.getFullYear()).slice(-2);
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Date not available';
  }
};

/**
 * Format a date to dd/mm/yyyy format
 * @param {Date|Object} date - The date to format (can be Date object, Firebase timestamp, or date string)
 * @returns {string} Formatted date string in dd/mm/yyyy format
 */
export const formatDateFull = (date) => {
  try {
    let dateObj = date;
    
    // Handle Firebase timestamp objects
    if (date && typeof date === 'object' && date.seconds) {
      dateObj = new Date(date.seconds * 1000);
    }
    // Handle date strings
    else if (typeof date === 'string') {
      dateObj = new Date(date);
    }
    // Handle Firestore Timestamp objects (if toDate method exists)
    else if (date && typeof date === 'object' && date.toDate && typeof date.toDate === 'function') {
      dateObj = date.toDate();
    }
    // Handle Date objects
    else if (date instanceof Date) {
      dateObj = date;
    }
    
    // Validate that we have a valid Date object
    if (!dateObj || !(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
      return 'Date not available';
    }
    
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Date not available';
  }
};

const dateUtils = { formatDate, formatDateFull };
export default dateUtils;