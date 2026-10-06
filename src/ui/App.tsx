import { useState } from 'react';
import { newGame, type GameState } from '../engine';
import { GameScreen } from './GameScreen';
import { StartScreen } from './StartScreen';

export function App() {
  const [game, setGame] = useState<GameState | null>(null);
  if (!game) return <StartScreen onStart={(player) => setGame(newGame(player))} />;
  return <GameScreen game={game} setGame={setGame} onQuit={() => setGame(null)} />;
}
