/**
 * Syntax Flow — Hero sağ panel: "Dilin Matematiği" vizyonu.
 * Kod/laboratuvar ekranı hissi, ızgara, kelime blokları, neon bağlantı çizgileri, dönen cümleler.
 * Sadece görsel; tıklanabilir değil (pointer-events-none).
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type PartType = 'subject' | 'verb' | 'adjective' | 'object';

type Part = {
  word: string;
  type: PartType;
  detail: string;
};

type Sentence = {
  lang: string;
  parts: Part[];
};

const SENTENCES: Sentence[] = [
  {
    lang: 'Fransızca',
    parts: [
      { word: 'Je', type: 'subject', detail: 'Pronoun: 1st sg.' },
      { word: 'mange', type: 'verb', detail: 'Verb: 1st pers. sing.' },
      { word: 'une', type: 'adjective', detail: 'Det: fem. sing.' },
      { word: 'pomme', type: 'object', detail: 'Noun: feminine' },
    ],
  },
  {
    lang: 'İspanyolca',
    parts: [
      { word: 'Yo', type: 'subject', detail: 'Pronoun: 1st sg.' },
      { word: 'bebo', type: 'verb', detail: 'Verb: 1st pers. sing.' },
      { word: 'agua', type: 'object', detail: 'Noun: feminine' },
    ],
  },
  {
    lang: 'Fransızca',
    parts: [
      { word: 'Il', type: 'subject', detail: 'Pronoun: 3rd sg.' },
      { word: 'parle', type: 'verb', detail: 'Verb: 3rd pers. sing.' },
      { word: 'français', type: 'object', detail: 'Noun: masculine' },
    ],
  },
  {
    lang: 'İspanyolca',
    parts: [
      { word: 'Ella', type: 'subject', detail: 'Pronoun: 3rd sg.' },
      { word: 'lee', type: 'verb', detail: 'Verb: 3rd pers. sing.' },
      { word: 'un libro', type: 'object', detail: 'Noun: masculine' },
    ],
  },
];

const TYPE_COLORS: Record<PartType, { fill: string; stroke: string; glow: string }> = {
  subject: { fill: 'rgb(99, 102, 241)', stroke: 'rgba(129, 140, 248, 0.8)', glow: 'rgba(99, 102, 241, 0.5)' },
  verb: { fill: 'rgb(244, 63, 94)', stroke: 'rgba(251, 113, 133, 0.8)', glow: 'rgba(244, 63, 94, 0.5)' },
  adjective: { fill: 'rgb(245, 158, 11)', stroke: 'rgba(251, 191, 36, 0.8)', glow: 'rgba(245, 158, 11, 0.5)' },
  object: { fill: 'rgb(99, 102, 241)', stroke: 'rgba(129, 140, 248, 0.6)', glow: 'rgba(99, 102, 241, 0.35)' },
};

const VIEWBOX = { w: 420, h: 240 };
const BLOCK_WIDTH = 72;
const BLOCK_HEIGHT = 36;
const BLOCK_GAP = 24;

function getBlockPositions(count: number) {
  const totalWidth = count * BLOCK_WIDTH + (count - 1) * BLOCK_GAP;
  const startX = (VIEWBOX.w - totalWidth) / 2 + BLOCK_WIDTH / 2 + BLOCK_GAP / 2;
  const baseY = VIEWBOX.h / 2;
  return Array.from({ length: count }, (_, i) => ({
    x: startX + i * (BLOCK_WIDTH + BLOCK_GAP),
    y: baseY,
  }));
}

export default function SyntaxFlowHero() {
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const sentence = SENTENCES[sentenceIndex];
  const positions = getBlockPositions(sentence.parts.length);

  useEffect(() => {
    const t = setInterval(() => {
      setSentenceIndex((i) => (i + 1) % SENTENCES.length);
    }, 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      className="flex-1 max-w-lg mx-auto lg:max-w-none flex items-center justify-center pointer-events-none select-none"
      aria-hidden
    >
      <div className="relative w-full max-w-[420px] aspect-[420/240] rounded-xl overflow-hidden bg-[#0a0e17]/60 dark:bg-[#0a0e17]/80 border border-white/[0.06] dark:border-white/[0.08]">
        {/* Çok ince ızgara */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.06] dark:opacity-[0.08]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="syntax-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.4" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#syntax-grid)" className="text-indigo-400/80" />
        </svg>

        {/* Ana içerik */}
        <svg
          viewBox={`0 0 ${VIEWBOX.w} ${VIEWBOX.h}`}
          className="relative w-full h-full font-mono text-[10px]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="syntax-line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgb(99, 102, 241)" stopOpacity="0.9" />
              <stop offset="50%" stopColor="rgb(245, 158, 11)" stopOpacity="0.7" />
              <stop offset="100%" stopColor="rgb(129, 140, 248)" stopOpacity="0.9" />
            </linearGradient>
            <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {Object.entries(TYPE_COLORS).map(([key, { glow }]) => (
              <filter key={key} id={`glow-${key}`} x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
                <feFlood floodColor={glow} floodOpacity="1" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="glow" />
                <feMerge>
                  <feMergeNode in="glow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            ))}
          </defs>

          <AnimatePresence mode="wait">
            <motion.g
              key={sentenceIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
            >
              {/* Bağlantı çizgileri — bloklar arası neon path */}
              {positions.length > 1 &&
                positions.slice(0, -1).map((p, i) => {
                  const next = positions[i + 1];
                  const midX = (p.x + next.x) / 2;
                  return (
                    <motion.path
                      key={i}
                      d={`M ${p.x} ${p.y} Q ${midX} ${p.y} ${midX} ${(p.y + next.y) / 2} Q ${midX} ${next.y} ${next.x} ${next.y}`}
                      stroke="url(#syntax-line-gradient)"
                      strokeWidth="1.2"
                      fill="none"
                      strokeLinecap="round"
                      filter="url(#neon-glow)"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.85 }}
                      transition={{ duration: 0.4, delay: 0.08 * i }}
                    />
                  );
                })}

              {/* Kelime blokları */}
              {sentence.parts.map((part, i) => {
                const pos = positions[i];
                const colors = TYPE_COLORS[part.type];
                return (
                  <BlockGroup
                    key={`${sentenceIndex}-${i}`}
                    type={part.type}
                    x={pos.x}
                    y={pos.y}
                    word={part.word}
                    detail={part.detail}
                    colors={colors}
                    index={i}
                  />
                );
              })}

              {/* Dil etiketi */}
              <motion.text
                x={VIEWBOX.w / 2}
                y={VIEWBOX.h - 14}
                textAnchor="middle"
                className="fill-slate-500 dark:fill-slate-500"
                style={{ fontSize: '9px', fontFamily: 'ui-monospace, monospace' }}
              >
                {sentence.lang}
              </motion.text>
            </motion.g>
          </AnimatePresence>
        </svg>
      </div>
    </div>
  );
}

function BlockGroup({
  type,
  x,
  y,
  word,
  detail,
  colors,
  index,
}: {
  type: PartType;
  x: number;
  y: number;
  word: string;
  detail: string;
  colors: { fill: string; stroke: string; glow: string };
  index: number;
}) {
  const w = BLOCK_WIDTH;
  const h = BLOCK_HEIGHT;
  const rx = 6;

  return (
    <motion.g
      transform={`translate(${x - w / 2}, ${y - h / 2})`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: 0.05 * index }}
    >
      <motion.g
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 3 + index * 0.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Blok arka plan */}
        <motion.rect
          width={w}
          height={h}
          rx={rx}
          fill={colors.fill}
          fillOpacity="0.2"
          stroke={colors.stroke}
          strokeWidth="1"
          filter={`url(#glow-${type})`}
        />
        {/* Kelime */}
        <text
          x={w / 2}
          y={h / 2 + 4}
          textAnchor="middle"
          fill="rgba(248, 250, 252, 0.95)"
          style={{ fontSize: '11px', fontFamily: 'ui-monospace, monospace', fontWeight: 600 }}
        >
          {word}
        </text>
        {/* Teknik detay — küçük, yanında belirip kaybolan */}
        <motion.text
          x={w + 6}
          y={h / 2 + 3}
          textAnchor="start"
          fill="currentColor"
          className="text-slate-500 dark:text-slate-400"
          style={{ fontSize: '8px', fontFamily: 'ui-monospace, monospace' }}
          animate={{ opacity: [0.25, 0.8, 0.25] }}
          transition={{ duration: 4, repeat: Infinity, delay: index * 0.7 }}
        >
          {detail}
        </motion.text>
      </motion.g>
    </motion.g>
  );
}
