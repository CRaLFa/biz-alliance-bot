import { DOMParser, Element } from 'jsr:@b-fuze/deno-dom';

type Entry = {
  time: string;
  stockCode: string;
  companyName: string;
  title: string;
  url: string;
};

type Disclosure = {
  latestItemTime: number;
  entries: Entry[];
};

const TDNET_BASE_URL = 'https://www.release.tdnet.info/inbs';

const getTime = (tr: Element) => {
  const tdTime = tr.querySelector('td.kjTime');
  return tdTime ? tdTime.textContent.trim() : '';
};

const getCode = (tr: Element) => {
  const tdCode = tr.querySelector('td.kjCode');
  return tdCode ? tdCode.textContent.trim().slice(0, 4) : '';
};

const getName = (tr: Element) => {
  const tdName = tr.querySelector('td.kjName');
  return tdName ? tdName.textContent.trim() : '';
};

const getTitleAndUrl = (tr: Element) => {
  const aTitle = tr.querySelector('td.kjTitle > a');
  return aTitle ? [aTitle.textContent.trim(), aTitle.getAttribute('href') ?? ''] : ['', ''];
};

const getNumYmd = (d: Date) => d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();

const getNumHm = (tr: Element) => parseInt(getTime(tr).replace(':', ''), 10);

const getSlashYmd = (d: Date) => {
  const strYmd = String(getNumYmd(d));
  return `${strYmd.slice(0, 4)}/${strYmd.slice(4, 6)}/${strYmd.slice(6)}`;
};

const toEntry = (tr: Element) => {
  const [title, url] = getTitleAndUrl(tr);
  const entry: Entry = {
    time: `${getSlashYmd(new Date())} ${getTime(tr)}`,
    stockCode: getCode(tr),
    companyName: getName(tr),
    title,
    url: `${TDNET_BASE_URL}/${url}`,
  };
  return entry;
};

const searchDisclosure = async (lastTime: number, searchWords: string[]): Promise<Disclosure> => {
  const lastYmd = Math.floor(lastTime / 10000), lastHm = lastTime % 10000;
  const today = getNumYmd(new Date());
  const isNewItem = (tr: Element) => lastYmd < today || lastHm < getNumHm(tr);
  const disclosure: Disclosure = {
    latestItemTime: 0,
    entries: [],
  };
  let page = 0;
  while (true) {
    page++;
    const res = await fetch(`${TDNET_BASE_URL}/I_list_${String(page).padStart(3, '0')}_${today}.html`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      return disclosure;
    }
    const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
    const rows = Array.from(doc.querySelectorAll('#main-list-table tr'));
    if (rows.length < 1) {
      return disclosure;
    }
    if (page === 1) {
      disclosure.latestItemTime = today * 10000 + getNumHm(rows[0]);
    }
    const matchedEntries = rows.filter((row) => {
      if (!isNewItem(row)) {
        return false;
      }
      const title = getTitleAndUrl(row)[0];
      return searchWords.some((word) => title.includes(word));
    }).map(toEntry);
    disclosure.entries.push(...matchedEntries);
    if (!isNewItem(rows.at(-1)!)) {
      return disclosure;
    }
  }
};

export { searchDisclosure };
