import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import {
  Layout,
  Menu,
  Typography,
  App as AntApp,
  Button,
  Space,
  Avatar,
  Dropdown,
  Drawer,
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
  MenuOutlined,
} from "@ant-design/icons";
import { useState, useEffect } from "react";
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
import { useIsMobile } from "./hooks/useIsMobile";

const { Header, Content } = Layout;
const { Title } = Typography;

const AppHeader: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const isPublicGameView = /^\/games\/\d+\/stats$/.test(location.pathname);
  const [selectedKey, setSelectedKey] = useState("1");
  const [drawerVisible, setDrawerVisible] = useState(false);
  const isMobile = useIsMobile();

  const handleLogout = async () => {
    await logout();
    setDrawerVisible(false);
  };

  const handleMenuClick = () => {
    setDrawerVisible(false);
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

  const menuItems = (
    <>
      <Menu.Item key="1" icon={<TeamOutlined />} onClick={handleMenuClick}>
        <Link to="/">Equipos</Link>
      </Menu.Item>
      <Menu.Item key="2" icon={<TrophyOutlined />} onClick={handleMenuClick}>
        <Link to="/games">Juegos</Link>
      </Menu.Item>
      <Menu.Item key="3" icon={<UserOutlined />} onClick={handleMenuClick}>
        <Link to="/players">Jugadores</Link>
      </Menu.Item>
      <Menu.Item key="4" icon={<CalendarOutlined />} onClick={handleMenuClick}>
        <Link to="/events">Eventos</Link>
      </Menu.Item>

      {/* Admin menu items - for ADMIN */}
      {user?.rol === "ADMIN" && (
        <>
          <Menu.SubMenu
            key="admin"
            icon={<CrownOutlined />}
            title="Administración"
          >
            <Menu.Item key="admin-users" icon={<SecurityScanOutlined />} onClick={handleMenuClick}>
              <Link to="/admin/users">Gestión de Usuarios</Link>
            </Menu.Item>
            <Menu.Item key="demo-roles" icon={<SettingOutlined />} onClick={handleMenuClick}>
              <Link to="/demo/roles">Demo de Roles</Link>
            </Menu.Item>
          </Menu.SubMenu>
        </>
      )}
    </>
  );

  return (
    <>
      <Header
        style={{ 
          display: "flex", 
          alignItems: "center", 
          padding: isMobile ? "0 16px" : "0 24px"
        }}
      >
        {/* Mobile menu button */}
        {isAuthenticated && isMobile && (
          <Button
            type="text"
            icon={<MenuOutlined style={{ fontSize: "20px", color: "white" }} />}
            onClick={() => setDrawerVisible(true)}
            style={{ marginRight: "12px" }}
          />
        )}

        <Title 
          level={4} 
          style={{ 
            color: "white", 
            margin: 0,
            marginRight: isMobile ? "auto" : "24px",
            fontSize: isMobile ? "16px" : "24px"
          }}
        >
          Stats Basketball
        </Title>

        {/* Desktop menu */}
        {isAuthenticated && !isMobile && (
          <Menu
            theme="dark"
            mode="horizontal"
            selectedKeys={[selectedKey]}
            onSelect={({ key }) => setSelectedKey(key)}
            style={{ flex: 1 }}
          >
            {menuItems}
          </Menu>
        )}

        {/* User menu / Login button */}
        <div style={{ marginLeft: isMobile ? 0 : "auto" }}>
          {isAuthenticated ? (
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Space style={{ cursor: "pointer", color: "white" }}>
                <Avatar icon={<UserOutlined />} size={isMobile ? "small" : "default"} />
              </Space>
            </Dropdown>
          ) : (
            // Hide login button when viewing public game pages
            !isPublicGameView && (
              <Space>
                <Button type="default" ghost icon={<LoginOutlined />} size={isMobile ? "small" : "middle"}>
                  <Link to="/login" style={{ color: "inherit" }}>
                    {!isMobile && "Iniciar Sesión"}
                  </Link>
                </Button>
              </Space>
            )
          )}
        </div>
      </Header>

      {/* Mobile drawer */}
      <Drawer
        title="Menú"
        placement="left"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        width={250}
      >
        <Menu
          mode="vertical"
          selectedKeys={[selectedKey]}
          onSelect={({ key }) => setSelectedKey(key)}
        >
          {menuItems}
        </Menu>
      </Drawer>
    </>
  );
};

const AppContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isMobile = useIsMobile();
  
  return (
    <Content 
      style={{ 
        padding: isMobile ? "0" : "24px"
      }}
    >
      {children}
    </Content>
  );
};

const App: React.FC = () => {
  return (
    <AntApp>
      <AuthProvider>
        <Router>
          <Layout style={{ minHeight: "100vh" }}>
            <AppHeader />
            <AppContent>
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
                {/* Game detail requires auth; stats is public (view-only) */}
                <Route
                  path="/games/:id"
                  element={
                    <ProtectedRoute>
                      <GameDetailView />
                    </ProtectedRoute>
                  }
                />
                <Route path="/games/:id/stats" element={<GameStatsView />} />
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
            </AppContent>
          </Layout>
        </Router>
      </AuthProvider>
    </AntApp>
  );
};

export default App;
