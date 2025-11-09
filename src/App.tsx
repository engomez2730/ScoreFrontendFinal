import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import {
  Layout,
  Menu,
  Typography,
  App as AntApp,
  Button,
  Space,
  Avatar,
  Dropdown,
} from "antd";
import type { MenuProps } from "antd";
import {
  TeamOutlined,
  TrophyOutlined,
  UserOutlined,
  CalendarOutlined,
  LogoutOutlined,
  LoginOutlined,
  SettingOutlined,
  CrownOutlined,
  SecurityScanOutlined,
} from "@ant-design/icons";
import { useState } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginView from "./views/LoginView";
import RegisterView from "./views/RegisterView";
import TeamsView from "./views/TeamsView";
import GamesView from "./views/GamesView";
import GameDetailView from "./views/GameDetailView";
import GameStatsView from "./views/GameStatsView";
import PlayersView from "./views/PlayersView";
import EventsView from "./views/EventsView";
import UserManagementView from "./views/UserManagementView";
import RoleSystemDemoView from "./views/RoleSystemDemoView";
import GamePermissionsView from "./views/GamePermissionsView";
import PermissionTestView from "./views/PermissionTestView";

const { Header, Content } = Layout;
const { Title } = Typography;

const AppHeader: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [selectedKey, setSelectedKey] = useState("1");

  const handleLogout = async () => {
    await logout();
  };

  const userMenuItems: MenuProps["items"] = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: `${user?.nombre} ${user?.apellido || ""}`.trim(),
      disabled: true,
    },
    {
      type: "divider",
    },
    // Show admin options for ADMIN role
    ...(user?.rol === "ADMIN"
      ? [
          {
            key: "role-info",
            icon: <CrownOutlined />,
            label: `Rol: Administrador`,
            disabled: true,
          },
          {
            type: "divider" as const,
          },
        ]
      : []),
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Cerrar Sesión",
      onClick: handleLogout,
    },
  ];

  return (
    <Header
      style={{ display: "flex", alignItems: "center", padding: "0 24px" }}
    >
      <Title level={4} style={{ color: "white", margin: "0 24px 0 0" }}>
        Stats Basketball
      </Title>

      {isAuthenticated && (
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[selectedKey]}
          onSelect={({ key }) => setSelectedKey(key)}
          style={{ flex: 1 }}
        >
          <Menu.Item key="1" icon={<TeamOutlined />}>
            <Link to="/">Equipos</Link>
          </Menu.Item>
          <Menu.Item key="2" icon={<TrophyOutlined />}>
            <Link to="/games">Juegos</Link>
          </Menu.Item>
          <Menu.Item key="3" icon={<UserOutlined />}>
            <Link to="/players">Jugadores</Link>
          </Menu.Item>
          <Menu.Item key="4" icon={<CalendarOutlined />}>
            <Link to="/events">Eventos</Link>
          </Menu.Item>

          {/* Admin menu items - for ADMIN */}
          {user?.rol === "ADMIN" && (
            <>
              <Menu.SubMenu
                key="admin"
                icon={<CrownOutlined />}
                title="Administración"
                style={{ marginLeft: "auto" }}
              >
                <Menu.Item key="admin-users" icon={<SecurityScanOutlined />}>
                  <Link to="/admin/users">Gestión de Usuarios</Link>
                </Menu.Item>
                <Menu.Item key="demo-roles" icon={<SettingOutlined />}>
                  <Link to="/demo/roles">Demo de Roles</Link>
                </Menu.Item>
              </Menu.SubMenu>
            </>
          )}
        </Menu>
      )}

      <div style={{ marginLeft: "auto" }}>
        {isAuthenticated ? (
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Space style={{ cursor: "pointer", color: "white" }}>
              <Avatar icon={<UserOutlined />} />
              <span>{user?.nombre}</span>
            </Space>
          </Dropdown>
        ) : (
          <Space>
            <Button type="default" ghost icon={<LoginOutlined />}>
              <Link to="/login" style={{ color: "inherit" }}>
                Iniciar Sesión
              </Link>
            </Button>
          </Space>
        )}
      </div>
    </Header>
  );
};

const App: React.FC = () => {
  return (
    <AntApp>
      <AuthProvider>
        <Router>
          <Layout style={{ minHeight: "100vh" }}>
            <AppHeader />
            <Content style={{ padding: "24px" }}>
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<LoginView />} />
                <Route path="/register" element={<RegisterView />} />

                {/* Protected routes */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <TeamsView />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/games"
                  element={
                    <ProtectedRoute>
                      <GamesView />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/games/:id"
                  element={
                    <ProtectedRoute>
                      <GameDetailView />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/games/:id/stats"
                  element={
                    <ProtectedRoute>
                      <GameStatsView />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/players"
                  element={
                    <ProtectedRoute>
                      <PlayersView />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/events"
                  element={
                    <ProtectedRoute>
                      <EventsView />
                    </ProtectedRoute>
                  }
                />

                {/* Testing routes */}
                <Route
                  path="/test/permissions/:gameId"
                  element={
                    <ProtectedRoute>
                      <PermissionTestView />
                    </ProtectedRoute>
                  }
                />

                {/* Admin routes */}
                <Route
                  path="/admin/users"
                  element={
                    <ProtectedRoute>
                      <UserManagementView />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/games/:gameId/permissions"
                  element={
                    <ProtectedRoute>
                      <GamePermissionsView />
                    </ProtectedRoute>
                  }
                />

                {/* Demo route */}
                <Route
                  path="/demo/roles"
                  element={
                    <ProtectedRoute>
                      <RoleSystemDemoView />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </Content>
          </Layout>
        </Router>
      </AuthProvider>
    </AntApp>
  );
};

export default App;
