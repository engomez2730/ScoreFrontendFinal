import React from "react";
import { Card, Typography } from "antd";
import { UserOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";

const { Title, Text } = Typography;

const RegisterView: React.FC = () => {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <Card
        style={{
          width: "100%",
          maxWidth: 450,
          boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
          borderRadius: "12px",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Title level={2} style={{ marginBottom: 8, color: "#1890ff" }}>
            Basketball Stats
          </Title>
          <Text type="secondary">Acceso Restringido</Text>
        </div>

        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <UserOutlined
            style={{ fontSize: 64, color: "#bfbfbf", marginBottom: 16 }}
          />
          <Title level={4} style={{ color: "#595959" }}>
            Registro No Disponible
          </Title>
          <Text type="secondary" style={{ display: "block", marginBottom: 24 }}>
            El registro de nuevos usuarios está restringido a administradores
            del sistema. Para obtener acceso, contacta al administrador del
            sistema.
          </Text>

          <div style={{ textAlign: "center" }}>
            <Text type="secondary">
              ¿Ya tienes cuenta?{" "}
              <Link to="/login" style={{ fontWeight: 600 }}>
                Inicia sesión aquí
              </Link>
            </Text>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default RegisterView;
