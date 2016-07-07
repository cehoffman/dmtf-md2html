import hlHTTP from 'highlight.js/lib/languages/http';
import hljs from 'highlight.js/lib/highlight';
import hlJSON from 'highlight.js/lib/languages/json';
import hljsStyle from '!!css!highlight.js/styles/github.css';
import hlXML from 'highlight.js/lib/languages/xml';
import {PROCESSORS} from './hljs.utils';

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
      let code = block.textContent;
      let lang = matches[1];
      let {pre, post} = PROCESSORS[lang] || PROCESSORS.undefined;

      block.innerHTML = post(hljs.highlight(lang, pre(code)).value, code);
    }
  }

  return Promise.resolve(`<style scoped>${hljsStyle}</style>${div.innerHTML}`);
}
