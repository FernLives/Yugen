// ═══════════════════════════════════════════════════
// AUXNET — Resource Data organized by LOCATION
// Mining Method Categorization: SHIP | VEHICLE | HAND
// ═══════════════════════════════════════════════════

export const defaultResourceData = [
  // ══ HURSTON SYSTEM ══
  // ── Arial ──
  { 
    id: 'res-001', name: 'Quantanium', type: 'Mineral', location: 'Arial', parentBody: 'Hurston', 
    methods: ['ship'], rarity: 'Rare', yield: 'High', 
    description: 'Extremely volatile. Detonation timer starts on extraction. Highest value ore in Stanton.',
    tips: 'Use Prospector with Lancet MH1. Pre-queue refinery jobs.' 
  },
  { 
    id: 'res-002', name: 'Laranite', type: 'Metal', location: 'Arial', parentBody: 'Hurston', 
    methods: ['ship'], rarity: 'Uncommon', yield: 'High',
    description: 'High-value metal. Excellent secondary ore to fill cargo.',
    tips: 'Pair with Quantanium runs.'
  },
  { 
    id: 'res-003', name: 'Hadanite', type: 'Mineral', location: 'Arial', parentBody: 'Hurston', 
    methods: ['vehicle', 'hand'], rarity: 'Common', yield: 'Medium',
    description: 'High-value gemstone found in surface clusters and caves.',
    tips: 'Use Greycat ROC for bulk surface extraction.'
  },

  // ── Aberdeen ──
  { 
    id: 'res-004', name: 'Taranite', type: 'Mineral', location: 'Aberdeen', parentBody: 'Hurston', 
    methods: ['ship'], rarity: 'Uncommon', yield: 'Medium',
    description: 'Toxic environment mining. Requires environmental protection.',
    tips: 'Pembroke armor mandatory. Monitor O2 levels.'
  },
  { 
    id: 'res-005', name: 'Hadanite', type: 'Mineral', location: 'Aberdeen', parentBody: 'Hurston', 
    methods: ['vehicle', 'hand'], rarity: 'Common', yield: 'High',
    description: 'Aberdeen is the premier location for ROC gemstone mining.',
    tips: 'Stay in vehicle as much as possible to avoid heat damage.'
  },
  { 
    id: 'res-006', name: 'Dolivine', type: 'Mineral', location: 'Aberdeen', parentBody: 'Hurston', 
    methods: ['vehicle', 'hand'], rarity: 'Common', yield: 'High',
    description: 'Common gemstone found in abundance.',
    tips: 'Fill ROC with Hadanite first, use Dolivine for padding.'
  },

  // ── Daymar ──
  { 
    id: 'res-007', name: 'Agricium', type: 'Metal', location: 'Daymar', parentBody: 'Crusader', 
    methods: ['ship'], rarity: 'Uncommon', yield: 'High',
    description: 'Valuable agricultural metal. Found in large clusters.',
    tips: 'MOLE recommended for bulk extraction.'
  },
  { 
    id: 'res-008', name: 'Aphorite', type: 'Mineral', location: 'Daymar', parentBody: 'Crusader', 
    methods: ['vehicle', 'hand'], rarity: 'Uncommon', yield: 'Medium',
    description: 'Translucent gemstone found in surface formations.',
    tips: 'Good secondary target for ROC miners.'
  },
  { 
    id: 'res-009', name: 'Hadanite', type: 'Mineral', location: 'Daymar', parentBody: 'Crusader', 
    methods: ['vehicle', 'hand'], rarity: 'Common', yield: 'Medium',
    description: 'Primary gemstone target near Crusader orbit.',
    tips: 'Watch for high traffic — pirate activity is common.'
  },

  // ── Yela ──
  { 
    id: 'res-010', name: 'Bexalite', type: 'Mineral', location: 'Yela', parentBody: 'Crusader', 
    methods: ['ship'], rarity: 'Rare', yield: 'Medium',
    description: 'Rare mineral found in ice field formations.',
    tips: 'Scan ice formations thoroughly — clusters can be hidden.'
  },
  { 
    id: 'res-011', name: 'Beryl', type: 'Mineral', location: 'Yela', parentBody: 'Crusader', 
    methods: ['ship'], rarity: 'Uncommon', yield: 'Medium',
    description: 'Consistent availability across Yela surface.',
    tips: 'Reliable income source for solo Prospectors.'
  },

  // ── Lyria ──
  { 
    id: 'res-012', name: 'Quantanium', type: 'Mineral', location: 'Lyria', parentBody: 'ArcCorp', 
    methods: ['ship'], rarity: 'Rare', yield: 'Very High',
    description: 'Massive surface clusters of Quantanium.',
    tips: 'Excellent for MOLE crews. High reward, high danger.'
  },
  { 
    id: 'res-013', name: 'Hadanite', type: 'Mineral', location: 'Lyria', parentBody: 'ArcCorp', 
    methods: ['vehicle', 'hand'], rarity: 'Common', yield: 'Medium',
    description: 'Surface gemstone mining in ice-cave regions.',
    tips: 'Check cave markers for high-density clusters.'
  },

  // ── Calliope ──
  { 
    id: 'res-014', name: 'Hephaestanite', type: 'Mineral', location: 'Calliope', parentBody: 'microTech', 
    methods: ['ship'], rarity: 'Uncommon', yield: 'Medium',
    description: 'Mid-tier mineral consistent in microTech region.',
    tips: 'Good alternative to high-pop Hurston systems.'
  },
  { 
    id: 'res-015', name: 'Hadanite', type: 'Mineral', location: 'Calliope', parentBody: 'microTech', 
    methods: ['vehicle', 'hand'], rarity: 'Common', yield: 'High',
    description: 'Best gemstone location in the microTech system.',
    tips: 'Watch ship temperatures and battery life in extreme cold.'
  },

  // ── Euterpe ──
  { 
    id: 'res-016', name: 'Borase', type: 'Mineral', location: 'Euterpe', parentBody: 'microTech', 
    methods: ['ship'], rarity: 'Uncommon', yield: 'Medium',
    description: 'Mineral deposits found in sub-surface ice veins.',
    tips: 'Low traffic, very safe for solo operators.'
  }
];
