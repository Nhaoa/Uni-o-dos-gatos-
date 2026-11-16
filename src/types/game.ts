export type PlayerRole = 'cat1' | 'cat2';

export type BreedType = 'white' | 'orange' | 'tuxedo' | 'siamese';
export type OutfitType =
  | 'none'
  | 'red_dress'
  | 'red_gown'
  | 'red_sweater'
  | 'red_hoodie'
  | 'red_overalls'
  | 'red_cape'
  | 'anime_jojo'
  | 'anime_fma'
  | 'anime_baki'
  | 'anime_darling'
  | 'anime_apotecaria'
  | 'anime_ghibli'
  | 'anime_dandadan'
  | 'anime_ghoul'
  | 'anime_aot'
  | 'anime_sao';
export type AccessoryType =
  | 'none'
  | 'star'
  | 'bowtie'
  | 'glasses'
  | 'flower'
  | 'crown'
  | 'half_heart_left'
  | 'half_heart_right'
  | 'ribbon_pair'
  | 'anime_jojo_hat'
  | 'anime_fma_ahoge'
  | 'anime_baki_band'
  | 'anime_darling_horns'
  | 'anime_apotecaria_jade'
  | 'anime_ghibli_kiki'
  | 'anime_ghibli_leaf'
  | 'anime_dandadan_visor'
  | 'anime_ghoul_eyepatch'
  | 'anime_sao_visor';
export type EyeShapeType = 'almond' | 'round' | 'anime';
export type PupilType = 'round' | 'slit' | 'sparkle' | 'heart';
export type MouthType = 'cat' | 'tongue' | 'vampire' | 'smile';
export type ExpressionType = 'happy' | 'pet';
export type BedType = 'classic' | 'royal' | 'basket' | 'cloud' | 'sputnik' | 'kotatsu';

export interface CatState {
  breed: BreedType;
  outfit: OutfitType;
  outfitColor: string;
  accessory: AccessoryType;
  accessoryColor: string;
  expression: ExpressionType;
  eyeShape: EyeShapeType;
  eyeColor: string;
  pupil: PupilType;
  pupilColor: string;
  mouth: MouthType;
  bed?: BedType;
  bedColor?: string;
  isSleeping?: boolean;
  hunger: number;
  energy: number;
  happiness: number;
  speech: string;
}

export interface Wallet {
  fish: number;
  paws: number;
  coupleCoins: number;
}

export type Inventory = Record<string, number>;

export interface LetterMessage {
  id: string;
  from: PlayerRole;
  authorName: string;
  text: string;
  timestamp: number;
  timeFormatted: string;
}

export interface SkyHopLeaderboardEntry {
  id: string;
  role: PlayerRole;
  nickname: string;
  altitude: number;
  level: number;
  scenarioLabel: string;
  timestamp: number;
}

export type MinigameId =
  | 'chess'
  | 'checkers'
  | 'jokenpo'
  | 'tictactoe'
  | 'reaction'
  | 'airhockey'
  | 'skyhop'
  | 'sudoku'
  | 'solitaire'
  | 'termo';

export type MinigamePlayMode = 'online' | 'local' | 'bot';

export interface PlayerActiveGameStatus {
  game: MinigameId;
  mode: MinigamePlayMode;
  label: string;
  icon: string;
  updatedAt: number;
}

export type AchievementGameId =
  | 'skyhop'
  | 'chess'
  | 'checkers'
  | 'airhockey'
  | 'tictactoe'
  | 'jokenpo'
  | 'reaction'
  | 'sudoku'
  | 'solitaire'
  | 'termo'
  | 'global';

export type AchievementRarity = 'bronze' | 'prata' | 'ouro' | 'cosmico';

export interface PlayerAchievementStats {
  skyhopMaxAltitude: number;
  skyhopTotalAltitude: number;
  skyhopFishEarned: number;
  skyhopPawsEarned?: number;
  skyhopMaxPerfectCombo: number;
  skyhopPortalsUsed: number;
  skyhopGamesPlayed: number;
  chessWins: number;
  chessFastWins: number;
  chessPromotions: number;
  checkersWins: number;
  checkersMultiCaptures: number;
  airhockeyWins: number;
  airhockeyShutouts: number;
  airhockeyGoals: number;
  tttWins: number;
  tttDraws: number;
  jokenpoWins: number;
  jokenpoWinStreak: number;
  jokenpoBestStreak: number;
  reactionWins: number;
  reactionBestMs: number | null;
  sudokuWins: number;
  sudokuHard9Wins: number;
  sudokuOnlineWins: number;
  solitaireWins: number;
  solitaireHardWins: number;
  termoWins: number;
  termoDuetoWins: number;
  termoQuartetoWins: number;
}

export type JokenpoChoice = '' | 'rock' | 'paper' | 'scissors';

export interface JokenpoRoomState {
  p1InRoom: boolean;
  p2InRoom: boolean;
  p1Choice: JokenpoChoice;
  p2Choice: JokenpoChoice;
  state: 'waiting' | 'revealing' | 'finished';
  roundId: number;
}

export interface ReactionRoomState {
  p1InRoom: boolean;
  p2InRoom: boolean;
  state: 'idle' | 'waiting' | 'ready' | 'finished';
  winner: PlayerRole | '';
  winnerTimeMs?: number;
}

export interface TicTacToeRoomState {
  p1InRoom: boolean;
  p2InRoom: boolean;
  board: string[];
  turn: PlayerRole;
  winner: string;
  winningLine: number[] | null;
}

export interface AirHockeyOnlineState {
  p1InRoom: boolean;
  p2InRoom: boolean;
  running: boolean;
  puck: { x: number; y: number; vx: number; vy: number };
  p1: { x: number; y: number };
  p2: { x: number; y: number };
  score1: number;
  score2: number;
  winner: PlayerRole | '';
}

export type SudokuSize = 4 | 6 | 9;
export type SudokuDifficulty = 'easy' | 'medium' | 'hard' | 'expert';
export type SudokuSoloMode = 'classic' | 'zen' | 'timed';

export interface SudokuPlayerProgress {
  filled: number;
  totalToFill: number;
  mistakes: number;
  finished: boolean;
  elapsedMs: number | null;
}

export interface SudokuOnlineRoomState {
  p1InRoom: boolean;
  p2InRoom: boolean;
  status: 'lobby' | 'playing' | 'finished';
  matchId: number;
  size: SudokuSize;
  difficulty: SudokuDifficulty;
  puzzle: number[];
  solution: number[];
  startedAt: number | null;
  winner: PlayerRole | '';
  progress: Record<PlayerRole, SudokuPlayerProgress>;
}

export type ChessPieceType = 'p' | 'r' | 'n' | 'b' | 'q' | 'k';
export type PieceColor = 'white' | 'black';

export interface ChessSquarePiece {
  piece: ChessPieceType;
  color: PieceColor;
}

export interface CastlingRights {
  wK: boolean;
  wQ: boolean;
  bK: boolean;
  bQ: boolean;
}

export interface BoardCoord {
  r: number;
  c: number;
}

export interface ChessState {
  board: (ChessSquarePiece | null)[][];
  turn: PieceColor;
  castlingRights: CastlingRights;
  enPassantTarget: BoardCoord | null;
  halfMoveClock: number;
  fullMoveNumber: number;
  moveHistory: string[];
  lastMove: { from: BoardCoord; to: BoardCoord } | null;
  status: 'playing' | 'check' | 'checkmate' | 'stalemate' | 'draw';
  winner: PieceColor | 'draw' | null;
}

export type CheckersPieceType = 'M' | 'K';

export interface CheckersSquarePiece {
  piece: CheckersPieceType;
  color: PieceColor;
}

export interface CheckersState {
  board: (CheckersSquarePiece | null)[][];
  turn: PieceColor;
  mustContinueFrom: BoardCoord | null;
  moveHistory: string[];
  lastMove: { from: BoardCoord; to: BoardCoord } | null;
  status: 'playing' | 'finished';
  winner: PieceColor | 'draw' | null;
}

export interface BoardMatchConfig {
  playMode: MinigamePlayMode;
  colorAssignment: 'cat1_white' | 'cat2_white';
  whitePlayerName: string;
  blackPlayerName: string;
  timeLimit: number | null;
  whiteTime: number;
  blackTime: number;
  isMatchStarted: boolean;
  p1InRoom: boolean;
  p2InRoom: boolean;
  chatMessages: { id: string; author: string; text: string; time: string }[];
}

export type GalleryExhibitKind = 'site' | 'image' | 'video';
export type GalleryFrameStyle = 'gold' | 'oak' | 'modern' | 'crimson';
export type GalleryMediaStorage = 'drive' | 'url' | 'inline';

export interface GalleryDriveFolderConfig {
  folderId: string;
  folderName: string;
  webViewLink?: string;
  ownerEmail?: string;
  updatedAt: number;
}

export interface GalleryExhibit {
  id: string;
  kind: GalleryExhibitKind;
  title: string;
  description: string;
  url?: string;
  imageUrl?: string;
  videoUrl?: string;
  driveFileId?: string;
  driveFolderId?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  storage?: GalleryMediaStorage;
  frameStyle: GalleryFrameStyle;
  addedBy: PlayerRole;
  authorName: string;
  occasionDate?: string;
  createdAt: number;
  isStarter?: boolean;
}

export interface SharedState {
  roomPassword: string;
  nicknames: Record<PlayerRole, string>;
  loveScore: number;
  streak: {
    current: number;
    best: number;
    totalDays: number;
  };
  scores: {
    cat1Wins: number;
    cat1Losses?: number;
    cat2Wins: number;
    cat2Losses?: number;
    ties: number;
  };
  presence: {
    syncedToday: boolean;
    lastSyncedDate: string;
  };
  wallets: Record<PlayerRole, Wallet>;
  inventories: Record<PlayerRole, Inventory>;
  unlockedItems: Record<PlayerRole, string[]>;
  lastRewardDates: Record<PlayerRole, string>;
  lastStatsUpdateTime: number;
  cat1: CatState;
  cat2: CatState;
  letters: LetterMessage[];
  activeGames?: Record<PlayerRole, PlayerActiveGameStatus | null>;
  onlineRooms: {
    jokenpo: JokenpoRoomState;
    reaction: ReactionRoomState;
    tictactoe: TicTacToeRoomState;
    airhockey: AirHockeyOnlineState;
    sudoku?: SudokuOnlineRoomState;
  };
  boardGames: {
    chess: { state: ChessState; config: BoardMatchConfig };
    checkers: { state: CheckersState; config: BoardMatchConfig };
  };
  skyHopLeaderboard?: SkyHopLeaderboardEntry[];
  achievements?: Record<PlayerRole, Record<string, number>>;
  achievementStats?: Record<PlayerRole, PlayerAchievementStats>;
  galleryItems?: GalleryExhibit[];
  galleryDriveFolder?: GalleryDriveFolderConfig | null;
}
