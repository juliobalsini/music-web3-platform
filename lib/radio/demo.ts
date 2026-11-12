// Catálogo de demonstração: só fora de produção (prévias da Vercel, testes locais).
// Áudio = public/demo/tom.wav (arquivo estático, sem B2 e sem cota). Produção nunca vê estes dados.

import { PLATAFORMA_ID } from "./home";

export const DEMO_AUDIO_URL = "/demo/tom.wav";
export const DEMO_DURACAO = 8;

/** Ligado fora de produção. `RADIO_DEMO=0` desliga (ex.: conferir o estado vazio). */
export function demoAtivo(): boolean {
  return process.env.VERCEL_ENV !== "production" && process.env.RADIO_DEMO !== "0";
}

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export const ehFaixaDemo = (faixaId: string) => /^00000000-0000-4000-8000-0000000000[0-9a-f]{2}$/i.test(faixaId);

const ARTISTAS = [
  { id: id(101), nome: "Lia Norte" },
  { id: id(102), nome: "Maré Alta" },
  { id: id(103), nome: "Duo Vitrola" },
];
const CURADORES = [
  { id: id(201), nome: "Clara Sintonia" },
  { id: id(202), nome: "Rádio do Bairro" },
];

const TITULOS: [string, number][] = [
  ["Madrugada no Convés", 0],
  ["Faróis", 1],
  ["Ondas curtas", 2],
  ["Vitrola azul", 2],
  ["Porto sem pressa", 1],
  ["Sinal âmbar", 0],
  ["Maré de domingo", 1],
  ["Fio de prata", 0],
];

const GENEROS_DEMO = ["mpb", "indie", "eletronica", "jazz"];
const CLIMAS_DEMO = ["madrugada", "estrada", "foco", "chuva", "domingo"];

export type DemoDados = {
  tracks: Record<string, unknown>[];
  stories: { id: string; author_id: string; is_platform: boolean; body: string | null; image_key: string | null; track_id: string | null; clip_start: number | null; hidden: boolean; created_at: string }[];
  albums: { id: string; title: string; kind: string; artist_id: string; created_at: string }[];
  playlists: Record<string, unknown>[];
  programs: Record<string, unknown>[];
  nomes: Map<string, string>;
  escutas: { track_id: string; started_at: string }[];
  curtidas: { track_id: string }[];
};

export function dadosDemo(agora: number): DemoDados {
  const dia = 24 * 3600 * 1000;
  const tracks = TITULOS.map(([title, a], i) => ({
    id: id(1 + i),
    title,
    artist_id: ARTISTAS[a].id,
    duration_sec: DEMO_DURACAO,
    cover_key: null,
    created_at: new Date(agora - (i + 1) * 3 * 3600 * 1000).toISOString(),
    composer: i === 0 ? "Lia Norte" : null,
    performers: i === 0 ? "Lia Norte (voz), Beto Cordas (violão)" : null,
    album: i === 0 ? "Sinais" : null,
    label: null,
    // EP demo "Sinais": faixas 1, 6 e 8 (todas de Lia Norte).
    album_id: [0, 5, 7].includes(i) ? id(401) : null,
    track_no: [0, 5, 7].includes(i) ? [0, 5, 7].indexOf(i) + 1 : null,
    genre: GENEROS_DEMO[i % GENEROS_DEMO.length],
    mood: CLIMAS_DEMO[i % CLIMAS_DEMO.length],
  }));
  const faixaPl = (n: number[], notas: string[] = []) =>
    n.map((t, position) => ({ track_id: id(t), note: notas[position] ?? null, position }));
  const playlists = [
    {
      id: id(301), title: "Manhã no porto", curator_id: CURADORES[0].id,
      created_at: new Date(agora - 2 * dia).toISOString(),
      playlist_tracks: faixaPl([1, 2, 3, 4], ["Abre o dia com calma.", "Violão e brisa."]),
    },
    {
      id: id(302), title: "Madrugada de rádio", curator_id: CURADORES[1].id,
      created_at: new Date(agora - 1 * dia).toISOString(),
      playlist_tracks: faixaPl([5, 6, 7, 8], ["Para quem fica acordado."]),
    },
  ];
  const programs = [
    { id: id(401), title: "Manhã no porto", start_hour: 0, end_hour: 12, playlist_id: id(301), curator_id: CURADORES[0].id },
    { id: id(402), title: "Madrugada de rádio", start_hour: 12, end_hour: 24, playlist_id: id(302), curator_id: CURADORES[1].id },
  ];
  // Escutas na semana: dão corpo ao "Em alta" (faixas 2, 3 e 1 à frente).
  const escutas: DemoDados["escutas"] = [];
  const peso: Record<number, number> = { 2: 9, 3: 6, 1: 4, 6: 2 };
  for (const [t, n] of Object.entries(peso)) {
    for (let k = 0; k < n; k++) escutas.push({ track_id: id(Number(t)), started_at: new Date(agora - (k + 1) * 3600 * 1000).toISOString() });
  }
  const nomes = new Map([...ARTISTAS, ...CURADORES].map((p) => [p.id, p.nome]));
  const albums = [{ id: id(401), title: "Sinais", kind: "ep", artist_id: ARTISTAS[0].id, created_at: new Date(agora - 4 * 3600 * 1000).toISOString() }];
  const stories = [
    { id: id(501), author_id: ARTISTAS[0].id, is_platform: false, body: "Ensaio aberto hoje à noite. Esse é o refrão novo.", image_key: null, track_id: id(1), clip_start: 0, hidden: false, created_at: new Date(agora - 2 * 3600 * 1000).toISOString() },
    { id: id(502), author_id: PLATAFORMA_ID, is_platform: true, body: "Bem-vindo à rádio. Música independente, sem cadastro para ouvir.", image_key: null, track_id: null, clip_start: null, hidden: false, created_at: new Date(agora - 5 * 3600 * 1000).toISOString() },
    { id: id(503), author_id: CURADORES[0].id, is_platform: false, body: "Story antigo: já saiu da faixa da home, fica no perfil.", image_key: null, track_id: null, clip_start: null, hidden: false, created_at: new Date(agora - 9 * dia).toISOString() },
  ];
  return { tracks, albums, stories, playlists, programs, nomes, escutas, curtidas: [{ track_id: id(2) }, { track_id: id(2) }, { track_id: id(3) }] };
}
