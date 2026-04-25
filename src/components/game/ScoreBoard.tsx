import React from 'react';
import { Typography, Statistic, Button, Space } from 'antd';

const { Title } = Typography;

interface TeamInfo {
  id: number;
  nombre: string;
  logo?: string;
}

interface ScoreBoardProps {
  team: TeamInfo;
  score: number;
  isHome: boolean;
  gameStatus: 'scheduled' | 'in_progress' | 'paused' | 'finished';
  onUpdateScore?: (newScore: number) => void;
}

/**
 * ScoreBoard - Componente del marcador de un equipo
 * 
 * Muestra:
 * - Nombre del equipo
 * - Puntaje actual
 * - Botones para actualizar puntaje (+1, +2, +3, -1) solo si el juego está en progreso
 */
export const ScoreBoard: React.FC<ScoreBoardProps> = ({
  team,
  score,
  isHome,
  gameStatus,
  onUpdateScore,
}) => {
  const canUpdateScore = gameStatus === 'in_progress' && onUpdateScore;

  const handleScoreChange = (delta: number) => {
    if (!onUpdateScore) return;
    const newScore = Math.max(0, score + delta);
    onUpdateScore(newScore);
  };

  return (
    <div>
      <Title level={4} style={{ margin: 0 }}>
        {team.nombre}
      </Title>
      <Statistic value={score} style={{ marginTop: '4px' }} />
      
      {canUpdateScore && (
        <Space style={{ marginTop: 8 }}>
          <Button size="small" onClick={() => handleScoreChange(1)}>
            +1
          </Button>
          <Button size="small" onClick={() => handleScoreChange(2)}>
            +2
          </Button>
          <Button size="small" onClick={() => handleScoreChange(3)}>
            +3
          </Button>
          <Button size="small" onClick={() => handleScoreChange(-1)}>
            -1
          </Button>
        </Space>
      )}
    </div>
  );
};

export default ScoreBoard;
