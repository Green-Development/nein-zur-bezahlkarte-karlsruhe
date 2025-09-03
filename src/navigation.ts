import { getPermalink, getBlogPermalink, getAsset, getEventBlogPermalink } from './utils/permalinks';

export const headerData = {
  links: [
    {
      text: 'Startseite',
      href: getPermalink('/'),
    },
    {
      text: 'Mitmachen',
      links: [
        {
          text: 'Mitmachen',
          href: getPermalink('/mitmachen/'),
        },
        {
          text: 'Tauschorte',
          href: getPermalink('/tauschorte/'),
        },
        {
          text: 'Termine',
          href: getEventBlogPermalink(),
        },
      ],
    },
    {
      text: 'Informationen',
      links: [
        {
          text: 'Ressourcen',
          href: getPermalink('/ressourcen/'),
        },
        {
          text: 'FAQ',
          href: getPermalink('/faq/'),
        },
      ],
    },
    {
      text: 'Kontakt',
      href: getPermalink('/kontakt/'),
    },
    {
      text: 'Blog',
      href: getBlogPermalink()
    },
  ],
};

export const footerData = {
  secondaryLinks: [
    { text: 'Datenschutzerklärung', href: getPermalink('/privacy/') },
    { text: 'Impressum', href: getPermalink('/impressum/') },
  ],
  socialLinks: [
    {
      ariaLabel: 'Instagram',
      icon: 'tabler:brand-instagram',
      href: 'https://www.instagram.com/nein.zur.bezahlkarte.karlsruhe/',
    },
    { ariaLabel: 'RSS', icon: 'tabler:rss', href: getAsset('/rss.xml') },
  ],
};
