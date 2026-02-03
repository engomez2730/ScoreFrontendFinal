import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  Card,
  Typography,
  Button,
  Switch,
  Space,
  message,
  Spin,
  Alert,
  Tag,
  Divider,
} from "antd";
import {
  UserOutlined,
  CrownOutlined,
  SettingOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import { useAuth } from "../contexts/AuthContext";
import permissionService from "../api/permissionService";
import type { UserRole, GamePermissions } from "../api/authService";
import type { GameUser } from "../api/permissionService";

const { Title, Text } = Typography;

const GamePermissionsView: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const { hasPermission } = useAuth();
  const [users, setUsers] = useState<GameUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (gameId) {
      loadGameUsers();
    }
  }, [gameId]);

  const loadGameUsers = async () => {
    try {
      setLoading(true);
      const gameUsers = await permissionService.getGameUsers(Number(gameId!));
      setUsers(gameUsers);
    } catch (error) {
      console.error("Error loading game users:", error);
      message.error("Error al cargar usuarios del juego");
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (
    userId: number,
    permission: keyof GamePermissions,
    value: boolean
  ) => {
    setUsers((prevUsers) =>
      prevUsers.map((gameUser) =>
        gameUser.user.id === userId
          ? {
              ...gameUser,
              permissions: { ...gameUser.permissions, [permission]: value },
            }
          : gameUser
      )
    );
  };

  const saveUserPermissions = async (userId: number) => {
    try {
      setSaving(true);
      const gameUser = users.find((u) => u.user.id === userId);
      if (!gameUser) return;

      await permissionService.setUserPermissions(
        Number(gameId!),
        userId,
        gameUser.permissions
      );

      message.success("Permisos actualizados correctamente");
    } catch (error) {
      console.error("Error saving permissions:", error);
      message.error("Error al guardar permisos");
      // Reload to revert changes
      loadGameUsers();
    } finally {
      setSaving(false);
    }
  };

  const getRoleIcon = (rol: UserRole) => {
    switch (rol) {
      case "SUPER_ADMIN":
        return <CrownOutlined style={{ color: "#722ed1" }} />;
      case "ADMIN":
        return <CrownOutlined style={{ color: "#f5222d" }} />;
      case "TIME_CONTROLLER":
        return <CrownOutlined style={{ color: "#fa8c16" }} />;
      default:
        return <UserOutlined style={{ color: "#1890ff" }} />;
    }
  };

  const getRoleTag = (rol: UserRole) => {
    const colors = {
      SUPER_ADMIN: "purple",
      ADMIN: "red",
      TIME_CONTROLLER: "orange",
      USER: "blue",
      SCORER: "green",
      REBOUNDER_ASSISTS: "cyan",
      STEALS_BLOCKS: "magenta",
      ALL_AROUND: "gold",
    };

    const labels = {
      SUPER_ADMIN: "Super Administrador",
      ADMIN: "Administrador",
      TIME_CONTROLLER: "Controlador de Tiempo",
      USER: "Usuario",
      SCORER: "Anotador",
      REBOUNDER_ASSISTS: "Rebotes y Asistencias",
      STEALS_BLOCKS: "Robos y Bloqueos",
      ALL_AROUND: "Todo Terreno",
    };

    return (
      <Tag color={colors[rol]} icon={getRoleIcon(rol)}>
        {labels[rol]}
      </Tag>
    );
  };

  const permissionGroups = {
    stats: {
      title: "Estadísticas",
      permissions: [
        { key: "canEditPoints", label: "Editar Puntos" },
        { key: "canEditRebounds", label: "Editar Rebotes" },
        { key: "canEditAssists", label: "Editar Asistencias" },
        { key: "canEditSteals", label: "Editar Robos" },
        { key: "canEditBlocks", label: "Editar Bloqueos" },
        { key: "canEditTurnovers", label: "Editar Pérdidas" },
        { key: "canEditShots", label: "Editar Tiros" },
        { key: "canEditFreeThrows", label: "Editar Tiros Libres" },
        { key: "canEditPersonalFouls", label: "Editar Faltas" },
      ] as Array<{ key: keyof GamePermissions; label: string }>,
    },
    control: {
      title: "Control del Juego",
      permissions: [
        { key: "canControlTime", label: "Controlar Tiempo" },
        { key: "canMakeSubstitutions", label: "Hacer Sustituciones" },
        { key: "canEndQuarter", label: "Finalizar Cuarto" },
        { key: "canSetStarters", label: "Configurar Titulares" },
      ] as Array<{ key: keyof GamePermissions; label: string }>,
    },
    admin: {
      title: "Administración",
      permissions: [
        { key: "canManagePermissions", label: "Gestionar Permisos" },
        { key: "canViewAllStats", label: "Ver Todas las Estadísticas" },
      ] as Array<{ key: keyof GamePermissions; label: string }>,
    },
  };

  if (!hasPermission("canManagePermissions")) {
    return (
      <Card style={{ margin: 24 }}>
        <Alert
          message="Acceso Denegado"
          description="No tienes permisos para gestionar permisos de usuarios."
          type="error"
          showIcon
        />
      </Card>
    );
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <Spin size="large" />
        <p style={{ marginTop: 16 }}>Cargando usuarios del juego...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <div>
            <Title level={2}>
              <SettingOutlined style={{ marginRight: 8 }} />
              Gestión de Permisos del Juego #{gameId}
            </Title>
            <Text type="secondary">
              Configura los permisos específicos para cada usuario en este
              juego.
            </Text>
          </div>

          <Divider />

          {users.length === 0 ? (
            <Alert
              message="No hay usuarios en este juego"
              description="Aún no hay usuarios unidos a este juego."
              type="info"
              showIcon
            />
          ) : (
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
              {users.map((gameUser) => (
                <Card
                  key={gameUser.user.id}
                  size="small"
                  title={
                    <Space>
                      <UserOutlined />
                      {gameUser.user.nombre} {gameUser.user.apellido}
                      <Text type="secondary">({gameUser.user.email})</Text>
                      {getRoleTag(gameUser.user.rol as UserRole)}
                    </Space>
                  }
                  extra={
                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      loading={saving}
                      onClick={() => saveUserPermissions(gameUser.user.id)}
                    >
                      Guardar
                    </Button>
                  }
                >
                  <Space
                    direction="vertical"
                    size="middle"
                    style={{ width: "100%" }}
                  >
                    {Object.entries(permissionGroups).map(
                      ([groupKey, group]) => (
                        <div key={groupKey}>
                          <Title level={5}>{group.title}</Title>
                          <Space wrap size="small">
                            {group.permissions.map((permission) => (
                              <div
                                key={permission.key}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  minWidth: 200,
                                  padding: "4px 8px",
                                  border: "1px solid #d9d9d9",
                                  borderRadius: 4,
                                  background: "#fafafa",
                                }}
                              >
                                <Switch
                                  size="small"
                                  checked={gameUser.permissions[permission.key]}
                                  onChange={(checked) =>
                                    handlePermissionChange(
                                      gameUser.user.id,
                                      permission.key,
                                      checked
                                    )
                                  }
                                  style={{ marginRight: 8 }}
                                />
                                <Text style={{ fontSize: "12px" }}>
                                  {permission.label}
                                </Text>
                              </div>
                            ))}
                          </Space>
                        </div>
                      )
                    )}
                  </Space>
                </Card>
              ))}
            </Space>
          )}
        </Space>
      </Card>
    </div>
  );
};

export default GamePermissionsView;
