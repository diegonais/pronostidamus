import type { LeaderboardItem, Match, Prediction, Room, User } from '../types';

function getOutcome(teamAScore: number, teamBScore: number): 'A' | 'B' | 'D' {
  if (teamAScore === teamBScore) {
    return 'D';
  }

  return teamAScore > teamBScore ? 'A' : 'B';
}

export function buildLeaderboard(
  users: User[],
  predictionsByMatch: Record<string, Prediction[]>,
  matches: Match[],
): LeaderboardItem[] {
  const items = new Map<string, LeaderboardItem>();

  users.forEach((user) => {
    items.set(user.id, {
      userId: user.id,
      username: user.username,
      name: user.name,
      points: 0,
      predictionCount: 0,
      exactHits: 0,
      outcomeHits: 0,
    });
  });

  matches.forEach((match) => {
    const predictions = predictionsByMatch[match.id] ?? [];
    const hasResult = match.teamAScore !== null && match.teamBScore !== null;

    predictions.forEach((prediction) => {
      const item = items.get(prediction.userId);
      if (!item) {
        return;
      }

      item.predictionCount += 1;

      const points = prediction.points ?? 0;
      item.points += points;

      if (hasResult) {
        if (
          prediction.predictedTeamAScore === match.teamAScore &&
          prediction.predictedTeamBScore === match.teamBScore
        ) {
          item.exactHits += 1;
        } else if (
          getOutcome(prediction.predictedTeamAScore, prediction.predictedTeamBScore) ===
          getOutcome(match.teamAScore as number, match.teamBScore as number)
        ) {
          item.outcomeHits += 1;
        }
      }
    });
  });

  return [...items.values()].sort((a, b) => {
    if (b.points !== a.points) {
      return b.points - a.points;
    }

    if (b.exactHits !== a.exactHits) {
      return b.exactHits - a.exactHits;
    }

    return a.username.localeCompare(b.username);
  });
}

export function getRoomMembers(room: Room): User[] {
  return (room.roomUsers ?? []).map((member) => member.user);
}
