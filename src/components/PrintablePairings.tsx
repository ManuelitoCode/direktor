import React from 'react';
import PrintableView from './UI/PrintableView';

interface Pairing {
  table_number: number;
  player1: {
    id: string;
    name: string;
    rating: number;
    rank: number;
  };
  player2: {
    id: string;
    name: string;
    rating: number;
    rank: number;
  };
  first_move_player_id: string;
}

interface PrintablePairingsProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentName: string;
  currentRound: number;
  pairings: Pairing[];
}

const PrintablePairings: React.FC<PrintablePairingsProps> = ({
  isOpen,
  onClose,
  tournamentName,
  currentRound,
  pairings
}) => {
  return (
    <PrintableView
      isOpen={isOpen}
      onClose={onClose}
      title={`${tournamentName} - Round ${currentRound} Pairings`}
    >
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="border border-gray-300 bg-gray-100 p-2 text-left">Table</th>
            <th className="border border-gray-300 bg-gray-100 p-2 text-left">Player 1</th>
            <th className="border border-gray-300 bg-gray-100 p-2 text-left">Player 2</th>
            <th className="border border-gray-300 bg-gray-100 p-2 text-center">First Move</th>
          </tr>
        </thead>
        <tbody>
          {pairings.map((pairing) => (
            <tr key={pairing.table_number}>
              <td className="border border-gray-300 p-2 text-left font-bold">
                {pairing.table_number}
              </td>
              <td className="border border-gray-300 p-2 text-left">
                <div>
                  <div className="font-medium">{pairing.player1.name}</div>
                  <div className="text-sm text-gray-600">
                    #{pairing.player1.rank} • Rating: {pairing.player1.rating}
                  </div>
                </div>
              </td>
              <td className="border border-gray-300 p-2 text-left">
                <div>
                  <div className="font-medium">{pairing.player2.name}</div>
                  <div className="text-sm text-gray-600">
                    #{pairing.player2.rank} • Rating: {pairing.player2.rating}
                  </div>
                </div>
              </td>
              <td className="border border-gray-300 p-2 text-center">
                {pairing.first_move_player_id === pairing.player1.id ? pairing.player1.name : pairing.player2.name}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </PrintableView>
  );
};

export default PrintablePairings;