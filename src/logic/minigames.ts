import { CatState, JokenpoChoice, PlayerRole } from '../types/game';

export interface FoodItemDef {
  id: string;
  name: string;
  icon: string;
  price: number;
  hunger: number;
  energy: number;
  joy: number;
}

export const FOOD_ITEMS: FoodItemDef[] = [
  { id: 'food_bread', name: 'Pão Caseiro', icon: '🍞', price: 24, hunger: 28, energy: 5, joy: 4 },
  { id: 'food_milk', name: 'Leite Integral', icon: '🥛', price: 36, hunger: 14, energy: 18, joy: 16 },
  { id: 'food_salmon', name: 'Salmão Grelhado', icon: '🐟', price: 60, hunger: 46, energy: 14, joy: 26 },
  { id: 'food_starfruit', name: 'Carambola Doce', icon: '⭐', price: 50, hunger: 18, energy: 35, joy: 22 },
  { id: 'food_steak', name: 'Bife Grelhado', icon: '🥩', price: 100, hunger: 70, energy: 20, joy: 32 },
  { id: 'food_potion', name: 'Elixir Energético', icon: '🧪', price: 160, hunger: 40, energy: 65, joy: 55 },
];

export function applyFoodToCat(cat: CatState, food: FoodItemDef): CatState {
  return {
    ...cat,
    isSleeping: false,
    hunger: Math.min(100, cat.hunger + food.hunger),
    happiness: Math.min(100, cat.happiness + food.joy),
    energy: Math.min(100, cat.energy + food.energy),
    expression: 'pet',
    speech: `Nham nham! ${food.name} delicioso! ${food.icon}`,
  };
}

export interface ShopItemDef {
  id: string;
  type: 'outfit' | 'pupil' | 'eyeShape' | 'accessory' | 'breed' | 'mouth' | 'bed';
  val: string;
  name: string;
  price: number;
  currency?: 'fish' | 'couple';
  icon: string;
}

export type ShopCategory =
  | 'roupas'
  | 'acessorios'
  | 'caminhas'
  | 'anime'
  | 'racas'
  | 'olhos'
  | 'pupilas'
  | 'bocas';

export const VIP_CATALOG: Record<ShopCategory, ShopItemDef[]> = {
  roupas: [
    { id: 'outfit_none', type: 'outfit', val: 'none', name: 'Sem Roupa', price: 0, icon: '🐾' },
    { id: 'outfit_red_dress', type: 'outfit', val: 'red_dress', name: 'Vestido Vermelho', price: 0, icon: '👗' },
    { id: 'outfit_red_gown', type: 'outfit', val: 'red_gown', name: 'Vestido de Gala', price: 0, icon: '💃' },
    { id: 'outfit_red_sweater', type: 'outfit', val: 'red_sweater', name: 'Suéter Tricô', price: 0, icon: '🧶' },
    { id: 'outfit_red_hoodie', type: 'outfit', val: 'red_hoodie', name: 'Moletom Aconchego', price: 0, icon: '🧥' },
    { id: 'outfit_red_overalls', type: 'outfit', val: 'red_overalls', name: 'Jardineira Operária', price: 0, icon: '👖' },
    { id: 'outfit_red_cape', type: 'outfit', val: 'red_cape', name: 'Capa Carmesim', price: 0, icon: '🧣' },
  ],
  pupilas: [
    { id: 'pupil_round', type: 'pupil', val: 'round', name: 'Redonda Clássica', price: 0, icon: '⚪' },
    { id: 'pupil_slit', type: 'pupil', val: 'slit', name: 'Fenda Felina', price: 6, icon: '👁️' },
    { id: 'pupil_sparkle', type: 'pupil', val: 'sparkle', name: 'Brilho Estelar', price: 9, icon: '✨' },
    { id: 'pupil_heart', type: 'pupil', val: 'heart', name: 'Coração Ardente', price: 12, icon: '💖' },
  ],
  olhos: [
    { id: 'shape_almond', type: 'eyeShape', val: 'almond', name: 'Amêndoa Suave', price: 0, icon: '👁️' },
    { id: 'shape_round', type: 'eyeShape', val: 'round', name: 'Redondo Grande', price: 6, icon: '🥺' },
    { id: 'shape_anime', type: 'eyeShape', val: 'anime', name: 'Brilho Anime', price: 10, icon: '🌟' },
  ],
  anime: [
    // JoJo's Bizarre Adventure
    { id: 'outfit_anime_jojo', type: 'outfit', val: 'anime_jojo', name: 'Casaco Joestar (JoJo)', price: 2, currency: 'couple', icon: '⭐' },
    { id: 'acc_anime_jojo_hat', type: 'accessory', val: 'anime_jojo_hat', name: 'Quepe Estrela (JoJo)', price: 2, currency: 'couple', icon: '🧢' },
    // Fullmetal Alchemist
    { id: 'outfit_anime_fma', type: 'outfit', val: 'anime_fma', name: 'Manto Alquimista (FMA)', price: 2, currency: 'couple', icon: '⚗️' },
    { id: 'acc_anime_fma_ahoge', type: 'accessory', val: 'anime_fma_ahoge', name: 'Antena & Selo (FMA)', price: 1, currency: 'couple', icon: '⚡' },
    // Baki the Grappler
    { id: 'outfit_anime_baki', type: 'outfit', val: 'anime_baki', name: 'Cinturão Campeão (Baki)', price: 2, currency: 'couple', icon: '🥊' },
    { id: 'acc_anime_baki_band', type: 'accessory', val: 'anime_baki_band', name: 'Bandana & Cicatriz (Baki)', price: 1, currency: 'couple', icon: '🔥' },
    // Darling in the Franxx
    { id: 'outfit_anime_darling', type: 'outfit', val: 'anime_darling', name: 'Uniforme 02 (Franxx)', price: 2, currency: 'couple', icon: '🌺' },
    { id: 'acc_anime_darling_horns', type: 'accessory', val: 'anime_darling_horns', name: 'Chifres Zero Two (Franxx)', price: 2, currency: 'couple', icon: '😈' },
    // Diário de uma Apotecária
    { id: 'outfit_anime_apotecaria', type: 'outfit', val: 'anime_apotecaria', name: 'Hanfu Apotecária (Maomao)', price: 2, currency: 'couple', icon: '🌿' },
    { id: 'acc_anime_apotecaria_jade', type: 'accessory', val: 'anime_apotecaria_jade', name: 'Grampo de Jade (Maomao)', price: 1, currency: 'couple', icon: '🪷' },
    // Studio Ghibli
    { id: 'outfit_anime_ghibli', type: 'outfit', val: 'anime_ghibli', name: 'Túnica Kiki (Ghibli)', price: 2, currency: 'couple', icon: '🧹' },
    { id: 'acc_anime_ghibli_kiki', type: 'accessory', val: 'anime_ghibli_kiki', name: 'Laço Kiki (Ghibli)', price: 1, currency: 'couple', icon: '🎀' },
    { id: 'acc_anime_ghibli_leaf', type: 'accessory', val: 'anime_ghibli_leaf', name: 'Folha Totoro (Ghibli)', price: 1, currency: 'couple', icon: '🍃' },
    // Dandadan
    { id: 'outfit_anime_dandadan', type: 'outfit', val: 'anime_dandadan', name: 'Jaqueta Ocultista (Dandadan)', price: 2, currency: 'couple', icon: '🛸' },
    { id: 'acc_anime_dandadan_visor', type: 'accessory', val: 'anime_dandadan_visor', name: 'Máscara Turbo (Dandadan)', price: 2, currency: 'couple', icon: '👻' },
    // Tokyo Ghoul
    { id: 'outfit_anime_ghoul', type: 'outfit', val: 'anime_ghoul', name: 'Traje Anteiku (Tokyo Ghoul)', price: 2, currency: 'couple', icon: '🖤' },
    { id: 'acc_anime_ghoul_eyepatch', type: 'accessory', val: 'anime_ghoul_eyepatch', name: 'Tapa-Olho Ghoul (Kaneki)', price: 2, currency: 'couple', icon: '👁️' },
    // Attack on Titan
    { id: 'outfit_anime_aot', type: 'outfit', val: 'anime_aot', name: 'Capa da Tropa (AoT)', price: 2, currency: 'couple', icon: '🦅' },
    // Sword Art Online
    { id: 'outfit_anime_sao', type: 'outfit', val: 'anime_sao', name: 'Espadachim Negro (SAO)', price: 2, currency: 'couple', icon: '⚔️' },
    { id: 'acc_anime_sao_visor', type: 'accessory', val: 'anime_sao_visor', name: 'NerveGear (SAO)', price: 2, currency: 'couple', icon: '🥽' },
  ],
  acessorios: [
    { id: 'acc_none', type: 'accessory', val: 'none', name: 'Nenhum', price: 0, icon: '🚫' },
    { id: 'acc_star', type: 'accessory', val: 'star', name: 'Estrela Dourada', price: 0, icon: '⭐' },
    { id: 'acc_bowtie', type: 'accessory', val: 'bowtie', name: 'Gravata Borboleta', price: 5, icon: '🎀' },
    { id: 'acc_glasses', type: 'accessory', val: 'glasses', name: 'Óculos Intelectuais', price: 8, icon: '👓' },
    { id: 'acc_flower', type: 'accessory', val: 'flower', name: 'Cravo Vermelho', price: 7, icon: '🌺' },
    { id: 'acc_crown', type: 'accessory', val: 'crown', name: 'Boina Revolucionária', price: 15, icon: '👑' },
  ],
  caminhas: [
    { id: 'bed_classic', type: 'bed', val: 'classic', name: 'Almofada Coletiva', price: 0, icon: '🛏️' },
    { id: 'bed_royal', type: 'bed', val: 'royal', name: 'Trono de Veludo', price: 5, icon: '👑' },
    { id: 'bed_basket', type: 'bed', val: 'basket', name: 'Cesto de Vime', price: 8, icon: '🧺' },
    { id: 'bed_cloud', type: 'bed', val: 'cloud', name: 'Nuvem Estelar', price: 12, icon: '☁️' },
    { id: 'bed_sputnik', type: 'bed', val: 'sputnik', name: 'Cápsula Sputnik', price: 15, icon: '🛸' },
    { id: 'bed_kotatsu', type: 'bed', val: 'kotatsu', name: 'Futon Aconchego', price: 1, currency: 'couple', icon: '🏮' },
  ],
  racas: [
    { id: 'breed_white', type: 'breed', val: 'white', name: 'Branco da Sibéria', price: 0, icon: '🐱' },
    { id: 'breed_orange', type: 'breed', val: 'orange', name: 'Tigre Dourado', price: 8, icon: '🐈' },
    { id: 'breed_tuxedo', type: 'breed', val: 'tuxedo', name: 'Comissário Frajola', price: 8, icon: '🐧' },
    { id: 'breed_siamese', type: 'breed', val: 'siamese', name: 'Guarda de Moscou', price: 12, icon: '🐾' },
  ],
  bocas: [
    { id: 'mouth_cat', type: 'mouth', val: 'cat', name: 'Sereno', price: 0, icon: '😺' },
    { id: 'mouth_tongue', type: 'mouth', val: 'tongue', name: 'Saudação Fofa', price: 5, icon: '👅' },
    { id: 'mouth_vampire', type: 'mouth', val: 'vampire', name: 'Feroz Defensor', price: 6, icon: '🧛' },
    { id: 'mouth_smile', type: 'mouth', val: 'smile', name: 'Sorriso Proletário', price: 5, icon: '😸' },
  ],
};

export const PALETTE_COLORS = [
  { name: 'Carmesim', hex: '#e63946' },
  { name: 'Rubro', hex: '#b91c1c' },
  { name: 'Bordô', hex: '#800f2f' },
  { name: 'Ouro', hex: '#f59e0b' },
  { name: 'Âmbar', hex: '#fbbf24' },
  { name: 'Carvão', hex: '#2b1111' },
  { name: 'Marfim', hex: '#fffdf9' },
  { name: 'Safira', hex: '#2563eb' },
  { name: 'Esmeralda', hex: '#059669' },
  { name: 'Violeta', hex: '#7c3aed' },
];

export const DEFAULT_UNLOCKED_ITEMS = [
  'acc_none',
  'acc_star',
  'outfit_none',
  'outfit_red_dress',
  'outfit_red_gown',
  'outfit_red_sweater',
  'outfit_red_hoodie',
  'outfit_red_overalls',
  'outfit_red_cape',
  'breed_white',
  'mouth_cat',
  'pupil_round',
  'shape_almond',
  'bed_classic',
];

export function getTodayDateString(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

export function generateDailyCodeForRole(role: PlayerRole, dateStr: string): string {
  let hash = 0;
  const seed = `${dateStr}_${role}_jardim_cat_v2`;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return String(100000 + (Math.abs(hash) % 900000));
}

// --- Jokenpô ---
export function resolveJokenpoWinner(
  p1: Exclude<JokenpoChoice, ''>,
  p2: Exclude<JokenpoChoice, ''>
): 'cat1' | 'cat2' | 'tie' {
  if (p1 === p2) return 'tie';
  if (
    (p1 === 'rock' && p2 === 'scissors') ||
    (p1 === 'paper' && p2 === 'rock') ||
    (p1 === 'scissors' && p2 === 'paper')
  ) {
    return 'cat1';
  }
  return 'cat2';
}

export function chooseBotJokenpoMove(): Exclude<JokenpoChoice, ''> {
  const moves: Exclude<JokenpoChoice, ''>[] = ['rock', 'paper', 'scissors'];
  return moves[Math.floor(Math.random() * moves.length)];
}

// --- Tic-Tac-Toe ---
const TTT_WINS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function checkTicTacToeResult(
  board: string[]
): { winnerSymbol: string | null; winningLine: number[] | null; isDraw: boolean } {
  for (const line of TTT_WINS) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[b] === board[c]) {
      return { winnerSymbol: board[a], winningLine: line, isDraw: false };
    }
  }
  const isDraw = !board.includes('');
  return { winnerSymbol: null, winningLine: null, isDraw };
}

export function chooseBestTttMove(
  board: string[],
  botSymbol: string,
  humanSymbol: string
): number {
  const empty = board
    .map((v, i) => (v === '' ? i : -1))
    .filter((i) => i !== -1);
  if (empty.length === 0) return -1;

  // 1. Win if possible
  for (const idx of empty) {
    const copy = [...board];
    copy[idx] = botSymbol;
    if (checkTicTacToeResult(copy).winnerSymbol === botSymbol) return idx;
  }
  // 2. Block human win
  for (const idx of empty) {
    const copy = [...board];
    copy[idx] = humanSymbol;
    if (checkTicTacToeResult(copy).winnerSymbol === humanSymbol) return idx;
  }
  // 3. Center
  if (board[4] === '') return 4;
  // 4. Corners
  const corners = [0, 2, 6, 8].filter((i) => board[i] === '');
  if (corners.length > 0) {
    return corners[Math.floor(Math.random() * corners.length)];
  }
  return empty[Math.floor(Math.random() * empty.length)];
}
