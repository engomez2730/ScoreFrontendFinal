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
import socketService from "../api/socketService";

const { Title, Text } = Typography;

// CSS styles for totals rows
const totalsRowStyle = {
  backgroundColor: '#f0f2f5',
  borderTop: '2px solid #1890ff',
  fontWeight: 'bold',
} as React.CSSProperties;

const totalsRowAwayStyle = {
  backgroundColor: '#f0f2f5',
  borderTop: '2px solid #ff4d4f',
  fontWeight: 'bold',
} as React.CSSProperties;

interface PlayerStats {
  id: number;
  gameId: number;
  playerId: number;
  puntos: number;
  rebotes: number;
  rebotesOfensivos?: number;
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
  faltasPersonales: number;
  faltasQ1: number;
  faltasQ2: number;
  faltasQ3: number;
  faltasQ4: number;
  faltasOT: number;
  isStarter: boolean;
  puntosQ1: number;
  puntosQ2: number;
  puntosQ3: number;
  puntosQ4: number;
  puntosOT: number;
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

  // Socket: connect and subscribe to real-time updates for this game
  useEffect(() => {
    if (!id) return;

    const connectAndSubscribe = async () => {
      try {
        socketService.connect();
        socketService.joinGame(Number(id));

        // Subscribe to a list of possible realtime events emitted by backend.
        const events = [
          "statsUpdated",
          "statRecorded",
          "playerStatChanged",
          "gameUpdated",
          "reboundRecorded",
          "offensiveReboundRecorded",
          "substitutionMade",
        ];

        const handler = async (data: any) => {
          try {
            if (!data || data.gameId === undefined || data.gameId === null) {
              // Some events may send the game id under different keys or not at all — refresh anyway
              const resp = await gameAPI.getGame(id!);
              setGameData(resp.data);
              return;
            }

            if (Number(data.gameId) === Number(id)) {
              const resp = await gameAPI.getGame(id!);
              setGameData(resp.data);
            }
          } catch (err) {
            console.error("Error refreshing game on realtime event:", err);
          }
        };

        events.forEach((ev) => socketService.onEvent(ev, handler));
      } catch (err) {
        console.error("Socket connection error:", err);
      }
    };

    connectAndSubscribe();

    return () => {
      // Unsubscribe the generic handler from known events
      [
        "statsUpdated",
        "statRecorded",
        "playerStatChanged",
        "gameUpdated",
        "reboundRecorded",
        "offensiveReboundRecorded",
        "substitutionMade",
      ].forEach((ev) => socketService.offEvent(ev));

      socketService.removeAllListeners();
      socketService.disconnect();
    };
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
        // Handle totals row
        if (record.playerId === 0) {
          return (
            <Text strong style={{ fontSize: "16px", color: "#1890ff" }}>
              TOTAL EQUIPO
            </Text>
          );
        }

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
      render: (minutos: number, record: PlayerStats) => {
        // For totals row, show the formatted minutes; for regular players, use formatPlayerMinutes
        if (record.playerId === 0) {
          // This is the totals row - minutos is already the sum of all player minutes
          return formatPlayerMinutes(minutos);
        }
        return formatPlayerMinutes(minutos);
      },
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
      title: "REB OF",
      dataIndex: "rebotesOfensivos",
      key: "rebotesOfensivos",
      width: 70,
      align: "center" as const,
      render: (value: number | undefined) => (value ?? 0),
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
      title: "FALTAS",
      dataIndex: "faltasPersonales",
      key: "faltasPersonales",
      width: 60,
      align: "center" as const,
      render: (faltas: number, record: PlayerStats) => (
        <Space direction="vertical" size={0}>
          <Text strong>{faltas}</Text>
          <Text type="secondary" style={{ fontSize: "10px" }}>
            Q1:{record.faltasQ1} Q2:{record.faltasQ2} Q3:{record.faltasQ3} Q4:{record.faltasQ4}
            {record.faltasOT > 0 && ` OT:${record.faltasOT}`}
          </Text>
        </Space>
      ),
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

  // Calculate team totals
  const calculateTeamTotals = (teamStats: PlayerStats[]) => {
    return teamStats.reduce((totals, stat) => ({
      id: -1, // Use negative ID to distinguish totals row
      gameId: gameData.id,
      playerId: 0,
      puntos: totals.puntos + stat.puntos,
      rebotes: totals.rebotes + stat.rebotes,
      rebotesOfensivos: (totals.rebotesOfensivos || 0) + (stat.rebotesOfensivos || 0),
      asistencias: totals.asistencias + stat.asistencias,
      robos: totals.robos + stat.robos,
      tapones: totals.tapones + stat.tapones,
      tirosIntentados: totals.tirosIntentados + stat.tirosIntentados,
      tirosAnotados: totals.tirosAnotados + stat.tirosAnotados,
      tiros3Intentados: totals.tiros3Intentados + stat.tiros3Intentados,
      tiros3Anotados: totals.tiros3Anotados + stat.tiros3Anotados,
      tirosLibresIntentados: totals.tirosLibresIntentados + stat.tirosLibresIntentados,
      tirosLibresAnotados: totals.tirosLibresAnotados + stat.tirosLibresAnotados,
      minutos: totals.minutos + stat.minutos,
      plusMinus: totals.plusMinus + stat.plusMinus,
      perdidas: totals.perdidas + stat.perdidas,
      faltasPersonales: totals.faltasPersonales + stat.faltasPersonales,
      faltasQ1: totals.faltasQ1 + stat.faltasQ1,
      faltasQ2: totals.faltasQ2 + stat.faltasQ2,
      faltasQ3: totals.faltasQ3 + stat.faltasQ3,
      faltasQ4: totals.faltasQ4 + stat.faltasQ4,
      faltasOT: totals.faltasOT + stat.faltasOT,
      isStarter: false,
      puntosQ1: totals.puntosQ1 + stat.puntosQ1,
      puntosQ2: totals.puntosQ2 + stat.puntosQ2,
      puntosQ3: totals.puntosQ3 + stat.puntosQ3,
      puntosQ4: totals.puntosQ4 + stat.puntosQ4,
      puntosOT: totals.puntosOT + stat.puntosOT,
    }), {
      id: -1, // Use negative ID to distinguish totals row
      gameId: gameData.id,
      playerId: 0,
      puntos: 0,
      rebotes: 0,
      rebotesOfensivos: 0,
      asistencias: 0,
      robos: 0,
      tapones: 0,
      tirosIntentados: 0,
      tirosAnotados: 0,
      tiros3Intentados: 0,
      tiros3Anotados: 0,
      tirosLibresIntentados: 0,
      tirosLibresAnotados: 0,
      minutos: 0,
      plusMinus: 0,
      perdidas: 0,
      faltasPersonales: 0,
      faltasQ1: 0,
      faltasQ2: 0,
      faltasQ3: 0,
      faltasQ4: 0,
      faltasOT: 0,
      isStarter: false,
      puntosQ1: 0,
      puntosQ2: 0,
      puntosQ3: 0,
      puntosQ4: 0,
      puntosOT: 0,
    });
  };

  // Calculate team fouls by quarter
  const calculateTeamFoulsByQuarter = (stats: PlayerStats[]) => {
    return stats.reduce(
      (totals, stat) => ({
        faltasQ1: totals.faltasQ1 + stat.faltasQ1,
        faltasQ2: totals.faltasQ2 + stat.faltasQ2,
        faltasQ3: totals.faltasQ3 + stat.faltasQ3,
        faltasQ4: totals.faltasQ4 + stat.faltasQ4,
        faltasOT: totals.faltasOT + stat.faltasOT,
        total: totals.total + stat.faltasPersonales,
      }),
      {
        faltasQ1: 0,
        faltasQ2: 0,
        faltasQ3: 0,
        faltasQ4: 0,
        faltasOT: 0,
        total: 0,
      }
    );
  };

  // Calculate team scoring by quarter
  const calculateTeamScoringByQuarter = (stats: PlayerStats[]) => {
    return stats.reduce(
      (totals, stat) => ({
        puntosQ1: totals.puntosQ1 + stat.puntosQ1,
        puntosQ2: totals.puntosQ2 + stat.puntosQ2,
        puntosQ3: totals.puntosQ3 + stat.puntosQ3,
        puntosQ4: totals.puntosQ4 + stat.puntosQ4,
        puntosOT: totals.puntosOT + stat.puntosOT,
        total: totals.total + stat.puntos,
      }),
      {
        puntosQ1: 0,
        puntosQ2: 0,
        puntosQ3: 0,
        puntosQ4: 0,
        puntosOT: 0,
        total: 0,
      }
    );
  };

  const homeTeamTotals = calculateTeamTotals(homeStats);
  const awayTeamTotals = calculateTeamTotals(awayStats);
  
  // Calculate team statistics by quarter
  const homeFoulsByQuarter = calculateTeamFoulsByQuarter(homeStats);
  const awayFoulsByQuarter = calculateTeamFoulsByQuarter(awayStats);
  const homeScoringByQuarter = calculateTeamScoringByQuarter(homeStats);
  const awayScoringByQuarter = calculateTeamScoringByQuarter(awayStats);

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
          dataSource={[...homeStats, homeTeamTotals]}
          columns={createStatsColumns()}
          pagination={false}
          size="small"
          rowKey="id"
          scroll={{ x: 800 }}
          onRow={(record) => ({
            style: record.id === -1 ? totalsRowStyle : {}
          })}
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
          dataSource={[...awayStats, awayTeamTotals]}
          columns={createStatsColumns()}
          pagination={false}
          size="small"
          rowKey="id"
          scroll={{ x: 800 }}
          onRow={(record) => ({
            style: record.id === -1 ? totalsRowAwayStyle : {}
          })}
        />
      </Card>

      {/* Team Fouls Summary */}
      <Card
        title={
          <Title level={4} style={{ margin: 0 }}>
            Faltas por Equipo
          </Title>
        }
        style={{ marginTop: 24 }}
      >
        <Row gutter={[24, 16]}>
          {/* Home Team Fouls */}
          <Col xs={24} md={12}>
            <Card 
              size="small"
              title={
                <Text strong style={{ color: "#1890ff" }}>
                  {gameData.teamHome.nombre}
                </Text>
              }
            >
              <Row gutter={16}>
                <Col span={8}>
                  <div style={{ textAlign: "center", padding: "12px 4px" }}>
                    <Title level={3} style={{ margin: 0, color: "#ff4d4f" }}>
                      {homeFoulsByQuarter.total}
                    </Title>
                    <Text strong>Total Faltas</Text>
                  </div>
                </Col>
                <Col span={16}>
                  <div style={{ padding: "8px 0" }}>
                    <Space direction="vertical" size={4} style={{ width: "100%" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <Text>Q1:</Text>
                        <Text strong>{homeFoulsByQuarter.faltasQ1}</Text>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <Text>Q2:</Text>
                        <Text strong>{homeFoulsByQuarter.faltasQ2}</Text>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <Text>Q3:</Text>
                        <Text strong>{homeFoulsByQuarter.faltasQ3}</Text>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <Text>Q4:</Text>
                        <Text strong>{homeFoulsByQuarter.faltasQ4}</Text>
                      </div>
                      {homeFoulsByQuarter.faltasOT > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <Text>OT:</Text>
                          <Text strong>{homeFoulsByQuarter.faltasOT}</Text>
                        </div>
                      )}
                    </Space>
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>

          {/* Away Team Fouls */}
          <Col xs={24} md={12}>
            <Card 
              size="small"
              title={
                <Text strong style={{ color: "#ff4d4f" }}>
                  {gameData.teamAway.nombre}
                </Text>
              }
            >
              <Row gutter={16}>
                <Col span={8}>
                  <div style={{ textAlign: "center", padding: "12px 4px" }}>
                    <Title level={3} style={{ margin: 0, color: "#ff4d4f" }}>
                      {awayFoulsByQuarter.total}
                    </Title>
                    <Text strong>Total Faltas</Text>
                  </div>
                </Col>
                <Col span={16}>
                  <div style={{ padding: "8px 0" }}>
                    <Space direction="vertical" size={4} style={{ width: "100%" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <Text>Q1:</Text>
                        <Text strong>{awayFoulsByQuarter.faltasQ1}</Text>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <Text>Q2:</Text>
                        <Text strong>{awayFoulsByQuarter.faltasQ2}</Text>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <Text>Q3:</Text>
                        <Text strong>{awayFoulsByQuarter.faltasQ3}</Text>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <Text>Q4:</Text>
                        <Text strong>{awayFoulsByQuarter.faltasQ4}</Text>
                      </div>
                      {awayFoulsByQuarter.faltasOT > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <Text>OT:</Text>
                          <Text strong>{awayFoulsByQuarter.faltasOT}</Text>
                        </div>
                      )}
                    </Space>
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* Team Scoring by Quarter */}
      <Card
        title={
          <Title level={4} style={{ margin: 0 }}>
            Puntos por Cuarto
          </Title>
        }
        style={{ marginTop: 24 }}
      >
        <Row gutter={[24, 16]}>
          {/* Home Team Scoring */}
          <Col xs={24} md={12}>
            <Card 
              size="small"
              title={
                <Text strong style={{ color: "#1890ff" }}>
                  {gameData.teamHome.nombre}
                </Text>
              }
            >
              <Row gutter={16}>
                <Col span={8}>
                  <div style={{ textAlign: "center", padding: "12px 4px" }}>
                    <Title level={3} style={{ margin: 0, color: "#52c41a" }}>
                      {homeScoringByQuarter.total}
                    </Title>
                    <Text strong>Total Puntos</Text>
                  </div>
                </Col>
                <Col span={16}>
                  <div style={{ padding: "8px 0" }}>
                    <Space direction="vertical" size={4} style={{ width: "100%" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <Text>Q1:</Text>
                        <Text strong>{homeScoringByQuarter.puntosQ1}</Text>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <Text>Q2:</Text>
                        <Text strong>{homeScoringByQuarter.puntosQ2}</Text>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <Text>Q3:</Text>
                        <Text strong>{homeScoringByQuarter.puntosQ3}</Text>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <Text>Q4:</Text>
                        <Text strong>{homeScoringByQuarter.puntosQ4}</Text>
                      </div>
                      {homeScoringByQuarter.puntosOT > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <Text>OT:</Text>
                          <Text strong>{homeScoringByQuarter.puntosOT}</Text>
                        </div>
                      )}
                    </Space>
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>

          {/* Away Team Scoring */}
          <Col xs={24} md={12}>
            <Card 
              size="small"
              title={
                <Text strong style={{ color: "#ff4d4f" }}>
                  {gameData.teamAway.nombre}
                </Text>
              }
            >
              <Row gutter={16}>
                <Col span={8}>
                  <div style={{ textAlign: "center", padding: "12px 4px" }}>
                    <Title level={3} style={{ margin: 0, color: "#52c41a" }}>
                      {awayScoringByQuarter.total}
                    </Title>
                    <Text strong>Total Puntos</Text>
                  </div>
                </Col>
                <Col span={16}>
                  <div style={{ padding: "8px 0" }}>
                    <Space direction="vertical" size={4} style={{ width: "100%" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <Text>Q1:</Text>
                        <Text strong>{awayScoringByQuarter.puntosQ1}</Text>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <Text>Q2:</Text>
                        <Text strong>{awayScoringByQuarter.puntosQ2}</Text>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <Text>Q3:</Text>
                        <Text strong>{awayScoringByQuarter.puntosQ3}</Text>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <Text>Q4:</Text>
                        <Text strong>{awayScoringByQuarter.puntosQ4}</Text>
                      </div>
                      {awayScoringByQuarter.puntosOT > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <Text>OT:</Text>
                          <Text strong>{awayScoringByQuarter.puntosOT}</Text>
                        </div>
                      )}
                    </Space>
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* Points Summary: Starters vs Bench */}
      <Card
        title={
          <Title level={4} style={{ margin: 0 }}>
            Resumen de Puntos: Quinteto vs Banca
          </Title>
        }
        style={{ marginTop: 24 }}
      >
        <Row gutter={[24, 16]}>
          {/* Home Team Points Breakdown */}
          <Col xs={24} md={12}>
            <Card 
              size="small"
              title={
                <Text strong style={{ color: "#1890ff" }}>
                  {gameData.teamHome.nombre}
                </Text>
              }
            >
              <Row gutter={16}>
                <Col span={12}>
                  <div style={{ textAlign: "center", padding: "16px 8px" }}>
                    <Title level={2} style={{ margin: 0, color: "#52c41a" }}>
                      {homeStats
                        .filter(stat => stat.isStarter)
                        .reduce((total, stat) => total + stat.puntos, 0)}
                    </Title>
                    <Text strong>Puntos del Quinteto</Text>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ textAlign: "center", padding: "16px 8px" }}>
                    <Title level={2} style={{ margin: 0, color: "#fa8c16" }}>
                      {homeStats
                        .filter(stat => !stat.isStarter)
                        .reduce((total, stat) => total + stat.puntos, 0)}
                    </Title>
                    <Text strong>Puntos de la Banca</Text>
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>

          {/* Away Team Points Breakdown */}
          <Col xs={24} md={12}>
            <Card 
              size="small"
              title={
                <Text strong style={{ color: "#ff4d4f" }}>
                  {gameData.teamAway.nombre}
                </Text>
              }
            >
              <Row gutter={16}>
                <Col span={12}>
                  <div style={{ textAlign: "center", padding: "16px 8px" }}>
                    <Title level={2} style={{ margin: 0, color: "#52c41a" }}>
                      {awayStats
                        .filter(stat => stat.isStarter)
                        .reduce((total, stat) => total + stat.puntos, 0)}
                    </Title>
                    <Text strong>Puntos del Quinteto</Text>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ textAlign: "center", padding: "16px 8px" }}>
                    <Title level={2} style={{ margin: 0, color: "#fa8c16" }}>
                      {awayStats
                        .filter(stat => !stat.isStarter)
                        .reduce((total, stat) => total + stat.puntos, 0)}
                    </Title>
                    <Text strong>Puntos de la Banca</Text>
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
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
