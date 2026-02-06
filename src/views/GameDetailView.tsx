import React, { useEffect, useState, useCallback } from "react";
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
} from "@ant-design/icons";

import { gameAPI, teamAPI } from "../services/apiService";
import gameService from "../api/gameService";
import permissionService from "../api/permissionService";
import api from "../api/axios";
import { useAuth } from "../contexts/AuthContext";
import socketService from "../api/socketService";

const { Title, Text } = Typography;

// Simple styles for court and benches
const courtStyle: React.CSSProperties = {
  width: "100%",
  height: "60vh",
  background: "linear-gradient(90deg, #e0c68a 0%, #f7e7b6 100%)",
  border: "4px solid #b8860b",
  borderRadius: 24,
  position: "relative",
  margin: "32px 0",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const playerCircle: React.CSSProperties = {
  width: 80,
  height: 80,
  borderRadius: "50%",
  background: "#fff",
  border: "3px solid #1890ff",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  margin: 8,
  boxShadow: "0 4px 12px #0003",
  transition: "all 0.3s ease",
};

const benchStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 8,
  margin: "8px 0",
};

interface Player {
  id: number;
  nombre: string;
  apellido: string;
  numero: number;
  posicion: string;
  teamId: number;
  stats?: {
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
    faltasPersonales?: number;
    perdidas?: number;
  };
  isOnCourt?: boolean;
}

interface Team {
  id: number;
  nombre: string;
  logo?: string;
  players: Player[];
  score: number;
}

interface Game {
  id: number;
  teamHomeId: number;
  teamAwayId: number;
  eventId: number;
  fecha: string;
  estado: "scheduled" | "in_progress" | "finished";
  gameTime: number;
  homeScore: number;
  awayScore: number;
  currentQuarter: number;
  quarterLength: number;
  totalQuarters: number;
  overtimeLength: number;
  quarterTime: number;
  isOvertime: boolean;
  event: {
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
  const [isLineupModalVisible, setIsLineupModalVisible] = useState(false);

  const [selectedPlayers, setSelectedPlayers] = useState<{
    home: number[];
    away: number[];
  }>({ home: [], away: [] });
  const QUARTER_LENGTH = 600; // 10 minutes in seconds
  const [gameTime, setGameTime] = useState(() => {
    const savedTime = localStorage.getItem(`gameTime_${id}`);
    return savedTime ? parseInt(savedTime) : QUARTER_LENGTH;
  });
  const [isClockRunning, setIsClockRunning] = useState(false);
  const [timerInterval, setTimerInterval] = useState<ReturnType<
    typeof setInterval
  > | null>(null);
  // Track player minutes in milliseconds for backend compatibility
  const [playerMinutes, setPlayerMinutes] = useState<Record<number, number>>(
    {}
  );
  // Track player plus-minus: {playerId: plusMinusValue}
  const [playerPlusMinus, setPlayerPlusMinus] = useState<
    Record<number, number>
  >(() => {
    // Initialize from localStorage if available
    const gameId = window.location.pathname.split("/").pop();
    const saved = localStorage.getItem(`game-${gameId}-plusminus`);
    return saved ? JSON.parse(saved) : {};
  });

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

  const [substitutionState, setSubstitutionState] = useState<{
    isSelecting: boolean;
    selectedTeam: "home" | "away" | null;
    playerOut: Player | null;
  }>({
    isSelecting: false,
    selectedTeam: null,
    playerOut: null,
  });

  // Fullscreen mode for mobile
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showBenchInFullscreen, setShowBenchInFullscreen] = useState(false);
  const isMobile = window.innerWidth < 768;

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

  // Handle substitutions
  const startSubstitution = (player: Player, team: "home" | "away") => {
    if (!hasPermission("canMakeSubstitutions")) {
      message.error("No tienes permisos para hacer sustituciones");
      return;
    }

    // Sustituciones permitidas en cualquier momento (timer corriendo o pausado)
    setSubstitutionState({
      isSelecting: true,
      selectedTeam: team,
      playerOut: player,
    });
    message.info({
      content: `${player.nombre} ${player.apellido} seleccionado. Elige un jugador del banco para sustituir.`,
      duration: 3,
    });
  };

  const completeSubstitution = async (playerIn: Player) => {
    if (!game || !substitutionState.playerOut) {
      message.error("Missing game or player data for substitution");
      return;
    }

    // Basic validation
    if (playerIn.id === substitutionState.playerOut.id) {
      message.error("Cannot substitute a player with themselves");
      return;
    }

    // Verify the players' status
    const targetTeam =
      substitutionState.selectedTeam === "home" ? homeTeam : awayTeam;
    const actualPlayerOut = targetTeam?.players.find(
      (p) => p.id === substitutionState.playerOut?.id
    );
    const actualPlayerIn = targetTeam?.players.find(
      (p) => p.id === playerIn.id
    );

    if (!actualPlayerOut?.isOnCourt) {
      message.error("Selected player to substitute out is not on the court");
      return;
    }

    if (actualPlayerIn?.isOnCourt) {
      message.error("Selected player to substitute in is already on the court");
      return;
    }

    if (
      !substitutionState.selectedTeam ||
      (substitutionState.selectedTeam === "home" &&
        playerIn.teamId !== homeTeam?.id) ||
      (substitutionState.selectedTeam === "away" &&
        playerIn.teamId !== awayTeam?.id)
    ) {
      message.error("Cannot substitute players from different teams");
      return;
    }

    try {
      const currentGameTime = QUARTER_LENGTH - gameTime; // Convert countdown time to elapsed time

      const substitutionData = {
        gameId: Number(game.id),
        playerOutId: Number(substitutionState.playerOut.id),
        playerInId: Number(playerIn.id),
        gameTime: currentGameTime,
      };

      console.log("Making substitution with:", substitutionData);

      // Determine which team endpoint to use
      let response;
      if (substitutionState.selectedTeam === "home") {
        response = await gameAPI.makeHomeSubstitution(substitutionData);
      } else {
        response = await gameAPI.makeAwaySubstitution(substitutionData);
      }

      console.log("Substitution response:", response);

      // Update the UI to reflect the substitution
      if (response.data) {
        const playerOutName =
          substitutionState.playerOut?.nombre +
          " " +
          substitutionState.playerOut?.apellido;
        const playerInName = playerIn.nombre + " " + playerIn.apellido;

        // Show detailed success message
        message.success({
          content: `Substitución exitosa: ${playerOutName} sale, ${playerInName} entra`,
          duration: 4,
        });

        // Update local team state immediately for better UX
        if (substitutionState.selectedTeam === "home" && homeTeam) {
          const updatedHomePlayers = homeTeam.players.map((p) => {
            if (p.id === playerIn.id) {
              return { ...p, isOnCourt: true };
            }
            if (p.id === substitutionState.playerOut?.id) {
              return { ...p, isOnCourt: false };
            }
            return p;
          });
          setHomeTeam({ ...homeTeam, players: updatedHomePlayers });
        } else if (substitutionState.selectedTeam === "away" && awayTeam) {
          const updatedAwayPlayers = awayTeam.players.map((p) => {
            if (p.id === playerIn.id) {
              return { ...p, isOnCourt: true };
            }
            if (p.id === substitutionState.playerOut?.id) {
              return { ...p, isOnCourt: false };
            }
            return p;
          });
          setAwayTeam({ ...awayTeam, players: updatedAwayPlayers });
        }

        // Reset substitution state
        setSubstitutionState({
          isSelecting: false,
          selectedTeam: null,
          playerOut: null,
        });

        // Emit socket event to notify other users
        socketService.makeSubstitution({
          gameId: Number(game.id),
          playerInId: playerIn.id,
          playerOutId: substitutionState.playerOut.id,
          timestamp: new Date().toISOString(),
        });

        // Refresh game data to ensure consistency with backend
        await loadGameData();

        console.log(
          `✅ Substitution completed: ${playerOutName} → ${playerInName}`
        );
      }
    } catch (error: any) {
      console.error("Substitution error:", error);

      // Show specific error messages based on backend response
      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "Failed to complete substitution";

      message.error({
        content: `Error en substitución: ${errorMessage}`,
        duration: 4,
      });

      // Reset substitution state on error
      setSubstitutionState({
        isSelecting: false,
        selectedTeam: null,
        playerOut: null,
      });
    }
  };

  const cancelSubstitution = () => {
    setSubstitutionState({
      isSelecting: false,
      selectedTeam: null,
      playerOut: null,
    });
    message.info({
      content: "Sustitución cancelada",
      duration: 2,
    });
  };

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
        content: `Se registró un ${
          statType === "assist"
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

      // Only refresh game stats, don't reload everything to avoid restart
      try {
        const updatedGame = await gameAPI.getGame(game.id);
        setGame(updatedGame.data);
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
        content: `Tiro Registrado - ${made ? "Anotado" : "Fallado"} ${
          shotType === "2pt"
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
      // Only refresh game stats, don't reload everything to avoid restart
      try {
        const updatedGame = await gameAPI.getGame(game.id);
        setGame(updatedGame.data);
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

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Reset player minutes when game starts
  const resetPlayerMinutes = () => {
    const newPlayerMinutes: Record<number, number> = {};

    // Initialize minutes for all players to 0
    if (homeTeam && awayTeam) {
      [...homeTeam.players, ...awayTeam.players].forEach((player) => {
        newPlayerMinutes[player.id] = 0;
      });
    }

    setPlayerMinutes(newPlayerMinutes);
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

    const interval = setInterval(async () => {
      setGameTime((prev) => {
        const newTime = prev - 1;
        if (newTime >= 0) {
          updateGameTime(QUARTER_LENGTH - newTime);
          // Update minutes for players on court
          if (homeTeam && awayTeam) {
            const onCourtPlayers = [
              ...homeTeam.players.filter((p) => p.isOnCourt),
              ...awayTeam.players.filter((p) => p.isOnCourt),
            ];

            setPlayerMinutes((prev) => {
              const updated = { ...prev };
              onCourtPlayers.forEach((player) => {
                const oldTime = updated[player.id] || 0;
                const newTime = oldTime + 1000;
                console.log(
                  `Player ${player.nombre} ${player.apellido} (ID: ${player.id}): ${oldTime}ms → ${newTime}ms`
                );
                updated[player.id] = newTime; // Add 1000ms (1 second)
              });

              // Show current time totals for all on-court players
              console.log(
                "Current on-court player times:",
                onCourtPlayers
                  .map(
                    (p) =>
                      `${p.nombre} ${p.apellido}: ${Math.round(
                        (updated[p.id] || 0) / 1000
                      )}s`
                  )
                  .join(", ")
              );

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
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
      console.log("Timer interval cleared and set to null");
    }
    setIsClockRunning(false);

    // Save tracked minutes to backend when timer stops
    if (!game || !homeTeam || !awayTeam) {
      message.error("Cannot save game state: missing game or team data");
      return;
    }

    try {
      console.log("Saving player minutes to backend:", playerMinutes);

      // Convert playerMinutes to the format expected by the bulk endpoint
      // The endpoint expects {playerId: milliseconds} as strings for keys
      const playerMinutesPayload: Record<string, number> = {};
      const allPlayers = [...homeTeam.players, ...awayTeam.players];

      allPlayers.forEach((player) => {
        const millisecondsPlayed = playerMinutes[player.id] || 0;
        playerMinutesPayload[player.id.toString()] = millisecondsPlayed;
      });

      // Update all player minutes in a single bulk request
      await gameAPI.updatePlayerMinutes(game.id, playerMinutesPayload);

      // NOTE: Plus-minus is now automatically calculated by the backend when recording shots
      // No need to update plus-minus manually from frontend
      /*
      // Convert playerPlusMinus to the format expected by the backend
      const playerPlusMinusPayload: Record<string, number> = {};

      // Use Object.entries to get both key and value reliably
      // Since playerPlusMinus is Record<number, number>, we need to handle the conversion properly
      for (const [playerIdKey, plusMinusValue] of Object.entries(
        playerPlusMinus
      )) {
        if (typeof plusMinusValue === "number") {
          playerPlusMinusPayload[playerIdKey] = plusMinusValue;
        }
      }

      console.log("🔄 Converting plus-minus data for API:");
      console.log("Original playerPlusMinus:", playerPlusMinus);
      console.log(
        "Number of players with plus-minus:",
        Object.keys(playerPlusMinus).length
      );
      console.log("PlayerPlusMinus entries:", Object.entries(playerPlusMinus));
      console.log("Converted payload:", playerPlusMinusPayload);
      console.log("Payload entries:", Object.entries(playerPlusMinusPayload));

      // Send plus-minus to backend
      if (Object.keys(playerPlusMinusPayload).length > 0) {
        console.log("📤 Sending plus-minus request to API...");
        console.log("URL:", `PUT /api/games/${game.id}/player-plusminus`);
        console.log("Payload:", playerPlusMinusPayload);

        const response = await gameAPI.updatePlayerPlusMinus(
          game.id,
          playerPlusMinusPayload
        );

        console.log("✅ API Response received:");
        console.log("Status:", response.status);
        console.log("Response data:", response.data);
        console.log(
          "Bulk player plus-minus update completed successfully:",
          playerPlusMinusPayload
        );
      } else {
        console.log("⚠️ No plus-minus data to send to API");
      }
      */

      message.success({
        content:
          "Minutos guardados exitosamente (Plus-minus calculado automáticamente por el backend)",
        duration: 3,
      });
    } catch (error: any) {
      console.error("Error saving player minutes:", error);
      console.error("Error response:", error?.response?.data);
      console.error("Error status:", error?.response?.status);
      console.error("Error message:", error?.message);

      const errorMessage =
        error?.response?.data?.error || error?.message || "Unknown error";
      message.error(`Failed to save player minutes: ${errorMessage}`);
    }
  };

  // Score management (following documentation)
  const updateScore = async (homeScore: number, awayScore: number) => {
    if (!game) return;

    try {
      console.log(`🏀 ==== TEAM SCORED! ====`);
      console.log(`🏀 SCORE UPDATE: ${homeScore}-${awayScore}`);
      console.log(
        `🏀 Previous scores - Home: ${homeTeam?.score || 0}, Away: ${
          awayTeam?.score || 0
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
            `🏠 ${player.nombre} (ID: ${player.id}): ${oldValue} → ${
              updated[player.id]
            } (+${homeScoreChange})`
          );
        });

        // All away players on court get negative points
        awayPlayersOnCourt.forEach((player) => {
          const oldValue = updated[player.id] || 0;
          updated[player.id] = oldValue - homeScoreChange;
          totalUpdated++;
          console.log(
            `✈️ ${player.nombre} (ID: ${player.id}): ${oldValue} → ${
              updated[player.id]
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
            `✈️ ${player.nombre} (ID: ${player.id}): ${oldValue} → ${
              updated[player.id]
            } (+${awayScoreChange})`
          );
        });

        // All home players on court get negative points
        homePlayersOnCourt.forEach((player) => {
          const oldValue = updated[player.id] || 0;
          updated[player.id] = oldValue - awayScoreChange;
          totalUpdated++;
          console.log(
            `🏠 ${player.nombre} (ID: ${player.id}): ${oldValue} → ${
              updated[player.id]
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
      `    Players processed: ${
        homePlayersOnCourt.length + awayPlayersOnCourt.length
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
      if (id && user) {
        console.log("🎮 Initializing game for user:", user.rol, "Game ID:", id);
        
        // Connect to socket
        socketService.connect();
        socketService.joinGame(Number(id));
        
        // Listen for substitution events from other users
        socketService.onSubstitutionMade((substitutionData) => {
          console.log("🔄 Substitution event received:", substitutionData);
          
          // Reload game data to get updated player states
          loadGameData();
          
          message.info("Sustitución realizada por otro usuario", 2);
        });
        
        // First join the game to get permissions
        const joinResult = await joinGame(Number(id));
        console.log("🎮 Join game result:", joinResult);
        // Then load game data
        loadGameData();
      }
    };

    initializeGame();

    // Cleanup function to clear any running timers when component unmounts or ID changes
    return () => {
      console.log("Component cleanup: clearing timer interval and socket listeners");
      if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
        setIsClockRunning(false);
      }
      // Clean up socket listeners
      socketService.removeAllListeners();
    };
  }, [id, user]); // Added user dependency

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
      " Current playerPlusMinus before loadGameData:",
      playerPlusMinus
    );
    try {
      // Load game data
      const gameResponse = await gameAPI.getGame(id!);
      const game = gameResponse.data;
      setGame(game);

      // Load both teams and their players
      try {
        const [homeTeamResponse, awayTeamResponse] = await Promise.all([
          teamAPI.getTeam(game.teamHomeId),
          teamAPI.getTeam(game.teamAwayId),
        ]);

        // Handle active players differently based on game state
        let homeActiveIds: number[] = [];
        let awayActiveIds: number[] = [];

        if (game.estado !== "scheduled") {
          // Only fetch active players for games that have started
          try {
            const activePlayers = await gameAPI.getActivePlayers(id!);
            console.log("Active players response:", activePlayers.data);

            if (activePlayers.data) {
              const homePlayers = activePlayers.data.homeTeam?.players || [];
              const awayPlayers = activePlayers.data.awayTeam?.players || [];

              homeActiveIds = homePlayers.map((p: Player) => p.id);
              awayActiveIds = awayPlayers.map((p: Player) => p.id);

              console.log("Home active players:", homeActiveIds);
              console.log("Away active players:", awayActiveIds);

              // If no active players are set but game is in progress,
              // this likely means the game was started without proper lineup setup
              if (homeActiveIds.length === 0 && awayActiveIds.length === 0) {
                console.warn(
                  "Game is in progress but no active players found. This game may need active players to be set."
                );
                // You could either:
                // 1. Show a warning to set active players
                // 2. Default to showing first 5 players of each team
                // For now, we'll leave arrays empty but log the issue
              }
            }
          } catch (err) {
            console.error("Error processing active players:", err);
          }
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

        console.log("Final home team with players:", newHomeTeam);
        console.log("Final away team with players:", newAwayTeam);

        setHomeTeam(newHomeTeam);
        setAwayTeam(newAwayTeam);

        // Initialize player minutes for all players when game data loads
        // Preserve existing minutes if available, otherwise start at 0
        const allPlayers = [...newHomeTeam.players, ...newAwayTeam.players];
        setPlayerMinutes((prev) => {
          const initialPlayerMinutes: Record<number, number> = {};
          allPlayers.forEach((player) => {
            // Keep existing minutes if available, otherwise start at 0
            initialPlayerMinutes[player.id] = prev[player.id] || 0;
          });
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

      // Step 1.5: Set the starters using the proper endpoint
      await api.post(`/games/${id}/set-starters`, {
        homeStarters: selectedPlayers.home,
        awayStarters: selectedPlayers.away,
      });

      console.log("Starters set successfully");

      // Step 2: Set all active players (replaces both home and away calls)
      await gameAPI.updateActivePlayers(id!, allActivePlayerIds);

      console.log("All active players set successfully");

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

      // Reset player minutes for new game
      resetPlayerMinutes();

      // Start the game timer automatically
      startTimer();

      // Notify success
      notification.success({
        message: "Juego iniciado",
        description:
          "El juego ha comenzado correctamente con los quintetos seleccionados",
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

      // Set all active players (replaces both home and away calls)
      const allActivePlayerIds = [
        ...selectedPlayers.home,
        ...selectedPlayers.away,
      ];
      await gameAPI.updateActivePlayers(id!, allActivePlayerIds);
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
    return <div>Cargando...</div>;
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
            <Text type="secondary">{game.event.nombre}</Text>
          </Col>
          <Col>
            <Space>
              <Link to={`/games/${game.id}/stats`}>
                <Button icon={<BarChartOutlined />} type="default">
                  Ver Estadísticas NBA
                </Button>
              </Link>
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
            <Title level={4} style={{ margin: 0 }}>
              {game.teamHome.nombre}
            </Title>
            <Statistic value={game.homeScore} style={{ marginTop: "4px" }} />
            {game.estado === "in_progress" && (
              <Space style={{ marginTop: 8 }}>
                <Button
                  size="small"
                  onClick={() =>
                    updateScore(
                      (homeTeam?.score || 0) + 1,
                      awayTeam?.score || 0
                    )
                  }
                >
                  +1
                </Button>
                <Button
                  size="small"
                  onClick={() =>
                    updateScore(
                      (homeTeam?.score || 0) + 2,
                      awayTeam?.score || 0
                    )
                  }
                >
                  +2
                </Button>
                <Button
                  size="small"
                  onClick={() =>
                    updateScore(
                      (homeTeam?.score || 0) + 3,
                      awayTeam?.score || 0
                    )
                  }
                >
                  +3
                </Button>
                <Button
                  size="small"
                  onClick={() =>
                    updateScore(
                      Math.max(0, (homeTeam?.score || 0) - 1),
                      awayTeam?.score || 0
                    )
                  }
                >
                  -1
                </Button>
              </Space>
            )}
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
                    {game.event.nombre}
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
              {game.estado === "in_progress" && user?.rol === "ADMIN" && (
                <div style={{ textAlign: "center" }}>
                  <Title
                    level={1}
                    style={{ margin: "0 0 16px 0", fontSize: "48px" }}
                  >
                    {formatTime(gameTime)}
                  </Title>
                  <Button
                    icon={
                      isClockRunning ? (
                        <PauseCircleOutlined />
                      ) : (
                        <PlayCircleOutlined />
                      )
                    }
                    onClick={() =>
                      isClockRunning ? stopTimer() : startTimer()
                    }
                    size="large"
                    disabled={!hasPermission("canControlTime")}
                    title={
                      !hasPermission("canControlTime")
                        ? "No tienes permisos para controlar el tiempo"
                        : undefined
                    }
                  >
                    {isClockRunning ? "Pausar" : "Reanudar"}
                  </Button>

                  {/* Debug section for permissions - Only for ADMIN users */}
                  {user?.rol === "ADMIN" && (
                    <div
                      style={{
                        marginTop: 16,
                        padding: 8,
                        background: "#f0f0f0",
                        borderRadius: 4,
                        fontSize: 12,
                      }}
                    >
                      <div>
                        <strong>Debug Info:</strong>
                      </div>
                      <div>User Role: {user?.rol}</div>
                      <div>Timer Running: {isClockRunning ? "YES" : "NO"}</div>
                      <div>Can Add Stats: YES (allowed anytime)</div>
                      <div>Can Substitute: YES (allowed anytime)</div>
                      <div>
                        Has canControlTime:{" "}
                        {hasPermission("canControlTime") ? "YES" : "NO"}
                      </div>
                      <div>
                        Current Permissions:{" "}
                        {currentGamePermissions
                          ? "LOADED"
                          : "NOT LOADED (using defaults)"}
                      </div>
                      {currentGamePermissions && (
                        <div>
                          canControlTime:{" "}
                          {currentGamePermissions.canControlTime
                            ? "TRUE"
                            : "FALSE"}
                        </div>
                      )}
                      {!currentGamePermissions && user?.rol && (
                        <div>
                          Default canControlTime for {user.rol}:{" "}
                          {(() => {
                            const defaultPerms =
                              permissionService.getDefaultPermissions(user.rol);
                            return defaultPerms.canControlTime
                              ? "TRUE"
                              : "FALSE";
                          })()}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Show warning if no active players are set */}
                  {selectedPlayers.home.length === 0 &&
                    selectedPlayers.away.length === 0 && (
                      <div
                        style={{
                          marginTop: 16,
                          padding: 12,
                          backgroundColor: "#fff2e8",
                          borderRadius: 6,
                          border: "1px solid #fa8c16",
                        }}
                      >
                        <Text type="warning" style={{ fontSize: 12 }}>
                          ⚠️ No hay jugadores activos.
                        </Text>
                        <br />
                        <Button
                          size="small"
                          type="primary"
                          style={{ marginTop: 8 }}
                          onClick={() => setIsLineupModalVisible(true)}
                          disabled={!hasPermission("canSetStarters")}
                          title={
                            !hasPermission("canSetStarters")
                              ? "No tienes permisos para configurar quintetos"
                              : undefined
                          }
                        >
                          Configurar Quintetos
                        </Button>
                      </div>
                    )}
                </div>
              )}
            </Space>
          </Col>
          <Col span={8} style={{ textAlign: "right" }}>
            <Title level={4} style={{ margin: 0 }}>
              {game.teamAway.nombre}
            </Title>
            <Statistic value={game.awayScore} style={{ marginTop: "4px" }} />
            {game.estado === "in_progress" && (
              <Space style={{ marginTop: 8 }}>
                <Button
                  size="small"
                  onClick={() =>
                    updateScore(
                      homeTeam?.score || 0,
                      (awayTeam?.score || 0) + 1
                    )
                  }
                >
                  +1
                </Button>
                <Button
                  size="small"
                  onClick={() =>
                    updateScore(
                      homeTeam?.score || 0,
                      (awayTeam?.score || 0) + 2
                    )
                  }
                >
                  +2
                </Button>
                <Button
                  size="small"
                  onClick={() =>
                    updateScore(
                      homeTeam?.score || 0,
                      (awayTeam?.score || 0) + 3
                    )
                  }
                >
                  +3
                </Button>
                <Button
                  size="small"
                  onClick={() =>
                    updateScore(
                      homeTeam?.score || 0,
                      Math.max(0, (awayTeam?.score || 0) - 1)
                    )
                  }
                >
                  -1
                </Button>
              </Space>
            )}
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
          <div style={{
            ...courtStyle,
            height: isFullscreen ? "calc(100vh - 300px)" : isMobile ? "50vh" : "60vh",
            margin: isFullscreen ? "8px 0" : "32px 0",
          }}>
            {/* Home team on left, away team on right */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: "30%",
              }}
            >
              {getOnCourtPlayers(homeTeam).map((p) => (
                <div
                  key={p.id}
                  style={{
                    ...playerCircle,
                    width: isMobile ? 60 : 80,
                    height: isMobile ? 60 : 80,
                    background: "#1890ff",
                    color: "white",
                    border: "3px solid #fff",
                    fontSize: isMobile ? 12 : 16,
                  }}
                  onClick={(e) => {
                    if (e.shiftKey || substitutionState.isSelecting) {
                      startSubstitution(p, "home");
                    } else {
                      openStatsModal(p);
                    }
                  }}
                  title={`${p.nombre} ${p.apellido} - ${p.posicion} | Click to record stats, Shift+Click to substitute`}
                >
                  <b style={{ fontSize: 18 }}>{p.numero}</b>
                  <span style={{ fontSize: 10, fontWeight: "bold" }}>
                    {p.nombre.split(" ")[0]}
                  </span>
                </div>
              ))}
            </div>
            <div
              style={{ width: "40%", textAlign: "center", alignSelf: "center" }}
            >
              <div>
                <Title level={2} style={{ color: "#b8860b", margin: 0 }}>
                  CANCHA
                </Title>
                {substitutionState.isSelecting && (
                  <div style={{ marginTop: 8 }}>
                    <Tag color="processing">
                      Selecting substitute for{" "}
                      {substitutionState.playerOut?.nombre}
                    </Tag>
                    <Button
                      size="small"
                      danger
                      onClick={cancelSubstitution}
                      style={{ marginLeft: 8 }}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: "30%",
              }}
            >
              {getOnCourtPlayers(awayTeam).map((p) => (
                <div
                  key={p.id}
                  style={{
                    ...playerCircle,
                    width: isMobile ? 60 : 80,
                    height: isMobile ? 60 : 80,
                    background: "#f5222d",
                    color: "white",
                    border: "3px solid #fff",
                    fontSize: isMobile ? 12 : 16,
                  }}
                  onClick={(e) => {
                    if (e.shiftKey || substitutionState.isSelecting) {
                      startSubstitution(p, "away");
                    } else {
                      openStatsModal(p);
                    }
                  }}
                  title={`${p.nombre} ${p.apellido} - ${p.posicion} | Click to record stats, Shift+Click to substitute`}
                >
                  <b style={{ fontSize: 18 }}>{p.numero}</b>
                  <span style={{ fontSize: 10, fontWeight: "bold" }}>
                    {p.nombre.split(" ")[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {/* Benches */}
          {(!isFullscreen || showBenchInFullscreen || !isMobile) && (
            <Row gutter={[16, 16]} style={{ marginTop: isFullscreen ? 12 : 24 }}>
              <Col xs={24} md={12}>
                <Title level={5} style={{ fontSize: isMobile ? 14 : 16 }}>Banca {homeTeam.nombre}</Title>
              <div style={benchStyle}>
                {getBenchPlayers(homeTeam).map((p) => (
                  <div
                    key={p.id}
                    style={{
                      ...playerCircle,
                      background: "#e6f7ff",
                      border:
                        substitutionState.isSelecting &&
                        substitutionState.selectedTeam === "home"
                          ? "3px solid #52c41a"
                          : "1px dashed #1890ff",
                      cursor:
                        substitutionState.isSelecting &&
                        substitutionState.selectedTeam === "home"
                          ? "pointer"
                          : "default",
                    }}
                    onClick={() => {
                      if (
                        substitutionState.isSelecting &&
                        substitutionState.selectedTeam === "home"
                      ) {
                        completeSubstitution(p);
                      } else if (!substitutionState.isSelecting) {
                        openStatsModal(p);
                      }
                    }}
                    title={
                      substitutionState.isSelecting &&
                      substitutionState.selectedTeam === "home"
                        ? `Click to substitute in ${p.nombre}`
                        : `${p.nombre} ${p.apellido} - ${p.posicion} | Bench player - No stats when not on court`
                    }
                  >
                    <b>{p.numero}</b>
                    <span style={{ fontSize: 12 }}>
                      {p.nombre.split(" ")[0]}
                    </span>
                  </div>
                ))}
              </div>
            </Col>
            <Col xs={24} md={12}>
              <Title level={5} style={{ fontSize: isMobile ? 14 : 16 }}>Banca {awayTeam.nombre}</Title>
              <div style={benchStyle}>
                {getBenchPlayers(awayTeam).map((p) => (
                  <div
                    key={p.id}
                    style={{
                      ...playerCircle,
                      background: "#e6f7ff",
                      border:
                        substitutionState.isSelecting &&
                        substitutionState.selectedTeam === "away"
                          ? "3px solid #52c41a"
                          : "1px dashed #1890ff",
                      cursor:
                        substitutionState.isSelecting &&
                        substitutionState.selectedTeam === "away"
                          ? "pointer"
                          : "default",
                    }}
                    onClick={() => {
                      if (
                        substitutionState.isSelecting &&
                        substitutionState.selectedTeam === "away"
                      ) {
                        completeSubstitution(p);
                      } else if (!substitutionState.isSelecting) {
                        openStatsModal(p);
                      }
                    }}
                    title={
                      substitutionState.isSelecting &&
                      substitutionState.selectedTeam === "away"
                        ? `Click to substitute in ${p.nombre}`
                        : `${p.nombre} ${p.apellido} - ${p.posicion} | Bench player - No stats when not on court`
                    }
                  >
                    <b>{p.numero}</b>
                    <span style={{ fontSize: 12 }}>
                      {p.nombre.split(" ")[0]}
                    </span>
                  </div>
                ))}
              </div>
            </Col>
          </Row>
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

      {/* Modal for confirming game start */}
      <Modal
        title="Iniciar Juego"
        open={isLineupModalVisible}
        onCancel={() => {
          setIsLineupModalVisible(false);
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setIsLineupModalVisible(false);
            }}
          >
            Cancelar
          </Button>,
          <Button
            key="start"
            type="primary"
            disabled={
              selectedPlayers.home.length !== 5 ||
              selectedPlayers.away.length !== 5
            }
            onClick={startGame}
          >
            Iniciar Juego
          </Button>,
        ]}
        width={800}
      >
        <div>
          {!homeTeam || !awayTeam ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <Title level={4}>Cargando datos de los equipos...</Title>
            </div>
          ) : selectedPlayers.home.length === 5 &&
            selectedPlayers.away.length === 5 ? (
            // Show confirmation view when lineups are complete
            <>
              <Title level={4}>Quintetos Iniciales</Title>
              <Row gutter={24}>
                <Col span={12}>
                  <Title level={5}>{homeTeam.nombre}</Title>
                  <List
                    dataSource={homeTeam.players.filter((p) =>
                      selectedPlayers.home.includes(p.id)
                    )}
                    renderItem={(player) => (
                      <List.Item>
                        <Space>
                          <span style={{ fontWeight: "bold" }}>
                            {player.numero}
                          </span>
                          {player.nombre} {player.apellido}
                          <Tag color="blue">{player.posicion}</Tag>
                        </Space>
                      </List.Item>
                    )}
                  />
                </Col>
                <Col span={12}>
                  <Title level={5}>{awayTeam.nombre}</Title>
                  <List
                    dataSource={awayTeam.players.filter((p) =>
                      selectedPlayers.away.includes(p.id)
                    )}
                    renderItem={(player) => (
                      <List.Item>
                        <Space>
                          <span style={{ fontWeight: "bold" }}>
                            {player.numero}
                          </span>
                          {player.nombre} {player.apellido}
                          <Tag color="red">{player.posicion}</Tag>
                        </Space>
                      </List.Item>
                    )}
                  />
                </Col>
              </Row>
            </>
          ) : (
            // Show player selection view when lineups are incomplete
            <>
              <Title level={4}>Seleccionar Quintetos Iniciales</Title>
              <Text
                type="secondary"
                style={{ display: "block", marginBottom: 16 }}
              >
                Selecciona 5 jugadores para cada equipo. Haz clic en los
                jugadores para agregarlos o quitarlos del quinteto inicial.
              </Text>

              <div
                style={{
                  marginBottom: 16,
                  padding: 8,
                  backgroundColor: "#f0f0f0",
                  borderRadius: 4,
                }}
              >
                <Text type="secondary">
                  Debug - Home players: {homeTeam.players?.length || 0}, Away
                  players: {awayTeam.players?.length || 0}
                </Text>
              </div>

              <Row gutter={24}>
                <Col span={12}>
                  <div style={{ marginBottom: 16 }}>
                    <Title level={5}>{homeTeam.nombre}</Title>
                    <Text
                      type={
                        selectedPlayers.home.length === 5
                          ? "success"
                          : "warning"
                      }
                    >
                      Seleccionados: {selectedPlayers.home.length}/5
                    </Text>
                  </div>
                  <List
                    dataSource={homeTeam.players || []}
                    renderItem={(player) => (
                      <List.Item
                        style={{
                          cursor: "pointer",
                          backgroundColor: selectedPlayers.home.includes(
                            player.id
                          )
                            ? "#e6f7ff"
                            : "transparent",
                          border: selectedPlayers.home.includes(player.id)
                            ? "1px solid #1890ff"
                            : "1px solid transparent",
                          borderRadius: 4,
                          padding: "8px 12px",
                          margin: "4px 0",
                        }}
                        onClick={() => {
                          console.log("Clicked player:", player);
                          const isSelected = selectedPlayers.home.includes(
                            player.id
                          );
                          if (isSelected) {
                            // Remove player
                            setSelectedPlayers((prev) => ({
                              ...prev,
                              home: prev.home.filter((id) => id !== player.id),
                            }));
                          } else if (selectedPlayers.home.length < 5) {
                            // Add player (only if less than 5 selected)
                            setSelectedPlayers((prev) => ({
                              ...prev,
                              home: [...prev.home, player.id],
                            }));
                          }
                        }}
                      >
                        <Space>
                          <span style={{ fontWeight: "bold" }}>
                            {player.numero}
                          </span>
                          {player.nombre} {player.apellido}
                          <Tag color="blue">{player.posicion}</Tag>
                          {selectedPlayers.home.includes(player.id) && (
                            <Tag color="success">Seleccionado</Tag>
                          )}
                        </Space>
                      </List.Item>
                    )}
                  />
                </Col>
                <Col span={12}>
                  <div style={{ marginBottom: 16 }}>
                    <Title level={5}>{awayTeam.nombre}</Title>
                    <Text
                      type={
                        selectedPlayers.away.length === 5
                          ? "success"
                          : "warning"
                      }
                    >
                      Seleccionados: {selectedPlayers.away.length}/5
                    </Text>
                  </div>
                  <List
                    dataSource={awayTeam.players || []}
                    renderItem={(player) => (
                      <List.Item
                        style={{
                          cursor: "pointer",
                          backgroundColor: selectedPlayers.away.includes(
                            player.id
                          )
                            ? "#fff2e8"
                            : "transparent",
                          border: selectedPlayers.away.includes(player.id)
                            ? "1px solid #fa8c16"
                            : "1px solid transparent",
                          borderRadius: 4,
                          padding: "8px 12px",
                          margin: "4px 0",
                        }}
                        onClick={() => {
                          console.log("Clicked player:", player);
                          const isSelected = selectedPlayers.away.includes(
                            player.id
                          );
                          if (isSelected) {
                            // Remove player
                            setSelectedPlayers((prev) => ({
                              ...prev,
                              away: prev.away.filter((id) => id !== player.id),
                            }));
                          } else if (selectedPlayers.away.length < 5) {
                            // Add player (only if less than 5 selected)
                            setSelectedPlayers((prev) => ({
                              ...prev,
                              away: [...prev.away, player.id],
                            }));
                          }
                        }}
                      >
                        <Space>
                          <span style={{ fontWeight: "bold" }}>
                            {player.numero}
                          </span>
                          {player.nombre} {player.apellido}
                          <Tag color="red">{player.posicion}</Tag>
                          {selectedPlayers.away.includes(player.id) && (
                            <Tag color="success">Seleccionado</Tag>
                          )}
                        </Space>
                      </List.Item>
                    )}
                  />
                </Col>
              </Row>
            </>
          )}
        </div>
      </Modal>

      {/* Modal for tracking stats */}
      <Modal
        title={
          statsModal.player
            ? `Estadísticas - ${statsModal.player.nombre} ${statsModal.player.apellido}`
            : ""
        }
        open={statsModal.visible}
        onCancel={closeStatsModal}
        footer={null}
        width={600}
      >
        <Tabs
          activeKey={statsModal.activeTab}
          onChange={(key: string) =>
            setStatsModal((prev) => ({
              ...prev,
              activeTab: key as "shots" | "other",
            }))
          }
        >
          {/* Shots Tab - Show for SCORER, ALL_AROUND, and ADMIN */}
          {(hasPermission("canEditShots") ||
            hasPermission("canEditPoints") ||
            hasPermission("canEditFreeThrows")) && (
            <Tabs.TabPane tab="Tiros" key="shots">
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                {/* 2-Point Field Goals */}
                {hasPermission("canEditShots") && (
                  <div style={{ marginBottom: 24 }}>
                    <Title level={5}>Tiros de 2 Puntos</Title>
                    <Space>
                      <Button
                        type="primary"
                        size="large"
                        style={{
                          width: "120px",
                          backgroundColor: "#52c41a",
                          borderColor: "#52c41a",
                        }}
                        onClick={() => recordShot("2pt", true)}
                      >
                        Anotado
                      </Button>
                      <Button
                        type="primary"
                        danger
                        size="large"
                        style={{ width: "120px" }}
                        onClick={() => recordShot("2pt", false)}
                      >
                        Fallado
                      </Button>
                    </Space>
                  </div>
                )}

                {/* 3-Point Field Goals */}
                {hasPermission("canEditShots") && (
                  <div style={{ marginBottom: 24 }}>
                    <Title level={5}>Tiros de 3 Puntos</Title>
                    <Space>
                      <Button
                        type="primary"
                        size="large"
                        style={{
                          width: "120px",
                          backgroundColor: "#52c41a",
                          borderColor: "#52c41a",
                        }}
                        onClick={() => recordShot("3pt", true)}
                      >
                        Anotado
                      </Button>
                      <Button
                        type="primary"
                        danger
                        size="large"
                        style={{ width: "120px" }}
                        onClick={() => recordShot("3pt", false)}
                      >
                        Fallado
                      </Button>
                    </Space>
                  </div>
                )}

                {/* Free Throws */}
                {hasPermission("canEditFreeThrows") && (
                  <div>
                    <Title level={5}>Tiros Libres</Title>
                    <Space>
                      <Button
                        type="primary"
                        size="large"
                        style={{
                          width: "120px",
                          backgroundColor: "#52c41a",
                          borderColor: "#52c41a",
                        }}
                        onClick={() => recordShot("ft", true)}
                      >
                        Anotado
                      </Button>
                      <Button
                        type="primary"
                        danger
                        size="large"
                        style={{ width: "120px" }}
                        onClick={() => recordShot("ft", false)}
                      >
                        Fallado
                      </Button>
                    </Space>
                  </div>
                )}
              </div>
            </Tabs.TabPane>
          )}

          {/* Other Stats Tab - Show sections based on permissions */}
          {(hasPermission("canEditRebounds") ||
            hasPermission("canEditAssists") ||
            hasPermission("canEditSteals") ||
            hasPermission("canEditBlocks") ||
            hasPermission("canEditTurnovers") ||
            hasPermission("canEditPersonalFouls")) && (
            <Tabs.TabPane tab="Otras Estadísticas" key="other">
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <Space
                  direction="vertical"
                  size="large"
                  style={{ width: "100%" }}
                >
                  {/* Rebounds and Assists - Show for REBOUNDER_ASSISTS, ALL_AROUND, ADMIN */}
                  {(hasPermission("canEditRebounds") ||
                    hasPermission("canEditAssists")) && (
                    <div>
                      <Title level={5}>Rebotes y Asistencias</Title>
                      <Space>
                        {hasPermission("canEditRebounds") && (
                          <Button
                            type="primary"
                            size="large"
                            style={{ width: "120px" }}
                            onClick={() => recordStat("rebound")}
                          >
                            Rebote
                          </Button>
                        )}
                        {hasPermission("canEditRebounds") && (
                          <Button
                            type="default"
                            size="large"
                            style={{ width: "160px" }}
                            onClick={() => recordStat("offensiveRebound")}
                          >
                            Rebote Ofensivo
                          </Button>
                        )}
                        {hasPermission("canEditAssists") && (
                          <Button
                            type="primary"
                            size="large"
                            style={{ width: "120px" }}
                            onClick={() => recordStat("assist")}
                          >
                            Asistencia
                          </Button>
                        )}
                      </Space>
                    </div>
                  )}

                  {/* Defense - Show for STEALS_BLOCKS, ALL_AROUND, ADMIN */}
                  {(hasPermission("canEditSteals") ||
                    hasPermission("canEditBlocks")) && (
                    <div>
                      <Title level={5}>Defensa</Title>
                      <Space>
                        {hasPermission("canEditSteals") && (
                          <Button
                            type="primary"
                            size="large"
                            style={{ width: "120px" }}
                            onClick={() => recordStat("steal")}
                          >
                            Robo
                          </Button>
                        )}
                        {hasPermission("canEditBlocks") && (
                          <Button
                            type="primary"
                            size="large"
                            style={{ width: "120px" }}
                            onClick={() => recordStat("block")}
                          >
                            Tapón
                          </Button>
                        )}
                      </Space>
                    </div>
                  )}

                  {/* Errors - Show for REBOUNDER_ASSISTS (turnovers), ALL_AROUND, ADMIN */}
                  {(hasPermission("canEditTurnovers") ||
                    hasPermission("canEditPersonalFouls")) && (
                    <div>
                      <Title level={5}>Errores</Title>
                      <Space>
                        {hasPermission("canEditTurnovers") && (
                          <Button
                            type="primary"
                            danger
                            size="large"
                            style={{ width: "120px" }}
                            onClick={() => recordStat("turnover")}
                          >
                            Pérdida
                          </Button>
                        )}
                        {hasPermission("canEditPersonalFouls") && (
                          <Button
                            type="primary"
                            style={{
                              width: "120px",
                              backgroundColor: "#ff7a45",
                              borderColor: "#ff7a45",
                            }}
                            onClick={() => recordStat("foul")}
                          >
                            Falta Personal
                          </Button>
                        )}
                      </Space>
                    </div>
                  )}

                  {/* Current Stats - Always show if available */}
                  {statsModal.player?.stats && (
                    <div style={{ marginTop: 24 }}>
                      <Title level={5}>Estadísticas Actuales</Title>
                      <Row gutter={[16, 16]}>
                        <Col span={6}>
                          <Statistic
                            title="Puntos"
                            value={statsModal.player.stats.puntos}
                          />
                        </Col>
                        <Col span={6}>
                          <Statistic
                            title="Rebotes"
                            value={statsModal.player.stats.rebotes}
                          />
                        </Col>
                        <Col span={6}>
                          <Statistic
                            title="Asistencias"
                            value={statsModal.player.stats.asistencias}
                          />
                        </Col>
                        <Col span={6}>
                          <Statistic
                            title="Minutos"
                            value={Math.floor(
                              statsModal.player.stats.minutos / 60
                            )}
                          />
                        </Col>
                        <Col span={6}>
                          <Statistic
                            title="Robos"
                            value={statsModal.player.stats.robos}
                          />
                        </Col>
                        <Col span={6}>
                          <Statistic
                            title="Tapones"
                            value={statsModal.player.stats.tapones}
                          />
                        </Col>
                        <Col span={6}>
                          <Statistic
                            title="Faltas"
                            value={
                              statsModal.player.stats.faltasPersonales || 0
                            }
                          />
                        </Col>
                        <Col span={6}>
                          <Statistic
                            title="Pérdidas"
                            value={statsModal.player.stats.perdidas || 0}
                          />
                        </Col>
                        <Col span={12}>
                          <Statistic
                            title="Tiros de Campo"
                            value={`${statsModal.player.stats.tirosAnotados}/${statsModal.player.stats.tirosIntentados}`}
                            suffix={`(${Math.round(
                              (statsModal.player.stats.tirosAnotados /
                                statsModal.player.stats.tirosIntentados || 0) *
                                100
                            )}%)`}
                          />
                        </Col>
                      </Row>
                    </div>
                  )}
                </Space>
              </div>
            </Tabs.TabPane>
          )}
        </Tabs>
      </Modal>
    </div>
  );
};

export default GameDetailView;
