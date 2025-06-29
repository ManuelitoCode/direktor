import React, { useState, useRef } from 'react';
import { Search, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown, Phone, Mail, ExternalLink, HelpCircle, User, Shield, Trophy, Settings, AlertTriangle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ParticleBackground from '../ParticleBackground';

interface FAQItem {
  id: string;
  question: string;
  answer: React.ReactNode;
  category: string;
  tags: string[];
}

interface FAQCategoryProps {
  title: string;
  icon: React.ReactNode;
  faqs: FAQItem[];
  isOpen: boolean;
  onToggle: () => void;
  searchQuery: string;
}

const FAQCategory: React.FC<FAQCategoryProps> = ({ 
  title, 
  icon, 
  faqs, 
  isOpen, 
  onToggle,
  searchQuery
}) => {
  // Filter FAQs based on search query
  const filteredFaqs = searchQuery 
    ? faqs.filter(faq => 
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (typeof faq.answer === 'string' && faq.answer.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : faqs;
    
  if (searchQuery && filteredFaqs.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 bg-gray-900/50 border border-gray-700 rounded-xl overflow-hidden backdrop-blur-sm">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-800/50 transition-colors duration-200"
      >
        <div className="flex items-center gap-3">
          {icon}
          <h2 className="text-xl font-bold text-white font-orbitron">{title}</h2>
          {searchQuery && filteredFaqs.length > 0 && (
            <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full border border-blue-500/50">
              {filteredFaqs.length} result{filteredFaqs.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {isOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
      </button>
      
      {isOpen && (
        <div className="border-t border-gray-700">
          {filteredFaqs.map((faq) => (
            <FAQItem key={faq.id} faq={faq} />
          ))}
        </div>
      )}
    </div>
  );
};

interface FAQItemProps {
  faq: FAQItem;
}

const FAQItem: React.FC<FAQItemProps> = ({ faq }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState<'helpful' | 'not-helpful' | null>(null);
  const answerRef = useRef<HTMLDivElement>(null);

  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };

  const handleFeedback = (type: 'helpful' | 'not-helpful') => {
    setFeedback(type);
    // In a real app, you would send this feedback to your backend
    console.log(`User found FAQ "${faq.question}" ${type}`);
  };

  return (
    <div className="border-t border-gray-700 last:border-b-0">
      <button
        onClick={toggleOpen}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-800/30 transition-colors duration-200"
      >
        <h3 className="text-lg font-medium text-white font-jetbrains">{faq.question}</h3>
        {isOpen ? <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />}
      </button>
      
      {isOpen && (
        <div className="px-4 pb-4">
          <div 
            ref={answerRef}
            className="prose prose-invert prose-sm max-w-none text-gray-300 font-jetbrains mb-4"
          >
            {faq.answer}
          </div>
          
          <div className="flex items-center justify-between border-t border-gray-700 pt-4 mt-4">
            <div className="text-sm text-gray-400">
              Was this helpful?
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleFeedback('helpful')}
                className={`p-2 rounded-lg transition-colors duration-200 ${
                  feedback === 'helpful' 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                    : 'hover:bg-gray-700 text-gray-400'
                }`}
                aria-label="This answer was helpful"
              >
                <ThumbsUp size={16} />
              </button>
              <button
                onClick={() => handleFeedback('not-helpful')}
                className={`p-2 rounded-lg transition-colors duration-200 ${
                  feedback === 'not-helpful' 
                    ? 'bg-red-500/20 text-red-400 border border-red-500/50' 
                    : 'hover:bg-gray-700 text-gray-400'
                }`}
                aria-label="This answer was not helpful"
              >
                <ThumbsDown size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const HelpFAQPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    'getting-started': true,
    'account': false,
    'features': false,
    'troubleshooting': false,
    'privacy': false
  });

  const toggleCategory = (category: string) => {
    setOpenCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  // Define FAQ items
  const faqItems: FAQItem[] = [
    // Getting Started
    {
      id: 'create-tournament',
      question: 'How do I create a new tournament?',
      answer: (
        <div>
          <p>Creating a new tournament is simple:</p>
          <ol className="list-decimal pl-5 space-y-2 mt-2">
            <li>Click on the "Create New" button in the sidebar navigation</li>
            <li>Fill in the basic tournament information (name, date, venue)</li>
            <li>Select the number of rounds and divisions</li>
            <li>Choose whether it's a team tournament or individual tournament</li>
            <li>Select your preferred pairing system</li>
            <li>Review your settings and click "Create Tournament"</li>
          </ol>
          <p className="mt-2">After creating your tournament, you'll be directed to the player registration page where you can add participants.</p>
        </div>
      ),
      category: 'getting-started',
      tags: ['new tournament', 'create', 'setup']
    },
    {
      id: 'tournament-types',
      question: 'What tournament types are supported?',
      answer: (
        <div>
          <p>Direktor supports three main tournament types:</p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li><strong>Individual Tournaments:</strong> Standard format where players compete individually</li>
            <li><strong>Team Tournaments:</strong> Players are organized into teams, with team standings calculated based on individual results</li>
            <li><strong>Triumvirate Tournaments:</strong> A specialized team format with two phases, where teams are regrouped after Phase 1 based on performance</li>
          </ul>
          <p className="mt-2">Each tournament type has specific features and pairing systems optimized for that format.</p>
        </div>
      ),
      category: 'getting-started',
      tags: ['tournament types', 'individual', 'team', 'triumvirate']
    },
    {
      id: 'pairing-systems',
      question: 'What pairing systems are available?',
      answer: (
        <div>
          <p>Direktor offers several pairing systems to suit different tournament needs:</p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li><strong>Swiss:</strong> Standard pairing system that matches players with similar records</li>
            <li><strong>Fonte-Swiss:</strong> Modified Swiss that pairs within score groups for better accuracy</li>
            <li><strong>King of the Hill:</strong> Pairs top players against bottom players for maximum spread</li>
            <li><strong>Round Robin:</strong> Everyone plays everyone once (best for small tournaments)</li>
            <li><strong>Team Round Robin:</strong> Each team plays every other team once</li>
            <li><strong>Manual Pairing:</strong> Create your own pairings manually for each round</li>
            <li><strong>Triumvirate:</strong> Specialized system for Triumvirate mode tournaments</li>
          </ul>
          <p className="mt-2">The system will recommend the best pairing method based on your tournament size and goals.</p>
        </div>
      ),
      category: 'getting-started',
      tags: ['pairing', 'swiss', 'round robin', 'king of hill']
    },
    {
      id: 'tournament-workflow',
      question: 'What is the typical tournament workflow?',
      answer: (
        <div>
          <p>Running a tournament follows these general steps:</p>
          <ol className="list-decimal pl-5 space-y-2 mt-2">
            <li><strong>Setup:</strong> Create the tournament and configure settings</li>
            <li><strong>Registration:</strong> Add players (and teams if applicable)</li>
            <li><strong>Pairings:</strong> Generate pairings for each round</li>
            <li><strong>Score Entry:</strong> Record game results as they complete</li>
            <li><strong>Standings:</strong> View current standings after each round</li>
            <li><strong>Repeat:</strong> Continue with steps 3-5 for each round</li>
            <li><strong>Completion:</strong> Mark tournament as complete and export results</li>
          </ol>
          <p className="mt-2">The tournament control center guides you through each step with a checklist to ensure nothing is missed.</p>
        </div>
      ),
      category: 'getting-started',
      tags: ['workflow', 'process', 'steps']
    },
    
    // Account Management
    {
      id: 'create-account',
      question: 'How do I create an account?',
      answer: (
        <div>
          <p>To create a new Direktor account:</p>
          <ol className="list-decimal pl-5 space-y-2 mt-2">
            <li>Click "Sign Up" on the homepage</li>
            <li>Enter your email address</li>
            <li>Create a secure password (at least 6 characters)</li>
            <li>Click "Create Account"</li>
          </ol>
          <p className="mt-2">Once your account is created, you'll be automatically logged in and can start creating tournaments immediately.</p>
        </div>
      ),
      category: 'account',
      tags: ['account', 'signup', 'registration']
    },
    {
      id: 'reset-password',
      question: 'How do I reset my password?',
      answer: (
        <div>
          <p>If you've forgotten your password:</p>
          <ol className="list-decimal pl-5 space-y-2 mt-2">
            <li>Click "Sign In" on the homepage</li>
            <li>Click the "Forgot Password?" link</li>
            <li>Enter your email address</li>
            <li>Check your email for a password reset link</li>
            <li>Click the link and create a new password</li>
          </ol>
          <p className="mt-2">For security reasons, password reset links expire after 24 hours.</p>
        </div>
      ),
      category: 'account',
      tags: ['password', 'reset', 'forgot']
    },
    {
      id: 'update-profile',
      question: 'How do I update my profile information?',
      answer: (
        <div>
          <p>To update your profile:</p>
          <ol className="list-decimal pl-5 space-y-2 mt-2">
            <li>Click on "Profile Settings" in the sidebar</li>
            <li>Edit your username, nickname, or other details</li>
            <li>Click "Save" to update your information</li>
          </ol>
          <p className="mt-2">You can also upload a profile picture by clicking on the avatar image and selecting a new photo.</p>
        </div>
      ),
      category: 'account',
      tags: ['profile', 'settings', 'update']
    },
    {
      id: 'delete-account',
      question: 'Can I delete my account?',
      answer: (
        <div>
          <p>Yes, you can delete your account and all associated data:</p>
          <ol className="list-decimal pl-5 space-y-2 mt-2">
            <li>Go to "Profile Settings" in the sidebar</li>
            <li>Scroll to the bottom of the page</li>
            <li>Click "Delete Account"</li>
            <li>Confirm your decision by entering your password</li>
          </ol>
          <p className="mt-2 text-red-400"><strong>Warning:</strong> This action is permanent and will delete all your tournaments, players, and results. Make sure to export any data you want to keep before deleting your account.</p>
        </div>
      ),
      category: 'account',
      tags: ['delete', 'account', 'remove']
    },
    
    // Core Features
    {
      id: 'player-registration',
      question: 'How do I register players for a tournament?',
      answer: (
        <div>
          <p>There are several ways to register players:</p>
          <ol className="list-decimal pl-5 space-y-2 mt-2">
            <li><strong>Manual Entry:</strong> Enter player names and ratings one by one using the "Add Player" button</li>
            <li><strong>Bulk Import:</strong> Enter multiple players at once in the text area using the format "Name, Rating" (one player per line)</li>
            <li><strong>CSV Import:</strong> For team tournaments, you can upload a CSV file with columns for Name, Rating, and Team</li>
          </ol>
          <p className="mt-2">For team tournaments, make sure to assign each player to a team. For Triumvirate mode, you'll need exactly 36 teams with an equal number of players per team.</p>
        </div>
      ),
      category: 'features',
      tags: ['players', 'registration', 'import']
    },
    {
      id: 'generate-pairings',
      question: 'How do I generate pairings for a round?',
      answer: (
        <div>
          <p>To generate pairings for a round:</p>
          <ol className="list-decimal pl-5 space-y-2 mt-2">
            <li>Go to the "Rounds" tab in the tournament control center</li>
            <li>Select the round you want to pair</li>
            <li>Choose your pairing options (system, rematch avoidance, etc.)</li>
            <li>Click "Regenerate" if you want to try different pairings</li>
            <li>When satisfied, click "Save Pairings & Lock" to finalize</li>
          </ol>
          <p className="mt-2">Once pairings are locked, you can view them, print them, or export them to CSV. You can also share the public tournament link for players to view their pairings.</p>
        </div>
      ),
      category: 'features',
      tags: ['pairings', 'rounds', 'matchups']
    },
    {
      id: 'enter-scores',
      question: 'How do I enter game scores?',
      answer: (
        <div>
          <p>To enter scores for completed games:</p>
          <ol className="list-decimal pl-5 space-y-2 mt-2">
            <li>Go to the "Scores" tab in the tournament control center</li>
            <li>Enter the scores for each pairing</li>
            <li>You can use voice input by clicking the microphone icon</li>
            <li>The system automatically determines the winner based on scores</li>
            <li>Click "Submit Scores & View Standings" when all scores are entered</li>
          </ol>
          <p className="mt-2">You can also edit scores from previous rounds by selecting the round from the dropdown menu at the top of the score entry page.</p>
        </div>
      ),
      category: 'features',
      tags: ['scores', 'results', 'entry']
    },
    {
      id: 'view-standings',
      question: 'How do I view tournament standings?',
      answer: (
        <div>
          <p>To view current tournament standings:</p>
          <ol className="list-decimal pl-5 space-y-2 mt-2">
            <li>Go to the "Standings" tab in the tournament control center</li>
            <li>Players are ranked by wins, then spread, then rating</li>
            <li>You can export standings to CSV by clicking the "Export" button</li>
            <li>Click on a player's name to view their detailed performance</li>
          </ol>
          <p className="mt-2">For team tournaments, you can view both team standings and individual player standings by switching between tabs.</p>
        </div>
      ),
      category: 'features',
      tags: ['standings', 'rankings', 'results']
    },
    {
      id: 'share-tournament',
      question: 'How do I share my tournament with players and spectators?',
      answer: (
        <div>
          <p>There are several ways to share your tournament:</p>
          <ol className="list-decimal pl-5 space-y-2 mt-2">
            <li>Click "View Public" to open the public tournament page</li>
            <li>Click "QR Code" to generate a QR code that links to your tournament</li>
            <li>Copy the tournament URL and share it via email, messaging, or social media</li>
          </ol>
          <p className="mt-2">The public tournament page shows live standings, pairings, and results. It automatically updates as you enter new scores, so players and spectators always see the latest information.</p>
        </div>
      ),
      category: 'features',
      tags: ['share', 'public', 'qr code']
    },
    {
      id: 'export-data',
      question: 'How do I export tournament data?',
      answer: (
        <div>
          <p>You can export tournament data in several formats:</p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li><strong>CSV Export:</strong> Available for players, pairings, and standings</li>
            <li><strong>.TOU File:</strong> For submitting results to rating organizations (WESPA, NASPA, etc.)</li>
            <li><strong>Player Summaries:</strong> Individual player performance reports</li>
          </ul>
          <p className="mt-2">To export data, look for the "Export" or "Download" buttons in the respective sections of the tournament control center. For .TOU files, go to the "Admin" tab and click "Export .TOU File".</p>
        </div>
      ),
      category: 'features',
      tags: ['export', 'download', 'tou', 'csv']
    },
    {
      id: 'triumvirate-mode',
      question: 'What is Triumvirate Mode?',
      answer: (
        <div>
          <p>Triumvirate Mode is a specialized team tournament format with two distinct phases:</p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li><strong>Phase 1 (Rounds 1-15):</strong> 36 teams are divided into 6 groups (A-F) with 6 teams each. Teams play against teams from other groups.</li>
            <li><strong>Phase 2 (Rounds 16-30):</strong> Teams are regrouped based on their Phase 1 performance. All 1st place teams form Group A, all 2nd place teams form Group B, and so on.</li>
          </ul>
          <p className="mt-2">This format ensures that teams compete against others of similar skill level in Phase 2, creating more competitive and balanced matchups.</p>
          <p className="mt-2">To use Triumvirate Mode, select "Team Tournament" and "Triumvirate Mode" when creating a new tournament.</p>
        </div>
      ),
      category: 'features',
      tags: ['triumvirate', 'team', 'phases']
    },
    
    // Troubleshooting
    {
      id: 'connection-issues',
      question: 'I\'m having connection issues. What should I do?',
      answer: (
        <div>
          <p>If you're experiencing connection problems:</p>
          <ol className="list-decimal pl-5 space-y-2 mt-2">
            <li>Check your internet connection</li>
            <li>Try refreshing the page</li>
            <li>Clear your browser cache and cookies</li>
            <li>Try using a different browser</li>
            <li>Disable any VPN or proxy services that might be interfering</li>
          </ol>
          <p className="mt-2">Direktor has offline capabilities, so you can continue working even with intermittent connection issues. Your changes will sync automatically when your connection is restored.</p>
        </div>
      ),
      category: 'troubleshooting',
      tags: ['connection', 'offline', 'internet']
    },
    {
      id: 'missing-data',
      question: 'My tournament data is missing or incorrect. How can I recover it?',
      answer: (
        <div>
          <p>If you notice missing or incorrect data:</p>
          <ol className="list-decimal pl-5 space-y-2 mt-2">
            <li>Check if you're logged into the correct account</li>
            <li>Try refreshing the page or restarting your browser</li>
            <li>Look for any error messages that might indicate the problem</li>
            <li>Check if you have any unsaved drafts in the dashboard</li>
            <li>If you previously exported data, you can re-import it</li>
          </ol>
          <p className="mt-2">If you're still experiencing issues, please contact support with details about what data is missing or incorrect.</p>
        </div>
      ),
      category: 'troubleshooting',
      tags: ['data', 'missing', 'recovery']
    },
    {
      id: 'pairing-issues',
      question: 'The pairing system isn\'t working as expected. What should I check?',
      answer: (
        <div>
          <p>If you're having issues with pairings:</p>
          <ol className="list-decimal pl-5 space-y-2 mt-2">
            <li>Verify that you've selected the appropriate pairing system for your tournament</li>
            <li>Check if you have an odd number of players (which will result in a bye)</li>
            <li>Ensure all players have the correct status (active, paused, or withdrawn)</li>
            <li>Try regenerating the pairings to get a different set</li>
            <li>For team tournaments, make sure teams have equal numbers of players</li>
          </ol>
          <p className="mt-2">If you need specific pairings that the system isn't generating, consider using the Manual Pairing option to create exactly the matchups you want.</p>
        </div>
      ),
      category: 'troubleshooting',
      tags: ['pairings', 'matchups', 'issues']
    },
    {
      id: 'browser-compatibility',
      question: 'Which browsers are supported?',
      answer: (
        <div>
          <p>Direktor works best with modern browsers. We recommend:</p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li>Google Chrome (latest version)</li>
            <li>Mozilla Firefox (latest version)</li>
            <li>Microsoft Edge (latest version)</li>
            <li>Safari (latest version)</li>
          </ul>
          <p className="mt-2">For the best experience, keep your browser updated to the latest version. Some features like voice input for score entry may not work in all browsers.</p>
        </div>
      ),
      category: 'troubleshooting',
      tags: ['browser', 'compatibility', 'support']
    },
    
    // Privacy & Security
    {
      id: 'data-privacy',
      question: 'How is my tournament data protected?',
      answer: (
        <div>
          <p>We take data protection seriously:</p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li>All data is stored securely in Supabase's encrypted database</li>
            <li>Connections between your browser and our servers are encrypted with HTTPS</li>
            <li>Row-level security ensures you can only access your own tournaments</li>
            <li>Regular backups protect against data loss</li>
            <li>You control who can view your tournament with public sharing settings</li>
          </ul>
          <p className="mt-2">We never share your data with third parties without your explicit consent.</p>
        </div>
      ),
      category: 'privacy',
      tags: ['privacy', 'security', 'data protection']
    },
    {
      id: 'password-protection',
      question: 'Can I password-protect my tournament?',
      answer: (
        <div>
          <p>Yes, you can add password protection to your public tournament page:</p>
          <ol className="list-decimal pl-5 space-y-2 mt-2">
            <li>Go to the "Admin" tab in your tournament control center</li>
            <li>Scroll to the "Sharing Settings" section</li>
            <li>Enable "Password Protection"</li>
            <li>Enter your desired password</li>
            <li>Click "Save Settings"</li>
          </ol>
          <p className="mt-2">When password protection is enabled, visitors will need to enter the password before they can view your tournament standings and pairings.</p>
        </div>
      ),
      category: 'privacy',
      tags: ['password', 'protection', 'security']
    },
    {
      id: 'data-retention',
      question: 'How long is my tournament data retained?',
      answer: (
        <div>
          <p>Your tournament data is retained as follows:</p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li>Active tournaments: Indefinitely while your account is active</li>
            <li>Completed tournaments: Indefinitely while your account is active</li>
            <li>Tournament drafts: 30 days after last modification</li>
            <li>Deleted tournaments: Permanently removed immediately</li>
            <li>Account deletion: All associated data is permanently removed</li>
          </ul>
          <p className="mt-2">We recommend exporting important tournament data regularly for your own records, especially for completed tournaments you want to preserve long-term.</p>
        </div>
      ),
      category: 'privacy',
      tags: ['retention', 'deletion', 'storage']
    }
  ];

  // Group FAQs by category
  const faqsByCategory = {
    'getting-started': faqItems.filter(item => item.category === 'getting-started'),
    'account': faqItems.filter(item => item.category === 'account'),
    'features': faqItems.filter(item => item.category === 'features'),
    'troubleshooting': faqItems.filter(item => item.category === 'troubleshooting'),
    'privacy': faqItems.filter(item => item.category === 'privacy')
  };

  // Get most frequently accessed questions (in a real app, this would be based on analytics)
  const popularFaqs = [
    faqItems.find(item => item.id === 'create-tournament'),
    faqItems.find(item => item.id === 'player-registration'),
    faqItems.find(item => item.id === 'generate-pairings'),
    faqItems.find(item => item.id === 'enter-scores')
  ].filter(Boolean) as FAQItem[];

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 relative overflow-hidden">
      <ParticleBackground />
      
      <div className="relative z-10 min-h-screen flex flex-col px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12 max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors duration-200"
            >
              <span className="font-jetbrains">← Back</span>
            </button>
            <div className="flex items-center gap-2 text-blue-400">
              <HelpCircle size={24} />
              <span className="font-jetbrains text-sm">Help Center</span>
            </div>
          </div>

          <h1 className="glitch-text fade-up text-4xl md:text-6xl font-bold mb-4 text-white font-orbitron tracking-wider"
              data-text="HELP & FAQ">
            HELP & FAQ
          </h1>
          
          <p className="fade-up fade-up-delay-1 text-xl md:text-2xl text-blue-400 mb-4 font-medium">
            Find answers to common questions
          </p>
          
          <div className="fade-up fade-up-delay-3 w-24 h-1 bg-gradient-to-r from-blue-500 to-green-500 mx-auto rounded-full"></div>
        </div>

        {/* Search Bar */}
        <div className="max-w-4xl mx-auto w-full mb-8">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for help topics..."
              className="block w-full pl-10 pr-10 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 font-jetbrains"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Links (only show when not searching) */}
        {!searchQuery && (
          <div className="max-w-4xl mx-auto w-full mb-8">
            <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-6 backdrop-blur-sm">
              <h2 className="text-xl font-bold text-white font-orbitron mb-4">
                Popular Questions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {popularFaqs.map(faq => (
                  <button
                    key={faq.id}
                    onClick={() => {
                      // Open the category containing this FAQ
                      const category = faq.category;
                      setOpenCategories(prev => ({
                        ...prev,
                        [category]: true
                      }));
                      
                      // Scroll to the FAQ (in a real app, you'd use a ref)
                      setTimeout(() => {
                        document.getElementById(faq.id)?.scrollIntoView({ behavior: 'smooth' });
                      }, 100);
                    }}
                    className="text-left p-4 bg-gray-800/50 border border-gray-700 rounded-lg hover:bg-gray-700/50 hover:border-blue-500/50 transition-all duration-200"
                  >
                    <h3 className="text-white font-medium font-jetbrains">{faq.question}</h3>
                    <div className="flex items-center gap-1 mt-2 text-blue-400 text-sm">
                      <ChevronDown size={14} />
                      <span>View answer</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* FAQ Categories */}
        <div className="max-w-4xl mx-auto w-full mb-8">
          <FAQCategory
            title="Getting Started"
            icon={<Trophy className="w-6 h-6 text-green-400" />}
            faqs={faqsByCategory['getting-started']}
            isOpen={openCategories['getting-started']}
            onToggle={() => toggleCategory('getting-started')}
            searchQuery={searchQuery}
          />
          
          <FAQCategory
            title="Account Management"
            icon={<User className="w-6 h-6 text-blue-400" />}
            faqs={faqsByCategory['account']}
            isOpen={openCategories['account']}
            onToggle={() => toggleCategory('account')}
            searchQuery={searchQuery}
          />
          
          <FAQCategory
            title="Features & Functionality"
            icon={<Settings className="w-6 h-6 text-purple-400" />}
            faqs={faqsByCategory['features']}
            isOpen={openCategories['features']}
            onToggle={() => toggleCategory('features')}
            searchQuery={searchQuery}
          />
          
          <FAQCategory
            title="Troubleshooting"
            icon={<AlertTriangle className="w-6 h-6 text-yellow-400" />}
            faqs={faqsByCategory['troubleshooting']}
            isOpen={openCategories['troubleshooting']}
            onToggle={() => toggleCategory('troubleshooting')}
            searchQuery={searchQuery}
          />
          
          <FAQCategory
            title="Privacy & Security"
            icon={<Shield className="w-6 h-6 text-red-400" />}
            faqs={faqsByCategory['privacy']}
            isOpen={openCategories['privacy']}
            onToggle={() => toggleCategory('privacy')}
            searchQuery={searchQuery}
          />
        </div>

        {/* Contact Support */}
        <div className="max-w-4xl mx-auto w-full mb-8">
          <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-xl p-6 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-white font-orbitron mb-4">
              Still Need Help?
            </h2>
            <p className="text-gray-300 font-jetbrains mb-6">
              If you couldn't find the answer you're looking for, our support team is ready to assist you.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                    <Phone className="w-5 h-5 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white font-orbitron">Phone Support</h3>
                </div>
                <p className="text-gray-300 font-jetbrains mb-3">
                  Call us directly for immediate assistance with urgent issues.
                </p>
                <a 
                  href="tel:+2348136632593" 
                  className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors duration-200"
                >
                  <Phone size={16} />
                  +234 813 6632 593
                </a>
              </div>
              
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                    <Mail className="w-5 h-5 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white font-orbitron">Email Support</h3>
                </div>
                <p className="text-gray-300 font-jetbrains mb-3">
                  Send us a detailed message and we'll respond within 24 hours.
                </p>
                <a 
                  href="mailto:support@direktorapp.com" 
                  className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors duration-200"
                >
                  <Mail size={16} />
                  support@direktorapp.com
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center mt-auto">
          <p className="text-gray-500 text-sm font-light tracking-wider">
            Last updated: June 29, 2025
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default HelpFAQPage;