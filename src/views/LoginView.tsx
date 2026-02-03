import React, { useState } from "react";
import { Form, Input, Button, Card, Typography, Divider, message, Alert } from "antd";
import { LockOutlined, MailOutlined } from "@ant-design/icons";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import type { LoginCredentials } from "../api/authService";

const { Title, Text } = Typography;

const LoginView: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const onFinish = async (values: LoginCredentials) => {
    setLoading(true);
    setLoginError(null);
    try {
      const success = await login(values);
      if (success) {
        navigate("/"); // Redirect to home page after successful login
      }
      else {
        // Invalid credentials
        setLoginError("Correo o contraseña incorrectos");
      }
    } catch (error) {
      // Only show error messages for connection issues
      if (error instanceof Error && error.message === "CONNECTION_ERROR") {
        setLoginError(
          "No se puede conectar al servidor. Verifica que el backend esté ejecutándose."
        );
      }
    } finally {
      setLoading(false);
    }
  };

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
          maxWidth: 400,
          boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
          borderRadius: "12px",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Title level={2} style={{ marginBottom: 8, color: "#1890ff" }}>
            NextPlay🏀
          </Title>
          <Text type="secondary">Inicia sesión para continuar</Text>
        </div>

        {loginError && (
          <Alert
            style={{ marginBottom: 16 }}
            message="Error al iniciar sesión"
            description={loginError}
            type="error"
            showIcon
          />
        )}

        <Form
          form={form}
          name="login"
          onFinish={onFinish}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="email"
            label="Correo Electrónico"
            rules={[
              {
                required: true,
                message: "Por favor ingresa tu correo electrónico",
              },
              { type: "email", message: "Por favor ingresa un correo válido" },
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="correo@ejemplo.com"
              autoComplete="email"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="Contraseña"
            rules={[
              { required: true, message: "Por favor ingresa tu contraseña" },
              {
                min: 6,
                message: "La contraseña debe tener al menos 6 caracteres",
              },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Tu contraseña"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              style={{ height: "48px", fontSize: "16px" }}
            >
              {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </Button>
          </Form.Item>
        </Form>

        <Divider>o</Divider>

        <div style={{ textAlign: "center" }}>
          <Text type="secondary">
            ¿No tienes cuenta?{" "}
            <Link to="/register" style={{ fontWeight: 600 }}>
              Regístrate aquí
            </Link>
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default LoginView;
