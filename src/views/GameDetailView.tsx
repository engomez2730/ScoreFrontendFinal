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
  List,
  Tag,
  Tabs
} from "antd";
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  RedoOutlined,
} from "@ant-design/icons";

import { gameAPI, teamAPI } from "../services/apiService";
import axios from "axios";

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
  const QUARTER_LENGTH = 600; // 10 minutes in seconds
  const [gameTime, setGameTime] = useState(QUARTER_LENGTH);
  const [isClockRunning, setIsClockRunning] = useState(false);
  const [timerInterval, setTimerInterval] = useState<ReturnType<typeof setInterval> | null>(null);
  const [playerMinutes, setPlayerMinutes] = useState<Record<number, number>>({});
  const [statsModal, setStatsModal] = useState<{
    visible: boolean;
    player: Player | null;
    activeTab: 'shots' | 'other';
  }>({
    visible: false,
    player: null,
    activeTab: 'shots'
  });

  // Get 5 on-court and bench players for each team
  const getOnCourtPlayers = (team: Team) => {
    return team.players.filter((p) => p.isOnCourt);
  };
  const getBenchPlayers = (team: Team) => {
    return team.players.filter((p) => !p.isOnCourt);
  };

  // Handle stats modal
  const openStatsModal = (player: Player, activeTab: 'shots' | 'other' = 'shots') => {
    setStatsModal({ visible: true, player, activeTab });
  };

  const closeStatsModal = () => {
    setStatsModal({ visible: false, player: null, activeTab: 'shots' });
  };

  const recordStat = async (statType: 'assist' | 'rebound' | 'steal' | 'block' | 'turnover') => {
    if (!statsModal.player || !game) return;

    try {

      switch (statType) {
        case 'assist':
          await gameAPI.recordAssist(game.id, statsModal.player.id);
          break;
        case 'rebound':
          await gameAPI.recordRebound(game.id, statsModal.player.id);
          break;
        case 'steal':
          await gameAPI.recordSteal(game.id, statsModal.player.id);
          break;
        case 'block':
          await gameAPI.recordBlock(game.id, statsModal.player.id);
          break;
        case 'turnover':
          await gameAPI.recordTurnover(game.id, statsModal.player.id);
          break;
      }

      notification.success({
        message: "Estadística Registrada",
        description: `Se registró un ${
          statType === 'assist' ? 'asistencia' :
          statType === 'rebound' ? 'rebote' :
          statType === 'steal' ? 'robo' : 
          statType === 'turnover' ? 'pérdida' : 'tapón'
        } para ${statsModal.player.nombre} ${statsModal.player.apellido}`,
      });

      loadGameData(); // Refresh game data to update stats
    } catch (error) {
      notification.error({
        message: "Error",
        description: "No se pudo registrar la estadística",
      });
    }
  };

  // Record shot (intelligent shot tracking)
  const recordShot = async (shotType: string, made: boolean) => {
    if (!statsModal.player || !game) return;

    try {
      const currentGameTime = QUARTER_LENGTH - gameTime; // Convert countdown time to elapsed time
      const playerMinutesPlayed = Math.floor((playerMinutes[statsModal.player.id] || 0) / 60); // Convert seconds to minutes

      await gameAPI.recordShot(game.id, {
        playerId: statsModal.player.id,
        shotType,
        made,
        gameTime: currentGameTime,
        playerMinutes: playerMinutesPlayed
      });

      notification.success({
        message: "Tiro Registrado",
        description: `${
          made ? "Anotado" : "Fallado"
        } ${shotType === "2pt" ? "Tiro de 2" : "Tiro de 3"} por ${statsModal.player.nombre} ${
          statsModal.player.apellido
        }`,
      });

      closeStatsModal();
      // Refresh game data to update stats
      loadGameData();
    } catch (error) {
      notification.error({
        message: "Error",
        description: "Could not record shot",
      });
    }
  };

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
    if (timerInterval) return; // Already running

    const interval = setInterval(async () => {
      setGameTime((prev) => {
        const newTime = prev - 1;
        if (newTime >= 0) {
          updateGameTime(QUARTER_LENGTH - newTime);
          // Update minutes for players on court
          if (homeTeam && awayTeam) {
            const onCourtPlayers = [
              ...homeTeam.players.filter(p => p.isOnCourt),
              ...awayTeam.players.filter(p => p.isOnCourt)
            ];
            
            setPlayerMinutes(prev => {
              const updated = { ...prev };
              onCourtPlayers.forEach(player => {
                updated[player.id] = (updated[player.id] || 0) + 1;
              });
              return updated;
            });
          }
          return newTime;
        }
        // Stop the timer at 0:00
        clearInterval(interval);
        setTimerInterval(null);
        setIsClockRunning(false);
        return 0;
      });
    }, 1000);

    setTimerInterval(interval);
    setIsClockRunning(true);
  };

  const stopTimer = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    setIsClockRunning(false);
  };

  const resetTimer = async () => {
    stopTimer();
    setGameTime(QUARTER_LENGTH);

    if (game) {
      try {
        await gameAPI.resetGameTime(game.id);
      } catch (error) {
        console.error("Error resetting game time:", error);
      }
    }
  };

  // Score management (following documentation)
  const updateScore = async (homeScore: number, awayScore: number) => {
    if (!game) return;

    try {
      await gameAPI.updateScore(game.id, homeScore, awayScore);

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
    console.log("Loading game data for ID:", id);
    try {
      // Load game data
      console.log("Fetching game from:", `http://localhost:4000/api/games/${id}`);
      const gameResponse = await gameAPI.getGame(id!);
      console.log("Game response:", gameResponse);
      const game = gameResponse.data;
      console.log("Game data:", game);
      setGame(game);

      // Load both teams and their players
      console.log("Fetching teams:", game.teamHomeId, game.teamAwayId);
      const [homeTeamResponse, awayTeamResponse, activePlayers] = await Promise.all([
        teamAPI.getTeam(game.teamHomeId),
        teamAPI.getTeam(game.teamAwayId),
        axios.get(`http://localhost:4000/api/games/${id}/active-players`)
      ]);

      console.log("Active players response:", activePlayers.data);
      
      // Handle the active players data structure properly
      let homeActiveIds: number[] = [];
      let awayActiveIds: number[] = [];

      try {
        if (activePlayers.data) {
          const homePlayers = activePlayers.data.homeTeam?.players || [];
          const awayPlayers = activePlayers.data.awayTeam?.players || [];

          homeActiveIds = homePlayers.map((p: Player) => p.id);
          awayActiveIds = awayPlayers.map((p: Player) => p.id);

          // Set selected players directly from the response
          setSelectedPlayers({
            home: homeActiveIds,
            away: awayActiveIds
          });

          console.log("Home active players:", homeActiveIds);
          console.log("Away active players:", awayActiveIds);
        }
      } catch (err) {
        console.error("Error processing active players:", err);
        console.log("Active players data structure:", activePlayers.data);
      }

      const homeTeam = {
        ...homeTeamResponse.data,
        score: game.score?.home || 0,
        players: homeTeamResponse.data.players.map((p: Player) => ({
          ...p,
          isOnCourt: homeActiveIds.includes(p.id),
        })),
      };
      const awayTeam = {
        ...awayTeamResponse.data,
        score: game.score?.away || 0,
        players: awayTeamResponse.data.players.map((p: Player) => ({
          ...p,
          isOnCourt: awayActiveIds.includes(p.id),
        })),
      };

      // Set selected players based on active players
      const homeActivePlayers = homeTeam.players.filter((p: Player) => p.isOnCourt).map((p: Player) => p.id);
      const awayActivePlayers = awayTeam.players.filter((p: Player) => p.isOnCourt).map((p: Player) => p.id);
      setSelectedPlayers({
        home: homeActivePlayers,
        away: awayActivePlayers
      });

      setHomeTeam(homeTeam);
      setAwayTeam(awayTeam);
      console.log("Game data loaded successfully");
    } catch (err) {
      console.error("Error loading game data:", err);
    }
  };



  const startGame = async () => {
    if (!game) return;

    try {
      // Check if both teams have active players
      if (selectedPlayers.home.length !== 5 || selectedPlayers.away.length !== 5) {
        notification.error({
          message: "Error",
          description: "Ambos equipos deben tener 5 jugadores seleccionados"
        });
        return;
      }

      // Update the game status to in_progress
      const gameUpdateData = {
        estado: "in_progress",
        eventId: game.eventId,
        teamHomeId: game.teamHomeId,
        teamAwayId: game.teamAwayId,
        fecha: new Date(game.fecha).toISOString(),
      };

      await gameAPI.updateGame(id!, gameUpdateData);

      // Update local state
      setGame((prev) => (prev ? { ...prev, estado: "in_progress" } : null));

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

      // Notify success
      notification.success({
        message: "Juego iniciado",
        description: "El juego ha comenzado correctamente",
      });
    } catch (err: any) {
      notification.error({
        message: "Error al Iniciar el Juego",
        description: err.response?.data?.error || "No se pudo iniciar el juego",
      });
    }
  };



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
          padding: "12px 16px",
          boxShadow: "0 2px 8px #0001",
          zIndex: 2,
        }}
      >
        <Row align="middle" justify="space-between" gutter={8}>
          <Col span={8}>
            <Title level={4} style={{ margin: 0 }}>{game.teamHome.nombre}</Title>
            <Statistic value={game.homeScore} style={{ marginTop: '4px' }} />
            {game.estado === "in_progress" && (
              <Space style={{ marginTop: 8 }}>
                <Button
                  size="small"
                  onClick={() =>
                    updateScore(game.homeScore + 1, game.awayScore)
                  }
                >
                  +1
                </Button>
                <Button
                  size="small"
                  onClick={() =>
                    updateScore(game.homeScore + 2, game.awayScore)
                  }
                >
                  +2
                </Button>
                <Button
                  size="small"
                  onClick={() =>
                    updateScore(game.homeScore + 3, game.awayScore)
                  }
                >
                  +3
                </Button>
                <Button
                  size="small"
                  onClick={() =>
                    updateScore(Math.max(0, game.homeScore - 1), game.awayScore)
                  }
                >
                  -1
                </Button>
              </Space>
            )}
          </Col>
          <Col span={8} style={{ textAlign: "center" }}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Text>
                {game.estado === "scheduled" && "Por comenzar"}
                {game.estado === "in_progress" && "En progreso"}
                {game.estado === "finished" && "Finalizado"}
              </Text>
              {game.estado === "in_progress" && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                  <Title level={4} style={{ margin: 0 }}>
                    {game.isOvertime 
                      ? `OT ${Math.floor(game.currentQuarter - game.totalQuarters + 1)}` 
                      : `Q${game.currentQuarter}`}
                  </Title>
                  <Text strong style={{ fontSize: '18px' }}>
                    {formatTime(game.quarterTime)}
                  </Text>
                  <Tag color="blue" style={{ marginTop: '4px' }}>
                    {game.event.nombre}
                  </Tag>
                </div>
              )}
              {game.estado === "scheduled" && (
                <Space direction="vertical" style={{ width: '100%', gap: '8px' }}>
                  <Button
                    type="primary"
                    icon={<PlayCircleOutlined />}
                    style={{ width: '100%' }}
                    onClick={() => setIsLineupModalVisible(true)}
                  >
                    Configurar Quintetos e Iniciar Juego
                  </Button>
                  <div style={{ textAlign: 'center', marginTop: '4px' }}>
                    <Text type="secondary">
                      Local: {selectedPlayers.home.length}/5 jugadores seleccionados
                    </Text>
                    <br />
                    <Text type="secondary">
                      Visitante: {selectedPlayers.away.length}/5 jugadores seleccionados
                    </Text>
                  </div>
                </Space>
              )}
              {game.estado === "in_progress" && (
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
                    {formatTime(gameTime)}
                  </Text>
                </Space>
              )}
            </Space>
          </Col>
          <Col span={8} style={{ textAlign: "right" }}>
            <Title level={4} style={{ margin: 0 }}>{game.teamAway.nombre}</Title>
            <Statistic value={game.awayScore} style={{ marginTop: '4px' }} />
            {game.estado === "in_progress" && (
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
      {game.estado === "in_progress" && (
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
                  onClick={() => openStatsModal(p)}
                  title={`${p.nombre} ${p.apellido} - ${p.posicion} | Click to record stats`}
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
                  onClick={() => openStatsModal(p)}
                  title={`${p.nombre} ${p.apellido} - ${p.posicion} | Click to record stats`}
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
                    title={`${p.nombre} ${p.apellido} - ${p.posicion} | Click to record shots`}
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
                    title={`${p.nombre} ${p.apellido} - ${p.posicion} | Click to record shots`}
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
            onClick={startGame}
          >
            Iniciar Juego
          </Button>
        ]}
        width={800}
      >
        <div>
          <Title level={4}>Quintetos Iniciales</Title>
          <Row gutter={24}>
            <Col span={12}>
              <Title level={5}>{homeTeam.nombre}</Title>
              <List
                dataSource={homeTeam.players.filter(p => selectedPlayers.home.includes(p.id))}
                renderItem={player => (
                  <List.Item>
                    <Space>
                      <span style={{ fontWeight: 'bold' }}>{player.numero}</span>
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
                dataSource={awayTeam.players.filter(p => selectedPlayers.away.includes(p.id))}
                renderItem={player => (
                  <List.Item>
                    <Space>
                      <span style={{ fontWeight: 'bold' }}>{player.numero}</span>
                      {player.nombre} {player.apellido}
                      <Tag color="red">{player.posicion}</Tag>
                    </Space>
                  </List.Item>
                )}
              />
            </Col>
          </Row>
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
          onChange={(key: string) => setStatsModal(prev => ({ ...prev, activeTab: key as 'shots' | 'other' }))}
        >
          <Tabs.TabPane tab="Tiros" key="shots">
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              {/* 2-Point Field Goals */}
              <div style={{ marginBottom: 24 }}>
                <Title level={5}>Tiros de 2 Puntos</Title>
                <Space>
                  <Button
                    type="primary"
                    size="large"
                    style={{ 
                      width: "120px",
                      backgroundColor: "#52c41a",
                      borderColor: "#52c41a"
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

              {/* 3-Point Field Goals */}
              <div style={{ marginBottom: 24 }}>
                <Title level={5}>Tiros de 3 Puntos</Title>
                <Space>
                  <Button
                    type="primary"
                    size="large"
                    style={{ 
                      width: "120px",
                      backgroundColor: "#52c41a",
                      borderColor: "#52c41a"
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

              {/* Free Throws */}
              <div>
                <Title level={5}>Tiros Libres</Title>
                <Space>
                  <Button
                    type="primary"
                    size="large"
                    style={{ 
                      width: "120px",
                      backgroundColor: "#52c41a",
                      borderColor: "#52c41a"
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
            </div>
          </Tabs.TabPane>

          <Tabs.TabPane tab="Otras Estadísticas" key="other">
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div>
                  <Title level={5}>Rebotes y Asistencias</Title>
                  <Space>
                    <Button
                      type="primary"
                      size="large"
                      style={{ width: "120px" }}
                      onClick={() => recordStat('rebound')}
                    >
                      Rebote
                    </Button>
                    <Button
                      type="primary"
                      size="large"
                      style={{ width: "120px" }}
                      onClick={() => recordStat('assist')}
                    >
                      Asistencia
                    </Button>
                  </Space>
                </div>

                <div>
                  <Title level={5}>Defensa</Title>
                  <Space>
                    <Button
                      type="primary"
                      size="large"
                      style={{ width: "120px" }}
                      onClick={() => recordStat('steal')}
                    >
                      Robo
                    </Button>
                    <Button
                      type="primary"
                      size="large"
                      style={{ width: "120px" }}
                      onClick={() => recordStat('block')}
                    >
                      Tapón
                    </Button>
                  </Space>
                </div>

                <div>
                  <Title level={5}>Errores</Title>
                  <Button
                    type="primary"
                    danger
                    size="large"
                    style={{ width: "120px" }}
                    onClick={() => recordStat('turnover')}
                  >
                    Pérdida
                  </Button>
                </div>

                {statsModal.player?.stats && (
                  <div style={{ marginTop: 24 }}>
                    <Title level={5}>Estadísticas Actuales</Title>
                    <Row gutter={[16, 16]}>
                      <Col span={6}>
                        <Statistic title="Puntos" value={statsModal.player.stats.puntos} />
                      </Col>
                      <Col span={6}>
                        <Statistic title="Rebotes" value={statsModal.player.stats.rebotes} />
                      </Col>
                      <Col span={6}>
                        <Statistic title="Asistencias" value={statsModal.player.stats.asistencias} />
                      </Col>
                      <Col span={6}>
                        <Statistic title="Minutos" value={Math.floor(statsModal.player.stats.minutos / 60)} />
                      </Col>
                      <Col span={6}>
                        <Statistic title="Robos" value={statsModal.player.stats.robos} />
                      </Col>
                      <Col span={6}>
                        <Statistic title="Tapones" value={statsModal.player.stats.tapones} />
                      </Col>
                      <Col span={12}>
                        <Statistic
                          title="Tiros de Campo"
                          value={`${statsModal.player.stats.tirosAnotados}/${statsModal.player.stats.tirosIntentados}`}
                          suffix={`(${Math.round((statsModal.player.stats.tirosAnotados / statsModal.player.stats.tirosIntentados || 0) * 100)}%)`}
                        />
                      </Col>
                    </Row>
                  </div>
                )}
              </Space>
            </div>
          </Tabs.TabPane>
        </Tabs>
      </Modal>
    </div>
  );
};

export default GameDetailView;
