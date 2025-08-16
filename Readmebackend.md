# Basketball Stats API Documentation

## Base URL

`http://localhost:4000`

## Authentication

(Pending implementation)

## API Endpoints

### Players

```
GET /players
- Get all players with their teams and stats
- Response: Array of players

GET /players/:id
- Get a specific player by ID
- Response: Player object with related data

POST /players
- Create a new player
- Body: { nombre, apellido, numero, posicion, teamId }
- Response: Created player object

PUT /players/:id
- Update a player
- Body: { nombre, apellido, numero, posicion, teamId }
- Response: Updated player object

DELETE /players/:id
- Delete a player
- Response: Success message
```

### Teams

```
GET /teams
- Get all teams with their players
- Response: Array of teams

GET /teams/:id
- Get a specific team by ID
- Response: Team object with related data

POST /teams
- Create a new team
- Body: { nombre, logo }
- Response: Created team object

PUT /teams/:id
- Update a team
- Body: { nombre, logo }
- Response: Updated team object

DELETE /teams/:id
- Delete a team
- Response: Success message
```

### Events (Tournaments/Leagues)

```
GET /events
- Get all events with their games
- Response: Array of events

GET /events/:id
- Get a specific event by ID
- Response: Event object with related data

POST /events
- Create a new event
- Body: { nombre, fechaInicio, fechaFin }
- Response: Created event object

PUT /events/:id
- Update an event
- Body: { nombre, fechaInicio, fechaFin }
- Response: Updated event object

DELETE /events/:id
- Delete an event
- Response: Success message
```

### Games

```
GET /games
- Get all games with related data
- Response: Array of games

GET /games/:id
- Get a specific game by ID
- Response: Game object with all related data

POST /games
- Create a new game
- Body: { eventId, teamHomeId, teamAwayId, fecha, estado }
- Response: Created game object

PUT /games/:id
- Update a game
- Body: { eventId, teamHomeId, teamAwayId, fecha, estado }
- Response: Updated game object

DELETE /games/:id
- Delete a game
- Response: Success message
```

### Player Game Stats

```
GET /player-game-stats/game/:gameId
- Get all player stats for a specific game
- Response: Array of player stats

GET /player-game-stats/player/:playerId
- Get all game stats for a specific player
- Response: Array of game stats

POST /player-game-stats/:gameId/:playerId
- Create or update player stats for a game
- Requires: Player must be on court
- Body: {
    puntos,
    rebotes,
    asistencias,
    robos,
    tapones,
    tirosIntentados,
    tirosAnotados,
    tiros3Intentados,
    tiros3Anotados,
    minutos,
    plusMinus
  }
- Response: Updated stats object
```

### Substitutions

```
GET /substitutions/game/:gameId
- Get all substitutions for a game
- Response: Array of substitutions

POST /substitutions
- Create a new substitution
- Body: { gameId, playerInId, playerOutId, timestamp }
- Response: Created substitution object
```

## Real-time Events (Socket.IO)

### Connection

```javascript
// Connect to Socket.IO
const socket = io("http://localhost:4000");
```

### Game Room Events

```javascript
// Join a game room
socket.emit("joinGame", gameId);

// Clock control
socket.emit("startClock", gameId);
socket.emit("pauseClock", gameId);
socket.emit("resetClock", gameId);

// Listen for clock updates
socket.on("clockStarted", ({ gameId, time }) => {});
socket.on("clockPaused", ({ gameId, time }) => {});
socket.on("clockReset", ({ gameId }) => {});

// Stats and substitutions
socket.emit("updateStats", { gameId, playerId, stats });
socket.emit("substitution", { gameId, playerInId, playerOutId, timestamp });

// Listen for updates
socket.on("statsUpdated", (data) => {});
socket.on("substitutionMade", (data) => {});
```

## Important Notes

1. All IDs in requests should be numbers
2. Dates should be sent in ISO format
3. Player stats can only be updated if the player is currently on court
4. Game clock and minutes played are synchronized in real-time
5. Real-time updates are broadcast to all clients in the same game room

## Database Schema

The API uses PostgreSQL with Prisma ORM. See `prisma/schema.prisma` for detailed model definitions.
