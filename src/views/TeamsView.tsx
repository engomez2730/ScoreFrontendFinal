import React, { useEffect, useState } from "react";
import {
  Card,
  List,
  Avatar,
  Typography,
  Space,
  Button,
  Modal,
  Form,
  Input,
  App,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import { teamAPI } from "../services/apiService";

interface TeamType {
  id: number;
  nombre: string;
  logo?: string;
  ciudad?: string;
  categoria?: string;
}

const { Title, Text } = Typography;

interface Player {
  id: number;
  nombre: string;
  apellido: string;
  numero: number;
  posicion: string;
}

interface Team extends TeamType {
  players: Player[];
}

interface TeamFormValues {
  nombre: string;
  ciudad: string;
  categoria: string;
}

const TeamsView: React.FC = () => {
  const { notification } = App.useApp();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [form] = Form.useForm();

  const loadTeams = async () => {
    setLoading(true);
    try {
      console.log("Loading teams from:", "http://localhost:4000/api/teams");
      const response = await teamAPI.getTeams();
      console.log("Teams response:", response);
      setTeams(response.data);
    } catch (err) {
      console.error("Error loading teams:", err);
      notification.error({
        message: "Error",
        description: "No se pudieron cargar los equipos",
        icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();
  }, []);

  const handleCreate = async (values: TeamFormValues) => {
    try {
      await teamAPI.createTeam(values);
      notification.success({
        message: "Éxito",
        description: "Equipo creado correctamente",
        icon: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
      });
      setModalVisible(false);
      form.resetFields();
      loadTeams();
    } catch (err) {
      notification.error({
        message: "Error",
        description: "No se pudo crear el equipo",
        icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
      });
    }
  };

  const handleEdit = async (values: TeamFormValues) => {
    try {
      if (!editingTeam) return;
      await teamAPI.updateTeam(editingTeam.id, values);
      notification.success({
        message: "Éxito",
        description: "Equipo actualizado correctamente",
        icon: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
      });
      setModalVisible(false);
      setEditingTeam(null);
      form.resetFields();
      loadTeams();
    } catch (err) {
      notification.error({
        message: "Error",
        description: "No se pudo actualizar el equipo",
        icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
      });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await teamAPI.deleteTeam(id);
      notification.success({
        message: "Éxito",
        description: "Equipo eliminado correctamente",
        icon: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
      });
      loadTeams();
    } catch (err) {
      notification.error({
        message: "Error",
        description: "No se pudo eliminar el equipo",
        icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
      });
    }
  };

  const showEditModal = (team: Team) => {
    setEditingTeam(team);
    form.setFieldsValue({
      nombre: team.nombre,
      ciudad: team.ciudad,
      categoria: team.categoria,
    });
    setModalVisible(true);
  };

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
          <Title level={2}>Equipos</Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingTeam(null);
              form.resetFields();
              setModalVisible(true);
            }}
          >
            Nuevo Equipo
          </Button>
        </Space>

        <List
          loading={loading}
          grid={{ gutter: 16, xs: 1, sm: 2, md: 2, lg: 3, xl: 4, xxl: 4 }}
          dataSource={teams}
          renderItem={(team) => (
            <List.Item>
              <Card
                actions={[
                  <EditOutlined
                    key="edit"
                    onClick={() => showEditModal(team)}
                  />,
                  <DeleteOutlined
                    key="delete"
                    onClick={() =>
                      Modal.confirm({
                        title: "¿Estás seguro de eliminar este equipo?",
                        content:
                          "Esta acción no se puede deshacer y eliminará también todos los jugadores asociados.",
                        okText: "Sí",
                        okType: "danger",
                        cancelText: "No",
                        onOk: () => handleDelete(team.id),
                      })
                    }
                  />,
                ]}
              >
                <Card.Meta
                  avatar={
                    <Avatar
                      style={{
                        backgroundColor: "#1890ff",
                        verticalAlign: "middle",
                      }}
                      size="large"
                    >
                      {team.nombre.charAt(0)}
                    </Avatar>
                  }
                  title={team.nombre}
                  description={
                    <Space direction="vertical">
                      <Text>Ciudad: {team.ciudad}</Text>
                      <Text>Categoría: {team.categoria}</Text>
                      <Text>
                        Jugadores: {team.players?.length || 0}{" "}
                        {team.players?.length === 1 ? "jugador" : "jugadores"}
                      </Text>
                    </Space>
                  }
                />
              </Card>
            </List.Item>
          )}
        />
      </Space>

      <Modal
        title={editingTeam ? "Editar Equipo" : "Nuevo Equipo"}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingTeam(null);
          form.resetFields();
        }}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={editingTeam ? handleEdit : handleCreate}
        >
          <Form.Item
            name="nombre"
            label="Nombre del Equipo"
            rules={[
              {
                required: true,
                message: "Por favor ingresa el nombre del equipo",
              },
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="ciudad"
            label="Ciudad"
            rules={[
              {
                required: true,
                message: "Por favor ingresa la ciudad del equipo",
              },
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="categoria"
            label="Categoría"
            rules={[
              {
                required: true,
                message: "Por favor ingresa la categoría del equipo",
              },
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingTeam ? "Actualizar" : "Crear"}
              </Button>
              <Button
                onClick={() => {
                  setModalVisible(false);
                  setEditingTeam(null);
                  form.resetFields();
                }}
              >
                Cancelar
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TeamsView;
