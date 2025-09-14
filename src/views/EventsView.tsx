import React, { useEffect, useState } from "react";
import {
  Button,
  Form,
  Input,
  Modal,
  Space,
  Table,
  message,
  App,
  Popconfirm,
  Typography,
} from "antd";
import { EditOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { eventAPI } from "../services/apiService";

const { Title } = Typography;

interface Event {
  id: number;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
}

const EventsView: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [form] = Form.useForm();
  const { notification } = App.useApp();

  const fetchEvents = async () => {
    try {
      console.log("Loading events from:", "http://localhost:4000/api/events");
      const response = await eventAPI.getEvents();
      console.log("Events response:", response);
      setEvents(response.data);
    } catch (error) {
      console.error("Error loading events:", error);
      notification.error({
        message: "Error",
        description: "No se pudieron cargar los eventos",
      });
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  interface EventFormValues {
    nombre: string;
    fechaInicio: string;
    fechaFin: string;
  }

  const handleCreate = async (values: EventFormValues) => {
    try {
      const formattedValues = {
        ...values,
        fechaInicio: new Date(values.fechaInicio).toISOString().split("T")[0],
        fechaFin: new Date(values.fechaFin).toISOString().split("T")[0],
      };

      await eventAPI.createEvent(formattedValues);
      notification.success({
        message: "Éxito",
        description: "Evento creado correctamente",
      });
      setIsModalOpen(false);
      form.resetFields();
      fetchEvents();
    } catch (error) {
      notification.error({
        message: "Error",
        description: "No se pudo crear el evento",
      });
    }
  };

  const handleEdit = async (values: EventFormValues) => {
    try {
      if (!editingEvent) return;

      const formattedValues = {
        ...values,
        fechaInicio: new Date(values.fechaInicio).toISOString().split("T")[0],
        fechaFin: new Date(values.fechaFin).toISOString().split("T")[0],
      };

      await eventAPI.updateEvent(editingEvent.id, formattedValues);
      notification.success({
        message: "Éxito",
        description: "Evento actualizado correctamente",
      });
      setIsModalOpen(false);
      setEditingEvent(null);
      form.resetFields();
      fetchEvents();
    } catch (error) {
      notification.error({
        message: "Error",
        description: "No se pudo actualizar el evento",
      });
    }
  };

  const showEditModal = (event: Event) => {
    setEditingEvent(event);
    form.setFieldsValue({
      nombre: event.nombre,
      fechaInicio: event.fechaInicio.split("T")[0],
      fechaFin: event.fechaFin.split("T")[0],
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await eventAPI.deleteEvent(id);
      notification.success({
        message: "Éxito",
        description: "Evento eliminado correctamente",
      });
      fetchEvents();
    } catch (error) {
      notification.error({
        message: "Error",
        description: "No se pudo eliminar el evento",
      });
    }
  };

  const columns = [
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
      width: 200,
    },
    {
      title: "Fecha Inicio",
      dataIndex: "fechaInicio",
      key: "fechaInicio",
      render: (date: string) => new Date(date).toLocaleDateString(),
      width: 150,
    },
    {
      title: "Fecha Fin",
      dataIndex: "fechaFin",
      key: "fechaFin",
      render: (date: string) => new Date(date).toLocaleDateString(),
      width: 150,
    },
    {
      title: "Duración",
      key: "duration",
      render: (_: any, record: Event) => {
        const start = new Date(record.fechaInicio);
        const end = new Date(record.fechaFin);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return `${diffDays} día${diffDays > 1 ? "s" : ""}`;
      },
      width: 120,
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
          <Title level={2}>Eventos</Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingEvent(null);
              form.resetFields();
              setIsModalOpen(true);
            }}
          >
            Nuevo Evento
          </Button>
        </Space>

        <Table
          dataSource={events}
          columns={[
            ...columns,
            {
              title: "Acciones",
              key: "actions",
              render: (_, record: Event) => (
                <Space>
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => showEditModal(record)}
                  >
                    Editar
                  </Button>
                  <Popconfirm
                    title="¿Estás seguro de eliminar este evento?"
                    description="Esta acción no se puede deshacer"
                    onConfirm={() => handleDelete(record.id)}
                    okText="Sí"
                    cancelText="No"
                  >
                    <Button size="small" icon={<DeleteOutlined />} danger>
                      Eliminar
                    </Button>
                  </Popconfirm>
                </Space>
              ),
              width: 200,
              fixed: "right" as const,
            },
          ]}
          rowKey="id"
          scroll={{ x: 800 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} de ${total} eventos`,
          }}
        />

        <Modal
          title={editingEvent ? "Editar Evento" : "Crear Evento"}
          open={isModalOpen}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingEvent(null);
            form.resetFields();
          }}
          footer={null}
        >
          <Form
            form={form}
            onFinish={editingEvent ? handleEdit : handleCreate}
            layout="vertical"
          >
            <Form.Item
              name="nombre"
              label="Nombre"
              rules={[
                {
                  required: true,
                  message: "Por favor ingrese el nombre del evento",
                },
              ]}
            >
              <Input />
            </Form.Item>

            <Form.Item
              name="fechaInicio"
              label="Fecha de Inicio"
              rules={[
                {
                  required: true,
                  message: "Por favor ingrese la fecha de inicio",
                },
              ]}
            >
              <Input type="date" />
            </Form.Item>

            <Form.Item
              name="fechaFin"
              label="Fecha de Fin"
              rules={[
                {
                  required: true,
                  message: "Por favor ingrese la fecha de fin",
                },
              ]}
            >
              <Input type="date" />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  {editingEvent ? "Actualizar" : "Crear"}
                </Button>
                <Button
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingEvent(null);
                    form.resetFields();
                  }}
                >
                  Cancelar
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </Space>
    </div>
  );
};

export default EventsView;
