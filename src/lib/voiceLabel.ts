import { Dialect, Voice } from '../types';
import { isEn } from './i18n';

// English display data for the Arabic voices and dialects (the voices themselves stay Arabic)
const VOICE_EN: Record<string, { name: string; region: string; forText: string }> = {
  amine_ma: { name: 'Amine', region: 'Morocco', forText: 'Novels, stories and self-help' },
  salma_ma: { name: 'Salma', region: 'Morocco', forText: 'Self-help and contemporary novels' },
  faisal_sa: { name: 'Faisal', region: 'Saudi', forText: 'Leadership, history and business' },
  noura_sa: { name: 'Noura', region: 'Saudi', forText: 'Articles, science and education' },
  maryam_eg: { name: 'Mariam', region: 'Egypt', forText: 'Novels and human stories' },
  kareem_eg: { name: 'Karim', region: 'Egypt', forText: 'Personal growth and general culture' },
  layla_ae: { name: 'Layla', region: 'UAE', forText: 'Literary texts, reflection and travel' },
  tariq_ae: { name: 'Tarek', region: 'UAE', forText: 'Economics, investing and startups' },
  youssef_msa: { name: 'Youssef', region: 'MSA', forText: 'Classic novels, religion and history' },
  fatima_msa: { name: 'Fatima', region: 'MSA', forText: 'Articles, research and official reports' },
  ziad_sy: { name: 'Ziad', region: 'Levant', forText: 'Novels, stories and ideas' },
  dana_sy: { name: 'Dana', region: 'Levant', forText: 'Contemporary novels and self-help' },
  hamza_dz: { name: 'Hamza', region: 'Algeria', forText: 'History and general books' },
  sarah_dz: { name: 'Sara', region: 'Algeria', forText: 'Contemporary novels and self-help' },
  iyas_tn: { name: 'Iyas', region: 'Tunisia', forText: 'Novels and cultural books' },
  rim_tn: { name: 'Reem', region: 'Tunisia', forText: 'Education and human stories' },
  rayan_iq: { name: 'Rayan', region: 'Iraq', forText: 'History, literature and epics' },
  shahd_iq: { name: 'Shahd', region: 'Iraq', forText: 'Articles, academic books and stories' },
  mazen_jo: { name: 'Mazen', region: 'Jordan', forText: 'Self-help and general ideas' },
  nour_jo: { name: 'Nour', region: 'Jordan', forText: 'Novels and educational books' },
  badr_om: { name: 'Badr', region: 'Oman', forText: 'Heritage, reflection and literature' },
  hala_om: { name: 'Hala', region: 'Oman', forText: 'Stories and historical novels' },
  samer_kw: { name: 'Samer', region: 'Kuwait', forText: 'Startups, management and economics' },
  asmaa_kw: { name: 'Asma', region: 'Kuwait', forText: 'Motivation and personal growth' },
  hadi_qa: { name: 'Hadi', region: 'Qatar', forText: 'Research and academic studies' },
  razan_qa: { name: 'Razan', region: 'Qatar', forText: 'Media and modern novels' },
  waleed_sd: { name: 'Walid', region: 'Sudan', forText: 'Social and heritage stories' },
  mayar_sd: { name: 'Mayar', region: 'Sudan', forText: 'Novels, reflections and poetry' },
  jood_lit: { name: 'Joud', region: 'Arabic literature', forText: 'Literature, philosophy and poetry' },
  suhaib_doc: { name: 'Suhaib', region: 'Documentaries', forText: 'Science, history and documentaries' },
};

const DIALECT_EN: Record<string, string> = {
  ma: 'Moroccan (Darija)',
  sa: 'Saudi',
  eg: 'Egyptian',
  ae: 'Emirati',
  msa: 'Modern Standard Arabic',
  sy: 'Levantine',
  dz: 'Algerian',
  tn: 'Tunisian',
  iq: 'Iraqi',
  jo: 'Jordanian',
  om: 'Omani',
  kw: 'Kuwaiti',
  qa: 'Qatari',
  sd: 'Sudanese',
};

// "أمين (المغرب)" / "Amine (Morocco)"
export const voiceLabel = (v: Voice): string => {
  const en = isEn ? VOICE_EN[v.id] : undefined;
  return en ? `${en.name} (${en.region})` : v.name.split(' - ')[0];
};

export const voiceInitial = (v: Voice): string => (isEn && VOICE_EN[v.id] ? VOICE_EN[v.id].name : v.name).charAt(0);

export const voiceRecommendedFor = (v: Voice): string => (isEn && VOICE_EN[v.id] ? VOICE_EN[v.id].forText : v.recommendedFor || '');

// Full dialect name; short=true drops the parenthesised detail
export const dialectLabel = (d: Dialect | undefined, short = false): string => {
  if (!d) return '';
  const name = isEn ? DIALECT_EN[d.id] || d.name : d.name;
  return short ? name.split(' (')[0] : name;
};

export const genderLabel = (v: Voice): string => (v.gender === 'female' ? (isEn ? 'Female' : 'امرأة') : isEn ? 'Male' : 'رجل');
