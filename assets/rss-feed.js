(function () {
  const FEED_URL = '/rss.xml';
  const containers = Array.from(document.querySelectorAll('[data-rss-feed]'));

  if (!containers.length) {
    return;
  }

  const htmlToPlainText = (markup) => {
    if (!markup) {
      return '';
    }
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<body>${markup}</body>`, 'text/html');
    return doc.body.textContent?.trim() ?? '';
  };

  const formatDate = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const normalizePrefix = (prefix) => {
    if (!prefix) {
      return null;
    }
    return prefix.startsWith('/') ? prefix : `/${prefix}`;
  };

  const matchesPrefix = (link, prefix) => {
    if (!prefix) {
      return true;
    }
    try {
      const url = new URL(link, window.location.origin);
      return url.pathname.startsWith(prefix);
    } catch (error) {
      console.warn('Invalid feed URL skipped', link, error);
      return false;
    }
  };

  const parseItems = (xml) => {
    const items = Array.from(xml.querySelectorAll('item'));
    return items.map((node) => ({
      title: node.querySelector('title')?.textContent?.trim() || 'Untitled entry',
      link: node.querySelector('link')?.textContent?.trim() || '#',
      pubDate: node.querySelector('pubDate')?.textContent || '',
      description: htmlToPlainText(node.querySelector('description')?.textContent),
    }));
  };

  const renderItems = (container, items) => {
    if (!items.length) {
      container.innerHTML = '<p>No matching feed entries yet.</p>';
      return;
    }
    const list = document.createElement('ol');
    list.className = 'rss-feed__list';
    items.forEach((item) => {
      const li = document.createElement('li');
      li.className = 'rss-feed__item';
      const heading = document.createElement('a');
      heading.href = item.link;
      heading.textContent = item.title;
      heading.rel = 'bookmark';
      heading.target = '_self';
      const meta = document.createElement('div');
      meta.className = 'rss-feed__meta';
      meta.textContent = formatDate(item.pubDate);
      const summary = document.createElement('p');
      summary.className = 'rss-feed__summary';
      summary.textContent = item.description;
      li.appendChild(heading);
      if (meta.textContent) {
        li.appendChild(meta);
      }
      if (item.description) {
        li.appendChild(summary);
      }
      list.appendChild(li);
    });
    container.innerHTML = '';
    container.appendChild(list);
  };

  const fetchFeed = async () => {
    const response = await fetch(FEED_URL, {
      headers: { Accept: 'application/rss+xml, application/xml' },
    });
    if (!response.ok) {
      throw new Error(`Feed request failed with status ${response.status}`);
    }
    const text = await response.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, 'application/xml');
    if (xml.querySelector('parsererror')) {
      throw new Error('Unable to parse RSS feed');
    }
    return parseItems(xml);
  };

  let feedPromise;
  const getFeedItems = () => {
    if (!feedPromise) {
      feedPromise = fetchFeed();
    }
    return feedPromise;
  };

  const init = async () => {
    let items;
    try {
      items = await getFeedItems();
    } catch (error) {
      console.error('Failed to load RSS feed', error);
      containers.forEach((container) => {
        container.innerHTML = '<p>Unable to load the RSS feed. <a href="/rss.xml">Open it directly</a> or try refreshing this page.</p>';
      });
      return;
    }

    containers.forEach((container) => {
      const prefix = normalizePrefix(container.dataset.rssPrefix || '');
      const limit = Number.parseInt(container.dataset.rssLimit || '0', 10);
      const filtered = items.filter((item) => matchesPrefix(item.link, prefix));
      const sliced = limit > 0 ? filtered.slice(0, limit) : filtered;
      renderItems(container, sliced);
    });
  };

  document.addEventListener('DOMContentLoaded', init);
})();
