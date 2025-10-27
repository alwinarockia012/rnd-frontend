# Event Registration Firestore Structure

## Document Path
`events/registrationEvent`

## Document Fields
```javascript
{
  location: "string",           // Event location
  eventDate: firebase.firestore.Timestamp,  // Event date
  registrationOpen: firebase.firestore.Timestamp,  // Registration open timestamp
  registrationClose: firebase.firestore.Timestamp  // Registration close timestamp
}
```

## Example Document
```javascript
{
  location: "Central Park, New York",
  eventDate: firebase.firestore.Timestamp.fromDate(new Date('2025-12-15')),
  registrationOpen: firebase.firestore.Timestamp.fromDate(new Date('2025-11-01')),
  registrationClose: firebase.firestore.Timestamp.fromDate(new Date('2025-12-01'))
}
```