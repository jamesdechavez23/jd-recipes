import SpeedKnightGame from "./(game)/SpeedKnightGame"
import { createInitialGameState } from "./(game)/gameState"

export default function Page() {
  return <SpeedKnightGame initialState={createInitialGameState()} />
}
