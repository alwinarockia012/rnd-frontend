import React, { useState, useEffect } from 'react';
import { db, storage } from '../../firebase';
import { collection, addDoc, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import firebaseService from '../../services/firebaseService';
import { formatDate } from '../../utils/dateUtils';
import './ManageEvents.css';

const ManageEvents = () => {
    const [upcomingEvent, setUpcomingEvent] = useState({
        name: '',
        date: '',
        time: '',
        description: '',
        location: ''
    });

    const [pastEvent, setPastEvent] = useState({
        name: '',
        date: '',
        description: '',
        location: '',
        imageUrl: '',
        imageFile: null
    });

    const [upcomingEvents, setUpcomingEvents] = useState([]);
    const [pastEvents, setPastEvents] = useState([]);
    const [editingEvent, setEditingEvent] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [mainUpcomingEvent, setMainUpcomingEvent] = useState(null); // For the main event shown on landing page
    const [bookingStatus, setBookingStatus] = useState('closed'); // For storing booking status
    const [closeBookingTime, setCloseBookingTime] = useState(''); // For storing close booking time
    const [showTimePicker, setShowTimePicker] = useState(false); // For controlling time picker visibility
    const [selectedHour, setSelectedHour] = useState(12); // Default hour
    const [selectedMinute, setSelectedMinute] = useState(0); // Default minute
    const [selectedPeriod, setSelectedPeriod] = useState('AM'); // Default period

    useEffect(() => {
        fetchEvents();
        fetchMainUpcomingEvent(); // Fetch the main upcoming event
        ensureDefaultEventExists(); // Ensure default event exists
    }, []);

    // Ensure default "Weekly Community Run" event exists
    const ensureDefaultEventExists = async () => {
        try {
            // Look for an event with "Weekly Community Run" in the name
            const eventsRef = collection(db, 'upcomingEvents');
            const q = query(eventsRef, where('name', '==', 'Weekly Community Run'));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                // Create default event if it doesn't exist
                const defaultEvent = {
                    name: 'Weekly Community Run',
                    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Next week
                    time: '07:00 AM',
                    location: 'C3 Cafe, City Park',
                    description: 'Join fellow runners for an unforgettable experience.',
                    participants: 25,
                    maxParticipants: 50,
                    status: 'Open for Registration'
                };
                
                await addDoc(collection(db, 'upcomingEvents'), defaultEvent);
                console.log('Default "Weekly Community Run" event created');
            }
        } catch (error) {
            console.error('Error ensuring default event exists: ', error);
        }
    };

    // Fetch the main upcoming event (the one shown on landing page)
    const fetchMainUpcomingEvent = async () => {
        try {
            // Look for an event with "Weekly Community Run" in the name
            const eventsRef = collection(db, 'upcomingEvents');
            const q = query(eventsRef, where('name', '==', 'Weekly Community Run'));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                // Use the first matching event
                const doc = querySnapshot.docs[0];
                setMainUpcomingEvent({ id: doc.id, ...doc.data() });
            } else {
                // Initialize with default values if not exists
                setMainUpcomingEvent({
                    name: 'Weekly Community Run',
                    date: new Date().toISOString().split('T')[0],
                    time: '07:00 AM',
                    location: 'C3 Cafe, City Park',
                    description: 'Join fellow runners for an unforgettable experience.',
                    participants: 25,
                    maxParticipants: 50
                });
            }
        } catch (error) {
            console.error('Error fetching main upcoming event: ', error);
        }
    };

    const fetchEvents = async () => {
        const upcoming = await firebaseService.getUpcomingEvents();
        const past = await firebaseService.getPastEvents();
        setUpcomingEvents(upcoming);
        setPastEvents(past);
    };

    const handleUpcomingChange = (e) => {
        setUpcomingEvent({ ...upcomingEvent, [e.target.name]: e.target.value });
    };

    const handlePastChange = (e) => {
        if (e.target.type === 'file') {
            const file = e.target.files?.[0];
            if (file) {
                // Validate file type
                if (!file.type.startsWith('image/')) {
                    alert('Please select an image file');
                    e.target.value = ''; // Reset file input
                    return;
                }
                
                // Validate file size (max 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    alert('File size should be less than 5MB');
                    e.target.value = ''; // Reset file input
                    return;
                }

                setPastEvent(prev => ({ 
                    ...prev, 
                    imageFile: file,
                    imageUrl: '' // Clear imageUrl when a file is selected
                }));
            }
        } else {
            setPastEvent(prev => ({ 
                ...prev, 
                [e.target.name]: e.target.value 
            }));
        }
    };

    // Handle changes for main upcoming event
    const handleMainEventChange = (e) => {
        setMainUpcomingEvent({ ...mainUpcomingEvent, [e.target.name]: e.target.value });
    };

    // Handle time selection
    const handleTimeSelect = () => {
        // Format the time as HH:MM AM/PM
        let hour = selectedHour;
        if (selectedPeriod === 'AM' && hour === 12) {
            hour = 0;
        } else if (selectedPeriod === 'PM' && hour !== 12) {
            hour += 12;
        }
        
        const formattedTime = `${String(hour).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}`;
        setCloseBookingTime(`${mainUpcomingEvent.date}T${formattedTime}`);
        setShowTimePicker(false);
        setBookingStatus('closed');
    };

    // Save the main upcoming event
    const handleSaveMainEvent = async (e) => {
        e.preventDefault();
        
        // Ask for booking options before saving
        const shouldSave = window.confirm('Do you want to save the main event with the selected booking options?');
        if (!shouldSave) return;
        
        try {
            // Prepare event data with booking information
            const eventData = {
                ...mainUpcomingEvent,
                bookingStatus: bookingStatus
            };
            
            // Add close booking time if status is closed and time is set
            if (bookingStatus === 'closed' && closeBookingTime) {
                eventData.bookingCloseTime = new Date(closeBookingTime);
            }
            
            if (mainUpcomingEvent.id) {
                // Update existing event
                await firebaseService.updateUpcomingEvent(mainUpcomingEvent.id, eventData);
            } else {
                // Create new event
                await addDoc(collection(db, 'upcomingEvents'), eventData);
            }
            
            // Reset booking options
            setBookingStatus('closed');
            setCloseBookingTime('');
            
            // Set flag to notify UserEventsPage to refresh
            localStorage.setItem('eventsUpdated', 'true');
            alert('Main upcoming event updated successfully!');
            fetchMainUpcomingEvent(); // Refresh the data
            fetchEvents(); // Refresh the events list
        } catch (error) {
            console.error('Error updating main upcoming event: ', error);
            alert('Failed to update main upcoming event.');
        }
    };

    const handleUpcomingSubmit = async (e) => {
        e.preventDefault();
        if (!upcomingEvent.name || !upcomingEvent.date) {
            alert('Please fill out at least the name and date for the upcoming event.');
            return;
        }
        try {
            await addDoc(collection(db, 'upcomingEvents'), upcomingEvent);
            // Set flag to notify UserEventsPage to refresh
            localStorage.setItem('eventsUpdated', 'true');
            alert('Upcoming event added successfully!');
            setUpcomingEvent({ name: '', date: '', time: '', description: '', location: '' });
            fetchEvents();
        } catch (error) {
            console.error('Error adding upcoming event: ', error);
            alert('Failed to add upcoming event.');
        }
    };

    const handlePastSubmit = async (e) => {
        e.preventDefault();
        if (!pastEvent.name || !pastEvent.date || (!pastEvent.imageFile && !pastEvent.imageUrl)) {
            alert('Please fill out all fields for the past event, including either an image file or URL.');
            return;
        }
        
        try {
            let imageUrl = pastEvent.imageUrl;
            
            // If there's a file to upload
            if (pastEvent.imageFile) {
                // Create a reference to the file in Firebase Storage
                const imageRef = ref(storage, `past-events/${Date.now()}-${pastEvent.imageFile.name}`);
                
                // Upload the file
                await uploadBytes(imageRef, pastEvent.imageFile);
                
                // Get the download URL
                imageUrl = await getDownloadURL(imageRef);
            }
            
            // Prepare data for Firestore
            const dataToUpload = {
                name: pastEvent.name,
                date: pastEvent.date,
                description: pastEvent.description,
                location: pastEvent.location,
                imageUrl: imageUrl
            };
            
            // Add to Firestore
            await addDoc(collection(db, 'pastEvents'), dataToUpload);
            
            // Set flag to notify UserEventsPage to refresh
            localStorage.setItem('eventsUpdated', 'true');
            alert('Past event added successfully!');
            
            // Reset form
            setPastEvent({ 
                name: '', 
                date: '', 
                description: '', 
                location: '',
                imageUrl: '',
                imageFile: null 
            });
            
            fetchEvents();
        } catch (error) {
            console.error('Error adding past event: ', error);
            alert('Failed to add past event: ' + error.message);
        }
    };

    const handleDeleteUpcoming = async (eventId) => {
        if (window.confirm('Are you sure you want to delete this upcoming event?')) {
            try {
                await firebaseService.deleteUpcomingEvent(eventId);
                // Set flag to notify UserEventsPage to refresh
                localStorage.setItem('eventsUpdated', 'true');
                alert('Upcoming event deleted successfully!');
                fetchEvents();
                // If this was the main event, refresh it
                if (mainUpcomingEvent && mainUpcomingEvent.id === eventId) {
                    fetchMainUpcomingEvent();
                }
            } catch (error) {
                console.error('Error deleting upcoming event: ', error);
                alert('Failed to delete upcoming event.');
            }
        }
    };

    const handleDeletePast = async (eventId) => {
        if (window.confirm('Are you sure you want to delete this past event?')) {
            try {
                await firebaseService.deletePastEvent(eventId);
                // Set flag to notify UserEventsPage to refresh
                localStorage.setItem('eventsUpdated', 'true');
                alert('Past event deleted successfully!');
                fetchEvents();
            } catch (error) {
                console.error('Error deleting past event: ', error);
                alert('Failed to delete past event.');
            }
        }
    };

    // Handle opening bookings for an event
    const handleToggleBookingStatus = async (eventId, status) => {
        try {
            const eventRef = doc(db, 'upcomingEvents', eventId);
            await updateDoc(eventRef, {
                bookingStatus: status,
                updatedAt: new Date()
            });
            
            // Set flag to notify UserEventsPage to refresh
            localStorage.setItem('eventsUpdated', 'true');
            alert(`Bookings ${status === 'open' ? 'opened' : 'closed'} successfully!`);
            fetchEvents();
        } catch (error) {
            console.error(`Error ${status === 'open' ? 'opening' : 'closing'} bookings: `, error);
            alert(`Failed to ${status === 'open' ? 'open' : 'close'} bookings.`);
        }
    };

    // Handle setting close booking time
    const handleSetCloseBookingTime = async (eventId) => {
        const time = prompt('Enter the time when bookings should close (e.g., 2023-12-31 18:00):');
        if (time) {
            try {
                const closeTime = new Date(time);
                if (isNaN(closeTime.getTime())) {
                    alert('Invalid date/time format. Please use YYYY-MM-DD HH:MM format.');
                    return;
                }
                
                const eventRef = doc(db, 'upcomingEvents', eventId);
                await updateDoc(eventRef, {
                    bookingStatus: 'closed',
                    bookingCloseTime: closeTime,
                    updatedAt: new Date()
                });
                
                // Set flag to notify UserEventsPage to refresh
                localStorage.setItem('eventsUpdated', 'true');
                alert('Bookings closed successfully!');
                fetchEvents();
            } catch (error) {
                console.error('Error closing bookings: ', error);
                alert('Failed to close bookings.');
            }
        }
    };

    const handleEdit = (event, type) => {
        // Format the date for the input field if it's a Firebase timestamp
        let formattedEvent = { ...event, type };
        
        if (event.date && typeof event.date === 'object' && event.date.seconds) {
            // Convert Firebase timestamp to date string for input
            const dateObj = new Date(event.date.seconds * 1000);
            formattedEvent.date = dateObj.toISOString().split('T')[0];
        } else if (event.date && event.date instanceof Date) {
            // Convert Date object to date string for input
            formattedEvent.date = event.date.toISOString().split('T')[0];
        }
        
        setEditingEvent(formattedEvent);
        setIsEditing(true);
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        const { type, id, ...data } = editingEvent;
        try {
            if (type === 'upcoming') {
                await firebaseService.updateUpcomingEvent(id, data);
                // If this was the main event, refresh it
                if (mainUpcomingEvent && mainUpcomingEvent.id === id) {
                    fetchMainUpcomingEvent();
                }
            } else {
                await firebaseService.updatePastEvent(id, data);
            }
            // Set flag to notify UserEventsPage to refresh
            localStorage.setItem('eventsUpdated', 'true');
            alert('Event updated successfully!');
            setIsEditing(false);
            setEditingEvent(null);
            fetchEvents();
        } catch (error) {
            console.error('Error updating event: ', error);
            alert('Failed to update event.');
        }
    };

    return (
        <div className="manage-events">
            <h2>Manage Events</h2>
            
            {/* Main Upcoming Event Section */}
            <div className="form-container">
                <h3>Main Upcoming Event (Landing Page & User Events)</h3>
                {mainUpcomingEvent && (
                    <form onSubmit={handleSaveMainEvent}>
                        <input 
                            type="text" 
                            name="name" 
                            value={mainUpcomingEvent.name} 
                            onChange={handleMainEventChange} 
                            placeholder="Event Name" 
                            required 
                        />
                        <input 
                            type="date" 
                            name="date" 
                            value={mainUpcomingEvent.date} 
                            onChange={handleMainEventChange} 
                            required 
                        />
                        <input 
                            type="text" 
                            name="time" 
                            value={mainUpcomingEvent.time || ''} 
                            onChange={handleMainEventChange} 
                            placeholder="Event Time (e.g., 07:00 AM)" 
                        />
                        <textarea 
                            name="description" 
                            value={mainUpcomingEvent.description || ''} 
                            onChange={handleMainEventChange} 
                            placeholder="Description"
                        ></textarea>
                        <input 
                            type="text" 
                            name="location" 
                            value={mainUpcomingEvent.location || ''} 
                            onChange={handleMainEventChange} 
                            placeholder="Location" 
                        />
                        <div className="form-group">
                            <label>Participants:</label>
                            <input 
                                type="number" 
                                name="participants" 
                                value={mainUpcomingEvent.participants || 0} 
                                onChange={handleMainEventChange} 
                                min="0"
                            />
                        </div>
                        <div className="form-group">
                            <label>Max Participants:</label>
                            <input 
                                type="number" 
                                name="maxParticipants" 
                                value={mainUpcomingEvent.maxParticipants || 50} 
                                onChange={handleMainEventChange} 
                                min="1"
                            />
                        </div>
                        
                        {/* Booking Controls */}
                        <div className="form-group">
                            <label>Booking Status:</label>
                            <div className="booking-controls">
                                <button 
                                    type="button"
                                    className={`booking-btn ${bookingStatus === 'open' ? 'active' : ''}`}
                                    onClick={() => {
                                        setBookingStatus('open');
                                        setShowTimePicker(false);
                                    }}
                                >
                                    Open Bookings
                                </button>
                                <button 
                                    type="button"
                                    className={`booking-btn ${bookingStatus === 'closed' ? 'active' : ''}`}
                                    onClick={() => setShowTimePicker(!showTimePicker)}
                                >
                                    Close Bookings
                                </button>
                            </div>
                            
                            {/* Time Picker for Close Bookings */}
                            {showTimePicker && (
                                <div className="time-picker">
                                    <div className="time-inputs">
                                        <select 
                                            value={selectedHour} 
                                            onChange={(e) => setSelectedHour(parseInt(e.target.value))}
                                        >
                                            {[...Array(12)].map((_, i) => (
                                                <option key={i} value={i === 0 ? 12 : i}>
                                                    {i === 0 ? 12 : i}
                                                </option>
                                            ))}
                                        </select>
                                        <span>:</span>
                                        <select 
                                            value={selectedMinute} 
                                            onChange={(e) => setSelectedMinute(parseInt(e.target.value))}
                                        >
                                            {/* Generate options for all 60 minutes */}
                                            {[...Array(60)].map((_, i) => (
                                                <option key={i} value={i}>
                                                    {String(i).padStart(2, '0')}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="period-buttons">
                                            <button 
                                                type="button"
                                                className={selectedPeriod === 'AM' ? 'active' : ''}
                                                onClick={() => setSelectedPeriod('AM')}
                                            >
                                                AM
                                            </button>
                                            <button 
                                                type="button"
                                                className={selectedPeriod === 'PM' ? 'active' : ''}
                                                onClick={() => setSelectedPeriod('PM')}
                                            >
                                                PM
                                            </button>
                                        </div>
                                    </div>
                                    <button 
                                        type="button" 
                                        className="set-time-btn"
                                        onClick={handleTimeSelect}
                                    >
                                        Set Time
                                    </button>
                                </div>
                            )}
                            
                            {bookingStatus === 'closed' && closeBookingTime && (
                                <p className="close-time-info">Bookings will close at: {new Date(closeBookingTime).toLocaleString()}</p>
                            )}
                        </div>
                        
                        <button type="submit">Save Main Event</button>
                    </form>
                )}
            </div>

            <div className="event-forms">
                <div className="form-container">
                    <h3>Add Upcoming Event</h3>
                    <form onSubmit={handleUpcomingSubmit}>
                        <input type="text" name="name" value={upcomingEvent.name} onChange={handleUpcomingChange} placeholder="Event Name" required />
                        <input type="date" name="date" value={upcomingEvent.date} onChange={handleUpcomingChange} required />
                        <input type="text" name="time" value={upcomingEvent.time} onChange={handleUpcomingChange} placeholder="Event Time (e.g., 07:00 AM)" />
                        <textarea name="description" value={upcomingEvent.description} onChange={handleUpcomingChange} placeholder="Description"></textarea>
                        <input type="text" name="location" value={upcomingEvent.location} onChange={handleUpcomingChange} placeholder="Location" />
                        <button type="submit">Add Upcoming Event</button>
                    </form>
                </div>
                <div className="form-container">
                    <h3>Add Past Event</h3>
                    <form onSubmit={handlePastSubmit}>
                        <input type="text" name="name" value={pastEvent.name} onChange={handlePastChange} placeholder="Event Name" required />
                        <input type="date" name="date" value={pastEvent.date} onChange={handlePastChange} required />
                        <textarea name="description" value={pastEvent.description} onChange={handlePastChange} placeholder="Description"></textarea>
                        <input type="text" name="location" value={pastEvent.location} onChange={handlePastChange} placeholder="Location" />
                        <div className="image-upload-container">
                            <div className="file-input-wrapper">
                                <input 
                                    type="file" 
                                    name="imageFile"
                                    id="past-event-image" 
                                    accept="image/*" 
                                    onChange={handlePastChange}
                                />
                                <button 
                                    type="button"
                                    className="file-upload-btn"
                                    onClick={() => document.getElementById('past-event-image').click()}
                                >
                                    {pastEvent.imageFile ? 'Change Image File' : 'Choose Image File'}
                                </button>
                            </div>
                            {pastEvent.imageFile && (
                                <div className="selected-file">
                                    <span>Selected: {pastEvent.imageFile.name}</span>
                                    <button 
                                        type="button" 
                                        className="clear-file"
                                        onClick={() => {
                                            setPastEvent({
                                                ...pastEvent,
                                                imageFile: null
                                            });
                                            // Reset the file input
                                            const fileInput = document.getElementById('past-event-image');
                                            if (fileInput) fileInput.value = '';
                                        }}
                                    >
                                        ×
                                    </button>
                                </div>
                            )}
                            <div className="or-divider">OR</div>
                            <input 
                                type="text" 
                                name="imageUrl" 
                                value={pastEvent.imageUrl} 
                                onChange={handlePastChange} 
                                placeholder="Image URL (alternative to file upload)" 
                            />
                            {(pastEvent.imageFile || pastEvent.imageUrl) && (
                                <div className="image-preview">
                                    <p>Image Preview:</p>
                                    <img 
                                        src={pastEvent.imageFile ? URL.createObjectURL(pastEvent.imageFile) : pastEvent.imageUrl} 
                                        alt="Preview" 
                                        style={{ maxWidth: '200px', maxHeight: '200px', objectFit: 'cover' }} 
                                    />
                                </div>
                            )}
                        </div>
                        <button type="submit">Add Past Event</button>
                    </form>
                </div>
            </div>

            <div className="events-list">
                <h3>Upcoming Events</h3>
                <ul>
                    {upcomingEvents.map(event => (
                        <li key={event.id}>
                            <div>
                                <strong>{event.name}</strong> - {formatDate(event.date)}
                                {event.bookingStatus && (
                                    <span className={`booking-status ${event.bookingStatus}`}>
                                        ({event.bookingStatus === 'open' ? 'Bookings Open' : 'Bookings Closed'})
                                    </span>
                                )}
                            </div>
                            <div>
                                <button onClick={() => handleEdit(event, 'upcoming')}>Edit</button>
                                <button 
                                    onClick={() => handleToggleBookingStatus(event.id, 'open')}
                                    className={event.bookingStatus === 'open' ? 'active' : ''}
                                >
                                    Open Bookings
                                </button>
                                <button 
                                    onClick={() => handleSetCloseBookingTime(event.id)}
                                    className={event.bookingStatus === 'closed' ? 'active' : ''}
                                >
                                    Close Bookings
                                </button>
                                <button onClick={() => handleDeleteUpcoming(event.id)}>Delete</button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="events-list">
                <h3>Past Events</h3>
                <ul>
                    {pastEvents.map(event => (
                        <li key={event.id}>
                            {event.name} - {formatDate(event.date)}
                            {event.imageUrl && <img src={event.imageUrl} alt={event.name} style={{ width: '50px', height: '50px', objectFit: 'cover', marginLeft: '10px' }} />}
                            <button onClick={() => handleEdit(event, 'past')}>Edit</button>
                            <button onClick={() => handleDeletePast(event.id)}>Delete</button>
                        </li>
                    ))}
                </ul>
            </div>

            {isEditing && editingEvent && (
                <div className="modal">
                    <div className="modal-content">
                        <h3>Edit Event</h3>
                        <form onSubmit={handleUpdate}>
                            <input type="text" name="name" value={editingEvent.name} onChange={(e) => setEditingEvent({ ...editingEvent, name: e.target.value })} placeholder="Event Name" required />
                            <input type="date" name="date" value={editingEvent.date} onChange={(e) => setEditingEvent({ ...editingEvent, date: e.target.value })} required />
                            {editingEvent.type === 'upcoming' && (
                                <input type="text" name="time" value={editingEvent.time || ''} onChange={(e) => setEditingEvent({ ...editingEvent, time: e.target.value })} placeholder="Event Time (e.g., 07:00 AM)" />
                            )}
                            <textarea name="description" value={editingEvent.description || ''} onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })} placeholder="Description"></textarea>
                            {editingEvent.type === 'upcoming' && (
                                <input type="text" name="location" value={editingEvent.location || ''} onChange={(e) => setEditingEvent({ ...editingEvent, location: e.target.value })} placeholder="Location" />
                            )}
                            {/* Add imageUrl field to edit modal for past events */}
                            {editingEvent.type === 'past' && (
                                <>
                                    <input type="text" name="location" value={editingEvent.location || ''} onChange={(e) => setEditingEvent({ ...editingEvent, location: e.target.value })} placeholder="Location" />
                                    <input type="text" name="imageUrl" value={editingEvent.imageUrl || ''} onChange={(e) => setEditingEvent({ ...editingEvent, imageUrl: e.target.value })} placeholder="Image URL" />
                                </>
                            )}
                            <button type="submit">Update Event</button>
                            <button onClick={() => setIsEditing(false)}>Cancel</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageEvents;