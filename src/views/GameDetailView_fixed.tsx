import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Row,
  Col,
  Typography,
  Statistic,
  Button,
  Space,
  Modal,
  App,
  Tabs,
  Checkbox,
  message,
} from "antd";
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  RedoOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import api from "../api/axios";
import type { CheckboxChangeEvent } from "antd/es/checkbox";

const { Title, Text } = Typography;
const { TabPane } = Tabs;

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
  estado: "Programado" | "En progreso" | "Finalizado";
  score?: {
    home: number;
    away: number;
  };
}

const GameDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { notification } = App.useApp();
  const [game, setGame] = useState<Game | null>(null);
  const [homeTeam, setHomeTeam] = useState<Team | null>(null);
  const [awayTeam, setAwayTeam] = useState<Team | null>(null);
  const [isLineupModalVisible, setIsLineupModalVisible] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState<{
    home: number[];
    away: number[];
  }>({ home: [], away: [] });
  const [gameTime, setGameTime] = useState(0);
  const [isClockRunning, setIsClockRunning] = useState(false);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(
    null
  );
  const [playerMinutes, setPlayerMinutes] = useState<Record<number, number>>(
    {}
  );
  const [lastTimerUpdate, setLastTimerUpdate] = useState<number>(Date.now());
  const QUARTER_LENGTH = 600; // 10 minutes in seconds
  const [statModal, setStatModal] = useState<{
    visible: boolean;
    player: Player | null;
  }>({ visible: false, player: null });
  const [statInput, setStatInput] = useState({
    puntos: 0,
    rebotes: 0,
    asistencias: 0,
    robos: 0,
    tapones: 0,
    tirosIntentados: 0,
    tirosAnotados: 0,
    tiros3Intentados: 0,
    tiros3Anotados: 0,
    minutos: 0,
    plusMinus: 0,
  });

  // Get 5 on-court and bench players for each team
  const getOnCourtPlayers = (team: Team) => {
    return team.players.filter((p) => p.isOnCourt);
  };
  const getBenchPlayers = (team: Team) => {
    return team.players.filter((p) => !p.isOnCourt);
  };

  // Handle stat modal open/close
  const openStatModal = (player: Player) => {
    setStatModal({ visible: true, player });
    setStatInput({
      puntos: 0,
      rebotes: 0,
      asistencias: 0,
      robos: 0,
      tapones: 0,
      tirosIntentados: 0,
      tirosAnotados: 0,
      tiros3Intentados: 0,
      tiros3Anotados: 0,
      minutos: 0,
      plusMinus: 0,
    });
  };
  const closeStatModal = () => setStatModal({ visible: false, player: null });

  // Save stats (following documentation API)
  const saveStats = async () => {
    if (!statModal.player || !game) return;

    try {
      await api.put(`/games/${game.id}/player-stats`, {
        playerId: statModal.player.id,
        stats: statInput,
      });

      notification.success({
        message: "Estadísticas guardadas",
        description: `Stats updated for ${statModal.player.nombre} ${statModal.player.apellido}`,
      });

      closeStatModal();
    } catch (error) {
      notification.error({
        message: "Error",
        description: "No se pudieron guardar las estadísticas",
      });
    }
  };

  // Timer management functions (following documentation)
  const updateGameTime = async (seconds: number) => {
    if (!game) return;

    try {
      await api.put(`/games/${game.id}/time`, {
        gameTime: seconds,
      });
    } catch (error) {
      console.error("Error updating game time:", error);
    }
  };

  const startTimer = () => {
    if (timerInterval) return; // Already running

    const interval = setInterval(async () => {
      setGameTime((prev) => {
        const newTime = prev + 1;
        updateGameTime(newTime);

        // Check if quarter ended (assuming 10 minutes = 600 seconds per quarter)
        if (newTime > 0 && newTime % QUARTER_LENGTH === 0) {
          console.log("Quarter ended at:", newTime);
          handleQuarterEnd();
        }

        return newTime;
      });

      // Update player minutes for all players currently on court
      updatePlayerMinutes();
    }, 1000);

    setTimerInterval(interval);
    setIsClockRunning(true);
    setLastTimerUpdate(Date.now());
  };

  // Update player minutes for all players currently on court
  const updatePlayerMinutes = () => {
    if (!homeTeam || !awayTeam) return;

    const now = Date.now();
    const elapsed = now - lastTimerUpdate; // milliseconds since last update

    setPlayerMinutes((prev) => {
      const updated = { ...prev };

      // Add time for all players currently on court
      const onCourtPlayers = [
        ...getOnCourtPlayers(homeTeam),
        ...getOnCourtPlayers(awayTeam),
      ];

      onCourtPlayers.forEach((player) => {
        updated[player.id] = (updated[player.id] || 0) + elapsed;
      });

      return updated;
    });

    setLastTimerUpdate(now);
  };

  // Handle quarter end - automatically go to next quarter and save stats
  const handleQuarterEnd = async () => {
    if (!game) return;

    try {
      console.log(
        "🏁 Quarter ended, saving stats and going to next quarter..."
      );

      // Save current stats before quarter ends (same logic as stopTimer)
      await savePlayerMinutesToBackend();

      // Reset timer for new quarter (or handle game end logic)
      setGameTime((prev) => prev); // Keep current time, backend will handle quarter transition

      message.success({
        content: "¡Cuarto finalizado! Estadísticas guardadas.",
        duration: 4,
      });

      console.log("✅ Quarter transition completed successfully");
    } catch (error) {
      console.error("Error handling quarter end:", error);
      notification.error({
        message: "Error",
        description: "Error al finalizar el cuarto",
      });
    }
  };

  // Save player minutes to backend (extracted from stopTimer logic)
  const savePlayerMinutesToBackend = async () => {
    if (!game || !homeTeam || !awayTeam) {
      notification.error({
        message: "Error",
        description:
          "No se pueden guardar las estadísticas: faltan datos del juego",
      });
      return;
    }

    try {
      console.log("Saving player minutes to backend:", playerMinutes);

      // Convert playerMinutes to the format expected by the bulk endpoint
      const playerMinutesPayload: Record<string, number> = {};
      const allPlayers = [...homeTeam.players, ...awayTeam.players];

      allPlayers.forEach((player) => {
        const millisecondsPlayed = playerMinutes[player.id] || 0;
        playerMinutesPayload[player.id.toString()] = millisecondsPlayed;
      });

      // Update all player minutes in a single bulk request
      await api.put(`/games/${game.id}/player-minutes`, playerMinutesPayload);

      console.log("✅ Player minutes saved successfully");
    } catch (error) {
      console.error("Error saving player minutes:", error);
      throw error; // Re-throw to be handled by caller
    }
  };

  const stopTimer = async () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    setIsClockRunning(false);

    // Save player minutes when timer stops
    try {
      await savePlayerMinutesToBackend();
      notification.success({
        message: "Cronómetro detenido",
        description: "Minutos de jugadores guardados exitosamente",
      });
    } catch (error) {
      console.error("Error saving player minutes on stop:", error);
      notification.error({
        message: "Error",
        description: "Error al guardar las estadísticas",
      });
    }
  };

  const resetTimer = async () => {
    stopTimer();
    setGameTime(0);

    if (game) {
      try {
        await api.post(`/games/${game.id}/reset-time`);
      } catch (error) {
        console.error("Error resetting game time:", error);
      }
    }
  };

  // Score management (following documentation)
  const updateScore = async (homeScore: number, awayScore: number) => {
    if (!game) return;

    try {
      await api.put(`/games/${game.id}/score`, {
        homeScore,
        awayScore,
      });

      setHomeTeam((prev) => (prev ? { ...prev, score: homeScore } : null));
      setAwayTeam((prev) => (prev ? { ...prev, score: awayScore } : null));
    } catch (error) {
      notification.error({
        message: "Error",
        description: "No se pudo actualizar el marcador",
      });
    }
  };

  useEffect(() => {
    loadGameData();

    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [id]);

  const loadGameData = async () => {
    try {
      const gameResponse = await api.get(`/games/${id}`);
      const game = gameResponse.data;
      setGame(game);

      // Load both teams and their players
      const [homeTeamResponse, awayTeamResponse] = await Promise.all([
        api.get(`/teams/${game.teamHomeId}`),
        api.get(`/teams/${game.teamAwayId}`),
      ]);

      const homeTeam = {
        ...homeTeamResponse.data,
        score: game.score?.home || 0,
        players: homeTeamResponse.data.players.map((p: Player) => ({
          ...p,
          isOnCourt: false,
        })),
      };
      const awayTeam = {
        ...awayTeamResponse.data,
        score: game.score?.away || 0,
        players: awayTeamResponse.data.players.map((p: Player) => ({
          ...p,
          isOnCourt: false,
        })),
      };

      setHomeTeam(homeTeam);
      setAwayTeam(awayTeam);

      // Initialize player minutes for all players
      const initialPlayerMinutes: Record<number, number> = {};
      [...homeTeam.players, ...awayTeam.players].forEach((player) => {
        initialPlayerMinutes[player.id] = 0;
      });
      setPlayerMinutes(initialPlayerMinutes);
    } catch (err) {
      notification.error({
        message: "Error",
        description: "No se pudo cargar la información del juego",
      });
    }
  };

  const handlePlayerSelection = (
    playerId: number,
    isHome: boolean,
    checked: boolean
  ) => {
    setSelectedPlayers((prev) => {
      const team = isHome ? "home" : "away";
      const currentSelected = prev[team];

      if (checked && currentSelected.length >= 5) {
        notification.warning({
          message: "Límite alcanzado",
          description: "Ya hay 5 jugadores seleccionados",
        });
        return prev;
      }

      return {
        ...prev,
        [team]: checked
          ? [...currentSelected, playerId]
          : currentSelected.filter((id) => id !== playerId),
      };
    });
  };

  const validateLineups = () => {
    if (
      selectedPlayers.home.length !== 5 ||
      selectedPlayers.away.length !== 5
    ) {
      notification.error({
        message: "Error",
        description:
          "Cada equipo debe tener exactamente 5 jugadores seleccionados",
      });
      return false;
    }
    return true;
  };

  const startGame = async () => {
    if (!validateLineups() || !game) return;

    try {
      // First, update the game status
      const gameUpdateData = {
        estado: "En progreso",
        eventId: game.eventId,
        teamHomeId: game.teamHomeId,
        teamAwayId: game.teamAwayId,
        fecha: game.fecha,
      };

      await api.put(`/games/${id}`, gameUpdateData);

      // First, set the starters using the proper endpoint
      await api.post(`/games/${id}/set-starters`, {
        homeStarters: selectedPlayers.home,
        awayStarters: selectedPlayers.away,
      });

      // Then, create substitutions for each starter
      const timestamp = new Date().toISOString();

      // Process home team starters
      for (const playerId of selectedPlayers.home) {
        const substitution = {
          gameId: Number(id),
          playerInId: playerId,
          playerOutId: null,
          timestamp,
        };
        await api.post("/substitutions", substitution);
      }

      // Process away team starters
      for (const playerId of selectedPlayers.away) {
        const substitution = {
          gameId: Number(id),
          playerInId: playerId,
          playerOutId: null,
          timestamp,
        };
        await api.post("/substitutions", substitution);
      }

      // Update local state
      setGame((prev) => (prev ? { ...prev, estado: "En progreso" } : null));

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

      // Start the game timer automatically
      startTimer();

      // Initialize timer tracking
      setLastTimerUpdate(Date.now());

      // Notify success
      notification.success({
        message: "Juego iniciado",
        description: "El juego ha comenzado correctamente",
      });
    } catch (err) {
      notification.error({
        message: "Error",
        description: "No se pudo iniciar el juego",
      });
    }
  };

  const renderPlayerSelection = (team: Team, isHome: boolean) => (
    <div style={{ marginBottom: 16 }}>
      <Title level={4}>{team.nombre}</Title>
      {team.players.map((player) => (
        <div key={player.id} style={{ marginBottom: 8 }}>
          <Checkbox
            onChange={(e: CheckboxChangeEvent) =>
              handlePlayerSelection(player.id, isHome, e.target.checked)
            }
            checked={selectedPlayers[isHome ? "home" : "away"].includes(
              player.id
            )}
          >
            {player.numero} - {player.nombre} {player.apellido} (
            {player.posicion})
          </Checkbox>
        </div>
      ))}
    </div>
  );

  if (!game || !homeTeam || !awayTeam) {
    return <div>Cargando...</div>;
  }

  return (
    <div style={{ padding: 0, minHeight: "100vh", background: "#f5f5f5" }}>
      {/* Score and game info */}
      <div
        style={{
          width: "100%",
          background: "#fffbe6",
          padding: 24,
          boxShadow: "0 2px 8px #0001",
          zIndex: 2,
        }}
      >
        <Row align="middle" justify="space-between">
          <Col span={8}>
            <Title level={3}>{homeTeam.nombre}</Title>
            <Statistic value={homeTeam.score} />
            {game.estado === "En progreso" && (
              <Space style={{ marginTop: 8 }}>
                <Button
                  size="small"
                  onClick={() =>
                    updateScore(homeTeam.score + 1, awayTeam.score)
                  }
                >
                  +1
                </Button>
                <Button
                  size="small"
                  onClick={() =>
                    updateScore(homeTeam.score + 2, awayTeam.score)
                  }
                >
                  +2
                </Button>
                <Button
                  size="small"
                  onClick={() =>
                    updateScore(homeTeam.score + 3, awayTeam.score)
                  }
                >
                  +3
                </Button>
                <Button
                  size="small"
                  onClick={() =>
                    updateScore(Math.max(0, homeTeam.score - 1), awayTeam.score)
                  }
                >
                  -1
                </Button>
              </Space>
            )}
          </Col>
          <Col span={8} style={{ textAlign: "center" }}>
            <Space direction="vertical">
              <Title level={4}>
                {game.estado === "Programado" && "Por comenzar"}
                {game.estado === "En progreso" && "En progreso"}
                {game.estado === "Finalizado" && "Finalizado"}
              </Title>
              {game.estado === "Programado" && (
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  onClick={() => setIsLineupModalVisible(true)}
                >
                  Iniciar Juego
                </Button>
              )}
              {game.estado === "En progreso" && (
                <Space>
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
                  >
                    {isClockRunning ? "Pausar" : "Reanudar"}
                  </Button>
                  <Button icon={<RedoOutlined />} onClick={resetTimer}>
                    Reset
                  </Button>
                  <Text strong>
                    {Math.floor(gameTime / 60)}:
                    {(gameTime % 60).toString().padStart(2, "0")}
                  </Text>
                </Space>
              )}
            </Space>
          </Col>
          <Col span={8} style={{ textAlign: "right" }}>
            <Title level={3}>{awayTeam.nombre}</Title>
            <Statistic value={awayTeam.score} />
            {game.estado === "En progreso" && (
              <Space style={{ marginTop: 8 }}>
                <Button
                  size="small"
                  onClick={() =>
                    updateScore(homeTeam.score, awayTeam.score + 1)
                  }
                >
                  +1
                </Button>
                <Button
                  size="small"
                  onClick={() =>
                    updateScore(homeTeam.score, awayTeam.score + 2)
                  }
                >
                  +2
                </Button>
                <Button
                  size="small"
                  onClick={() =>
                    updateScore(homeTeam.score, awayTeam.score + 3)
                  }
                >
                  +3
                </Button>
                <Button
                  size="small"
                  onClick={() =>
                    updateScore(homeTeam.score, Math.max(0, awayTeam.score - 1))
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
      {game.estado === "En progreso" && (
        <div
          style={{
            width: "100%",
            maxWidth: 1200,
            margin: "0 auto",
            padding: 24,
          }}
        >
          {/* Court */}
          <div style={courtStyle}>
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
                    background: "#1890ff",
                    color: "white",
                    border: "3px solid #fff",
                  }}
                  onClick={() => openStatModal(p)}
                  title={`${p.nombre} ${p.apellido} - ${p.posicion}`}
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
              <Title level={2} style={{ color: "#b8860b", margin: 0 }}>
                CANCHA
              </Title>
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
                    background: "#f5222d",
                    color: "white",
                    border: "3px solid #fff",
                  }}
                  onClick={() => openStatModal(p)}
                  title={`${p.nombre} ${p.apellido} - ${p.posicion}`}
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
          <Row gutter={24} style={{ marginTop: 24 }}>
            <Col span={12}>
              <Title level={5}>Banca {homeTeam.nombre}</Title>
              <div style={benchStyle}>
                {getBenchPlayers(homeTeam).map((p) => (
                  <div
                    key={p.id}
                    style={{
                      ...playerCircle,
                      background: "#e6f7ff",
                      border: "1px dashed #1890ff",
                    }}
                    onClick={() => openStatModal(p)}
                  >
                    <b>{p.numero}</b>
                    <span style={{ fontSize: 12 }}>
                      {p.nombre.split(" ")[0]}
                    </span>
                  </div>
                ))}
              </div>
            </Col>
            <Col span={12}>
              <Title level={5}>Banca {awayTeam.nombre}</Title>
              <div style={benchStyle}>
                {getBenchPlayers(awayTeam).map((p) => (
                  <div
                    key={p.id}
                    style={{
                      ...playerCircle,
                      background: "#e6f7ff",
                      border: "1px dashed #1890ff",
                    }}
                    onClick={() => openStatModal(p)}
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
        </div>
      )}

      {/* Modal for selecting starting lineup */}
      <Modal
        title="Selección de Quinteto Inicial"
        open={isLineupModalVisible}
        onOk={startGame}
        onCancel={() => setIsLineupModalVisible(false)}
        width={800}
        okText="Iniciar Juego"
        cancelText="Cancelar"
        okButtonProps={{
          disabled:
            selectedPlayers.home.length !== 5 ||
            selectedPlayers.away.length !== 5,
        }}
      >
        <Tabs defaultActiveKey="home">
          <TabPane
            tab={
              <span>
                <TeamOutlined />
                {homeTeam.nombre}
              </span>
            }
            key="home"
          >
            {renderPlayerSelection(homeTeam, true)}
            <Text type="secondary">
              Seleccionados: {selectedPlayers.home.length}/5
            </Text>
          </TabPane>
          <TabPane
            tab={
              <span>
                <TeamOutlined />
                {awayTeam.nombre}
              </span>
            }
            key="away"
          >
            {renderPlayerSelection(awayTeam, false)}
            <Text type="secondary">
              Seleccionados: {selectedPlayers.away.length}/5
            </Text>
          </TabPane>
        </Tabs>
      </Modal>

      {/* Modal for adding stats to a player */}
      <Modal
        title={
          statModal.player
            ? `Agregar stats a ${statModal.player.nombre} ${statModal.player.apellido}`
            : ""
        }
        open={statModal.visible}
        onOk={saveStats}
        onCancel={closeStatModal}
        okText="Guardar"
        cancelText="Cancelar"
        width={600}
      >
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
        >
          <div>
            <div style={{ marginBottom: 12 }}>
              <Text strong>Puntos: </Text>
              <input
                type="number"
                value={statInput.puntos}
                min={0}
                style={{ width: 80, marginLeft: 8 }}
                onChange={(e) =>
                  setStatInput({ ...statInput, puntos: Number(e.target.value) })
                }
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <Text strong>Rebotes: </Text>
              <input
                type="number"
                value={statInput.rebotes}
                min={0}
                style={{ width: 80, marginLeft: 8 }}
                onChange={(e) =>
                  setStatInput({
                    ...statInput,
                    rebotes: Number(e.target.value),
                  })
                }
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <Text strong>Asistencias: </Text>
              <input
                type="number"
                value={statInput.asistencias}
                min={0}
                style={{ width: 80, marginLeft: 8 }}
                onChange={(e) =>
                  setStatInput({
                    ...statInput,
                    asistencias: Number(e.target.value),
                  })
                }
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <Text strong>Robos: </Text>
              <input
                type="number"
                value={statInput.robos}
                min={0}
                style={{ width: 80, marginLeft: 8 }}
                onChange={(e) =>
                  setStatInput({ ...statInput, robos: Number(e.target.value) })
                }
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <Text strong>Tapones: </Text>
              <input
                type="number"
                value={statInput.tapones}
                min={0}
                style={{ width: 80, marginLeft: 8 }}
                onChange={(e) =>
                  setStatInput({
                    ...statInput,
                    tapones: Number(e.target.value),
                  })
                }
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <Text strong>Minutos: </Text>
              <input
                type="number"
                value={statInput.minutos}
                min={0}
                style={{ width: 80, marginLeft: 8 }}
                onChange={(e) =>
                  setStatInput({
                    ...statInput,
                    minutos: Number(e.target.value),
                  })
                }
              />
            </div>
          </div>
          <div>
            <div style={{ marginBottom: 12 }}>
              <Text strong>Tiros Intentados: </Text>
              <input
                type="number"
                value={statInput.tirosIntentados}
                min={0}
                style={{ width: 80, marginLeft: 8 }}
                onChange={(e) =>
                  setStatInput({
                    ...statInput,
                    tirosIntentados: Number(e.target.value),
                  })
                }
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <Text strong>Tiros Anotados: </Text>
              <input
                type="number"
                value={statInput.tirosAnotados}
                min={0}
                style={{ width: 80, marginLeft: 8 }}
                onChange={(e) =>
                  setStatInput({
                    ...statInput,
                    tirosAnotados: Number(e.target.value),
                  })
                }
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <Text strong>Tiros 3 Intentados: </Text>
              <input
                type="number"
                value={statInput.tiros3Intentados}
                min={0}
                style={{ width: 80, marginLeft: 8 }}
                onChange={(e) =>
                  setStatInput({
                    ...statInput,
                    tiros3Intentados: Number(e.target.value),
                  })
                }
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <Text strong>Tiros 3 Anotados: </Text>
              <input
                type="number"
                value={statInput.tiros3Anotados}
                min={0}
                style={{ width: 80, marginLeft: 8 }}
                onChange={(e) =>
                  setStatInput({
                    ...statInput,
                    tiros3Anotados: Number(e.target.value),
                  })
                }
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <Text strong>Plus/Minus: </Text>
              <input
                type="number"
                value={statInput.plusMinus}
                style={{ width: 80, marginLeft: 8 }}
                onChange={(e) =>
                  setStatInput({
                    ...statInput,
                    plusMinus: Number(e.target.value),
                  })
                }
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default GameDetailView;
