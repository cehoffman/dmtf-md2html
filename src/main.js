import '!!style!raw!highlight.js/styles/github.css';
import '!!style!raw!less!./dmtf.css';
// import {a, div, h1, h2, p, strong} from '@cycle/dom';
import {basename} from 'path';
import {createToC} from './toc';
import {div} from '@cycle/dom';
import {dropZone} from './styles.css';
import hljs from 'highlight.js';
import {render} from './markdown-driver';
import {saveAs} from 'filesaver.js';
import template from 'lodash.template';
import wrapper from 'raw!./template.html';
import xs from 'xstream';

export function main({DOM, FileReader, MarkdownRenderer}) {
  const root$ = DOM.select(':root');
  const drops$ = xs.merge(
    root$.events('dragenter'),
    root$.events('dragover'),
    root$.events('drop'),
  ).map(killEvent).filter(({type}) => type === 'drop');
  const file$ = drops$.map(({dataTransfer: {files}}) => files[0]);
  const display$ = xs.combine(
    FileReader.map(stream$ => stream$.last().map(render).flatten()).flatten(),
    file$,
  ).map(([{data, html}, {name}]) => {
    const wrapped = template(wrapper)({contents: html, data});
    return div({
      hook: {
        insert: insertOrUpdate(wrapped, name),
        update: insertOrUpdate(wrapped, name),
      },
    });
  });

  return {
    DOM: display$.startWith(div(`.${dropZone}`, 'Drop Markdown file here')),
    FileReader: file$,
    // Log: xs.merge(
      // dragEvents$.map(killEvent).map(evt => `Killed ${evt.type}`),
      // drops$.map(evt => evt.dataTransfer.files),
      // FileReader.flatten(),
    // ),
    // MarkdownRenderer: FileReader.flatten(),
    // DOM: xs.of('<div>Blah2</div>')
  };
}

function killEvent(evt) {
  evt.stopPropagation();
  evt.preventDefault();
  return evt;
}

function insertOrUpdate(html, name) {
  return function generate(node) {
    node.elm.innerHTML = html;
    let toc = node.elm.querySelector('#toc');
    let body = node.elm.querySelector('#wrapper');
    toc.innerHTML = '';
    createToC(toc, body);

    for (let block of [...body.querySelectorAll('pre code')]) {
      if (/lang-/.test(block.getAttribute('class'))) {
        hljs.highlightBlock(block);
      }
    }

    let blob = new Blob([document.firstElementChild.outerHTML]);
    saveAs(blob, `${basename(name, '.md')}.html`);
  };
}
