import React, { useState, useEffect } from "react";
import {
  Card,
  Typography,
  Form,
  Input,
  Button,
  Select,
  Table,
  Space,
  message,
  Modal,
  Tag,
  Popconfirm,
  Alert,
} from "antd";
import {
  UserOutlined,
  CrownOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  LockOutlined,
  MailOutlined,
} from "@ant-design/icons";
import { useAuth } from "../contexts/AuthContext";
import api from "../api/axios";
import type { UserRole, User } from "../api/authService";

const { Title } = Typography;

interface CreateUserData {
  email: string;
  password: string;
  nombre: string;
  apellido?: string;
  rol: UserRole;
}

const UserManagementView: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form] = Form.useForm<CreateUserData>();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get("/admin/users");
      setUsers(response.data);
    } catch (error) {
      console.error("Error loading users:", error);
      message.error("Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (values: CreateUserData) => {
    try {
      const userData = {
        ...values,
        confirmPassword: values.password, // Backend expects confirmPassword
      };

      if (editingUser) {
        await api.put(`/admin/users/${editingUser.id}`, userData);
        message.success("Usuario actualizado correctamente");
      } else {
        await api.post("/admin/users", userData);
        message.success("Usuario creado correctamente");
      }

      setIsModalVisible(false);
      setEditingUser(null);
      form.resetFields();
      loadUsers();
    } catch (error: unknown) {
      console.error("Error creating/updating user:", error);
      message.error("Error al guardar usuario");
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    form.setFieldsValue({
      email: user.email,
      nombre: user.nombre,
      apellido: user.apellido || "",
      rol: user.rol,
      password: "", // Don't pre-fill password
    });
    setIsModalVisible(true);
  };

  const handleDeleteUser = async (userId: number) => {
    try {
      await api.delete(`/admin/users/${userId}`);
      message.success("Usuario eliminado correctamente");
      loadUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      message.error("Error al eliminar usuario");
    }
  };

  const getRoleIcon = (rol: UserRole) => {
    switch (rol) {
      case "ADMIN":
        return <CrownOutlined style={{ color: "#13c2c2" }} />;
      case "SCORER":
        return <CrownOutlined style={{ color: "#f5222d" }} />;
      case "REBOUNDER_ASSISTS":
        return <CrownOutlined style={{ color: "#fa8c16" }} />;
      case "STEALS_BLOCKS":
        return <CrownOutlined style={{ color: "#52c41a" }} />;
      case "ALL_AROUND":
        return <CrownOutlined style={{ color: "#722ed1" }} />;
      default:
        return <UserOutlined style={{ color: "#1890ff" }} />;
    }
  };

  const getRoleTag = (rol: UserRole) => {
    const colors: Record<UserRole, string> = {
      ADMIN: "cyan",
      SCORER: "red",
      REBOUNDER_ASSISTS: "orange",
      STEALS_BLOCKS: "green",
      ALL_AROUND: "purple",
      USER: "blue",
    };

    const labels: Record<UserRole, string> = {
      ADMIN: "Administrador",
      SCORER: "Anotador",
      REBOUNDER_ASSISTS: "Rebotes/Asistencias",
      STEALS_BLOCKS: "Robos/Bloqueos",
      ALL_AROUND: "Polivalente",
      USER: "Usuario",
    };

    return (
      <Tag color={colors[rol]} icon={getRoleIcon(rol)}>
        {labels[rol]}
      </Tag>
    );
  };

  // Check if current user is admin
  const canManageUsers = currentUser?.rol === "ADMIN";

  if (!canManageUsers) {
    return (
      <Card style={{ margin: 24 }}>
        <Alert
          message="Acceso Denegado"
          description="Solo los Administradores pueden gestionar usuarios."
          type="error"
          showIcon
        />
      </Card>
    );
  }

  const columns = [
    {
      title: "Usuario",
      key: "user",
      render: (record: User) => (
        <Space>
          <UserOutlined />
          <div>
            <div>
              {record.nombre} {record.apellido}
            </div>
            <div style={{ color: "#666", fontSize: "12px" }}>
              {record.email}
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: "Rol",
      key: "rol",
      render: (record: User) => getRoleTag(record.rol),
    },
    {
      title: "Fecha de Registro",
      key: "createdAt",
      render: (record: User) => new Date(record.createdAt).toLocaleDateString(),
    },
    {
      title: "Acciones",
      key: "actions",
      render: (record: User) => {
        const canEditUser = currentUser?.rol === "ADMIN";
        const canDeleteUser = record.id !== currentUser?.id && canEditUser;

        return (
          <Space>
            <Button
              type="primary"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditUser(record)}
              disabled={!canEditUser}
              title={
                !canEditUser
                  ? "No tienes permisos para editar este usuario"
                  : undefined
              }
            >
              Editar
            </Button>
            {canDeleteUser && (
              <Popconfirm
                title="¿Estás seguro de eliminar este usuario?"
                description="Esta acción no se puede deshacer."
                onConfirm={() => handleDeleteUser(record.id)}
                okText="Sí"
                cancelText="No"
              >
                <Button danger size="small" icon={<DeleteOutlined />}>
                  Eliminar
                </Button>
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <Title level={2}>👥 Gestión de Usuarios</Title>
              <p style={{ color: "#666" }}>
                Administra usuarios del sistema. Solo accesible para
                Administradores.
              </p>
              {currentUser?.rol === "ADMIN" && (
                <Alert
                  message="Permisos de Administrador"
                  description="Como ADMIN, puedes gestionar todos los usuarios y roles del sistema."
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              )}
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingUser(null);
                form.resetFields();
                setIsModalVisible(true);
              }}
            >
              Crear Usuario
            </Button>
          </div>

          <Table
            columns={columns}
            dataSource={users}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10 }}
          />
        </Space>
      </Card>

      <Modal
        title={editingUser ? "Editar Usuario" : "Crear Nuevo Usuario"}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingUser(null);
          form.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateUser}
          requiredMark={false}
        >
          <Form.Item
            name="email"
            label="Correo Electrónico"
            rules={[
              { required: true, message: "El correo es requerido" },
              { type: "email", message: "Formato de correo inválido" },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="correo@ejemplo.com" />
          </Form.Item>

          <Form.Item
            name="nombre"
            label="Nombre"
            rules={[
              { required: true, message: "El nombre es requerido" },
              { min: 2, message: "Mínimo 2 caracteres" },
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="Nombre" />
          </Form.Item>

          <Form.Item name="apellido" label="Apellido">
            <Input
              prefix={<UserOutlined />}
              placeholder="Apellido (opcional)"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label={
              editingUser
                ? "Nueva Contraseña (dejar vacío para mantener)"
                : "Contraseña"
            }
            rules={
              editingUser
                ? []
                : [
                    { required: true, message: "La contraseña es requerida" },
                    { min: 6, message: "Mínimo 6 caracteres" },
                  ]
            }
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Contraseña"
            />
          </Form.Item>

          <Form.Item
            name="rol"
            label="Rol del Usuario"
            rules={[{ required: true, message: "Selecciona un rol" }]}
          >
            <Select
              placeholder="Selecciona un rol"
              options={[
                {
                  value: "USER",
                  label: (
                    <Space>
                      <UserOutlined style={{ color: "#1890ff" }} />
                      Usuario - Sin permisos específicos
                    </Space>
                  ),
                },
                {
                  value: "SCORER",
                  label: (
                    <Space>
                      <CrownOutlined style={{ color: "#f5222d" }} />
                      Anotador - Puntos, tiros
                    </Space>
                  ),
                },
                {
                  value: "REBOUNDER_ASSISTS",
                  label: (
                    <Space>
                      <CrownOutlined style={{ color: "#fa8c16" }} />
                      Rebotes y Asistencias
                    </Space>
                  ),
                },
                {
                  value: "STEALS_BLOCKS",
                  label: (
                    <Space>
                      <CrownOutlined style={{ color: "#52c41a" }} />
                      Robos y Bloqueos
                    </Space>
                  ),
                },
                {
                  value: "ALL_AROUND",
                  label: (
                    <Space>
                      <CrownOutlined style={{ color: "#722ed1" }} />
                      Polivalente - Todas las estadísticas
                    </Space>
                  ),
                },
                {
                  value: "ADMIN",
                  label: (
                    <Space>
                      <CrownOutlined style={{ color: "#13c2c2" }} />
                      Administrador - Control completo
                    </Space>
                  ),
                },
              ]}
            />
          </Form.Item>

          <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
              <Button
                onClick={() => {
                  setIsModalVisible(false);
                  setEditingUser(null);
                  form.resetFields();
                }}
              >
                Cancelar
              </Button>
              <Button type="primary" htmlType="submit">
                {editingUser ? "Actualizar" : "Crear"} Usuario
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserManagementView;
