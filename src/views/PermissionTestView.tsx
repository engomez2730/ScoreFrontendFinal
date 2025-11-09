import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, Typography, Space, Tag, Alert, Button, Descriptions } from "antd";
import {
  UserOutlined,
  CrownOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined
} from "@ant-design/icons";
import { useAuth } from "../contexts/AuthContext";

const { Title, Text } = Typography;

const PermissionTestView: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const { user, hasPermission, joinGame, currentGamePermissions, leaveGame } = useAuth();
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (gameId && user) {
      testPermissions();
    }
  }, [gameId, user, currentGamePermissions]);

  const testPermissions = () => {
    const results = {
      canControlTime: hasPermission('canControlTime'),
      canMakeSubstitutions: hasPermission('canMakeSubstitutions'),
      canEditPoints: hasPermission('canEditPoints'),
      canSetStarters: hasPermission('canSetStarters'),
      canManagePermissions: hasPermission('canManagePermissions'),
    };
    setTestResults(results);
  };

  const handleJoinGame = async () => {
    if (gameId) {
      await joinGame(Number(gameId));
    }
  };

  const handleLeaveGame = async () => {
    if (gameId) {
      await leaveGame(Number(gameId));
    }
  };

  if (!user) {
    return (
      <Card style={{ margin: 24 }}>
        <Alert message="No autenticado" type="warning" />
      </Card>
    );
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'purple';
      case 'ADMIN': return 'red';
      case 'TIME_CONTROLLER': return 'orange';
      default: return 'blue';
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card>
          <Title level={2}>🔧 Test de Permisos - Juego {gameId}</Title>
          
          <Descriptions title="Información del Usuario" bordered>
            <Descriptions.Item label="Nombre">
              {user.nombre} {user.apellido}
            </Descriptions.Item>
            <Descriptions.Item label="Email">
              {user.email}
            </Descriptions.Item>
            <Descriptions.Item label="Rol">
              <Tag color={getRoleColor(user.rol)} icon={<CrownOutlined />}>
                {user.rol}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Permisos del Juego">
              {currentGamePermissions ? (
                <Tag color="green" icon={<CheckCircleOutlined />}>
                  CARGADOS
                </Tag>
              ) : (
                <Tag color="red" icon={<CloseCircleOutlined />}>
                  NO CARGADOS
                </Tag>
              )}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card>
          <Title level={3}>⚡ Acciones de Juego</Title>
          <Space>
            <Button 
              type="primary" 
              icon={<UserOutlined />} 
              onClick={handleJoinGame}
            >
              Unirse al Juego
            </Button>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={testPermissions}
            >
              Actualizar Test
            </Button>
            <Button 
              danger 
              onClick={handleLeaveGame}
            >
              Salir del Juego
            </Button>
          </Space>
        </Card>

        <Card>
          <Title level={3}>🎯 Resultados del Test de Permisos</Title>
          
          {!currentGamePermissions ? (
            <Alert
              message="Sin Permisos de Juego"
              description="Primero debes unirte al juego para obtener permisos específicos."
              type="warning"
              showIcon
            />
          ) : (
            <Space direction="vertical" style={{ width: '100%' }}>
              <Alert
                message="Permisos Cargados"
                description={`Tienes permisos específicos para este juego basados en tu rol: ${user.rol}`}
                type="success"
                showIcon
              />
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
                {Object.entries(testResults).map(([permission, hasIt]) => (
                  <div
                    key={permission}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px 16px',
                      border: `2px solid ${hasIt ? '#52c41a' : '#ff4d4f'}`,
                      borderRadius: 8,
                      backgroundColor: hasIt ? '#f6ffed' : '#fff2f0'
                    }}
                  >
                    {hasIt ? (
                      <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                    ) : (
                      <CloseCircleOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
                    )}
                    <div>
                      <div style={{ fontWeight: 'bold' }}>
                        {permission.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </div>
                      <div style={{ fontSize: 12, color: '#666' }}>
                        {permission}: {hasIt ? 'PERMITIDO' : 'DENEGADO'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Space>
          )}
        </Card>

        {/* Raw Permission Data */}
        <Card>
          <Title level={4}>📋 Datos Raw (Debug)</Title>
          <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4 }}>
            <div><strong>User Role:</strong> {user.rol}</div>
            <div><strong>Game ID:</strong> {gameId}</div>
            <div><strong>Has Permissions:</strong> {currentGamePermissions ? 'YES' : 'NO'}</div>
            {currentGamePermissions && (
              <div><strong>Permissions:</strong> {JSON.stringify(currentGamePermissions, null, 2)}</div>
            )}
          </pre>
        </Card>
      </Space>
    </div>
  );
};

export default PermissionTestView;