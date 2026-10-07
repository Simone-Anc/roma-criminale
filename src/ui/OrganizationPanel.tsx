import { useState } from 'react';
import bossPortrait from '../assets/boss.jpg';
import { AREAS, ZONES } from '../data/zones';
import {
  BALANCE,
  chiefOfArea,
  control,
  controlLevel,
  directSoldiers,
  forecast,
  fullName,
  heatLabel,
  lieutenantSlots,
  membersBusy,
  ownedTerritories,
  power,
  squadCapacity,
  totalInfluence,
  unledSoldiers,
  validateAction,
  wantedSoldiers,
  type AreaId,
  type GameState,
  type Lieutenant,
  type TerritoryId,
} from '../engine';
import { money, signed } from './format';
import { ActionButton, type Act } from './panels';

// ------------------------------------------------------------------ Elementi comuni

/** Ritratto: per ora un medaglione con le iniziali; `portrait` sarà un'immagine. */
function Medallion({ text, image, tone, big }: { text: string; image?: string; tone?: string; big?: boolean }) {
  return (
    <span className={`medallion${big ? ' big' : ''}${tone ? ` ${tone}` : ''}`} aria-hidden="true">
      {image ? <img src={image} alt="" /> : text}
    </span>
  );
}

const initials = (s: string) =>
  s.split(/\s+/).filter((w) => /^[A-ZÀ-Ý]/.test(w)).map((w) => w[0]).join('').slice(0, 2) || s.slice(0, 2).toUpperCase();

function loyaltyTone(v: number): string {
  if (v < BALANCE.loyaltySkim) return 'danger';
  if (v < BALANCE.loyaltyWarn) return 'warn';
  return 'ok';
}

function loyaltyLabel(v: number): string {
  if (v < BALANCE.loyaltySplit) return 'Pronto ad andarsene';
  if (v < BALANCE.loyaltySkim) return 'Infido';
  if (v < BALANCE.loyaltyWarn) return 'Insofferente';
  if (v < 70) return 'Leale';
  return 'Fedelissimo';
}

function Bar({ value, tone }: { value: number; tone?: string }) {
  return (
    <span className={`bar${tone ? ` ${tone}` : ''}`} aria-hidden="true">
      <i style={{ width: `${value}%` }} />
    </span>
  );
}

function Soldiers({ n, max }: { n: number; max?: number }) {
  return (
    <span className="soldiers" aria-label={`${n} soldati`}>
      {Array.from({ length: Math.max(n, max ?? 0) }, (_, i) => <i key={i} className={i < n ? 'on' : ''} />)}
    </span>
  );
}

// ------------------------------------------------------------------ Vice capo

function LieutenantCard({ game, l, act }: { game: GameState; l: Lieutenant; act: Act }) {
  const me = game.families[game.playerId];
  const [confirm, setConfirm] = useState(false);
  const cap = squadCapacity(l);
  const want = wantedSoldiers(l);
  const area = l.assignment?.area;
  const zonesInArea = area ? ownedTerritories(game, me.id).filter((t) => ZONES[t.id].area === area).length : 0;
  const move = (delta: number) => act({ type: 'moveSoldiers', lieutenantId: l.id, delta });
  const canMove = (delta: number) => validateAction(game, me.id, { type: 'moveSoldiers', lieutenantId: l.id, delta });

  return (
    <li className="node">
      <div className={`person ${loyaltyTone(l.loyalty)}`}>
        <div className="person-head">
          <Medallion text={initials(fullName(l))} image={l.portrait} tone={loyaltyTone(l.loyalty)} />
          <div>
            <strong>{fullName(l)}</strong>
            <span className="empty"> · {l.nickname} · {l.age} anni</span>
            <div className="hint">Vice capo dalla settimana {l.joinedWeek}</div>
          </div>
        </div>

        <div className="stat-line">
          <span className="label">Lealtà</span>
          <Bar value={l.loyalty} tone={loyaltyTone(l.loyalty)} />
          <span className="num">{Math.round(l.loyalty)}</span>
          <span className="empty">{loyaltyLabel(l.loyalty)}</span>
        </div>
        <div className="stat-line">
          <span className="label">Ambizione</span>
          <Bar value={l.ambition} />
          <span className="num">{l.ambition}</span>
          <span className="empty">vuole {want} soldati</span>
        </div>
        <div className="skills">
          <span>Affari <span className="num">{l.skills.affari}</span></span>
          <span>Forza <span className="num">{l.skills.forza}</span></span>
          <span>Discrezione <span className="num">{l.skills.discrezione}</span></span>
        </div>

        <label className="assign">
          <span className="label">Incarico</span>
          <select
            value={area ?? ''}
            onChange={(e) => act({
              type: 'assignLieutenant',
              lieutenantId: l.id,
              assignment: e.target.value ? { type: 'area', area: e.target.value as AreaId } : null,
            })}
          >
            <option value="">Nessun incarico</option>
            {(Object.keys(AREAS) as AreaId[]).map((a) => {
              const chief = chiefOfArea(me, a);
              return (
                <option key={a} value={a} disabled={!!chief && chief.id !== l.id}>
                  Responsabile {AREAS[a]}{chief && chief.id !== l.id ? ` (${chief.lastName})` : ''}
                </option>
              );
            })}
          </select>
        </label>
        {area ? (
          <p className="hint">
            {zonesInArea === 0
              ? `Non domini quartieri nell'area ${AREAS[area]}: per ora non ha niente da gestire.`
              : `${zonesInArea === 1 ? "Nel tuo quartiere dell'area" : `Nei tuoi ${zonesInArea} quartieri dell'area`}: tributi +${Math.round(l.skills.affari / 4)}%, difesa +${Math.round(l.skills.forza / 2)}%, presidio +${Math.min(BALANCE.presidioMax, Math.floor(l.soldiers / BALANCE.soldiersPerPresidio))} influenza/sett.`}
            {' '}Rischio −{(l.skills.discrezione / 50).toFixed(1)}/sett.
          </p>
        ) : (
          <p className="hint warn">Senza incarico si sente messo da parte: la lealtà cala.</p>
        )}

        <div className="squad">
          <span className="label">Soldati</span>
          <button className="btn btn-small" onClick={() => move(-1)} disabled={!canMove(-1).ok} aria-label="Togli un soldato">−</button>
          <Soldiers n={l.soldiers} max={cap} />
          <button className="btn btn-small" onClick={() => move(1)} disabled={!canMove(1).ok} title={canMove(1).reason} aria-label="Assegna un soldato">+</button>
          <span className="num">{l.soldiers}/{cap}</span>
        </div>

        <div className="actions">
          <ActionButton game={game} action={{ type: 'rewardLieutenant', lieutenantId: l.id }} label={`Ricompensa +${BALANCE.rewardLoyalty}`} act={act} />
          {confirm ? (
            <>
              <button className="btn btn-small danger" onClick={() => act({ type: 'dismissLieutenant', lieutenantId: l.id })}>Conferma congedo</button>
              <button className="btn btn-small" onClick={() => setConfirm(false)}>Annulla</button>
            </>
          ) : (
            <button className="btn btn-small" onClick={() => setConfirm(true)} title="I suoi soldati tornano a te; gli altri vice ne prendono nota.">Congeda</button>
          )}
        </div>
      </div>
    </li>
  );
}

function CandidateCard({ game, c, act }: { game: GameState; c: Lieutenant; act: Act }) {
  return (
    <li className="person candidate">
      <div className="person-head">
        <Medallion text={initials(fullName(c))} image={c.portrait} />
        <div>
          <strong>{fullName(c)}</strong>
          <span className="empty"> · {c.nickname} · {c.age} anni</span>
        </div>
      </div>
      <div className="skills">
        <span>Lealtà <span className="num">{c.loyalty}</span></span>
        <span>Ambizione <span className="num">{c.ambition}</span></span>
      </div>
      <div className="skills">
        <span>Affari <span className="num">{c.skills.affari}</span></span>
        <span>Forza <span className="num">{c.skills.forza}</span></span>
        <span>Discrezione <span className="num">{c.skills.discrezione}</span></span>
      </div>
      <div className="actions">
        <ActionButton game={game} action={{ type: 'hireLieutenant', candidateId: c.id }} label="Fai entrare" act={act} />
      </div>
    </li>
  );
}

// ------------------------------------------------------------------ Pannello

export function OrganizationPanel({ game, act, onSelectZone }: { game: GameState; act: Act; onSelectZone: (id: TerritoryId) => void }) {
  const me = game.families[game.playerId];
  const owned = ownedTerritories(game, me.id);
  const fc = forecast(game, me.id);
  const slots = lieutenantSlots(me);
  const direct = directSoldiers(me);
  const unled = unledSoldiers(me);
  const lockedAt = BALANCE.slotReputation.filter((r) => me.reputation < r);

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="eyebrow">La tua organizzazione</span>
        <h2>{me.name}</h2>
      </div>

      <div className="attr-grid four">
        <div className="attr"><span className="label">Potere</span><span className="value">{power(game, me.id)}</span></div>
        <div className="attr"><span className="label">Denaro</span><span className="value">{money(me.money)}</span></div>
        <div className="attr"><span className="label">Influenza</span><span className="value">{totalInfluence(game, me.id)}</span></div>
        <div className="attr"><span className="label">Reputazione</span><span className="value">{Math.round(me.reputation)}</span></div>
      </div>

      <section>
        <h3>Gerarchia</h3>
        <div className="org-tree">
          <div className="person boss">
            <div className="person-head">
              <Medallion text="TU" image={bossPortrait} tone="boss" big />
              <div>
                <strong>Il capo</strong>
                <div className="hint">{me.members} soldati in tutto · {membersBusy(game, me.id)} impegnati negli affari</div>
              </div>
            </div>
          </div>

          <ul className="org-children">
            {me.lieutenants.map((l) => <LieutenantCard key={l.id} game={game} l={l} act={act} />)}

            {Array.from({ length: Math.max(0, slots - me.lieutenants.length) }, (_, i) => (
              <li key={`free${i}`} className="node">
                <div className="person slot">Slot da vice capo libero: scegli tra i candidati qui sotto.</div>
              </li>
            ))}
            {lockedAt.map((r) => (
              <li key={`lock${r}`} className="node">
                <div className="person slot locked">Slot bloccato · si apre a reputazione {r}</div>
              </li>
            ))}

            <li className="node">
              <div className="person direct">
                <div className="squad">
                  <span className="label">Ai tuoi ordini</span>
                  <Soldiers n={direct} max={BALANCE.bossDirectSoldiers} />
                  <span className="num">{direct}/{BALANCE.bossDirectSoldiers}</span>
                </div>
                {unled > 0 ? (
                  <p className="hint warn">
                    {unled} {unled === 1 ? 'soldato' : 'soldati'} senza guida: rischio {signed(unled * BALANCE.unledHeat)}/sett.
                    Affidali a un vice capo.
                  </p>
                ) : (
                  <p className="hint">Il capo segue di persona al massimo {BALANCE.bossDirectSoldiers} soldati.</p>
                )}
              </div>
            </li>
          </ul>
        </div>
      </section>

      {me.lieutenants.length < slots && game.candidates.length > 0 && (
        <section>
          <h3>Candidati vice capo</h3>
          <p className="hint">Si rinnovano ogni {BALANCE.candidateRefreshWeeks} settimane. Chi è più ambizioso è più capace, ma più difficile da tenere.</p>
          <ul className="candidates">
            {game.candidates.map((c) => <CandidateCard key={c.id} game={game} c={c} act={act} />)}
          </ul>
        </section>
      )}

      <section>
        <h3>Gestione</h3>
        <div className="actions">
          <ActionButton game={game} action={{ type: 'recruit' }} label={`Recluta ${BALANCE.recruitAmount} soldati`} act={act} />
          <ActionButton game={game} action={{ type: 'lowProfile' }} label={`Basso profilo −${BALANCE.lowProfileHeat} rischio`} act={act} />
        </div>
        <p className="hint">
          Ogni soldato costa {money(BALANCE.memberUpkeep)} a settimana, ogni vice capo {money(BALANCE.lieutenantUpkeep)}.
          Rischio attuale: {heatLabel(me.heat).toLowerCase()}. Anche la cassa attira attenzione: +1 rischio a settimana ogni {money(BALANCE.cashPerHeat)}.
        </p>
      </section>

      <section>
        <h3>Bilancio previsto</h3>
        <div className="rows">
          <div className="row">Tributi dai quartieri<span className="num">{money(fc.tributes)}</span></div>
          <div className="row">Affari<span className="num">{money(fc.rackets)}</span></div>
          <div className="row">Stipendi<span className="num">−{money(fc.upkeep)}</span></div>
          {fc.skimmed > 0 && <div className="row">Trattenuto dai vice infedeli<span className="num neg">−{money(fc.skimmed)}</span></div>}
          <div className="row"><strong>Saldo settimanale</strong><span className={`num ${fc.net < 0 ? 'neg' : ''}`}>{fc.net >= 0 ? '+' : ''}{money(fc.net)}</span></div>
          <div className="row">Rischio<span className="num">{signed(fc.heat)}/sett.</span></div>
        </div>
      </section>

      <section>
        <h3>Quartieri</h3>
        <div className="rows">
          {owned.map((t) => (
            <div className="row" key={t.id}>
              <button className="link" onClick={() => onSelectZone(t.id)}>{ZONES[t.id].name}</button>
              <span className="empty">{AREAS[ZONES[t.id].area]} · {controlLevel(control(game, t.id, me.id))}</span>
              <span className="num">{Math.round(control(game, t.id, me.id))}%</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
