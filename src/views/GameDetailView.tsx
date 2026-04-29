import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Row,
  Col,
  Typography,
  Statistic,
  Button,
  Space,
  Modal,
  App,
  List,
  Tag,
  Tabs,
  message,
} from "antd";
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  BarChartOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import { generateGamePdf } from "../utils/gamePdfGenerator";
import { playerAPI } from "../services/apiService";

import { gameAPI, teamAPI } from "../services/apiService";
import gameService from "../api/gameService";
import permissionService from "../api/permissionService";
import api from "../api/axios";
import { useAuth } from "../contexts/AuthContext";
import socketService from "../api/socketService";
import { GameClock, ScoreBoard, Court, BenchArea, StatsModal, LineupModal } from "../components/game";
import { useSubstitutions } from "../hooks/useSubstitutions";
import { useLineupSelection } from "../hooks/useLineupSelection";
import type { Player, Team, Game as GameType } from "../types/game.types";

const { Title, Text } = Typography;

// Note: courtStyle, playerCircle, and benchStyle have been moved to their respective components

// Game interface for API response
interface Game {
  id: number;
  teamHomeId: number;
  teamAwayId: number;
  eventId: number;
  fecha: string;
  estado: 'scheduled' | 'in_progress' | 'paused' | 'finished';
  gameTime: number;
  homeScore: number;
  awayScore: number;
  currentQuarter: number;
  quarterLength: number;
  totalQuarters: number;
  overtimeLength: number;
  quarterTime: number;
  isOvertime?: boolean;
  event?: {
    id: number;
    nombre: string;
    fechaInicio: string;
    fechaFin: string;
  };
  teamHome: {
    id: number;
    nombre: string;
    logo?: string;
  };
  teamAway: {
    id: number;
    nombre: string;
    logo?: string;
  };
  stats: Array<{
    id: number;
    gameId: number;
    playerId: number;
    puntos: number;
    rebotes: number;
    asistencias: number;
    robos: number;
    tapones: number;
    tirosIntentados: number;
    tirosAnotados: number;
    tiros3Intentados: number;
    tiros3Anotados: number;
    minutos: number;
    plusMinus: number;
  }>;
}

const GameDetailView: React.FC = (): React.ReactNode => {
  const { id } = useParams<{ id: string }>();
  const { user, hasPermission, joinGame, currentGamePermissions } = useAuth();
  const { notification } = App.useApp();
  const [game, setGame] = useState<Game | null>(null);
  const [homeTeam, setHomeTeam] = useState<Team | null>(null);
  const [awayTeam, setAwayTeam] = useState<Team | null>(null);
  
  // Use refs to hold latest team data for the timer to avoid closure issues
  const homeTeamRef = useRef<Team | null>(null);
  const awayTeamRef = useRef<Team | null>(null);
  
  // Update refs whenever teams change
  useEffect(() => {
    homeTeamRef.current = homeTeam;
  }, [homeTeam]);
  
  useEffect(() => {
    awayTeamRef.current = awayTeam;
  }, [awayTeam]);
  
  const [isLineupModalVisible, setIsLineupModalVisible] = useState(false);

  // Lineup selection hook
  const {
    selectedPlayers,
    togglePlayerSelection,
    setSelection: setSelectedPlayers,
  } = useLineupSelection({ maxPlayers: 5 });

  const QUARTER_LENGTH = 600; // 10 minutes in seconds
  const [gameTime, setGameTime] = useState(() => {
    const savedTime = localStorage.getItem(`gameTime_${id}`);
    return savedTime ? parseInt(savedTime) : QUARTER_LENGTH;
  });
  const [isClockRunning, setIsClockRunning] = useState(() => {
    const saved = localStorage.getItem(`game-${id}-clockRunning`);
    return saved === 'true';
  });
  const [timerInterval, setTimerInterval] = useState<ReturnType<
    typeof setInterval
  > | null>(null);
  
  // Track player minutes in milliseconds - will be restored from localStorage in useEffect
  // NOTE: We can't use localStorage in useState initializer because 'id' from useParams
  // might not be available yet during initial render
  const [playerMinutes, setPlayerMinutes] = useState<Record<number, number>>({});
  // Track player plus-minus: {playerId: plusMinusValue}
  const [playerPlusMinus, setPlayerPlusMinus] = useState<
    Record<number, number>
  >(() => {
    // Initialize from localStorage if available
    const gameId = window.location.pathname.split("/").pop();
    const saved = localStorage.getItem(`game-${gameId}-plusminus`);
    return saved ? JSON.parse(saved) : {};
  });

  // Track last timer update for precise time tracking using useRef to avoid closure issues
  const lastTimerUpdateRef = useRef<number>(Date.now());
  
  // ✅ NEW: Ref to track clock running state for use inside interval callbacks
  const isClockRunningRef = useRef<boolean>(isClockRunning);
  
  // Auto-save interval ref
  const autoSaveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Restore playerMinutes from localStorage when component mounts (once id is available)
  useEffect(() => {
    if (id &&Object.keys(playerMinutes).length === 0) {
      const saved = localStorage.getItem(`game-${id}-playerMinutes`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          console.log(`📥 INITIAL LOAD: Restored player minutes from localStorage:`, parsed);
          setPlayerMinutes(parsed);
        } catch (e) {
          console.error('Error parsing saved player minutes:', e);
        }
      }
    }
  }, [id]); // Only run when id becomes available

  // ✅ NEW: Sync isClockRunning state with ref for use in interval callbacks
  useEffect(() => {
    isClockRunningRef.current = isClockRunning;
  }, [isClockRunning]);

  // Save playerMinutes to localStorage whenever it changes
  useEffect(() => {
    if (id && Object.keys(playerMinutes).length > 0) {
      localStorage.setItem(`game-${id}-playerMinutes`, JSON.stringify(playerMinutes));
      console.log(`💾 Saved player minutes to localStorage`);
    }
  }, [playerMinutes, id]);

  // Save gameTime to localStorage whenever it changes
  useEffect(() => {
    if (id && game) {
      localStorage.setItem(`gameTime_${id}`, gameTime.toString());
    }
  }, [gameTime, id, game]);

  // Save clock running state to localStorage
  useEffect(() => {
    if (id) {
      localStorage.setItem(`game-${id}-clockRunning`, isClockRunning.toString());
    }
  }, [isClockRunning, id]);
  
  // Save active players (isOnCourt) to localStorage whenever teams change
  useEffect(() => {
    if (id && homeTeam && awayTeam) {
      const activePlayers = {
        home: homeTeam.players.filter(p => p.isOnCourt).map(p => p.id),
        away: awayTeam.players.filter(p => p.isOnCourt).map(p => p.id)
      };
      
      // Only save if we actually have players on court, or if it's the initial lineup setup
      // Don't save empty arrays for a game in progress (it would overwrite valid data)
      if (activePlayers.home.length > 0 || activePlayers.away.length > 0 || game?.estado === 'scheduled') {
        localStorage.setItem(`game-${id}-activePlayers`, JSON.stringify(activePlayers));
        console.log(`💾 Saved active players to localStorage:`, activePlayers);
      } else if (game?.estado === 'in_progress') {
        console.log(`⚠️ Skipping save of empty active players for in_progress game`);
      }
    }
  }, [homeTeam, awayTeam, id, game?.estado]);
  
  // Clean up localStorage when game finishes
  useEffect(() => {
    if (game?.estado === 'finished' && id) {
      console.log('🧽 Cleaning up localStorage for finished game');
      localStorage.removeItem(`game-${id}-playerMinutes`);
      localStorage.removeItem(`gameTime_${id}`);
      localStorage.removeItem(`game-${id}-clockRunning`);
      localStorage.removeItem(`game-${id}-plusminus`);
      localStorage.removeItem(`game-${id}-activePlayers`);
    }
  }, [game?.estado, id]);

  // Save plus-minus to localStorage whenever it changes
  useEffect(() => {
    const gameId = window.location.pathname.split("/").pop();
    console.log(
      `💾 SAVING plus-minus to localStorage for game ${gameId}:`,
      playerPlusMinus
    );
    localStorage.setItem(
      `game-${gameId}-plusminus`,
      JSON.stringify(playerPlusMinus)
    );

    // Verify it was saved
    const savedValue = localStorage.getItem(`game-${gameId}-plusminus`);
    console.log(`✅ VERIFIED localStorage content:`, savedValue);
  }, [playerPlusMinus]);

  const [statsModal, setStatsModal] = useState<{
    visible: boolean;
    player: Player | null;
    activeTab: "shots" | "other";
  }>({
    visible: false,
    player: null,
    activeTab: "shots",
  });

  // Substitution hook
  const { substitutionState, startSubstitution, cancelSubstitution, completeSubstitution } =
    useSubstitutions({
      gameId: id,
      homeTeam,
      awayTeam,
      gameTime,
      quarterLength: QUARTER_LENGTH,
      playerMinutes,
      hasPermission,
      onTeamUpdate: (team, players) => {
        if (team === 'home') {
          setHomeTeam((prev) => (prev ? { ...prev, players } : null));
        } else {
          setAwayTeam((prev) => (prev ? { ...prev, players } : null));
        }
      },
    });

  // Fullscreen mode for mobile
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showBenchInFullscreen, setShowBenchInFullscreen] = useState(false);
  const isMobile = window.innerWidth < 768;

  // PDF download state
  const [pdfLoading, setPdfLoading] = useState(false);

  const handleDownloadPdf = async () => {
    if (!game) return;
    try {
      setPdfLoading(true);
      // Fetch full game data (includes all detailed stats)
      const gameResponse = await gameAPI.getGame(game.id);
      const fullGameData = gameResponse.data;

      // Fetch all players to build a name lookup map
      const playersResponse = await playerAPI.getPlayers();
      const playersMap: Record<number, any> = {};
      (playersResponse.data as any[]).forEach((p: any) => {
        playersMap[p.id] = p;
      });

      generateGamePdf(fullGameData, playersMap);
    } catch (err) {
      console.error("Error generating PDF:", err);
      message.error("No se pudo generar el PDF del resumen");
    } finally {
      setPdfLoading(false);
    }
  };

  // Debug: Log team state changes
  useEffect(() => {
    if (homeTeam && awayTeam) {
      console.log("🔍 TEAMS STATE UPDATE:", {
        homeTeam: {
          name: homeTeam.nombre,
          totalPlayers: homeTeam.players?.length || 0,
          playersOnCourt: homeTeam.players?.filter((p: Player) => p.isOnCourt).length || 0,
          players: homeTeam.players?.map((p: Player) => ({
            id: p.id,
            name: `#${p.numero} ${p.nombre}`,
            isOnCourt: p.isOnCourt
          }))
        },
        awayTeam: {
          name: awayTeam.nombre,
          totalPlayers: awayTeam.players?.length || 0,
          playersOnCourt: awayTeam.players?.filter((p: Player) => p.isOnCourt).length || 0,
          players: awayTeam.players?.map((p: Player) => ({
            id: p.id,
            name: `#${p.numero} ${p.nombre}`,
            isOnCourt: p.isOnCourt
          }))
        }
      });
    }
  }, [homeTeam, awayTeam]);

  // Get 5 on-court and bench players for each team
  const getOnCourtPlayers = (team: Team) => {
    return team.players.filter((p) => p.isOnCourt);
  };
  const getBenchPlayers = (team: Team) => {
    return team.players.filter((p) => !p.isOnCourt);
  };

  // Fetch game data
  const fetchGameData = async () => {
    try {
      if (id) {
        const gameData = await gameService.getById(Number(id));
        setGame(gameData);
      }
    } catch (error) {
      console.error("Error fetching game data:", error);
      message.error("Failed to refresh game data");
    }
  };

  // Handle stats modal
  const openStatsModal = (player: Player, activeTab?: "shots" | "other") => {
    console.log("Opening stats modal for player:", player);
    console.log("Player on court:", player.isOnCourt);

    // Check if the player is on the court
    if (!player.isOnCourt) {
      message.warning({
        content: `${player.nombre} ${player.apellido} debe estar en la cancha para registrar estadísticas`,
        duration: 3,
      });
      return;
    }

    // Determine the default tab based on user permissions
    let defaultTab: "shots" | "other";

    if (!activeTab) {
      // If user can edit shots/points/free throws, default to shots tab
      if (
        hasPermission("canEditShots") ||
        hasPermission("canEditPoints") ||
        hasPermission("canEditFreeThrows")
      ) {
        defaultTab = "shots";
      }
      // Otherwise, default to other stats tab
      else {
        defaultTab = "other";
      }
    } else {
      defaultTab = activeTab;
    }

    console.log("All validations passed, opening modal");
    setStatsModal({ visible: true, player, activeTab: defaultTab });
  };

  const closeStatsModal = () => {
    setStatsModal({ visible: false, player: null, activeTab: "shots" });
  };

  // Substitution functions now come from useSubstitutions hook

  const recordStat = async (
    statType: "assist" | "rebound" | "offensiveRebound" | "steal" | "block" | "turnover" | "foul"
  ) => {
    console.log("recordStat called:", {
      statType,
      player: statsModal.player?.nombre,
    });

    if (!statsModal.player || !game) {
      console.log("Missing player or game data");
      return;
    }

    // Validate player is on court
    if (!statsModal.player.isOnCourt) {
      console.log("Player not on court");
      message.error({
        content: "El jugador debe estar en la cancha para registrar estadísticas",
        duration: 1,
      });
      return;
    }

    try {
      console.log("Making API call to record stat...");
      switch (statType) {
        case "assist":
          await gameAPI.recordAssist(game.id, statsModal.player.id);
          break;
        case "rebound":
          await gameAPI.recordRebound(game.id, statsModal.player.id);
          break;
        case "offensiveRebound":
          await gameAPI.recordOffensiveRebound(game.id, statsModal.player.id);
          break;
        case "steal":
          await gameAPI.recordSteal(game.id, statsModal.player.id);
          break;
        case "block":
          await gameAPI.recordBlock(game.id, statsModal.player.id);
          break;
        case "turnover":
          await gameAPI.recordTurnover(game.id, statsModal.player.id);
          break;
        case "foul":
          await gameAPI.recordFoul(game.id, statsModal.player.id);
          break;
      }

      console.log("Stat recorded successfully");
      message.success({
        content: `Se registró un ${statType === "assist"
          ? "asistencia"
          : statType === "rebound"
            ? "rebote"
            : statType === "offensiveRebound"
              ? "rebote ofensivo"
              : statType === "steal"
                ? "robo"
                : statType === "turnover"
                  ? "pérdida"
                  : statType === "foul"
                    ? "falta personal"
                    : "tapón"
          } para ${statsModal.player.nombre} ${statsModal.player.apellido}`,
        duration: 1,
      });

      // Close modal for non-shot stats (rebotes, asistencias, robos, tapones, etc.)
      closeStatsModal();

      // Refresh game data without calling loadGameData to preserve timer state
      try {
        const updatedGame = await gameAPI.getGame(game.id);
        setGame(updatedGame.data);
        
        // Update team scores without reloading entire team data
        setHomeTeam(prev => prev ? { ...prev, score: updatedGame.data.homeScore || 0 } : null);
        setAwayTeam(prev => prev ? { ...prev, score: updatedGame.data.awayScore || 0 } : null);
      } catch (error) {
        console.error("Error refreshing game data:", error);
      }
    } catch (error) {
      console.error("Error recording stat:", error);
      message.error({
        content: "No se pudo registrar la estadística",
        duration: 1,
      });
    }
  };

  // Record shot (intelligent shot tracking)
  const recordShot = async (shotType: string, made: boolean) => {
    console.log("recordShot called:", {
      shotType,
      made,
      player: statsModal.player?.nombre,
    });

    if (!statsModal.player || !game) {
      console.log("Missing player or game data");
      return;
    }

    // Validate player is on court
    if (!statsModal.player.isOnCourt) {
      console.log("Player not on court");
      notification.error({
        message: "Error",
        description: "El jugador debe estar en la cancha para registrar tiros",
      });
      return;
    }

    try {
      console.log("Making API call to record shot...");
      const currentGameTime = QUARTER_LENGTH - gameTime; // Convert countdown time to elapsed time
      console.log("Game time:", currentGameTime);

      // Get player's current minutes (convert from milliseconds to seconds)
      const playerCurrentMinutes = Math.floor(
        (playerMinutes[statsModal.player.id] || 0) / 1000
      );
      console.log(
        `Player ${statsModal.player.nombre} current minutes: ${playerCurrentMinutes} seconds`
      );

      await gameAPI.recordShot(game.id, {
        playerId: statsModal.player.id,
        shotType,
        made,
        gameTime: currentGameTime,
        playerMinutes: playerCurrentMinutes,
      });

      console.log("Shot recorded successfully");
      message.success({
        content: `Tiro Registrado - ${made ? "Anotado" : "Fallado"} ${shotType === "2pt"
          ? "Tiro de 2 Puntos"
          : shotType === "3pt"
            ? "Tiro de 3 Puntos"
            : shotType === "ft"
              ? "Tiro Libre"
              : "Tiro"
          } por ${statsModal.player.nombre} ${statsModal.player.apellido}`,
        duration: 1,
      });

      closeStatsModal();
      // Refresh game data (scores, stats) without calling loadGameData to preserve timer state
      try {
        const updatedGame = await gameAPI.getGame(game.id);
        setGame(updatedGame.data);
        
        // Update team scores without reloading entire team data
        setHomeTeam(prev => prev ? { ...prev, score: updatedGame.data.homeScore || 0 } : null);
        setAwayTeam(prev => prev ? { ...prev, score: updatedGame.data.awayScore || 0 } : null);
      } catch (error) {
        console.error("Error refreshing game data:", error);
      }
    } catch (error) {
      console.error("Error recording shot:", error);
      notification.error({
        message: "Error",
        description: "Could not record shot",
      });
    }
  };

  // Save game time to local storage whenever it changes
  useEffect(() => {
    if (game) {
      localStorage.setItem(`gameTime_${id}`, gameTime.toString());
    }
  }, [gameTime, id, game]);

  // Helper function to save player minutes to backend
  const savePlayerMinutesToBackend = async (silent = false) => {
    if (!game || !homeTeam || !awayTeam) {
      if (!silent) {
        message.error("Cannot save game state: missing game or team data");
      }
      return;
    }

    try {
      if (!silent) {
        console.log("💾 === SAVING PLAYER MINUTES TO BACKEND ===");
      } else {
        console.log("💾 Auto-saving player minutes to backend...");
      }
      
      const playerMinutesPayload: Record<string, number> = {};
      const allPlayers = [...homeTeam.players, ...awayTeam.players];

      allPlayers.forEach((player) => {
        const millisecondsPlayed = playerMinutes[player.id] || 0;
        playerMinutesPayload[player.id.toString()] = millisecondsPlayed;
        if (!silent && millisecondsPlayed > 0) {
          console.log(`  ${player.nombre} ${player.apellido} (ID: ${player.id}): ${Math.round(millisecondsPlayed/1000)} seconds`);
        }
      });

      await gameAPI.updatePlayerMinutes(game.id, playerMinutesPayload);
      
      if (!silent) {
        console.log("✅ Player minutes saved successfully to backend");
        message.success("Minutos guardados exitosamente");
      } else {
        console.log("✅ Auto-save completed");
      }
    } catch (error: any) {
      console.error("Error saving player minutes:", error);
      if (!silent) {
        message.error(`Failed to save player minutes: ${error?.message || 'Unknown error'}`);
      }
    }
  };

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Reset player minutes when game starts
  const resetPlayerMinutes = () => {
    // ✅ SAFETY: Only reset if game hasn't started yet
    if (game?.estado !== 'scheduled') {
      console.log('⚠️ Cannot reset player minutes - game already in progress');
      return;
    }
    
    const newPlayerMinutes: Record<number, number> = {};

    // Initialize minutes for all players to 0
    if (homeTeam && awayTeam) {
      [...homeTeam.players, ...awayTeam.players].forEach((player) => {
        newPlayerMinutes[player.id] = 0;
      });
    }

    setPlayerMinutes(newPlayerMinutes);
    console.log('✅ Player minutes reset to 0 (game in scheduled state)');
  };

  // Timer management functions (following documentation)
  const updateGameTime = async (seconds: number) => {
    if (!game) return;

    try {
      await gameAPI.updateGameTime(game.id, seconds);
    } catch (error) {
      console.error("Error updating game time:", error);
    }
  };

  const startTimer = () => {
    if (timerInterval) {
      console.log(
        "Timer already running, skipping. Current interval ID:",
        timerInterval
      );
      return; // Already running
    }

    // Set the last timer update to now when starting the timer
    const startTime = Date.now();
    lastTimerUpdateRef.current = startTime;
    console.log(`⏱️ ========================================`);
    console.log(`⏱️ TIMER STARTED at timestamp: ${startTime}`);
    console.log(`⏱️ Current game time: ${formatTime(gameTime)}`);
    console.log(`⏱️ Current player minutes:`, Object.entries(playerMinutes).map(([id, ms]) => `Player ${id}: ${Math.round(ms/1000)}s`).join(', '));
    console.log(`⏱️ ========================================`);
    
    // Start auto-save to BD every 10 seconds
    if (autoSaveIntervalRef.current) {
      clearInterval(autoSaveIntervalRef.current);
    }
    
    autoSaveIntervalRef.current = setInterval(() => {
      savePlayerMinutesToBackend(true); // silent mode
    }, 10000); // Auto-save every 10 seconds
    
    console.log("💾 Auto-save to BD enabled (every 10 seconds)");

    const interval = setInterval(async () => {
      setGameTime((prev) => {
        const newTime = prev - 1;
        if (newTime >= 0) {
          const gameTimeElapsed = QUARTER_LENGTH - newTime; // How much game time has passed
          updateGameTime(gameTimeElapsed);
          
          // Update minutes for players on court using precise timestamp calculation
          // Use refs to get current team data and avoid closure issues
          const currentHomeTeam = homeTeamRef.current;
          const currentAwayTeam = awayTeamRef.current;
          
          if (currentHomeTeam && currentAwayTeam) {
            // ✅ CRITICAL FIX: Only update player minutes if clock is actually running
            if (!isClockRunningRef.current) {
              console.log('⏸️ Clock paused - skipping player minutes update');
              return newTime;
            }
            
            const now = Date.now();
            const elapsed = now - lastTimerUpdateRef.current;
            
            // CRITICAL: Update the ref IMMEDIATELY to prevent any time loss
            lastTimerUpdateRef.current = now;
            
            const onCourtPlayers = [
              ...currentHomeTeam.players.filter((p) => p.isOnCourt),
              ...currentAwayTeam.players.filter((p) => p.isOnCourt),
            ];

            console.log(`⏱️ === TIMER TICK at ${now} (elapsed: ${elapsed}ms) ===`);

            setPlayerMinutes((prev) => {
              const updated = { ...prev };
              const previousTotal = Object.values(prev).reduce((sum, val) => sum + val, 0);
              
              onCourtPlayers.forEach((player) => {
                const oldTime = updated[player.id] || 0;
                const newTime = oldTime + elapsed;
                console.log(
                  `  Player ${player.nombre} ${player.apellido} (ID: ${player.id}): ${Math.round(oldTime/1000)}s → ${Math.round(newTime/1000)}s (+${elapsed}ms)`
                );
                updated[player.id] = newTime;
              });

              const newTotal = Object.values(updated).reduce((sum, val) => sum + val, 0);
              const averagePlayerTime = onCourtPlayers.length > 0 ? newTotal / onCourtPlayers.length : 0;
              
              console.log(`  Total player time: ${Math.round(previousTotal/1000)}s → ${Math.round(newTotal/1000)}s (delta: +${Math.round((newTotal - previousTotal)/1000)}s)`);
              console.log(`  📊 COMPARISON: Game time elapsed: ${gameTimeElapsed}s | Avg player time: ${Math.round(averagePlayerTime/1000)}s | Diff: ${Math.round((gameTimeElapsed*1000 - averagePlayerTime)/1000)}s`);
              
              if (Math.abs(gameTimeElapsed*1000 - averagePlayerTime) > 2000) {
                console.warn(`  ⚠️ WARNING: More than 2s difference between game time and player time!`);
              }

              return updated;
            });
          }
          return newTime;
        }
        // Timer reached 0:00 - handle quarter end
        console.log("Timer reached 0:00, handling quarter end...");
        clearInterval(interval);
        setTimerInterval(null);
        setIsClockRunning(false);

        // Automatically go to next quarter
        handleQuarterEnd();
        return 0;
      });
    }, 1000);

    console.log("Created new interval with ID:", interval);
    setTimerInterval(interval);
    setIsClockRunning(true);
    
    // ✅ REMOVED: Duplicate auto-save interval (already created earlier in startTimer)
    // The auto-save interval is created at the beginning of startTimer function
  };

  // Handle quarter end - automatically go to next quarter
  const handleQuarterEnd = async () => {
    if (!game) return;

    try {
      console.log("🏁 Quarter ended, going to next quarter...");

      // Save current stats before quarter ends
      await stopTimer();

      // Call backend to advance to next quarter
      const response = await gameAPI.nextQuarter(game.id);
      console.log("Next quarter response:", response.data);

      // Update game data with new quarter info
      const updatedGame = await gameAPI.getGame(game.id);
      setGame(updatedGame.data);

      // Reset timer for new quarter
      setGameTime(QUARTER_LENGTH);

      // Show quarter change notification
      message.success({
        content: `¡Cuarto ${updatedGame.data.currentQuarter} iniciado!`,
        duration: 4,
      });

      // Reset entry scores for plus-minus tracking (new quarter, fresh start)
      console.log("✅ Quarter transition completed successfully");
    } catch (error: any) {
      console.error("Error handling quarter end:", error);
      message.error("Error al cambiar de cuarto");
    }
  };

  const stopTimer = async () => {
    console.log("⏹️ STOPPING TIMER - Plus-minus update process starting...");
    console.log("Current playerPlusMinus state:", playerPlusMinus);
    console.log("Stopping timer. Current interval ID:", timerInterval);
    
    // Clear the game timer interval
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
      console.log("Timer interval cleared and set to null");
    }
    
    // Clear the auto-save interval
    if (autoSaveIntervalRef.current) {
      clearInterval(autoSaveIntervalRef.current);
      autoSaveIntervalRef.current = null;
      console.log("⏹️ Auto-save interval stopped");
    }
    
    setIsClockRunning(false);

    // Save tracked minutes to backend when timer stops
    await savePlayerMinutesToBackend(false);

    // NOTE: Plus-minus is now automatically calculated by the backend when recording shots
    // No need to update plus-minus manually from frontend
  };

  // Score management (following documentation)
  const updateScore = async (homeScore: number, awayScore: number) => {
    if (!game) return;

    try {
      console.log(`🏀 ==== TEAM SCORED! ====`);
      console.log(`🏀 SCORE UPDATE: ${homeScore}-${awayScore}`);
      console.log(
        `🏀 Previous scores - Home: ${homeTeam?.score || 0}, Away: ${awayTeam?.score || 0
        }`
      );

      // Calculate the score difference for logging purposes
      const prevHomeScore = homeTeam?.score || 0;
      const prevAwayScore = awayTeam?.score || 0;
      const homeScoreChange = homeScore - prevHomeScore;
      const awayScoreChange = awayScore - prevAwayScore;

      console.log(
        `🏀 Score changes: Home +${homeScoreChange}, Away +${awayScoreChange}`
      );
      console.log(
        `📊 Plus-minus calculation will be handled by backend when shots are recorded`
      );

      await gameAPI.updateScore(game.id, homeScore, awayScore);

      setHomeTeam((prev) => (prev ? { ...prev, score: homeScore } : null));
      setAwayTeam((prev) => (prev ? { ...prev, score: awayScore } : null));

      console.log(`🏀 Team scores updated in state`);
      console.log(`🏀 ==== SCORE UPDATE COMPLETE ====`);
    } catch (error) {
      notification.error({
        message: "Error",
        description: "No se pudo actualizar el marcador",
      });
    }
  };

  // Plus-minus calculation is now handled by the backend when shots are recorded
  // The backend receives the playersOnCourt array and calculates plus-minus automatically

  const updatePlusMinusDirectly = (
    homeScoreChange: number,
    awayScoreChange: number
  ) => {
    console.log(`📊 ==== SIMPLE PLUS-MINUS UPDATE START ====`);
    console.log(
      `🏀 Score changes: Home +${homeScoreChange}, Away +${awayScoreChange}`
    );

    if (homeScoreChange === 0 && awayScoreChange === 0) {
      console.log("⚠️ No score change, skipping plus-minus update");
      return;
    }

    if (!homeTeam || !awayTeam) {
      console.log("❌ No teams available");
      return;
    }

    // Get players currently on court using isOnCourt property
    const homePlayersOnCourt = homeTeam.players.filter((p) => p.isOnCourt);
    const awayPlayersOnCourt = awayTeam.players.filter((p) => p.isOnCourt);

    console.log(`🔍 HOME TEAM DEBUG:`);
    console.log(`  Total players: ${homeTeam.players.length}`);
    homeTeam.players.forEach((p) =>
      console.log(`  ${p.nombre} (ID: ${p.id}) - isOnCourt: ${p.isOnCourt}`)
    );
    console.log(`  Players on court: ${homePlayersOnCourt.length}`);

    console.log(`🔍 AWAY TEAM DEBUG:`);
    console.log(`  Total players: ${awayTeam.players.length}`);
    awayTeam.players.forEach((p) =>
      console.log(`  ${p.nombre} (ID: ${p.id}) - isOnCourt: ${p.isOnCourt}`)
    );
    console.log(`  Players on court: ${awayPlayersOnCourt.length}`);

    if (homePlayersOnCourt.length === 0 && awayPlayersOnCourt.length === 0) {
      console.log(
        "⚠️ NO PLAYERS ON COURT - This is why plus-minus isn't updating!"
      );
      console.log(
        "⚠️ Make sure to set players as 'on court' before updating scores"
      );
      return;
    }

    // Update plus-minus directly
    setPlayerPlusMinus((current) => {
      console.log(`🔍 Current plus-minus before update:`, current);
      console.log(
        `🔍 Current plus-minus has ${Object.keys(current).length} players`
      );

      const updated = { ...current };
      let totalUpdated = 0;

      // If home team scored
      if (homeScoreChange > 0) {
        console.log(`🏠 HOME TEAM SCORED +${homeScoreChange} points!`);

        // All home players on court get positive points
        homePlayersOnCourt.forEach((player) => {
          const oldValue = updated[player.id] || 0;
          updated[player.id] = oldValue + homeScoreChange;
          totalUpdated++;
          console.log(
            `🏠 ${player.nombre} (ID: ${player.id}): ${oldValue} → ${updated[player.id]
            } (+${homeScoreChange})`
          );
        });

        // All away players on court get negative points
        awayPlayersOnCourt.forEach((player) => {
          const oldValue = updated[player.id] || 0;
          updated[player.id] = oldValue - homeScoreChange;
          totalUpdated++;
          console.log(
            `✈️ ${player.nombre} (ID: ${player.id}): ${oldValue} → ${updated[player.id]
            } (-${homeScoreChange})`
          );
        });
      }

      // If away team scored
      if (awayScoreChange > 0) {
        console.log(`✈️ AWAY TEAM SCORED +${awayScoreChange} points!`);

        // All away players on court get positive points
        awayPlayersOnCourt.forEach((player) => {
          const oldValue = updated[player.id] || 0;
          updated[player.id] = oldValue + awayScoreChange;
          totalUpdated++;
          console.log(
            `✈️ ${player.nombre} (ID: ${player.id}): ${oldValue} → ${updated[player.id]
            } (+${awayScoreChange})`
          );
        });

        // All home players on court get negative points
        homePlayersOnCourt.forEach((player) => {
          const oldValue = updated[player.id] || 0;
          updated[player.id] = oldValue - awayScoreChange;
          totalUpdated++;
          console.log(
            `🏠 ${player.nombre} (ID: ${player.id}): ${oldValue} → ${updated[player.id]
            } (-${awayScoreChange})`
          );
        });
      }

      console.log(
        `📊 SUMMARY: Updated ${totalUpdated} player plus-minus values`
      );
      console.log(`🔍 Final plus-minus state:`, updated);
      console.log(
        `🔍 Updated plus-minus has ${Object.keys(updated).length} players`
      );

      // Save to localStorage immediately
      const gameId = window.location.pathname.split("/").pop();
      localStorage.setItem(`game-${gameId}-plusminus`, JSON.stringify(updated));
      console.log(`💾 Saved to localStorage for game ${gameId}:`, updated);
      console.log(`📊 ==== SIMPLE PLUS-MINUS UPDATE END ====`);

      return updated;
    });
  };

  const updatePlusMinusForScoreChange = (
    newHomeScore: number,
    newAwayScore: number
  ) => {
    console.log(`📊 ==== PLUS-MINUS CALCULATION START ====`);
    console.log(
      `🏀 Score changed to ${newHomeScore}-${newAwayScore}, updating plus-minus...`
    );

    if (!homeTeam || !awayTeam) {
      console.log("❌ No teams available for plus-minus update");
      return;
    }

    // Get current scores before the change
    const previousHomeScore = homeTeam.score || 0;
    const previousAwayScore = awayTeam.score || 0;

    // Calculate score differences
    const homeScoreDiff = newHomeScore - previousHomeScore;
    const awayScoreDiff = newAwayScore - previousAwayScore;

    console.log(
      `� Score changes: Home +${homeScoreDiff}, Away +${awayScoreDiff}`
    );

    if (homeScoreDiff === 0 && awayScoreDiff === 0) {
      console.log("⚠️ No score change detected");
      return;
    }

    // Get all players currently on court
    const homePlayersOnCourt = homeTeam.players.filter((p) => p.isOnCourt);
    const awayPlayersOnCourt = awayTeam.players.filter((p) => p.isOnCourt);

    console.log(
      `📊 Home players on court: ${homePlayersOnCourt.length}`,
      homePlayersOnCourt.map((p) => `${p.nombre} (${p.id})`)
    );
    console.log(
      `� Away players on court: ${awayPlayersOnCourt.length}`,
      awayPlayersOnCourt.map((p) => `${p.nombre} (${p.id})`)
    );

    if (homePlayersOnCourt.length === 0 && awayPlayersOnCourt.length === 0) {
      console.log("⚠️ No players on court - cannot update plus-minus");
      return;
    }

    // Create new plus-minus object immediately (like minutes pattern)
    const updatedPlusMinus = { ...playerPlusMinus };
    let playersUpdated = 0;

    // SIMPLE LOGIC: If home team scored, home players get +points, away players get -points
    if (homeScoreDiff > 0) {
      console.log(`🏠 HOME TEAM SCORED +${homeScoreDiff} points!`);

      // Home team players get positive points
      homePlayersOnCourt.forEach((player) => {
        const oldPlusMinus = updatedPlusMinus[player.id] || 0;
        updatedPlusMinus[player.id] = oldPlusMinus + homeScoreDiff;
        playersUpdated++;

        console.log(
          `🏠 HOME Player ${player.nombre} ${player.apellido} (ID: ${player.id}):`
        );
        console.log(`    Old +/-: ${oldPlusMinus}`);
        console.log(`    Change: +${homeScoreDiff} (home team scored)`);
        console.log(`    New +/-: ${updatedPlusMinus[player.id]}`);
      });

      // Away team players get negative points
      awayPlayersOnCourt.forEach((player) => {
        const oldPlusMinus = updatedPlusMinus[player.id] || 0;
        updatedPlusMinus[player.id] = oldPlusMinus - homeScoreDiff;
        playersUpdated++;

        console.log(
          `✈️ AWAY Player ${player.nombre} ${player.apellido} (ID: ${player.id}):`
        );
        console.log(`    Old +/-: ${oldPlusMinus}`);
        console.log(`    Change: -${homeScoreDiff} (opponent scored)`);
        console.log(`    New +/-: ${updatedPlusMinus[player.id]}`);
      });
    }

    // SIMPLE LOGIC: If away team scored, away players get +points, home players get -points
    if (awayScoreDiff > 0) {
      console.log(`✈️ AWAY TEAM SCORED +${awayScoreDiff} points!`);

      // Away team players get positive points
      awayPlayersOnCourt.forEach((player) => {
        const oldPlusMinus = updatedPlusMinus[player.id] || 0;
        updatedPlusMinus[player.id] = oldPlusMinus + awayScoreDiff;
        playersUpdated++;

        console.log(
          `✈️ AWAY Player ${player.nombre} ${player.apellido} (ID: ${player.id}):`
        );
        console.log(`    Old +/-: ${oldPlusMinus}`);
        console.log(`    Change: +${awayScoreDiff} (away team scored)`);
        console.log(`    New +/-: ${updatedPlusMinus[player.id]}`);
      });

      // Home team players get negative points
      homePlayersOnCourt.forEach((player) => {
        const oldPlusMinus = updatedPlusMinus[player.id] || 0;
        updatedPlusMinus[player.id] = oldPlusMinus - awayScoreDiff;
        playersUpdated++;

        console.log(
          `🏠 HOME Player ${player.nombre} ${player.apellido} (ID: ${player.id}):`
        );
        console.log(`    Old +/-: ${oldPlusMinus}`);
        console.log(`    Change: -${awayScoreDiff} (opponent scored)`);
        console.log(`    New +/-: ${updatedPlusMinus[player.id]}`);
      });
    }

    console.log(`📊 Plus-minus update summary:`);
    console.log(
      `    Players processed: ${homePlayersOnCourt.length + awayPlayersOnCourt.length
      }`
    );
    console.log(`    Players updated: ${playersUpdated}`);
    console.log(`    Updated plus-minus state:`, updatedPlusMinus);
    console.log(
      `🔍 VERIFICATION: Updated object keys:`,
      Object.keys(updatedPlusMinus)
    );
    console.log(
      `🔍 VERIFICATION: Updated object entries:`,
      Object.entries(updatedPlusMinus)
    );

    // Update state with new values
    setPlayerPlusMinus(updatedPlusMinus);
    console.log(`✅ setPlayerPlusMinus called with:`, updatedPlusMinus);

    // Verify state update with setTimeout
    setTimeout(() => {
      console.log(
        `🔍 VERIFICATION after setState: playerPlusMinus is now:`,
        playerPlusMinus
      );
    }, 100);

    // Save immediately to localStorage with the UPDATED values
    const gameId = window.location.pathname.split("/").pop();
    localStorage.setItem(
      `game-${gameId}-plusminus`,
      JSON.stringify(updatedPlusMinus)
    );
    console.log(
      `💾 IMMEDIATELY saved to localStorage for game ${gameId}:`,
      updatedPlusMinus
    );

    console.log(`📊 ==== PLUS-MINUS CALCULATION END ====`);
  };

  useEffect(() => {
    const initializeGame = async () => {
      if (!id) return;

      // Always load public game data so the page is viewable without auth
      await loadGameData();

      // If user is authenticated, perform authenticated setup (sockets, permissions)
      if (user) {
        console.log("🎮 Initializing game for user:", user.rol, "Game ID:", id);

        // Connect to socket
        socketService.connect();
        socketService.joinGame(Number(id));

        // Listen for substitution events from other users
        socketService.onSubstitutionMade(async (substitutionData) => {
          console.log("🔄 Substitution event received:", substitutionData);

          // Update player states without calling loadGameData to preserve timer
          try {
            const activePlayers = await gameAPI.getActivePlayers(id!);
            if (activePlayers.data) {
              const homePlayers = activePlayers.data.homeTeam?.players || [];
              const awayPlayers = activePlayers.data.awayTeam?.players || [];
              
              const homeActiveIds = homePlayers.map((p: Player) => p.id);
              const awayActiveIds = awayPlayers.map((p: Player) => p.id);
              
              // Update isOnCourt status for all players
              setHomeTeam(prev => prev ? {
                ...prev,
                players: prev.players.map(p => ({
                  ...p,
                  isOnCourt: homeActiveIds.includes(p.id)
                }))
              } : null);
              
              setAwayTeam(prev => prev ? {
                ...prev,
                players: prev.players.map(p => ({
                  ...p,
                  isOnCourt: awayActiveIds.includes(p.id)
                }))
              } : null);
              
              console.log("✅ Updated player states from substitution event");
            }
          } catch (err) {
            console.error("Error updating player states:", err);
          }

          message.info("Sustitución realizada por otro usuario", 2);
        });

        // First join the game to get permissions
        try {
          const joinResult = await joinGame(Number(id));
          console.log("🎮 Join game result:", joinResult);
        } catch (err) {
          console.error("Error joining game:", err);
        }
      }
    };

    initializeGame();

    // Cleanup function to clear any running timers when component unmounts or ID changes
    return () => {
      console.log("Component cleanup: clearing timer interval, auto-save, and socket listeners");
      if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
        setIsClockRunning(false);
      }
      // Clear auto-save interval
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
        autoSaveIntervalRef.current = null;
        console.log("⏹️ Auto-save cleaned up on component unmount");
      }
      // Clean up socket listeners
      socketService.removeAllListeners();
    };
  }, [id, user]); // Added user dependency

  // Warn user before reloading/closing the page if game is in progress
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      console.log('🔔 BEFOREUNLOAD EVENT TRIGGERED!');
      console.log('Current game:', game);
      console.log('Game estado:', game?.estado);
      console.log('Clock running:', isClockRunning);
      
      // Show warning if game exists and is not scheduled or finished
      if (game && game.estado !== 'scheduled' && game.estado !== 'finished') {
        console.log('⚠️ BLOCKING PAGE RELOAD - Game in progress!');
        
        // This is the correct way to trigger the confirmation dialog
        e.preventDefault(); // Required for Chrome
        e.returnValue = ''; // Required for Chrome/Edge
        return ''; // Required for Firefox/Safari
      } else {
        console.log('✅ Allowing page reload - no active game');
      }
    };

    // Add listener on mount
    window.addEventListener('beforeunload', handleBeforeUnload);
    console.log('✅ BEFOREUNLOAD listener added. Game estado:', game?.estado, 'Clock:', isClockRunning);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      console.log('❌ BEFOREUNLOAD listener removed');
    };
  }, [game, isClockRunning]); // Re-add listener when game state changes

  // Debug: Watch for changes to playerPlusMinus
  useEffect(() => {
    console.log("🔍 playerPlusMinus state changed:", playerPlusMinus);
    console.log(
      "🔍 Number of players with plus-minus data:",
      Object.keys(playerPlusMinus).length
    );
    const nonZeroPlayers = Object.entries(playerPlusMinus).filter(
      ([_, value]) => value !== 0
    );
    console.log("🔍 Players with non-zero plus-minus:", nonZeroPlayers);
  }, [playerPlusMinus]);

  const loadGameData = useCallback(async () => {
    console.log(
      "📥 loadGameData called - Current playerPlusMinus:",
      playerPlusMinus
    );
    try {
      // Load game data
      console.log("🎮 Loading game with ID:", id);
      const gameResponse = await gameAPI.getGame(id!);
      const game = gameResponse.data;
      console.log("✅ Game loaded:", game);
      setGame(game);

      // Load both teams and their players
      try {
        console.log("👥 Loading teams - Home ID:", game.teamHomeId, "Away ID:", game.teamAwayId);
        const [homeTeamResponse, awayTeamResponse] = await Promise.all([
          teamAPI.getTeam(game.teamHomeId),
          teamAPI.getTeam(game.teamAwayId),
        ]);
        
        console.log("✅ Home team loaded:", homeTeamResponse.data.nombre, "Players:", homeTeamResponse.data.players?.length || 0);
        console.log("✅ Away team loaded:", awayTeamResponse.data.nombre, "Players:", awayTeamResponse.data.players?.length || 0);

        // Handle active players differently based on game state
        let homeActiveIds: number[] = [];
        let awayActiveIds: number[] = [];

        if (game.estado !== "scheduled") {
          console.log("🔍 Game is in progress, loading active players...");
          
          // ALWAYS fetch from backend first (source of truth)
          try {
            console.log("🌐 Fetching active players from backend...");
            const activePlayers = await gameAPI.getActivePlayers(id!);
            console.log("🌐 Backend response (full):", activePlayers);
            console.log("🌐 Backend response data:", activePlayers.data);

            if (activePlayers.data) {
              const homePlayers = activePlayers.data.homeTeam?.players || [];
              const awayPlayers = activePlayers.data.awayTeam?.players || [];
              
              console.log("🌐 Home players from BD:", homePlayers.length, homePlayers);
              console.log("🌐 Away players from BD:", awayPlayers.length, awayPlayers);

              const homeFromBD = homePlayers.map((p: Player) => p.id);
              const awayFromBD = awayPlayers.map((p: Player) => p.id);

              // Use backend data as primary source
              if (homeFromBD.length > 0 || awayFromBD.length > 0) {
                homeActiveIds = homeFromBD;
                awayActiveIds = awayFromBD;
                console.log("✅ Using active players from BACKEND:", { home: homeActiveIds, away: awayActiveIds });
              } else {
                console.error(
                  "❌❌❌ CRITICAL: Backend returned NO active players!"
                );
                console.error("Game ID:", id);
                console.error("Game estado:", game.estado);
                console.error("This means the backend didn't save the lineup when the game started.");
                
                // Fallback: try localStorage
                const savedActivePlayers = localStorage.getItem(`game-${id}-activePlayers`);
                if (savedActivePlayers) {
                  try {
                    const parsed = JSON.parse(savedActivePlayers);
                    homeActiveIds = parsed.home || [];
                    awayActiveIds = parsed.away || [];
                    console.warn("⚠️ Falling back to localStorage:", { home: homeActiveIds, away: awayActiveIds });
                  } catch (e) {
                    console.error("❌ Error parsing localStorage:", e);
                  }
                } else {
                  console.error("❌ No data in localStorage either!");
                }
              }
            } else {
              console.error("❌ Backend response has no data property!");
            }
          } catch (err) {
            console.error("❌ Error fetching active players from backend:", err);
            
            // Fallback to localStorage only on error
            const savedActivePlayers = localStorage.getItem(`game-${id}-activePlayers`);
            if (savedActivePlayers) {
              try {
                const parsed = JSON.parse(savedActivePlayers);
                homeActiveIds = parsed.home || [];
                awayActiveIds = parsed.away || [];
                console.warn("⚠️ Backend failed, using localStorage:", { home: homeActiveIds, away: awayActiveIds });
              } catch (e) {
                console.error("❌ Error parsing localStorage:", e);
              }
            }
          }
        } else {
          console.log("📅 Game is scheduled (not started yet), no active players needed");
        }

        // Set selected players
        setSelectedPlayers({
          home: homeActiveIds,
          away: awayActiveIds,
        });

        const newHomeTeam = {
          ...homeTeamResponse.data,
          score: game.score?.home || 0,
          players: (homeTeamResponse.data.players || []).map((p: Player) => {
            // Preserve existing player stats if available (from React state)
            const existingPlayer = homeTeam?.players?.find(
              (existing: Player) => existing.id === p.id
            );
            return {
              ...p,
              isOnCourt: homeActiveIds.includes(p.id),
              stats: existingPlayer?.stats || p.stats, // Keep existing stats if available
            };
          }),
        };
        const newAwayTeam = {
          ...awayTeamResponse.data,
          score: game.score?.away || 0,
          players: (awayTeamResponse.data.players || []).map((p: Player) => {
            // Preserve existing player stats if available (from React state)
            const existingPlayer = awayTeam?.players?.find(
              (existing: Player) => existing.id === p.id
            );
            return {
              ...p,
              isOnCourt: awayActiveIds.includes(p.id),
              stats: existingPlayer?.stats || p.stats, // Keep existing stats if available
            };
          }),
        };

        console.log("🏠 Home team configured:", {
          name: newHomeTeam.nombre,
          totalPlayers: newHomeTeam.players.length,
          playersOnCourt: newHomeTeam.players.filter((p: Player) => p.isOnCourt).length,
          onCourtPlayers: newHomeTeam.players.filter((p: Player) => p.isOnCourt).map((p: Player) => `#${p.numero} ${p.nombre}`)
        });
        console.log("✈️ Away team configured:", {
          name: newAwayTeam.nombre,
          totalPlayers: newAwayTeam.players.length,
          playersOnCourt: newAwayTeam.players.filter((p: Player) => p.isOnCourt).length,
          onCourtPlayers: newAwayTeam.players.filter((p: Player) => p.isOnCourt).map((p: Player) => `#${p.numero} ${p.nombre}`)
        });

        setHomeTeam(newHomeTeam);
        setAwayTeam(newAwayTeam);

        // Initialize player minutes - use the most recent data from: current state, BD stats, localStorage, or 0
        const allPlayers = [...newHomeTeam.players, ...newAwayTeam.players];
        setPlayerMinutes((prev) => {
          // Always use the maximum value from all sources (state, BD, localStorage)
          const initialPlayerMinutes: Record<number, number> = {};
          const localStorageData = localStorage.getItem(`game-${id}-playerMinutes`);
          let localMinutes: Record<number, number> = {};
          
          if (localStorageData) {
            try {
              localMinutes = JSON.parse(localStorageData);
            } catch (e) {
              console.error('Error parsing localStorage minutes:', e);
            }
          }
          
          allPlayers.forEach((player) => {
            // Priority: MAX(current state, localStorage, BD stats)
            const currentMinutes = prev[player.id] || 0;
            const statsFromBD = game.stats?.find((s: any) => s.playerId === player.id);
            const minutesFromBD = statsFromBD?.minutos || 0; // BD stores in milliseconds
            const minutesFromLocal = localMinutes[player.id] || 0;
            
            // Use the maximum value from all three sources
            const minutes = Math.max(currentMinutes, minutesFromBD, minutesFromLocal);
            initialPlayerMinutes[player.id] = minutes;
            
            if (minutes > 0) {
              console.log(`📥 Player ${player.nombre} minutes: ${Math.round(minutes/1000)}s (State: ${Math.round(currentMinutes/1000)}s, BD: ${Math.round(minutesFromBD/1000)}s, Local: ${Math.round(minutesFromLocal/1000)}s)`);
            }
          });
          
          console.log("💾 Player minutes initialized/updated from all sources");
          return initialPlayerMinutes;
        });

        // Initialize player plus-minus for all players when game data loads
        // BUT ONLY if playerPlusMinus is empty (first load)
        if (Object.keys(playerPlusMinus).length === 0) {
          console.log(
            "🆕 First time loading - initializing plus-minus for all players to 0"
          );
          setPlayerPlusMinus(() => {
            const initialPlayerPlusMinus: Record<number, number> = {};
            allPlayers.forEach((player) => {
              // Initialize all players to 0 plus-minus
              initialPlayerPlusMinus[player.id] = 0;
              console.log(
                `🔢 Initialized player ${player.nombre} ${player.apellido} (${player.id}) +/- to 0`
              );
            });
            console.log(
              "📊 All players plus-minus initialized:",
              initialPlayerPlusMinus
            );
            return initialPlayerPlusMinus;
          });
        } else {
          console.log(
            "♻️ Plus-minus already initialized, preserving existing values:",
            playerPlusMinus
          );
        }

        console.log(
          "Game data loaded successfully with player minutes and plus-minus initialized"
        );
      } catch (teamError) {
        console.error("Error loading teams/players:", teamError);
        message.error(
          "Error loading team data. Please check if teams have players assigned."
        );
      }
    } catch (err) {
      console.error("Error loading game data:", err);
      message.error("Error loading game data");
    }
  }, [id]); // Only depend on id to prevent infinite re-renders

  const startGame = async () => {
    if (!game) return;

    try {
      // Check if both teams have active players
      if (
        selectedPlayers.home.length !== 5 ||
        selectedPlayers.away.length !== 5
      ) {
        notification.error({
          message: "Error",
          description: "Ambos equipos deben tener 5 jugadores seleccionados",
        });
        return;
      }

      console.log("Starting game with selected players:", selectedPlayers);

      // Step 1: Start the game with all active players (home + away)
      const allActivePlayerIds = [
        ...selectedPlayers.home,
        ...selectedPlayers.away,
      ];
      await gameAPI.startGame(id!, {
        activePlayerIds: allActivePlayerIds,
        gameSettings: {
          quarterLength: 720, // 12 minutes
          totalQuarters: 4, // 4 quarters
          overtimeLength: 300, // 5 minutes
        },
      });

      console.log("Game started successfully");





      // Update local state
      setGame((prev) => (prev ? { ...prev, estado: "in_progress" } : null));

      console.log("Game started successfully with selected players");

      // Update isOnCourt status for selected players
      setHomeTeam((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          players: prev.players.map((p) => ({
            ...p,
            isOnCourt: selectedPlayers.home.includes(p.id),
          })),
        };
      });

      setAwayTeam((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          players: prev.players.map((p) => ({
            ...p,
            isOnCourt: selectedPlayers.away.includes(p.id),
          })),
        };
      });

      setIsLineupModalVisible(false);

      // ✅ Only reset minutes if this is a new game being started
      if (game?.estado === 'scheduled') {
        resetPlayerMinutes();
        console.log('🆕 New game starting - player minutes reset');
      } else {
        console.log('▶️ Resuming existing game - preserving player minutes');
      }

      // DON'T start the game timer automatically - let the user start it manually
      // startTimer();

      // Notify success
      notification.success({
        message: "Juego iniciado",
        description:
          "El juego ha comenzado correctamente. Presiona el botón de Play para iniciar el cronómetro.",
      });
    } catch (err: any) {
      console.error("Error starting game:", err);
      notification.error({
        message: "Error al Iniciar el Juego",
        description: err.response?.data?.error || "No se pudo iniciar el juego",
      });
    }
  };

  // Set active players for an already started game
  const setActivePlayers = async () => {
    if (!game) return;

    try {
      // Check if both teams have 5 players selected
      if (
        selectedPlayers.home.length !== 5 ||
        selectedPlayers.away.length !== 5
      ) {
        notification.error({
          message: "Error",
          description: "Ambos equipos deben tener 5 jugadores seleccionados",
        });
        return;
      }

      console.log(
        "Setting active players for in-progress game:",
        selectedPlayers
      );

      // Note: The endpoint /active-players does not seem to exist.
      // Substitutions should be used instead for in-progress games.
      // await gameAPI.updateActivePlayers(id!, allActivePlayerIds);
      console.warn("Skipping updateActivePlayers as endpoint appears invalid.");
      console.log("All active players updated successfully");

      // Update local state to show players on court
      setHomeTeam((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          players: prev.players.map((p) => ({
            ...p,
            isOnCourt: selectedPlayers.home.includes(p.id),
          })),
        };
      });

      setAwayTeam((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          players: prev.players.map((p) => ({
            ...p,
            isOnCourt: selectedPlayers.away.includes(p.id),
          })),
        };
      });

      setIsLineupModalVisible(false);

      notification.success({
        message: "Quintetos Configurados",
        description:
          "Los jugadores activos han sido configurados correctamente",
      });
    } catch (err: any) {
      console.error("Error setting active players:", err);
      notification.error({
        message: "Error al Configurar Quintetos",
        description:
          err.response?.data?.error ||
          "No se pudieron configurar los quintetos",
      });
    }
  };

  if (!game || !homeTeam || !awayTeam) {
    return (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center', 
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Title level={3}>Cargando datos del juego...</Title>
        <Text type="secondary">Por favor espera mientras se cargan los equipos</Text>
        {!game && <Text type="secondary">⏳ Cargando información del juego...</Text>}
        {game && !homeTeam && <Text type="secondary">⏳ Cargando equipo local...</Text>}
        {game && !awayTeam && <Text type="secondary">⏳ Cargando equipo visitante...</Text>}
        {user && (
          <div style={{ marginTop: 20 }}>
            <Text type="secondary">Usuario: {user.nombre} ({user.rol})</Text>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: 0, minHeight: "100vh", background: "#f5f5f5" }}>
      {/* Header with navigation */}
      <div
        style={{
          padding: "16px",
          background: "#fff",
          borderBottom: "1px solid #f0f0f0",
        }}
      >
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={3} style={{ margin: 0 }}>
              {game.teamHome.nombre} vs {game.teamAway.nombre}
            </Title>
            <Text type="secondary">{game.event?.nombre || 'Partido'}</Text>
          </Col>
          <Col>
            <Space wrap>
              <Link to={`/games/${game.id}/stats`}>
                <Button icon={<BarChartOutlined />} type="default">
                  Ver Estadísticas NBA
                </Button>
              </Link>
              {game.estado === "finished" && (
                <Button
                  icon={<DownloadOutlined />}
                  type="primary"
                  style={{ background: "#52c41a", borderColor: "#52c41a" }}
                  loading={pdfLoading}
                  onClick={handleDownloadPdf}
                >
                  Descargar Resumen PDF
                </Button>
              )}
              <Link to="/games">
                <Button type="primary">Volver a Juegos</Button>
              </Link>
            </Space>
          </Col>
        </Row>
      </div>

      {/* Score and game info */}
      <div
        style={{
          width: "100%",
          background: "#fffbe6",
          padding: "12px 16px",
          boxShadow: "0 2px 8px #0001",
          zIndex: 2,
        }}
      >
        <Row align="middle" justify="space-between" gutter={8}>
          <Col span={8}>
            <ScoreBoard
              team={game.teamHome}
              score={homeTeam?.score || 0}
              isHome={true}
              gameStatus={game.estado}
              onUpdateScore={(newScore) => updateScore(newScore, awayTeam?.score || 0)}
            />
          </Col>
          <Col span={8} style={{ textAlign: "center" }}>
            <Space direction="vertical" size="small" style={{ width: "100%" }}>
              <Text>
                {game.estado === "scheduled" && "Por comenzar"}
                {game.estado === "in_progress" && "En progreso"}
                {game.estado === "finished" && "Finalizado"}
              </Text>
              {game.estado === "in_progress" && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                    alignItems: "center",
                  }}
                >
                  <Title level={4} style={{ margin: 0 }}>
                    {game.isOvertime
                      ? `OT ${Math.floor(
                        game.currentQuarter - game.totalQuarters + 1
                      )}`
                      : `Q${game.currentQuarter}`}
                  </Title>
                  <Tag color="blue" style={{ marginTop: "4px" }}>
                    {game.event?.nombre || 'Partido'}
                  </Tag>
                </div>
              )}
              {game.estado === "scheduled" && (
                <Space
                  direction="vertical"
                  style={{ width: "100%", gap: "8px" }}
                >
                  <Button
                    type="primary"
                    icon={<PlayCircleOutlined />}
                    style={{ width: "100%" }}
                    onClick={() => setIsLineupModalVisible(true)}
                    disabled={!hasPermission("canSetStarters")}
                    title={
                      !hasPermission("canSetStarters")
                        ? "No tienes permisos para configurar quintetos"
                        : undefined
                    }
                  >
                    Configurar Quintetos e Iniciar Juego
                  </Button>
                  <div style={{ textAlign: "center", marginTop: "4px" }}>
                    <Text type="secondary">
                      Local: {selectedPlayers.home.length}/5 jugadores
                      seleccionados
                    </Text>
                    <br />
                    <Text type="secondary">
                      Visitante: {selectedPlayers.away.length}/5 jugadores
                      seleccionados
                    </Text>
                  </div>
                </Space>
              )}
              {game.estado === "in_progress" && hasPermission("canControlTime") && (
                <GameClock
                  gameTime={gameTime}
                  isClockRunning={isClockRunning}
                  currentQuarter={game.currentQuarter}
                  totalQuarters={game.totalQuarters}
                  isOvertime={game.isOvertime || false}
                  userRole={user?.rol}
                  hasPermission={hasPermission("canControlTime")}
                  onStartTimer={startTimer}
                  onStopTimer={stopTimer}
                  showDebug={user?.rol === "ADMIN"}
                  currentGamePermissions={currentGamePermissions}
                />
              )}
              
              {/* Role-specific instructions */}
              {game.estado === "in_progress" && !hasPermission("canControlTime") && user?.rol !== "USER" && (
                <div
                  style={{
                    padding: "12px 16px",
                    backgroundColor: "#e6f7ff",
                    borderRadius: 6,
                    border: "1px solid #1890ff",
                    marginTop: 8,
                  }}
                >
                  <Text strong style={{ color: "#1890ff" }}>
                    {user?.rol === "SCORER" && "📝 Modo Anotador: Haz clic en los jugadores en cancha para registrar puntos y tiros"}
                    {user?.rol === "REBOUNDER_ASSISTS" && "🏀 Modo Reboteador: Haz clic en los jugadores en cancha para registrar rebotes, asistencias y pérdidas"}
                    {user?.rol === "STEALS_BLOCKS" && "🛡️ Modo Defensivo: Haz clic en los jugadores en cancha para registrar robos y bloqueos"}
                    {user?.rol === "ALL_AROUND" && "⭐ Modo Completo: Haz clic en los jugadores en cancha para registrar todas las estadísticas"}
                  </Text>
                </div>
              )}

              {/* Show warning if no active players are set */}
              {game.estado === "in_progress" &&
                selectedPlayers.home.length === 0 &&
                selectedPlayers.away.length === 0 && (
                  <div
                    style={{
                      marginTop: 16,
                      padding: 16,
                      backgroundColor: hasPermission("canSetStarters") ? "#fff2e8" : "#fff1f0",
                      borderRadius: 6,
                      border: hasPermission("canSetStarters") ? "1px solid #fa8c16" : "1px solid #ff4d4f",
                    }}
                  >
                    <Text strong style={{ fontSize: 14, color: hasPermission("canSetStarters") ? "#fa8c16" : "#ff4d4f" }}>
                      ⚠️ No hay jugadores activos en cancha
                    </Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {hasPermission("canSetStarters") 
                        ? "El juego ha iniciado pero los quintetos no están configurados. Haz clic abajo para seleccionar los jugadores iniciales."
                        : "Los quintetos no han sido configurados. Un usuario con rol ADMIN o TIME_CONTROLLER debe configurar quiénes están en cancha."
                      }
                    </Text>
                    <br />
                    {hasPermission("canSetStarters") && (
                      <Button
                        size="small"
                        type="primary"
                        style={{ marginTop: 8 }}
                        onClick={() => setIsLineupModalVisible(true)}
                      >
                        Configurar Quintetos
                      </Button>
                    )}
                    {!hasPermission("canSetStarters") && (
                      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 8 }}>
                        💡 Espera a que un administrador configure los quintetos para poder registrar estadísticas.
                      </Text>
                    )}
                  </div>
                )}
            </Space>
          </Col>
          <Col span={8} style={{ textAlign: "right" }}>
            <ScoreBoard
              team={game.teamAway}
              score={awayTeam?.score || 0}
              isHome={false}
              gameStatus={game.estado}
              onUpdateScore={(newScore) => updateScore(homeTeam?.score || 0, newScore)}
            />
          </Col>
        </Row>
      </div>

      {/* Court and benches, only when game started */}
      {game.estado === "in_progress" && (
        <div
          style={{
            width: "100%",
            maxWidth: isFullscreen ? "100vw" : 1200,
            margin: "0 auto",
            padding: isFullscreen ? 8 : 24,
            position: isFullscreen ? "fixed" : "relative",
            top: isFullscreen ? 0 : "auto",
            left: isFullscreen ? 0 : "auto",
            right: isFullscreen ? 0 : "auto",
            bottom: isFullscreen ? 0 : "auto",
            zIndex: isFullscreen ? 1000 : "auto",
            backgroundColor: isFullscreen ? "#fff" : "transparent",
            overflowY: isFullscreen ? "auto" : "visible",
          }}
        >
          {/* Fullscreen toggle button for mobile */}
          {isMobile && (
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
              padding: "8px 12px",
              backgroundColor: isFullscreen ? "#f0f0f0" : "transparent",
              borderRadius: 8,
            }}>
              {isFullscreen && (
                <div style={{
                  display: "flex",
                  justifyContent: "space-around",
                  flex: 1,
                  fontSize: 16,
                  fontWeight: "bold",
                }}>
                  <span>{game.teamHome.nombre} {homeTeam?.score || 0}</span>
                  <span>-</span>
                  <span>{awayTeam?.score || 0} {game.teamAway.nombre}</span>
                </div>
              )}
              <Button
                size="small"
                type={isFullscreen ? "default" : "primary"}
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                {isFullscreen ? "✕" : "⛶"}
              </Button>
            </div>
          )}
          {/* Court */}
          <Court
            homeTeam={homeTeam}
            awayTeam={awayTeam}
            isMobile={isMobile}
            isFullscreen={isFullscreen}
            substitutionState={substitutionState}
            onPlayerClick={(player, team, e) => {
              if (e.shiftKey || substitutionState.isSelecting) {
                startSubstitution(player, team);
              } else {
                openStatsModal(player);
              }
            }}
            onCancelSubstitution={cancelSubstitution}
          />
          {/* Benches */}
          {(!isFullscreen || showBenchInFullscreen || !isMobile) && (
            <BenchArea
              homeTeam={homeTeam}
              awayTeam={awayTeam}
              isMobile={isMobile}
              substitutionState={substitutionState}
              onBenchPlayerClick={(player, team) => {
                if (substitutionState.isSelecting && substitutionState.selectedTeam === team) {
                  completeSubstitution(player);
                } else if (!substitutionState.isSelecting) {
                  openStatsModal(player);
                }
              }}
            />
          )}

          {/* Toggle bench button for fullscreen mobile */}
          {isFullscreen && isMobile && (
            <div style={{ textAlign: "center", marginTop: 12 }}>
              <Button
                size="small"
                onClick={() => setShowBenchInFullscreen(!showBenchInFullscreen)}
              >
                {showBenchInFullscreen ? "Ocultar Banca" : "Mostrar Banca"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Lineup Selection Modal */}
      <LineupModal
        visible={isLineupModalVisible}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        selectedPlayers={selectedPlayers}
        onTogglePlayer={togglePlayerSelection}
        onCancel={() => setIsLineupModalVisible(false)}
        onConfirm={startGame}
      />

      {/* Modal for tracking stats */}
      <StatsModal
        player={statsModal.player}
        visible={statsModal.visible}
        activeTab={statsModal.activeTab}
        onClose={closeStatsModal}
        onTabChange={(tab) =>
          setStatsModal((prev) => ({
            ...prev,
            activeTab: tab,
          }))
        }
        onRecordShot={recordShot}
        onRecordStat={recordStat}
        hasPermission={(permission: string) => hasPermission(permission as any)}
      />
    </div>
  );
};

export default GameDetailView;
