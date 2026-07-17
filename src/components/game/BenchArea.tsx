import React from 'react';
import { Row, Col, Typography, message } from 'antd';
import { PlayerCircle } from './PlayerCircle';
import type { Player, Team } from '../../types/game.types';

const FOUL_OUT_LIMIT = 5;
const isFouledOut = (player: Player): boolean =>
  (player.stats?.faltasPersonales || 0) >= FOUL_OUT_LIMIT;

const { Title } = Typography;

interface SubstitutionState {
  isSelecting: boolean;
  playerOut: Player | null;
  selectedTeam: 'home' | 'away' | null;
}

interface BenchAreaProps {
  homeTeam: Team;
  awayTeam: Team;
  isMobile?: boolean;
  substitutionState: SubstitutionState;
  onBenchPlayerClick: (player: Player, team: 'home' | 'away') => void;
}

/**
 * BenchArea - Componente del área de banco de jugadores
 * 
 * Muestra:
 * - Jugadores del equipo local en el banco
 * - Jugadores del equipo visitante en el banco
 * - Resalta jugadores seleccionables durante sustitución
 */
export const BenchArea: React.FC<BenchAreaProps> = ({
  homeTeam,
  awayTeam,
  isMobile = false,
  substitutionState,
  onBenchPlayerClick,
}) => {
  const getBenchPlayers = (team: Team): Player[] => {
    return team.players.filter((p) => !p.isOnCourt);
  };

  const benchStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    margin: '8px 0',
  };

  const isPlayerSelectable = (team: 'home' | 'away'): boolean => {
    return substitutionState.isSelecting && substitutionState.selectedTeam === team;
  };

  return (
    <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
      {/* Home Team Bench */}
      <Col xs={24} md={12}>
        <Title level={5} style={{ fontSize: isMobile ? 14 : 16 }}>
          Banca {homeTeam.nombre}
        </Title>
        <div style={benchStyle}>
          {getBenchPlayers(homeTeam).map((player) => (
            <PlayerCircle
              key={player.id}
              player={player}
              teamColor="bench"
              isMobile={isMobile}
              isSelectable={isPlayerSelectable('home')}
              isFouledOut={isFouledOut(player)}
              onClick={() => {
                if (isFouledOut(player)) {
                  message.warning({
                    content: `${player.nombre} ${player.apellido} tiene 5 faltas personales y está descalificado. No puede volver a la cancha.`,
                    duration: 3,
                  });
                  return;
                }
                if (isPlayerSelectable('home') || !substitutionState.isSelecting) {
                  onBenchPlayerClick(player, 'home');
                }
              }}
              title={
                isFouledOut(player)
                  ? `${player.nombre} ${player.apellido} - Descalificado (5 faltas personales)`
                  : isPlayerSelectable('home')
                    ? `Click to substitute in ${player.nombre}`
                    : `${player.nombre} ${player.apellido} - ${player.posicion} | Bench player - No stats when not on court`
              }
            />
          ))}
        </div>
      </Col>

      {/* Away Team Bench */}
      <Col xs={24} md={12}>
        <Title level={5} style={{ fontSize: isMobile ? 14 : 16 }}>
          Banca {awayTeam.nombre}
        </Title>
        <div style={benchStyle}>
          {getBenchPlayers(awayTeam).map((player) => (
            <PlayerCircle
              key={player.id}
              player={player}
              teamColor="bench"
              isMobile={isMobile}
              isSelectable={isPlayerSelectable('away')}
              isFouledOut={isFouledOut(player)}
              onClick={() => {
                if (isFouledOut(player)) {
                  message.warning({
                    content: `${player.nombre} ${player.apellido} tiene 5 faltas personales y está descalificado. No puede volver a la cancha.`,
                    duration: 3,
                  });
                  return;
                }
                if (isPlayerSelectable('away') || !substitutionState.isSelecting) {
                  onBenchPlayerClick(player, 'away');
                }
              }}
              title={
                isFouledOut(player)
                  ? `${player.nombre} ${player.apellido} - Descalificado (5 faltas personales)`
                  : isPlayerSelectable('away')
                    ? `Click to substitute in ${player.nombre}`
                    : `${player.nombre} ${player.apellido} - ${player.posicion} | Bench player - No stats when not on court`
              }
            />
          ))}
        </div>
      </Col>
    </Row>
  );
};

export default BenchArea;
