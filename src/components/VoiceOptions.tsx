import React from 'react';
import { DIALECTS } from '../data/voices';
import { Voice } from '../types';
import { dialectLabel, voiceLabel } from '../lib/voiceLabel';

// Voices grouped by dialect (in DIALECTS order), for long lists with 80+ voices
export const groupVoicesByDialect = (voices: Voice[]) =>
  DIALECTS.map((d) => ({ dialect: d, voices: voices.filter((v) => v.dialectId === d.id) })).filter((g) => g.voices.length > 0);

// <option>s for a <select>, one <optgroup> per dialect
export const VoiceOptionGroups: React.FC<{ voices: Voice[]; optionClassName?: string }> = ({ voices, optionClassName }) => (
  <>
    {groupVoicesByDialect(voices).map(({ dialect, voices: list }) => (
      <optgroup key={dialect.id} label={`${dialect.flag} ${dialectLabel(dialect)}`}>
        {list.map((v) => (
          <option key={v.id} value={v.id} className={optionClassName}>
            {voiceLabel(v)}
          </option>
        ))}
      </optgroup>
    ))}
  </>
);
