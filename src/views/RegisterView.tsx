import React, { useState } from "react";
import {
  Form,
  Input,
  Button,
  Card,
  Typography,
  Divider,
  message,
  Select,
} from "antd";
import { LockOutlined, MailOutlined, UserOutlined } from "@ant-design/icons";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import type { RegisterData } from "../api/authService";

const { Title, Text } = Typography;
const { Option } = Select;

const RegisterView: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const onFinish = async (values: RegisterData) => {
    setLoading(true);
    try {
      const success = await register(values);
      if (success) {
        message.success("¡Cuenta creada exitosamente! Bienvenido a NextPlay");
        setTimeout(() => {
          navigate("/");
        }, 1500);
      } else {
        message.error(
          "No se pudo crear la cuenta. Por favor intenta nuevamente."
        );
      }
    } catch (error: any) {
      // Handle different types of errors
      if (error?.response?.data?.message) {
        message.error(error.response.data.message);
      } else if (error?.message === "CONNECTION_ERROR") {
        message.error(
          "No se puede conectar al servidor. Verifica que el backend esté ejecutándose."
        );
      } else if (error?.response?.status === 409) {
        message.error("Este correo electrónico ya está registrado.");
      } else if (error?.response?.status === 400) {
        message.error("Datos inválidos. Por favor revisa el formulario.");
      } else {
        message.error(
          "Error al crear la cuenta. Por favor intenta nuevamente."
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
          maxWidth: 450,
          boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
          borderRadius: "12px",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Title level={2} style={{ marginBottom: 8, color: "#1890ff" }}>
            NextPlay🏀
          </Title>
          <Text type="secondary">Crea tu cuenta para comenzar</Text>
        </div>

        <Form
          form={form}
          name="register"
          onFinish={onFinish}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="nombre"
            label="Nombre Completo"
            rules={[
              {
                required: true,
                message: "Por favor ingresa tu nombre completo",
              },
              { min: 2, message: "El nombre debe tener al menos 2 caracteres" },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Juan Pérez"
              autoComplete="name"
            />
          </Form.Item>

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
              { required: true, message: "Por favor ingresa una contraseña" },
              {
                min: 6,
                message: "La contraseña debe tener al menos 6 caracteres",
              },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Confirmar Contraseña"
            dependencies={["password"]}
            rules={[
              { required: true, message: "Por favor confirma tu contraseña" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error("Las contraseñas no coinciden")
                  );
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Confirma tu contraseña"
              autoComplete="new-password"
            />
          </Form.Item>

          <Form.Item
            name="rol"
            label="Rol"
            initialValue="USER"
            rules={[{ required: true, message: "Por favor selecciona un rol" }]}
          >
            <Select placeholder="Selecciona tu rol">
              <Option value="USER">Usuario</Option>
              <Option value="SCORER">Anotador</Option>
              <Option value="REBOUNDER_ASSISTS">Rebotes y Asistencias</Option>
              <Option value="STEALS_BLOCKS">Robos y Bloqueos</Option>
              <Option value="ALL_AROUND">Completo</Option>
              <Option value="ADMIN">Administrador</Option>
            </Select>
          </Form.Item>

          <Form.Item style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              style={{ height: "48px", fontSize: "16px" }}
            >
              {loading ? "Creando cuenta..." : "Crear Cuenta"}
            </Button>
          </Form.Item>
        </Form>

        <Divider>o</Divider>

        <div style={{ textAlign: "center" }}>
          <Text type="secondary">
            ¿Ya tienes cuenta?{" "}
            <Link to="/login" style={{ fontWeight: 600 }}>
              Inicia sesión aquí
            </Link>
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default RegisterView;
