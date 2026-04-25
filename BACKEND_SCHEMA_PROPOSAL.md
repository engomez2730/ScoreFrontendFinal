# Backend Schema - Event Sourcing for Player Time Tracking

## Propuesta de Schema Prisma Mejorado

Este archivo documenta los cambios necesarios en el backend para implementar Event Sourcing en el tracking de tiempo jugado.

### Cambios Requeridos en `schema.prisma`

```prisma
// ===== NUEVO MODELO: Event Sourcing para tiempo jugado =====

model PlayerTimeEvent {
  id          Int      @id @default(autoincrement())
  gameId      Int
  playerId    Int
  eventType   PlayerTimeEventType
  gameTime    Int      // Tiempo de juego en segundos (ej: 480 = 8:00 restantes en Q1)
  quarter     Int      // 1, 2, 3, 4, 5+ (overtimes)
  timestamp   DateTime @default(now())
  createdAt   DateTime @default(now())
  
  // Relations
  game   Game   @relation(fields: [gameId], references: [id], onDelete: Cascade)
  player Player @relation(fields: [playerId], references: [id], onDelete: Cascade)
  
  @@index([gameId, playerId])
  @@index([gameId, quarter])
}

enum PlayerTimeEventType {
  ENTER_COURT  // Jugador entra a cancha
  EXIT_COURT   // Jugador sale de cancha
}

// ===== MODELO MODIFICADO: PlayerGameStats =====

model PlayerGameStats {
  id        Int      @id @default(autoincrement())
  gameId    Int
  playerId  Int
  
  // ... todos los stats existentes (puntos, rebotes, etc.) ...
  
  // ✅ NUEVO: Tiempo jugado desglosado por quarter (en millisegundos)
  minutosQ1   Int @default(0)
  minutosQ2   Int @default(0)
  minutosQ3   Int @default(0)
  minutosQ4   Int @default(0)
  minutosOT   Int @default(0)
  minutosTotal Int @default(0)  // Calculado desde PlayerTimeEvent
  
  // ✅ NUEVO: Plus-Minus desglosado por quarter
  plusMinusQ1 Int @default(0)
  plusMinusQ2 Int @default(0)
  plusMinusQ3 Int @default(0)
  plusMinusQ4 Int @default(0)
  plusMinusOT Int @default(0)
  plusMinusTotal Int @default(0)
  
  // ... resto de campos existentes ...
}

// ===== MODELO MODIFICADO: Substitution =====

model Substitution {
  id           Int      @id @default(autoincrement())
  gameId       Int
  playerInId   Int
  playerOutId  Int
  gameTime     Int      // Tiempo de juego cuando ocurrió
  quarter      Int      // ✅ NUEVO: Quarter cuando ocurrió
  timestamp    DateTime @default(now())
  
  // ✅ NUEVO: Referencias a los eventos de tiempo creados
  exitEventId  Int?     // FK a PlayerTimeEvent (EXIT)
  enterEventId Int?     // FK a PlayerTimeEvent (ENTER)
  
  game      Game   @relation(fields: [gameId], references: [id], onDelete: Cascade)
  playerIn  Player @relation("PlayerIn", fields: [playerInId], references: [id])
  playerOut Player @relation("PlayerOut", fields: [playerOutId], references: [id])
  
  @@index([gameId, gameTime])
}

// ===== MODELO EXISTENTE: Player =====
model Player {
  // ... campos existentes ...
  
  // ✅ NUEVA relación
  timeEvents PlayerTimeEvent[]
}

// ===== MODELO EXISTENTE: Game =====
model Game {
  // ... campos existentes ...
  
  // ✅ NUEVA relación
  timeEvents PlayerTimeEvent[]
}
```

---

## Nuevos Endpoints Backend Requeridos

### 1. Obtener eventos de tiempo de un partido

```typescript
GET /api/games/:id/player-time-events

Response:
{
  "events": [
    {
      "id": 1,
      "gameId": 123,
      "playerId": 45,
      "eventType": "ENTER_COURT",
      "gameTime": 600,
      "quarter": 1,
      "timestamp": "2026-04-25T10:00:00Z",
      "player": {
        "id": 45,
        "nombre": "Stephen",
        "apellido": "Curry",
        "numero": 30
      }
    },
    // ... más eventos
  ]
}
```

### 2. Calcular minutos en tiempo real desde eventos

```typescript
GET /api/games/:id/player-minutes/live

Response:
{
  "playerMinutes": {
    "45": 120000,  // 2 minutos en millisegundos
    "46": 90000,   // 1.5 minutos
    // ...
  },
  "calculatedAt": "2026-04-25T10:02:00Z"
}
```

### 3. Crear sustitución (MODIFICADO)

```typescript
POST /api/games/:id/substitution

Request:
{
  "playerOutId": 45,
  "playerInId": 46,
  "gameTime": 480,  // Tiempo restante en segundos
  "quarter": 1
}

Backend debe automáticamente:
1. Crear registro Substitution
2. Crear PlayerTimeEvent (EXIT) para playerOut
3. Crear PlayerTimeEvent (ENTER) para playerIn
4. Actualizar PlayerGameStats.minutosQ1 para ambos jugadores
5. Vincular exitEventId y enterEventId en Substitution

Response:
{
  "substitution": { /* ... */ },
  "exitEvent": { /* ... */ },
  "enterEvent": { /* ... */ }
}
```

### 4. Iniciar partido (MODIFICADO)

```typescript
POST /api/games/:id/start

Request:
{
  "starters": {
    "home": [1, 2, 3, 4, 5],
    "away": [6, 7, 8, 9, 10]
  }
}

Backend debe:
1. Cambiar estado del partido a "in_progress"
2. Crear PlayerTimeEvent (ENTER_COURT) para los 10 jugadores iniciales
3. Registrar gameTime y quarter actuales

Response:
{
  "game": { /* ... */ },
  "timeEvents": [ /* 10 eventos ENTER_COURT */ ]
}
```

---

## Lógica de Cálculo de Minutos (Backend)

```typescript
/**
 * Calcular minutos jugados desde eventos
 */
function calculatePlayerMinutes(
  playerId: number, 
  events: PlayerTimeEvent[], 
  currentGameTime?: number
): number {
  let totalMilliseconds = 0;
  let lastEnterTime: number | null = null;
  
  // Ordenar eventos por timestamp
  const sortedEvents = events.sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  
  for (const event of sortedEvents) {
    if (event.eventType === 'ENTER_COURT') {
      lastEnterTime = event.gameTime;
    } else if (event.eventType === 'EXIT_COURT' && lastEnterTime !== null) {
      // Calcular tiempo jugado en este stint
      const stintSeconds = lastEnterTime - event.gameTime;
      totalMilliseconds += stintSeconds * 1000;
      lastEnterTime = null;
    }
  }
  
  // Si aún está en cancha, sumar tiempo actual
  if (lastEnterTime !== null && currentGameTime !== undefined) {
    const currentStintSeconds = lastEnterTime - currentGameTime;
    totalMilliseconds += currentStintSeconds * 1000;
  }
  
  return totalMilliseconds;
}

/**
 * Calcular minutos por quarter
 */
function calculatePlayerMinutesByQuarter(
  playerId: number, 
  events: PlayerTimeEvent[]
): Record<number, number> {
  const minutesByQuarter: Record<number, number> = {
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0
  };
  
  // Agrupar eventos por quarter
  const eventsByQuarter = events.reduce((acc, event) => {
    if (!acc[event.quarter]) acc[event.quarter] = [];
    acc[event.quarter].push(event);
    return acc;
  }, {} as Record<number, PlayerTimeEvent[]>);
  
  // Calcular minutos para cada quarter
  Object.entries(eventsByQuarter).forEach(([quarter, quarterEvents]) => {
    minutesByQuarter[parseInt(quarter)] = calculatePlayerMinutes(
      playerId, 
      quarterEvents
    );
  });
  
  return minutesByQuarter;
}
```

---

## Migración de Datos Existentes

Si ya tienes partidos con minutos registrados, necesitarás migrar:

```typescript
/**
 * Script de migración: Crear eventos desde minutos existentes
 * 
 * ADVERTENCIA: Esto es una aproximación. Los eventos creados NO serán
 * históricamente precisos, pero permitirán que el sistema funcione.
 */
async function migrateExistingMinutesToEvents() {
  const games = await prisma.game.findMany({
    where: { estado: { in: ['in_progress', 'finished'] } },
    include: {
      stats: {
        include: { player: true }
      }
    }
  });
  
  for (const game of games) {
    for (const stat of game.stats) {
      if (stat.minutos > 0) {
        // Crear evento ENTER al inicio del partido
        await prisma.playerTimeEvent.create({
          data: {
            gameId: game.id,
            playerId: stat.playerId,
            eventType: 'ENTER_COURT',
            gameTime: 600, // Asumimos inicio de Q1
            quarter: 1,
            timestamp: game.createdAt,
          }
        });
        
        // Crear evento EXIT calculado
        const secondsPlayed = stat.minutos / 1000;
        await prisma.playerTimeEvent.create({
          data: {
            gameId: game.id,
            playerId: stat.playerId,
            eventType: 'EXIT_COURT',
            gameTime: 600 - secondsPlayed,
            quarter: 1,
            timestamp: new Date(game.createdAt.getTime() + stat.minutos),
          }
        });
      }
    }
  }
  
  console.log('✅ Migration completed');
}
```

---

## Testing

### Test 1: Verificar cálculo de minutos desde eventos

```typescript
// Caso: Jugador entra al inicio, juega 2 minutos, sale
const events = [
  { eventType: 'ENTER_COURT', gameTime: 600, quarter: 1 },
  { eventType: 'EXIT_COURT', gameTime: 480, quarter: 1 }
];

const minutes = calculatePlayerMinutes(45, events);
// Esperado: 120000 milliseconds (2 minutos)
```

### Test 2: Jugador aún en cancha

```typescript
const events = [
  { eventType: 'ENTER_COURT', gameTime: 600, quarter: 1 }
];

const minutes = calculatePlayerMinutes(45, events, 540);
// Esperado: 60000 milliseconds (1 minuto)
```

---

## Ventajas de Event Sourcing

✅ **Audit trail completo** - Historial inmutable de todas las entradas/salidas
✅ **Reconstruible** - Minutos se calculan desde eventos, no se acumulan
✅ **Sincronizado con sustituciones** - Eventos se crean automáticamente
✅ **A prueba de fallos** - Si frontend crashea, backend tiene todos los eventos
✅ **Desglose por quarter** - Fácil ver cuánto jugó en cada periodo
✅ **Plus-minus contextualizado** - Saber +/- por stint/periodo

---

## Implementación Recomendada

**Orden de implementación:**

1. ✅ Crear modelos en Prisma (PlayerTimeEvent, modificar Substitution)
2. ✅ Correr migración: `npx prisma migrate dev --name add-time-events`
3. ✅ Implementar endpoints GET para consultar eventos
4. ✅ Modificar endpoint POST /substitution para crear eventos
5. ✅ Modificar endpoint POST /games/:id/start para crear eventos iniciales
6. ✅ (Opcional) Migrar datos existentes
7. ✅ Frontend: Adaptar para usar nuevos endpoints

**Tiempo estimado:** 1-2 semanas de desarrollo backend
