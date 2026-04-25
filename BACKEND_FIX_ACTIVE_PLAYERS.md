# 🔧 INSTRUCCIONES BACKEND - Fix: Jugadores Activos en Cancha

## 📋 Problema Detectado

El frontend **NO puede mostrar los jugadores en cancha** cuando un usuario (ADMIN, REBOUNDER, SCORER, etc.) entra al juego, especialmente en modo incógnito o desde otro navegador.

### ❌ Causa Raíz:
El backend **NO está guardando** los jugadores activos (`activePlayerIds`) en la base de datos cuando se inicia el juego.

### 🎯 Síntoma:
```
GET /games/:gameId/active-players
Respuesta actual: { homeTeam: { players: [] }, awayTeam: { players: [] } }
                                           ↑↑ VACÍO - DEBE TENER 5 JUGADORES POR EQUIPO
```

---

## 🔍 Verificación del Problema

### Test 1: Iniciar Juego
```bash
# Cuando el ADMIN inicia el juego, el frontend envía:
POST http://localhost:3000/games/1/start

Body:
{
  "activePlayerIds": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  "gameSettings": {
    "quarterLength": 720,
    "totalQuarters": 4,
    "overtimeLength": 300
  }
}

# DEBE:
# 1. Cambiar game.estado = "in_progress"
# 2. GUARDAR los 10 IDs en la base de datos
# 3. Marcar cuáles son del equipo local (primeros 5) y visitante (últimos 5)
```

### Test 2: Obtener Jugadores Activos
```bash
# Cuando CUALQUIER usuario (incluso en incógnito) carga el juego:
GET http://localhost:3000/games/1/active-players

# DEBE responder:
{
  "homeTeam": {
    "id": 1,
    "nombre": "Lakers",
    "players": [
      { "id": 1, "numero": 23, "nombre": "LeBron", "apellido": "James", "posicion": "SF" },
      { "id": 2, "numero": 3, "nombre": "Anthony", "apellido": "Davis", "posicion": "PF" },
      { "id": 3, "numero": 1, "nombre": "D'Angelo", "apellido": "Russell", "posicion": "PG" },
      { "id": 4, "numero": 28, "nombre": "Rui", "apellido": "Hachimura", "posicion": "PF" },
      { "id": 5, "numero": 15, "nombre": "Austin", "apellido": "Reaves", "posicion": "SG" }
    ]
  },
  "awayTeam": {
    "id": 2,
    "nombre": "Warriors",
    "players": [
      { "id": 6, "numero": 30, "nombre": "Stephen", "apellido": "Curry", "posicion": "PG" },
      { "id": 7, "numero": 11, "nombre": "Klay", "apellido": "Thompson", "posicion": "SG" },
      { "id": 8, "numero": 23, "nombre": "Draymond", "apellido": "Green", "posicion": "PF" },
      { "id": 9, "numero": 22, "nombre": "Andrew", "apellido": "Wiggins", "posicion": "SF" },
      { "id": 10, "numero": 5, "nombre": "Kevon", "apellido": "Looney", "posicion": "C" }
    ]
  }
}
```

---

## 🛠️ Implementación Requerida

### 1️⃣ Modelo de Base de Datos

Necesitas una tabla para guardar qué jugadores están activos en cada momento del juego.

#### Opción A: Tabla `ActivePlayers` (Recomendada)
```sql
CREATE TABLE ActivePlayers (
  id SERIAL PRIMARY KEY,
  gameId INTEGER NOT NULL REFERENCES Games(id),
  playerId INTEGER NOT NULL REFERENCES Players(id),
  teamId INTEGER NOT NULL REFERENCES Teams(id),
  enteredAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  leftAt TIMESTAMP NULL,
  isCurrentlyOnCourt BOOLEAN DEFAULT true,
  
  CONSTRAINT unique_active_player UNIQUE(gameId, playerId, isCurrentlyOnCourt)
);

CREATE INDEX idx_active_players_game ON ActivePlayers(gameId, isCurrentlyOnCourt);
```

#### Opción B: Campos JSON en tabla `Games` (Más simple pero menos flexible)
```sql
ALTER TABLE Games ADD COLUMN activeHomePlayers JSONB DEFAULT '[]';
ALTER TABLE Games ADD COLUMN activeAwayPlayers JSONB DEFAULT '[]';

-- Ejemplo de datos:
-- activeHomePlayers: [1, 2, 3, 4, 5]
-- activeAwayPlayers: [6, 7, 8, 9, 10]
```

---

### 2️⃣ Endpoint: `POST /games/:gameId/start`

#### Request:
```typescript
{
  activePlayerIds: number[];  // [1,2,3,4,5,6,7,8,9,10] - 10 IDs en total
  gameSettings?: {
    quarterLength?: number;
    totalQuarters?: number;
    overtimeLength?: number;
  };
}
```

#### Implementación:
```javascript
// games.controller.js o games.routes.js

router.post('/games/:gameId/start', async (req, res) => {
  const { gameId } = req.params;
  const { activePlayerIds, gameSettings } = req.body;

  try {
    // 1. Validar que haya exactamente 10 jugadores
    if (!activePlayerIds || activePlayerIds.length !== 10) {
      return res.status(400).json({ 
        error: 'Se requieren exactamente 10 jugadores (5 por equipo)' 
      });
    }

    // 2. Obtener el juego y sus equipos
    const game = await prisma.game.findUnique({
      where: { id: parseInt(gameId) },
      include: { teamHome: true, teamAway: true }
    });

    if (!game) {
      return res.status(404).json({ error: 'Juego no encontrado' });
    }

    // 3. Separar jugadores por equipo
    // Los primeros 5 IDs son del equipo local, los últimos 5 del visitante
    const homePlayers = activePlayerIds.slice(0, 5);
    const awayPlayers = activePlayerIds.slice(5, 10);

    // 4. Verificar que los jugadores pertenecen a los equipos correctos
    const homePlayerRecords = await prisma.player.findMany({
      where: { 
        id: { in: homePlayers },
        teamId: game.teamHomeId 
      }
    });

    const awayPlayerRecords = await prisma.player.findMany({
      where: { 
        id: { in: awayPlayers },
        teamId: game.teamAwayId 
      }
    });

    if (homePlayerRecords.length !== 5 || awayPlayerRecords.length !== 5) {
      return res.status(400).json({ 
        error: 'Los jugadores no pertenecen a los equipos correctos' 
      });
    }

    // 5. Guardar jugadores activos en la base de datos
    // OPCIÓN A: Usar tabla ActivePlayers
    await prisma.$transaction([
      // Limpiar jugadores activos previos (por si se reconfigura)
      prisma.activePlayer.updateMany({
        where: { gameId: parseInt(gameId), isCurrentlyOnCourt: true },
        data: { isCurrentlyOnCourt: false, leftAt: new Date() }
      }),
      
      // Insertar nuevos jugadores activos
      prisma.activePlayer.createMany({
        data: [
          ...homePlayers.map(playerId => ({
            gameId: parseInt(gameId),
            playerId: playerId,
            teamId: game.teamHomeId,
            isCurrentlyOnCourt: true
          })),
          ...awayPlayers.map(playerId => ({
            gameId: parseInt(gameId),
            playerId: playerId,
            teamId: game.teamAwayId,
            isCurrentlyOnCourt: true
          }))
        ]
      })
    ]);

    // OPCIÓN B: Usar campos JSON en Games
    /*
    await prisma.game.update({
      where: { id: parseInt(gameId) },
      data: {
        activeHomePlayers: homePlayers,
        activeAwayPlayers: awayPlayers,
        estado: 'in_progress',
        ...gameSettings
      }
    });
    */

    // 6. Actualizar estado del juego
    const updatedGame = await prisma.game.update({
      where: { id: parseInt(gameId) },
      data: {
        estado: 'in_progress',
        quarterLength: gameSettings?.quarterLength,
        totalQuarters: gameSettings?.totalQuarters,
        overtimeLength: gameSettings?.overtimeLength
      }
    });

    console.log('✅ Game started with active players:', {
      home: homePlayers,
      away: awayPlayers
    });

    return res.json({ 
      success: true, 
      game: updatedGame,
      activePlayers: {
        home: homePlayers,
        away: awayPlayers
      }
    });

  } catch (error) {
    console.error('Error starting game:', error);
    return res.status(500).json({ error: 'Error al iniciar el juego' });
  }
});
```

---

### 3️⃣ Endpoint: `GET /games/:gameId/active-players`

Este endpoint **DEBE ser público** (sin autenticación) para que cualquier usuario pueda ver quiénes están en cancha.

#### Response Esperado:
```typescript
{
  homeTeam: {
    id: number;
    nombre: string;
    players: Player[];  // Array de 5 jugadores
  };
  awayTeam: {
    id: number;
    nombre: string;
    players: Player[];  // Array de 5 jugadores
  };
}
```

#### Implementación:
```javascript
// games.controller.js o games.routes.js

router.get('/games/:gameId/active-players', async (req, res) => {
  const { gameId } = req.params;

  try {
    // 1. Obtener el juego
    const game = await prisma.game.findUnique({
      where: { id: parseInt(gameId) },
      include: {
        teamHome: true,
        teamAway: true
      }
    });

    if (!game) {
      return res.status(404).json({ error: 'Juego no encontrado' });
    }

    // 2. Obtener jugadores activos
    // OPCIÓN A: Desde tabla ActivePlayers
    const activePlayers = await prisma.activePlayer.findMany({
      where: {
        gameId: parseInt(gameId),
        isCurrentlyOnCourt: true
      },
      include: {
        player: true,
        team: true
      }
    });

    // Separar por equipo
    const homePlayers = activePlayers
      .filter(ap => ap.teamId === game.teamHomeId)
      .map(ap => ap.player);

    const awayPlayers = activePlayers
      .filter(ap => ap.teamId === game.teamAwayId)
      .map(ap => ap.player);

    // OPCIÓN B: Desde campos JSON en Games
    /*
    const homePlayerIds = game.activeHomePlayers || [];
    const awayPlayerIds = game.activeAwayPlayers || [];

    const homePlayers = await prisma.player.findMany({
      where: { id: { in: homePlayerIds } }
    });

    const awayPlayers = await prisma.player.findMany({
      where: { id: { in: awayPlayerIds } }
    });
    */

    console.log('✅ Returning active players:', {
      home: homePlayers.length,
      away: awayPlayers.length
    });

    // 3. Responder con la estructura esperada
    return res.json({
      homeTeam: {
        id: game.teamHome.id,
        nombre: game.teamHome.nombre,
        logo: game.teamHome.logo,
        players: homePlayers
      },
      awayTeam: {
        id: game.teamAway.id,
        nombre: game.teamAway.nombre,
        logo: game.teamAway.logo,
        players: awayPlayers
      }
    });

  } catch (error) {
    console.error('Error fetching active players:', error);
    return res.status(500).json({ 
      error: 'Error al obtener jugadores activos',
      homeTeam: { players: [] },
      awayTeam: { players: [] }
    });
  }
});
```

---

### 4️⃣ Endpoint: `PUT /games/:gameId/active-players` (Para Sustituciones)

Cuando se hace una sustitución, el frontend envía los nuevos IDs activos.

#### Request:
```typescript
{
  playerIds: number[];  // [1,2,3,4,5,6,7,8,9,10] - Los 10 IDs actuales después de la sustitución
}
```

#### Implementación:
```javascript
router.put('/games/:gameId/active-players', async (req, res) => {
  const { gameId } = req.params;
  const { playerIds } = req.body;

  try {
    if (!playerIds || playerIds.length !== 10) {
      return res.status(400).json({ 
        error: 'Se requieren exactamente 10 jugadores activos' 
      });
    }

    const game = await prisma.game.findUnique({
      where: { id: parseInt(gameId) }
    });

    if (!game) {
      return res.status(404).json({ error: 'Juego no encontrado' });
    }

    const homePlayers = playerIds.slice(0, 5);
    const awayPlayers = playerIds.slice(5, 10);

    // OPCIÓN A: Actualizar tabla ActivePlayers
    await prisma.$transaction([
      // Marcar todos como fuera de cancha
      prisma.activePlayer.updateMany({
        where: { 
          gameId: parseInt(gameId), 
          isCurrentlyOnCourt: true 
        },
        data: { 
          isCurrentlyOnCourt: false, 
          leftAt: new Date() 
        }
      }),
      
      // Crear nuevos registros de jugadores en cancha
      prisma.activePlayer.createMany({
        data: [
          ...homePlayers.map(playerId => ({
            gameId: parseInt(gameId),
            playerId: playerId,
            teamId: game.teamHomeId,
            isCurrentlyOnCourt: true
          })),
          ...awayPlayers.map(playerId => ({
            gameId: parseInt(gameId),
            playerId: playerId,
            teamId: game.teamAwayId,
            isCurrentlyOnCourt: true
          }))
        ]
      })
    ]);

    // OPCIÓN B: Actualizar campos JSON
    /*
    await prisma.game.update({
      where: { id: parseInt(gameId) },
      data: {
        activeHomePlayers: homePlayers,
        activeAwayPlayers: awayPlayers
      }
    });
    */

    return res.json({ success: true });

  } catch (error) {
    console.error('Error updating active players:', error);
    return res.status(500).json({ error: 'Error al actualizar jugadores activos' });
  }
});
```

---

## ✅ Checklist de Implementación

- [ ] **1. Crear tabla `ActivePlayers`** o agregar campos JSON en `Games`
- [ ] **2. Implementar `POST /games/:gameId/start`**
  - [ ] Validar 10 jugadores
  - [ ] Separar en home (0-4) y away (5-9)
  - [ ] Guardar en BD
  - [ ] Cambiar estado a "in_progress"
- [ ] **3. Implementar `GET /games/:gameId/active-players`**
  - [ ] Consultar BD (no localStorage)
  - [ ] Retornar estructura correcta con players array
  - [ ] Hacer endpoint PÚBLICO (sin auth)
- [ ] **4. Implementar `PUT /games/:gameId/active-players`**
  - [ ] Actualizar jugadores activos en BD
  - [ ] Manejar sustituciones
- [ ] **5. Testing**
  - [ ] Test 1: Iniciar juego → verificar que guarda en BD
  - [ ] Test 2: GET active-players → debe retornar 5+5 jugadores
  - [ ] Test 3: Entrar en incógnito → debe ver jugadores

---

## 🧪 Cómo Probar

### Test Manual:

```bash
# 1. Iniciar juego
curl -X POST http://localhost:3000/games/1/start \
  -H "Content-Type: application/json" \
  -d '{
    "activePlayerIds": [1,2,3,4,5,6,7,8,9,10],
    "gameSettings": {
      "quarterLength": 720,
      "totalQuarters": 4
    }
  }'

# 2. Verificar en BD que se guardó
# SELECT * FROM ActivePlayers WHERE gameId = 1 AND isCurrentlyOnCourt = true;
# O: SELECT activeHomePlayers, activeAwayPlayers FROM Games WHERE id = 1;

# 3. Obtener jugadores activos
curl http://localhost:3000/games/1/active-players

# DEBE retornar:
# {
#   "homeTeam": { "players": [ {5 jugadores} ] },
#   "awayTeam": { "players": [ {5 jugadores} ] }
# }
```

---

## 📊 Logs Esperados

### Backend debe loguear:

```
✅ Game started with active players: { home: [1,2,3,4,5], away: [6,7,8,9,10] }
✅ Returning active players: { home: 5, away: 5 }
```

### Frontend recibirá:

```
🌐 Backend response (full): { data: { homeTeam: {...}, awayTeam: {...} } }
🌐 Home players from BD: 5 [...]
🌐 Away players from BD: 5 [...]
✅ Using active players from BACKEND: { home: [1,2,3,4,5], away: [6,7,8,9,10] }
```

---

## ❓ Preguntas Frecuentes

### ¿Por qué no usar localStorage?
- localStorage es por navegador/dispositivo
- En incógnito se borra
- Otros usuarios no pueden ver los mismos datos
- **El backend DEBE ser la fuente de verdad**

### ¿Qué pasa si se reconfigura el lineup?
- El endpoint `POST /start` debe limpiar los jugadores activos previos
- Marcar los antiguos como `isCurrentlyOnCourt: false`
- Insertar los nuevos como `isCurrentlyOnCourt: true`

### ¿Necesito autenticación en GET /active-players?
- **NO**. Debe ser público para que cualquier usuario (anotador, reboteador, etc.) pueda ver quiénes están en cancha sin necesidad de permisos especiales.

---

## 🚀 Resultado Esperado

Después de implementar esto:

1. ✅ **ADMIN inicia juego** → Backend guarda los 10 jugadores activos
2. ✅ **Usuario REBOUNDER entra** (incluso en incógnito) → Ve los 10 jugadores en cancha
3. ✅ **Se hace sustitución** → Backend actualiza quiénes están en cancha
4. ✅ **Cualquier usuario recarga** → Sigue viendo los jugadores correctos

---

## 📞 Soporte

Si después de implementar esto sigues viendo:
```
❌❌❌ CRITICAL: Backend returned NO active players!
```

Verifica:
1. Que el endpoint `/games/:gameId/start` realmente guarda en BD
2. Que el endpoint `/games/:gameId/active-players` lee de BD (no hardcoded)
3. Los logs del backend para ver qué está retornando
4. Ejecuta query directo en BD: `SELECT * FROM ActivePlayers WHERE gameId = X`

---

**Fecha de creación:** 25/04/2026  
**Versión:** 1.0  
**Prioridad:** 🔴 CRÍTICA - Sin esto, usuarios no pueden registrar estadísticas
