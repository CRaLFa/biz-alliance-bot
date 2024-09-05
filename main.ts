import 'https://deno.land/std@0.218.2/dotenv/load.ts';
import { createBot, startBot, Intents, ChannelTypes } from 'https://deno.land/x/discordeno@18.0.1/mod.ts';

const KV_KEY = ['MINKABU-NEWS', 'biz-alliance', 'news-no'];

type SearchResult = {
  latestNewsNo: number;
  matchedNews: {
    no: number;
    title: string;
    published_at: string;
  }[];
};

(() => {

  if (!Deno.env.has('BOT_TOKEN')) {
    console.error("Environment variable 'BOT_TOKEN' is not set");
    Deno.exit(1);
  }

  const bot = createBot({
    token: Deno.env.get('BOT_TOKEN')!,
    intents: Intents.Guilds | Intents.GuildMessages,
  });

  const getTextChannelIds = async (guildIds: bigint[]) => {
    const channelCollections = await Promise.all(guildIds.map((guildId) => bot.helpers.getChannels(guildId)));
    const channels = channelCollections.flatMap((collection) => [...collection.values()]);
    return channels.filter((chan) => chan.type === ChannelTypes.GuildText && chan.name === '一般').map((chan) => chan.id);
  };

  const searchNews = async (lastNewsNo: number, ...searchWords: string[]) => {
    const cmd = new Deno.Command('bash', {
      args: [
        './search_news.sh',
        String(lastNewsNo),
        ...searchWords,
      ],
    });
    const { code, stdout, stderr } = await cmd.output();
    const decoder = new TextDecoder();
    if (code !== 0) {
      console.error(decoder.decode(stderr));
      return null;
    }
    return JSON.parse(decoder.decode(stdout)) as SearchResult;
  };

  const processNews = async (channelIds: bigint[]) => {
    const kv = await Deno.openKv();
    // await kv.delete(KV_KEY);
    const lastNewsNo = (await kv.get<number>(KV_KEY)).value ?? 0;
    const res = await searchNews(lastNewsNo, '提携', '協業');
    if (!res)
      return;
    await kv.set(KV_KEY, res.latestNewsNo);
    if (res.matchedNews.length < 1) {
      console.log('No new entry about business alliances');
      return;
    }
    console.log(JSON.stringify(res));
    for (const news of res.matchedNews) {
      const content = `${news.title} (${news.published_at})\nhttps://minkabu.jp/news/${news.no}`;
      for (const channelId of channelIds)
        await bot.helpers.sendMessage(channelId, { content });
    }
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
