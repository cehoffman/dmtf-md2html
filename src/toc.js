export function createToC(content) {
  const toc = [];
  const levelMap = ['H2', 'H3', 'H4', 'H5', 'H6'];
  // eslint-disable-next-line no-sequences, no-return-assign
  const counter = levelMap.reduce((acc, tag) => (acc[tag] = 0, acc), {});
  const tags = [...content.querySelectorAll(levelMap.join(','))];
  let ul = document.createElement('ul');
  let currentLevel = 0;

  for (let tag of tags) {
    let tagName = tag.tagName.toUpperCase();
    let level = levelMap.indexOf(tagName);
    let num = [];

    if (level > currentLevel) {
      toc.push(ul);
      ul.appendChild(ul = document.createElement('ul'));
    }

    while (level < currentLevel) {
      counter[levelMap[currentLevel--]] = 0;
      ul = toc.pop();
    }

    counter[levelMap[level]]++;
    for (let _ of levelMap) {
      num.push(`${counter[_]}.`);
      if (_ === tagName) { break; }
    }

    let txt = `${tag.firstChild.textContent}`;
    if (!tag.hasAttribute('toc-processed')) {
      txt = `${num.join('')} ${txt}`;
      tag.setAttribute('toc-processed', '');
    }
    ul.appendChild(createToCItem(`#${tag.id}`, txt));
    tag.removeChild(tag.firstChild);
    tag.insertBefore(document.createTextNode(txt), tag.firstChild);
    currentLevel = level;
  }

  return toc[0] || ul;
}

function createToCItem(href, txt) {
  const li = document.createElement('li');
  const anchor = document.createElement('a');

  anchor.href = href;
  anchor.textContent = txt;

  li.appendChild(anchor);
  return li;
}
