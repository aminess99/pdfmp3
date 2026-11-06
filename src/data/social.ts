// The site's social accounts: footer links and Organization.sameAs (index.html)
export interface SocialLink {
  id: 'youtube' | 'facebook' | 'tiktok' | 'instagram';
  name: string;
  url: string;
}

export const SOCIAL_LINKS: SocialLink[] = [
  { id: 'youtube', name: 'YouTube', url: 'https://www.youtube.com/channel/UCwnMGNv6iTWbigD0lBsU3MA' },
  { id: 'tiktok', name: 'TikTok', url: 'https://www.tiktok.com/@hakawatiai0' },
  { id: 'instagram', name: 'Instagram', url: 'https://www.instagram.com/hakawatiai1/' },
  { id: 'facebook', name: 'Facebook', url: 'https://www.facebook.com/people/Hakawati-AI/61595787586715/' },
];
