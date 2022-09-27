// You will need to supply an image, for MB hosted blogs I
// recommend uploading  to the image gallery and then pasting
// the link in here
const ANON_AVATAR = '/imgs/noise.jpg';

// fetchWebmentions retireves the actual messages for the URL
// passed in. First we check to see if we're on a page that
// has a comment `div` and then if no URL is passed in we'll
// put one together from the current page and fetch webmentions.
function fetchWebmentions(url, aliases) {
  if (!document.getElementById('comments')) {
    return;
  }
  if (!url) {
    url = document.location.origin + document.location.pathname;
  }
  const targets = getUrlPermutations(url, aliases);

  let script = document.createElement('script');
  let src =
    'https://webmention.io/api/mentions?perPage=500&jsonp=parseWebmentions';
  targets.forEach(function(targetUrl) {
    src += `&target[]=${encodeURIComponent(targetUrl)}`;
  });
  src += `&_=${Math.random()}`;
  script.src = src;
  script.async = true;
  document.getElementsByTagName('head')[0].appendChild(script);
}

// getUrlPermutations builds up a list of potential URLs to
// check for mentions on. You will need to update the URLs
// to point to your own MB instance. The `localhost:1313` one
// can probably be removed unless your going to be testing
// the theme locally with Hugo.
function getUrlPermutations(url, aliases) {
  const urls = [];
  url = url.replace('http://localhost:1313', 'https://shindakun.net/');
  urls.push(url);
  urls.push(url.replace('https://', 'http://'));
  if (url.substr(-1) === '/') {
    let noslash = url.substr(0, url.length - 1);
    urls.push(noslash);
    urls.push(noslash.replace('https://', 'http://'));
  }
  if (aliases) {
    aliases.forEach(function(alias) {
      urls.push(`https://shindakun.net/${alias}`);
    });
  }
  return urls;
}

function parseWebmentions(data) {
  let links = data.links.sort(wmSort);
  let likes = [];
  let reposts = [];
  let replies = [];
  links.map(function(l) {
    if (!l.activity || !l.activity.type) {
      console.warning('unknown link type', l);
      return;
    }
    if (!l.verified) {
      return;
    }
    switch (l.activity.type) {
      case 'like':
        likes.push(l);
        break;
      case 'repost':
      case 'link':
        reposts.push(l);
        break;
      default:
        replies.push(l);
        break;
    }
  });
  renderLikes(likes);
  renderReposts(reposts);
  renderReplies(replies);
  showInteractions();
}
window.parseWebmentions = parseWebmentions;

function wmSort(a, b) {
  const dateA = getWmDate(a);
  const dateB = getWmDate(b);
  if (dateA < dateB) {
    return -1;
  } else if (dateB < dateA) {
    return 1;
  }
  return 0;
}

function getWmDate(webmention) {
  if (webmention.data.published) {
    return new Date(webmention.data.published);
  }
  return new Date(webmention.verified_date);
}

let months = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function renderLikes(likes) {
  let t = document.getElementById('like-template').content;
  let list = document.getElementById('likes');
  likes.map(function(l) {
    console.log(l)
    fillTemplate(t, {
      photo: l.data.author.photo || ANON_AVATAR,
      name: l.data.author.name,
      authorUrl: l.data.author.url,
      url: l.data.url,
      sentence: l.activity.sentence_html,
      date: new Date(l.data.published || l.verified_date),
    });
    var clone = document.importNode(t, true);
    list.appendChild(clone);
  });
}

function getHostName(url) {
  let a = document.createElement('a');
  a.href = url;
  return (a.hostname || '').replace('www.', '');
}

function renderReposts(reposts) {
  let t = document.getElementById('like-template').content;
  let list = document.getElementById('shares');
  reposts.map(function(l) {
    let data;
    if (l.data.author) {
      data = {
        photo: l.data.author.photo || ANON_AVATAR,
        name: l.data.author.name,
        authorUrl: l.data.author.url,
        url: l.data.url,
        date: new Date(l.data.published || l.verified_date),
        content: l.activity.sentence_html,
      };
    } else {
      data = {
        photo: ANON_AVATAR,
        name: getHostName(l.data.url) || 'inbound link',
        authorUrl: l.data.url,
        url: l.data.url,
        date: new Date(l.data.published || l.verified_date),
        content: l.activity.sentence_html,
      };
    }
    fillTemplate(t, data);
    let clone = document.importNode(t, true);
    list.appendChild(clone);
  });
}

function renderReplies(replies) {
  let t = document.getElementById('reply-template').content;
  let list = document.getElementById('replies');
  replies.map(function(l) {
    let data;
    if (l.data.author) {
      data = {
        photo: l.data.author.photo || ANON_AVATAR,
        name: l.data.author.name,
        authorUrl: l.data.author.url,
        url: l.data.url,
        date: new Date(l.data.published || l.verified_date),
        content: l.data.content,
      };
    } else {
      data = {
        photo: ANON_AVATAR,
        name: getHostName(l.data.url) || 'inbound link',
        authorUrl: l.data.url,
        url: l.data.url,
        date: new Date(l.data.published || l.verified_date),
        content: l.data.content,
      };
    }

    fillTemplate(t, data);
    let clone = document.importNode(t, true);
    list.appendChild(clone);
  });
}

// fillTemplate marries a single webmention to the
// template. The completed template is used in the
// render functions to actually display on the page.
function fillTemplate(template, vals) {
  template.querySelector('.js-avatar').src = vals.photo;
  template.querySelector('.js-author').href = vals.authorUrl;
  template.querySelector('.js-author-name').innerHTML = vals.name;
  template.querySelector('.js-author-name').href = vals.authorUrl;
  template.querySelector('.js-source').href = vals.url;
  if (vals.sentence) {
    template.querySelector('.js-sentence').innerHTML = vals.sentence;
  }
  const date = template.querySelector('.js-date');
  if (date) {
    date.innerHTML = formatDate(vals.date);
  }
  if (vals.content) {
    template.querySelector('.js-content').innerHTML = vals.content;
  }
}

// formatDate formats the date.
function formatDate(date) {
  if (!date) {
    return '';
  }
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

// This is leftover from the original implmentation,
// commented out since I don't use it in my version.
// Maybe I should just remove it for clarity sake.
// ¯\_(ツ)_/¯
function showInteractions() {
 // document.getElementById('comments-loader').classList.add('is-hidden');
 // document.getElementById('comments').classList.remove('is-hidden');
}