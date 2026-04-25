import React from 'react';
import { Button, Typography, Space } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined } from '@ant-design/icons';
import { formatTime } from '../../utils/time';
import type { UserRole } from '../../types/permissions.types';

const { Title, Text } = Typography;

interface GameClockProps {
  gameTime: number; // Tiempo en segundos
  isClockRunning: boolean;
  currentQuarter: number;
  totalQuarters: number;
  isOvertime: boolean;
  userRole?: UserRole;
  hasPermission: boolean;
  onStartTimer: () => void;
  onStopTimer: () => void;
  // Debug info (opcional)
  showDebug?: boolean;
  currentGamePermissions?: any;
}

/**
 * GameClock - Componente del reloj del juego
 * 
 * Muestra:
 * - Quarter actual (Q1, Q2, Q3, Q4, OT1, OT2, etc.)
 * - Tiempo restante formateado (MM:SS)
 * - Botón de Play/Pause
 * - Panel de debug (solo para ADMIN)
 */
export const GameClock: React.FC<GameClockProps> = ({
  gameTime,
  isClockRunning,
  currentQuarter,
  totalQuarters,
  isOvertime,
  userRole,
  hasPermission,
  onStartTimer,
  onStopTimer,
  showDebug = false,
  currentGamePermissions,
}) => {
  const getQuarterDisplay = (): string => {
    if (isOvertime) {
      const overtimeNumber = Math.floor(currentQuarter - totalQuarters + 1);
      return `OT ${overtimeNumber}`;
    }
    return `Q${currentQuarter}`;
  };

  return (
    <div style={{ textAlign: 'center' }}>
      {/* Quarter Display */}
      <Title level={4} style={{ margin: '0 0 8px 0' }}>
        {getQuarterDisplay()}
      </Title>

      {/* Clock Display */}
      <Title level={1} style={{ margin: '0 0 16px 0', fontSize: '48px' }}>
        {formatTime(gameTime)}
      </Title>

      {/* Play/Pause Button */}
      <Button
        icon={isClockRunning ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
        onClick={() => (isClockRunning ? onStopTimer() : onStartTimer())}
        size="large"
        disabled={!hasPermission}
        title={
          !hasPermission
            ? 'No tienes permisos para controlar el tiempo'
            : undefined
        }
      >
        {isClockRunning ? 'Pausar' : 'Reanudar'}
      </Button>

      {/* Debug Panel - Solo para ADMIN */}
      {showDebug && userRole === 'ADMIN' && (
        <div
          style={{
            marginTop: 16,
            padding: 8,
            background: '#f0f0f0',
            borderRadius: 4,
            fontSize: 12,
            textAlign: 'left',
          }}
        >
          <div>
            <strong>Debug Info:</strong>
          </div>
          <div>User Role: {userRole}</div>
          <div>Timer Running: {isClockRunning ? 'YES' : 'NO'}</div>
          <div>Can Add Stats: YES (allowed anytime)</div>
          <div>Can Substitute: YES (allowed anytime)</div>
          <div>Has canControlTime: {hasPermission ? 'YES' : 'NO'}</div>
          <div>
            Current Permissions:{' '}
            {currentGamePermissions ? 'LOADED' : 'NOT LOADED (using defaults)'}
          </div>
          {currentGamePermissions && (
            <div>
              canControlTime:{' '}
              {currentGamePermissions.canControlTime ? 'TRUE' : 'FALSE'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GameClock;
