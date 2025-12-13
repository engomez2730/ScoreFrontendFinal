import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Typography,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  DatePicker,
  Select,
  App,
  Steps,
  Row,
  Col,
  Table,
  Popconfirm,
  List,
} from "antd";
import {
  RightOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  BarChartOutlined,
} from "@ant-design/icons";
import { gameAPI, teamAPI, eventAPI } from "../services/apiService";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";

interface GameType {
  id: number;
  teamHomeId: number;
  teamAwayId: number;
  eventId: number;
  fecha: string;
  estado: string;
}

const { Title, Text } = Typography;

interface Team {
  id: number;
  nombre: string;
  players?: Player[];
}

interface Player {
  id: number;
  nombre: string;
  apellido: string;
  numero: number;
  posicion: string;
  teamId: number;
}

interface Event {
  id: number;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
}

interface Game extends Omit<GameType, "teamHomeId" | "teamAwayId" | "eventId"> {
  teamHome: Team;
  teamAway: Team;
  scoreHome?: number;
  scoreAway?: number;
  event?: Event;
}

interface GameFormValues {
  fecha: Dayjs;
  teamHomeId: number;
  teamAwayId: number;
  eventId: number;
  estado: string;
}

interface GameUpdateData {
  eventId: number;
  teamHomeId: number;
  teamAwayId: number;
  fecha: string;
  estado: string;
}

const GamesView: React.FC = () => {
  const { notification } = App.useApp();
  const [games, setGames] = useState<Game[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  // Multi-step game creation state
  const [createGameStep, setCreateGameStep] = useState(0);
  const [gameFormData, setGameFormData] = useState<any>(null);
  const [selectedTeams, setSelectedTeams] = useState<{
    home: Team | null;
    away: Team | null;
  }>({ home: null, away: null });
  const [selectedPlayers, setSelectedPlayers] = useState<{
    home: number[];
    away: number[];
  }>({ home: [], away: [] });

  const loadGames = async () => {
    setLoading(true);
    try {
      console.log("Loading games from:", "http://localhost:4000/api/games");
      const response = await gameAPI.getGames();
      console.log("Games response:", response);
      setGames(response.data);
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Error loading games:", error);
      notification.error({
        message: "Error al Cargar Juegos",
        description:
          error.message ||
          "No se pudieron cargar los juegos. Por favor, intente nuevamente.",
        icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTeams = async () => {
    try {
      console.log("Loading teams from:", "http://localhost:4000/api/teams");
      const response = await teamAPI.getTeams();
      console.log("Teams response:", response);
      setTeams(response.data);
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Error loading teams:", error);
      notification.error({
        message: "Error al Cargar Equipos",
        description:
          error.message ||
          "No se pudieron cargar los equipos. Por favor, intente nuevamente.",
        icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
      });
      console.error("Error loading teams:", error);
    }
  };

  const loadEvents = async () => {
    try {
      console.log("Loading events...");
      const response = await eventAPI.getEvents();
      console.log("Events response:", response);
      setEvents(response.data);
      console.log("Events loaded:", response.data);
    } catch (error) {
      console.error("Error loading events:", error);
      notification.error({
        message: "Error al Cargar Eventos",
        description:
          "No se pudieron cargar los eventos. Por favor, intente nuevamente.",
        icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
      });
    }
  };

  useEffect(() => {
    loadGames();
    loadTeams();
    loadEvents();
  }, []);

  // Table columns definition
  const getTableColumns = () => [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
    },
    {
      title: "Fecha",
      dataIndex: "fecha",
      key: "fecha",
      render: (fecha: string) => new Date(fecha).toLocaleDateString(),
      width: 120,
    },
    {
      title: "Estado",
      dataIndex: "estado",
      key: "estado",
      render: (estado: string) => getStatusTag(estado),
      width: 120,
    },
    {
      title: "Equipos",
      key: "teams",
      render: (record: Game) => (
        <div>
          <div>
            <strong>{record.teamHome?.nombre || "N/A"}</strong>
          </div>
          <div style={{ color: "#666" }}>vs</div>
          <div>
            <strong>{record.teamAway?.nombre || "N/A"}</strong>
          </div>
        </div>
      ),
      width: 200,
    },
    {
      title: "Marcador",
      key: "score",
      render: (record: Game) =>
        record.scoreHome !== undefined ? (
          <Text strong style={{ fontSize: "16px" }}>
            {record.scoreHome} - {record.scoreAway}
          </Text>
        ) : (
          <Text type="secondary">--</Text>
        ),
      width: 100,
    },
    {
      title: "Evento",
      key: "event",
      render: (record: Game) => record.event?.nombre || "Sin evento",
      width: 150,
    },
    {
      title: "Acciones",
      key: "actions",
      render: (record: Game) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/games/${record.id}`)}
          >
            Ver Detalles
          </Button>
          <Button
            size="small"
            icon={<BarChartOutlined />}
            onClick={() => navigate(`/games/${record.id}/stats`)}
          >
            Estadísticas
          </Button>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => showEditModal(record)}
          >
            Editar
          </Button>
          <Popconfirm
            title="¿Estás seguro de eliminar este juego?"
            description="Esta acción no se puede deshacer"
            onConfirm={() => handleDeleteGame(record.id)}
            okText="Sí"
            cancelText="No"
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              Eliminar
            </Button>
          </Popconfirm>
        </Space>
      ),
      width: 400,
      fixed: "right" as const,
    },
  ];

  const getStatusTag = (estado: string) => {
    switch (estado) {
      case "en_progreso":
      case "in_progress":
        return <Tag color="processing">En Progreso</Tag>;
      case "finalizado":
      case "finished":
        return <Tag color="success">Finalizado</Tag>;
      case "programado":
      case "scheduled":
        return <Tag color="default">Programado</Tag>;
      default:
        return <Tag>{estado}</Tag>;
    }
  };

  interface GameFormValues {
    fecha: Dayjs;
    teamHomeId: number;
    teamAwayId: number;
    eventId: number;
  }

  const handleCreateGame = async (values: GameFormValues) => {
    try {
      const gameData = {
        fecha: values.fecha.toISOString(),
        estado: "programado" as GameType["estado"],
        eventId: values.eventId,
        teamHomeId: values.teamHomeId,
        teamAwayId: values.teamAwayId,
      };
      await gameAPI.createGame(gameData);
      notification.success({
        message: "Juego Creado",
        description: "El juego ha sido creado exitosamente.",
        icon: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
      });
      form.resetFields();
      setModalVisible(false);
      loadGames();
    } catch (err: unknown) {
      const error = err as Error;
      notification.error({
        message: "Error al Crear Juego",
        description:
          error.message ||
          "No se pudo crear el juego. Por favor, intente nuevamente.",
        icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
      });
      console.error("Error creating game:", error);
    }
  };

  const handleUpdateGame = async (values: GameFormValues) => {
    if (!editingGame?.id) return;
    try {
      const gameData: GameUpdateData = {
        eventId: values.eventId,
        teamHomeId: values.teamHomeId,
        teamAwayId: values.teamAwayId,
        fecha: values.fecha.toISOString(),
        estado: (values as any).estado, // Type assertion for estado field
      };

      console.log("Updating game with data:", gameData);
      await gameAPI.updateGame(editingGame.id, gameData);

      notification.success({
        message: "Juego Actualizado",
        description: "El juego ha sido actualizado exitosamente.",
        icon: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
      });
      form.resetFields();
      setModalVisible(false);
      setEditingGame(null);
      loadGames();
    } catch (err: unknown) {
      const error = err as Error;
      notification.error({
        message: "Error al Actualizar Juego",
        description:
          error.message ||
          "No se pudo actualizar el juego. Por favor, intente nuevamente.",
        icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
      });
      console.error("Error updating game:", error);
      console.error("Full error:", err);
    }
  };

  const handleDeleteGame = async (gameId: number | undefined) => {
    if (!gameId) return;
    try {
      await gameAPI.deleteGame(gameId);
      notification.success({
        message: "Juego Eliminado",
        description: "El juego ha sido eliminado exitosamente.",
        icon: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
      });
      loadGames();
    } catch (err: unknown) {
      const error = err as Error;
      notification.error({
        message: "Error al Eliminar Juego",
        description:
          error.message ||
          "No se pudo eliminar el juego. Por favor, intente nuevamente.",
        icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
      });
      console.error("Error deleting game:", error);
      console.error(err);
    }
  };

  // Multi-step game creation functions
  const handleGameFormSubmit = async (values: any) => {
    setGameFormData(values);

    // Load the selected teams with their players
    const [homeTeam, awayTeam] = await Promise.all([
      teamAPI.getTeam(values.teamHomeId),
      teamAPI.getTeam(values.teamAwayId),
    ]);

    setSelectedTeams({
      home: homeTeam.data,
      away: awayTeam.data,
    });

    // Reset selected players
    setSelectedPlayers({ home: [], away: [] });

    // Move to next step
    setCreateGameStep(1);
  };

  const handleLineupComplete = async () => {
    if (
      !gameFormData ||
      selectedPlayers.home.length !== 5 ||
      selectedPlayers.away.length !== 5
    ) {
      notification.error({
        message: "Error",
        description:
          "Debes seleccionar exactamente 5 jugadores para cada equipo.",
      });
      return;
    }

    try {
      // Create the game
      const gameData = {
        fecha: gameFormData.fecha.toISOString(),
        estado: "scheduled" as GameType["estado"],
        eventId: gameFormData.eventId,
        teamHomeId: gameFormData.teamHomeId,
        teamAwayId: gameFormData.teamAwayId,
        startingLineup: {
          home: selectedPlayers.home,
          away: selectedPlayers.away,
        },
      };

      await gameAPI.createGame(gameData);

      notification.success({
        message: "Juego Creado",
        description:
          "El juego ha sido creado exitosamente con los quintetos iniciales.",
        icon: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
      });

      // Reset everything
      form.resetFields();
      setModalVisible(false);
      setCreateGameStep(0);
      setGameFormData(null);
      setSelectedTeams({ home: null, away: null });
      setSelectedPlayers({ home: [], away: [] });
      loadGames();
    } catch (err: unknown) {
      const error = err as Error;
      notification.error({
        message: "Error al Crear Juego",
        description:
          error.message ||
          "No se pudo crear el juego. Por favor, intente nuevamente.",
        icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
      });
      console.error("Error creating game:", error);
    }
  };

  const resetGameCreation = () => {
    setCreateGameStep(0);
    setGameFormData(null);
    setSelectedTeams({ home: null, away: null });
    setSelectedPlayers({ home: [], away: [] });
    form.resetFields();
  };

  const showCreateModal = () => {
    setEditingGame(null);
    resetGameCreation();
    setModalVisible(true);
  };

  const showEditModal = (game: Game) => {
    setEditingGame(game);
    form.setFieldsValue({
      eventId: game.event?.id,
      fecha: dayjs(game.fecha),
      teamHomeId: game.teamHome.id,
      teamAwayId: game.teamAway.id,
      estado: game.estado,
    });
    setModalVisible(true);
  };

  return (
    <div style={{ padding: "0 16px" }}>
      <div
        style={{
          marginBottom: 16,
          display: "flex",
          flexDirection: window.innerWidth < 768 ? "column" : "row",
          justifyContent: "space-between",
          alignItems: window.innerWidth < 768 ? "stretch" : "center",
          gap: 12,
        }}
      >
        <Title level={2} style={{ margin: 0 }}>
          Juegos
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={showCreateModal}
          block={window.innerWidth < 768}
        >
          Nuevo Juego
        </Button>
      </div>

      {/* Mobile View - Card Layout */}
      {window.innerWidth < 768 ? (
        <List
          loading={loading}
          dataSource={games}
          renderItem={(game: Game) => (
            <List.Item style={{ padding: 0, marginBottom: 16, border: "none" }}>
              <div
                style={{
                  width: "100%",
                  border: "1px solid #f0f0f0",
                  borderRadius: 8,
                  padding: 16,
                  backgroundColor: "#fff",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    #{game.id} - {new Date(game.fecha).toLocaleDateString()}
                  </Text>
                  {getStatusTag(game.estado)}
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      marginBottom: 4,
                    }}
                  >
                    {game.teamHome?.nombre || "N/A"}
                  </div>
                  <div style={{ textAlign: "center", margin: "8px 0" }}>
                    {game.scoreHome !== undefined ? (
                      <Text
                        strong
                        style={{ fontSize: 20, color: "#1890ff" }}
                      >
                        {game.scoreHome} - {game.scoreAway}
                      </Text>
                    ) : (
                      <Text type="secondary">vs</Text>
                    )}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>
                    {game.teamAway?.nombre || "N/A"}
                  </div>
                </div>

                {game.event && (
                  <div style={{ marginBottom: 12 }}>
                    <Tag color="blue">{game.event.nombre}</Tag>
                  </div>
                )}

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                  }}
                >
                  <Button
                    type="primary"
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => navigate(`/games/${game.id}`)}
                    block
                  >
                    Detalles
                  </Button>
                  <Button
                    size="small"
                    icon={<BarChartOutlined />}
                    onClick={() => navigate(`/games/${game.id}/stats`)}
                    block
                  >
                    Stats
                  </Button>
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => showEditModal(game)}
                    block
                  >
                    Editar
                  </Button>
                  <Popconfirm
                    title="¿Eliminar juego?"
                    description="No se puede deshacer"
                    onConfirm={() => handleDeleteGame(game.id)}
                    okText="Sí"
                    cancelText="No"
                  >
                    <Button size="small" danger icon={<DeleteOutlined />} block>
                      Eliminar
                    </Button>
                  </Popconfirm>
                </div>
              </div>
            </List.Item>
          )}
          pagination={{
            pageSize: 10,
            showSizeChanger: false,
            simple: true,
          }}
        />
      ) : (
        /* Desktop View - Table Layout */
        <Table
          columns={getTableColumns()}
          dataSource={games}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1200 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} de ${total} juegos`,
          }}
        />
      )}

      <Modal
        title={editingGame ? "Editar Juego" : "Nuevo Juego"}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          if (!editingGame) {
            resetGameCreation();
          }
        }}
        footer={null}
        width={window.innerWidth < 768 ? "100%" : editingGame ? 600 : 900}
        style={window.innerWidth < 768 ? { top: 20, maxWidth: "calc(100vw - 32px)" } : {}}
        bodyStyle={window.innerWidth < 768 ? { padding: "16px" } : {}}
      >
        {editingGame ? (
          // Editing existing game - show simple form
          <Form form={form} layout="vertical" onFinish={handleUpdateGame}>
            <Form.Item
              name="eventId"
              label="Evento"
              rules={[
                { required: true, message: "Por favor selecciona el evento" },
              ]}
            >
              <Select placeholder="Selecciona un evento">
                {events.map((event) => (
                  <Select.Option key={event.id} value={event.id}>
                    {event.nombre} (
                    {new Date(event.fechaInicio).toLocaleDateString()} -{" "}
                    {new Date(event.fechaFin).toLocaleDateString()})
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="fecha"
              label="Fecha y Hora"
              rules={[
                {
                  required: true,
                  message: "Por favor selecciona la fecha y hora",
                },
              ]}
            >
              <DatePicker
                showTime
                format="YYYY-MM-DD HH:mm"
                style={{ width: "100%" }}
              />
            </Form.Item>

            <Form.Item
              name="teamHomeId"
              label="Equipo Local"
              rules={[
                {
                  required: true,
                  message: "Por favor selecciona el equipo local",
                },
              ]}
            >
              <Select placeholder="Selecciona el equipo local">
                {teams.map((team) => (
                  <Select.Option key={team.id} value={team.id}>
                    {team.nombre}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="teamAwayId"
              label="Equipo Visitante"
              rules={[
                {
                  required: true,
                  message: "Por favor selecciona el equipo visitante",
                },
              ]}
            >
              <Select placeholder="Selecciona el equipo visitante">
                {teams.map((team) => (
                  <Select.Option key={team.id} value={team.id}>
                    {team.nombre}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="estado"
              label="Estado del Juego"
              rules={[
                { required: true, message: "Por favor selecciona el estado" },
              ]}
            >
              <Select placeholder="Selecciona el estado">
                <Select.Option value="scheduled">Programado</Select.Option>
                <Select.Option value="in_progress">En Progreso</Select.Option>
                <Select.Option value="finished">Finalizado</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  Actualizar
                </Button>
                <Button onClick={() => setModalVisible(false)}>Cancelar</Button>
              </Space>
            </Form.Item>
          </Form>
        ) : (
          // Creating new game - show multi-step interface
          <div>
            <Steps current={createGameStep} style={{ marginBottom: 24 }}>
              <Steps.Step
                title="Información del Juego"
                description="Equipos, fecha y evento"
              />
              <Steps.Step
                title="Quintetos Iniciales"
                description="Seleccionar 5 jugadores por equipo"
              />
            </Steps>

            {createGameStep === 0 && (
              <Form
                form={form}
                layout="vertical"
                onFinish={handleGameFormSubmit}
              >
                <Form.Item
                  name="eventId"
                  label="Evento"
                  rules={[
                    {
                      required: true,
                      message: "Por favor selecciona el evento",
                    },
                  ]}
                >
                  <Select placeholder="Selecciona un evento">
                    {events.map((event) => (
                      <Select.Option key={event.id} value={event.id}>
                        {event.nombre} (
                        {new Date(event.fechaInicio).toLocaleDateString()} -{" "}
                        {new Date(event.fechaFin).toLocaleDateString()})
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item
                  name="fecha"
                  label="Fecha y Hora"
                  rules={[
                    {
                      required: true,
                      message: "Por favor selecciona la fecha y hora",
                    },
                  ]}
                >
                  <DatePicker
                    showTime
                    format="YYYY-MM-DD HH:mm"
                    style={{ width: "100%" }}
                  />
                </Form.Item>

                <Form.Item
                  name="teamHomeId"
                  label="Equipo Local"
                  rules={[
                    {
                      required: true,
                      message: "Por favor selecciona el equipo local",
                    },
                  ]}
                >
                  <Select placeholder="Selecciona el equipo local">
                    {teams.map((team) => (
                      <Select.Option key={team.id} value={team.id}>
                        {team.nombre}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item
                  name="teamAwayId"
                  label="Equipo Visitante"
                  rules={[
                    {
                      required: true,
                      message: "Por favor selecciona el equipo visitante",
                    },
                  ]}
                >
                  <Select placeholder="Selecciona el equipo visitante">
                    {teams.map((team) => (
                      <Select.Option key={team.id} value={team.id}>
                        {team.nombre}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item>
                  <Space>
                    <Button type="primary" htmlType="submit">
                      Siguiente: Seleccionar Quintetos
                    </Button>
                    <Button onClick={() => setModalVisible(false)}>
                      Cancelar
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            )}

            {createGameStep === 1 &&
              selectedTeams.home &&
              selectedTeams.away && (
                <div>
                  <Title level={4}>Seleccionar Quintetos Iniciales</Title>
                  <Text
                    type="secondary"
                    style={{ display: "block", marginBottom: 16 }}
                  >
                    Selecciona 5 jugadores para cada equipo. Haz clic en los
                    jugadores para agregarlos al quinteto inicial.
                  </Text>

                  <Row gutter={[16, 16]}>
                    <Col xs={24} md={12}>
                      <div style={{ marginBottom: 16 }}>
                        <Title level={5}>
                          {selectedTeams.home.nombre} (Local)
                        </Title>
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
                        dataSource={selectedTeams.home.players || []}
                        renderItem={(player: Player) => (
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
                              const isSelected = selectedPlayers.home.includes(
                                player.id
                              );
                              if (isSelected) {
                                setSelectedPlayers((prev) => ({
                                  ...prev,
                                  home: prev.home.filter(
                                    (id) => id !== player.id
                                  ),
                                }));
                              } else if (selectedPlayers.home.length < 5) {
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
                    <Col xs={24} md={12}>
                      <div style={{ marginBottom: 16 }}>
                        <Title level={5}>
                          {selectedTeams.away.nombre} (Visitante)
                        </Title>
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
                        dataSource={selectedTeams.away.players || []}
                        renderItem={(player: Player) => (
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
                              const isSelected = selectedPlayers.away.includes(
                                player.id
                              );
                              if (isSelected) {
                                setSelectedPlayers((prev) => ({
                                  ...prev,
                                  away: prev.away.filter(
                                    (id) => id !== player.id
                                  ),
                                }));
                              } else if (selectedPlayers.away.length < 5) {
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

                  <div style={{ marginTop: 24 }}>
                    <Space
                      style={{
                        width: "100%",
                        justifyContent: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <Button onClick={() => setCreateGameStep(0)}>
                        Atrás
                      </Button>
                      <Button
                        type="primary"
                        disabled={
                          selectedPlayers.home.length !== 5 ||
                          selectedPlayers.away.length !== 5
                        }
                        onClick={handleLineupComplete}
                      >
                        Crear Juego
                      </Button>
                      <Button onClick={() => setModalVisible(false)}>
                        Cancelar
                      </Button>
                    </Space>
                  </div>
                </div>
              )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default GamesView;
