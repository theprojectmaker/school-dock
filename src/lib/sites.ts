// The starter list of sites Ray may open, picked for a New York public high
// school (Great Neck North): research databases, Regents and AP prep, math
// and science tools, writing help, and news. The admin can add or remove any.
export type SiteGroup = { name: string; sites: { domain: string; label: string }[] };

export const SITE_GROUPS: SiteGroup[] = [
  {
    name: 'Great Neck', sites: [
      { domain: 'greatneck.k12.ny.us', label: 'Great Neck Public Schools' },
      { domain: 'greatnecklibrary.org', label: 'Great Neck Library' },
    ],
  },
  {
    name: 'Research', sites: [
      { domain: 'wikipedia.org', label: 'Wikipedia' },
      { domain: 'britannica.com', label: 'Britannica' },
      { domain: 'jstor.org', label: 'JSTOR' },
      { domain: 'gale.com', label: 'Gale' },
      { domain: 'ebsco.com', label: 'EBSCO' },
      { domain: 'ebscohost.com', label: 'EBSCOhost' },
      { domain: 'proquest.com', label: 'ProQuest' },
      { domain: 'scholar.google.com', label: 'Google Scholar' },
      { domain: 'loc.gov', label: 'Library of Congress' },
      { domain: 'archives.gov', label: 'National Archives' },
      { domain: 'si.edu', label: 'Smithsonian' },
      { domain: 'gutenberg.org', label: 'Project Gutenberg' },
      { domain: 'pewresearch.org', label: 'Pew Research' },
    ],
  },
  {
    name: 'Regents, AP & College', sites: [
      { domain: 'nysedregents.org', label: 'NYSED Regents exams' },
      { domain: 'nysed.gov', label: 'NY State Education Dept.' },
      { domain: 'jmap.org', label: 'JMAP (Regents math)' },
      { domain: 'collegeboard.org', label: 'College Board / AP' },
      { domain: 'khanacademy.org', label: 'Khan Academy' },
      { domain: 'act.org', label: 'ACT' },
      { domain: 'commonapp.org', label: 'Common App' },
    ],
  },
  {
    name: 'Math & Science', sites: [
      { domain: 'desmos.com', label: 'Desmos' },
      { domain: 'geogebra.org', label: 'GeoGebra' },
      { domain: 'wolframalpha.com', label: 'Wolfram|Alpha' },
      { domain: 'libretexts.org', label: 'LibreTexts' },
      { domain: 'openstax.org', label: 'OpenStax textbooks' },
      { domain: 'ck12.org', label: 'CK-12' },
      { domain: 'physicsclassroom.com', label: 'The Physics Classroom' },
      { domain: 'phet.colorado.edu', label: 'PhET simulations' },
      { domain: 'nasa.gov', label: 'NASA' },
      { domain: 'noaa.gov', label: 'NOAA' },
      { domain: 'nih.gov', label: 'NIH' },
      { domain: 'usgs.gov', label: 'USGS' },
    ],
  },
  {
    name: 'Writing & Literature', sites: [
      { domain: 'owl.purdue.edu', label: 'Purdue OWL' },
      { domain: 'merriam-webster.com', label: 'Merriam-Webster' },
      { domain: 'poetryfoundation.org', label: 'Poetry Foundation' },
      { domain: 'folger.edu', label: 'Folger Shakespeare' },
      { domain: 'litcharts.com', label: 'LitCharts' },
      { domain: 'sparknotes.com', label: 'SparkNotes' },
      { domain: 'commonlit.org', label: 'CommonLit' },
      { domain: 'newsela.com', label: 'Newsela' },
    ],
  },
  {
    name: 'News & History', sites: [
      { domain: 'apnews.com', label: 'AP News' },
      { domain: 'reuters.com', label: 'Reuters' },
      { domain: 'npr.org', label: 'NPR' },
      { domain: 'pbs.org', label: 'PBS' },
      { domain: 'bbc.co.uk', label: 'BBC' },
      { domain: 'history.com', label: 'History.com' },
      { domain: 'worldhistory.org', label: 'World History Encyclopedia' },
      { domain: 'nationalgeographic.com', label: 'National Geographic' },
      { domain: 'smithsonianmag.com', label: 'Smithsonian Magazine' },
    ],
  },
];

export const DEFAULT_SITES = SITE_GROUPS.flatMap((g) => g.sites.map((s) => s.domain));

/** The site list grouped for display; sites the admin added go under "Added by your school". */
export function groupSites(sites: string[]): SiteGroup[] {
  const left = new Set(sites);
  const out: SiteGroup[] = [];
  for (const g of SITE_GROUPS) {
    const keep = g.sites.filter((s) => left.has(s.domain));
    keep.forEach((s) => left.delete(s.domain));
    if (keep.length) out.push({ name: g.name, sites: keep });
  }
  if (left.size) out.push({ name: 'Added by your school', sites: [...left].sort().map((d) => ({ domain: d, label: d })) });
  return out;
}
