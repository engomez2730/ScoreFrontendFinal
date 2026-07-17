import React from 'react';
import type { Player } from '../../types/game.types';

interface PlayerCircleProps {
  player: Player;
  teamColor: 'home' | 'away' | 'bench';
  isMobile?: boolean;
  isSelectable?: boolean;
  isFouledOut?: boolean;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  title?: string;
}

/**
 * PlayerCircle - Componente reutilizable para mostrar un jugador
 * 
 * @param player - Datos del jugador
 * @param teamColor - 'home' (azul), 'away' (rojo), 'bench' (gris)
 * @param isMobile - Si es vista móvil (reduce tamaño)
 * @param isSelectable - Si está en modo de sustitución (borde verde)
 * @param onClick - Handler del click
 * @param title - Tooltip al hacer hover
 */
export const PlayerCircle: React.FC<PlayerCircleProps> = ({
  player,
  teamColor,
  isMobile = false,
  isSelectable = false,
  isFouledOut = false,
  onClick,
  title,
}) => {
  const size = isMobile ? 60 : 80;
  const fontSize = isMobile ? 12 : 16;

  const getBackgroundColor = (): string => {
    switch (teamColor) {
      case 'home':
        return '#1890ff'; // Azul para equipo local
      case 'away':
        return '#f5222d'; // Rojo para equipo visitante
      case 'bench':
        return '#e6f7ff'; // Gris claro para banca
      default:
        return '#fff';
    }
  };

  const getBorderStyle = (): string => {
    if (isFouledOut) {
      return '3px solid #cf1322'; // Rojo intenso: jugador descalificado
    }
    if (isSelectable) {
      return '3px solid #52c41a'; // Verde cuando es seleccionable
    }
    if (teamColor === 'bench') {
      return '1px dashed #1890ff'; // Línea punteada para banca
    }
    return '3px solid #fff'; // Blanco para jugadores en cancha
  };

  const baseStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    background: getBackgroundColor(),
    border: getBorderStyle(),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: onClick ? 'pointer' : 'default',
    margin: 8,
    opacity: isFouledOut ? 0.55 : 1,
    boxShadow: teamColor !== 'bench' ? '0 4px 12px rgba(0, 0, 0, 0.3)' : 'none',
    transition: 'all 0.3s ease',
    color: teamColor === 'bench' ? '#1890ff' : 'white',
    position: 'relative',
  };

  return (
    <div
      style={baseStyle}
      onClick={onClick}
      title={title || `${player.nombre} ${player.apellido} - #${player.numero}`}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.4)';
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow =
            teamColor !== 'bench' ? '0 4px 12px rgba(0, 0, 0, 0.3)' : 'none';
        }
      }}
    >
      <b style={{ fontSize: 18 }}>{player.numero}</b>
      <span style={{ fontSize: 10, fontWeight: 'bold' }}>
        {player.nombre.split(' ')[0]}
      </span>
      {isFouledOut && (
        <span
          style={{
            position: 'absolute',
            top: -6,
            right: -6,
            background: '#cf1322',
            color: 'white',
            borderRadius: '50%',
            width: 22,
            height: 22,
            fontSize: 10,
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid white',
          }}
        >
          5F
        </span>
      )}
    </div>
  );
};

export default PlayerCircle;
