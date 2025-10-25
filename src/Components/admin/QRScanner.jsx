import React, { useState, useRef, useEffect, useCallback } from 'react';
import { db } from '../../firebase';
import { doc, getDoc, updateDoc, addDoc, collection, query, where, getDocs } from 'firebase/firestore';
import jsQR from 'jsqr';
import { formatDate } from '../../utils/dateUtils';
import './QRScanner.css';

const QRScanner = () => {
  const [ticketInfo, setTicketInfo] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [ticketData, setTicketData] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [fileName, setFileName] = useState('');
  const [activeTab, setActiveTab] = useState('camera'); // New state to track active tab
  const [phoneNumberSearch, setPhoneNumberSearch] = useState(''); // New state for phone number search
  const [userBookingStatus, setUserBookingStatus] = useState(null); // New state for user booking status
  const [searching, setSearching] = useState(false); // New state for search loading
  const [freeTrialStatus, setFreeTrialStatus] = useState(null); // New state for free trial status
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  // Function to determine plan type based on event name
  const getPlanType = useCallback((eventName) => {
    if (!eventName) return 'unknown';
    
    const name = eventName.toLowerCase();
    if (name.includes('free') && name.includes('trial')) {
      return 'free-trial';
    } else if (name.includes('pay') && name.includes('per') && name.includes('run')) {
      return 'pay-per-run';
    } else if (name.includes('monthly') && name.includes('membership')) {
      return 'monthly-membership';
    } else {
      return 'unknown';
    }
  }, []);
  
  // Function to check if a booking is still valid based on plan type
  const isBookingValid = useCallback((bookingDate, planType) => {
    if (!bookingDate) return false;
    
    let date;
    if (bookingDate.toDate && typeof bookingDate.toDate === 'function') {
      date = bookingDate.toDate();
    } else if (bookingDate instanceof Date) {
      date = bookingDate;
    } else {
      date = new Date(bookingDate);
    }
    
    // Determine validity period based on plan type
    const now = new Date();
    let validPeriodStart;
    
    switch (planType) {
      case 'free-trial':
      case 'pay-per-run':
        // Both free trial and pay-per-run are valid for 7 days
        validPeriodStart = new Date();
        validPeriodStart.setDate(now.getDate() - 7);
        break;
      case 'monthly-membership':
        // Monthly membership is valid for 30 days
        validPeriodStart = new Date();
        validPeriodStart.setDate(now.getDate() - 30);
        break;
      default:
        // Default to 7 days for unknown plan types
        validPeriodStart = new Date();
        validPeriodStart.setDate(now.getDate() - 7);
    }
    
    return date > validPeriodStart;
  }, []);

  const handleTicketDataChange = (event) => {
    // Add safety check for event and target
    if (event && event.target) {
      setTicketData(event.target.value);
    }
  };

  // Handle file upload for QR code images
  const handleFileUpload = (event) => {
    // Add safety checks
    if (!event || !event.target || !event.target.files) {
      setError('Invalid file upload event.');
      return;
    }
    
    const file = event.target.files[0];
    if (!file) return;

    setError(null);
    setSuccess(null);

    // Check if file is an image
    if (!file.type || !file.type.startsWith('image/')) {
      setError('Please upload an image file (PNG, JPG, etc.)');
      return;
    }

    // Set file name and create image preview
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      // Add safety checks
      if (!e || !e.target || !e.target.result) {
        setError('Error reading file.');
        return;
      }
      
      // Set the uploaded image for preview
      setUploadedImage(e.target.result);
      
      const img = new Image();
      img.onload = () => {
        try {
          // Create canvas to process the image
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          
          if (!context) {
            setError('Unable to create canvas context for image processing');
            return;
          }
          
          // Set canvas dimensions with fallback values
          canvas.width = img.width || 400;
          canvas.height = img.height || 300;
          context.drawImage(img, 0, 0);
          
          // Get image data and scan for QR code
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          
          // Check if jsQR is properly imported and imageData is valid
          if (typeof jsQR !== 'function') {
            setError('QR scanning library not loaded properly');
            return;
          }
          
          // Check if imageData is valid
          if (!imageData || !imageData.data || !imageData.width || !imageData.height) {
            setError('Invalid image data for QR code scanning');
            return;
          }
          
          // Try to decode the QR code
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          
          if (code) {
            console.log('QR code found in uploaded image:', code.data);
            setTicketData(code.data);
            setSuccess('QR code detected from uploaded image! Click "Verify Ticket" to process.');
          } else {
            setError('No QR code found in the uploaded image. Please try a clearer image.');
          }
        } catch (qrError) {
          console.error('Error scanning QR code:', qrError);
          setError('Error scanning QR code. Please try a different image.');
        }
      };
      
      // Handle image loading errors
      img.onerror = () => {
        setError('Error loading image. Please try a different file.');
      };
      
      img.src = e.target.result;
    };
    
    // Handle file reading errors
    reader.onerror = () => {
      setError('Error reading file. Please try again.');
    };
    
    reader.readAsDataURL(file);
  };

  // Mark ticket as used
  const markTicketAsUsed = async () => {
    // Add safety checks
    if (!ticketInfo || !ticketInfo.id || ticketInfo.id === 'N/A') {
      setError('Cannot mark ticket as used - no valid booking ID found.');
      return;
    }

    // Additional validation
    if (!db) {
      setError('Database connection not available.');
      return;
    }

    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate doc function is available
      if (typeof doc !== 'function' || typeof updateDoc !== 'function') {
        throw new Error('Firebase functions not properly imported');
      }
      
      const bookingRef = doc(db, 'bookings', ticketInfo.id);
      await updateDoc(bookingRef, {
        status: 'used',
        usedAt: new Date(),
        usedBy: 'admin'
      });

      // Update local state with additional safety checks
      if (setTicketInfo && typeof setTicketInfo === 'function') {
        setTicketInfo(prev => ({
          ...prev,
          status: 'used'
        }));
      }

      setSuccess('Ticket marked as used successfully!');
    } catch (err) {
      console.error('Error marking ticket as used:', err);
      setError('Failed to mark ticket as used. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // Send reminder (updated to create actual notifications)
  const sendReminder = async () => {
    // Add safety checks
    if (!ticketInfo) {
      setError('No ticket information available.');
      return;
    }

    // Additional validation for required fields
    if (!ticketInfo.userId) {
      setError('User information is missing. Cannot send reminder.');
      return;
    }

    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Create a notification in Firestore
      const notificationData = {
        userId: ticketInfo.userId || '',
        title: 'Event Reminder',
        message: `Don't forget about your upcoming event: ${ticketInfo.eventName || 'Unknown Event'}`,
        eventName: ticketInfo.eventName || 'Unknown Event',
        eventId: ticketInfo.eventId || '',
        createdAt: new Date(),
        read: false
      };

      // Add the notification to the notifications collection
      const docRef = await addDoc(collection(db, 'notifications'), notificationData);
      console.log('Notification created with ID:', docRef.id);
      
      setSuccess('Reminder sent successfully! Notification created for the user.');
    } catch (err) {
      console.error('Error sending reminder:', err);
      setError('Failed to send reminder. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // Clear all data
  const clearData = () => {
    try {
      setTicketInfo(null);
      setTicketData('');
      setError(null);
      setSuccess(null);
      setUploadedImage(null);
      setFileName('');
      
      // Add safety check for fileInputRef
      if (fileInputRef && fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Error clearing data:', err);
      setError('Failed to clear data. Please try again.');
    }
  };

  // Start camera for QR scanning
  const startCamera = async () => {
    setScanning(true);
    setError(null);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      // Start scanning for QR codes after a short delay to ensure video is ready
      setTimeout(() => {
        scanQRCode();
      }, 500);
    } catch (err) {
      console.error('Error accessing camera:', err);
      // Try again with default camera if environment camera is not available
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true
        });
        
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        
        // Start scanning for QR codes after a short delay to ensure video is ready
        setTimeout(() => {
          scanQRCode();
        }, 500);
      } catch (fallbackError) {
        console.error('Error accessing camera (fallback):', fallbackError);
        setError('Could not access camera. Please ensure you have given permission and try again.');
        setScanning(false);
      }
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach(track => {
          try {
            track.stop();
          } catch (trackError) {
            console.warn('Error stopping track:', trackError);
          }
        });
      } catch (streamError) {
        console.warn('Error stopping stream:', streamError);
      }
      streamRef.current = null;
    }
    setScanning(false);
  };

  // Scan QR codes from camera feed
  const scanQRCode = () => {
    if (!scanning || !videoRef.current || videoRef.current.readyState !== 4) {
      if (scanning) {
        requestAnimationFrame(scanQRCode);
      }
      return;
    }

    // Use the canvas ref or create a new canvas
    let canvas, context;
    
    if (canvasRef.current) {
      canvas = canvasRef.current;
      context = canvas.getContext('2d');
    } else {
      canvas = document.createElement('canvas');
      context = canvas.getContext('2d');
    }
    
    // Check if canvas context is available
    if (!context) {
      setError('Unable to create canvas context for camera feed');
      stopCamera();
      return;
    }

    const video = videoRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    try {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      
      // Validate jsQR and imageData
      if (typeof jsQR !== 'function') {
        setError('QR scanning library not loaded properly');
        stopCamera();
        return;
      }
      
      if (!imageData || !imageData.data || !imageData.width || !imageData.height) {
        setError('Invalid image data for QR code scanning');
        stopCamera();
        return;
      }
      
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      
      if (code) {
        console.log('QR code detected:', code.data);
        setTicketData(code.data);
        stopCamera();
        setSuccess('QR code detected! Click "Verify Ticket" to process.');
      } else {
        // Continue scanning
        requestAnimationFrame(scanQRCode);
      }
    } catch (qrError) {
      console.error('Error scanning QR code:', qrError);
      setError('Error scanning QR code from camera.');
      stopCamera();
    }
  };

  const handleScanTicket = async () => {
    console.log('🔍 handleScanTicket called');
    console.log('📝 Current ticketData:', ticketData);
    console.log('📝 ticketData length:', ticketData.length);
    console.log('📝 ticketData trimmed:', ticketData.trim());
    
    // Add safety checks
    if (!ticketData || !ticketData.trim()) {
      console.log('❌ No ticket data provided');
      setError('Please enter ticket data or upload a QR code image');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setTicketInfo(null);

    try {
      console.log('🔄 Starting ticket verification process...');
      console.log('📄 Raw ticket data:', JSON.stringify(ticketData));
      
      let parsedData;
      
      // Check if the ticketData is a URL with data parameter
      if (ticketData.includes('/ticket?data=')) {
        try {
          // Extract the data parameter from the URL
          const url = new URL(ticketData);
          const dataParam = url.searchParams.get('data');
          
          if (dataParam) {
            // Decode and parse the JSON data
            const decodedData = decodeURIComponent(dataParam);
            parsedData = JSON.parse(decodedData);
            console.log('✅ Successfully parsed URL data as JSON:', parsedData);
          } else {
            throw new Error('No data parameter found in URL');
          }
        } catch (urlError) {
          console.log('⚠️ Error parsing URL data:', urlError.message);
          // Fall back to regular JSON parsing
          try {
            parsedData = JSON.parse(ticketData);
            console.log('✅ Successfully parsed as JSON:', parsedData);
          } catch (jsonError) {
            console.log('⚠️ Not valid JSON, treating as plain text:', jsonError.message);
            // If it's not JSON, create a simple object
            parsedData = {
              rawData: ticketData,
              event: 'Unknown Event',
              user: 'Unknown User',
              date: new Date().toISOString(),
              time: 'Unknown Time',
              location: 'Unknown Location'
            };
          }
        }
      } else {
        // Try to parse as JSON first
        try {
          // Add safety check for JSON.parse
          if (typeof JSON.parse !== 'function') {
            throw new Error('JSON.parse is not available');
          }
          parsedData = JSON.parse(ticketData);
          console.log('✅ Successfully parsed as JSON:', parsedData);
        } catch (jsonError) {
          console.log('⚠️ Not valid JSON, treating as plain text:', jsonError.message);
          // If it's not JSON, create a simple object
          parsedData = {
            rawData: ticketData,
            event: 'Unknown Event',
            user: 'Unknown User',
            date: new Date().toISOString(),
            time: 'Unknown Time',
            location: 'Unknown Location'
          };
        }
      }
      
      console.log('📊 Parsed data structure:', parsedData);
      
      // Check if we have a booking ID to fetch from database
      if (parsedData && parsedData.id) {
        console.log('🔍 Found booking ID, fetching from database:', parsedData.id);
        try {
          // Add safety checks for Firebase functions
          if (typeof doc !== 'function' || typeof getDoc !== 'function' || typeof updateDoc !== 'function') {
            throw new Error('Firebase functions not properly imported');
          }
          
          if (!db) {
            throw new Error('Database connection not available');
          }
          
          const bookingRef = doc(db, 'bookings', parsedData.id);
          const bookingSnap = await getDoc(bookingRef);
          
          if (bookingSnap.exists()) {
            const bookingData = bookingSnap.data();
            console.log('✅ Found booking in database:', bookingData);
            
            const isFreeTrial = bookingData.isFreeTrial || parsedData.isFreeTrial || false;
            const eventName = bookingData.eventName || parsedData.event || 'Unknown Event';
            const bookingDate = bookingData.bookingDate?.toDate ? 
              bookingData.bookingDate.toDate() : 
              (bookingData.bookingDate || new Date());
            const planType = getPlanType(eventName);
            
            setTicketInfo({
              id: parsedData.id || 'N/A',
              eventName: eventName,
              eventDate: bookingData.eventDate?.toDate ? 
                bookingData.eventDate.toDate() : 
                (bookingData.eventDate || parsedData.date || new Date()),
              eventTime: bookingData.eventTime || parsedData.time || 'Unknown Time',
              eventLocation: bookingData.eventLocation || parsedData.location || 'Unknown Location',
              userName: bookingData.userName || parsedData.user || 'Unknown User',
              userEmail: bookingData.userEmail || parsedData.userEmail || 'Email not available',
              phoneNumber: bookingData.phoneNumber || parsedData.phoneNumber || 'Phone not available',
              userId: bookingData.userId || parsedData.userId || 'User ID not available',
              eventId: bookingData.eventId || parsedData.eventId || 'Event ID not available',
              bookingDate: bookingDate,
              isFreeTrial: isFreeTrial,
              status: bookingData.status || parsedData.status || 'confirmed',
              planType: planType,
              isBookingValid: isBookingValid(bookingDate, planType)
            });
            setSuccess('✅ Ticket verified successfully from database!');
          } else {
            console.log('⚠️ Booking not found in database, using QR code data');
            const isFreeTrial = parsedData.isFreeTrial || false;
            const eventName = parsedData.event || 'Unknown Event';
            const bookingDate = parsedData.bookingDate ? new Date(parsedData.bookingDate) : new Date();
            const planType = getPlanType(eventName);
            
            setTicketInfo({
              id: parsedData.id || 'N/A',
              eventName: eventName,
              eventDate: parsedData.date ? new Date(parsedData.date) : new Date(),
              eventTime: parsedData.time || 'Unknown Time',
              eventLocation: parsedData.location || 'Location not available',
              userName: parsedData.user || 'Unknown User',
              userEmail: parsedData.userEmail || 'Email not available',
              phoneNumber: parsedData.phoneNumber || 'Phone not available',
              userId: parsedData.userId || 'User ID not available',
              eventId: parsedData.eventId || 'Event ID not available',
              bookingDate: bookingDate,
              isFreeTrial: isFreeTrial,
              status: parsedData.status || 'confirmed',
              planType: planType,
              isBookingValid: isBookingValid(bookingDate, planType)
            });
            setSuccess('✅ Ticket verified from QR code data!');
          }
        } catch (dbError) {
          console.error('❌ Database error:', dbError);
          setError('Database connection error. Using QR code data only.');
          // Fallback to QR code data
          const isFreeTrial = parsedData.isFreeTrial || false;
          const eventName = parsedData.event || 'Unknown Event';
          const bookingDate = parsedData.bookingDate ? new Date(parsedData.bookingDate) : new Date();
          const planType = getPlanType(eventName);
          
          setTicketInfo({
            id: parsedData.id || 'N/A',
            eventName: eventName,
            eventDate: parsedData.date ? new Date(parsedData.date) : new Date(),
            eventTime: parsedData.time || 'Unknown Time',
            eventLocation: parsedData.location || 'Location not available',
            userName: parsedData.user || 'Unknown User',
            userEmail: parsedData.userEmail || 'Email not available',
            phoneNumber: parsedData.phoneNumber || 'Phone not available',
            userId: parsedData.userId || 'User ID not available',
            eventId: parsedData.eventId || 'Event ID not available',
            bookingDate: bookingDate,
            isFreeTrial: isFreeTrial,
            status: parsedData.status || 'confirmed',
            planType: planType,
            isBookingValid: isBookingValid(bookingDate, planType)
          });
        }
      } else {
        // No booking ID, use QR code data directly
        console.log('📝 No booking ID found, using QR code data directly');
        const isFreeTrial = parsedData.isFreeTrial || false;
        const eventName = parsedData.event || parsedData.rawData || 'Unknown Event';
        const bookingDate = parsedData.bookingDate ? new Date(parsedData.bookingDate) : new Date();
        const planType = getPlanType(eventName);
        
        setTicketInfo({
          id: parsedData.id || 'N/A',
          eventName: eventName,
          eventDate: parsedData.date ? new Date(parsedData.date) : new Date(),
          eventTime: parsedData.time || 'Unknown Time',
          eventLocation: parsedData.location || 'Location not available',
          userName: parsedData.user || 'Unknown User',
          userEmail: parsedData.userEmail || 'Email not available',
          phoneNumber: parsedData.phoneNumber || 'Phone not available',
          userId: parsedData.userId || 'User ID not available',
          eventId: parsedData.eventId || 'Event ID not available',
          bookingDate: bookingDate,
          isFreeTrial: isFreeTrial,
          status: parsedData.status || 'confirmed',
          planType: planType,
          isBookingValid: isBookingValid(bookingDate, planType)
        });
        setSuccess('✅ Ticket data processed successfully!');
      }
      
      console.log('✅ Ticket verification completed successfully');
      
    } catch (err) {
      console.error('❌ Error in handleScanTicket:', err);
      console.error('❌ Error stack:', err.stack);
      setError(`Verification failed: ${err.message}. Please check the console for details.`);
    } finally {
      setLoading(false);
      console.log('🏁 handleScanTicket process completed');
    }
  };

  // Function to handle phone number input with 10-digit validation
  const handlePhoneInputChange = (e) => {
    const value = e.target.value;
    // Only allow digits
    const digitsOnly = value.replace(/\D/g, '');
    // Limit to 10 digits
    const limitedValue = digitsOnly.slice(0, 10);
    setPhoneNumberSearch(limitedValue);
  };

  // Function to normalize phone number with +91 as default
  const normalizePhoneNumber = (phone) => {
    if (!phone) return '';
    
    // Remove all non-digit characters
    const digitsOnly = phone.replace(/\D/g, '');
    
    // If it's exactly 10 digits, add +91 as default
    if (digitsOnly.length === 10) {
      return `+91${digitsOnly}`;
    }
    
    // If it already starts with +91 and has 12 digits, return as is
    if (phone.startsWith('+91') && digitsOnly.length === 12) {
      return phone;
    }
    
    // If it's 12 digits and starts with 91, add the +
    if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
      return `+${digitsOnly}`;
    }
    
    // Default case: assume it's a 10-digit Indian number
    if (digitsOnly.length > 0) {
      return `+91${digitsOnly.slice(-10)}`;
    }
    
    return phone;
  };

  // Function to search user by phone number
  const searchUserByPhoneNumber = async () => {
    // Validate that we have exactly 10 digits
    if (phoneNumberSearch.length !== 10) {
      setError('Please enter exactly 10 digits for the phone number');
      return;
    }

    setSearching(true);
    setError(null);
    setSuccess(null);
    setUserBookingStatus(null);

    try {
      // Normalize the phone number for search with +91 as default
      const normalizedPhone = normalizePhoneNumber(phoneNumberSearch);
      console.log('Searching for phone number:', normalizedPhone);
      
      // Query the bookings collection for documents with matching phone number
      const bookingsRef = collection(db, 'bookings');
      const q = query(bookingsRef, where('phoneNumber', '==', normalizedPhone));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // Also check with the original format
        const q2 = query(bookingsRef, where('phoneNumber', '==', phoneNumberSearch));
        const querySnapshot2 = await getDocs(q2);
        
        if (querySnapshot2.empty) {
          // Check in contacts collection as well
          const contactsRef = collection(db, 'contacts');
          const q3 = query(contactsRef, where('phone', '==', normalizedPhone));
          const querySnapshot3 = await getDocs(q3);
          
          if (querySnapshot3.empty) {
            // Also check contacts with original format
            const q4 = query(contactsRef, where('phone', '==', phoneNumberSearch));
            const querySnapshot4 = await getDocs(q4);
            
            if (querySnapshot4.empty) {
              setUserBookingStatus({
                found: false,
                message: 'No bookings found for this phone number'
              });
            } else {
              const contactData = querySnapshot4.docs[0].data();
              setUserBookingStatus({
                found: true,
                isBooked: false,
                message: 'User found in contacts but no active bookings',
                userData: {
                  name: contactData.FullName || contactData.name || 'Unknown',
                  phone: contactData.phone || phoneNumberSearch,
                  email: contactData.email || 'N/A'
                }
              });
            }
          } else {
            const contactData = querySnapshot3.docs[0].data();
            setUserBookingStatus({
              found: true,
              isBooked: false,
              message: 'User found in contacts but no active bookings',
              userData: {
                name: contactData.FullName || contactData.name || 'Unknown',
                phone: contactData.phone || normalizedPhone,
                email: contactData.email || 'N/A'
              }
            });
          }
        } else {
          // User has bookings with original format
          const bookingData = querySnapshot2.docs[0].data();
          setUserBookingStatus({
            found: true,
            isBooked: true,
            message: 'User has an active booking',
            bookingData: {
              id: querySnapshot2.docs[0].id,
              eventName: bookingData.eventName || 'Unknown Event',
              userName: bookingData.userName || bookingData.name || 'Unknown',
              phone: bookingData.phoneNumber || phoneNumberSearch,
              email: bookingData.userEmail || bookingData.email || 'N/A',
              bookingDate: bookingData.bookingDate?.toDate ? 
                bookingData.bookingDate.toDate() : 
                (bookingData.bookingDate || new Date()),
              status: bookingData.status || 'confirmed'
            }
          });
        }
      } else {
        // User has bookings with normalized format
        const bookingData = querySnapshot.docs[0].data();
        setUserBookingStatus({
          found: true,
          isBooked: true,
          message: 'User has an active booking',
          bookingData: {
            id: querySnapshot.docs[0].id,
            eventName: bookingData.eventName || 'Unknown Event',
            userName: bookingData.userName || bookingData.name || 'Unknown',
            phone: bookingData.phoneNumber || normalizedPhone,
            email: bookingData.userEmail || bookingData.email || 'N/A',
            bookingDate: bookingData.bookingDate?.toDate ? 
              bookingData.bookingDate.toDate() : 
              (bookingData.bookingDate || new Date()),
            status: bookingData.status || 'confirmed'
          }
        });
      }
    } catch (err) {
      console.error('Error searching user by phone number:', err);
      setError('Failed to search for user. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  // Clean up camera when component unmounts
  useEffect(() => {
    const cleanup = () => {
      if (streamRef.current) {
        try {
          streamRef.current.getTracks().forEach(track => {
            try {
              track.stop();
            } catch (trackError) {
              console.warn('Error stopping track:', trackError);
            }
          });
        } catch (streamError) {
          console.warn('Error stopping stream:', streamError);
        }
        streamRef.current = null;
      }
      setScanning(false);
    };
    
    // Cleanup on unmount
    return cleanup;
  }, []);

  return (
    <div className="qr-scanner-container admin-panel">
      <div className="admin-header">
        <h1>QR Code Ticket Scanner</h1>
        <p className="admin-subtitle">Scan and verify event tickets</p>
      </div>
      
      <div className="scanner-wrapper">
        {/* Phone Number Search Section */}
        <div className="phone-search admin-card">
          <h3>Search User by Phone Number</h3>
          <p className="search-instructions">Enter exactly 10 digits for Indian phone numbers</p>
          <div className="search-input-container">
            <input
              type="text"
              value={phoneNumberSearch}
              onChange={handlePhoneInputChange}
              placeholder="e.g., 8270812842"
              className="admin-input"
              maxLength="10"
            />
            <button 
              onClick={searchUserByPhoneNumber}
              className="admin-btn primary"
              disabled={searching || phoneNumberSearch.length !== 10}
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          </div>
          {phoneNumberSearch.length > 0 && phoneNumberSearch.length < 10 && (
            <p className="digit-counter error-text">
              {10 - phoneNumberSearch.length} digits remaining
            </p>
          )}
          {phoneNumberSearch.length === 10 && (
            <p className="digit-counter success-text">
              ✓ Ready to search
            </p>
          )}
          
          {userBookingStatus && (
            <div className={`user-status-result ${userBookingStatus.found ? 'found' : 'not-found'}`}>
              <h4>Search Result:</h4>
              <p className={userBookingStatus.found ? 'success-text' : 'error-text'}>
                {userBookingStatus.message}
              </p>
              
              {userBookingStatus.found && (
                <div className="user-details">
                  {userBookingStatus.isBooked ? (
                    <>
                      <div className="detail-row">
                        <span className="detail-label">Name:</span>
                        <span className="detail-value">{userBookingStatus.bookingData.userName}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Phone:</span>
                        <span className="detail-value">{userBookingStatus.bookingData.phone}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Email:</span>
                        <span className="detail-value">{userBookingStatus.bookingData.email}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Event:</span>
                        <span className="detail-value">{userBookingStatus.bookingData.eventName}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Booking Date:</span>
                        <span className="detail-value">
                          {formatDate(userBookingStatus.bookingData.bookingDate)}
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Status:</span>
                        <span className={`detail-value status ${userBookingStatus.bookingData.status}`}>
                          {userBookingStatus.bookingData.status}
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Booking ID:</span>
                        <span className="detail-value">{userBookingStatus.bookingData.id}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="detail-row">
                        <span className="detail-label">Name:</span>
                        <span className="detail-value">{userBookingStatus.userData.name}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Phone:</span>
                        <span className="detail-value">{userBookingStatus.userData.phone}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Email:</span>
                        <span className="detail-value">{userBookingStatus.userData.email}</span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Tab Navigation */}
        <div className="tab-navigation admin-card">
          <div className="tab-buttons">
            <button 
              className={`tab-btn ${activeTab === 'camera' ? 'active' : ''}`}
              onClick={() => setActiveTab('camera')}
            >
              Camera Scanner
            </button>
            <button 
              className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
              onClick={() => setActiveTab('upload')}
            >
              Upload Image
            </button>
          </div>
        </div>
        
        {/* Camera Scanner */}
        {activeTab === 'camera' && (
          <div className="camera-scanner admin-card">
            <h3>Camera Scanner</h3>
            {!scanning ? (
              <button 
                onClick={startCamera}
                className="admin-btn primary"
              >
                Start Camera Scanner
              </button>
            ) : (
              <div className="scanner-view" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  className="scanner-video"
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                <button 
                  onClick={stopCamera}
                  className="admin-btn secondary"
                  style={{ marginTop: '10px' }}
                >
                  Stop Camera
                </button>
              </div>
            )}
          </div>
        )}
        
        {/* File Upload Scanner */}
        {activeTab === 'upload' && (
          <div className="file-upload-scanner admin-card">
            <h3>Upload QR Code Image</h3>
            <p>Upload an image containing a QR code:</p>
            
            {!uploadedImage ? (
              <div className="file-upload-area">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="file-input"
                  id="qr-file-upload"
                />
                <label htmlFor="qr-file-upload" className="file-upload-label admin-card">
                  <div className="upload-icon">📁</div>
                  <div className="upload-text">
                    <strong>Click to upload</strong> or drag and drop
                  </div>
                  <div className="upload-subtext">
                    PNG, JPG, JPEG, GIF, BMP files
                  </div>
                </label>
              </div>
            ) : (
              <div className="image-preview-container" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div className="image-preview admin-card">
                  <img 
                    src={uploadedImage} 
                    alt="Uploaded QR Code" 
                    className="uploaded-image"
                  />
                  <div className="image-info">
                    <p className="file-name">📄 {fileName}</p>
                    <button 
                      onClick={() => {
                        setUploadedImage(null);
                        setFileName('');
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                      className="admin-btn danger"
                    >
                      ✕ Remove Image
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            <p className="file-hint">
              Supported formats: PNG, JPG, JPEG, GIF, BMP
            </p>
          </div>
        )}

        {/* Manual Verification Section */}
        <div className="manual-input admin-card">
          <h3>Verify Ticket</h3>
          <p>QR data will appear here automatically, or enter manually:</p>
          <textarea
            value={ticketData}
            onChange={handleTicketDataChange}
            placeholder='QR code data will appear here automatically...'
            rows={4}
            className="admin-textarea"
          />
          <div className="manual-actions">
            <button 
              onClick={handleScanTicket}
              className="admin-btn primary"
              disabled={loading || !ticketData}
            >
              {loading ? 'Verifying...' : 'Verify Ticket'}
            </button>
            <button 
              onClick={clearData}
              className="admin-btn secondary"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Ticket Information Display */}
        {ticketInfo && (
          <div className="ticket-info admin-card">
            <h3>Ticket Information</h3>
            <div className="ticket-details">
              <div className="detail-row">
                <span className="detail-label">Event:</span>
                <span className="detail-value">{ticketInfo.eventName || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Event Date:</span>
                <span className="detail-value">
                  {ticketInfo.eventDate && ticketInfo.eventDate instanceof Date ? 
                    formatDate(ticketInfo.eventDate) : 
                    'N/A'}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Event Time:</span>
                <span className="detail-value">{ticketInfo.eventTime || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Attendee:</span>
                <span className="detail-value">{ticketInfo.userName || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Email:</span>
                <span className="detail-value">{ticketInfo.userEmail || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Phone:</span>
                <span className="detail-value">{ticketInfo.phoneNumber || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Booking ID:</span>
                <span className="detail-value">{ticketInfo.id || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Status:</span>
                <span className={`detail-value status ${ticketInfo.status || ''}`}>
                  {ticketInfo.status ? ticketInfo.status.charAt(0).toUpperCase() + ticketInfo.status.slice(1) : 'N/A'}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Booking Date:</span>
                <span className="detail-value">
                  {ticketInfo.bookingDate && ticketInfo.bookingDate instanceof Date ? 
                    formatDate(ticketInfo.bookingDate) : 
                    'N/A'}
                </span>
              </div>
              {(ticketInfo.isFreeTrial || ticketInfo.eventName) && (
                <div className="detail-row">
                  <span className="detail-label">Plan Status:</span>
                  <span className={`detail-value status ${isBookingValid(ticketInfo.bookingDate, getPlanType(ticketInfo.eventName)) ? 'confirmed' : 'used'}`}>
                    {isBookingValid(ticketInfo.bookingDate, getPlanType(ticketInfo.eventName)) ? 'Active' : 'Expired'}
                  </span>
                </div>
              )}
            </div>
            
            <div className="ticket-actions">
              {ticketInfo.status !== 'used' && ticketInfo.id && ticketInfo.id !== 'N/A' && (
                <button 
                  onClick={markTicketAsUsed}
                  className="admin-btn danger"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Processing...' : 'Mark as Used'}
                </button>
              )}
              <button 
                onClick={sendReminder}
                className="admin-btn secondary"
                disabled={actionLoading}
              >
                {actionLoading ? 'Sending...' : 'Send Reminder'}
              </button>
            </div>
          </div>
        )}

        {/* Status Messages */}
        {error && (
          <div className="admin-alert error">
            <span className="alert-icon">⚠️</span>
            {error}
          </div>
        )}
        
        {success && (
          <div className="admin-alert success">
            <span className="alert-icon">✅</span>
            {success}
          </div>
        )}
      </div>
    </div>
  );
};

export default QRScanner;