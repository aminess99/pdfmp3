import { useState } from 'react';
import { Voice } from '../types';
import { VOICES } from '../data/voices';

export function useVoices() {
  const [allVoices] = useState<Voice[]>(VOICES);
  const [loading] = useState<boolean>(false);

  return {
    allVoices,
    loading,
    refreshVoices: () => {},
  };
}
