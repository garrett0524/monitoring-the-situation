import RSSParser from 'rss-parser';

const parser = new RSSParser();

const RSS_FEEDS = [
  { name: 'BBC', url: 'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml' },
  { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
  { name: 'The Guardian', url: 'https://www.theguardian.com/world/middleeast/rss' },
  { name: 'NPR World', url: 'https://feeds.npr.org/1004/rss.xml' },
];

const KEYWORDS = ['iran', 'us military', 'persian gulf', 'strait of hormuz', 'centcom', 'irgc', 'middle east', 'tehran', 'sanctions'];

export interface RSSItem {
  title: string;
  source: string;
  url: string;
  excerpt: string;
  publishedAt: string;
  sourceType: 'rss';
}

function isRelevant(title: string, content: string): boolean {
  const text = (title + ' ' + content).toLowerCase();
  return KEYWORDS.some(kw => text.includes(kw));
}

export async function fetchRSSFeeds(): Promise<RSSItem[]> {
  const results: RSSItem[] = [];

  await Promise.allSettled(
    RSS_FEEDS.map(async feed => {
      try {
        const parsed = await parser.parseURL(feed.url);
        for (const item of parsed.items ?? []) {
          if (!item.title) continue;
          if (!isRelevant(item.title, item.contentSnippet ?? item.content ?? '')) continue;
          results.push({
            title: item.title,
            source: feed.name,
            url: item.link ?? '',
            excerpt: item.contentSnippet ?? item.content?.slice(0, 300) ?? '',
            publishedAt: item.isoDate ?? item.pubDate ?? new Date().toISOString(),
            sourceType: 'rss',
          });
        }
      } catch (err: any) {
        console.warn(`[rss] ${feed.name} unavailable: ${err?.message ?? err}`);
      }
    })
  );

  return results;
}
