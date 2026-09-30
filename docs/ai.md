# AI and analysis

The AI function accepts only `Knowledge`: board size, public shots and initial ship lengths. It has no Fleet argument and cannot import opponent coordinates from a match.

- Easy chooses uniformly among unshot cells.
- Normal targets orthogonal neighbors of unresolved hits, otherwise searches randomly; it excludes known sunk-ship surroundings.
- Hard uses a checkerboard hunt when useful and probability-weighted targeting after hits.
- Expert enumerates horizontal/vertical placements for each remaining ship length, rejects known misses and sunk-ship surroundings, weights placements containing unresolved hits, then selects a maximum-score unshot cell. Multiple aligned hits increase direction preference.

The heatmap is a heuristic score, not a calibrated posterior distribution over complete fleets. It does not perform exhaustive joint-fleet enumeration. Random tie-breaking prevents identical games.

Trainer reconstructs the same public information before each player move. Accuracy comes from actual hits/shots; best move is the highest relative information score, not a hindsight hit. It flags an opportunity when a choice after the first four moves has less than 35% of the highest score. It detects missed follow-up after hits and reports search parity. Recommendations change with the history. No external language model is required at runtime.

Replay shows every move with play/pause, previous/next, first/last and a range timeline. It never needs the hidden fleet to reproduce shot outcomes.
