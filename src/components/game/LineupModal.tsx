import React from 'react';
import { Modal, Button, Row, Col, List, Space, Tag, Typography } from 'antd';
import type { Team, Player } from '../../types/game.types';

const { Title } = Typography;

interface LineupModalProps {
  visible: boolean;
  homeTeam: Team | null;
  awayTeam: Team | null;
  selectedPlayers: {
    home: number[];
    away: number[];
  };
  onTogglePlayer: (playerId: number, team: 'home' | 'away') => void;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * LineupModal - Modal para configurar quintetos iniciales
 * 
 * Muestra:
 * - Vista de confirmación cuando 5 jugadores por equipo están seleccionados
 * - Vista de selección para elegir jugadores
 * - Indicador de progreso (X/5 jugadores)
 */
export const LineupModal: React.FC<LineupModalProps> = ({
  visible,
  homeTeam,
  awayTeam,
  selectedPlayers,
  onTogglePlayer,
  onConfirm,
  onCancel,
}) => {
  const isComplete =
    selectedPlayers.home.length === 5 && selectedPlayers.away.length === 5;

  if (!homeTeam || !awayTeam) {
    return (
      <Modal
        title="Iniciar Juego"
        open={visible}
        onCancel={onCancel}
        footer={null}
        width={800}
      >
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Title level={4}>Cargando datos de los equipos...</Title>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title="Iniciar Juego"
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancelar
        </Button>,
        <Button
          key="start"
          type="primary"
          disabled={!isComplete}
          onClick={onConfirm}
        >
          Iniciar Juego
        </Button>,
      ]}
      width={800}
    >
      {isComplete ? (
        // Confirmation view
        <>
          <Title level={4}>Quintetos Iniciales</Title>
          <Row gutter={24}>
            <Col span={12}>
              <Title level={5}>{homeTeam.nombre}</Title>
              <List
                dataSource={homeTeam.players.filter((p) =>
                  selectedPlayers.home.includes(p.id)
                )}
                renderItem={(player) => (
                  <List.Item>
                    <Space>
                      <span style={{ fontWeight: 'bold' }}>{player.numero}</span>
                      {player.nombre} {player.apellido}
                      <Tag color="blue">{player.posicion}</Tag>
                    </Space>
                  </List.Item>
                )}
              />
            </Col>
            <Col span={12}>
              <Title level={5}>{awayTeam.nombre}</Title>
              <List
                dataSource={awayTeam.players.filter((p) =>
                  selectedPlayers.away.includes(p.id)
                )}
                renderItem={(player) => (
                  <List.Item>
                    <Space>
                      <span style={{ fontWeight: 'bold' }}>{player.numero}</span>
                      {player.nombre} {player.apellido}
                      <Tag color="red">{player.posicion}</Tag>
                    </Space>
                  </List.Item>
                )}
              />
            </Col>
          </Row>
        </>
      ) : (
        // Selection view
        <>
          <Title level={4}>Seleccionar Quintetos Iniciales</Title>
          <div
            style={{
              marginBottom: 16,
              padding: 8,
              background: '#f0f0f0',
              borderRadius: 4,
            }}
          >
            <Space>
              <Tag color={selectedPlayers.home.length === 5 ? 'success' : 'default'}>
                {homeTeam.nombre}: {selectedPlayers.home.length}/5
              </Tag>
              <Tag color={selectedPlayers.away.length === 5 ? 'success' : 'default'}>
                {awayTeam.nombre}: {selectedPlayers.away.length}/5
              </Tag>
            </Space>
          </div>

          <Row gutter={24}>
            <Col span={12}>
              <Title level={5}>{homeTeam.nombre}</Title>
              <List
                dataSource={homeTeam.players}
                renderItem={(player) => {
                  const isSelected = selectedPlayers.home.includes(player.id);
                  return (
                    <List.Item
                      style={{
                        cursor: 'pointer',
                        background: isSelected ? '#e6f7ff' : 'transparent',
                        padding: '8px 12px',
                        borderRadius: 4,
                      }}
                      onClick={() => onTogglePlayer(player.id, 'home')}
                    >
                      <Space>
                        <span style={{ fontWeight: 'bold' }}>{player.numero}</span>
                        {player.nombre} {player.apellido}
                        <Tag color="blue">{player.posicion}</Tag>
                        {isSelected && <Tag color="success">✓</Tag>}
                      </Space>
                    </List.Item>
                  );
                }}
              />
            </Col>
            <Col span={12}>
              <Title level={5}>{awayTeam.nombre}</Title>
              <List
                dataSource={awayTeam.players}
                renderItem={(player) => {
                  const isSelected = selectedPlayers.away.includes(player.id);
                  return (
                    <List.Item
                      style={{
                        cursor: 'pointer',
                        background: isSelected ? '#fff1f0' : 'transparent',
                        padding: '8px 12px',
                        borderRadius: 4,
                      }}
                      onClick={() => onTogglePlayer(player.id, 'away')}
                    >
                      <Space>
                        <span style={{ fontWeight: 'bold' }}>{player.numero}</span>
                        {player.nombre} {player.apellido}
                        <Tag color="red">{player.posicion}</Tag>
                        {isSelected && <Tag color="success">✓</Tag>}
                      </Space>
                    </List.Item>
                  );
                }}
              />
            </Col>
          </Row>
        </>
      )}
    </Modal>
  );
};

export default LineupModal;
