# Game engine

`lib/game/types.ts` defines Fleet, Ship, Shot, Move, MatchState, Difficulty and modes. Cell indices are row-major: `row * size + column`.

Classic: 10×10, lengths `[4,3,3,2,2,2,1,1,1,1]` (20 decks). Blitz: 7×7, lengths `[3,2,2,1,1]` (9 decks), a short format rather than a forced timer.

`shipCells` rejects wrapping, out-of-range starts and length overflow. `canPlace` rejects collision and eight-direction adjacency. `validateFleet` also checks straight lines, contiguous cells, exact composition and unique IDs. Manual placement selects a ship, chooses orientation, places its start; tapping an existing ship removes it and selects it for moving. `R` rotates. Random placement retries with validated positions.

`fire` rejects invalid/repeated cells and returns miss/hit/sunk. Sunk outcomes reveal only that ship's cells. `takeTurn` verifies an active match and current seat; a hit or sunk retains the turn, miss transfers it. Victory requires all decks of every opponent ship. It returns a new state without mutating the input. Server surrender is separately supported.

Known empty cells around a sunk ship are marked and disabled by the interface. The engine does not fabricate shots into these cells. `elo` uses K=32; AI and local matches do not change Elo.

Tests cover bounds, adjacency, 300 generated fleets, shot outcomes, turn transitions, victory, AI simulation and Elo.
