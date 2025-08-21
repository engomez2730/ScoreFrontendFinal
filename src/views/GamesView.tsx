import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  List,
  Typography,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  DatePicker,
  Select,
  App,
} from "antd";
import {
  RightOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import { gameAPI, teamAPI } from "../services/apiService";
import type { Dayjs } from "dayjs";

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
      const response = await fetch("http://localhost:4000/events");
      const data = await response.json();
      setEvents(data);
    } catch (error) {
      console.error("Error loading events:", error);
      notification.error({
        message: "Error",
        description: "No se pudieron cargar los eventos",
      });
    }
  };

  useEffect(() => {
    loadGames();
    loadTeams();
    loadEvents();
  }, []);

  const getStatusTag = (status: Game["estado"]) => {
    switch (status) {
      case "en_progreso":
        return <Tag color="processing">En Progreso</Tag>;
      case "finalizado":
        return <Tag color="success">Finalizado</Tag>;
      default:
        return <Tag>Programado</Tag>;
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
      const gameData = {
        fecha: values.fecha.toISOString(),
        estado: editingGame.estado,
        eventId: values.eventId,
        teamHomeId: values.teamHomeId,
        teamAwayId: values.teamAwayId,
      };
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

  const showCreateModal = () => {
    setEditingGame(null);
    form.resetFields();
    setModalVisible(true);
  };

  const showEditModal = (game: Game) => {
    setEditingGame(game);
    form.setFieldsValue({
      ...game,
      fecha: new Date(game.fecha),
      teamHomeId: game.teamHome.id,
      teamAwayId: game.teamAway.id,
    });
    setModalVisible(true);
  };

  return (
    <div>
      <Space
        style={{
          marginBottom: 16,
          justifyContent: "space-between",
          width: "100%",
        }}
      >
        <Title level={2}>Juegos</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={showCreateModal}
        >
          Nuevo Juego
        </Button>
      </Space>

      <List
        loading={loading}
        grid={{ gutter: 16, xs: 1, sm: 2, md: 2, lg: 3, xl: 4, xxl: 4 }}
        dataSource={games}
        renderItem={(game) => (
          <List.Item>
            <Card
              actions={[
                <EditOutlined key="edit" onClick={() => showEditModal(game)} />,
                <DeleteOutlined
                  key="delete"
                  onClick={() =>
                    Modal.confirm({
                      title: "¿Estás seguro de eliminar este juego?",
                      content: "Esta acción no se puede deshacer",
                      okText: "Sí",
                      cancelText: "No",
                      onOk: () => handleDeleteGame(game.id),
                    })
                  }
                />,
                <RightOutlined
                  key="details"
                  onClick={() => navigate(`/games/${game.id}`)}
                />,
              ]}
            >
              <Space direction="vertical" style={{ width: "100%" }}>
                <Space>
                  {getStatusTag(game.estado)}
                  <Text type="secondary">
                    {new Date(game.fecha).toLocaleDateString()}
                  </Text>
                </Space>

                <Title level={4} style={{ margin: "8px 0" }}>
                  {game.teamHome.nombre} vs {game.teamAway.nombre}
                </Title>

                {game.scoreHome !== undefined && (
                  <Text strong style={{ fontSize: "18px" }}>
                    {game.scoreHome} - {game.scoreAway}
                  </Text>
                )}
              </Space>
            </Card>
          </List.Item>
        )}
      />

      <Modal
        title={editingGame ? "Editar Juego" : "Nuevo Juego"}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={editingGame ? handleUpdateGame : handleCreateGame}
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
            <Select
              placeholder="Selecciona un evento"
              options={events.map((event) => ({
                value: event.id,
                label: event.nombre,
              }))}
            />
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
                {editingGame ? "Actualizar" : "Crear"}
              </Button>
              <Button onClick={() => setModalVisible(false)}>Cancelar</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default GamesView;
