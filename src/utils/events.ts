import { formatInTimeZone } from 'date-fns-tz'
import type { PaginateFunction } from 'astro';
import { getCollection, render } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import type {Event, Taxonomy} from '~/types';
import { APP_EVENT_BLOG } from 'astrowind:config';
import {
  cleanSlug,
  trimSlash,
  EVENT_BLOG_BASE,
  EVENT_PERMALINK_PATTERN,
  EVENT_CATEGORY_BASE,
  EVENT_TAG_BASE,
} from './permalinks';
import { getFormattedDate, notionMultiSelectToStrings, notionTextToString} from "~/utils/utils.ts";

const generateEventPermalink = async ({
  id,
  slug,
  publishDate,
  category,
}: {
  id: string;
  slug: string;
  publishDate: Date;
  category: string | undefined;
}) => {
  const year = String(publishDate.getFullYear()).padStart(4, '0');
  const month = String(publishDate.getMonth() + 1).padStart(2, '0');
  const day = String(publishDate.getDate()).padStart(2, '0');
  const hour = String(publishDate.getHours()).padStart(2, '0');
  const minute = String(publishDate.getMinutes()).padStart(2, '0');
  const second = String(publishDate.getSeconds()).padStart(2, '0');

  const permalink = EVENT_PERMALINK_PATTERN.replace('%slug%', slug)
    .replace('%id%', id)
    .replace('%category%', category || '')
    .replace('%year%', year)
    .replace('%month%', month)
    .replace('%day%', day)
    .replace('%hour%', hour)
    .replace('%minute%', minute)
    .replace('%second%', second);

  return permalink
    .split('/')
    .map((el) => trimSlash(el))
    .filter((el) => !!el)
    .join('/');
};

const getNormalizedEvent = async (event: CollectionEntry<'events'>): Promise<Event> => {
  const { id, data } = event;
  const { Content, remarkPluginFrontmatter } = await render(event);
  const {
    publishDate: rawPublishDate,
    updateDate: rawUpdateDate,
    date: rawDate,
    excerpt: rawExcerpt,
    image: rawImage,
    imageDescription: rawImageDescription,
    tags: rawMultiSelectTags,
    category: rawMultiSelectCategory,
    author: rawAuthor,
  } = data.properties;

  const title = notionTextToString(data.properties.Name.title);
  const date = new Date(rawDate.date?.start ?? new Date())
  const time = formatInTimeZone(date, 'Europe/Berlin', 'HH:mm') + ' Uhr'
  const location = notionTextToString(data.properties.location.rich_text);
  const image = rawImage?.files?.[0]?.type === 'file' ? rawImage.files[0].file.url : '~/assets/images/logo.webp';
  const alt = rawImage?.files?.[0]?.type === 'file' ? notionTextToString(rawImageDescription?.rich_text ?? []): 'Grünes Logo mit einer durchgestrichenen Illustration einer Bezahlkarte. Der umlaufende Text in Großbuchstaben lautet: "KARLSRUHE SAGT NEIN ZUR BEZAHLKARTE".';
  const author = notionTextToString(rawAuthor.rich_text);
  const rawCategory = notionMultiSelectToStrings(rawMultiSelectCategory?.multi_select)[0];
  const rawTags = notionMultiSelectToStrings(rawMultiSelectTags?.multi_select);
  const slug = cleanSlug(id); // cleanSlug(rawSlug.split('/').pop());
  const publishDate = new Date(rawPublishDate?.date?.start ?? new Date());
  const updateDate = rawUpdateDate ? new Date(rawUpdateDate?.date?.start ?? new Date()) : undefined;
  const category = rawCategory
    ? {
        slug: cleanSlug(rawCategory),
        title: rawCategory,
      }
    : undefined;
  const tags = rawTags.map((tag: string) => ({
    slug: cleanSlug(tag),
    title: tag,
  }));
  const permalink = await generateEventPermalink({ id, slug, publishDate, category: category?.slug })
  const excerpt = notionTextToString(rawExcerpt.rich_text) !== "" 
    ? notionTextToString(rawExcerpt.rich_text) 
    : `${getFormattedDate(date)} um ${time}, ${location}`
  const metadata = { title, description: excerpt };

  return {
    id,
    slug,
    permalink,
    date,
    time,
    publishDate,
    updateDate,

    title,
    excerpt,
    location,
    image,
    alt,
    category,
    tags,
    author,

    draft: false,
    metadata,

    Content,
    readingTime: remarkPluginFrontmatter?.readingTime,
  };
};


const loadEvents = async function (): Promise<Array<Event>> {
  const events = await getCollection('events');
  const normalizedEvents = events.map(async (event) => await getNormalizedEvent(event));

  const results = (await Promise.all(normalizedEvents))
    .sort((a, b) => b.date.valueOf() - a.date.valueOf())
    .filter((event) => !event.draft);

  return results;
};

let _events: Array<Event>;

/** */
export const isBlogEnabled = APP_EVENT_BLOG.isEnabled;
export const isRelatedPostsEnabled = APP_EVENT_BLOG.isRelatedPostsEnabled;
export const isBlogListRouteEnabled = APP_EVENT_BLOG.list.isEnabled;
export const isBlogPostRouteEnabled = APP_EVENT_BLOG.event.isEnabled;
export const isBlogCategoryRouteEnabled = APP_EVENT_BLOG.category.isEnabled;
export const isBlogTagRouteEnabled = APP_EVENT_BLOG.tag.isEnabled;

export const blogListRobots = APP_EVENT_BLOG.list.robots;
export const blogPostRobots = APP_EVENT_BLOG.event.robots;
export const blogCategoryRobots = APP_EVENT_BLOG.category.robots;
export const blogTagRobots = APP_EVENT_BLOG.tag.robots;

export const blogPostsPerPage = APP_EVENT_BLOG?.postsPerPage;

/** */
export const fetchEvents = async (): Promise<Array<Event>> => {
  if (!_events) {
    _events = await loadEvents();
  }

  return _events;
};

/** */
export const findEventsBySlugs = async (slugs: Array<string>): Promise<Array<Event>> => {
  if (!Array.isArray(slugs)) return [];

  const events = await fetchEvents();

  return slugs.reduce(function (r: Array<Event>, slug: string) {
    events.some(function (event: Event) {
      return slug === event.slug && r.push(event);
    });
    return r;
  }, []);
};

/** */
export const findEventsByIds = async (ids: Array<string>): Promise<Array<Event>> => {
  if (!Array.isArray(ids)) return [];

  const events = await fetchEvents();

  return ids.reduce(function (r: Array<Event>, id: string) {
    events.some(function (event: Event) {
      return id === event.id && r.push(event);
    });
    return r;
  }, []);
};

/** */
export const findLatestEvents = async ({ count }: { count?: number }): Promise<Array<Event>> => {
  const _count = count || 4;
  const events = await fetchEvents();

  return events ? events.slice(0, _count) : [];
};


/** */
export const getStaticPathsEventBlogList = async ({ paginate }: { paginate: PaginateFunction }) => {
  if (!isBlogEnabled || !isBlogListRouteEnabled) return [];
  return paginate(await fetchEvents(), {
    params: { termine: EVENT_BLOG_BASE || undefined },
    pageSize: blogPostsPerPage,
  });
};


/** */
export const getStaticPathsEventBlogPost = async () => {
  if (!isBlogEnabled || !isBlogPostRouteEnabled) return [];
  return (await fetchEvents()).flatMap((event) => ({
    params: {
      termine: event.permalink,
    },
    props: { event },
  }));
};

/** */
export const getStaticPathsEventBlogCategory = async ({ paginate }: { paginate: PaginateFunction }) => {
  if (!isBlogEnabled || !isBlogCategoryRouteEnabled) return [];

  const events = await fetchEvents();
  const categories: Record<string, Taxonomy> = {};
  events.map((event) => {
    if (event.category?.slug) {
      categories[event.category?.slug] = event.category;
    }
  });

  return Array.from(Object.keys(categories)).flatMap((categorySlug) =>
    paginate(
      events.filter((event) => event.category?.slug && categorySlug === event.category?.slug),
      {
        params: { category: categorySlug, termine: EVENT_CATEGORY_BASE || undefined },
        pageSize: blogPostsPerPage,
        props: { category: categories[categorySlug] },
      }
    )
  );
};

/** */
export const getStaticPathsEventBlogTag = async ({ paginate }: { paginate: PaginateFunction }) => {
  if (!isBlogEnabled || !isBlogTagRouteEnabled) return [];

  const events = await fetchEvents();
  const tags: Record<string, Taxonomy> = {};
  events.map((event) => {
    if (Array.isArray(event.tags)) {
      event.tags.map((tag) => {
        tags[tag?.slug] = tag;
      });
    }
  });

  return Array.from(Object.keys(tags)).flatMap((tagSlug) =>
    paginate(
      events.filter((event) => Array.isArray(event.tags) && event.tags.find((elem) => elem.slug === tagSlug)),
      {
        params: { tag: tagSlug, termine: EVENT_TAG_BASE || undefined },
        pageSize: blogPostsPerPage,
        props: { tag: tags[tagSlug] },
      }
    )
  );
};

/** */
export async function getRelatedEvents(originalEvent: Event, maxResults: number = 4): Promise<Event[]> {
  const allEvents = await fetchEvents();
  const originalTagsSet = new Set(originalEvent.tags ? originalEvent.tags.map((tag) => tag.slug) : []);

  const eventsWithScores = allEvents.reduce((acc: { event: Event; score: number }[], iteratedEvent: Event) => {
    if (iteratedEvent.slug === originalEvent.slug) return acc;

    let score = 0;
    if (iteratedEvent.category && originalEvent.category && iteratedEvent.category.slug === originalEvent.category.slug) {
      score += 5;
    }

    if (iteratedEvent.tags) {
      iteratedEvent.tags.forEach((tag) => {
        if (originalTagsSet.has(tag.slug)) {
          score += 1;
        }
      });
    }

    acc.push({ event: iteratedEvent, score });
    return acc;
  }, []);

  eventsWithScores.sort((a, b) => b.score - a.score);

  const selectedEvents: Event[] = [];
  let i = 0;
  while (selectedEvents.length < maxResults && i < eventsWithScores.length) {
    selectedEvents.push(eventsWithScores[i].event);
    i++;
  }

  return selectedEvents;
}
