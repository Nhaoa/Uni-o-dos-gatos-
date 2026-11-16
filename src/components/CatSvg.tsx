import React from 'react';
import {
  BedType,
  CatState,
  CheckersPieceType,
  ChessPieceType,
  JokenpoChoice,
  PieceColor,
} from '../types/game';

const BED_STROKE = '#2b1111';

const CatBedBackLayer: React.FC<{ bed: BedType; color: string }> = ({ bed, color }) => {
  const mainCol = color || '#b91c1c';

  if (bed === 'royal') {
    return (
      <g>
        <ellipse cx="98" cy="186" rx="74" ry="16" fill="rgba(43,17,17,0.16)" />
        {/* High royal velvet backrest */}
        <path
          d="M 30,174 C 24,138 42,116 98,116 C 154,116 172,138 166,174 Z"
          fill={mainCol}
          stroke={BED_STROKE}
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        <path
          d="M 38,170 C 34,144 50,126 98,126 C 146,126 162,144 158,170 Z"
          fill="#fff8ed"
          fillOpacity="0.18"
          stroke="#fbbf24"
          strokeWidth="2.4"
        />
        {/* Gold crown crest at backrest peak */}
        <polygon
          points="98,108 102,114 109,115 104,119 105,126 98,122 91,126 92,119 87,115 94,114"
          fill="#fbbf24"
          stroke={BED_STROKE}
          strokeWidth="1.8"
        />
        {/* Inner royal mattress */}
        <ellipse cx="98" cy="172" rx="64" ry="18" fill="#fef3c7" stroke={BED_STROKE} strokeWidth="3" />
      </g>
    );
  }

  if (bed === 'basket') {
    return (
      <g>
        <ellipse cx="98" cy="187" rx="72" ry="15" fill="rgba(43,17,17,0.16)" />
        {/* Woven wicker rim back */}
        <path
          d="M 28,162 C 28,136 168,136 168,162 L 160,182 C 160,194 36,194 36,182 Z"
          fill="#d4a373"
          stroke={BED_STROKE}
          strokeWidth="3.4"
          strokeLinejoin="round"
        />
        <path
          d="M 38,154 Q 98,138 158,154"
          fill="none"
          stroke="#9c6644"
          strokeWidth="3"
          strokeDasharray="6 5"
        />
        {/* Tinted plush inner cushion */}
        <ellipse cx="98" cy="166" rx="58" ry="18" fill={mainCol} stroke={BED_STROKE} strokeWidth="2.8" />
        <ellipse cx="98" cy="164" rx="44" ry="11" fill="#fffdf9" fillOpacity="0.18" />
      </g>
    );
  }

  if (bed === 'cloud') {
    return (
      <g>
        <ellipse cx="98" cy="187" rx="74" ry="14" fill="rgba(43,17,17,0.14)" />
        {/* Fluffy scalloped cloud backrest */}
        <path
          d="M 30,168 C 22,150 38,132 58,138 C 66,120 92,116 102,130 C 116,116 142,122 146,140 C 166,136 176,154 166,170 Z"
          fill="#fffdf9"
          stroke={BED_STROKE}
          strokeWidth="3.4"
          strokeLinejoin="round"
        />
        {/* Soft tinted cloud cushion */}
        <ellipse cx="98" cy="168" rx="58" ry="17" fill={mainCol} stroke={BED_STROKE} strokeWidth="2.8" />
      </g>
    );
  }

  if (bed === 'sputnik') {
    return (
      <g>
        <ellipse cx="98" cy="190" rx="68" ry="13" fill="rgba(43,17,17,0.18)" />
        {/* Retro tripod capsule legs */}
        <line x1="56" y1="176" x2="44" y2="192" stroke={BED_STROKE} strokeWidth="4" strokeLinecap="round" />
        <line x1="140" y1="176" x2="152" y2="192" stroke={BED_STROKE} strokeWidth="4" strokeLinecap="round" />
        {/* Antennae */}
        <line x1="48" y1="130" x2="34" y2="108" stroke={BED_STROKE} strokeWidth="2.8" strokeLinecap="round" />
        <circle cx="34" cy="108" r="4" fill="#fbbf24" stroke={BED_STROKE} strokeWidth="1.8" />
        <line x1="148" y1="130" x2="162" y2="108" stroke={BED_STROKE} strokeWidth="2.8" strokeLinecap="round" />
        <circle cx="162" cy="108" r="4" fill="#fbbf24" stroke={BED_STROKE} strokeWidth="1.8" />
        {/* Dome shell */}
        <path
          d="M 32,166 C 30,120 166,120 164,166 Z"
          fill="#cbd5e1"
          stroke={BED_STROKE}
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        {/* Plush space-pod interior */}
        <ellipse cx="98" cy="166" rx="58" ry="20" fill={mainCol} stroke={BED_STROKE} strokeWidth="2.8" />
      </g>
    );
  }

  if (bed === 'kotatsu') {
    return (
      <g>
        <ellipse cx="98" cy="188" rx="76" ry="14" fill="rgba(43,17,17,0.16)" />
        {/* Wooden kotatsu frame & tabletop peek behind */}
        <rect
          x="26"
          y="148"
          width="144"
          height="36"
          rx="12"
          fill="#92400e"
          stroke={BED_STROKE}
          strokeWidth="3.2"
        />
        {/* Warm quilted futon blanket */}
        <path
          d="M 32,158 Q 98,142 164,158 L 170,182 Q 98,194 26,182 Z"
          fill={mainCol}
          stroke={BED_STROKE}
          strokeWidth="3.2"
          strokeLinejoin="round"
        />
        {/* Cream futon bolster pillow */}
        <ellipse cx="98" cy="162" rx="54" ry="14" fill="#fff8ed" stroke={BED_STROKE} strokeWidth="2.6" />
      </g>
    );
  }

  // classic: Almofada Coletiva
  return (
    <g>
      <ellipse cx="98" cy="186" rx="72" ry="15" fill="rgba(43,17,17,0.16)" />
      {/* Outer plush bolster ring */}
      <ellipse cx="98" cy="168" rx="70" ry="24" fill={mainCol} stroke={BED_STROKE} strokeWidth="3.5" />
      {/* Inner quilted cream cushion */}
      <ellipse cx="98" cy="168" rx="54" ry="16" fill="#fff8ed" stroke={BED_STROKE} strokeWidth="2.5" />
      <circle cx="76" cy="168" r="2.2" fill={mainCol} />
      <circle cx="98" cy="166" r="2.2" fill={mainCol} />
      <circle cx="120" cy="168" r="2.2" fill={mainCol} />
    </g>
  );
};

const CatBedFrontLayer: React.FC<{ bed: BedType; color: string }> = ({ bed, color }) => {
  const mainCol = color || '#b91c1c';

  if (bed === 'royal') {
    return (
      <g>
        <path
          d="M 32,168 Q 98,186 164,168 C 166,184 140,193 98,193 C 56,193 30,184 32,168 Z"
          fill={mainCol}
          stroke={BED_STROKE}
          strokeWidth="3.4"
          strokeLinejoin="round"
        />
        <path d="M 42,174 Q 98,188 154,174" fill="none" stroke="#fbbf24" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="40" cy="175" r="4" fill="#fbbf24" stroke={BED_STROKE} strokeWidth="1.5" />
        <circle cx="156" cy="175" r="4" fill="#fbbf24" stroke={BED_STROKE} strokeWidth="1.5" />
      </g>
    );
  }

  if (bed === 'basket') {
    return (
      <g>
        <path
          d="M 31,164 Q 98,184 165,164 L 160,182 Q 98,196 36,182 Z"
          fill="#ddb892"
          stroke={BED_STROKE}
          strokeWidth="3.4"
          strokeLinejoin="round"
        />
        <path
          d="M 48,170 L 52,186 M 72,174 L 74,189 M 98,176 L 98,191 M 124,174 L 122,189 M 148,170 L 144,186"
          stroke="#9c6644"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path d="M 34,166 Q 98,185 162,166" fill="none" stroke="#b08968" strokeWidth="4" strokeLinecap="round" />
      </g>
    );
  }

  if (bed === 'cloud') {
    return (
      <g>
        <path
          d="M 32,168 C 36,182 54,186 68,182 C 80,192 116,192 128,182 C 142,186 160,182 164,168 Q 98,184 32,168 Z"
          fill="#fffdf9"
          stroke={BED_STROKE}
          strokeWidth="3.4"
          strokeLinejoin="round"
        />
        <polygon
          points="98,178 100,182 104,182.5 101,185 102,189 98,187 94,189 95,185 92,182.5 96,182"
          fill="#fbbf24"
          stroke={BED_STROKE}
          strokeWidth="1.2"
        />
      </g>
    );
  }

  if (bed === 'sputnik') {
    return (
      <g>
        <path
          d="M 32,166 Q 98,186 164,166 C 160,186 134,193 98,193 C 62,193 36,186 32,166 Z"
          fill="#94a3b8"
          stroke={BED_STROKE}
          strokeWidth="3.4"
          strokeLinejoin="round"
        />
        <path d="M 46,173 Q 98,187 150,173" fill="none" stroke={mainCol} strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="62" cy="180" r="2.3" fill="#fbbf24" />
        <circle cx="98" cy="184" r="2.3" fill="#fbbf24" />
        <circle cx="134" cy="180" r="2.3" fill="#fbbf24" />
      </g>
    );
  }

  if (bed === 'kotatsu') {
    return (
      <g>
        {/* Cozy folded blanket lap front */}
        <path
          d="M 32,166 Q 98,184 164,166 L 168,183 Q 98,196 28,183 Z"
          fill={mainCol}
          stroke={BED_STROKE}
          strokeWidth="3.2"
          strokeLinejoin="round"
        />
        <path
          d="M 40,174 Q 98,189 156,174"
          fill="none"
          stroke="#fff8ed"
          strokeWidth="2.5"
          strokeDasharray="6 5"
          strokeLinecap="round"
        />
        <circle cx="98" cy="182" r="4" fill="#fbbf24" stroke={BED_STROKE} strokeWidth="1.5" />
      </g>
    );
  }

  // classic front lip
  return (
    <g>
      <path
        d="M 30,168 Q 98,188 166,168 C 166,184 138,193 98,193 C 58,193 30,184 30,168 Z"
        fill={mainCol}
        stroke={BED_STROKE}
        strokeWidth="3.4"
        strokeLinejoin="round"
      />
      <path d="M 44,175 Q 98,189 152,175" fill="none" stroke="#fff8ed" strokeWidth="2.2" strokeLinecap="round" opacity="0.7" />
    </g>
  );
};

interface CatSvgProps {
  cat: Partial<CatState>;
  isFlipped?: boolean;
  showBed?: boolean;
  className?: string;
  viewBox?: string;
}

export const CatSvg: React.FC<CatSvgProps> = ({
  cat,
  isFlipped = false,
  showBed = false,
  className = 'w-full h-full drop-shadow-md select-none',
  viewBox,
}) => {
  const {
    breed = 'white',
    outfit = 'none',
    outfitColor = '#e63946',
    accessory = 'none',
    accessoryColor = '#e76f51',
    expression = 'happy',
    eyeShape = 'almond',
    eyeColor = '#2b2725',
    pupil = 'round',
    pupilColor = '#ffffff',
    mouth = 'cat',
    bed = 'classic',
    bedColor = '#b91c1c',
    isSleeping = false,
  } = cat;

  const resolvedViewBox = viewBox || (showBed ? '0 4 200 202' : '0 0 200 200');

  let bodyFill = '#fffdf9';
  const strokeCol = '#2b2725';
  let earInner = '#f7c2c2';
  if (breed === 'orange') {
    bodyFill = '#f4a261';
    earInner = '#e76f51';
  } else if (breed === 'tuxedo') {
    bodyFill = '#3d3a37';
  } else if (breed === 'siamese') {
    bodyFill = '#ebdcc9';
    earInner = '#5d4037';
  }

  const mainRed = outfitColor || '#e63946';
  const starFill =
    accessoryColor && accessoryColor !== '#e76f51' ? accessoryColor : '#ffd166';
  const catDropY = showBed ? (isSleeping ? 8 : 3) : 0;

  return (
    <svg viewBox={resolvedViewBox} className={className} aria-hidden="true">
      {showBed && <CatBedBackLayer bed={bed} color={bedColor} />}
      <g transform={isFlipped ? 'scale(-1, 1) translate(-200, 0)' : undefined}>
        <g transform={catDropY ? `translate(0, ${catDropY})` : undefined}>
          <g className={isSleeping ? undefined : 'anim-tail'}>
            <path
              d={
                isSleeping
                  ? 'M 134,158 C 152,162 160,152 152,142 C 145,134 136,144 132,156 Z'
                  : 'M 134,152 C 162,150 180,134 172,118 C 165,106 152,114 148,126 C 144,136 134,146 130,154 Z'
              }
              fill={bodyFill}
              stroke={strokeCol}
              strokeWidth="3.8"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </g>

          <g className="anim-body">
            {/* Torso & legs */}
            <path
              d="M 64,136 C 56,152 56,168 68,172 C 78,175 84,164 88,152 C 94,152 104,152 110,152 C 114,164 120,175 130,172 C 142,168 140,152 134,136 Z"
              fill={bodyFill}
              stroke={strokeCol}
              strokeWidth="4"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          {/* Head & Ears */}
          <path
            d="M 44,82 C 40,54 44,38 52,42 C 64,48 82,70 98,70 C 114,70 132,48 144,42 C 152,38 156,54 152,82 C 160,112 142,138 98,138 C 54,138 36,112 44,82 Z"
            fill={bodyFill}
            stroke={strokeCol}
            strokeWidth="4"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <polygon points="52,46 64,54 52,68" fill={earInner} opacity="0.65" />
          <polygon points="144,46 132,54 144,68" fill={earInner} opacity="0.65" />

          {/* Breed markings */}
          {breed === 'tuxedo' && (
            <>
              <polygon points="98,90 80,120 116,120" fill="#fffdf9" />
              <ellipse cx="98" cy="148" rx="20" ry="14" fill="#fffdf9" />
            </>
          )}
          {breed === 'orange' && (
            <>
              <path
                d="M 98,62 L 98,72 M 88,58 Q 92,68 86,75 M 108,58 Q 104,68 110,75"
                stroke="#b3581d"
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
              />
              <ellipse cx="98" cy="144" rx="14" ry="10" fill="#fffdf9" />
            </>
          )}
          {breed === 'siamese' && (
            <>
              <polygon points="40,30 65,70 30,70" fill="#3d281d" opacity="0.8" />
              <polygon points="156,30 131,70 166,70" fill="#3d281d" opacity="0.8" />
              <path d="M 64,112 Q 98,78 132,112 Q 98,140 64,112 Z" fill="#3d281d" opacity="0.85" />
            </>
          )}

          {/* Eyes */}
          <g className={isSleeping ? undefined : 'anim-blink'}>
            {isSleeping ? (
              <>
                <path
                  d="M 59,98 Q 72,107 85,98"
                  fill="none"
                  stroke={strokeCol}
                  strokeWidth="4.2"
                  strokeLinecap="round"
                />
                <path
                  d="M 111,98 Q 124,107 137,98"
                  fill="none"
                  stroke={strokeCol}
                  strokeWidth="4.2"
                  strokeLinecap="round"
                />
                <ellipse cx="58" cy="110" rx="6.5" ry="3.8" fill="#e89c9c" opacity="0.85" />
                <ellipse cx="138" cy="110" rx="6.5" ry="3.8" fill="#e89c9c" opacity="0.85" />
              </>
            ) : expression === 'pet' ? (
              <>
                <path
                  d="M 60,100 Q 72,86 84,100"
                  fill="none"
                  stroke={strokeCol}
                  strokeWidth="4.5"
                  strokeLinecap="round"
                />
                <path
                  d="M 112,100 Q 124,86 136,100"
                  fill="none"
                  stroke={strokeCol}
                  strokeWidth="4.5"
                  strokeLinecap="round"
                />
                <ellipse cx="58" cy="110" rx="6" ry="3.5" fill="#e89c9c" opacity="0.8" />
                <ellipse cx="138" cy="110" rx="6" ry="3.5" fill="#e89c9c" opacity="0.8" />
              </>
            ) : (
              <>
                {eyeShape === 'round' && (
                  <>
                    <circle cx="72" cy="98" r="17" fill={eyeColor} />
                    <circle cx="124" cy="98" r="17" fill={eyeColor} />
                  </>
                )}
                {eyeShape === 'anime' && (
                  <>
                    <path
                      d="M 56,92 Q 72,82 88,96 Q 72,114 56,92 Z"
                      fill={eyeColor}
                      stroke={strokeCol}
                      strokeWidth="1.5"
                    />
                    <path
                      d="M 140,92 Q 124,82 108,96 Q 124,114 140,92 Z"
                      fill={eyeColor}
                      stroke={strokeCol}
                      strokeWidth="1.5"
                    />
                  </>
                )}
                {eyeShape === 'almond' && (
                  <>
                    <ellipse cx="72" cy="98" rx="14" ry="18" fill={eyeColor} />
                    <ellipse cx="124" cy="98" rx="14" ry="18" fill={eyeColor} />
                  </>
                )}

                {pupil === 'slit' && (
                  <>
                    <ellipse cx="72" cy="98" rx="3.5" ry="16" fill={pupilColor} />
                    <ellipse cx="124" cy="98" rx="3.5" ry="16" fill={pupilColor} />
                  </>
                )}
                {pupil === 'sparkle' && (
                  <>
                    <polygon
                      points="72,90 74,94 78,95 74,97 72,101 70,97 66,95 70,94"
                      fill={pupilColor}
                    />
                    <polygon
                      points="124,90 126,94 130,95 126,97 124,101 122,97 118,95 122,94"
                      fill={pupilColor}
                    />
                  </>
                )}
                {pupil === 'heart' && (
                  <>
                    <path
                      d="M 72,96 C 72,92 68,90 66,94 C 64,98 72,102 72,104 C 72,102 80,98 78,94 C 76,90 72,92 72,96 Z"
                      fill={pupilColor}
                    />
                    <path
                      d="M 124,96 C 124,92 120,90 118,94 C 116,98 124,102 124,104 C 124,102 132,98 130,94 C 128,90 124,92 124,96 Z"
                      fill={pupilColor}
                    />
                  </>
                )}
                {pupil === 'round' && (
                  <>
                    <circle cx="76" cy="94" r="5" fill={pupilColor} />
                    <circle cx="128" cy="94" r="5" fill={pupilColor} />
                  </>
                )}
              </>
            )}
          </g>

          {/* Nose & Mouth */}
          <polygon points="95,112 101,112 98,116" fill="#e76f51" />
          {mouth === 'tongue' && (
            <>
              <path d="M 94,118 Q 98,122 102,118" fill="none" stroke={strokeCol} strokeWidth="2.5" />
              <path d="M 96,120 C 96,125 100,125 100,120 Z" fill="#e74c3c" stroke={strokeCol} strokeWidth="1.5" />
            </>
          )}
          {mouth === 'vampire' && (
            <>
              <path d="M 93,118 Q 98,122 103,118" fill="none" stroke={strokeCol} strokeWidth="2.5" />
              <polygon points="95,118 96,122 97,118" fill="#fff" stroke={strokeCol} strokeWidth="1" />
              <polygon points="99,118 100,122 101,118" fill="#fff" stroke={strokeCol} strokeWidth="1" />
            </>
          )}
          {mouth === 'smile' && (
            <path
              d="M 92,116 Q 98,124 104,116"
              fill="none"
              stroke={strokeCol}
              strokeWidth="2.8"
              strokeLinecap="round"
            />
          )}
          {mouth === 'cat' && (
            <path
              d="M 94,118 Q 98,122 102,118"
              fill="none"
              stroke={strokeCol}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          )}

          {/* Outfits */}
          {outfit === 'red_dress' && (
            <g>
              <path
                d="M 52,167 Q 60,173 68,167 Q 76,173 84,167 Q 92,173 100,167 Q 108,173 116,167 Q 124,173 132,167 Q 140,173 146,167"
                fill="none"
                stroke="#fffdf9"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path
                d="M 70,134 L 52,166 Q 98,174 146,166 L 128,134 Z"
                fill={mainRed}
                stroke={strokeCol}
                strokeWidth="3"
                strokeLinejoin="round"
              />
              <path
                d="M 84,142 L 74,165 M 98,143 L 98,167 M 112,142 L 122,165"
                stroke="#9e1b24"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.65"
              />
              <path d="M 69,136 Q 98,141 129,136" fill="none" stroke="#800f17" strokeWidth="4.5" strokeLinecap="round" />
              <polygon points="98,138 89,133 89,143" fill="#b51724" stroke={strokeCol} strokeWidth="1.6" />
              <polygon points="98,138 107,133 107,143" fill="#b51724" stroke={strokeCol} strokeWidth="1.6" />
              <circle cx="98" cy="138" r="3" fill="#fffdf9" stroke={strokeCol} strokeWidth="1.5" />
            </g>
          )}
          {outfit === 'red_gown' && (
            <g>
              <path
                d="M 46,168 Q 58,176 72,168 Q 86,176 98,168 Q 112,176 126,168 Q 140,176 152,168"
                fill="#fff8eb"
                stroke={strokeCol}
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <path
                d="M 68,134 C 54,144 46,158 46,168 Q 98,175 152,168 C 152,158 144,144 130,134 Z"
                fill={mainRed}
                stroke={strokeCol}
                strokeWidth="3"
                strokeLinejoin="round"
              />
              <path d="M 88,136 L 78,169 Q 98,172 118,169 L 108,136 Z" fill="#f7cad0" stroke={strokeCol} strokeWidth="2" />
              <path d="M 66,135 Q 82,142 98,136 Q 114,142 132,135" fill="none" stroke="#b51724" strokeWidth="5" strokeLinecap="round" />
            </g>
          )}
          {outfit === 'red_sweater' && (
            <g>
              <path
                d="M 64,134 C 56,146 58,164 66,166 L 132,166 C 140,164 142,146 134,134 Z"
                fill={mainRed}
                stroke={strokeCol}
                strokeWidth="3"
                strokeLinejoin="round"
              />
              <rect x="70" y="130" width="56" height="9" rx="4.5" fill="#b51724" stroke={strokeCol} strokeWidth="2.5" />
              <line x1="80" y1="140" x2="78" y2="164" stroke="#9e1b24" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
              <line x1="92" y1="140" x2="92" y2="164" stroke="#9e1b24" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
              <line x1="104" y1="140" x2="104" y2="164" stroke="#9e1b24" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
              <line x1="116" y1="140" x2="118" y2="164" stroke="#9e1b24" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
            </g>
          )}
          {outfit === 'red_hoodie' && (
            <g>
              <path
                d="M 63,134 C 55,148 57,164 66,166 L 132,166 C 141,164 143,148 135,134 Z"
                fill={mainRed}
                stroke={strokeCol}
                strokeWidth="3"
                strokeLinejoin="round"
              />
              <path d="M 80,150 L 116,150 L 120,163 L 76,163 Z" fill="#b51724" stroke={strokeCol} strokeWidth="2" strokeLinejoin="round" />
              <path d="M 91,136 Q 89,145 91,151" fill="none" stroke="#fffdf9" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M 105,136 Q 107,145 105,151" fill="none" stroke="#fffdf9" strokeWidth="2.5" strokeLinecap="round" />
            </g>
          )}
          {outfit === 'red_overalls' && (
            <g>
              <path d="M 65,135 C 58,148 60,162 68,165 L 130,165 C 138,162 140,148 133,135 Z" fill="#fffdf9" stroke={strokeCol} strokeWidth="2.5" />
              <path d="M 74,142 L 122,142 L 128,166 L 68,166 Z" fill={mainRed} stroke={strokeCol} strokeWidth="3" strokeLinejoin="round" />
              <rect x="75" y="133" width="8" height="13" rx="2" fill={mainRed} stroke={strokeCol} strokeWidth="2.2" />
              <rect x="113" y="133" width="8" height="13" rx="2" fill={mainRed} stroke={strokeCol} strokeWidth="2.2" />
              <circle cx="79" cy="143" r="2.5" fill="#ffd166" stroke={strokeCol} strokeWidth="1.2" />
              <circle cx="117" cy="143" r="2.5" fill="#ffd166" stroke={strokeCol} strokeWidth="1.2" />
              <rect x="88" y="149" width="20" height="12" rx="3" fill="#b51724" stroke={strokeCol} strokeWidth="1.8" />
            </g>
          )}
          {outfit === 'red_cape' && (
            <g>
              <path
                d="M 66,133 C 50,144 46,160 52,167 Q 75,171 94,166 L 98,140 L 102,166 Q 121,171 144,167 C 150,160 146,144 130,133 Z"
                fill={mainRed}
                stroke={strokeCol}
                strokeWidth="3"
                strokeLinejoin="round"
              />
              <path d="M 68,133 Q 83,142 98,137 Q 113,142 128,133" fill="#b51724" stroke={strokeCol} strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="98" cy="137" r="3.2" fill="#ffd166" stroke={strokeCol} strokeWidth="1.6" />
              <path d="M 96,139 L 91,148 M 100,139 L 105,148" stroke="#b51724" strokeWidth="2.2" strokeLinecap="round" />
            </g>
          )}
          {/* Anime Outfits */}
          {outfit === 'anime_jojo' && (
            <g>
              {/* Jotaro dark gakuran coat with high collar & gold chain */}
              <path
                d="M 61,131 C 50,145 50,166 60,169 L 89,169 L 91,142 L 105,142 L 107,169 L 136,169 C 146,166 146,145 135,131 Z"
                fill="#1e1b4b"
                stroke={strokeCol}
                strokeWidth="3"
                strokeLinejoin="round"
              />
              <path d="M 68,130 L 82,144 L 84,132 Z" fill="#312e81" stroke={strokeCol} strokeWidth="2" />
              <path d="M 128,130 L 114,144 L 112,132 Z" fill="#312e81" stroke={strokeCol} strokeWidth="2" />
              <rect x="88" y="138" width="20" height="29" fill="#4c1d95" stroke={strokeCol} strokeWidth="2" />
              {/* Gold Joestar chain */}
              <path d="M 78,138 Q 90,152 106,140" fill="none" stroke="#fbbf24" strokeWidth="3.2" strokeLinecap="round" />
              <circle cx="80" cy="139" r="3" fill="#fbbf24" stroke={strokeCol} strokeWidth="1.2" />
              <polygon points="116,147 118,151 122,151 119,154 120,158 116,155 112,158 113,154 110,151 114,151" fill="#fbbf24" stroke={strokeCol} strokeWidth="1" />
            </g>
          )}
          {outfit === 'anime_fma' && (
            <g>
              {/* Edward Elric crimson alchemist coat + black tunic + pocket watch chain */}
              <path
                d="M 60,132 C 49,145 48,165 58,169 L 87,169 L 92,142 L 104,142 L 109,169 L 138,169 C 148,165 147,145 136,132 Z"
                fill="#b91c1c"
                stroke={strokeCol}
                strokeWidth="3"
                strokeLinejoin="round"
              />
              <path d="M 88,134 L 108,134 L 108,168 L 88,168 Z" fill="#1c1917" stroke={strokeCol} strokeWidth="2" />
              <path d="M 70,133 L 88,144 L 88,134 Z" fill="#fffdf9" stroke={strokeCol} strokeWidth="2" />
              <path d="M 126,133 L 108,144 L 108,134 Z" fill="#fffdf9" stroke={strokeCol} strokeWidth="2" />
              {/* Silver State Alchemist pocket watch chain */}
              <path d="M 80,152 Q 92,162 104,154" fill="none" stroke="#cbd5e1" strokeWidth="2.4" strokeLinecap="round" />
              <circle cx="105" cy="154" r="3.2" fill="#e2e8f0" stroke={strokeCol} strokeWidth="1.2" />
            </g>
          )}
          {outfit === 'anime_baki' && (
            <g>
              {/* Baki fighter shorts, chest battle tape & Champion belt */}
              <rect x="65" y="146" width="66" height="21" rx="4" fill="#18181b" stroke={strokeCol} strokeWidth="2.8" />
              <rect x="66" y="143" width="64" height="9" rx="3" fill="#dc2626" stroke={strokeCol} strokeWidth="2.2" />
              <ellipse cx="98" cy="147" rx="10" ry="6" fill="#fbbf24" stroke={strokeCol} strokeWidth="2" />
              <circle cx="98" cy="147" r="3" fill="#b91c1c" />
              {/* Athletic wrist/shoulder wraps */}
              <path d="M 70,135 L 86,143 M 126,135 L 110,143" stroke="#fffdf9" strokeWidth="4" strokeLinecap="round" />
            </g>
          )}
          {outfit === 'anime_darling' && (
            <g>
              {/* Zero Two red Strelitzia military jacket with white trim & neck ribbon */}
              <path
                d="M 63,133 C 54,146 56,165 65,168 L 131,168 C 140,165 142,146 133,133 Z"
                fill="#dc2626"
                stroke={strokeCol}
                strokeWidth="3"
                strokeLinejoin="round"
              />
              <path d="M 72,133 L 98,145 L 124,133 Z" fill="#fffdf9" stroke={strokeCol} strokeWidth="2" />
              <line x1="98" y1="145" x2="98" y2="167" stroke="#fbbf24" strokeWidth="2.4" />
              <polygon points="98,139 88,135 88,143" fill="#0284c7" stroke={strokeCol} strokeWidth="1.4" />
              <polygon points="98,139 108,135 108,143" fill="#0284c7" stroke={strokeCol} strokeWidth="1.4" />
              <rect x="60" y="157" width="12" height="6" rx="2" fill="#fffdf9" stroke={strokeCol} strokeWidth="1.6" />
              <rect x="124" y="157" width="12" height="6" rx="2" fill="#fffdf9" stroke={strokeCol} strokeWidth="1.6" />
            </g>
          )}
          {outfit === 'anime_apotecaria' && (
            <g>
              {/* Maomao emerald-green & cream palace apothecary hanfu + crimson obi */}
              <path
                d="M 62,133 C 52,146 52,165 62,168 L 134,168 C 144,165 144,146 134,133 Z"
                fill="#047857"
                stroke={strokeCol}
                strokeWidth="3"
                strokeLinejoin="round"
              />
              <path d="M 78,133 L 98,150 L 118,133" fill="#fef3c7" stroke={strokeCol} strokeWidth="2.4" strokeLinejoin="round" />
              <path d="M 86,133 L 106,151" stroke="#34d399" strokeWidth="3" strokeLinecap="round" />
              <rect x="68" y="151" width="60" height="9" rx="3" fill="#b91c1c" stroke={strokeCol} strokeWidth="2" />
              <circle cx="98" cy="155" r="3" fill="#6ee7b7" stroke={strokeCol} strokeWidth="1.4" />
            </g>
          )}
          {outfit === 'anime_ghibli' && (
            <g>
              {/* Kiki indigo witch tunic with red shoulder strap & golden satchel buckle */}
              <path
                d="M 62,134 C 52,148 50,166 58,169 L 138,169 C 146,166 144,148 134,134 Z"
                fill="#312e81"
                stroke={strokeCol}
                strokeWidth="3"
                strokeLinejoin="round"
              />
              <path d="M 76,133 Q 98,142 120,133" fill="none" stroke="#fffdf9" strokeWidth="3.5" strokeLinecap="round" />
              <path d="M 76,134 L 122,166" stroke="#dc2626" strokeWidth="4.5" strokeLinecap="round" />
              <rect x="115" y="154" width="14" height="12" rx="3" fill="#92400e" stroke={strokeCol} strokeWidth="2" />
              <circle cx="122" cy="159" r="2" fill="#fbbf24" />
            </g>
          )}
          {outfit === 'anime_dandadan' && (
            <g>
              {/* Okarun dark gakuran jacket + neon red-violet Turbo spiral emblem */}
              <path
                d="M 63,133 C 54,147 56,165 66,168 L 130,168 C 140,165 142,147 133,133 Z"
                fill="#18181b"
                stroke={strokeCol}
                strokeWidth="3"
                strokeLinejoin="round"
              />
              <rect x="86" y="131" width="24" height="8" rx="3" fill="#ef4444" stroke={strokeCol} strokeWidth="2" />
              <line x1="98" y1="139" x2="98" y2="167" stroke="#fbbf24" strokeWidth="2.4" />
              <circle cx="80" cy="149" r="5" fill="#ef4444" stroke="#fffdf9" strokeWidth="1.5" />
              <circle cx="116" cy="149" r="3" fill="#fbbf24" />
            </g>
          )}
          {outfit === 'anime_ghoul' && (
            <g>
              {/* Kaneki black Anteiku battle coat + white cross harness + crimson kagune spikes */}
              <path d="M 54,146 L 34,132 L 46,154 Z" fill="#991b1b" stroke={strokeCol} strokeWidth="2.4" strokeLinejoin="round" />
              <path d="M 142,146 L 162,132 L 150,154 Z" fill="#991b1b" stroke={strokeCol} strokeWidth="2.4" strokeLinejoin="round" />
              <path
                d="M 62,133 C 53,147 55,165 65,168 L 131,168 C 141,165 143,147 134,133 Z"
                fill="#171717"
                stroke={strokeCol}
                strokeWidth="3"
                strokeLinejoin="round"
              />
              <path d="M 74,136 L 122,162 M 122,136 L 74,162" stroke="#e5e7eb" strokeWidth="3.2" strokeLinecap="round" />
              <rect x="86" y="131" width="24" height="7" rx="3" fill="#262626" stroke={strokeCol} strokeWidth="2" />
            </g>
          )}
          {outfit === 'anime_aot' && (
            <g>
              {/* Survey Corps forest-green cloak + brown ODM leather harness + Wings of Freedom */}
              <path
                d="M 62,133 C 46,146 44,162 52,169 L 144,169 C 152,162 150,146 134,133 Z"
                fill="#15803d"
                stroke={strokeCol}
                strokeWidth="3"
                strokeLinejoin="round"
              />
              <path d="M 80,135 L 84,167 M 116,135 L 112,167 M 68,153 L 128,153" stroke="#78350f" strokeWidth="3.5" strokeLinecap="round" />
              {/* Wings of Freedom crest */}
              <polygon points="98,141 90,147 94,155 98,149" fill="#fffdf9" stroke={strokeCol} strokeWidth="1.2" />
              <polygon points="98,141 106,147 102,155 98,149" fill="#0284c7" stroke={strokeCol} strokeWidth="1.2" />
            </g>
          )}
          {outfit === 'anime_sao' && (
            <g>
              {/* Kirito Black Swordsman coat + diagonal strap + crossed Elucidator & Dark Repulser */}
              <line x1="56" y1="120" x2="132" y2="164" stroke="#334155" strokeWidth="5" strokeLinecap="round" />
              <line x1="140" y1="120" x2="64" y2="164" stroke="#0891b2" strokeWidth="5" strokeLinecap="round" />
              <circle cx="55" cy="119" r="3.5" fill="#cbd5e1" stroke={strokeCol} strokeWidth="1.4" />
              <circle cx="141" cy="119" r="3.5" fill="#67e8f9" stroke={strokeCol} strokeWidth="1.4" />
              <path
                d="M 61,132 C 50,147 52,166 62,169 L 134,169 C 144,166 146,147 135,132 Z"
                fill="#0f172a"
                stroke={strokeCol}
                strokeWidth="3"
                strokeLinejoin="round"
              />
              <path d="M 76,135 L 120,164" stroke="#94a3b8" strokeWidth="3.8" strokeLinecap="round" />
              <rect x="94" y="147" width="8" height="7" rx="1.5" fill="#cbd5e1" stroke={strokeCol} strokeWidth="1.4" />
            </g>
          )}

          {/* Paws */}
          <ellipse cx="82" cy="165" rx="8" ry="6" fill={bodyFill} stroke={strokeCol} strokeWidth="3" />
          <ellipse cx="114" cy="165" rx="8" ry="6" fill={bodyFill} stroke={strokeCol} strokeWidth="3" />

          {/* Accessories */}
          {accessory === 'bowtie' && (
            <g transform="translate(0, 10)">
              <polygon points="85,122 85,136 98,129" fill={accessoryColor} stroke={strokeCol} strokeWidth="2" />
              <polygon points="111,122 111,136 98,129" fill={accessoryColor} stroke={strokeCol} strokeWidth="2" />
              <circle cx="98" cy="129" r="4" fill="#f4a261" stroke={strokeCol} strokeWidth="1.5" />
            </g>
          )}
          {accessory === 'glasses' && (
            <g>
              <circle cx="72" cy="98" r="18" fill="none" stroke={accessoryColor} strokeWidth="3" />
              <circle cx="124" cy="98" r="18" fill="none" stroke={accessoryColor} strokeWidth="3" />
              <path d="M 90,98 Q 98,92 106,98" fill="none" stroke={accessoryColor} strokeWidth="3" />
            </g>
          )}
          {accessory === 'flower' && (
            <g transform="translate(10, -5)">
              <circle cx="58" cy="50" r="5" fill={accessoryColor} stroke={strokeCol} strokeWidth="1.5" />
              <circle cx="66" cy="46" r="5" fill={accessoryColor} stroke={strokeCol} strokeWidth="1.5" />
              <circle cx="72" cy="54" r="5" fill={accessoryColor} stroke={strokeCol} strokeWidth="1.5" />
              <circle cx="66" cy="60" r="5" fill={accessoryColor} stroke={strokeCol} strokeWidth="1.5" />
              <circle cx="58" cy="58" r="5" fill={accessoryColor} stroke={strokeCol} strokeWidth="1.5" />
              <circle cx="64" cy="54" r="3.5" fill="#f4a261" />
            </g>
          )}
          {accessory === 'star' && (
            <g transform="translate(8, -6)">
              <polygon
                points="64,38 68,46 77,47 70,53 72,62 64,57 56,62 58,53 51,47 60,46"
                fill={starFill}
                stroke={strokeCol}
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <circle cx="62" cy="48" r="2" fill="#fffdf9" opacity="0.9" />
            </g>
          )}
          {accessory === 'crown' && (
            <g transform="translate(0, -6)">
              <path
                d="M 66,54 Q 98,28 130,54 L 126,66 Q 98,58 70,66 Z"
                fill={accessoryColor}
                stroke={strokeCol}
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <polygon
                points="98,38 100.5,43.5 106.5,44 102,48 103.5,54 98,50.5 92.5,54 94,48 89.5,44 95.5,43.5"
                fill="#fbbf24"
                stroke={strokeCol}
                strokeWidth="1.2"
              />
            </g>
          )}
          {accessory === 'half_heart_left' && (
            <g transform="translate(0, 10)">
              <path d="M 98,124 C 98,118 86,114 86,124 C 86,132 98,138 98,140 Z" fill={accessoryColor} stroke={strokeCol} strokeWidth="2" />
              <line x1="72" y1="126" x2="86" y2="124" stroke={strokeCol} strokeWidth="2" strokeDasharray="2,2" />
            </g>
          )}
          {accessory === 'half_heart_right' && (
            <g transform="translate(0, 10)">
              <path d="M 98,124 C 98,118 110,114 110,124 C 110,132 98,138 98,140 Z" fill={accessoryColor} stroke={strokeCol} strokeWidth="2" />
              <line x1="124" y1="126" x2="110" y2="124" stroke={strokeCol} strokeWidth="2" strokeDasharray="2,2" />
            </g>
          )}
          {accessory === 'ribbon_pair' && (
            <g transform="translate(0, 12)">
              <circle cx="98" cy="132" r="5" fill="#fbbf24" stroke={strokeCol} strokeWidth="1.8" />
              <path d="M 94,136 L 86,146 M 102,136 L 110,146" stroke={accessoryColor} strokeWidth="3" strokeLinecap="round" />
            </g>
          )}
          {/* Anime Accessories */}
          {accessory === 'anime_jojo_hat' && (
            <g transform="translate(0, -6)">
              <path
                d="M 64,54 Q 98,32 132,54 L 136,68 Q 98,60 60,68 Z"
                fill="#1e1b4b"
                stroke={strokeCol}
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <path d="M 56,66 Q 98,58 142,66 L 134,72 Q 98,65 62,72 Z" fill="#0f172a" stroke={strokeCol} strokeWidth="2" />
              <polygon points="98,40 100.5,45.5 106.5,46 102,50 103.5,56 98,52.5 92.5,56 94,50 89.5,46 95.5,45.5" fill="#fbbf24" stroke={strokeCol} strokeWidth="1.2" />
              <circle cx="114" cy="52" r="3.2" fill="#fbbf24" stroke={strokeCol} strokeWidth="1" />
            </g>
          )}
          {accessory === 'anime_fma_ahoge' && (
            <g>
              {/* Iconic golden Ed antenna strand + crimson Flamel seal */}
              <path
                d="M 96,68 C 86,44 108,28 118,38 C 110,44 102,54 100,68 Z"
                fill="#fbbf24"
                stroke={strokeCol}
                strokeWidth="2.4"
                strokeLinejoin="round"
              />
              <circle cx="66" cy="56" r="6" fill="#dc2626" stroke={strokeCol} strokeWidth="1.8" />
              <path d="M 66,52 L 66,60 M 63,55 L 69,55" stroke="#fffdf9" strokeWidth="1.6" strokeLinecap="round" />
            </g>
          )}
          {accessory === 'anime_baki_band' && (
            <g>
              {/* Red martial arts headband + cheek scar */}
              <path d="M 56,70 Q 98,60 140,70 L 143,78 Q 98,68 53,78 Z" fill="#dc2626" stroke={strokeCol} strokeWidth="2.2" />
              <path d="M 136,74 L 154,68 M 138,76 L 156,80" stroke="#dc2626" strokeWidth="3.5" strokeLinecap="round" />
              <path d="M 54,110 L 66,118 M 58,108 L 62,119" stroke="#b91c1c" strokeWidth="2.2" strokeLinecap="round" />
            </g>
          )}
          {accessory === 'anime_darling_horns' && (
            <g>
              {/* Zero Two twin coral-red horns + white hairband */}
              <path d="M 64,66 Q 98,56 132,66" fill="none" stroke="#fffdf9" strokeWidth="5.5" strokeLinecap="round" />
              <path d="M 64,66 Q 98,56 132,66" fill="none" stroke={strokeCol} strokeWidth="1.6" strokeLinecap="round" />
              <path d="M 70,63 L 62,36 L 80,58 Z" fill="#ef4444" stroke={strokeCol} strokeWidth="2.4" strokeLinejoin="round" />
              <path d="M 126,63 L 134,36 L 116,58 Z" fill="#ef4444" stroke={strokeCol} strokeWidth="2.4" strokeLinejoin="round" />
            </g>
          )}
          {accessory === 'anime_apotecaria_jade' && (
            <g>
              {/* Maomao jade hairpin + lotus blossom + subtle cute freckles */}
              <line x1="120" y1="62" x2="150" y2="38" stroke="#059669" strokeWidth="3.5" strokeLinecap="round" />
              <circle cx="136" cy="49" r="5.5" fill="#10b981" stroke={strokeCol} strokeWidth="1.8" />
              <circle cx="136" cy="49" r="2.2" fill="#fde047" />
              <circle cx="62" cy="112" r="1.3" fill="#92400e" opacity="0.7" />
              <circle cx="67" cy="115" r="1.3" fill="#92400e" opacity="0.7" />
              <circle cx="134" cy="112" r="1.3" fill="#92400e" opacity="0.7" />
              <circle cx="129" cy="115" r="1.3" fill="#92400e" opacity="0.7" />
            </g>
          )}
          {accessory === 'anime_ghibli_kiki' && (
            <g transform="translate(0, -4)">
              {/* Kiki oversized red bow on top of head */}
              <path d="M 98,58 L 68,40 C 60,52 64,66 76,66 Z" fill="#e11d48" stroke={strokeCol} strokeWidth="2.5" strokeLinejoin="round" />
              <path d="M 98,58 L 128,40 C 136,52 132,66 120,66 Z" fill="#e11d48" stroke={strokeCol} strokeWidth="2.5" strokeLinejoin="round" />
              <circle cx="98" cy="58" r="7" fill="#be123c" stroke={strokeCol} strokeWidth="2.4" />
            </g>
          )}
          {accessory === 'anime_ghibli_leaf' && (
            <g transform="translate(0, -4)">
              {/* Totoro forest leaf hat */}
              <path
                d="M 70,62 Q 98,36 128,58 Q 100,72 70,62 Z"
                fill="#16a34a"
                stroke={strokeCol}
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <path d="M 98,48 L 98,34" stroke={strokeCol} strokeWidth="2.8" strokeLinecap="round" />
              <path d="M 76,59 Q 98,52 122,57" fill="none" stroke="#86efac" strokeWidth="1.8" strokeLinecap="round" />
            </g>
          )}
          {accessory === 'anime_dandadan_visor' && (
            <g>
              {/* Okarun retro round glasses + Turbo-Granny toothy jaw mask */}
              <circle cx="72" cy="98" r="18" fill="#fef08a" fillOpacity="0.22" stroke={strokeCol} strokeWidth="3" />
              <circle cx="124" cy="98" r="18" fill="#fef08a" fillOpacity="0.22" stroke={strokeCol} strokeWidth="3" />
              <path d="M 90,98 Q 98,92 106,98" fill="none" stroke={strokeCol} strokeWidth="3" />
              <path d="M 72,118 Q 98,136 124,118 L 118,130 Q 98,140 78,130 Z" fill="#18181b" stroke={strokeCol} strokeWidth="2.2" />
              <polygon points="84,121 88,128 92,122" fill="#fffdf9" />
              <polygon points="94,123 98,130 102,123" fill="#fffdf9" />
              <polygon points="104,122 108,128 112,121" fill="#fffdf9" />
            </g>
          )}
          {accessory === 'anime_ghoul_eyepatch' && (
            <g>
              {/* Kaneki medical eyepatch on left eye + glowing red Kakugan on right eye */}
              <circle cx="124" cy="98" r="17" fill="#171717" stroke={strokeCol} strokeWidth="2" />
              <circle cx="124" cy="98" r="8" fill="#ef4444" />
              <circle cx="126" cy="95" r="3" fill="#fffdf9" />
              <path d="M 52,78 L 88,112 M 48,108 L 86,84" stroke="#262626" strokeWidth="3" strokeLinecap="round" />
              <rect x="55" y="83" width="32" height="28" rx="6" fill="#fffdf9" stroke={strokeCol} strokeWidth="2.6" />
              <line x1="63" y1="90" x2="79" y2="104" stroke="#cbd5e1" strokeWidth="2" />
            </g>
          )}
          {accessory === 'anime_sao_visor' && (
            <g>
              {/* Futuristic NerveGear / Augma headset */}
              <path
                d="M 48,88 Q 98,64 148,88 L 144,102 Q 98,84 52,102 Z"
                fill="#334155"
                stroke={strokeCol}
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <path d="M 60,86 Q 98,74 136,86" fill="none" stroke="#38bdf8" strokeWidth="3.2" strokeLinecap="round" />
              <circle cx="52" cy="94" r="5.5" fill="#0ea5e9" stroke={strokeCol} strokeWidth="1.8" />
              <circle cx="144" cy="94" r="5.5" fill="#0ea5e9" stroke={strokeCol} strokeWidth="1.8" />
            </g>
          )}
          </g>
        </g>
      </g>
      {showBed && <CatBedFrontLayer bed={bed} color={bedColor} />}
      {isSleeping && (
        <g pointerEvents="none" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <g className="anim-sleep-z-1">
            <path
              d={
                isFlipped
                  ? 'M 34,43 L 45,43 L 34,56 L 45,56'
                  : 'M 146,43 L 157,43 L 146,56 L 157,56'
              }
              stroke="#fff8ed"
              strokeWidth="5.5"
            />
            <path
              d={
                isFlipped
                  ? 'M 34,43 L 45,43 L 34,56 L 45,56'
                  : 'M 146,43 L 157,43 L 146,56 L 157,56'
              }
              stroke="#1e3a8a"
              strokeWidth="2.8"
            />
          </g>
          <g className="anim-sleep-z-2">
            <path
              d={
                isFlipped
                  ? 'M 22,29 L 31,29 L 22,39.5 L 31,39.5'
                  : 'M 160,29 L 169,29 L 160,39.5 L 169,39.5'
              }
              stroke="#fff8ed"
              strokeWidth="4.8"
            />
            <path
              d={
                isFlipped
                  ? 'M 22,29 L 31,29 L 22,39.5 L 31,39.5'
                  : 'M 160,29 L 169,29 L 160,39.5 L 169,39.5'
              }
              stroke="#1d4ed8"
              strokeWidth="2.4"
            />
          </g>
          <g className="anim-sleep-z-3">
            <path
              d={
                isFlipped
                  ? 'M 12,17 L 19.5,17 L 12,26 L 19.5,26'
                  : 'M 171,17 L 178.5,17 L 171,26 L 178.5,26'
              }
              stroke="#fff8ed"
              strokeWidth="4.2"
            />
            <path
              d={
                isFlipped
                  ? 'M 12,17 L 19.5,17 L 12,26 L 19.5,26'
                  : 'M 171,17 L 178.5,17 L 171,26 L 178.5,26'
              }
              stroke="#3b82f6"
              strokeWidth="2.1"
            />
          </g>
        </g>
      )}
    </svg>
  );
};

export const ShopItemPreviewSvg: React.FC<{
  type: 'outfit' | 'pupil' | 'eyeShape' | 'accessory' | 'breed' | 'mouth' | 'bed';
  val: string;
  baseCat: CatState;
}> = ({ type, val, baseCat }) => {
  if (type === 'bed') {
    return (
      <svg viewBox="14 104 172 96" className="w-full h-full select-none drop-shadow-sm" aria-hidden="true">
        <CatBedBackLayer bed={val as BedType} color={baseCat.bedColor || '#b91c1c'} />
        <CatBedFrontLayer bed={val as BedType} color={baseCat.bedColor || '#b91c1c'} />
      </svg>
    );
  }

  const previewCat: CatState = {
    ...baseCat,
    expression: 'happy',
    isSleeping: false,
    [type]: val,
  };

  let viewBox = '24 26 152 152';
  if (type === 'outfit') {
    viewBox = val === 'none' ? '48 126 100 54' : '32 118 134 62';
  } else if (type === 'eyeShape' || type === 'pupil') {
    viewBox = '46 72 104 52';
  } else if (type === 'mouth') {
    viewBox = '72 102 52 30';
  } else if (type === 'accessory') {
    if (val === 'star') viewBox = '50 26 42 38';
    else if (val === 'flower') viewBox = '56 34 36 32';
    else if (val === 'crown' || val === 'anime_jojo_hat' || val === 'anime_ghibli_kiki' || val === 'anime_ghibli_leaf' || val === 'anime_darling_horns') {
      viewBox = '52 22 92 56';
    } else if (val === 'anime_fma_ahoge') {
      viewBox = '52 22 80 54';
    } else if (val === 'anime_apotecaria_jade') {
      viewBox = '106 30 52 42';
    } else if (val === 'anime_baki_band') {
      viewBox = '44 54 114 70';
    } else if (val === 'glasses' || val === 'anime_ghoul_eyepatch' || val === 'anime_sao_visor') {
      viewBox = '44 64 108 58';
    } else if (val === 'anime_dandadan_visor') {
      viewBox = '44 72 108 70';
    } else if (val === 'none') {
      viewBox = '34 34 130 112';
    } else {
      viewBox = '62 118 72 46';
    }
  }

  return (
    <CatSvg
      cat={previewCat}
      viewBox={viewBox}
      className="w-full h-full select-none drop-shadow-sm"
    />
  );
};

export const MerchantCatSvg: React.FC = () => (
  <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-md select-none" aria-hidden="true">
    <g className="anim-tail">
      <path
        d="M 134,152 C 162,150 180,134 172,118 C 165,106 152,114 148,126 C 144,136 134,146 130,154 Z"
        fill="#ebdcc9"
        stroke="#2b1111"
        strokeWidth="3.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </g>
    <g className="anim-body">
      <path
        d="M 64,136 C 56,152 56,168 68,172 C 78,175 84,164 88,152 C 94,152 104,152 110,152 C 114,164 120,175 130,172 C 142,168 140,152 134,136 Z"
        fill="#ebdcc9"
        stroke="#2b1111"
        strokeWidth="4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <polygon points="76,138 120,138 124,170 72,170" fill="#b91c1c" stroke="#2b1111" strokeWidth="2.5" />
      <line x1="82" y1="138" x2="72" y2="124" stroke="#2b1111" strokeWidth="2.5" />
      <line x1="114" y1="138" x2="124" y2="124" stroke="#2b1111" strokeWidth="2.5" />
      <rect x="88" y="146" width="20" height="15" rx="3" fill="#991b1b" stroke="#fbbf24" strokeWidth="1.8" />
      <polygon points="98,148 100,152 104,152 101,155 102,159 98,156 94,159 95,155 92,152 96,152" fill="#fbbf24" />
      <path
        d="M 44,82 C 40,54 44,38 52,42 C 64,48 82,70 98,70 C 114,70 132,48 144,42 C 152,38 156,54 152,82 C 160,112 142,138 98,138 C 54,138 36,112 44,82 Z"
        fill="#ebdcc9"
        stroke="#2b1111"
        strokeWidth="4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <polygon points="52,46 64,54 52,68" fill="#f7c2c2" opacity="0.75" />
      <polygon points="144,46 132,54 144,68" fill="#f7c2c2" opacity="0.75" />
      <path d="M 60,48 Q 98,20 136,46 Q 142,56 128,58 Q 98,50 68,58 Q 54,56 60,48 Z" fill="#b91c1c" stroke="#2b1111" strokeWidth="2.8" />
      <polygon points="98,32 100.5,37 106,37.5 102,41 103,46.5 98,43.5 93,46.5 94,41 90,37.5 95.5,37" fill="#fbbf24" stroke="#2b1111" strokeWidth="1" />
      <g className="anim-blink">
        <ellipse cx="74" cy="96" rx="12" ry="15" fill="#2b1111" />
        <ellipse cx="122" cy="96" rx="12" ry="15" fill="#2b1111" />
        <circle cx="78" cy="91" r="4" fill="#fff" />
        <circle cx="126" cy="91" r="4" fill="#fff" />
      </g>
      <polygon points="95,112 101,112 98,116" fill="#e76f51" />
      <path d="M 92,118 Q 98,125 104,118" fill="none" stroke="#2b1111" strokeWidth="2.5" strokeLinecap="round" />
    </g>
  </svg>
);

export const PawGestureSvg: React.FC<{ gesture: Exclude<JokenpoChoice, ''>; size?: number }> = ({
  gesture,
  size = 44,
}) => {
  const stroke = '#2b1111';
  if (gesture === 'rock') {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="54" r="28" fill="#fffdf9" stroke={stroke} strokeWidth="3.5" />
        <ellipse cx="50" cy="60" rx="14" ry="11" fill="#f7b0b0" stroke={stroke} strokeWidth="2" />
        <circle cx="34" cy="40" r="6.5" fill="#f7b0b0" stroke={stroke} strokeWidth="2" />
        <circle cx="45" cy="34" r="6.5" fill="#f7b0b0" stroke={stroke} strokeWidth="2" />
        <circle cx="56" cy="34" r="6.5" fill="#f7b0b0" stroke={stroke} strokeWidth="2" />
        <circle cx="67" cy="40" r="6.5" fill="#f7b0b0" stroke={stroke} strokeWidth="2" />
      </svg>
    );
  }
  if (gesture === 'paper') {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
        <path
          d="M 28,72 C 24,52 28,24 38,24 C 45,24 46,42 46,42 C 46,42 47,16 55,16 C 63,16 62,42 62,42 C 62,42 64,22 72,22 C 80,22 78,52 72,72 C 66,88 34,88 28,72 Z"
          fill="#fffdf9"
          stroke={stroke}
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        <ellipse cx="50" cy="64" rx="13" ry="10" fill="#f7b0b0" stroke={stroke} strokeWidth="2" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <path
        d="M 30,74 L 30,54 L 38,20 C 44,16 48,22 48,48 L 54,48 L 62,18 C 68,16 74,22 68,54 L 70,74 C 66,86 34,86 30,74 Z"
        fill="#fffdf9"
        stroke={stroke}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <circle cx="41" cy="24" r="3" fill="#f7b0b0" />
      <circle cx="64" cy="22" r="3" fill="#f7b0b0" />
      <ellipse cx="50" cy="66" rx="12" ry="9" fill="#f7b0b0" stroke={stroke} strokeWidth="2" />
    </svg>
  );
};

export const BoardPieceSvg: React.FC<{
  mode: 'chess' | 'checkers';
  piece: ChessPieceType | CheckersPieceType;
  color: PieceColor;
}> = ({ mode, piece, color }) => {
  const isWhite = color === 'white';
  const bodyColor = isWhite ? '#fffdfa' : '#3d3835';
  const earInner = isWhite ? '#f7b0b0' : '#8c6052';
  const stroke = '#2b1111';
  const crown = isWhite ? '#ffd166' : '#f59e0b';

  if (mode === 'checkers') {
    const isKing = piece === 'K';
    return (
      <svg viewBox="0 0 100 100" className="w-[82%] h-[82%] anim-idle drop-shadow-sm select-none pointer-events-none">
        <circle cx="50" cy="50" r="42" fill={bodyColor} stroke={stroke} strokeWidth="5" />
        <circle
          cx="50"
          cy="50"
          r="30"
          fill={isWhite ? '#fef3c7' : '#524b47'}
          stroke={stroke}
          strokeWidth="2.5"
        />
        <ellipse cx="40" cy="45" rx="4" ry="6" fill={stroke} />
        <ellipse cx="60" cy="45" rx="4" ry="6" fill={stroke} />
        <polygon points="48,54 52,54 50,57" fill="#e76f51" />
        <path d="M 47,59 Q 50,63 53,59" stroke={stroke} strokeWidth="2.5" fill="none" />
        {isKing && (
          <path
            d="M 34,26 L 41,36 L 50,20 L 59,36 L 66,26 L 63,40 L 37,40 Z"
            fill={crown}
            stroke={stroke}
            strokeWidth="2.5"
          />
        )}
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 100 100" className="w-[88%] h-[88%] anim-idle drop-shadow-sm select-none pointer-events-none">
      <g>
        <path
          d="M 28,88 C 22,88 24,72 32,66 C 36,62 64,62 68,66 C 76,72 78,88 72,88 Z"
          fill={bodyColor}
          stroke={stroke}
          strokeWidth="4"
        />
        <path
          d="M 28,46 C 24,28 32,16 38,20 C 44,24 50,34 50,34 C 50,34 56,24 62,20 C 68,16 76,28 72,46 C 78,64 68,72 50,72 C 32,72 22,64 28,46 Z"
          fill={bodyColor}
          stroke={stroke}
          strokeWidth="4"
        />
        <polygon points="34,24 40,30 32,38" fill={earInner} />
        <polygon points="66,24 60,30 68,38" fill={earInner} />
        <ellipse cx="42" cy="46" rx="4.5" ry="6" fill={stroke} />
        <ellipse cx="58" cy="46" rx="4.5" ry="6" fill={stroke} />
        <polygon points="48,53 52,53 50,56" fill="#e76f51" />
        <path d="M 46,58 Q 50,62 54,58" stroke={stroke} strokeWidth="2.2" fill="none" />
        {piece === 'p' && <circle cx="50" cy="74" r="10" fill="#b91c1c" stroke={stroke} strokeWidth="2.5" />}
        {piece === 'r' && <rect x="30" y="66" width="40" height="20" rx="3" fill="#c49a6c" stroke={stroke} strokeWidth="3" />}
        {piece === 'n' && (
          <path d="M 64,48 Q 78,56 70,74" fill="none" stroke={stroke} strokeWidth="4.5" strokeLinecap="round" />
        )}
        {piece === 'b' && (
          <ellipse cx="50" cy="22" rx="10" ry="14" fill={isWhite ? '#ef4444' : '#991b1b'} stroke={stroke} strokeWidth="2.5" />
        )}
        {piece === 'q' && (
          <>
            <path d="M 32,24 L 40,32 L 50,18 L 60,32 L 68,24 L 64,36 L 36,36 Z" fill={crown} stroke={stroke} strokeWidth="2.5" />
            <circle cx="50" cy="18" r="3.5" fill="#ef4444" />
          </>
        )}
        {piece === 'k' && (
          <>
            <path d="M 30,22 L 36,34 L 50,16 L 64,34 L 70,22 L 66,38 L 34,38 Z" fill={crown} stroke={stroke} strokeWidth="2.5" />
            <path d="M 48,10 L 52,10 M 50,8 L 50,14" stroke={stroke} strokeWidth="2.5" />
          </>
        )}
      </g>
    </svg>
  );
};
