import hlHTTP from 'highlight.js/lib/languages/http';
import hljs from 'highlight.js/lib/highlight';
import hlJSON from 'highlight.js/lib/languages/json';
import hlXML from 'highlight.js/lib/languages/xml';

hljs.registerLanguage('http', hlHTTP);
hljs.registerLanguage('json', hlJSON);
hljs.registerLanguage('xml', hlXML);

export function highlight(html) {
  const div = document.createElement('div');
  div.innerHTML = html;

  for (let block of [...div.querySelectorAll('pre code')]) {
    let matches = /lang-([^\s]+)/.exec(block.getAttribute('class'));
    if (matches) {
      // TODO: need to make json blocks that use ... markers proper JSON before
      // using it as the language for highlighting
      block.innerHTML = hljs.highlight(matches[1], block.textContent).value;
    }
  }

  return Promise.resolve(div.innerHTML);
}
