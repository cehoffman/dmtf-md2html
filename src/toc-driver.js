export function parse(html, tagSelector) {
  const div = document.createElement('div');
  div.innerHTML = html;

  return {
    root: div,
    tags: [...div.querySelectorAll(tagSelector)].map(tag => ({
      type: tag.tagName.toLowerCase(),
      text: tag.textContent,
      id: tag.id,
      tag,
    })),
  };
}

export function modifyHeader({tag}, txt) {
  tag.removeChild(tag.firstChild);
  tag.insertBefore(document.createTextNode(txt), tag.firstChild);
}

export function serialize({root}) {
  return root.innerHTML;
}
