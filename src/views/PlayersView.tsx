import React, { useState, useEffect } from "react";
import {
  Table,
  Button,
  Form,
  Input,
  Select,
  Modal,
  Space,
  Typography,
  App,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import type { Team, Player } from "../api";
import { teamService } from "../api";
import axios from "axios";

const { Title } = Typography;

interface PlayerFormValues {
  nombre: string;
  apellido: string;
  numero: number;
  posicion: string;
  teamId: number;
}

const PlayersView: React.FC = () => {
  const { notification } = App.useApp();
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTeams();
    fetchPlayers();
  }, []);

  const fetchTeams = async () => {
    try {
      const teamsData = await teamService.getAll();
      setTeams(teamsData);
    } catch (err) {
      notification.error({
        message: "Error al cargar equipos",
        description: "No se pudieron cargar los equipos",
        icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
      });
    }
  };

  const fetchPlayers = async () => {
    setLoading(true);
    try {
      const response = await axios.get("http://localhost:4000/players");
      console.log("Fetched players:", response.data); // Debug log
      setPlayers(response.data);
    } catch (err) {
      console.error("Error fetching players:", err); // Debug log
      notification.error({
        message: "Error al cargar jugadores",
        description:
          err instanceof Error
            ? err.message
            : "No se pudieron cargar los jugadores",
        icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (values: PlayerFormValues) => {
    try {
      const playerData = {
        nombre: values.nombre,
        apellido: values.apellido,
        numero: Number(values.numero),
        posicion: values.posicion,
        teamId: Number(values.teamId),
      };

      console.log("Creating player with data:", playerData); // Debug log
      const response = await axios.post(
        "http://localhost:4000/players",
        playerData
      );
      console.log("Server response:", response.data); // Debug log

      notification.success({
        message: "Éxito",
        description: "Jugador creado correctamente",
        icon: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
      });
      setIsModalVisible(false);
      form.resetFields();
      fetchPlayers();
    } catch (err) {
      console.error("Error creating player:", err); // Debug log
      notification.error({
        message: "Error al crear jugador",
        description:
          err instanceof Error ? err.message : "No se pudo crear el jugador",
        icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
      });
    }
  };

  const handleEdit = async (values: PlayerFormValues) => {
    try {
      if (!editingPlayer) return;
      await axios.put(
        `http://localhost:4000/players/${editingPlayer.id}`,
        values
      );
      notification.success({
        message: "Éxito",
        description: "Jugador actualizado correctamente",
        icon: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
      });
      setIsModalVisible(false);
      setEditingPlayer(null);
      form.resetFields();
      fetchPlayers();
    } catch (err) {
      notification.error({
        message: "Error al actualizar jugador",
        description: "No se pudo actualizar el jugador",
        icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
      });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`http://localhost:4000/players/${id}`);
      notification.success({
        message: "Éxito",
        description: "Jugador eliminado correctamente",
        icon: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
      });
      fetchPlayers();
    } catch (err) {
      notification.error({
        message: "Error al eliminar jugador",
        description: "No se pudo eliminar el jugador",
        icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
      });
    }
  };

  const showEditModal = (player: Player) => {
    setEditingPlayer(player);
    form.setFieldsValue({
      nombre: player.nombre,
      apellido: player.apellido,
      numero: player.numero,
      posicion: player.posicion,
      teamId: player.teamId,
    });
    setIsModalVisible(true);
  };

  const columns: ColumnsType<Player> = [
    {
      title: "Nombre",
      dataIndex: "nombre",
      key: "nombre",
      sorter: (a, b) => a.nombre.localeCompare(b.nombre),
    },
    {
      title: "Apellido",
      dataIndex: "apellido",
      key: "apellido",
      sorter: (a, b) => a.apellido.localeCompare(b.apellido),
    },
    {
      title: "Número",
      dataIndex: "numero",
      key: "numero",
      sorter: (a, b) => a.numero - b.numero,
    },
    {
      title: "Posición",
      dataIndex: "posicion",
      key: "posicion",
    },
    {
      title: "Equipo",
      dataIndex: "teamId",
      key: "teamId",
      render: (teamId: number) => {
        const team = teams.find((t) => t.id === teamId);
        return team ? team.nombre : "Sin equipo";
      },
    },
    {
      title: "Acciones",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            onClick={() => showEditModal(record)}
          />
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() =>
              Modal.confirm({
                title: "¿Estás seguro de eliminar este jugador?",
                content: "Esta acción no se puede deshacer",
                okText: "Sí",
                okType: "danger",
                cancelText: "No",
                onOk: () => handleDelete(record.id),
              })
            }
          />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space direction="vertical" style={{ width: "100%" }}>
        <Space
          style={{
            marginBottom: 16,
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <Title level={2}>Jugadores</Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingPlayer(null);
              form.resetFields();
              setIsModalVisible(true);
            }}
          >
            Nuevo Jugador
          </Button>
        </Space>

        <Table
          loading={loading}
          columns={columns}
          dataSource={players}
          rowKey="id"
        />

        <Modal
          title={editingPlayer ? "Editar Jugador" : "Nuevo Jugador"}
          open={isModalVisible}
          onCancel={() => {
            setIsModalVisible(false);
            setEditingPlayer(null);
            form.resetFields();
          }}
          footer={null}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={editingPlayer ? handleEdit : handleCreate}
          >
            <Form.Item
              name="nombre"
              label="Nombre"
              rules={[
                {
                  required: true,
                  message: "Por favor ingresa el nombre",
                },
              ]}
            >
              <Input />
            </Form.Item>

            <Form.Item
              name="apellido"
              label="Apellido"
              rules={[
                {
                  required: true,
                  message: "Por favor ingresa el apellido",
                },
              ]}
            >
              <Input />
            </Form.Item>

            <Form.Item
              name="numero"
              label="Número"
              rules={[
                {
                  required: true,
                  message: "Por favor ingresa el número",
                },
                {
                  type: "number",
                  min: 0,
                  max: 99,
                  transform: (value) => Number(value),
                  message: "El número debe estar entre 0 y 99",
                },
              ]}
            >
              <Input type="number" min={0} max={99} />
            </Form.Item>

            <Form.Item
              name="posicion"
              label="Posición"
              rules={[
                {
                  required: true,
                  message: "Por favor ingresa la posición",
                },
              ]}
            >
              <Select>
                <Select.Option value="Base">Base</Select.Option>
                <Select.Option value="Escolta">Escolta</Select.Option>
                <Select.Option value="Alero">Alero</Select.Option>
                <Select.Option value="Ala-Pivot">Ala-Pivot</Select.Option>
                <Select.Option value="Pivot">Pivot</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="teamId"
              label="Equipo"
              rules={[
                {
                  required: true,
                  message: "Por favor selecciona el equipo",
                },
              ]}
            >
              <Select>
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
                  {editingPlayer ? "Actualizar" : "Crear"}
                </Button>
                <Button
                  onClick={() => {
                    setIsModalVisible(false);
                    setEditingPlayer(null);
                    form.resetFields();
                  }}
                >
                  Cancelar
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </Space>
    </div>
  );
};

export default PlayersView;
