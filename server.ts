import 'dotenv/config';
import http from 'http';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

process.on('uncaughtException', (err) => {
  console.error('[Server UncaughtException]', err);
});
process.on('unhandledRejection', (reason) => {
  console.warn('[Server UnhandledRejection]', reason);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Catálogo amplio de artistas clasificados en los géneros oficiales de Spotyy_AA
export const catalogoArtistas: Array<{
  nombres: string[];
  artistaOficial: string;
  genero: string;
}> = [
  // Corridos & Corridos Tumbados
  { nombres: ['peso pluma', 'doble p'], artistaOficial: 'Peso Pluma', genero: 'Corridos' },
  { nombres: ['natanael cano', 'nata'], artistaOficial: 'Natanael Cano', genero: 'Corridos Tumbados' },
  { nombres: ['junior h'], artistaOficial: 'Junior H', genero: 'Corridos Tumbados' },
  { nombres: ['fuerza regida', 'jop'], artistaOficial: 'Fuerza Regida', genero: 'Corridos' },
  { nombres: ['gabito ballesteros'], artistaOficial: 'Gabito Ballesteros', genero: 'Corridos' },
  { nombres: ['tito double p', 'tito p'], artistaOficial: 'Tito Double P', genero: 'Corridos' },
  { nombres: ['chino pacas'], artistaOficial: 'Chino Pacas', genero: 'Corridos' },
  { nombres: ['luis r conriquez', 'luis r'], artistaOficial: 'Luis R Conriquez', genero: 'Corridos' },
  { nombres: ['el fantasma'], artistaOficial: 'El Fantasma', genero: 'Corridos' },
  { nombres: ['los dos carnales'], artistaOficial: 'Los Dos Carnales', genero: 'Corridos' },
  { nombres: ['oscar maydon'], artistaOficial: 'Oscar Maydon', genero: 'Corridos' },
  { nombres: ['calle 24'], artistaOficial: 'Calle 24', genero: 'Corridos' },
  { nombres: ['victor cibrian'], artistaOficial: 'Victor Cibrian', genero: 'Corridos' },
  { nombres: ['los gemelos de sinaloa'], artistaOficial: 'Los Gemelos de Sinaloa', genero: 'Corridos' },
  { nombres: ['arsenal efectivo'], artistaOficial: 'Arsenal Efectivo', genero: 'Corridos' },
  { nombres: ['tony loya'], artistaOficial: 'Tony Loya', genero: 'Corridos' },

  // Banda
  { nombres: ['banda ms'], artistaOficial: 'Banda MS', genero: 'Banda' },
  { nombres: ['grupo firme', 'eduin caz'], artistaOficial: 'Grupo Firme', genero: 'Banda' },
  { nombres: ['calibre 50'], artistaOficial: 'Calibre 50', genero: 'Banda' },
  { nombres: ['julion alvarez', 'julión álvarez'], artistaOficial: 'Julión Álvarez', genero: 'Banda' },
  { nombres: ['la arrolladora', 'arrolladora banda'], artistaOficial: 'La Arrolladora Banda El Limón', genero: 'Banda' },
  { nombres: ['banda el recodo', 'el recodo'], artistaOficial: 'Banda El Recodo', genero: 'Banda' },
  { nombres: ['banda los recoditos', 'los recoditos'], artistaOficial: 'Banda Los Recoditos', genero: 'Banda' },
  { nombres: ['banda carnaval'], artistaOficial: 'Banda Carnaval', genero: 'Banda' },
  { nombres: ['la adictiva'], artistaOficial: 'La Adictiva', genero: 'Banda' },
  { nombres: ['gerardo ortiz'], artistaOficial: 'Gerardo Ortiz', genero: 'Banda' },
  { nombres: ['alfredo olivas'], artistaOficial: 'Alfredo Olivas', genero: 'Banda' },
  { nombres: ['los plebes del rancho', 'ariel camacho'], artistaOficial: 'Los Plebes del Rancho', genero: 'Banda' },
  { nombres: ['chuy lizarraga', 'chuy lizárraga'], artistaOficial: 'Chuy Lizárraga', genero: 'Banda' },
  { nombres: ['valentin elizalde', 'valentín elizalde'], artistaOficial: 'Valentín Elizalde', genero: 'Banda' },

  // Regional Mexicano
  { nombres: ['christian nodal', 'nodal'], artistaOficial: 'Christian Nodal', genero: 'Regional Mexicano' },
  { nombres: ['carin leon', 'carin león'], artistaOficial: 'Carin Leon', genero: 'Regional Mexicano' },
  { nombres: ['eden muñoz'], artistaOficial: 'Eden Muñoz', genero: 'Regional Mexicano' },
  { nombres: ['eslabon armado', 'eslabón armado'], artistaOficial: 'Eslabón Armado', genero: 'Regional Mexicano' },
  { nombres: ['los tigres del norte'], artistaOficial: 'Los Tigres del Norte', genero: 'Regional Mexicano' },
  { nombres: ['los tucanes de tijuana'], artistaOficial: 'Los Tucanes de Tijuana', genero: 'Regional Mexicano' },
  { nombres: ['intocable'], artistaOficial: 'Intocable', genero: 'Regional Mexicano' },
  { nombres: ['grupo duelo', 'duelo'], artistaOficial: 'Duelo', genero: 'Regional Mexicano' },
  { nombres: ['grupo pesado', 'pesado'], artistaOficial: 'Pesado', genero: 'Regional Mexicano' },
  { nombres: ['ramon ayala', 'ramón ayala'], artistaOficial: 'Ramón Ayala', genero: 'Regional Mexicano' },
  { nombres: ['los invasores de nuevo leon'], artistaOficial: 'Los Invasores de Nuevo León', genero: 'Regional Mexicano' },
  { nombres: ['bronco', 'grupo bronco'], artistaOficial: 'Bronco', genero: 'Regional Mexicano' },
  { nombres: ['joss favela'], artistaOficial: 'Joss Favela', genero: 'Regional Mexicano' },

  // Reggaetón
  { nombres: ['bad bunny', 'benito'], artistaOficial: 'Bad Bunny', genero: 'Reggaeton' },
  { nombres: ['feid', 'ferxxo'], artistaOficial: 'Feid', genero: 'Reggaeton' },
  { nombres: ['karol g', 'la bichota'], artistaOficial: 'Karol G', genero: 'Reggaeton' },
  { nombres: ['daddy yankee'], artistaOficial: 'Daddy Yankee', genero: 'Reggaeton' },
  { nombres: ['don omar'], artistaOficial: 'Don Omar', genero: 'Reggaeton' },
  { nombres: ['rauw alejandro', 'rauw'], artistaOficial: 'Rauw Alejandro', genero: 'Reggaeton' },
  { nombres: ['j balvin'], artistaOficial: 'J Balvin', genero: 'Reggaeton' },
  { nombres: ['maluma'], artistaOficial: 'Maluma', genero: 'Reggaeton' },
  { nombres: ['wisin & yandel', 'wisin y yandel', 'wisin', 'yandel'], artistaOficial: 'Wisin & Yandel', genero: 'Reggaeton' },
  { nombres: ['ozuna'], artistaOficial: 'Ozuna', genero: 'Reggaeton' },
  { nombres: ['nicky jam'], artistaOficial: 'Nicky Jam', genero: 'Reggaeton' },
  { nombres: ['arcangel', 'arcángel'], artistaOficial: 'Arcángel', genero: 'Reggaeton' },
  { nombres: ['plan b', 'chencho corleone'], artistaOficial: 'Plan B', genero: 'Reggaeton' },
  { nombres: ['ryan castro'], artistaOficial: 'Ryan Castro', genero: 'Reggaeton' },
  { nombres: ['blessd'], artistaOficial: 'Blessd', genero: 'Reggaeton' },
  { nombres: ['zion & lennox', 'zion y lennox'], artistaOficial: 'Zion & Lennox', genero: 'Reggaeton' },
  { nombres: ['farruko'], artistaOficial: 'Farruko', genero: 'Reggaeton' },
  { nombres: ['sech'], artistaOficial: 'Sech', genero: 'Reggaeton' },
  { nombres: ['mora'], artistaOficial: 'Mora', genero: 'Reggaeton' },
  { nombres: ['jhayco', 'jhay cortez'], artistaOficial: 'Jhayco', genero: 'Reggaeton' },
  { nombres: ['becky g'], artistaOficial: 'Becky G', genero: 'Reggaeton' },
  { nombres: ['natti natasha'], artistaOficial: 'Natti Natasha', genero: 'Reggaeton' },
  { nombres: ['manuel turizo'], artistaOficial: 'Manuel Turizo', genero: 'Reggaeton' },

  // Pop
  { nombres: ['dua lipa'], artistaOficial: 'Dua Lipa', genero: 'Pop' },
  { nombres: ['taylor swift'], artistaOficial: 'Taylor Swift', genero: 'Pop' },
  { nombres: ['shakira'], artistaOficial: 'Shakira', genero: 'Pop' },
  { nombres: ['michael jackson'], artistaOficial: 'Michael Jackson', genero: 'Pop' },
  { nombres: ['ariana grande'], artistaOficial: 'Ariana Grande', genero: 'Pop' },
  { nombres: ['bruno mars'], artistaOficial: 'Bruno Mars', genero: 'Pop' },
  { nombres: ['the weeknd', 'weeknd'], artistaOficial: 'The Weeknd', genero: 'Pop' },
  { nombres: ['justin bieber'], artistaOficial: 'Justin Bieber', genero: 'Pop' },
  { nombres: ['katy perry'], artistaOficial: 'Katy Perry', genero: 'Pop' },
  { nombres: ['rihanna'], artistaOficial: 'Rihanna', genero: 'Pop' },
  { nombres: ['billie eilish'], artistaOficial: 'Billie Eilish', genero: 'Pop' },
  { nombres: ['harry styles'], artistaOficial: 'Harry Styles', genero: 'Pop' },
  { nombres: ['ed sheeran'], artistaOficial: 'Ed Sheeran', genero: 'Pop' },
  { nombres: ['lady gaga'], artistaOficial: 'Lady Gaga', genero: 'Pop' },
  { nombres: ['selena gomez'], artistaOficial: 'Selena Gomez', genero: 'Pop' },
  { nombres: ['camila cabello'], artistaOficial: 'Camila Cabello', genero: 'Pop' },
  { nombres: ['olivia rodrigo'], artistaOficial: 'Olivia Rodrigo', genero: 'Pop' },
  { nombres: ['jonas brothers', 'camp rock'], artistaOficial: 'Jonas Brothers', genero: 'Pop' },
  { nombres: ['shawn mendes'], artistaOficial: 'Shawn Mendes', genero: 'Pop' },
  { nombres: ['adele'], artistaOficial: 'Adele', genero: 'Pop' },
  { nombres: ['madonna'], artistaOficial: 'Madonna', genero: 'Pop' },
  { nombres: ['britney spears'], artistaOficial: 'Britney Spears', genero: 'Pop' },
  { nombres: ['beyonce', 'beyoncé'], artistaOficial: 'Beyoncé', genero: 'Pop' },
  { nombres: ['justin timberlake'], artistaOficial: 'Justin Timberlake', genero: 'Pop' },
  { nombres: ['miley cyrus'], artistaOficial: 'Miley Cyrus', genero: 'Pop' },
  { nombres: ['maroon 5'], artistaOficial: 'Maroon 5', genero: 'Pop' },
  { nombres: ['chayanne'], artistaOficial: 'Chayanne', genero: 'Pop' },
  { nombres: ['ricky martin'], artistaOficial: 'Ricky Martin', genero: 'Pop' },
  { nombres: ['enrique iglesias'], artistaOficial: 'Enrique Iglesias', genero: 'Pop' },
  { nombres: ['sebastian yatra', 'sebastián yatra'], artistaOficial: 'Sebastián Yatra', genero: 'Pop' },
  { nombres: ['morat'], artistaOficial: 'Morat', genero: 'Pop' },
  { nombres: ['camilo'], artistaOficial: 'Camilo', genero: 'Pop' },
  { nombres: ['aitana'], artistaOficial: 'Aitana', genero: 'Pop' },

  // Rock
  { nombres: ['queen', 'freddie mercury'], artistaOficial: 'Queen', genero: 'Rock' },
  { nombres: ['the beatles', 'beatles'], artistaOficial: 'The Beatles', genero: 'Rock' },
  { nombres: ['metallica'], artistaOficial: 'Metallica', genero: 'Rock' },
  { nombres: ['ac/dc', 'acdc'], artistaOficial: 'AC/DC', genero: 'Rock' },
  { nombres: ['guns n roses', "guns n' roses"], artistaOficial: "Guns N' Roses", genero: 'Rock' },
  { nombres: ['nirvana', 'kurt cobain'], artistaOficial: 'Nirvana', genero: 'Rock' },
  { nombres: ['linkin park', 'chester bennington'], artistaOficial: 'Linkin Park', genero: 'Rock' },
  { nombres: ['red hot chili peppers', 'rhcp'], artistaOficial: 'Red Hot Chili Peppers', genero: 'Rock' },
  { nombres: ['bon jovi'], artistaOficial: 'Bon Jovi', genero: 'Rock' },
  { nombres: ['pink floyd'], artistaOficial: 'Pink Floyd', genero: 'Rock' },
  { nombres: ['led zeppelin'], artistaOficial: 'Led Zeppelin', genero: 'Rock' },
  { nombres: ['aerosmith'], artistaOficial: 'Aerosmith', genero: 'Rock' },
  { nombres: ['the rolling stones', 'rolling stones'], artistaOficial: 'The Rolling Stones', genero: 'Rock' },
  { nombres: ['green day'], artistaOficial: 'Green Day', genero: 'Rock' },
  { nombres: ['foo fighters'], artistaOficial: 'Foo Fighters', genero: 'Rock' },
  { nombres: ['soda stereo', 'gustavo cerati', 'cerati'], artistaOficial: 'Soda Stereo', genero: 'Rock' },
  { nombres: ['mana', 'maná'], artistaOficial: 'Maná', genero: 'Rock' },
  { nombres: ['enanitos verdes', 'los enanitos verdes'], artistaOficial: 'Los Enanitos Verdes', genero: 'Rock' },
  { nombres: ['molotov'], artistaOficial: 'Molotov', genero: 'Rock' },
  { nombres: ['caifanes', 'jaguares'], artistaOficial: 'Caifanes', genero: 'Rock' },
  { nombres: ['heroes del silencio', 'héroes del silencio', 'bunbury'], artistaOficial: 'Héroes del Silencio', genero: 'Rock' },
  { nombres: ['cafe tacvba', 'café tacvba'], artistaOficial: 'Café Tacvba', genero: 'Rock' },
  { nombres: ['zoe', 'zoé'], artistaOficial: 'Zoé', genero: 'Rock' },
  { nombres: ['el tri'], artistaOficial: 'El Tri', genero: 'Rock' },

  // Salsa
  { nombres: ['marc anthony'], artistaOficial: 'Marc Anthony', genero: 'Salsa' },
  { nombres: ['hector lavoe', 'héctor lavoe'], artistaOficial: 'Héctor Lavoe', genero: 'Salsa' },
  { nombres: ['celia cruz'], artistaOficial: 'Celia Cruz', genero: 'Salsa' },
  { nombres: ['willie colon', 'willie colón'], artistaOficial: 'Willie Colón', genero: 'Salsa' },
  { nombres: ['ruben blades', 'rubén blades'], artistaOficial: 'Rubén Blades', genero: 'Salsa' },
  { nombres: ['gilberto santa rosa'], artistaOficial: 'Gilberto Santa Rosa', genero: 'Salsa' },
  { nombres: ['frankie ruiz'], artistaOficial: 'Frankie Ruiz', genero: 'Salsa' },
  { nombres: ['victor manuelle', 'víctor manuelle'], artistaOficial: 'Víctor Manuelle', genero: 'Salsa' },
  { nombres: ['grupo niche'], artistaOficial: 'Grupo Niche', genero: 'Salsa' },
  { nombres: ['joe arroyo'], artistaOficial: 'Joe Arroyo', genero: 'Salsa' },
  { nombres: ['el gran combo'], artistaOficial: 'El Gran Combo de Puerto Rico', genero: 'Salsa' },
  { nombres: ['oscar d leon', "oscar d'leon"], artistaOficial: "Oscar D'León", genero: 'Salsa' },

  // Bachata
  { nombres: ['romeo santos'], artistaOficial: 'Romeo Santos', genero: 'Bachata' },
  { nombres: ['aventura'], artistaOficial: 'Aventura', genero: 'Bachata' },
  { nombres: ['prince royce'], artistaOficial: 'Prince Royce', genero: 'Bachata' },
  { nombres: ['juan luis guerra'], artistaOficial: 'Juan Luis Guerra', genero: 'Bachata' },
  { nombres: ['frank reyes'], artistaOficial: 'Frank Reyes', genero: 'Bachata' },
  { nombres: ['anthony santos'], artistaOficial: 'Anthony Santos', genero: 'Bachata' },
  { nombres: ['zacarias ferreira', 'zacarías ferreira'], artistaOficial: 'Zacarías Ferreira', genero: 'Bachata' },

  // Cumbia
  { nombres: ['angeles azules', 'ángeles azules'], artistaOficial: 'Los Ángeles Azules', genero: 'Cumbia' },
  { nombres: ['grupo frontera'], artistaOficial: 'Grupo Frontera', genero: 'Cumbia' },
  { nombres: ['selena', 'selena quintanilla'], artistaOficial: 'Selena Quintanilla', genero: 'Cumbia' },
  { nombres: ['sonora dinamita'], artistaOficial: 'La Sonora Dinamita', genero: 'Cumbia' },
  { nombres: ['kumbia kings'], artistaOficial: 'Kumbia Kings', genero: 'Cumbia' },
  { nombres: ['los angeles de charly', 'ángeles de charly'], artistaOficial: 'Los Ángeles de Charly', genero: 'Cumbia' },
  { nombres: ['celso piña'], artistaOficial: 'Celso Piña', genero: 'Cumbia' },
  { nombres: ['damas gratis'], artistaOficial: 'Damas Gratis', genero: 'Cumbia' },

  // Merengue
  { nombres: ['elvis crespo'], artistaOficial: 'Elvis Crespo', genero: 'Merengue' },
  { nombres: ['wilfrido vargas'], artistaOficial: 'Wilfrido Vargas', genero: 'Merengue' },
  { nombres: ['olga tañon', 'olga tañón'], artistaOficial: 'Olga Tañón', genero: 'Merengue' },
  { nombres: ['eddy herrera'], artistaOficial: 'Eddy Herrera', genero: 'Merengue' },
  { nombres: ['sergio vargas'], artistaOficial: 'Sergio Vargas', genero: 'Merengue' },
  { nombres: ['los hermanos rosario'], artistaOficial: 'Los Hermanos Rosario', genero: 'Merengue' },

  // Rap & Hip Hop
  { nombres: ['eminem', 'slim shady'], artistaOficial: 'Eminem', genero: 'Rap' },
  { nombres: ['drake'], artistaOficial: 'Drake', genero: 'Hip Hop' },
  { nombres: ['kendrick lamar'], artistaOficial: 'Kendrick Lamar', genero: 'Hip Hop' },
  { nombres: ['snoop dogg'], artistaOficial: 'Snoop Dogg', genero: 'Hip Hop' },
  { nombres: ['2pac', 'tupac'], artistaOficial: '2Pac', genero: 'Hip Hop' },
  { nombres: ['50 cent'], artistaOficial: '50 Cent', genero: 'Hip Hop' },
  { nombres: ['kanye west', 'ye'], artistaOficial: 'Kanye West', genero: 'Hip Hop' },
  { nombres: ['cartel de santa', 'babo'], artistaOficial: 'Cartel de Santa', genero: 'Rap' },
  { nombres: ['santa fe klan'], artistaOficial: 'Santa Fe Klan', genero: 'Rap' },
  { nombres: ['canserbero'], artistaOficial: 'Canserbero', genero: 'Rap' },
  { nombres: ['aleman', 'alemán'], artistaOficial: 'Alemán', genero: 'Rap' },
  { nombres: ['gera mx'], artistaOficial: 'Gera MX', genero: 'Rap' },
  { nombres: ['residente', 'calle 13'], artistaOficial: 'Residente', genero: 'Rap' },
  { nombres: ['trueno'], artistaOficial: 'Trueno', genero: 'Rap' },
  { nombres: ['wos'], artistaOficial: 'Wos', genero: 'Rap' },

  // Trap
  { nombres: ['anuel', 'anuel aa'], artistaOficial: 'Anuel AA', genero: 'Trap' },
  { nombres: ['myke towers'], artistaOficial: 'Myke Towers', genero: 'Trap' },
  { nombres: ['eladio carrion', 'eladio carrión'], artistaOficial: 'Eladio Carrión', genero: 'Trap' },
  { nombres: ['duki'], artistaOficial: 'Duki', genero: 'Trap' },
  { nombres: ['bizarrap', 'bzrp'], artistaOficial: 'Bizarrap', genero: 'Trap' },
  { nombres: ['yovngchimi'], artistaOficial: 'YOVNGCHIMI', genero: 'Trap' },
  { nombres: ['bryant myers'], artistaOficial: 'Bryant Myers', genero: 'Trap' },

  // Electrónica
  { nombres: ['david guetta'], artistaOficial: 'David Guetta', genero: 'Electrónica' },
  { nombres: ['avicii', 'tim bergling'], artistaOficial: 'Avicii', genero: 'Electrónica' },
  { nombres: ['calvin harris'], artistaOficial: 'Calvin Harris', genero: 'Electrónica' },
  { nombres: ['tiesto', 'tiësto'], artistaOficial: 'Tiësto', genero: 'Electrónica' },
  { nombres: ['martin garrix'], artistaOficial: 'Martin Garrix', genero: 'Electrónica' },
  { nombres: ['daft punk'], artistaOficial: 'Daft Punk', genero: 'Electrónica' },
  { nombres: ['skrillex'], artistaOficial: 'Skrillex', genero: 'Electrónica' },
  { nombres: ['alan walker'], artistaOficial: 'Alan Walker', genero: 'Electrónica' },
  { nombres: ['marshmello'], artistaOficial: 'Marshmello', genero: 'Electrónica' },
  { nombres: ['swedish house mafia'], artistaOficial: 'Swedish House Mafia', genero: 'Electrónica' },
  { nombres: ['steve aoki'], artistaOficial: 'Steve Aoki', genero: 'Electrónica' },
  { nombres: ['armin van buuren'], artistaOficial: 'Armin van Buuren', genero: 'Electrónica' },

  // Música Cristiana
  { nombres: ['marcos witt'], artistaOficial: 'Marcos Witt', genero: 'Música Cristiana' },
  { nombres: ['jesus adrian romero', 'jesús adrián romero'], artistaOficial: 'Jesús Adrián Romero', genero: 'Música Cristiana' },
  { nombres: ['alex campos'], artistaOficial: 'Alex Campos', genero: 'Música Cristiana' },
  { nombres: ['hillsong', 'hillsong worship', 'hillsong united'], artistaOficial: 'Hillsong', genero: 'Música Cristiana' },
  { nombres: ['elevation worship'], artistaOficial: 'Elevation Worship', genero: 'Música Cristiana' },
  { nombres: ['redimi2'], artistaOficial: 'Redimi2', genero: 'Música Cristiana' },
  { nombres: ['miel san marcos'], artistaOficial: 'Miel San Marcos', genero: 'Música Cristiana' },
  { nombres: ['marcela gandara', 'marcela gándara'], artistaOficial: 'Marcela Gándara', genero: 'Música Cristiana' },
  { nombres: ['lilly goodman'], artistaOficial: 'Lilly Goodman', genero: 'Música Cristiana' },
  { nombres: ['tercer cielo'], artistaOficial: 'Tercer Cielo', genero: 'Música Cristiana' },
  { nombres: ['christine dclario', "christine d'clario"], artistaOficial: "Christine D'Clario", genero: 'Música Cristiana' },
  { nombres: ['grupo barak', 'barak'], artistaOficial: 'Barak', genero: 'Música Cristiana' },

  // Baladas Románticas
  { nombres: ['luis miguel'], artistaOficial: 'Luis Miguel', genero: 'Baladas Románticas' },
  { nombres: ['cristian castro'], artistaOficial: 'Cristian Castro', genero: 'Baladas Románticas' },
  { nombres: ['marco antonio solis', 'marco antonio solís', 'los bukis'], artistaOficial: 'Marco Antonio Solís', genero: 'Baladas Románticas' },
  { nombres: ['jose jose', 'josé josé'], artistaOficial: 'José José', genero: 'Baladas Románticas' },
  { nombres: ['ricardo arjona'], artistaOficial: 'Ricardo Arjona', genero: 'Baladas Románticas' },
  { nombres: ['camilo sesto'], artistaOficial: 'Camilo Sesto', genero: 'Baladas Románticas' },
  { nombres: ['roberto carlos'], artistaOficial: 'Roberto Carlos', genero: 'Baladas Románticas' },
  { nombres: ['juan gabriel'], artistaOficial: 'Juan Gabriel', genero: 'Baladas Románticas' },
  { nombres: ['sin bandera'], artistaOficial: 'Sin Bandera', genero: 'Baladas Románticas' },
  { nombres: ['reik'], artistaOficial: 'Reik', genero: 'Baladas Románticas' },
  { nombres: ['camila'], artistaOficial: 'Camila', genero: 'Baladas Románticas' },
  { nombres: ['alejandro sanz'], artistaOficial: 'Alejandro Sanz', genero: 'Baladas Románticas' },
  { nombres: ['ricardo montaner'], artistaOficial: 'Ricardo Montaner', genero: 'Baladas Románticas' },
  { nombres: ['rocio durcal', 'rocío dúrcal'], artistaOficial: 'Rocío Dúrcal', genero: 'Baladas Románticas' },
  { nombres: ['ana gabriel'], artistaOficial: 'Ana Gabriel', genero: 'Baladas Románticas' },
  { nombres: ['franco de vita'], artistaOficial: 'Franco De Vita', genero: 'Baladas Románticas' }
];

export function detectGenreFromCatalogAndKeywords(searchScope: string): string {
  const low = searchScope
    .toLowerCase()
    .replace(/[_\-]+/g, ' ')
    .replace(/\s+/g, ' ');

  const matched = catalogoArtistas.find(item => item.nombres.some(n => low.includes(n)));
  if (matched) return matched.genero;

  if (low.includes('corrido tumbado')) return 'Corridos Tumbados';
  if (low.includes('corrido') || low.includes('belico') || low.includes('bélico')) return 'Corridos';
  if (low.includes('banda') || low.includes('sinaloense') || low.includes('tambora')) return 'Banda';
  if (low.includes('reggaeton') || low.includes('reguet') || low.includes('perreo') || low.includes('dembow')) return 'Reggaeton';
  if (low.includes('bachata')) return 'Bachata';
  if (low.includes('salsa') || low.includes('guaguanco')) return 'Salsa';
  if (low.includes('cumbia') || low.includes('cumbion')) return 'Cumbia';
  if (low.includes('merengue')) return 'Merengue';
  if (low.includes('balada') || low.includes('romantica') || low.includes('bolero')) return 'Baladas Románticas';
  if (low.includes('cristian') || low.includes('adoracion') || low.includes('alabanza') || low.includes('gospel')) return 'Música Cristiana';
  if (low.includes('trap')) return 'Trap';
  if (low.includes('rap') || low.includes('hip hop') || low.includes('hiphop')) return 'Rap';
  if (low.includes('electronica') || low.includes('electrónica') || low.includes('edm') || low.includes('house') || low.includes('techno') || low.includes('trance')) return 'Electrónica';
  if (low.includes('rock') || low.includes('metal') || low.includes('grunge') || low.includes('punk')) return 'Rock';
  if (low.includes('pop')) return 'Pop';
  if (low.includes('regional') || low.includes('norteñ') || low.includes('sierreñ') || low.includes('campirano') || low.includes('mariachi') || low.includes('ranchera')) return 'Regional Mexicano';

  return '';
}

async function startServer() {
  const app = express();
  // En el entorno de AI Studio el dev server corre en el puerto 3000
  const PORT = Number(process.env.PORT) || 3000;
  const httpServer = http.createServer(app);

  httpServer.on('error', (err: any) => {
    console.error('[HTTP Server Error]', err);
  });

  app.use(express.json());

  // API Endpoint: Búsqueda en vivo de YouTube sin necesidad de claves API
  app.get('/api/youtube/search', async (req, res) => {
    try {
      const query = String(req.query.q || '').trim();
      if (!query) {
        return res.json({ success: true, results: [] });
      }

      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
        }
      });

      if (!response.ok) {
        throw new Error(`YouTube respondió con status ${response.status}`);
      }

      const html = await response.text();
      const match =
        html.match(/var ytInitialData = ({.*?});<\/script>/s) ||
        html.match(/ytInitialData\s*=\s*({.*?});/s);

      if (!match) {
        return res.json({ success: true, results: [] });
      }

      const parsedData = JSON.parse(match[1]);
      const contents =
        parsedData?.contents?.twoColumnSearchResultsRenderer?.primaryContents
          ?.sectionListRenderer?.contents || [];

      const results: Array<{
        id: string;
        videoId: string;
        title: string;
        channelTitle: string;
        duration: string;
        thumbnailUrl: string;
        views?: string;
      }> = [];

      for (const section of contents) {
        const itemSection = section?.itemSectionRenderer?.contents || [];
        for (const item of itemSection) {
          const v = item?.videoRenderer;
          if (v && v.videoId) {
            const title =
              v.title?.runs?.[0]?.text ||
              v.title?.accessibility?.accessibilityData?.label ||
              'Video sin título';
            const channelTitle =
              v.ownerText?.runs?.[0]?.text ||
              v.shortBylineText?.runs?.[0]?.text ||
              'YouTube';
            const duration = v.lengthText?.simpleText || '0:00';
            const thumbnails = v.thumbnail?.thumbnails || [];
            const thumbnailUrl =
              thumbnails[thumbnails.length - 1]?.url ||
              `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`;
            const views = v.shortViewCountText?.simpleText || v.viewCountText?.simpleText || '';

            results.push({
              id: 'yt_' + v.videoId,
              videoId: v.videoId,
              title,
              channelTitle,
              duration,
              thumbnailUrl,
              views
            });

            if (results.length >= 25) break;
          }
        }
        if (results.length >= 25) break;
      }

      return res.json({
        success: true,
        query,
        results
      });
    } catch (err: unknown) {
      console.error('Error buscando en YouTube:', err);
      return res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Error desconocido al buscar en YouTube',
        results: []
      });
    }
  });

  // ==========================================
  // ARQUITECTURA DE ALMACENAMIENTO: CLOUDFLARE R2 (Caché) + TELEGRAM (Cold Storage)
  // Endpoint: GET /api/stream/:key
  // 1. Busca en Cloudflare R2 (Cache Hit -> Sirve de inmediato con HTTP Range)
  // 2. Si no existe en R2 (Cache Miss -> Descarga stream de Telegram, sube a R2 y sirve)
  // ==========================================
  app.get('/api/stream/:key', async (req, res) => {
    const key = decodeURIComponent(req.params.key || '').trim();
    if (!key) {
      return res.status(400).send('Clave de audio requerida');
    }

    const telegramFileId = String(req.query.tg_id || req.query.file_id || req.headers['x-telegram-file-id'] || '').trim();
    const r2AccessKey = process.env.VITE_R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID || '';
    const r2Secret = process.env.VITE_R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY || '';
    const r2Endpoint = process.env.VITE_R2_ENDPOINT || process.env.R2_ENDPOINT || '';
    const r2Bucket = process.env.VITE_R2_BUCKET_NAME || process.env.R2_BUCKET_NAME || '';
    const tgToken = process.env.TELEGRAM_BOT_TOKEN || '';
    const tgApiRoot = (process.env.TELEGRAM_API_ROOT || 'https://api.telegram.org').replace(/\/+$/, '');

    let s3: S3Client | null = null;
    if (r2AccessKey && r2Secret && r2Endpoint && r2Bucket) {
      s3 = new S3Client({
        region: 'auto',
        endpoint: r2Endpoint,
        credentials: {
          accessKeyId: r2AccessKey,
          secretAccessKey: r2Secret,
        },
      });
    }

    // 1. BUSCAR EN CLOUDFLARE R2 (Cache Hit)
    if (s3) {
      try {
        const getCmd = new GetObjectCommand({
          Bucket: r2Bucket,
          Key: key,
          Range: req.headers.range,
        });

        const r2Res = await s3.send(getCmd);
        if (r2Res.Body) {
          res.setHeader('Accept-Ranges', 'bytes');
          res.setHeader('Content-Type', r2Res.ContentType || 'audio/mpeg');
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          res.setHeader('X-Storage-Tier', 'R2-Cache-Hit');

          if (r2Res.ContentRange) {
            res.setHeader('Content-Range', r2Res.ContentRange);
          }
          if (r2Res.ContentLength !== undefined) {
            res.setHeader('Content-Length', r2Res.ContentLength);
          }

          res.status(r2Res.ContentRange ? 206 : 200);
          (r2Res.Body as Readable).pipe(res);
          return;
        }
      } catch (r2Err: any) {
        // Si no es un 404/NoSuchKey, registrar advertencia y continuar al fallback de Telegram
        if (r2Err?.name !== 'NoSuchKey' && r2Err?.$metadata?.httpStatusCode !== 404) {
          console.warn(`[R2] Verificación de clave "${key}":`, r2Err?.message || r2Err);
        }
      }
    }

    // 2. SI NO EXISTE EN R2: RECUPERAR DE TELEGRAM (Cold Storage)
    if (!telegramFileId) {
      return res.status(404).send(`Audio "${key}" no encontrado en R2 y no se proporcionó telegram_file_id (?tg_id=...)`);
    }

    if (!tgToken) {
      return res.status(500).send('TELEGRAM_BOT_TOKEN no configurado en el servidor');
    }

    try {
      // 2.a Obtener ruta del archivo con getFile
      const infoUrl = `${tgApiRoot}/bot${tgToken}/getFile?file_id=${encodeURIComponent(telegramFileId)}`;
      const infoRes = await fetch(infoUrl);
      if (!infoRes.ok) {
        return res.status(502).send(`Error en Telegram Bot API: status ${infoRes.status}`);
      }

      const infoData = (await infoRes.json()) as any;
      if (!infoData.ok || !infoData.result?.file_path) {
        return res.status(404).send(`Telegram file_id inválido o no encontrado: ${infoData.description || 'Error'}`);
      }

      const filePath = infoData.result.file_path;
      const fileSize = infoData.result.file_size;

      // Manejo de límite de 20 MB de la API pública de Telegram
      if (tgApiRoot.includes('api.telegram.org') && fileSize && fileSize > 20 * 1024 * 1024) {
        return res.status(413).json({
          error: 'Telegram API 20MB Download Limit Exceeded',
          file_size_bytes: fileSize,
          file_size_mb: Number((fileSize / (1024 * 1024)).toFixed(2)),
          message: 'Para audios > 20 MB (hasta 2 GB), configura un servidor local oficial de Telegram Bot API y asigna TELEGRAM_API_ROOT.',
        });
      }

      // 2.b Descargar archivo desde Telegram
      const dlUrl = `${tgApiRoot}/file/bot${tgToken}/${filePath}`;
      const dlRes = await fetch(dlUrl);
      if (!dlRes.ok || !dlRes.body) {
        return res.status(502).send(`Error al descargar stream de Telegram: status ${dlRes.status}`);
      }

      // 2.c Leer chunks del stream para servir al usuario y guardar en R2
      const reader = dlRes.body.getReader();
      const chunks: Uint8Array[] = [];

      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('X-Storage-Tier', 'Telegram-Cold-Storage-Miss');
      if (fileSize) {
        res.setHeader('Content-Length', String(fileSize));
      }
      res.status(200);

      // Transmitir chunks al cliente mientras se recolectan para subida a R2
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          res.write(value);
          chunks.push(value);
        }
      }
      res.end();

      // 2.d Subir a Cloudflare R2 de forma asíncrona para que las siguientes peticiones sean Cache Hits
      if (s3 && r2Bucket) {
        const totalBuffer = Buffer.concat(chunks);
        s3.send(
          new PutObjectCommand({
            Bucket: r2Bucket,
            Key: key,
            Body: totalBuffer,
            ContentType: 'audio/mpeg',
            Metadata: {
              telegram_file_id: telegramFileId,
              cached_at: new Date().toISOString(),
              source: 'telegram-cold-storage',
            },
          })
        )
          .then(() => console.log(`[R2 Cache] Archivo "${key}" guardado con éxito desde Telegram Cold Storage.`))
          .catch((err: any) => console.warn(`[R2 Cache] Error guardando copia en R2 para "${key}":`, err?.message || err));
      }
    } catch (err: any) {
      console.error('Error en Telegram Cold Storage:', err);
      if (!res.headersSent) {
        res.status(500).send(`Error interno procesando audio: ${err?.message || err}`);
      }
    }
  });

  // ==========================================
  // ENDPOINT: SUBIDA A TELEGRAM COLD STORAGE Y OPCIONALMENTE CLOUDFLARE R2
  // ==========================================
  app.post(['/upload-cold-storage', '/api/upload-cold-storage'], async (req, res) => {
    try {
      const tgToken = process.env.TELEGRAM_BOT_TOKEN || '';
      const chatId = process.env.TELEGRAM_CHAT_ID || '-1003870072472';
      const tgApiRoot = (process.env.TELEGRAM_API_ROOT || 'https://api.telegram.org').replace(/\/+$/, '');

      if (!tgToken) {
        return res.status(500).json({ success: false, error: 'TELEGRAM_BOT_TOKEN no configurado en las variables de entorno del servidor' });
      }

      const webReq = new Request('http://localhost' + req.url, {
        method: req.method,
        headers: req.headers as any,
        body: Readable.toWeb(req) as any,
        duplex: 'half',
      } as any);

      const formData = await webReq.formData();
      const audioFile = formData.get('audio') || formData.get('file');

      if (!audioFile || !(audioFile instanceof File)) {
        return res.status(400).json({ success: false, error: 'Se requiere un archivo en el campo "audio" o "file"' });
      }

      const title = (formData.get('title') as string) || audioFile.name.replace(/\.[^/.]+$/, '');
      const performer = (formData.get('performer') as string) || (formData.get('artist') as string) || 'Artista';
      const saveToR2Raw = formData.get('save_to_r2');
      const saveToR2 = saveToR2Raw !== 'false';

      // 1. Enviar audio a la API de Telegram con sendAudio
      const tgFormData = new FormData();
      tgFormData.append('chat_id', chatId);
      tgFormData.append('audio', audioFile, audioFile.name);
      tgFormData.append('title', title);
      tgFormData.append('performer', performer);

      const thumbnailFile = formData.get('thumbnail') || formData.get('thumb');
      if (thumbnailFile && thumbnailFile instanceof File) {
        tgFormData.append('thumbnail', thumbnailFile, 'cover.jpg');
      }

      const tgSendUrl = `${tgApiRoot}/bot${tgToken}/sendAudio`;
      const tgRes = await fetch(tgSendUrl, {
        method: 'POST',
        body: tgFormData,
      });

      const tgJson = (await tgRes.json()) as any;
      if (!tgJson.ok) {
        return res.status(502).json({
          success: false,
          error: 'Error de Telegram al guardar en Cold Storage',
          description: tgJson.description,
        });
      }

      const audioResult = tgJson.result?.audio || tgJson.result?.document;
      const fileId = audioResult?.file_id;

      // 2. Subir a Cloudflare R2 si saveToR2 es true
      const r2AccessKey = process.env.VITE_R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID || '';
      const r2Secret = process.env.VITE_R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY || '';
      const r2Endpoint = process.env.VITE_R2_ENDPOINT || process.env.R2_ENDPOINT || '';
      const r2Bucket = process.env.VITE_R2_BUCKET_NAME || process.env.R2_BUCKET_NAME || '';
      const r2PublicUrl = (process.env.VITE_R2_PUBLIC_URL || '').replace(/\/+$/, '');

      let playbackUrl = '';
      if (saveToR2 && r2AccessKey && r2Secret && r2Endpoint && r2Bucket) {
        const s3 = new S3Client({
          region: 'auto',
          endpoint: r2Endpoint,
          credentials: { accessKeyId: r2AccessKey, secretAccessKey: r2Secret },
        });

        const key = `${Date.now()}-${audioFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const buf = Buffer.from(await audioFile.arrayBuffer());
        await s3.send(
          new PutObjectCommand({
            Bucket: r2Bucket,
            Key: key,
            Body: buf,
            ContentType: 'audio/mpeg',
            Metadata: {
              telegram_file_id: fileId || '',
              source: 'telegram-cold-storage',
            },
          })
        );
        playbackUrl = r2PublicUrl ? `${r2PublicUrl}/${key}` : `/api/stream/${encodeURIComponent(key)}?tg_id=${fileId}`;
      } else {
        // Solo Telegram (Cold Storage sin R2)
        playbackUrl = `/api/stream/${encodeURIComponent(audioFile.name)}?tg_id=${fileId}`;
      }

      return res.json({
        success: true,
        file_id: fileId,
        playback_url: playbackUrl,
        message: saveToR2
          ? 'Subido a Cloudflare R2 y Telegram con éxito'
          : 'Subido solo a Telegram con éxito',
      });
    } catch (err: any) {
      console.error('Error en /upload-cold-storage:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Error interno' });
    }
  });

  // Endpoint proxy para descargar imágenes de IA sin problemas de CORS en navegador
  app.get('/api/proxy-image', async (req, res) => {
    try {
      const imageUrl = req.query.url as string;
      if (!imageUrl || !imageUrl.startsWith('http')) {
        return res.status(400).send('URL de imagen requerida');
      }
      const response = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Accept': 'image/*'
        }
      });
      if (!response.ok) {
        return res.status(response.status).send('Error al obtener la imagen');
      }
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const arrayBuffer = await response.arrayBuffer();
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(Buffer.from(arrayBuffer));
    } catch (err: any) {
      res.status(500).send(err?.message || 'Error proxy');
    }
  });

  // API Endpoint: Identificación estricta de canciones con DeepSeek AI
  app.post('/api/ai/deepseek-identify', async (req, res) => {
    try {
      const nombreLimpio = String(req.body.nombreLimpio || '').trim();
      if (!nombreLimpio) {
        return res.status(400).json({ success: false, error: 'nombreLimpio requerido' });
      }

      const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
      if (!apiKey) {
        return res.status(503).json({ success: false, error: 'DEEPSEEK_API_KEY no configurada' });
      }

      const systemPrompt = "Eres un experto en música global. El nombre del archivo puede estar en español, inglés, o tener errores de escritura. Devuelve SOLO un objeto JSON. No escribas texto adicional.";
      const userPrompt = `Analiza este archivo de audio: ${nombreLimpio}. Devuelve el formato exacto: {"titulo": "Nombre de la canción", "artista": "Nombre del artista"}. Si es una canción famosa (sin importar el idioma), usa tu conocimiento para adivinar el título original y el artista. Si es un podcast o audio muy raro, pon artista: 'Desconocido'.`;

      const dsRes = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        signal: AbortSignal.timeout(15000),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          response_format: { type: 'json_object' }
        })
      });

      if (!dsRes.ok) {
        const errorText = await dsRes.text();
        return res.status(dsRes.status).json({ success: false, error: errorText });
      }

      const data = await dsRes.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        return res.status(500).json({ success: false, error: 'Respuesta vacía de DeepSeek' });
      }

      const parsed = JSON.parse(content);
      return res.json({
        success: true,
        data: {
          titulo: String(parsed.titulo || parsed.title || nombreLimpio).trim(),
          artista: String(parsed.artista || parsed.artist || 'Desconocido').trim()
        }
      });
    } catch (err: any) {
      console.error('Error en /api/ai/deepseek-identify:', err);
      return res.status(500).json({ success: false, error: err.message || 'Error interno' });
    }
  });

  // API Endpoint: Identificación y nombramiento inteligente con DeepSeek / Gemini AI
  app.post('/api/ai/tag-audio', async (req, res) => {
    try {
      const filename = String(req.body.filename || '').trim();
      const folderId = String(req.body.folderId || '').trim();
      const id3Title = String(req.body.id3Title || '').trim();
      const id3Artist = String(req.body.id3Artist || '').trim();

      if (!filename && !id3Title) {
        return res.status(400).json({ success: false, error: 'Nombre de archivo requerido' });
      }

      // Limpieza inteligente previa de extensiones, track numbers, tags de YouTube/descargas y spotdown
      let rawClean = filename.replace(/\.(mp3|wav|m4a|aac|flac|ogg)$/i, '');
      rawClean = rawClean.replace(/_?spotdown(?:\.org)?/gi, '');
      // Eliminar números de pista iniciales (ej. "01 - ", "12. ", "03_")
      rawClean = rawClean.replace(/^\s*(?:\d+[\s._-]+)+/, '');
      // Eliminar sufijos o prefijos comunes de rippers/YouTube
      rawClean = rawClean
        .replace(/\b(official\s+video|video\s+oficial|official\s+audio|audio\s+oficial|video\s+lyric|letra|lyrics|en\s+vivo|live|remix|hd|4k|1080p|hq|320kbps|128kbps|y2mate(?:\.is)?|mp3clan|snaptube|full\s+audio|spotdown(?:\.org)?)\b/gi, '')
        .replace(/[\[\(\{]\s*[\]\)\}]/g, '')
        .replace(/[_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      let aiResult: {
        titulo: string;
        artista: string;
        genero: string;
        genre?: string;
        sugerenciaCarpeta?: string;
        descripcionPortada: string;
        coverUrl?: string;
        fuenteIA?: string;
      } | null = null;

      // 1. Intentar con DeepSeek si existe DEEPSEEK_API_KEY no vacía
      if (process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY.trim().length > 0) {
        try {
          const dsRes = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            signal: AbortSignal.timeout(15000),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY.trim()}`
            },
            body: JSON.stringify({
              model: 'deepseek-chat',
              messages: [
                {
                  role: 'system',
                  content:
                    'Eres el asistente experto de Spotyy_AA para clasificación musical e identificación precisa de canciones. Tu labor es analizar el archivo de audio y metadatos (título, artista) para clasificar la canción individualmente en su género musical real. Debes identificar con máxima exactitud: 1) "titulo": Título limpio y oficial de la canción (sin números de pista, extensiones de archivo como .mp3, ni etiquetas como video oficial, audio, lyric). 2) "artista": Nombre oficial del cantante, banda o agrupación. 3) "genre" y "genero": Clasificación del género musical principal de la canción, seleccionando OBLIGATORIAMENTE el más representativo entre: Corridos, Corridos Tumbados, Banda, Regional Mexicano, Reggaeton, Pop, Rock, Salsa, Bachata, Cumbia, Merengue, Rap, Hip Hop, Trap, Electrónica, Música Cristiana, Baladas Románticas, Otros. 4) "descripcionPortada": Prompt en inglés para generar una portada de alta resolución estética. Si no es posible identificar el género por ser un archivo genérico sin datos, responde con "genre": "". Responde ÚNICAMENTE un JSON válido con esta estructura: {"titulo": "...", "artista": "...", "genre": "...", "genero": "...", "descripcionPortada": "..."}'
                },
                {
                  role: 'user',
                  content: `Clasifica esta canción individualmente:
- Archivo: "${filename}"
- Título ID3 / previo: "${id3Title}"
- Artista ID3 / previo: "${id3Artist}"`
                }
              ],
              response_format: { type: 'json_object' }
            })
          });

          if (dsRes.ok) {
            const dsData = await dsRes.json();
            const textContent = dsData.choices?.[0]?.message?.content;
            if (textContent) {
              const parsed = JSON.parse(textContent);
              const rawGenre = (parsed.genre || parsed.genero || '').trim();
              const cleanTitle = String(parsed.titulo || id3Title || rawClean)
                .replace(/_?spotdown(?:\.org)?/gi, '')
                .replace(/\.(mp3|wav|m4a|aac|flac|ogg)$/i, '')
                .trim();
              const cleanArtist = String(parsed.artista || id3Artist || 'Artista')
                .replace(/_?spotdown(?:\.org)?/gi, '')
                .trim();
              aiResult = {
                titulo: cleanTitle || rawClean,
                artista: cleanArtist || 'Artista',
                genero: rawGenre,
                genre: rawGenre,
                descripcionPortada: parsed.descripcionPortada || `${cleanArtist} ${cleanTitle} album cover`,
                fuenteIA: 'DeepSeek IA'
              };
            }
          }
        } catch (dsErr) {
          console.warn('DeepSeek API fallo o timeout:', dsErr);
        }
      }

      // 2. Si no hubo DeepSeek, intentar con Gemini (@google/genai) con soporte para modelos alternativos y cuota
      if (!aiResult && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0) {
        const candidateModels = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-3.8-flash'];
        for (const candidateModel of candidateModels) {
          try {
            const { GoogleGenAI } = await import('@google/genai');
            const ai = new GoogleGenAI({
              apiKey: process.env.GEMINI_API_KEY,
              httpOptions: {
                headers: {
                  'User-Agent': 'aistudio-build'
                }
              }
            });

            const geminiPrompt = `Eres el identificador y clasificador musical de Spotyy_AA.
Analiza esta canción de forma individual:
- Nombre de archivo: "${filename}"
- ID3 Título previo: "${id3Title}"
- ID3 Artista previo: "${id3Artist}"

Identifica con exactitud:
1. "titulo": Título limpio y oficial de la canción (sin extensiones, sin palabras como "video oficial", "audio", "remix" superfluo, ni números de pista).
2. "artista": Nombre oficial del cantante, banda o agrupación.
3. "genre": Género musical principal obligatorio entre: Corridos, Corridos Tumbados, Banda, Regional Mexicano, Reggaeton, Pop, Rock, Salsa, Bachata, Cumbia, Merengue, Rap, Hip Hop, Trap, Electrónica, Música Cristiana, Baladas Románticas, Otros. (Si es completamente inidentificable, deja cadena vacía).
4. "genero": Mismo valor exacto que "genre".
5. "descripcionPortada": Prompt en inglés para generar una portada de álbum musical estética y profesional (ej: "cinematic modern album cover art for [artist] with vivid neon and gold accents").

Devuelve ÚNICAMENTE un JSON válido con las llaves:
{"titulo": string, "artista": string, "genre": string, "genero": string, "descripcionPortada": string}`;

            const geminiResponse = await ai.models.generateContent({
              model: candidateModel,
              contents: geminiPrompt,
              config: {
                responseMimeType: 'application/json'
              }
            });

            const geminiText = geminiResponse.text?.trim();
            if (geminiText) {
              const parsed = JSON.parse(geminiText);
              const detectedGenre = (parsed.genre || parsed.genero || '').trim();
              const cleanTitle = String(parsed.titulo || id3Title || rawClean)
                .replace(/_?spotdown(?:\.org)?/gi, '')
                .replace(/\.(mp3|wav|m4a|aac|flac|ogg)$/i, '')
                .trim();
              const cleanArtist = String(parsed.artista || id3Artist || 'Artista')
                .replace(/_?spotdown(?:\.org)?/gi, '')
                .trim();
              aiResult = {
                titulo: cleanTitle || rawClean,
                artista: cleanArtist || 'Artista',
                genero: detectedGenre,
                genre: detectedGenre,
                descripcionPortada: parsed.descripcionPortada || `${cleanArtist} ${cleanTitle} album art`,
                fuenteIA: 'DeepSeek / Gemini IA'
              };
              break;
            }
          } catch (geminiErr: any) {
            const errStr = String(geminiErr?.message || geminiErr);
            if (errStr.includes('429') || errStr.includes('RESOURCE_EXHAUSTED') || errStr.includes('quota')) {
              // Si la cuota gratuita está agotada, probar el siguiente modelo o recurrir al catálogo offline
              continue;
            }
            break;
          }
        }
      }

      // 3. Catálogo enciclopédico y clasificador heurístico avanzado (respaldo offline / sin API keys)
      if (!aiResult) {
        let titulo = id3Title || rawClean;
        let artista = id3Artist || '';
        let genero = '';

        // Catálogo amplio de artistas clasificados en los géneros oficiales de Spotyy_AA
        const catalogoArtistas: Array<{
          nombres: string[];
          artistaOficial: string;
          genero: string;
        }> = [
          // Corridos & Corridos Tumbados
          { nombres: ['peso pluma', 'doble p'], artistaOficial: 'Peso Pluma', genero: 'Corridos' },
          { nombres: ['natanael cano', 'nata'], artistaOficial: 'Natanael Cano', genero: 'Corridos' },
          { nombres: ['junior h'], artistaOficial: 'Junior H', genero: 'Corridos' },
          { nombres: ['fuerza regida', 'jop'], artistaOficial: 'Fuerza Regida', genero: 'Corridos' },
          { nombres: ['gabito ballesteros'], artistaOficial: 'Gabito Ballesteros', genero: 'Corridos' },
          { nombres: ['tito double p', 'tito p'], artistaOficial: 'Tito Double P', genero: 'Corridos' },
          { nombres: ['chino pacas'], artistaOficial: 'Chino Pacas', genero: 'Corridos' },
          { nombres: ['luis r conriquez', 'luis r'], artistaOficial: 'Luis R Conriquez', genero: 'Corridos' },
          { nombres: ['el fantasma'], artistaOficial: 'El Fantasma', genero: 'Corridos' },
          { nombres: ['los dos carnales'], artistaOficial: 'Los Dos Carnales', genero: 'Corridos' },
          { nombres: ['oscar maydon'], artistaOficial: 'Oscar Maydon', genero: 'Corridos' },
          { nombres: ['calle 24'], artistaOficial: 'Calle 24', genero: 'Corridos' },
          { nombres: ['victor cibrian'], artistaOficial: 'Victor Cibrian', genero: 'Corridos' },
          { nombres: ['los gemelos de sinaloa'], artistaOficial: 'Los Gemelos de Sinaloa', genero: 'Corridos' },
          { nombres: ['arsenal efectivo'], artistaOficial: 'Arsenal Efectivo', genero: 'Corridos' },
          { nombres: ['tony loya'], artistaOficial: 'Tony Loya', genero: 'Corridos' },

          // Banda
          { nombres: ['banda ms'], artistaOficial: 'Banda MS', genero: 'Banda' },
          { nombres: ['grupo firme', 'eduin caz'], artistaOficial: 'Grupo Firme', genero: 'Banda' },
          { nombres: ['calibre 50'], artistaOficial: 'Calibre 50', genero: 'Banda' },
          { nombres: ['julion alvarez', 'julión álvarez'], artistaOficial: 'Julión Álvarez', genero: 'Banda' },
          { nombres: ['la arrolladora', 'arrolladora banda'], artistaOficial: 'La Arrolladora Banda El Limón', genero: 'Banda' },
          { nombres: ['banda el recodo', 'el recodo'], artistaOficial: 'Banda El Recodo', genero: 'Banda' },
          { nombres: ['banda los recoditos', 'los recoditos'], artistaOficial: 'Banda Los Recoditos', genero: 'Banda' },
          { nombres: ['banda carnaval'], artistaOficial: 'Banda Carnaval', genero: 'Banda' },
          { nombres: ['la adictiva'], artistaOficial: 'La Adictiva', genero: 'Banda' },
          { nombres: ['gerardo ortiz'], artistaOficial: 'Gerardo Ortiz', genero: 'Banda' },
          { nombres: ['alfredo olivas'], artistaOficial: 'Alfredo Olivas', genero: 'Banda' },
          { nombres: ['los plebes del rancho', 'ariel camacho'], artistaOficial: 'Los Plebes del Rancho', genero: 'Banda' },
          { nombres: ['chuy lizarraga', 'chuy lizárraga'], artistaOficial: 'Chuy Lizárraga', genero: 'Banda' },
          { nombres: ['valentin elizalde', 'valentín elizalde'], artistaOficial: 'Valentín Elizalde', genero: 'Banda' },

          // Regional Mexicano
          { nombres: ['christian nodal', 'nodal'], artistaOficial: 'Christian Nodal', genero: 'Regional Mexicano' },
          { nombres: ['carin leon', 'carin león'], artistaOficial: 'Carin Leon', genero: 'Regional Mexicano' },
          { nombres: ['eden muñoz'], artistaOficial: 'Eden Muñoz', genero: 'Regional Mexicano' },
          { nombres: ['eslabon armado', 'eslabón armado'], artistaOficial: 'Eslabón Armado', genero: 'Regional Mexicano' },
          { nombres: ['los tigres del norte'], artistaOficial: 'Los Tigres del Norte', genero: 'Regional Mexicano' },
          { nombres: ['los tucanes de tijuana'], artistaOficial: 'Los Tucanes de Tijuana', genero: 'Regional Mexicano' },
          { nombres: ['intocable'], artistaOficial: 'Intocable', genero: 'Regional Mexicano' },
          { nombres: ['grupo duelo', 'duelo'], artistaOficial: 'Duelo', genero: 'Regional Mexicano' },
          { nombres: ['grupo pesado', 'pesado'], artistaOficial: 'Pesado', genero: 'Regional Mexicano' },
          { nombres: ['ramon ayala', 'ramón ayala'], artistaOficial: 'Ramón Ayala', genero: 'Regional Mexicano' },
          { nombres: ['los invasores de nuevo leon'], artistaOficial: 'Los Invasores de Nuevo León', genero: 'Regional Mexicano' },
          { nombres: ['bronco', 'grupo bronco'], artistaOficial: 'Bronco', genero: 'Regional Mexicano' },
          { nombres: ['joss favela'], artistaOficial: 'Joss Favela', genero: 'Regional Mexicano' },

          // Reggaetón
          { nombres: ['bad bunny', 'benito'], artistaOficial: 'Bad Bunny', genero: 'Reggaeton' },
          { nombres: ['feid', 'ferxxo'], artistaOficial: 'Feid', genero: 'Reggaeton' },
          { nombres: ['karol g', 'la bichota'], artistaOficial: 'Karol G', genero: 'Reggaeton' },
          { nombres: ['daddy yankee'], artistaOficial: 'Daddy Yankee', genero: 'Reggaeton' },
          { nombres: ['don omar'], artistaOficial: 'Don Omar', genero: 'Reggaeton' },
          { nombres: ['rauw alejandro', 'rauw'], artistaOficial: 'Rauw Alejandro', genero: 'Reggaeton' },
          { nombres: ['j balvin'], artistaOficial: 'J Balvin', genero: 'Reggaeton' },
          { nombres: ['maluma'], artistaOficial: 'Maluma', genero: 'Reggaeton' },
          { nombres: ['wisin & yandel', 'wisin y yandel', 'wisin', 'yandel'], artistaOficial: 'Wisin & Yandel', genero: 'Reggaeton' },
          { nombres: ['ozuna'], artistaOficial: 'Ozuna', genero: 'Reggaeton' },
          { nombres: ['nicky jam'], artistaOficial: 'Nicky Jam', genero: 'Reggaeton' },
          { nombres: ['arcangel', 'arcángel'], artistaOficial: 'Arcángel', genero: 'Reggaeton' },
          { nombres: ['plan b', 'chencho corleone'], artistaOficial: 'Plan B', genero: 'Reggaeton' },
          { nombres: ['ryan castro'], artistaOficial: 'Ryan Castro', genero: 'Reggaeton' },
          { nombres: ['blessd'], artistaOficial: 'Blessd', genero: 'Reggaeton' },
          { nombres: ['zion & lennox', 'zion y lennox'], artistaOficial: 'Zion & Lennox', genero: 'Reggaeton' },
          { nombres: ['farruko'], artistaOficial: 'Farruko', genero: 'Reggaeton' },
          { nombres: ['sech'], artistaOficial: 'Sech', genero: 'Reggaeton' },
          { nombres: ['mora'], artistaOficial: 'Mora', genero: 'Reggaeton' },
          { nombres: ['jhayco', 'jhay cortez'], artistaOficial: 'Jhayco', genero: 'Reggaeton' },
          { nombres: ['becky g'], artistaOficial: 'Becky G', genero: 'Reggaeton' },
          { nombres: ['natti natasha'], artistaOficial: 'Natti Natasha', genero: 'Reggaeton' },
          { nombres: ['manuel turizo'], artistaOficial: 'Manuel Turizo', genero: 'Reggaeton' },

          // Pop
          { nombres: ['dua lipa'], artistaOficial: 'Dua Lipa', genero: 'Pop' },
          { nombres: ['taylor swift'], artistaOficial: 'Taylor Swift', genero: 'Pop' },
          { nombres: ['shakira'], artistaOficial: 'Shakira', genero: 'Pop' },
          { nombres: ['michael jackson'], artistaOficial: 'Michael Jackson', genero: 'Pop' },
          { nombres: ['ariana grande'], artistaOficial: 'Ariana Grande', genero: 'Pop' },
          { nombres: ['bruno mars'], artistaOficial: 'Bruno Mars', genero: 'Pop' },
          { nombres: ['the weeknd', 'weeknd'], artistaOficial: 'The Weeknd', genero: 'Pop' },
          { nombres: ['justin bieber'], artistaOficial: 'Justin Bieber', genero: 'Pop' },
          { nombres: ['katy perry'], artistaOficial: 'Katy Perry', genero: 'Pop' },
          { nombres: ['rihanna'], artistaOficial: 'Rihanna', genero: 'Pop' },
          { nombres: ['billie eilish'], artistaOficial: 'Billie Eilish', genero: 'Pop' },
          { nombres: ['harry styles'], artistaOficial: 'Harry Styles', genero: 'Pop' },
          { nombres: ['ed sheeran'], artistaOficial: 'Ed Sheeran', genero: 'Pop' },
          { nombres: ['lady gaga'], artistaOficial: 'Lady Gaga', genero: 'Pop' },
          { nombres: ['selena gomez'], artistaOficial: 'Selena Gomez', genero: 'Pop' },
          { nombres: ['camila cabello'], artistaOficial: 'Camila Cabello', genero: 'Pop' },
          { nombres: ['olivia rodrigo'], artistaOficial: 'Olivia Rodrigo', genero: 'Pop' },
          { nombres: ['jonas brothers', 'camp rock'], artistaOficial: 'Jonas Brothers', genero: 'Pop' },
          { nombres: ['shawn mendes'], artistaOficial: 'Shawn Mendes', genero: 'Pop' },
          { nombres: ['adele'], artistaOficial: 'Adele', genero: 'Pop' },
          { nombres: ['madonna'], artistaOficial: 'Madonna', genero: 'Pop' },
          { nombres: ['britney spears'], artistaOficial: 'Britney Spears', genero: 'Pop' },
          { nombres: ['beyonce', 'beyoncé'], artistaOficial: 'Beyoncé', genero: 'Pop' },
          { nombres: ['justin timberlake'], artistaOficial: 'Justin Timberlake', genero: 'Pop' },
          { nombres: ['miley cyrus'], artistaOficial: 'Miley Cyrus', genero: 'Pop' },
          { nombres: ['maroon 5'], artistaOficial: 'Maroon 5', genero: 'Pop' },
          { nombres: ['chayanne'], artistaOficial: 'Chayanne', genero: 'Pop' },
          { nombres: ['ricky martin'], artistaOficial: 'Ricky Martin', genero: 'Pop' },
          { nombres: ['enrique iglesias'], artistaOficial: 'Enrique Iglesias', genero: 'Pop' },
          { nombres: ['sebastian yatra', 'sebastián yatra'], artistaOficial: 'Sebastián Yatra', genero: 'Pop' },
          { nombres: ['morat'], artistaOficial: 'Morat', genero: 'Pop' },
          { nombres: ['camilo'], artistaOficial: 'Camilo', genero: 'Pop' },
          { nombres: ['aitana'], artistaOficial: 'Aitana', genero: 'Pop' },

          // Rock
          { nombres: ['queen', 'freddie mercury'], artistaOficial: 'Queen', genero: 'Rock' },
          { nombres: ['the beatles', 'beatles'], artistaOficial: 'The Beatles', genero: 'Rock' },
          { nombres: ['metallica'], artistaOficial: 'Metallica', genero: 'Rock' },
          { nombres: ['ac/dc', 'acdc'], artistaOficial: 'AC/DC', genero: 'Rock' },
          { nombres: ['guns n roses', "guns n' roses"], artistaOficial: "Guns N' Roses", genero: 'Rock' },
          { nombres: ['nirvana', 'kurt cobain'], artistaOficial: 'Nirvana', genero: 'Rock' },
          { nombres: ['linkin park', 'chester bennington'], artistaOficial: 'Linkin Park', genero: 'Rock' },
          { nombres: ['red hot chili peppers', 'rhcp'], artistaOficial: 'Red Hot Chili Peppers', genero: 'Rock' },
          { nombres: ['bon jovi'], artistaOficial: 'Bon Jovi', genero: 'Rock' },
          { nombres: ['pink floyd'], artistaOficial: 'Pink Floyd', genero: 'Rock' },
          { nombres: ['led zeppelin'], artistaOficial: 'Led Zeppelin', genero: 'Rock' },
          { nombres: ['aerosmith'], artistaOficial: 'Aerosmith', genero: 'Rock' },
          { nombres: ['the rolling stones', 'rolling stones'], artistaOficial: 'The Rolling Stones', genero: 'Rock' },
          { nombres: ['green day'], artistaOficial: 'Green Day', genero: 'Rock' },
          { nombres: ['foo fighters'], artistaOficial: 'Foo Fighters', genero: 'Rock' },
          { nombres: ['soda stereo', 'gustavo cerati', 'cerati'], artistaOficial: 'Soda Stereo', genero: 'Rock' },
          { nombres: ['mana', 'maná'], artistaOficial: 'Maná', genero: 'Rock' },
          { nombres: ['enanitos verdes', 'los enanitos verdes'], artistaOficial: 'Los Enanitos Verdes', genero: 'Rock' },
          { nombres: ['molotov'], artistaOficial: 'Molotov', genero: 'Rock' },
          { nombres: ['caifanes', 'jaguares'], artistaOficial: 'Caifanes', genero: 'Rock' },
          { nombres: ['heroes del silencio', 'héroes del silencio', 'bunbury'], artistaOficial: 'Héroes del Silencio', genero: 'Rock' },
          { nombres: ['cafe tacvba', 'café tacvba'], artistaOficial: 'Café Tacvba', genero: 'Rock' },
          { nombres: ['zoe', 'zoé'], artistaOficial: 'Zoé', genero: 'Rock' },
          { nombres: ['el tri'], artistaOficial: 'El Tri', genero: 'Rock' },

          // Salsa
          { nombres: ['marc anthony'], artistaOficial: 'Marc Anthony', genero: 'Salsa' },
          { nombres: ['hector lavoe', 'héctor lavoe'], artistaOficial: 'Héctor Lavoe', genero: 'Salsa' },
          { nombres: ['celia cruz'], artistaOficial: 'Celia Cruz', genero: 'Salsa' },
          { nombres: ['willie colon', 'willie colón'], artistaOficial: 'Willie Colón', genero: 'Salsa' },
          { nombres: ['ruben blades', 'rubén blades'], artistaOficial: 'Rubén Blades', genero: 'Salsa' },
          { nombres: ['gilberto santa rosa'], artistaOficial: 'Gilberto Santa Rosa', genero: 'Salsa' },
          { nombres: ['frankie ruiz'], artistaOficial: 'Frankie Ruiz', genero: 'Salsa' },
          { nombres: ['victor manuelle', 'víctor manuelle'], artistaOficial: 'Víctor Manuelle', genero: 'Salsa' },
          { nombres: ['grupo niche'], artistaOficial: 'Grupo Niche', genero: 'Salsa' },
          { nombres: ['joe arroyo'], artistaOficial: 'Joe Arroyo', genero: 'Salsa' },
          { nombres: ['el gran combo'], artistaOficial: 'El Gran Combo de Puerto Rico', genero: 'Salsa' },
          { nombres: ['oscar d leon', "oscar d'leon"], artistaOficial: "Oscar D'León", genero: 'Salsa' },

          // Bachata
          { nombres: ['romeo santos'], artistaOficial: 'Romeo Santos', genero: 'Bachata' },
          { nombres: ['aventura'], artistaOficial: 'Aventura', genero: 'Bachata' },
          { nombres: ['prince royce'], artistaOficial: 'Prince Royce', genero: 'Bachata' },
          { nombres: ['juan luis guerra'], artistaOficial: 'Juan Luis Guerra', genero: 'Bachata' },
          { nombres: ['frank reyes'], artistaOficial: 'Frank Reyes', genero: 'Bachata' },
          { nombres: ['anthony santos'], artistaOficial: 'Anthony Santos', genero: 'Bachata' },
          { nombres: ['zacarias ferreira', 'zacarías ferreira'], artistaOficial: 'Zacarías Ferreira', genero: 'Bachata' },

          // Cumbia
          { nombres: ['angeles azules', 'ángeles azules'], artistaOficial: 'Los Ángeles Azules', genero: 'Cumbia' },
          { nombres: ['grupo frontera'], artistaOficial: 'Grupo Frontera', genero: 'Cumbia' },
          { nombres: ['selena', 'selena quintanilla'], artistaOficial: 'Selena Quintanilla', genero: 'Cumbia' },
          { nombres: ['sonora dinamita'], artistaOficial: 'La Sonora Dinamita', genero: 'Cumbia' },
          { nombres: ['kumbia kings'], artistaOficial: 'Kumbia Kings', genero: 'Cumbia' },
          { nombres: ['los angeles de charly', 'ángeles de charly'], artistaOficial: 'Los Ángeles de Charly', genero: 'Cumbia' },
          { nombres: ['celso piña'], artistaOficial: 'Celso Piña', genero: 'Cumbia' },
          { nombres: ['damas gratis'], artistaOficial: 'Damas Gratis', genero: 'Cumbia' },

          // Merengue
          { nombres: ['elvis crespo'], artistaOficial: 'Elvis Crespo', genero: 'Merengue' },
          { nombres: ['wilfrido vargas'], artistaOficial: 'Wilfrido Vargas', genero: 'Merengue' },
          { nombres: ['olga tañon', 'olga tañón'], artistaOficial: 'Olga Tañón', genero: 'Merengue' },
          { nombres: ['eddy herrera'], artistaOficial: 'Eddy Herrera', genero: 'Merengue' },
          { nombres: ['sergio vargas'], artistaOficial: 'Sergio Vargas', genero: 'Merengue' },
          { nombres: ['los hermanos rosario'], artistaOficial: 'Los Hermanos Rosario', genero: 'Merengue' },

          // Rap & Hip Hop
          { nombres: ['eminem', 'slim shady'], artistaOficial: 'Eminem', genero: 'Rap' },
          { nombres: ['drake'], artistaOficial: 'Drake', genero: 'Hip Hop' },
          { nombres: ['kendrick lamar'], artistaOficial: 'Kendrick Lamar', genero: 'Hip Hop' },
          { nombres: ['snoop dogg'], artistaOficial: 'Snoop Dogg', genero: 'Hip Hop' },
          { nombres: ['2pac', 'tupac'], artistaOficial: '2Pac', genero: 'Hip Hop' },
          { nombres: ['50 cent'], artistaOficial: '50 Cent', genero: 'Hip Hop' },
          { nombres: ['kanye west', 'ye'], artistaOficial: 'Kanye West', genero: 'Hip Hop' },
          { nombres: ['cartel de santa', 'babo'], artistaOficial: 'Cartel de Santa', genero: 'Rap' },
          { nombres: ['santa fe klan'], artistaOficial: 'Santa Fe Klan', genero: 'Rap' },
          { nombres: ['canserbero'], artistaOficial: 'Canserbero', genero: 'Rap' },
          { nombres: ['aleman', 'alemán'], artistaOficial: 'Alemán', genero: 'Rap' },
          { nombres: ['gera mx'], artistaOficial: 'Gera MX', genero: 'Rap' },
          { nombres: ['residente', 'calle 13'], artistaOficial: 'Residente', genero: 'Rap' },
          { nombres: ['trueno'], artistaOficial: 'Trueno', genero: 'Rap' },
          { nombres: ['wos'], artistaOficial: 'Wos', genero: 'Rap' },

          // Trap
          { nombres: ['anuel', 'anuel aa'], artistaOficial: 'Anuel AA', genero: 'Trap' },
          { nombres: ['myke towers'], artistaOficial: 'Myke Towers', genero: 'Trap' },
          { nombres: ['eladio carrion', 'eladio carrión'], artistaOficial: 'Eladio Carrión', genero: 'Trap' },
          { nombres: ['duki'], artistaOficial: 'Duki', genero: 'Trap' },
          { nombres: ['bizarrap', 'bzrp'], artistaOficial: 'Bizarrap', genero: 'Trap' },
          { nombres: ['yovngchimi'], artistaOficial: 'YOVNGCHIMI', genero: 'Trap' },
          { nombres: ['bryant myers'], artistaOficial: 'Bryant Myers', genero: 'Trap' },

          // Electrónica
          { nombres: ['david guetta'], artistaOficial: 'David Guetta', genero: 'Electrónica' },
          { nombres: ['avicii', 'tim bergling'], artistaOficial: 'Avicii', genero: 'Electrónica' },
          { nombres: ['calvin harris'], artistaOficial: 'Calvin Harris', genero: 'Electrónica' },
          { nombres: ['tiesto', 'tiësto'], artistaOficial: 'Tiësto', genero: 'Electrónica' },
          { nombres: ['martin garrix'], artistaOficial: 'Martin Garrix', genero: 'Electrónica' },
          { nombres: ['daft punk'], artistaOficial: 'Daft Punk', genero: 'Electrónica' },
          { nombres: ['skrillex'], artistaOficial: 'Skrillex', genero: 'Electrónica' },
          { nombres: ['alan walker'], artistaOficial: 'Alan Walker', genero: 'Electrónica' },
          { nombres: ['marshmello'], artistaOficial: 'Marshmello', genero: 'Electrónica' },
          { nombres: ['swedish house mafia'], artistaOficial: 'Swedish House Mafia', genero: 'Electrónica' },
          { nombres: ['steve aoki'], artistaOficial: 'Steve Aoki', genero: 'Electrónica' },
          { nombres: ['armin van buuren'], artistaOficial: 'Armin van Buuren', genero: 'Electrónica' },

          // Música Cristiana
          { nombres: ['marcos witt'], artistaOficial: 'Marcos Witt', genero: 'Música Cristiana' },
          { nombres: ['jesus adrian romero', 'jesús adrián romero'], artistaOficial: 'Jesús Adrián Romero', genero: 'Música Cristiana' },
          { nombres: ['alex campos'], artistaOficial: 'Alex Campos', genero: 'Música Cristiana' },
          { nombres: ['hillsong', 'hillsong worship', 'hillsong united'], artistaOficial: 'Hillsong', genero: 'Música Cristiana' },
          { nombres: ['elevation worship'], artistaOficial: 'Elevation Worship', genero: 'Música Cristiana' },
          { nombres: ['redimi2'], artistaOficial: 'Redimi2', genero: 'Música Cristiana' },
          { nombres: ['miel san marcos'], artistaOficial: 'Miel San Marcos', genero: 'Música Cristiana' },
          { nombres: ['marcela gandara', 'marcela gándara'], artistaOficial: 'Marcela Gándara', genero: 'Música Cristiana' },
          { nombres: ['lilly goodman'], artistaOficial: 'Lilly Goodman', genero: 'Música Cristiana' },
          { nombres: ['tercer cielo'], artistaOficial: 'Tercer Cielo', genero: 'Música Cristiana' },
          { nombres: ['christine dclario', "christine d'clario"], artistaOficial: "Christine D'Clario", genero: 'Música Cristiana' },
          { nombres: ['grupo barak', 'barak'], artistaOficial: 'Barak', genero: 'Música Cristiana' },

          // Baladas Románticas
          { nombres: ['luis miguel'], artistaOficial: 'Luis Miguel', genero: 'Baladas Románticas' },
          { nombres: ['cristian castro'], artistaOficial: 'Cristian Castro', genero: 'Baladas Románticas' },
          { nombres: ['marco antonio solis', 'marco antonio solís', 'los bukis'], artistaOficial: 'Marco Antonio Solís', genero: 'Baladas Románticas' },
          { nombres: ['jose jose', 'josé josé'], artistaOficial: 'José José', genero: 'Baladas Románticas' },
          { nombres: ['ricardo arjona'], artistaOficial: 'Ricardo Arjona', genero: 'Baladas Románticas' },
          { nombres: ['camilo sesto'], artistaOficial: 'Camilo Sesto', genero: 'Baladas Románticas' },
          { nombres: ['roberto carlos'], artistaOficial: 'Roberto Carlos', genero: 'Baladas Románticas' },
          { nombres: ['juan gabriel'], artistaOficial: 'Juan Gabriel', genero: 'Baladas Románticas' },
          { nombres: ['sin bandera'], artistaOficial: 'Sin Bandera', genero: 'Baladas Románticas' },
          { nombres: ['reik'], artistaOficial: 'Reik', genero: 'Baladas Románticas' },
          { nombres: ['camila'], artistaOficial: 'Camila', genero: 'Baladas Románticas' },
          { nombres: ['alejandro sanz'], artistaOficial: 'Alejandro Sanz', genero: 'Baladas Románticas' },
          { nombres: ['ricardo montaner'], artistaOficial: 'Ricardo Montaner', genero: 'Baladas Románticas' },
          { nombres: ['rocio durcal', 'rocío dúrcal'], artistaOficial: 'Rocío Dúrcal', genero: 'Baladas Románticas' },
          { nombres: ['ana gabriel'], artistaOficial: 'Ana Gabriel', genero: 'Baladas Románticas' },
          { nombres: ['franco de vita'], artistaOficial: 'Franco De Vita', genero: 'Baladas Románticas' }
        ];

        // Buscar coincidencia en el catálogo
        const searchScope = (filename + ' ' + rawClean + ' ' + (id3Artist || '') + ' ' + (id3Title || ''))
          .toLowerCase()
          .replace(/[_\-]+/g, ' ')
          .replace(/\s+/g, ' ');

        const matchedCatalog = catalogoArtistas.find((item) =>
          item.nombres.some((n) => searchScope.includes(n))
        );

        if (matchedCatalog) {
          artista = matchedCatalog.artistaOficial;
          genero = matchedCatalog.genero;

          // Limpiar el nombre del artista del título
          let candidate = rawClean;
          for (const n of matchedCatalog.nombres) {
            candidate = candidate.replace(new RegExp(n, 'gi'), '');
          }
          candidate = candidate.replace(/^[\s\-_—–:]+|[\s\-_—–:]+$/g, '').trim();
          if (candidate.length > 2) {
            titulo = candidate;
          }
        } else {
          // Separar Artista - Título si tiene separador
          if (rawClean.includes(' - ')) {
            const parts = rawClean.split(' - ');
            artista = parts[0].trim();
            titulo = parts.slice(1).join(' - ').trim();
          } else if (rawClean.includes(' — ')) {
            const parts = rawClean.split(' — ');
            artista = parts[0].trim();
            titulo = parts.slice(1).join(' — ').trim();
          } else if (rawClean.toLowerCase().includes(' by ')) {
            const parts = rawClean.split(/ by /i);
            titulo = parts[0].trim();
            artista = parts[1].trim();
          }

          // Detección heurística de género por palabras clave en nombre o título
          const low = searchScope;
          if (low.includes('corrido') || low.includes('belico') || low.includes('bélico') || low.includes('tumbado')) {
            genero = 'Corridos';
          } else if (low.includes('reggaeton') || low.includes('reguet') || low.includes('perreo') || low.includes('dembow')) {
            genero = 'Reggaeton';
          } else if (low.includes('banda') || low.includes('sinaloense') || low.includes('tambora')) {
            genero = 'Banda';
          } else if (low.includes('pop')) {
            genero = 'Pop';
          } else if (low.includes('rock') || low.includes('metal') || low.includes('grunge') || low.includes('punk')) {
            genero = 'Rock';
          } else if (low.includes('salsa') || low.includes('guaguanco')) {
            genero = 'Salsa';
          } else if (low.includes('bachata')) {
            genero = 'Bachata';
          } else if (low.includes('cumbia') || low.includes('cumbion')) {
            genero = 'Cumbia';
          } else if (low.includes('merengue')) {
            genero = 'Merengue';
          } else if (low.includes('trap')) {
            genero = 'Trap';
          } else if (low.includes('rap') || low.includes('hip hop') || low.includes('hiphop')) {
            genero = 'Rap';
          } else if (low.includes('electronica') || low.includes('electrónica') || low.includes('edm') || low.includes('house') || low.includes('techno') || low.includes('trance')) {
            genero = 'Electrónica';
          } else if (low.includes('cristian') || low.includes('adoracion') || low.includes('adoración') || low.includes('alabanza')) {
            genero = 'Música Cristiana';
          } else if (low.includes('balada') || low.includes('bolero') || low.includes('romantica') || low.includes('romántica')) {
            genero = 'Baladas Románticas';
          } else if (low.includes('regional') || low.includes('norteñ') || low.includes('sierreñ') || low.includes('campirano')) {
            genero = 'Regional Mexicano';
          } else {
            // Verificar si el archivo tiene un nombre genérico sin pista alguna
            const isGenericName = /^(audio|track|sound|pista|grabacion|recording|voice|voz|file|musica|music|cancion)[\s._\d-]*$/i.test(rawClean);
            if (isGenericName && (!id3Artist || id3Artist.toLowerCase() === 'artista')) {
              genero = ''; // No se pudo identificar género
            } else if (artista && artista !== 'Artista') {
              genero = 'Otros';
            } else {
              genero = '';
            }
          }
        }

        if (!artista || artista.trim().length === 0) {
          artista = id3Artist || 'Artista';
        }
        if (!titulo || titulo.trim().length === 0) {
          titulo = id3Title || rawClean || 'Canción';
        }

        const capitalize = (str: string) =>
          str
            .split(' ')
            .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : ''))
            .join(' ');

        if (titulo === titulo.toLowerCase()) titulo = capitalize(titulo);
        if (artista === artista.toLowerCase()) artista = capitalize(artista);

        aiResult = {
          titulo,
          artista,
          genero,
          genre: genero,
          descripcionPortada: `${artista} ${titulo} vivid stylish music album art cover vinyl 4k`,
          fuenteIA: 'DeepSeek / Gemini IA'
        };
      }



      // 4. Generar URL de portada de alta resolución personalizada basada en artista y canción
      if (aiResult) {
        const promptClean = encodeURIComponent(
          `${aiResult.descripcionPortada || aiResult.artista + ' ' + aiResult.titulo} vibrant music album art cover masterpiece stylish 4k`
        );
        aiResult.coverUrl = `https://image.pollinations.ai/prompt/${promptClean}?width=512&height=512&nologo=true&seed=${Math.floor(
          Math.random() * 1000000
        )}`;
      }

      return res.json({
        success: true,
        data: aiResult
      });
    } catch (err: unknown) {
      console.error('Error en /api/ai/tag-audio:', err);
      return res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Error al procesar audio con IA'
      });
    }
  });

  // API Endpoint: Clasificación por lotes de canciones con DeepSeek IA
  app.post('/api/ai/batch-classify-genres', async (req, res) => {
    try {
      const rawSongs = Array.isArray(req.body.songs) ? req.body.songs : [];
      if (rawSongs.length === 0) {
        return res.json({ success: true, results: [] });
      }

      interface ItemToClassify {
        id: string;
        title: string;
        artist: string;
        filename: string;
      }

      const items: ItemToClassify[] = rawSongs.map((item: any) => {
        const id = String(item.id || '');
        const title = String(item.title || item.titulo || '').trim();
        const artist = String(item.artist || item.artista || '').trim();
        const rawAudio = String(item.audio_url || item.url || item.storage_path || '').trim();
        let filename = String(item.filename || '').trim();
        if (!filename && rawAudio) {
          try {
            filename = decodeURIComponent(rawAudio.split('?')[0].split('/').pop() || '');
          } catch {
            filename = rawAudio.split('?')[0].split('/').pop() || '';
          }
        }
        return { id, title, artist, filename };
      });

      const resultsMap: Record<string, string> = {};

      // 1. Intentar clasificar con DeepSeek API si existe DEEPSEEK_API_KEY
      if (process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY.trim().length > 0) {
        try {
          const listPrompt = items.map((it: ItemToClassify, idx: number) =>
            `[${idx + 1}] ID: "${it.id}" | Título: "${it.title}" | Artista: "${it.artist}" | Archivo: "${it.filename}"`
          ).join('\n');

          const dsRes = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            signal: AbortSignal.timeout(25000),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY.trim()}`
            },
            body: JSON.stringify({
              model: 'deepseek-chat',
              messages: [
                {
                  role: 'system',
                  content: `Eres el asistente experto de Spotyy_AA para clasificación musical e identificación precisa de canciones.
Tu labor es clasificar CADA UNA de las canciones individualmente en su género musical real según su título, artista y nombre de archivo.
REGLAS OBLIGATORIAS:
1. No clasifiques todas las canciones en un mismo género. Cada canción debe tener el género musical que le corresponda.
2. Selecciona OBLIGATORIAMENTE el género más representativo entre:
   - Corridos
   - Corridos Tumbados
   - Banda
   - Regional Mexicano
   - Reggaeton
   - Pop
   - Rock
   - Salsa
   - Bachata
   - Cumbia
   - Merengue
   - Rap
   - Hip Hop
   - Trap
   - Electrónica
   - Baladas Románticas
   - Música Cristiana
   - Otros
3. Si el archivo es completamente inidentificable o genérico sin pistas reales (ej. "audio1.mp3", "track01"), responde "" (cadena vacía) en genre para no mover la canción.
4. Responde ÚNICAMENTE un JSON válido con la propiedad "results", donde cada elemento tenga {"id": "...", "genre": "..."}.`
                },
                {
                  role: 'user',
                  content: `Clasifica estas ${items.length} canciones individualmente por género:\n${listPrompt}`
                }
              ],
              response_format: { type: 'json_object' }
            })
          });

          if (dsRes.ok) {
            const dsData = await dsRes.json();
            const textContent = dsData.choices?.[0]?.message?.content;
            if (textContent) {
              const parsed = JSON.parse(textContent);
              const list = Array.isArray(parsed.results) ? parsed.results : (Array.isArray(parsed) ? parsed : []);
              for (const r of list) {
                if (r && r.id && typeof r.genre === 'string') {
                  const g = r.genre.trim();
                  if (g) resultsMap[String(r.id)] = g;
                }
              }
            }
          }
        } catch (dsErr) {
          console.warn('Nota en clasificación con DeepSeek por lote:', dsErr);
        }
      }

      // 2. Si faltan canciones y existe GEMINI_API_KEY, usar Gemini como respaldo
      const pendingItems = items.filter((it: ItemToClassify) => !resultsMap[it.id]);
      if (pendingItems.length > 0 && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0) {
        const candidateModels = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-3.8-flash'];
        for (const candidateModel of candidateModels) {
          try {
            const { GoogleGenAI } = await import('@google/genai');
            const ai = new GoogleGenAI({
              apiKey: process.env.GEMINI_API_KEY,
              httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
            });

            const geminiPrompt = `Eres el clasificador musical de Spotyy_AA. Clasifica cada una de estas canciones individualmente en su género musical real:
${pendingItems.map((it: ItemToClassify, idx: number) => `[${idx + 1}] ID: "${it.id}" | Título: "${it.title}" | Artista: "${it.artist}" | Archivo: "${it.filename}"`).join('\n')}

Géneros oficiales obligatorios: Corridos, Corridos Tumbados, Banda, Regional Mexicano, Reggaeton, Pop, Rock, Salsa, Bachata, Cumbia, Merengue, Rap, Hip Hop, Trap, Electrónica, Baladas Románticas, Música Cristiana, Otros. Si es genérica o irreconocible, usa "".
No clasifiques todas en un mismo género.
Devuelve ÚNICAMENTE un JSON con: {"results": [{"id": string, "genre": string}]}`;

            const geminiRes = await ai.models.generateContent({
              model: candidateModel,
              contents: geminiPrompt,
              config: { responseMimeType: 'application/json' }
            });

            const geminiText = geminiRes.text?.trim();
            if (geminiText) {
              const parsed = JSON.parse(geminiText);
              const list = Array.isArray(parsed.results) ? parsed.results : (Array.isArray(parsed) ? parsed : []);
              for (const r of list) {
                if (r && r.id && typeof r.genre === 'string' && !resultsMap[String(r.id)]) {
                  const g = r.genre.trim();
                  if (g) resultsMap[String(r.id)] = g;
                }
              }
              break;
            }
          } catch (geminiErr: any) {
            const errStr = String(geminiErr?.message || geminiErr);
            if (errStr.includes('429') || errStr.includes('RESOURCE_EXHAUSTED') || errStr.includes('quota')) {
              continue;
            }
            break;
          }
        }
      }

      // 3. Respaldo heurístico offline por catálogo musical y palabras clave para las canciones restantes
      for (const it of items) {
        if (!resultsMap[it.id]) {
          const searchScope = `${it.filename} ${it.artist} ${it.title}`;
          const detected = detectGenreFromCatalogAndKeywords(searchScope);
          if (detected) {
            resultsMap[it.id] = detected;
          } else {
            // Verificar si el archivo tiene un nombre genérico sin artista conocido
            const isGenericName = /^(audio|track|sound|pista|grabacion|recording|voice|voz|file|musica|music|cancion)[\s._\d-]*$/i.test(it.filename);
            if (isGenericName && (!it.artist || it.artist.toLowerCase() === 'artista')) {
              resultsMap[it.id] = ''; // No clasificado
            } else if (it.artist && it.artist.toLowerCase() !== 'artista') {
              resultsMap[it.id] = 'Otros';
            } else {
              resultsMap[it.id] = '';
            }
          }
        }
      }

      const results = items.map((it: ItemToClassify) => ({
        id: it.id,
        genre: resultsMap[it.id] || ''
      }));

      return res.json({
        success: true,
        results
      });
    } catch (err: unknown) {
      console.error('Error en /api/ai/batch-classify-genres:', err);
      return res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Error al clasificar canciones en lote'
      });
    }
  });

  // API Endpoint: Obtención de letras en texto plano con DeepSeek AI
  app.post('/api/ai/lyrics', async (req, res) => {
    try {
      const title = String(req.body.title || '').trim();
      const artist = String(req.body.artist || '').trim();

      if (!title) {
        return res.status(400).json({ success: false, error: 'Título de canción requerido' });
      }

      let lyrics: string | null = null;
      let fuente = 'DeepSeek AI';

      // 1. Petición a DeepSeek API pasándole el nombre del artista y la canción
      if (process.env.DEEPSEEK_API_KEY) {
        try {
          const dsRes = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
              model: 'deepseek-chat',
              messages: [
                {
                  role: 'system',
                  content:
                    'Eres un asistente musical experto. Tu labor es proporcionar la letra completa y verídica en texto plano de la canción solicitada según el título y el artista oficial. Devuelve ÚNICAMENTE la letra de la canción en texto plano, verso por verso con sus saltos de línea correspondientes entre estrofas. NO incluyas introducciones, ni comentarios, ni explicaciones, ni etiquetas de acordes, ni bloques de código markdown (sin comillas triples ```). Si la canción es puramente instrumental o no tiene letra, responde únicamente: Letra no disponible.'
                },
                {
                  role: 'user',
                  content: `Artista: "${artist || 'Artista'}". Canción: "${title}". Devuelve la letra oficial en texto plano.`
                }
              ],
              temperature: 0.2
            })
          });

          if (dsRes.ok) {
            const dsData = await dsRes.json();
            const textContent = dsData.choices?.[0]?.message?.content;
            if (textContent && typeof textContent === 'string' && textContent.trim()) {
              let clean = textContent.trim();
              // Limpiar delimitadores markdown si el modelo los incluyó
              clean = clean.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/i, '').trim();
              if (clean.length > 5) {
                lyrics = clean;
              }
            }
          } else {
            console.warn('DeepSeek lyrics HTTP error:', dsRes.status, await dsRes.text().catch(() => ''));
          }
        } catch (dsErr) {
          console.warn('DeepSeek lyrics API request failed:', dsErr);
        }
      }

      // 2. Si no hubo respuesta con DeepSeek y existe GEMINI_API_KEY, respaldo con Gemini
      if (!lyrics && process.env.GEMINI_API_KEY) {
        const candidateModels = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-3.8-flash'];
        for (const candidateModel of candidateModels) {
          try {
            const { GoogleGenAI } = await import('@google/genai');
            const ai = new GoogleGenAI({
              apiKey: process.env.GEMINI_API_KEY,
              httpOptions: {
                headers: {
                  'User-Agent': 'aistudio-build'
                }
              }
            });

            const geminiPrompt = `Eres un asistente musical experto. Proporciona la letra completa y oficial en texto plano de la siguiente canción:
- Canción: "${title}"
- Artista: "${artist || 'Desconocido'}"

Devuelve ÚNICAMENTE la letra de la canción en texto plano verso por verso con saltos de línea entre estrofas. NO agregues notas, ni introducciones, ni bloques de código markdown. Si es instrumental, responde "Letra no disponible".`;

            const geminiRes = await ai.models.generateContent({
              model: candidateModel,
              contents: geminiPrompt
            });

            const geminiText = geminiRes.text;
            if (geminiText && geminiText.trim()) {
              let clean = geminiText.trim().replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/i, '').trim();
              if (clean.length > 5) {
                lyrics = clean;
                fuente = 'Gemini AI (Respaldo)';
                break;
              }
            }
          } catch (geminiErr: any) {
            const errStr = String(geminiErr?.message || geminiErr);
            if (errStr.includes('429') || errStr.includes('RESOURCE_EXHAUSTED') || errStr.includes('quota')) {
              continue;
            }
            break;
          }
        }
      }

      if (lyrics) {
        return res.json({
          success: true,
          data: {
            lyrics,
            fuente,
            title,
            artist
          }
        });
      } else {
        return res.json({
          success: false,
          lyrics: null,
          message: 'Letra no disponible'
        });
      }
    } catch (err: unknown) {
      console.error('Error en /api/ai/lyrics:', err);
      return res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Error al consultar letras con IA'
      });
    }
  });

  // Servir archivos estáticos de /public (PWA manifest, service worker, iconos)
  app.use(express.static(path.join(__dirname, 'public')));

  // Modo desarrollo con Vite middlewares o producción
  if (process.env.NODE_ENV !== 'production') {
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled ? false : { server: httpServer },
        watch: isHmrDisabled ? null : {},
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`JAaron Music Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Error starting server:', err);
});
