import SpeedKnightGame from "./(ui)/SpeedKnightGame"
import { createInitialGameState } from "./(game)/gameState"

export default function Page() {
  return <SpeedKnightGame initialState={createInitialGameState()} />
}
