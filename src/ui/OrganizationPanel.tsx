// La banda come organigramma a quadrati: il capo in alto, i vice sotto, poi i soldati.
// Di ogni vice si vedono solo lealtà e incarico; il resto è nel menu dell'incarico.
import { useState } from 'react';
import bossPortrait from '../assets/boss.jpg';
import { ZONES } from '../data/zones';
import {
  BALANCE,
  fullName,
  lieutenantSlots,
  recruitCost,
  soldiersAtWar,
  spaccioGain,
  validateAction,
  type GameState,
  type Lieutenant,
} from '../engine';
import { money } from './format';
import { ActionButton, type Act } from './panels';

const initials = (s: string) =>
  s.split(/\s+/).filter((w) => /^[A-ZÀ-Ý]/.test(w)).map((w) => w[0]).join('').slice(0, 2) || s.slice(0, 2).toUpperCase();

export function loyaltyTone(v: number): string {
  if (v < BALANCE.loyaltySkim) return 'danger';
  if (v < BALANCE.loyaltyWarn) return 'warn';
  return 'ok';
}

function jobLabel(l: Lieutenant): string {
  const job = l.assignment;
  if (job?.type === 'spaccio') return `Spaccio · ${ZONES[job.territoryId].name}`;
  if (job?.type === 'reclutare') return 'Recluta';
  return 'Nessun incarico';
}

/** Ritratto del vice: per ora le iniziali; `portrait` sarà un'immagine. */
export function LieutenantFace({ l, className = '' }: { l: Lieutenant; className?: string }) {
  return (
    <span className={`face ${loyaltyTone(l.loyalty)} ${className}`} aria-hidden="true">
      {l.portrait ? <img src={l.portrait} alt="" /> : initials(fullName(l))}
    </span>
  );
}

// ------------------------------------------------------------------ Menu dell'incarico

function JobMenu({ game, l, act, onPlaceSpaccio, onClose }: {
  game: GameState; l: Lieutenant; act: Act; onPlaceSpaccio: (id: string) => void; onClose: () => void;
}) {
  const me = game.families[game.playerId];
  const [confirm, setConfirm] = useState(false);
  const job = l.assignment;
  const assign = (assignment: Lieutenant['assignment']) => {
    act({ type: 'assignLieutenant', lieutenantId: l.id, assignment });
    onClose();
  };
  const canSpaccio = Object.values(game.territories).some((t) => t.owner === me.id);

  return (
    <div className="job-menu" role="dialog" aria-label={`Incarico di ${fullName(l)}`}>
      <div className="job-menu-head">
        <LieutenantFace l={l} />
        <div>
          <strong>{fullName(l)}</strong> <span className="empty">· {l.nickname}</span>
          <div className="hint">Lealtà {Math.round(l.loyalty)} · ambizione {l.ambition}</div>
        </div>
      </div>
      <div className="job-options">
        <button className="job-option" aria-pressed={job?.type === 'reclutare'} onClick={() => assign({ type: 'reclutare' })}>
          <strong>Recluta</strong>
          <span>+{BALANCE.recruitPerWeek} soldato ogni settimana</span>
        </button>
        <button
          className="job-option"
          aria-pressed={job?.type === 'spaccio'}
          disabled={!canSpaccio}
          onClick={() => {
            onPlaceSpaccio(l.id);
            onClose();
          }}
        >
          <strong>Spaccio</strong>
          <span>Scegli sulla mappa · +{spaccioGain(l)} influenza/sett. lì, +{BALANCE.spaccioNeighborGain} nei confinanti</span>
        </button>
        <button className="job-option" aria-pressed={!job} onClick={() => assign(null)}>
          <strong>Nessun incarico</strong>
          <span>La lealtà cala</span>
        </button>
      </div>
      <div className="actions">
        <ActionButton game={game} action={{ type: 'rewardLieutenant', lieutenantId: l.id }} label={`Ricompensa +${BALANCE.rewardLoyalty} lealtà`} act={act} />
        {confirm ? (
          <>
            <button className="btn btn-small danger" onClick={() => act({ type: 'dismissLieutenant', lieutenantId: l.id })}>Conferma congedo</button>
            <button className="btn btn-small" onClick={() => setConfirm(false)}>Annulla</button>
          </>
        ) : (
          <button className="btn btn-small" onClick={() => setConfirm(true)} title="Gli altri vice ne prendono nota.">Congeda</button>
        )}
        <button className="btn btn-small" onClick={onClose}>Chiudi</button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Organigramma

export function OrganizationPanel({ game, act, onPlaceSpaccio }: {
  game: GameState; act: Act; onPlaceSpaccio: (lieutenantId: string) => void;
}) {
  const me = game.families[game.playerId];
  const [open, setOpen] = useState<string | null>(null);
  const [hiring, setHiring] = useState(false);
  const slots = lieutenantSlots(me);
  const free = Math.max(0, slots - me.lieutenants.length);
  const lockedAt = BALANCE.slotReputation.filter((r) => me.reputation < r);
  const selected = me.lieutenants.find((l) => l.id === open) ?? null;
  const shown = Math.min(me.members, 40);
  const atWar = soldiersAtWar(game, me.id);

  return (
    <div className="panel org">
      <div className="org-chart">
        <div className="org-boss">
          <div className="org-card boss">
            <img src={bossPortrait} alt="" />
            <span className="org-role">Il capo</span>
          </div>
        </div>

        <div className="org-row" role="list" aria-label="Vice capi">
          {me.lieutenants.map((l) => (
            <div key={l.id} className="org-slot" role="listitem">
              <button className={`org-card vice ${loyaltyTone(l.loyalty)}`} aria-pressed={open === l.id} onClick={() => setOpen(open === l.id ? null : l.id)}>
                <LieutenantFace l={l} />
                <span className="org-name">{l.firstName} {l.lastName}</span>
                <span className="org-loyalty"><strong>{Math.round(l.loyalty)}</strong> lealtà</span>
                <span className="org-job">{jobLabel(l)}</span>
              </button>
            </div>
          ))}
          {Array.from({ length: free }, (_, i) => (
            <div key={`free${i}`} className="org-slot" role="listitem">
              <button className="org-card empty-slot" aria-pressed={hiring} onClick={() => setHiring(!hiring)} disabled={game.candidates.length === 0}>
                <span className="org-plus">+</span>
                <span className="org-job">Assumi un vice</span>
              </button>
            </div>
          ))}
          {lockedAt.map((r) => (
            <div key={`lock${r}`} className="org-slot" role="listitem">
              <div className="org-card locked">
                <svg className="org-lock" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
                <span className="org-job">Reputazione {r}</span>
              </div>
            </div>
          ))}
        </div>

        {selected && <JobMenu game={game} l={selected} act={act} onPlaceSpaccio={onPlaceSpaccio} onClose={() => setOpen(null)} />}

        {hiring && free > 0 && (
          <div className="job-menu">
            <div className="job-menu-head"><strong>Candidati vice capo</strong></div>
            <div className="org-row candidates">
              {game.candidates.map((c) => {
                const action = { type: 'hireLieutenant' as const, candidateId: c.id };
                const check = validateAction(game, me.id, action);
                return (
                  <div key={c.id} className="org-slot">
                    <button className="org-card vice" disabled={!check.ok} title={check.reason} onClick={() => { act(action); setHiring(false); }}>
                      <LieutenantFace l={c} />
                      <span className="org-name">{c.firstName} {c.lastName}</span>
                      <span className="org-loyalty"><strong>{c.loyalty}</strong> lealtà</span>
                      <span className="org-job">Assumi · {money(BALANCE.hireCost)}</span>
                    </button>
                  </div>
                );
              })}
            </div>
            <p className="hint">Si rinnovano ogni {BALANCE.candidateRefreshWeeks} settimane. I più ambiziosi sono più capaci, ma più difficili da tenere.</p>
          </div>
        )}

        <div className="org-divider"><span>Soldati · {me.members}{atWar > 0 ? ` · ${atWar} in guerra` : ''}</span></div>
        <div className="org-soldiers" aria-label={`${me.members} soldati, ${atWar} in guerra`}>
          {Array.from({ length: shown }, (_, i) => <i key={i} className={i < atWar ? 'war' : ''} />)}
          {me.members > shown && <span className="num">+{me.members - shown}</span>}
        </div>
        <div className="actions org-actions">
          <ActionButton game={game} action={{ type: 'recruit' }} label={`Recluta ${BALANCE.recruitAmount} soldati`} act={act} primary />
          <ActionButton game={game} action={{ type: 'lowProfile' }} label={`Basso profilo −${BALANCE.lowProfileHeat} rischio`} act={act} />
        </div>
        <p className="hint">
          I soldati non hanno stipendio: in strada rendono {money(BALANCE.streetIncome)} a settimana l'uno, in guerra combattono.
          Ogni vice costa {money(BALANCE.lieutenantUpkeep)} a settimana. Reclutare costa {money(recruitCost(game, me.id))}.
        </p>
      </div>
    </div>
  );
}
