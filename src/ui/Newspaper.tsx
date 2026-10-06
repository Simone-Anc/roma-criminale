import { useEffect, useRef } from 'react';
import {
  heatLabel,
  ownedTerritories,
  power,
  weekLabel,
  type GameState,
  type TurnReport,
} from '../engine';
import { ZONES } from '../data/zones';
import { money, signed, signedMoney } from './format';

function Masthead({ week }: { week: number }) {
  return (
    <header className="masthead">
      <h2>Cronache di Roma</h2>
      <div className="dateline">
        <span>Settimana {week}</span>
        <span>{weekLabel(week)}</span>
        <span>Edizione unica</span>
      </div>
    </header>
  );
}

function useFocus<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => ref.current?.focus(), []);
  return ref;
}

/** Resoconto di fine settimana, impaginato come la prima pagina di un quotidiano. */
export function WeeklyReport({ report, onClose }: { report: TurnReport; onClose: () => void }) {
  const btn = useFocus<HTMLButtonElement>();
  const [lead, ...briefs] = report.news;
  const balance = report.income - report.upkeep - report.setup;

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Resoconto della settimana">
      <article className="paper">
        <Masthead week={report.week} />
        <div>
          <p className="lead">{lead ? lead.headline : 'Settimana tranquilla: nessuna novità dai territori'}</p>
          {lead?.body && <p style={{ margin: '6px 0 0' }}>{lead.body}</p>}
        </div>
        <div className="columns">
          <section>
            <div className="section-label">Il tuo bilancio</div>
            <div className="ledger">
              <span>Entrate</span>
              <span>{money(report.income)}</span>
              <span>Stipendi</span>
              <span>−{money(report.upkeep)}</span>
              <span>Investimenti</span>
              <span>−{money(report.setup)}</span>
              <span className="total">Saldo</span>
              <span className={`total${balance < 0 ? ' neg' : ''}`}>{signedMoney(balance)}</span>
              <span>Rischio</span>
              <span>
                {Math.round(report.heatAfter)} ({signed(report.heatAfter - report.heatBefore)})
              </span>
            </div>
            {Object.keys(report.controlDelta).length > 0 && (
              <>
                <div className="section-label" style={{ marginTop: 14 }}>Il tuo controllo</div>
                <div className="ledger">
                  {Object.entries(report.controlDelta).map(([zid, d]) => (
                    <span key={zid} style={{ display: 'contents' }}>
                      <span>Zona {ZONES[zid].name}</span>
                      <span className={d < 0 ? 'neg' : ''}>{signed(d)}%</span>
                    </span>
                  ))}
                </div>
              </>
            )}
          </section>
          <section>
            <div className="section-label">In breve</div>
            <div className="briefs">
              {briefs.length === 0 && <p style={{ margin: 0 }}>Nessun'altra notizia.</p>}
              {briefs.slice(0, 6).map((n, i) => (
                <div key={i}>
                  <h4>{n.headline}</h4>
                  {n.body && <p>{n.body}</p>}
                </div>
              ))}
            </div>
          </section>
        </div>
        <button ref={btn} className="btn" onClick={onClose}>
          Inizia la settimana {report.week + 1} →
        </button>
      </article>
    </div>
  );
}

export function EndScreen({ game, onRestart }: { game: GameState; onRestart: () => void }) {
  const btn = useFocus<HTMLButtonElement>();
  const me = game.families[game.playerId];
  const won = game.status === 'won';
  const ranking = game.familyOrder
    .map((id) => game.families[id])
    .sort((a, b) => power(game, b.id) - power(game, a.id));

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Fine della partita">
      <article className="paper">
        <Masthead week={game.week - 1} />
        <div>
          <p className="lead">
            {won ? `${me.name}: Roma è nelle tue mani` : `${me.name}: la fine di un'ambizione`}
          </p>
          <p style={{ margin: '6px 0 0' }}>{game.endReason}</p>
        </div>
        <section>
          <div className="section-label">Classifica finale</div>
          <div className="ledger">
            {ranking.map((f) => (
              <span key={f.id} style={{ display: 'contents' }}>
                <span>
                  {f.name}
                  {f.isPlayer ? ' (tu)' : ''} · {ownedTerritories(game, f.id).length} zone
                </span>
                <span>{f.alive ? power(game, f.id) : '—'}</span>
              </span>
            ))}
          </div>
        </section>
        <p style={{ margin: 0, fontSize: 13 }}>
          Rischio finale: {heatLabel(me.heat).toLowerCase()}. Partita durata {game.week - 1} settimane.
        </p>
        <button ref={btn} className="btn" onClick={onRestart}>
          Nuova partita
        </button>
      </article>
    </div>
  );
}
