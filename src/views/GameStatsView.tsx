import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Row,
  Col,
  Typography,
  Table,
  Card,
  Tag,
  Space,
  Button,
  Spin,
  message,
} from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { gameAPI, playerAPI } from "../services/apiService";

const { Title, Text } = Typography;

interface PlayerStats {
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
  tirosLibresIntentados: number;
  tirosLibresAnotados: number;
  minutos: number;
  plusMinus: number;
  perdidas: number;
  player?: {
    id: number;
    nombre: string;
    apellido: string;
    numero: number;
    posicion: string;
    teamId: number;
  };
}

interface GameData {
  id: number;
  eventId: number;
  teamHomeId: number;
  teamAwayId: number;
  fecha: string;
  estado: string;
  gameTime: number;
  homeScore: number;
  awayScore: number;
  currentQuarter: number;
  quarterLength: number;
  totalQuarters: number;
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
  stats: PlayerStats[];
  substitutions: Array<{
    id: number;
    gameId: number;
    playerInId: number;
    playerOutId: number;
    timestamp: string;
    gameTime: number;
  }>;
}

const GameStatsView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<Record<number, any>>({});

  useEffect(() => {
    loadGameStats();
  }, [id]);

  const loadGameStats = async () => {
    try {
      setLoading(true);

      // Load game data
      const gameResponse = await gameAPI.getGame(id!);
      const game = gameResponse.data;
      setGameData(game);

      // Load all players data
      const allPlayers = await playerAPI.getPlayers();
      const playersMap: Record<number, any> = {};
      allPlayers.data.forEach((player: any) => {
        playersMap[player.id] = player;
      });
      setPlayers(playersMap);
    } catch (error) {
      console.error("Error loading game stats:", error);
      message.error("Error al cargar las estadísticas del juego");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatPlayerMinutes = (seconds: number): string => {
    // Backend stores player minutes as seconds
    const totalSeconds = Math.floor(seconds);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const calculateFieldGoalPercentage = (
    made: number,
    attempted: number
  ): string => {
    if (attempted === 0) return "0.0%";
    return `${((made / attempted) * 100).toFixed(1)}%`;
  };

  const getGameStatus = (estado: string): { text: string; color: string } => {
    switch (estado) {
      case "scheduled":
        return { text: "Programado", color: "blue" };
      case "in_progress":
        return { text: "En Progreso", color: "green" };
      case "finished":
        return { text: "Finalizado", color: "default" };
      default:
        return { text: estado, color: "default" };
    }
  };

  const createStatsColumns = () => [
    {
      title: "Jugador",
      key: "player",
      width: 200,
      render: (record: PlayerStats) => {
        const player = players[record.playerId];
        if (!player) return `Jugador ${record.playerId}`;

        return (
          <Space direction="vertical" size={0}>
            <Text strong>{`${player.nombre} ${player.apellido}`}</Text>
            <Text type="secondary" style={{ fontSize: "12px" }}>
              #{player.numero} • {player.posicion}
            </Text>
          </Space>
        );
      },
    },
    {
      title: "MIN",
      dataIndex: "minutos",
      key: "minutos",
      width: 60,
      align: "center" as const,
      render: (minutos: number) => formatPlayerMinutes(minutos),
    },
    {
      title: "PTS",
      dataIndex: "puntos",
      key: "puntos",
      width: 50,
      align: "center" as const,
      render: (puntos: number) => (
        <Text strong style={{ fontSize: "16px" }}>
          {puntos}
        </Text>
      ),
    },
    {
      title: "TC",
      key: "fieldGoals",
      width: 80,
      align: "center" as const,
      render: (record: PlayerStats) => (
        <Space direction="vertical" size={0}>
          <Text>{`${record.tirosAnotados}-${record.tirosIntentados}`}</Text>
          <Text type="secondary" style={{ fontSize: "11px" }}>
            {calculateFieldGoalPercentage(
              record.tirosAnotados,
              record.tirosIntentados
            )}
          </Text>
        </Space>
      ),
    },
    {
      title: "3PT",
      key: "threePoints",
      width: 80,
      align: "center" as const,
      render: (record: PlayerStats) => (
        <Space direction="vertical" size={0}>
          <Text>{`${record.tiros3Anotados}-${record.tiros3Intentados}`}</Text>
          <Text type="secondary" style={{ fontSize: "11px" }}>
            {calculateFieldGoalPercentage(
              record.tiros3Anotados,
              record.tiros3Intentados
            )}
          </Text>
        </Space>
      ),
    },
    {
      title: "TL",
      key: "freeThrows",
      width: 80,
      align: "center" as const,
      render: (record: PlayerStats) => (
        <Space direction="vertical" size={0}>
          <Text>{`${record.tirosLibresAnotados}-${record.tirosLibresIntentados}`}</Text>
          <Text type="secondary" style={{ fontSize: "11px" }}>
            {calculateFieldGoalPercentage(
              record.tirosLibresAnotados,
              record.tirosLibresIntentados
            )}
          </Text>
        </Space>
      ),
    },
    {
      title: "REB",
      dataIndex: "rebotes",
      key: "rebotes",
      width: 50,
      align: "center" as const,
    },
    {
      title: "AST",
      dataIndex: "asistencias",
      key: "asistencias",
      width: 50,
      align: "center" as const,
    },
    {
      title: "ROB",
      dataIndex: "robos",
      key: "robos",
      width: 50,
      align: "center" as const,
    },
    {
      title: "TAP",
      dataIndex: "tapones",
      key: "tapones",
      width: 50,
      align: "center" as const,
    },
    {
      title: "PER",
      dataIndex: "perdidas",
      key: "perdidas",
      width: 50,
      align: "center" as const,
    },
    {
      title: "+/-",
      dataIndex: "plusMinus",
      key: "plusMinus",
      width: 50,
      align: "center" as const,
      render: (plusMinus: number) => (
        <Text
          style={{
            color:
              plusMinus > 0 ? "#52c41a" : plusMinus < 0 ? "#ff4d4f" : undefined,
          }}
        >
          {plusMinus > 0 ? `+${plusMinus}` : plusMinus}
        </Text>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text>Cargando estadísticas del juego...</Text>
        </div>
      </div>
    );
  }

  if (!gameData) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <Text>No se pudieron cargar las estadísticas del juego</Text>
      </div>
    );
  }

  const homeStats = gameData.stats.filter((stat) => {
    const player = players[stat.playerId];
    return player && player.teamId === gameData.teamHomeId;
  });

  const awayStats = gameData.stats.filter((stat) => {
    const player = players[stat.playerId];
    return player && player.teamId === gameData.teamAwayId;
  });

  const gameStatus = getGameStatus(gameData.estado);

  return (
    <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Header */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Space>
            <Link to="/games">
              <Button icon={<ArrowLeftOutlined />} type="text">
                Volver a Juegos
              </Button>
            </Link>
          </Space>
        </Col>
      </Row>

      {/* Game Header */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[24, 16]} align="middle">
          <Col xs={24} md={8} style={{ textAlign: "center" }}>
            <Space direction="vertical" size={4}>
              <Title level={3} style={{ margin: 0, color: "#1890ff" }}>
                {gameData.teamHome.nombre}
              </Title>
              <Text type="secondary">Local</Text>
            </Space>
          </Col>

          <Col xs={24} md={8} style={{ textAlign: "center" }}>
            <Space direction="vertical" size={8}>
              <Title level={1} style={{ margin: 0, fontSize: "48px" }}>
                {gameData.homeScore} - {gameData.awayScore}
              </Title>
              <Space>
                <Tag color={gameStatus.color}>{gameStatus.text}</Tag>
                <Text>Q{gameData.currentQuarter}</Text>
                <Text>
                  {formatTime(
                    (gameData.quarterLength - gameData.quarterTime) * 1000
                  )}
                </Text>
              </Space>
              <Text type="secondary">{gameData.event.nombre}</Text>
            </Space>
          </Col>

          <Col xs={24} md={8} style={{ textAlign: "center" }}>
            <Space direction="vertical" size={4}>
              <Title level={3} style={{ margin: 0, color: "#ff4d4f" }}>
                {gameData.teamAway.nombre}
              </Title>
              <Text type="secondary">Visitante</Text>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Home Team Stats */}
      <Card
        title={
          <Title level={4} style={{ margin: 0, color: "#1890ff" }}>
            {gameData.teamHome.nombre} - Estadísticas
          </Title>
        }
        style={{ marginBottom: 24 }}
      >
        <Table
          dataSource={homeStats}
          columns={createStatsColumns()}
          pagination={false}
          size="small"
          rowKey="id"
          scroll={{ x: 800 }}
        />
      </Card>

      {/* Away Team Stats */}
      <Card
        title={
          <Title level={4} style={{ margin: 0, color: "#ff4d4f" }}>
            {gameData.teamAway.nombre} - Estadísticas
          </Title>
        }
      >
        <Table
          dataSource={awayStats}
          columns={createStatsColumns()}
          pagination={false}
          size="small"
          rowKey="id"
          scroll={{ x: 800 }}
        />
      </Card>

      {/* Substitutions */}
      {gameData.substitutions.length > 0 && (
        <Card
          title={
            <Title level={4} style={{ margin: 0 }}>
              Sustituciones
            </Title>
          }
          style={{ marginTop: 24 }}
        >
          <Space direction="vertical" style={{ width: "100%" }}>
            {gameData.substitutions.map((sub) => {
              const playerOut = players[sub.playerOutId];
              const playerIn = players[sub.playerInId];
              return (
                <div
                  key={sub.id}
                  style={{
                    padding: "8px 0",
                    borderBottom: "1px solid #f0f0f0",
                  }}
                >
                  <Text>
                    <Text strong>
                      {playerOut
                        ? `${playerOut.nombre} ${playerOut.apellido}`
                        : `Jugador ${sub.playerOutId}`}
                    </Text>
                    {" → "}
                    <Text strong>
                      {playerIn
                        ? `${playerIn.nombre} ${playerIn.apellido}`
                        : `Jugador ${sub.playerInId}`}
                    </Text>
                  </Text>
                  <Text type="secondary" style={{ marginLeft: 16 }}>
                    {formatTime(sub.gameTime * 1000)} del juego
                  </Text>
                </div>
              );
            })}
          </Space>
        </Card>
      )}
    </div>
  );
};

export default GameStatsView;
