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
  Table,
  Popconfirm,
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
      console.log("Loading teams from:", "https://quizbackendfinal-production.up.railway.app/api/teams");
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

  // Table columns definition
  const getTableColumns = () => [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
    },
    {
      title: "Nombre",
      dataIndex: "nombre",
      key: "nombre",
      render: (nombre: string, record: Team) => (
        <Space>
          <Avatar
            size="small"
            src={record.logo}
            style={{ backgroundColor: "#1890ff" }}
          >
            {nombre.charAt(0)}
          </Avatar>
          <strong>{nombre}</strong>
        </Space>
      ),
      width: 200,
    },
    {
      title: "Ciudad",
      dataIndex: "ciudad",
      key: "ciudad",
      render: (ciudad: string) => ciudad || "N/A",
      width: 150,
    },
    {
      title: "Categoría",
      dataIndex: "categoria",
      key: "categoria",
      render: (categoria: string) => categoria || "N/A",
      width: 150,
    },
    {
      title: "Jugadores",
      key: "players",
      render: (record: Team) => (
        <span>{record.players?.length || 0} jugadores</span>
      ),
      width: 120,
    },
    {
      title: "Acciones",
      key: "actions",
      render: (record: Team) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => showEditModal(record)}
          >
            Editar
          </Button>
          <Popconfirm
            title="¿Estás seguro de eliminar este equipo?"
            description="Esta acción no se puede deshacer"
            onConfirm={() => handleDelete(record.id)}
            okText="Sí"
            cancelText="No"
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              Eliminar
            </Button>
          </Popconfirm>
        </Space>
      ),
      width: 200,
      fixed: "right" as const,
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

        <Table
          columns={getTableColumns()}
          dataSource={teams}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1000 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} de ${total} equipos`,
          }}
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
