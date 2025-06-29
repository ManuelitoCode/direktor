import React from 'react';
import PrintableView from './UI/PrintableView';

interface PlayerStanding {
  id: string;
  name: string;
  rank: number;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  spread: number;
  gamesPlayed: number;
}

interface PrintableStandingsProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentName: string;
  currentRound: number;
  standings: PlayerStanding[];
}

const PrintableStandings: React.FC<PrintableStandingsProps> = ({
  isOpen,
  onClose,
  tournamentName,
  currentRound,
  standings
}) => {
  return (
    <PrintableView
      isOpen={isOpen}
      onClose={onClose}
      title={`${tournamentName} - Round ${currentRound} Standings`}
    >
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="border border-gray-300 bg-gray-100 p-2 text-left">Rank</th>
            <th className="border border-gray-300 bg-gray-100 p-2 text-left">Player</th>
            <th className="border border-gray-300 bg-gray-100 p-2 text-center">W-L-D</th>
            <th className="border border-gray-300 bg-gray-100 p-2 text-center">Points</th>
            <th className="border border-gray-300 bg-gray-100 p-2 text-center">Spread</th>
            <th className="border border-gray-300 bg-gray-100 p-2 text-center">Games</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((standing) => (
            <tr key={standing.id}>
              <td className="border border-gray-300 p-2 text-left">
                {standing.rank}
              </td>
              <td className="border border-gray-300 p-2 text-left">
                <div>
                  <div className="font-medium">{standing.name}</div>
                  <div className="text-sm text-gray-600">Rating: {standing.rating}</div>
                </div>
              </td>
              <td className="border border-gray-300 p-2 text-center">
                {standing.wins}-{standing.losses}-{standing.draws}
              </td>
              <td className="border border-gray-300 p-2 text-center font-bold">
                {standing.points}
              </td>
              <td className="border border-gray-300 p-2 text-center">
                {standing.spread > 0 ? '+' : ''}{standing.spread}
              </td>
              <td className="border border-gray-300 p-2 text-center">
                {standing.gamesPlayed}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </PrintableView>
  );
};

export default PrintableStandings;