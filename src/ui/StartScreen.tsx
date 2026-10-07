import { useState } from 'react';
import { RACKETS } from '../data/rackets';
import { RIVAL_DEFS, START_OPTIONS, playerDef } from '../data/organizations';
import { AREAS, ZONES } from '../data/zones';
import type { FamilyDef } from '../engine';

export function StartScreen({ onStart }: { onStart: (player: FamilyDef) => void }) {
  const [name, setName] = useState('Il Gruppo');
  const [startIdx, setStartIdx] = useState(0);
  const start = () => onStart(playerDef(name, START_OPTIONS[startIdx]));

  return (
    <main className="start">
      <div className="start-inner">
        <header>
          <p className="eyebrow">Strategia a turni · vertical slice 0.1</p>
          <h1 className="start-title">
            Roma <span>criminale</span>
          </h1>
          <p className="start-lede">
            Una Roma di finzione, quartiere per quartiere. Parti con pochi soldi, cinque persone e
            un solo quartiere. Due organizzazioni molto più grandi di te si contendono già la città.
          </p>
        </header>

        <section className="start-step">
          <label className="eyebrow" htmlFor="org-name">
            Nome della tua organizzazione
          </label>
          <input
            id="org-name"
            className="text-input"
            value={name}
            maxLength={28}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && start()}
          />
        </section>

        <section className="start-step">
          <span className="eyebrow">Da dove cominci</span>
          <div className="family-grid" role="group" aria-label="Quartiere di partenza">
            {START_OPTIONS.map((o, i) => {
              const z = ZONES[o.zone];
              return (
                <button
                  key={o.zone}
                  id={`start-${o.zone}`}
                  className="family-card"
                  aria-pressed={startIdx === i}
                  onClick={() => setStartIdx(i)}
                  onDoubleClick={start}
                >
                  <h2>{z.name}</h2>
                  <span className="eyebrow">{AREAS[z.area]}</span>
                  <p>{o.pitch}</p>
                  <dl className="facts">
                    <dt>Ricchezza</dt>
                    <dd>{z.wealth}/10</dd>
                    <dt>Polizia</dt>
                    <dd>{z.lawPresence}/10</dd>
                    <dt>Specialità</dt>
                    <dd>{RACKETS[o.specialization].name}</dd>
                  </dl>
                </button>
              );
            })}
          </div>
        </section>

        <section className="start-step">
          <span className="eyebrow">Chi controlla già Roma</span>
          <div className="rival-strip">
            {RIVAL_DEFS.map((r) => (
              <div key={r.id} className="rival-mini">
                <i className="dot" style={{ background: r.color }} />
                <div>
                  <strong>{r.name}</strong> · {[r.home, ...r.startZones].map((z) => ZONES[z].name).join(', ')}
                  <p>{r.trait}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <footer className="start-footer">
          <p className="disclaimer">
            Opera di fantasia. Organizzazioni, persone ed eventi sono inventati; i nomi dei
            quartieri sono solo riferimenti geografici e non rimandano a fatti reali. Il gioco tratta
            la criminalità come un sistema di costi e conseguenze, non come un modello.
          </p>
          <button className="btn btn-primary" onClick={start}>
            Inizia la partita →
          </button>
        </footer>
      </div>
    </main>
  );
}
