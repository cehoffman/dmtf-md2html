import {modifyHeader, parse, serialize} from './toc-driver';

export function toc(html) {
  const levels = [];
  const levelMap = ['h2', 'h3', 'h4', 'h5', 'h6'];
  // eslint-disable-next-line no-sequences, no-return-assign
  const counter = levelMap.reduce((acc, tag) => (acc[tag] = 0, acc), {});
  let currentLevel = 0;

  const context = parse(html, levelMap.join(','));
  let root = [];

  for (let tag of context.tags) {
    let level = levelMap.indexOf(tag.type);
    let num = [];

    if (level > currentLevel) {
      levels.push(root);
      root.push(root = []);
    }

    while (level < currentLevel) {
      counter[levelMap[currentLevel--]] = 0;
      let newRoot = levels.pop();
      if (newRoot) {
        root = newRoot;
      }
    }

    counter[tag.type]++;
    for (let _ of levelMap) {
      num.push(`${counter[_]}.`);
      if (_ === tag.type) { break; }
    }

    let txt = tag.text;
    if (!/^(\d+\.)+/.test(txt)) {
      txt = `${num.join('')} ${txt}`;
    }
    root.push({tag, txt});
    currentLevel = level;
  }

  return Promise.resolve(
    `<ul id="toc">${generate(levels[0] || root)}</ul>${serialize(context)}`
  );
}

function generate(items) {
  return items.map(item => {
    if (Array.isArray(item)) {
      return `<ul>${generate(item)}</ul>`;
    } else {
      modifyHeader(item.tag, item.txt);
      return `<li><a href="#${item.tag.id}">${item.txt}</a></li>`;
    }
  }).join('');
}
