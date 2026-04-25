import React from 'react';
import { Modal, Tabs, Button, Space, Typography, Row, Col, Statistic } from 'antd';
import type { Player } from '../../types/game.types';

const { Title } = Typography;

interface StatsModalProps {
  player: Player | null;
  visible: boolean;
  activeTab: 'shots' | 'other';
  onClose: () => void;
  onTabChange: (tab: 'shots' | 'other') => void;
  onRecordShot: (shotType: '2pt' | '3pt' | 'ft', made: boolean) => void;
  onRecordStat: (statType: 'rebound' | 'offensiveRebound' | 'assist' | 'steal' | 'block' | 'turnover' | 'foul') => void;
  // Permissions
  hasPermission: (permission: string) => boolean;
}

/**
 * StatsModal - Modal para registrar estadísticas de un jugador
 * 
 * Muestra:
 * - Tabs de "Tiros" y "Otras Estadísticas"
 * - Botones para cada tipo de estadística
 * - Estadísticas actuales del jugador
 * - Control de permisos por rol
 */
export const StatsModal: React.FC<StatsModalProps> = ({
  player,
  visible,
  activeTab,
  onClose,
  onTabChange,
  onRecordShot,
  onRecordStat,
  hasPermission,
}) => {
  if (!player) return null;

  const calculateFGPercentage = (made: number, attempted: number): number => {
    if (attempted === 0) return 0;
    return Math.round((made / attempted) * 100);
  };

  const calculate3PPercentage = (made: number, attempted: number): number => {
    if (attempted === 0) return 0;
    return Math.round((made / attempted) * 100);
  };

  const canShowShotsTab = 
    hasPermission('canEditShots') || 
    hasPermission('canEditPoints') || 
    hasPermission('canEditFreeThrows');

  const canShowOtherTab =
    hasPermission('canEditRebounds') ||
    hasPermission('canEditAssists') ||
    hasPermission('canEditSteals') ||
    hasPermission('canEditBlocks') ||
    hasPermission('canEditTurnovers') ||
    hasPermission('canEditPersonalFouls');

  return (
    <Modal
      title={`Estadísticas - ${player.nombre} ${player.apellido}`}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      <Tabs activeKey={activeTab} onChange={(key) => onTabChange(key as 'shots' | 'other')}>
        {/* Shots Tab */}
        {canShowShotsTab && (
          <Tabs.TabPane tab="Tiros" key="shots">
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              {/* 2-Point Field Goals */}
              {hasPermission('canEditShots') && (
                <div style={{ marginBottom: 24 }}>
                  <Title level={5}>Tiros de 2 Puntos</Title>
                  <Space>
                    <Button
                      type="primary"
                      size="large"
                      style={{
                        width: '120px',
                        backgroundColor: '#52c41a',
                        borderColor: '#52c41a',
                      }}
                      onClick={() => onRecordShot('2pt', true)}
                    >
                      Anotado
                    </Button>
                    <Button
                      type="primary"
                      danger
                      size="large"
                      style={{ width: '120px' }}
                      onClick={() => onRecordShot('2pt', false)}
                    >
                      Fallado
                    </Button>
                  </Space>
                </div>
              )}

              {/* 3-Point Field Goals */}
              {hasPermission('canEditShots') && (
                <div style={{ marginBottom: 24 }}>
                  <Title level={5}>Tiros de 3 Puntos</Title>
                  <Space>
                    <Button
                      type="primary"
                      size="large"
                      style={{
                        width: '120px',
                        backgroundColor: '#52c41a',
                        borderColor: '#52c41a',
                      }}
                      onClick={() => onRecordShot('3pt', true)}
                    >
                      Anotado
                    </Button>
                    <Button
                      type="primary"
                      danger
                      size="large"
                      style={{ width: '120px' }}
                      onClick={() => onRecordShot('3pt', false)}
                    >
                      Fallado
                    </Button>
                  </Space>
                </div>
              )}

              {/* Free Throws */}
              {hasPermission('canEditFreeThrows') && (
                <div>
                  <Title level={5}>Tiros Libres</Title>
                  <Space>
                    <Button
                      type="primary"
                      size="large"
                      style={{
                        width: '120px',
                        backgroundColor: '#52c41a',
                        borderColor: '#52c41a',
                      }}
                      onClick={() => onRecordShot('ft', true)}
                    >
                      Anotado
                    </Button>
                    <Button
                      type="primary"
                      danger
                      size="large"
                      style={{ width: '120px' }}
                      onClick={() => onRecordShot('ft', false)}
                    >
                      Fallado
                    </Button>
                  </Space>
                </div>
              )}
            </div>
          </Tabs.TabPane>
        )}

        {/* Other Stats Tab */}
        {canShowOtherTab && (
          <Tabs.TabPane tab="Otras Estadísticas" key="other">
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                {/* Rebounds and Assists */}
                {(hasPermission('canEditRebounds') || hasPermission('canEditAssists')) && (
                  <div>
                    <Title level={5}>Rebotes y Asistencias</Title>
                    <Space>
                      {hasPermission('canEditRebounds') && (
                        <Button
                          type="primary"
                          size="large"
                          style={{ width: '120px' }}
                          onClick={() => onRecordStat('rebound')}
                        >
                          Rebote
                        </Button>
                      )}
                      {hasPermission('canEditRebounds') && (
                        <Button
                          type="default"
                          size="large"
                          style={{ width: '160px' }}
                          onClick={() => onRecordStat('offensiveRebound')}
                        >
                          Rebote Ofensivo
                        </Button>
                      )}
                      {hasPermission('canEditAssists') && (
                        <Button
                          type="primary"
                          size="large"
                          style={{ width: '120px' }}
                          onClick={() => onRecordStat('assist')}
                        >
                          Asistencia
                        </Button>
                      )}
                    </Space>
                  </div>
                )}

                {/* Defense */}
                {(hasPermission('canEditSteals') || hasPermission('canEditBlocks')) && (
                  <div>
                    <Title level={5}>Defensa</Title>
                    <Space>
                      {hasPermission('canEditSteals') && (
                        <Button
                          type="primary"
                          size="large"
                          style={{ width: '120px' }}
                          onClick={() => onRecordStat('steal')}
                        >
                          Robo
                        </Button>
                      )}
                      {hasPermission('canEditBlocks') && (
                        <Button
                          type="primary"
                          size="large"
                          style={{ width: '120px' }}
                          onClick={() => onRecordStat('block')}
                        >
                          Tapón
                        </Button>
                      )}
                    </Space>
                  </div>
                )}

                {/* Errors */}
                {(hasPermission('canEditTurnovers') || hasPermission('canEditPersonalFouls')) && (
                  <div>
                    <Title level={5}>Errores</Title>
                    <Space>
                      {hasPermission('canEditTurnovers') && (
                        <Button
                          type="primary"
                          danger
                          size="large"
                          style={{ width: '120px' }}
                          onClick={() => onRecordStat('turnover')}
                        >
                          Pérdida
                        </Button>
                      )}
                      {hasPermission('canEditPersonalFouls') && (
                        <Button
                          type="primary"
                          size="large"
                          style={{
                            width: '120px',
                            backgroundColor: '#ff7a45',
                            borderColor: '#ff7a45',
                          }}
                          onClick={() => onRecordStat('foul')}
                        >
                          Falta Personal
                        </Button>
                      )}
                    </Space>
                  </div>
                )}

                {/* Current Stats */}
                {player.stats && (
                  <div style={{ marginTop: 24 }}>
                    <Title level={5}>Estadísticas Actuales</Title>
                    <Row gutter={[16, 16]}>
                      <Col span={6}>
                        <Statistic title="Puntos" value={player.stats.puntos} />
                      </Col>
                      <Col span={6}>
                        <Statistic title="Rebotes" value={player.stats.rebotes} />
                      </Col>
                      <Col span={6}>
                        <Statistic title="Asistencias" value={player.stats.asistencias} />
                      </Col>
                      <Col span={6}>
                        <Statistic
                          title="Minutos"
                          value={Math.floor(player.stats.minutos / 60)}
                        />
                      </Col>
                      <Col span={6}>
                        <Statistic title="Robos" value={player.stats.robos} />
                      </Col>
                      <Col span={6}>
                        <Statistic title="Tapones" value={player.stats.tapones} />
                      </Col>
                      <Col span={6}>
                        <Statistic
                          title="Faltas"
                          value={player.stats.faltasPersonales || 0}
                        />
                      </Col>
                      <Col span={6}>
                        <Statistic title="Pérdidas" value={player.stats.perdidas || 0} />
                      </Col>
                      <Col span={12}>
                        <Statistic
                          title="Tiros de Campo"
                          value={`${player.stats.tirosAnotados}/${player.stats.tirosIntentados}`}
                          suffix={`(${calculateFGPercentage(
                            player.stats.tirosAnotados,
                            player.stats.tirosIntentados
                          )}%)`}
                        />
                      </Col>
                      <Col span={12}>
                        <Statistic
                          title="Triples"
                          value={`${player.stats.tiros3Anotados}/${player.stats.tiros3Intentados}`}
                          suffix={`(${calculate3PPercentage(
                            player.stats.tiros3Anotados,
                            player.stats.tiros3Intentados
                          )}%)`}
                        />
                      </Col>
                    </Row>
                  </div>
                )}
              </Space>
            </div>
          </Tabs.TabPane>
        )}
      </Tabs>
    </Modal>
  );
};

export default StatsModal;
