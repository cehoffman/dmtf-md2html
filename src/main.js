import {a, div} from '@cycle/dom';
import {dropZone, instructions, saveButton} from './styles.css';
import {basename} from 'path';
import baseWrapper from '!!raw!./template.html';
import delay from 'xstream/extra/delay';
import docStyle from '!!css!less!./dmtf.less';
import dropUntil from 'xstream/extra/dropUntil';
import fromEvent from 'xstream/extra/fromEvent';
import {highlight as hljs} from './highlight';
import {toc as insertToC} from './toc';
import pageWrapper from '!!raw!./page.html';
import {render} from './markdown-driver';
import template from 'lodash.template';
import xs from 'xstream';

export function main(sources) {
  return view(model(intent(sources)));
}

function killEvent(evt) {
  evt.dataTransfer.dropEffect = 'copy';
  evt.stopPropagation();
  evt.preventDefault();
  return evt;
}

function insertOrUpdate({html}) {
  return function generate(node) {
    node.elm.innerHTML = html;
  };
}

function intent({DOM, FileReader}) {
  const root$ = DOM.select(':root');

  const save$ = DOM.select(`.${saveButton}`).events('click');

  const fileDropped$ = xs.merge(
    root$.events('dragover'),
    root$.events('drop'),
  ).map(killEvent).filter(({type}) => type === 'drop');

  const fileLoaded$ = FileReader.map(stream$ => stream$.last()).flatten();

  const hide$ = root$.events('transitionend')
  .filter(({propertyName}) => 'opacity')
  .map(({target}) => target)
  .filter(({style: {opacity}}) => opacity === '0');

  const dragEnter$ = fromEvent(document, 'dragenter');
  const dragLeave$ = DOM.select(`.${dropZone}`)
  .events('dragleave')
  .compose(dropUntil(fileDropped$));

  return {
    dragEnter$,
    dragLeave$,
    fileDropped$,
    fileLoaded$,
    hide$,
    save$,
  };
}

function model({dragEnter$, dragLeave$, fileDropped$, fileLoaded$, hide$, save$}) {
  const contentOpacity$ = xs.merge(
    fileLoaded$.mapTo(0),
    fileLoaded$.compose(delay(200)).mapTo(1),
  );

  const dropZoneOpacity$ = xs.merge(
    dragEnter$.mapTo(1),
    dragLeave$.mapTo(0),
    fileLoaded$.mapTo(0),
  );

  const file$ = fileDropped$.map(({dataTransfer: {files}}) => files[0]);

  const markdown$ = fileLoaded$
  .compose(markdown)
  .compose(highlight)
  .compose(toc)
  .compose(baseWrap)
  .compose(delay(150));

  save$ = save$.map(() => markdown$.compose(fileWrap).take(1)).flatten();

  return {
    contentOpacity$,
    dropZoneOpacity$,
    file$,
    hide$,
    markdown$,
    save$
  };
}

function view({contentOpacity$, dropZoneOpacity$, file$, hide$, markdown$, save$}) {
  const view$ = markdown$.map(({html}) => {
    return div('#dmtf', {style: {transition: 'opacity 0.2s, visibility 0.2s'}}, [
      div({
        hook: {
          insert: insertOrUpdate({html}),
          update: insertOrUpdate({html}),
        },
      }),
      a(`.${saveButton}`, 'Save HTML'),
    ]);
  })
  .startWith(div('#dmtf'))
  .map(rendered => {
    return div([
      rendered,
      div(`.${dropZone}`, {
        style: {
          opacity: '0',
          transition: 'opacity 0.6s, visibility 0.6s',
          delayed: {opacity: '1'}
        },
      }, [
        div(`.${instructions}`, 'Drop to process'),
      ]),
    ]);
  });

  const fadeInOut$ = xs.merge(
    contentOpacity$.map(val => ({target: '#dmtf', opacity: val})),
    dropZoneOpacity$.map(val => ({target: `.${dropZone}`, opacity: val})),
  );

  return {
    DOM: view$,
    Fader: fadeInOut$,
    FileReader: file$,
    FileWriter: save$,
    Visibility: xs.merge(
      hide$.map(target => ({target, visibility: 'hidden'})),
      fadeInOut$
      .filter(({opacity}) => opacity)
      .map(({target}) => ({target, visibility: 'visible'})),
    ),
  };
}

function markdown(stream$) {
  return stream$.map(render).flatten();
}

function highlight(stream$) {
  return stream$.map(result =>
    xs.fromPromise(hljs(result.html).then(html => ({...result, html})))
  ).flatten();
}

function toc(stream$) {
  return stream$.map(result =>
    xs.fromPromise(insertToC(result.html).then(html => ({...result, html})))
  ).flatten();
}

function baseWrap(stream$) {
  return stream$.map(result => ({
    ...result,
    html: template(baseWrapper)({
      contents: result.html,
      data: result.data,
      style: docStyle
    }),
  }));
}

function fileWrap(stream$) {
  return stream$.map(({data, html, file: {name}}) => ({
    name: `${basename(name, '.md')}.html`,
    content: new Blob([template(pageWrapper)({data, contents: html})]),
  }));
}
