import React, { useState, useEffect } from 'react';
import { db } from '../../firebase'; // Assuming firebase is configured and db is exported from this path
import { collection, addDoc, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
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
        imageUrl: '' // Changed from image: null
    });

    const [upcomingEvents, setUpcomingEvents] = useState([]);
    const [pastEvents, setPastEvents] = useState([]);
    const [editingEvent, setEditingEvent] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [mainUpcomingEvent, setMainUpcomingEvent] = useState(null); // For the main event shown on landing page

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
        // Directly update the state for imageUrl
        setPastEvent({ ...pastEvent, [e.target.name]: e.target.value });
    };

    // Handle changes for main upcoming event
    const handleMainEventChange = (e) => {
        setMainUpcomingEvent({ ...mainUpcomingEvent, [e.target.name]: e.target.value });
    };

    // Save the main upcoming event
    const handleSaveMainEvent = async (e) => {
        e.preventDefault();
        try {
            if (mainUpcomingEvent.id) {
                // Update existing event
                await firebaseService.updateUpcomingEvent(mainUpcomingEvent.id, mainUpcomingEvent);
            } else {
                // Create new event
                await addDoc(collection(db, 'upcomingEvents'), mainUpcomingEvent);
            }
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
        // Check for imageUrl instead of image file
        if (!pastEvent.name || !pastEvent.date || !pastEvent.imageUrl) {
            alert('Please fill out all fields for the past event, including the Image URL.');
            return;
        }
        console.log('Submitting past event:', pastEvent);
        try {
            // No image upload needed, directly use imageUrl from state
            const dataToUpload = {
                ...pastEvent
            };
            console.log('Data to upload to Firestore:', dataToUpload);
            await addDoc(collection(db, 'pastEvents'), dataToUpload);
            // Set flag to notify UserEventsPage to refresh
            localStorage.setItem('eventsUpdated', 'true');
            alert('Past event added successfully!');
            setPastEvent({ name: '', date: '', description: '', imageUrl: '' }); // Reset imageUrl
            fetchEvents();
        } catch (error) {
            console.error('Error adding past event: ', error);
            alert('Failed to add past event.');
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
                        {/* Changed to text input for Image URL */}
                        <input type="text" name="imageUrl" value={pastEvent.imageUrl} onChange={handlePastChange} placeholder="Image URL" required />
                        <button type="submit">Add Past Event</button>
                    </form>
                </div>
            </div>

            <div className="events-list">
                <h3>Upcoming Events</h3>
                <ul>
                    {upcomingEvents.map(event => (
                        <li key={event.id}>
                            {event.name} - {formatDate(event.date)}
                            <button onClick={() => handleEdit(event, 'upcoming')}>Edit</button>
                            <button onClick={() => handleDeleteUpcoming(event.id)}>Delete</button>
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
                                <input type="text" name="imageUrl" value={editingEvent.imageUrl || ''} onChange={(e) => setEditingEvent({ ...editingEvent, imageUrl: e.target.value })} placeholder="Image URL" />
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