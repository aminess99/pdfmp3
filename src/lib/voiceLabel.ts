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
  ziad_sy: { name: 'Ziad', region: 'Syria', forText: 'Novels, stories and ideas' },
  dana_sy: { name: 'Dana', region: 'Syria', forText: 'Contemporary novels and self-help' },
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
  khalid_msa: { name: 'Khalid', region: 'MSA', forText: 'News, reports and nonfiction' },
  huda_msa: { name: 'Huda', region: 'MSA', forText: 'Novels and educational books' },
  younes_ma: { name: 'Younes', region: 'Morocco', forText: 'Social media content and ads' },
  najat_ma: { name: 'Najat', region: 'Morocco', forText: 'Tales and children’s stories' },
  abdullah_sa: { name: 'Abdullah', region: 'Saudi', forText: 'Tutorials, courses and practical books' },
  lama_sa: { name: 'Lama', region: 'Saudi', forText: 'Marketing content and light fiction' },
  majed_hj: { name: 'Majed', region: 'Hijazi', forText: 'Stories and social content' },
  turki_hj: { name: 'Turki', region: 'Hijazi', forText: 'Tutorials and business books' },
  ghadeer_hj: { name: 'Ghadeer', region: 'Hijazi', forText: 'Novels and self-help' },
  rahaf_hj: { name: 'Rahaf', region: 'Hijazi', forText: 'Marketing and ads' },
  omar_eg: { name: 'Omar', region: 'Egypt', forText: 'YouTube and entertainment content' },
  yasmine_eg: { name: 'Yasmine', region: 'Egypt', forText: 'Educational books and tutorials' },
  saif_ae: { name: 'Saif', region: 'UAE', forText: 'Heritage and history books' },
  maitha_ae: { name: 'Maitha', region: 'UAE', forText: 'Marketing and entrepreneurship' },
  fahad_kw: { name: 'Fahad', region: 'Kuwait', forText: 'Business and motivation' },
  dalal_kw: { name: 'Dalal', region: 'Kuwait', forText: 'Novels and social stories' },
  jassim_qa: { name: 'Jassim', region: 'Qatar', forText: 'Sports and entertainment content' },
  anoud_qa: { name: 'Al-Anoud', region: 'Qatar', forText: 'Self-help and reflection' },
  ali_bh: { name: 'Ali', region: 'Bahrain', forText: 'Stories and general books' },
  hussain_bh: { name: 'Hussain', region: 'Bahrain', forText: 'Tutorials and educational books' },
  nouf_bh: { name: 'Nouf', region: 'Bahrain', forText: 'Marketing and ads' },
  zahra_bh: { name: 'Zahra', region: 'Bahrain', forText: 'Novels and reflections' },
  salem_om: { name: 'Salem', region: 'Oman', forText: 'Heritage and history books' },
  shamsa_om: { name: 'Shamsa', region: 'Oman', forText: 'Stories and parenting books' },
  basel_sy: { name: 'Basel', region: 'Syria', forText: 'Novels and stories' },
  leen_sy: { name: 'Leen', region: 'Syria', forText: 'Self-help and social content' },
  rami_lb: { name: 'Rami', region: 'Lebanon', forText: 'Entertainment and social media' },
  jad_lb: { name: 'Jad', region: 'Lebanon', forText: 'Business books and tutorials' },
  nadine_lb: { name: 'Nadine', region: 'Lebanon', forText: 'Marketing and ads' },
  maya_lb: { name: 'Maya', region: 'Lebanon', forText: 'Novels and stories' },
  ahmad_ps: { name: 'Ahmad', region: 'Palestine', forText: 'Stories and general books' },
  yazan_ps: { name: 'Yazan', region: 'Palestine', forText: 'Educational content for young people' },
  lina_ps: { name: 'Lina', region: 'Palestine', forText: 'Parenting and educational books' },
  hiba_ps: { name: 'Hiba', region: 'Palestine', forText: 'Novels and reflections' },
  firas_jo: { name: 'Firas', region: 'Jordan', forText: 'Business and motivation' },
  rana_jo: { name: 'Rana', region: 'Jordan', forText: 'Educational books and stories' },
  haider_iq: { name: 'Haider', region: 'Iraq', forText: 'History and novels' },
  zainab_iq: { name: 'Zainab', region: 'Iraq', forText: 'Stories and self-help' },
  akram_ye: { name: 'Akram', region: 'Yemen', forText: 'Heritage and history' },
  saleh_ye: { name: 'Saleh', region: 'Yemen', forText: 'Educational and social content' },
  arwa_ye: { name: 'Arwa', region: 'Yemen', forText: 'Parenting books and stories' },
  balqees_ye: { name: 'Balqees', region: 'Yemen', forText: 'Novels and literature' },
  osman_sd: { name: 'Osman', region: 'Sudan', forText: 'Stories and general books' },
  amna_sd: { name: 'Amna', region: 'Sudan', forText: 'Parenting books and stories' },
  riyad_dz: { name: 'Riyad', region: 'Algeria', forText: 'Entertainment and social media' },
  amina_dz: { name: 'Amina', region: 'Algeria', forText: 'Stories and self-help' },
  slim_tn: { name: 'Slim', region: 'Tunisia', forText: 'Entertainment and ads' },
  amira_tn: { name: 'Amira', region: 'Tunisia', forText: 'Novels and educational books' },
  mustafa_ly: { name: 'Mustafa', region: 'Libya', forText: 'History and general books' },
  anas_ly: { name: 'Anas', region: 'Libya', forText: 'Entertainment and youth content' },
  marwa_ly: { name: 'Marwa', region: 'Libya', forText: 'Parenting and educational books' },
  khadija_ly: { name: 'Khadija', region: 'Libya', forText: 'Novels and tales' },
  sidi_mr: { name: 'Sidi', region: 'Mauritania', forText: 'Literature, poetry and heritage' },
  cheikh_mr: { name: 'Cheikh', region: 'Mauritania', forText: 'Educational and religious books' },
  aicha_mr: { name: 'Aicha', region: 'Mauritania', forText: 'Stories and parenting books' },
  lalla_mr: { name: 'Lalla', region: 'Mauritania', forText: 'Novels and folk tales' },
};

const DIALECT_EN: Record<string, string> = {
  ma: 'Moroccan (Darija)',
  sa: 'Saudi',
  eg: 'Egyptian',
  ae: 'Emirati',
  msa: 'Modern Standard Arabic',
  sy: 'Syrian',
  hj: 'Hijazi',
  bh: 'Bahraini',
  lb: 'Lebanese',
  ps: 'Palestinian',
  ye: 'Yemeni',
  ly: 'Libyan',
  mr: 'Hassaniya (Mauritania)',
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
