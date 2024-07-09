import 'https://deno.land/std@0.218.2/dotenv/load.ts';
import { createBot, startBot, Intents, ChannelTypes } from 'https://deno.land/x/discordeno@18.0.1/mod.ts';

const SEARCH_URL = 'https://minkabu.jp/news/search.json?q=';
const KV_KEY = ['MINKABU-NEWS', 'biz-alliance', 'news-no'];

type SearchResult = {
  header: {
    datetime: string;
    total_count: number;
    total_page: number;
    current_count: number;
    current_page: number;
  };
  items: {
    url: string;
    title: string;
    published_at: string;
  }[];
};

(async () => {

  const kv = await Deno.openKv();

  const bot = createBot({
    token: Deno.env.get('BOT_TOKEN')!,
    intents: Intents.Guilds | Intents.GuildMessages,
  });

  const getTextChannelIds = async (guildIds: bigint[]) => {
    const channelCollections = await Promise.all(guildIds.map((guildId) => bot.helpers.getChannels(guildId)));
    const channels = channelCollections.flatMap((collection) => [...collection.values()]);
    return channels.filter((chan) => chan.type === ChannelTypes.GuildText && chan.name === '一般').map((chan) => chan.id);
  };

  const searchNews = (...searchWords: string[]) => {
    return Promise.all(searchWords.map(async (word) => {
      try {
        const response = await fetch(SEARCH_URL + encodeURIComponent(word), {
          signal: AbortSignal.timeout(15000),
        });
        if (!response.ok)
          throw new Error(`${response.status} ${response.statusText}`);
        return await response.json() as SearchResult;
      } catch (err) {
        console.error(err);
        return null;
      }
    }));
  };

  const getMd = (d: Date) => {
    const padZero = (n: number, len: number) => ('0'.repeat(len) + n).slice(-len);
    return `${padZero(d.getMonth() + 1, 2)}/${padZero(d.getDate(), 2)}`;
  };

  const processNews = async (channelIds: bigint[]) => {
    const results = await searchNews('提携', '協業');
    if (results.every((res) => !res))
      return;
    // await kv.delete(KV_KEY);
    const lastNewsNo = (await kv.get<number>(KV_KEY)).value ?? 0;
    const items = results.filter((res): res is SearchResult => !!res).flatMap((res) => res.items);
    const newItems = items.filter((item) => {
      const matched = item.url.match(/\d+$/);
      return matched && parseInt(matched[0], 10) > lastNewsNo;
    });
    if (newItems.length < 1) {
      console.log('No new entry about business alliances');
      return;
    }
    console.log(JSON.stringify(newItems));
    const today = getMd(new Date());
    for (const item of newItems) {
      const content = `${item.title} (${item.published_at.replace('今日', today)})\nhttps://minkabu.jp${item.url}`;
      for (const channelId of channelIds)
        await bot.helpers.sendMessage(channelId, { content });
    }
    await kv.set(KV_KEY, Math.max(...items.map((item) => parseInt(item.url.match(/\d+$/)![0], 10))));
  };

  new Promise<bigint[]>((resolve) => {
    bot.events.ready = (_, payload) => {
      console.log(`Logged in as ${payload.user.username}`);
      resolve(payload.guilds);
    };
    startBot(bot);
  }).then(async (guildIds) => {
    const channelIds = await getTextChannelIds(guildIds);
    Deno.cron('Fetch news', { minute: { every: 1 } }, () => processNews(channelIds));
    // Deno.exit(0);
  }).catch((err) => {
    console.error(err);
    Deno.exit(1);
  });

})();
