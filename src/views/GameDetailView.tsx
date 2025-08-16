import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Card,
  Row,
  Col,
  Typography,
  Statistic,
  Button,
  Table,
  Space,
  Tag,
  Modal,
  notification,
  App,
  Tabs,
  Checkbox,
} from "antd";
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  RedoOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { io, Socket } from "socket.io-client";
import axios from "axios";
import type { CheckboxChangeEvent } from 'antd/es/checkbox';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

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
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isLineupModalVisible, setIsLineupModalVisible] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState<{
    home: number[];
    away: number[];
  }>({ home: [], away: [] });
  const [gameTime, setGameTime] = useState(0);
  const [isClockRunning, setIsClockRunning] = useState(false);

  useEffect(() => {
    loadGameData();
    initializeSocket();

    return () => {
      socket?.disconnect();
    };
  }, [id]);

  const initializeSocket = () => {
    const newSocket = io('http://localhost:4000');
    newSocket.on('connect', () => {
      console.log('Connected to game server');
      if (id) {
        newSocket.emit('joinGame', id);
      }
    });

    newSocket.on('gameUpdate', (data) => {
      console.log('Game update received:', data);
      // Handle game updates (score, stats, etc.)
      if (data.score) {
        updateScore(data.score);
      }
    });

    setSocket(newSocket);
  };

  const loadGameData = async () => {
    try {
      const gameResponse = await axios.get(`http://localhost:4000/games/${id}`);
      const game = gameResponse.data;
      setGame(game);

      // Load both teams and their players
      const [homeTeamResponse, awayTeamResponse] = await Promise.all([
        axios.get(`http://localhost:4000/teams/${game.teamHomeId}`),
        axios.get(`http://localhost:4000/teams/${game.teamAwayId}`)
      ]);

      const homeTeam = {
        ...homeTeamResponse.data,
        score: game.score?.home || 0,
        players: homeTeamResponse.data.players.map((p: Player) => ({ ...p, isOnCourt: false }))
      };
      const awayTeam = {
        ...awayTeamResponse.data,
        score: game.score?.away || 0,
        players: awayTeamResponse.data.players.map((p: Player) => ({ ...p, isOnCourt: false }))
      };

      setHomeTeam(homeTeam);
      setAwayTeam(awayTeam);
    } catch (err) {
      notification.error({
        message: "Error",
        description: "No se pudo cargar la información del juego",
      });
    }
  };

  const handlePlayerSelection = (playerId: number, isHome: boolean, checked: boolean) => {
    setSelectedPlayers(prev => {
      const team = isHome ? 'home' : 'away';
      const currentSelected = prev[team];
      
      if (checked && currentSelected.length >= 5) {
        notification.warning({
          message: "Límite alcanzado",
          description: "Ya hay 5 jugadores seleccionados"
        });
        return prev;
      }

      return {
        ...prev,
        [team]: checked 
          ? [...currentSelected, playerId]
          : currentSelected.filter(id => id !== playerId)
      };
    });
  };

  const validateLineups = () => {
    if (selectedPlayers.home.length !== 5 || selectedPlayers.away.length !== 5) {
      notification.error({
        message: "Error",
        description: "Cada equipo debe tener exactamente 5 jugadores seleccionados",
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
        fecha: game.fecha
      };

      console.log('Updating game status with:', gameUpdateData);
      await axios.put(`http://localhost:4000/games/${id}`, gameUpdateData);

      // Then, create substitutions for each starter one by one
      console.log('Creating substitutions for starters...');
      
      const timestamp = new Date().toISOString();
      
      // Process home team starters
      for (const playerId of selectedPlayers.home) {
        const substitution = {
          gameId: Number(id),
          playerInId: playerId,
          playerOutId: null,
          timestamp
        };
        console.log('Creating substitution:', substitution);
        await axios.post('http://localhost:4000/substitutions', substitution);
      }

      // Process away team starters
      for (const playerId of selectedPlayers.away) {
        const substitution = {
          gameId: Number(id),
          playerInId: playerId,
          playerOutId: null,
          timestamp
        };
        console.log('Creating substitution:', substitution);
        await axios.post('http://localhost:4000/substitutions', substitution);
      }

      // Update local state
      setGame(prev => prev ? { ...prev, estado: "En progreso" } : null);
      setIsLineupModalVisible(false);
      setIsClockRunning(true);

      // Notify success
      notification.success({
        message: "Juego iniciado",
        description: "El juego ha comenzado correctamente",
      });

      // Emit game start event
      socket?.emit('gameStart', {
        gameId: id,
        homeLineup: selectedPlayers.home,
        awayLineup: selectedPlayers.away
      });
    } catch (err) {
      notification.error({
        message: "Error",
        description: "No se pudo iniciar el juego",
      });
    }
  };

  const updateScore = (score: { home: number; away: number }) => {
    setHomeTeam(prev => prev ? { ...prev, score: score.home } : null);
    setAwayTeam(prev => prev ? { ...prev, score: score.away } : null);
  };

  const renderPlayerSelection = (team: Team, isHome: boolean) => (
    <div style={{ marginBottom: 16 }}>
      <Title level={4}>{team.nombre}</Title>
      {team.players.map(player => (
        <div key={player.id} style={{ marginBottom: 8 }}>
          <Checkbox
            onChange={(e: CheckboxChangeEvent) => 
              handlePlayerSelection(player.id, isHome, e.target.checked)
            }
            checked={selectedPlayers[isHome ? 'home' : 'away'].includes(player.id)}
          >
            {player.numero} - {player.nombre} {player.apellido} ({player.posicion})
          </Checkbox>
        </div>
      ))}
    </div>
  );

  if (!game || !homeTeam || !awayTeam) {
    return <div>Cargando...</div>;
  }

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Row gutter={24} align="middle" justify="space-between">
          <Col span={8}>
            <Title level={3}>{homeTeam.nombre}</Title>
            <Statistic value={homeTeam.score} />
          </Col>
          <Col span={8} style={{ textAlign: 'center' }}>
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
                    icon={isClockRunning ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                    onClick={() => setIsClockRunning(!isClockRunning)}
                  >
                    {isClockRunning ? "Pausar" : "Reanudar"}
                  </Button>
                  <Text strong>{Math.floor(gameTime / 60)}:{(gameTime % 60).toString().padStart(2, '0')}</Text>
                </Space>
              )}
            </Space>
          </Col>
          <Col span={8} style={{ textAlign: 'right' }}>
            <Title level={3}>{awayTeam.nombre}</Title>
            <Statistic value={awayTeam.score} />
          </Col>
        </Row>
      </Card>

      <Modal
        title="Selección de Quinteto Inicial"
        open={isLineupModalVisible}
        onOk={startGame}
        onCancel={() => setIsLineupModalVisible(false)}
        width={800}
        okText="Iniciar Juego"
        cancelText="Cancelar"
        okButtonProps={{
          disabled: selectedPlayers.home.length !== 5 || selectedPlayers.away.length !== 5
        }}
      >
        <Tabs defaultActiveKey="home">
          <TabPane
            tab={<span><TeamOutlined />{homeTeam.nombre}</span>}
            key="home"
          >
            {renderPlayerSelection(homeTeam, true)}
            <Text type="secondary">
              Seleccionados: {selectedPlayers.home.length}/5
            </Text>
          </TabPane>
          <TabPane
            tab={<span><TeamOutlined />{awayTeam.nombre}</span>}
            key="away"
          >
            {renderPlayerSelection(awayTeam, false)}
            <Text type="secondary">
              Seleccionados: {selectedPlayers.away.length}/5
            </Text>
          </TabPane>
        </Tabs>
      </Modal>
    </div>
  );
};

export default GameDetailView;
