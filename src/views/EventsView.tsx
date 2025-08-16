import React, { useEffect, useState } from "react";
import { Button, Form, Input, Modal, Space, Table, message, App } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import axios from "axios";

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
      const response = await axios.get("http://localhost:4000/events");
      setEvents(response.data);
    } catch (error) {
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

      await axios.post("http://localhost:4000/events", formattedValues);
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

      await axios.put(
        `http://localhost:4000/events/${editingEvent.id}`,
        formattedValues
      );
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
      await axios.delete(`http://localhost:4000/events/${id}`);
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
      title: "Nombre",
      dataIndex: "nombre",
      key: "nombre",
    },
    {
      title: "Fecha Inicio",
      dataIndex: "fechaInicio",
      key: "fechaInicio",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: "Fecha Fin",
      dataIndex: "fechaFin",
      key: "fechaFin",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
  ];

  return (
    <div>
      <Space direction="vertical" style={{ width: "100%" }}>
        <Button
          type="primary"
          onClick={() => {
            setEditingEvent(null);
            form.resetFields();
            setIsModalOpen(true);
          }}
        >
          Crear Evento
        </Button>

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
                    icon={<EditOutlined />}
                    onClick={() => showEditModal(record)}
                  />
                  <Button
                    icon={<DeleteOutlined />}
                    danger
                    onClick={() =>
                      Modal.confirm({
                        title: "¿Estás seguro de eliminar este evento?",
                        content: "Esta acción no se puede deshacer",
                        okText: "Sí",
                        okType: "danger",
                        cancelText: "No",
                        onOk: () => handleDelete(record.id),
                      })
                    }
                  />
                </Space>
              ),
            },
          ]}
          rowKey="id"
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
