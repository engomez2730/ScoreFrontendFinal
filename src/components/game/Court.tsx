import React from 'react';
import { Typography, Tag, Button } from 'antd';
import { PlayerCircle } from './PlayerCircle';
import type { Player, Team } from '../../types/game.types';

const { Title } = Typography;

const FOUL_OUT_LIMIT = 5;
const isFouledOut = (player: Player): boolean =>
  (player.stats?.faltasPersonales || 0) >= FOUL_OUT_LIMIT;

interface SubstitutionState {
  isSelecting: boolean;
  playerOut: Player | null;
  selectedTeam: 'home' | 'away' | null;
}

interface CourtProps {
  homeTeam: Team;
  awayTeam: Team;
  isMobile?: boolean;
  isFullscreen?: boolean;
  substitutionState: SubstitutionState;
  onPlayerClick: (player: Player, team: 'home' | 'away', event: React.MouseEvent) => void;
  onCancelSubstitution: () => void;
}

/**
 * Court - Componente de la cancha de baloncesto
 * 
 * Muestra:
 * - Jugadores del equipo local (izquierda, azul)
 * - Jugadores del equipo visitante (derecha, rojo)
 * - Indicador de sustitución activa
 * - Botón para cancelar sustitución
 */
export const Court: React.FC<CourtProps> = ({
  homeTeam,
  awayTeam,
  isMobile = false,
  isFullscreen = false,
  substitutionState,
  onPlayerClick,
  onCancelSubstitution,
}) => {
  const getOnCourtPlayers = (team: Team): Player[] => {
    const onCourt = team.players.filter((p) => p.isOnCourt);
    console.log(`🏀 Court - ${team.nombre}:`, {
      totalPlayers: team.players.length,
      onCourtCount: onCourt.length,
      onCourtPlayers: onCourt.map(p => `#${p.numero} ${p.nombre} (isOnCourt: ${p.isOnCourt})`)
    });
    return onCourt;
  };

  const courtStyle: React.CSSProperties = {
    width: '100%',
    height: isFullscreen ? 'calc(100vh - 300px)' : isMobile ? '50vh' : '60vh',
    background: 'linear-gradient(90deg, #e0c68a 0%, #f7e7b6 100%)',
    border: '4px solid #b8860b',
    borderRadius: 24,
    position: 'relative',
    margin: isFullscreen ? '8px 0' : '32px 0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  };

  return (
    <div style={courtStyle}>
      {/* Home Team - Left Side */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '30%',
        }}
      >
        {getOnCourtPlayers(homeTeam).map((player) => (
          <PlayerCircle
            key={player.id}
            player={player}
            teamColor="home"
            isMobile={isMobile}
            isFouledOut={isFouledOut(player)}
            onClick={(e) => onPlayerClick(player, 'home', e)}
            title={
              isFouledOut(player)
                ? `${player.nombre} ${player.apellido} - Descalificado (5 faltas). Debe salir de la cancha.`
                : `${player.nombre} ${player.apellido} - ${player.posicion} | Click to record stats, Shift+Click to substitute`
            }
          />
        ))}
      </div>

      {/* Center - Court Label */}
      <div style={{ width: '40%', textAlign: 'center', alignSelf: 'center' }}>
        <Title level={2} style={{ color: '#b8860b', margin: 0 }}>
          CANCHA
        </Title>
        {substitutionState.isSelecting && (
          <div style={{ marginTop: 8 }}>
            <Tag color="processing">
              Selecting substitute for {substitutionState.playerOut?.nombre}
            </Tag>
            <Button
              size="small"
              danger
              onClick={onCancelSubstitution}
              style={{ marginLeft: 8 }}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>

      {/* Away Team - Right Side */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '30%',
        }}
      >
        {getOnCourtPlayers(awayTeam).map((player) => (
          <PlayerCircle
            key={player.id}
            player={player}
            teamColor="away"
            isMobile={isMobile}
            isFouledOut={isFouledOut(player)}
            onClick={(e) => onPlayerClick(player, 'away', e)}
            title={
              isFouledOut(player)
                ? `${player.nombre} ${player.apellido} - Descalificado (5 faltas). Debe salir de la cancha.`
                : `${player.nombre} ${player.apellido} - ${player.posicion} | Click to record stats, Shift+Click to substitute`
            }
          />
        ))}
      </div>
    </div>
  );
};

export default Court;
