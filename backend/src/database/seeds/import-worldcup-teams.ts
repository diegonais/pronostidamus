import { NestFactory } from '@nestjs/core';
import { DataSource, Repository } from 'typeorm';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { AppModule } from '../../app.module';
import { Match } from '../../matches/entities/match.entity';
import { Team } from '../../teams/entities/team.entity';

type WorldCupTeam = {
  id: string;
  name_en: string;
  flag?: string;
  fifa_code?: string;
  iso2?: string;
  groups?: string;
};

const TEAM_DISPLAY_NAMES: Record<string, string> = {
  Mexico: 'México',
  'South Africa': 'Sudáfrica',
  'South Korea': 'Corea del Sur',
  'Czech Republic': 'República Checa',
  Canada: 'Canadá',
  'Bosnia and Herzegovina': 'Bosnia y Herzegovina',
  Qatar: 'Qatar',
  Switzerland: 'Suiza',
  Brazil: 'Brasil',
  Morocco: 'Marruecos',
  Haiti: 'Haití',
  Scotland: 'Escocia',
  'United States': 'Estados Unidos',
  Paraguay: 'Paraguay',
  Australia: 'Australia',
  Turkey: 'Turquía',
  Germany: 'Alemania',
  Curaçao: 'Curazao',
  'Ivory Coast': 'Costa de Marfil',
  Ecuador: 'Ecuador',
  Netherlands: 'Países Bajos',
  Japan: 'Japón',
  Sweden: 'Suecia',
  Tunisia: 'Túnez',
  Belgium: 'Bélgica',
  Egypt: 'Egipto',
  Iran: 'Irán',
  'New Zealand': 'Nueva Zelanda',
  Spain: 'España',
  'Cape Verde': 'Cabo Verde',
  'Saudi Arabia': 'Arabia Saudita',
  Uruguay: 'Uruguay',
  France: 'Francia',
  Senegal: 'Senegal',
  Iraq: 'Irak',
  Norway: 'Noruega',
  Argentina: 'Argentina',
  Algeria: 'Argelia',
  Austria: 'Austria',
  Jordan: 'Jordania',
  Portugal: 'Portugal',
  'Democratic Republic of the Congo': 'Congo',
  Uzbekistan: 'Uzbekistán',
  Colombia: 'Colombia',
  England: 'Inglaterra',
  Croatia: 'Croacia',
  Ghana: 'Ghana',
  Panama: 'Panamá',
};

const TEAM_ALIASES: Record<string, string[]> = {
  'United States': ['USA', 'Estados Unidos', 'EEUU', 'EE.UU.'],
  'South Korea': ['Korea Republic', 'Corea del Sur'],
  'Czech Republic': ['Czechia', 'Chequia', 'República Checa'],
  Netherlands: ['Holland', 'Holanda', 'Países Bajos'],
  'Ivory Coast': ["Côte d'Ivoire", 'Costa de Marfil'],
  'Democratic Republic of the Congo': [
    'DR Congo',
    'Congo DR',
    'RD Congo',
    'República Democrática del Congo',
    'Congo',
  ],
  Iran: ['Irán'],
  Spain: ['España'],
  Belgium: ['Bélgica'],
  Panama: ['Panamá'],
  Mexico: ['México'],
  Canada: ['Canadá'],
  Haiti: ['Haití'],
  Turkey: ['Turquía'],
  Japan: ['Japón'],
  Sweden: ['Suecia'],
  Tunisia: ['Túnez'],
  'New Zealand': ['Nueva Zelanda'],
  'Cape Verde': ['Cabo Verde'],
  'Saudi Arabia': ['Arabia Saudita'],
  France: ['Francia'],
  Iraq: ['Irak'],
  Norway: ['Noruega'],
  Algeria: ['Argelia'],
  Jordan: ['Jordania'],
  Uzbekistan: ['Uzbekistán'],
  England: ['Inglaterra'],
  Croatia: ['Croacia'],
};

const PRODUCTION_TEAM_ALIASES: Record<string, string[]> = {
  'Bosnia and Herzegovina': ['Bosnia', 'Bosnia Herzegovina', 'Bosnia y Herzegovina'],
  Qatar: ['Catar'],
  'Czech Republic': ['Republica Checa'],
  Netherlands: ['Paises Bajos'],
  Spain: ['Espana'],
  Belgium: ['Belgica'],
  Panama: ['Panama'],
  Mexico: ['Mexico'],
  Canada: ['Canada'],
  Haiti: ['Haiti'],
  Turkey: ['Turquia'],
  Japan: ['Japon'],
  Tunisia: ['Tunez'],
  'Saudi Arabia': ['Arabia Saudi'],
  Uzbekistan: ['Uzbekistan'],
};

function resolveTeamsPath(): string {
  return path.resolve(
    process.env.WORLDCUP2026_TEAMS_JSON ??
      path.join(process.cwd(), '..', '..', 'worldcup2026', 'football.teams.json'),
  );
}

function maybeRepairMojibake(value: string): string {
  if (!/[ÃÂ]/.test(value)) {
    return value;
  }

  return Buffer.from(value, 'latin1').toString('utf8');
}

function normalizeTeamName(value: string): string {
  return maybeRepairMojibake(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase();
}

function addLookupValue(
  lookup: Map<string, Team>,
  value: string | null | undefined,
  team: Team,
) {
  if (!value) {
    return;
  }

  lookup.set(normalizeTeamName(value), team);
}

async function importTeams(
  teamRepository: Repository<Team>,
  teamsPath: string,
): Promise<Team[]> {
  const rawTeams = JSON.parse(fs.readFileSync(teamsPath, 'utf8')) as WorldCupTeam[];
  const importedTeams: Team[] = [];

  for (const rawTeam of rawTeams) {
    let team = await teamRepository.findOne({
      where: { externalId: rawTeam.id },
    });

    if (!team) {
      team = teamRepository.create({ externalId: rawTeam.id });
    }

    team.name = TEAM_DISPLAY_NAMES[rawTeam.name_en] ?? rawTeam.name_en;
    team.nameEn = rawTeam.name_en;
    team.fifaCode = rawTeam.fifa_code ?? null;
    team.iso2 = rawTeam.iso2 ?? null;
    team.group = rawTeam.groups ?? null;
    team.flagUrl = rawTeam.flag ?? null;

    importedTeams.push(await teamRepository.save(team));
  }

  return importedTeams;
}

async function backfillMatches(
  matchRepository: Repository<Match>,
  teams: Team[],
): Promise<number> {
  const lookup = new Map<string, Team>();

  for (const team of teams) {
    addLookupValue(lookup, team.name, team);
    addLookupValue(lookup, team.nameEn, team);
    addLookupValue(lookup, team.fifaCode, team);
    addLookupValue(lookup, team.iso2, team);

    for (const alias of [
      ...(TEAM_ALIASES[team.nameEn] ?? []),
      ...(PRODUCTION_TEAM_ALIASES[team.nameEn] ?? []),
    ]) {
      addLookupValue(lookup, alias, team);
    }
  }

  const matches = await matchRepository.find();
  let updatedMatches = 0;

  for (const match of matches) {
    const teamA = lookup.get(normalizeTeamName(match.teamA));
    const teamB = lookup.get(normalizeTeamName(match.teamB));
    let changed = false;

    if (!match.teamAId && teamA) {
      match.teamAId = teamA.id;
      changed = true;
    }

    if (!match.teamBId && teamB) {
      match.teamBId = teamB.id;
      changed = true;
    }

    if (changed) {
      await matchRepository.save(match);
      updatedMatches++;
    }
  }

  return updatedMatches;
}

async function runImport() {
  process.env.TZ = process.env.TZ ?? 'America/La_Paz';

  const teamsPath = resolveTeamsPath();
  if (!fs.existsSync(teamsPath)) {
    throw new Error(`World Cup teams file was not found at ${teamsPath}`);
  }

  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const teamRepository = dataSource.getRepository(Team);
  const matchRepository = dataSource.getRepository(Match);

  try {
    const teams = await importTeams(teamRepository, teamsPath);
    const linkedMatches = await backfillMatches(matchRepository, teams);

    console.log(
      `Imported ${teams.length} teams from ${teamsPath}. Linked ${linkedMatches} existing match(es).`,
    );
  } finally {
    await app.close();
  }
}

runImport().catch((error: unknown) => {
  console.error('World Cup teams import failed', error);
  process.exitCode = 1;
});
