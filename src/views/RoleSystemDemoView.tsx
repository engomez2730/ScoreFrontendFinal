import React from "react";
import { Card, Typography, Space, Alert, Tag, Divider, List } from "antd";
import {
  UserOutlined,
  CrownOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import { useAuth } from "../contexts/AuthContext";
import type { UserRole, GamePermissions } from "../api/authService";

const { Title, Text, Paragraph } = Typography;

const RoleSystemDemoView: React.FC = () => {
  const { user, currentGamePermissions, hasPermission } = useAuth();

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
    };

    const labels = {
      SUPER_ADMIN: "Super Administrador",
      ADMIN: "Administrador",
      TIME_CONTROLLER: "Controlador de Tiempo",
      USER: "Usuario",
    };

    return (
      <Tag color={colors[rol]} icon={getRoleIcon(rol)}>
        {labels[rol]}
      </Tag>
    );
  };

  const allPermissions = [
    { key: "canEditPoints", label: "Editar Puntos", category: "Estadísticas" },
    {
      key: "canEditRebounds",
      label: "Editar Rebotes",
      category: "Estadísticas",
    },
    {
      key: "canEditAssists",
      label: "Editar Asistencias",
      category: "Estadísticas",
    },
    { key: "canEditSteals", label: "Editar Robos", category: "Estadísticas" },
    {
      key: "canEditBlocks",
      label: "Editar Bloqueos",
      category: "Estadísticas",
    },
    {
      key: "canEditTurnovers",
      label: "Editar Pérdidas",
      category: "Estadísticas",
    },
    { key: "canEditShots", label: "Editar Tiros", category: "Estadísticas" },
    {
      key: "canEditFreeThrows",
      label: "Editar Tiros Libres",
      category: "Estadísticas",
    },
    {
      key: "canEditPersonalFouls",
      label: "Editar Faltas",
      category: "Estadísticas",
    },
    {
      key: "canControlTime",
      label: "Controlar Tiempo",
      category: "Control del Juego",
    },
    {
      key: "canMakeSubstitutions",
      label: "Hacer Sustituciones",
      category: "Control del Juego",
    },
    {
      key: "canEndQuarter",
      label: "Finalizar Cuarto",
      category: "Control del Juego",
    },
    {
      key: "canSetStarters",
      label: "Configurar Titulares",
      category: "Control del Juego",
    },
    {
      key: "canManagePermissions",
      label: "Gestionar Permisos",
      category: "Administración",
    },
    {
      key: "canViewAllStats",
      label: "Ver Todas las Estadísticas",
      category: "Administración",
    },
  ] as Array<{ key: keyof GamePermissions; label: string; category: string }>;

  if (!user) {
    return (
      <Card style={{ margin: 24 }}>
        <Alert
          message="No autenticado"
          description="Debes iniciar sesión para ver esta información."
          type="warning"
          showIcon
        />
      </Card>
    );
  }

  const roleDescriptions = {
    USER: "Los usuarios regulares tienen permisos básicos y pueden ver estadísticas. Sus permisos específicos para cada juego son configurados por administradores.",
    TIME_CONTROLLER:
      "Los controladores de tiempo tienen permisos para manejar el reloj del juego y hacer sustituciones. Están diseñados para asistir durante los juegos.",
    ADMIN:
      "Los administradores tienen todos los permisos disponibles y pueden gestionar permisos de otros usuarios. Tienen control total sobre los juegos.",
    SUPER_ADMIN:
      "Los super administradores tienen control completo del sistema, incluyendo la gestión de usuarios y la administración de roles. Son los únicos que pueden crear y eliminar usuarios.",
  };

  const permissionsByCategory = allPermissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, typeof allPermissions>);

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        {/* User Info Card */}
        <Card>
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <div>
              <Title level={2}>🎯 Demo del Sistema de Roles y Permisos</Title>
              <Paragraph type="secondary">
                Esta página demuestra cómo funciona el sistema de roles y
                permisos implementado en la aplicación de Basketball Stats.
              </Paragraph>
            </div>

            <Divider />

            <div>
              <Title level={3}>👤 Tu Información de Usuario</Title>
              <Space size="large" wrap>
                <div>
                  <Text strong>Nombre:</Text>
                  <br />
                  <Text>
                    {user.nombre} {user.apellido || ""}
                  </Text>
                </div>
                <div>
                  <Text strong>Email:</Text>
                  <br />
                  <Text>{user.email}</Text>
                </div>
                <div>
                  <Text strong>Rol Global:</Text>
                  <br />
                  {getRoleTag(user.rol)}
                </div>
              </Space>
            </div>
          </Space>
        </Card>

        {/* Role Description Card */}
        <Card>
          <Title level={3}>📋 Descripción del Rol</Title>
          <Alert
            message={`Rol: ${user.rol}`}
            description={roleDescriptions[user.rol]}
            type="info"
            showIcon
            icon={getRoleIcon(user.rol)}
          />
        </Card>

        {/* Current Game Permissions Card */}
        <Card>
          <Title level={3}>🏀 Permisos del Juego Actual</Title>
          {currentGamePermissions ? (
            <div>
              <Alert
                message="Permisos de Juego Activos"
                description="Tienes permisos específicos para un juego. Estos permisos se aplican solo al juego actual."
                type="success"
                showIcon
                style={{ marginBottom: 16 }}
              />

              <Space
                direction="vertical"
                size="middle"
                style={{ width: "100%" }}
              >
                {Object.entries(permissionsByCategory).map(
                  ([category, permissions]) => (
                    <div key={category}>
                      <Title level={5}>{category}</Title>
                      <List
                        size="small"
                        dataSource={permissions}
                        renderItem={(permission) => (
                          <List.Item>
                            <Space>
                              {hasPermission(permission.key) ? (
                                <CheckCircleOutlined
                                  style={{ color: "#52c41a" }}
                                />
                              ) : (
                                <CloseCircleOutlined
                                  style={{ color: "#ff4d4f" }}
                                />
                              )}
                              <Text
                                style={{
                                  color: hasPermission(permission.key)
                                    ? "#52c41a"
                                    : "#ff4d4f",
                                }}
                              >
                                {permission.label}
                              </Text>
                            </Space>
                          </List.Item>
                        )}
                      />
                    </div>
                  )
                )}
              </Space>
            </div>
          ) : (
            <Alert
              message="Sin Permisos de Juego"
              description="No tienes permisos específicos para ningún juego actualmente. Únete a un juego para obtener permisos específicos."
              type="warning"
              showIcon
            />
          )}
        </Card>

        {/* System Explanation Card */}
        <Card>
          <Title level={3}>⚙️ Cómo Funciona el Sistema</Title>
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <div>
              <Title level={5}>🏷️ Roles Globales</Title>
              <Paragraph>
                Los usuarios tienen roles globales que determinan sus
                capacidades generales en el sistema:
              </Paragraph>
              <List
                size="small"
                dataSource={[
                  {
                    role: "USER",
                    description: "Usuario regular con permisos básicos",
                  },
                  {
                    role: "TIME_CONTROLLER",
                    description: "Puede controlar tiempo y sustituciones",
                  },
                  {
                    role: "ADMIN",
                    description: "Acceso completo y gestión de permisos",
                  },
                  {
                    role: "SUPER_ADMIN",
                    description:
                      "Control total del sistema y gestión de usuarios",
                  },
                ]}
                renderItem={(item) => (
                  <List.Item>
                    <Space>
                      {getRoleTag(item.role as UserRole)}
                      <Text>{item.description}</Text>
                    </Space>
                  </List.Item>
                )}
              />
            </div>

            <Divider />

            <div>
              <Title level={5}>🎮 Permisos de Juego</Title>
              <Paragraph>
                Además de los roles globales, cada usuario puede tener permisos
                específicos para cada juego individual. Estos permisos son
                asignados por administradores y permiten un control granular
                sobre las funcionalidades del juego.
              </Paragraph>
            </div>

            <Divider />

            <div>
              <Title level={5}>🔒 Implementación</Title>
              <Paragraph>
                El sistema utiliza JWT tokens para autenticación y mantiene los
                permisos del usuario en el contexto de React. Los componentes
                verifican permisos antes de mostrar botones o permitir acciones
                usando la función
                <Text code>hasPermission()</Text>.
              </Paragraph>
            </div>
          </Space>
        </Card>
      </Space>
    </div>
  );
};

export default RoleSystemDemoView;
