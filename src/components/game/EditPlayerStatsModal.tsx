import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Form,
  InputNumber,
  Input,
  Select,
  Row,
  Col,
  Divider,
  Statistic,
  Alert,
  Tag,
  Space,
  Typography,
  App,
} from 'antd';
import type { Rule } from 'antd/es/form';
import { isAxiosError } from 'axios';
import { gameAPI } from '../../services/apiService';
import {
  toBoxScore,
  computePoints,
  FOUL_OUT_LIMIT,
  BOX_SCORE_LABELS,
  type BoxScore,
  type BoxScoreField,
  type StatsRow,
} from '../../utils/boxScore';

const { Text } = Typography;

export interface EditablePlayer {
  id: number;
  nombre: string;
  apellido: string;
  numero: number;
  teamName: string;
}

export interface StatsAdjustmentResult {
  changed: BoxScoreField[];
  pointsDelta: number;
  // PlayerGameStats row as saved; null only when nothing changed and the player had no row
  stats: (StatsRow & { playerId: number; eficiencia?: number }) | null;
  // null when nothing changed
  game: { id: number; estado: string; homeScore: number; awayScore: number } | null;
}

interface EditPlayerStatsModalProps {
  open: boolean;
  gameId: number;
  gameStatus?: string;
  players: EditablePlayer[];
  stats: Array<StatsRow & { playerId: number }>;
  initialPlayerId?: number | null;
  onClose: () => void;
  onSaved: (result: StatsAdjustmentResult) => void;
}

// Minutes are edited as mm + ss but stored in seconds
type FormValues = Omit<BoxScore, 'minutos'> & { min: number; sec: number; reason?: string };

const toFormValues = (b: BoxScore): FormValues => {
  const { minutos, ...rest } = b;
  return { ...rest, min: Math.floor(minutos / 60), sec: minutos % 60 };
};

const fromFormValues = (values: FormValues): BoxScore => {
  const box: Partial<FormValues> & BoxScore = {
    ...values,
    minutos: (values.min ?? 0) * 60 + (values.sec ?? 0),
  };
  delete box.min;
  delete box.sec;
  delete box.reason;
  return box;
};

type FormField = Exclude<BoxScoreField, 'minutos'>;

const SHOT_ROWS: Array<[string, FormField, FormField]> = [
  ['Tiros libres', 'tirosLibresAnotados', 'tirosLibresIntentados'],
  ['Tiros de 2', 'tiros2Anotados', 'tiros2Intentados'],
  ['Tiros de 3', 'tiros3Anotados', 'tiros3Intentados'],
];

const OTHER_FIELDS: Array<[FormField, number?]> = [
  ['asistencias'],
  ['robos'],
  ['tapones'],
  ['perdidas'],
  ['faltasPersonales', FOUL_OUT_LIMIT],
];

const madeNotAboveAttempted =
  (attempted: FormField): Rule =>
  ({ getFieldValue }) => ({
    validator: (_, value) =>
      value == null || value <= (getFieldValue(attempted) ?? 0)
        ? Promise.resolve()
        : Promise.reject(new Error('No puede superar los intentados')),
  });

const required: Rule = { required: true, message: 'Requerido' };

/**
 * EditPlayerStatsModal - Corrección manual del box score de un jugador
 *
 * Sirve para partidos en curso y terminados. El servidor recalcula puntos,
 * tiros de campo, rebotes totales, eficiencia y el marcador del equipo; aquí
 * solo se muestra la vista previa. Envía también el box score que se mostró
 * al abrir (baseline) para que las jugadas registradas en vivo mientras se
 * editaba no se pierdan.
 */
export const EditPlayerStatsModal: React.FC<EditPlayerStatsModalProps> = ({
  open,
  gameId,
  gameStatus,
  players,
  stats,
  initialPlayerId,
  onClose,
  onSaved,
}) => {
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [playerId, setPlayerId] = useState<number | null>(initialPlayerId ?? null);
  const [baseline, setBaseline] = useState<BoxScore>(toBoxScore(null));
  const [saving, setSaving] = useState(false);
  const [conflictNote, setConflictNote] = useState<string | null>(null);

  // Live socket refreshes replace `stats` while the form is open; only read it
  // when (re)loading a player so the editor's input isn't reset under them.
  const statsRef = useRef(stats);
  statsRef.current = stats;

  useEffect(() => {
    if (open) setPlayerId(initialPlayerId ?? null);
  }, [open, initialPlayerId]);

  useEffect(() => {
    if (!open || playerId == null) return;
    const snapshot = toBoxScore(statsRef.current.find((s) => s.playerId === playerId));
    setBaseline(snapshot);
    setConflictNote(null);
    form.resetFields();
    form.setFieldsValue(toFormValues(snapshot));
  }, [open, playerId, form]);

  const ftm = Form.useWatch('tirosLibresAnotados', form) ?? 0;
  const fg2m = Form.useWatch('tiros2Anotados', form) ?? 0;
  const fg3m = Form.useWatch('tiros3Anotados', form) ?? 0;
  const orb = Form.useWatch('rebotesOfensivos', form) ?? 0;
  const drb = Form.useWatch('rebotesDefensivos', form) ?? 0;

  const points = computePoints({ tirosLibresAnotados: ftm, tiros2Anotados: fg2m, tiros3Anotados: fg3m });
  const pointsDelta = points - computePoints(baseline);
  const player = players.find((p) => p.id === playerId);
  const isLive = gameStatus != null && gameStatus !== 'finished';

  const handleSubmit = async (values: FormValues) => {
    if (playerId == null) return;
    const edited = fromFormValues(values);
    setSaving(true);
    setConflictNote(null);
    try {
      const { data } = await gameAPI.adjustPlayerStats(gameId, playerId, {
        stats: { ...edited, puntos: points, rebotes: edited.rebotesOfensivos + edited.rebotesDefensivos },
        baseline,
        reason: values.reason?.trim() || undefined,
      });
      const result = data as StatsAdjustmentResult;
      if (result.game) {
        message.success(`Estadísticas de ${player?.nombre ?? 'jugador'} ${player?.apellido ?? ''} actualizadas`);
      } else {
        message.info('No había cambios que guardar');
      }
      onSaved(result);
      onClose();
    } catch (err) {
      const status = isAxiosError(err) ? err.response?.status : undefined;
      const body = (isAxiosError(err) && err.response?.data) || {};

      if (status === 409 && body.current) {
        // Plays were recorded on this player while editing. Rebase: take the
        // server's numbers, re-apply only what this editor changed, and let
        // the server's value win where both touched the same field.
        const current: BoxScore = body.current;
        const conflicted = new Set<string>((body.conflicts ?? []).map((c: { field: string }) => c.field));
        const rebased = { ...current };
        (Object.keys(current) as BoxScoreField[]).forEach((f) => {
          if (edited[f] !== baseline[f] && !conflicted.has(f)) rebased[f] = edited[f];
        });
        setBaseline(current);
        form.setFieldsValue(toFormValues(rebased));
        const fields = [...conflicted].map((f) => BOX_SCORE_LABELS[f as BoxScoreField] ?? f);
        setConflictNote(
          fields.length
            ? `Se registraron jugadas mientras editabas. Se cargó el valor actual de: ${fields.join(', ')}. Revisa y vuelve a guardar.`
            : `${body.error}. Se cargaron los valores actuales con tus cambios; revisa y vuelve a guardar.`
        );
        (body.errors ?? []).forEach((e: { field: string; message: string }) =>
          form.setFields([{ name: e.field as keyof FormValues, errors: [e.message] }])
        );
        return;
      }

      if (status === 422 && Array.isArray(body.errors)) {
        form.setFields(
          body.errors
            .filter((e: { field: string }) => e.field in BOX_SCORE_LABELS)
            .map((e: { field: string; message: string }) => ({
              name: (e.field === 'minutos' ? 'min' : e.field) as keyof FormValues,
              errors: [e.message],
            }))
        );
      }
      message.error(body.error ?? 'No se pudieron guardar las estadísticas');
    } finally {
      setSaving(false);
    }
  };

  const numberItem = (name: keyof FormValues, label: string, rules: Rule[] = [], extra?: object) => (
    <Form.Item name={name} label={label} rules={[required, ...rules]} style={{ marginBottom: 12 }}>
      <InputNumber min={0} max={999} precision={0} style={{ width: '100%' }} {...extra} />
    </Form.Item>
  );

  const teams = [...new Set(players.map((p) => p.teamName))];

  return (
    <Modal
      title="Editar estadísticas"
      open={open}
      onCancel={saving ? undefined : onClose}
      onOk={() => form.submit()}
      okText="Guardar"
      cancelText="Cancelar"
      confirmLoading={saving}
      okButtonProps={{ disabled: playerId == null }}
      cancelButtonProps={{ disabled: saving }}
      maskClosable={!saving}
      width={640}
      forceRender
    >
      <Select
        style={{ width: '100%', marginBottom: 16 }}
        placeholder="Selecciona un jugador"
        value={playerId ?? undefined}
        onChange={setPlayerId}
        disabled={saving}
        showSearch
        optionFilterProp="label"
        options={teams.map((team) => ({
          label: team,
          options: players
            .filter((p) => p.teamName === team)
            .map((p) => ({ value: p.id, label: `#${p.numero} ${p.nombre} ${p.apellido}` })),
        }))}
      />

      {isLive && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="Partido en curso: el cambio se verá al instante en todos los dispositivos conectados."
        />
      )}
      {conflictNote && (
        <Alert type="warning" showIcon style={{ marginBottom: 12 }} message={conflictNote} />
      )}

      <Form<FormValues> form={form} layout="vertical" disabled={saving || playerId == null} onFinish={handleSubmit}>
        <Row gutter={16} align="middle" style={{ marginBottom: 8 }}>
          <Col span={12}>
            <Statistic title="Puntos (calculado)" value={points} />
          </Col>
          <Col span={12}>
            {pointsDelta !== 0 && (
              <Space direction="vertical" size={0}>
                <Tag color={pointsDelta > 0 ? 'green' : 'red'}>
                  {pointsDelta > 0 ? `+${pointsDelta}` : pointsDelta} pts
                </Tag>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  El marcador de {player?.teamName ?? 'su equipo'} se ajustará igual
                </Text>
              </Space>
            )}
          </Col>
        </Row>

        <Divider orientation="left" plain>Tiros (convertidos / intentados)</Divider>
        {SHOT_ROWS.map(([label, made, attempted]) => (
          <Row gutter={16} key={made}>
            <Col span={12}>
              <Form.Item
                name={made}
                label={`${label} convertidos`}
                dependencies={[attempted]}
                rules={[required, madeNotAboveAttempted(attempted)]}
                style={{ marginBottom: 12 }}
              >
                <InputNumber min={0} max={999} precision={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>{numberItem(attempted, `${label} intentados`)}</Col>
          </Row>
        ))}

        <Divider orientation="left" plain>Rebotes</Divider>
        <Row gutter={16}>
          <Col span={8}>{numberItem('rebotesOfensivos', 'Ofensivos')}</Col>
          <Col span={8}>{numberItem('rebotesDefensivos', 'Defensivos')}</Col>
          <Col span={8}>
            <Form.Item label="Total" style={{ marginBottom: 12 }}>
              <InputNumber value={orb + drb} disabled style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left" plain>Otras</Divider>
        <Row gutter={16}>
          {OTHER_FIELDS.map(([field, max]) => (
            <Col xs={12} sm={8} key={field}>
              {numberItem(field, BOX_SCORE_LABELS[field], [], max ? { max } : undefined)}
            </Col>
          ))}
        </Row>

        <Divider orientation="left" plain>Tiempo y +/-</Divider>
        <Row gutter={16}>
          <Col span={8}>{numberItem('min', 'Minutos', [], { max: 360 })}</Col>
          <Col span={8}>{numberItem('sec', 'Segundos', [], { max: 59 })}</Col>
          <Col span={8}>
            <Form.Item name="plusMinus" label="+/-" rules={[required]} style={{ marginBottom: 12 }}>
              <InputNumber min={-999} max={999} precision={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="reason" label="Motivo de la corrección (opcional)" style={{ marginBottom: 0 }}>
          <Input.TextArea rows={2} maxLength={500} placeholder="Ej.: corrección según acta oficial" />
        </Form.Item>
      </Form>
    </Modal>
  );
};
