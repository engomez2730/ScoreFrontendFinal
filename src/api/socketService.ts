import { io, Socket } from "socket.io-client";
import type { PlayerGameStats } from "./playerService";
import type { Substitution } from "./substitutionService";

export interface ClockEvent {
  gameId: number;
  time: number;
}

class SocketService {
  private socket: Socket | null = null;

  connect() {
    // Get auth token from cookies
    const getToken = (): string | null => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; auth_token=`);
      if (parts.length === 2) {
        return parts.pop()?.split(";").shift() || null;
      }
      return null;
    };

    const token = getToken();
    
    this.socket = io("http://localhost:4000", {
      auth: {
        token: token
      }
    });
    
    console.log("🔌 Socket connected with auth token:", token ? "✓" : "✗");
    
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Game room management
  joinGame(gameId: number) {
    this.socket?.emit("joinGame", gameId);
  }

  // Clock control
  startClock(gameId: number) {
    this.socket?.emit("startClock", gameId);
  }

  pauseClock(gameId: number) {
    this.socket?.emit("pauseClock", gameId);
  }

  resetClock(gameId: number) {
    this.socket?.emit("resetClock", gameId);
  }

  // Stats and substitutions
  updateStats(gameId: number, playerId: number, stats: PlayerGameStats) {
    this.socket?.emit("updateStats", { gameId, playerId, stats });
  }

  makeSubstitution(substitution: Substitution) {
    this.socket?.emit("substitution", substitution);
  }

  // Event listeners
  onClockStarted(callback: (data: ClockEvent) => void) {
    this.socket?.on("clockStarted", callback);
  }

  onClockPaused(callback: (data: ClockEvent) => void) {
    this.socket?.on("clockPaused", callback);
  }

  onClockReset(callback: (data: { gameId: number }) => void) {
    this.socket?.on("clockReset", callback);
  }

  onStatsUpdated(callback: (data: any) => void) {
    this.socket?.on("statsUpdated", callback);
  }

  onSubstitutionMade(callback: (data: Substitution) => void) {
    this.socket?.on("substitutionMade", callback);
  }

  // Cleanup
  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }
}

const socketService = new SocketService();
export default socketService;
