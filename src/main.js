import '!!style!css!octicons/octicons/octicons.css';
import {a, div, span} from '@cycle/dom';
import {dropZone, instructions, saveButton} from './styles.css';
import {basename} from 'path';
import baseWrapper from '!!raw!./template.html';
import debounce from 'xstream/extra/debounce';
import delay from 'xstream/extra/delay';
import docStyle from '!!css!less!./dmtf.less';
import dropRepeats from 'xstream/extra/dropRepeats';
import dropUntil from 'xstream/extra/dropUntil';
import flattenSequentially from 'xstream/extra/flattenSequentially';
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

  const fileLoaded$ = FileReader.map(stream$ => stream$.last())
  .compose(flattenSequentially);

  const hide$ = root$.events('transitionend')
  .filter(({propertyName}) => 'opacity')
  .map(({target}) => target)
  .filter(({style: {opacity}}) => opacity === '0');

  const dragEnter$ = fromEvent(document, 'dragenter');
  const dragLeave$ = DOM.select(`.${dropZone}`)
  .events('dragleave')
  .compose(dropUntil(fileDropped$));

  const selectEntry$ = root$
  .select('.list .entry .filename')
  .events('click').map(({target}) =>
    target.getAttribute('data-entry')
  );

  const deleteEntry$ = root$
  .select('.list .entry .delete')
  .events('click').map(({target}) =>
    target.getAttribute('data-entry')
  );

  return {
    deleteEntry$,
    dragEnter$,
    dragLeave$,
    fileDropped$,
    fileLoaded$,
    hide$,
    save$,
    selectEntry$,
  };
}

function model({deleteEntry$, dragEnter$, dragLeave$, fileDropped$, fileLoaded$, hide$, save$, selectEntry$}) {
  const file$ = fileDropped$
  .map(({dataTransfer: {files}}) =>
    xs.fromArray([...files].filter(({type}) => type === 'text/markdown'))
  )
  .flatten();

  const content$ = fileLoaded$
  .compose(markdown)
  .compose(highlight)
  .compose(toc)
  .compose(baseWrap)
  .map(result => ({
    ...result,
    fileContent: template(pageWrapper)({data: result.data, contents: result.html}),
    name: `${basename(result.file.name, '.md')}.html`,
  }));

  const state$ = xs.merge(
    content$.map(item => state => state.concat(item)),
    deleteEntry$.map(idx => state => (state.splice(idx, 1), state)),
  )
  .fold((state, action) => action(state), [])
  .compose(debounce(100));

  const markdown$ = xs.merge(
    state$.map(state => state[state.length - 1]),
    state$.map(state => selectEntry$.map(idx => state[idx])).flatten(),
  )
  .compose(dropRepeats());

  const contentOpacity$ = xs.merge(
    markdown$.mapTo(0),
    markdown$.compose(delay(200)).mapTo(1),
  );

  const dropZoneOpacity$ = xs.merge(
    dragEnter$.mapTo(1),
    xs.merge(fileDropped$, fileLoaded$).compose(debounce(150)).mapTo(0),
    // Only hide the drop zone on leave if there is something to show
    state$.map(state => dragLeave$.mapTo(state.length ? 0 : 1)).flatten(),
    // When nothing is selected, show the drop zone
    markdown$.filter(x => !x).mapTo(1),
  );

  return {
    contentOpacity$,
    dropZoneOpacity$,
    file$,
    hide$,
    markdown$: markdown$.compose(delay(150)),
    save$: markdown$.filter(x => x).map(({data, fileContent, name}) =>
      save$.map(() => ({name, content: new Blob([fileContent])}))
    ).flatten(),
    state$,
  };
}

function view({contentOpacity$, dropZoneOpacity$, file$, hide$, markdown$, save$, state$}) {
  const content$ = markdown$.map(result => {
    if (!result) {
      return div('#dmtf');
    }

    return div('#dmtf', {style: {transition: 'opacity 0.2s, visibility 0.2s'}}, [
      div({
        hook: {
          insert: insertOrUpdate({html: result.html}),
          update: insertOrUpdate({html: result.html}),
        },
      }),
      a(`.${saveButton}`, [
        span('.octicon.octicon-desktop-download'),
        span({style: {'padding-left': '5px'}}, 'Download'),
      ]),
    ]);
  });

  const overlay$ = xs.of(
    div(`.${dropZone}`, {
      style: {
        opacity: '0',
        transition: 'opacity 0.6s, visibility 0.6s',
        delayed: {opacity: '1'}
      },
    }, [
      div(`.${instructions}`, ['Drop to process']),
    ]),
  );

  const fileList$ = state$.map(list =>
    div('.list', list.map(({name}, i) =>
      div('.entry', [
        span('.filename', {attrs: {'data-entry': i}}, basename(name, '.html')),
        span('.octicon.octicon-trashcan.delete', {attrs: {'data-entry': i}}),
      ])
    ))
  );

  const view$ = xs.combine(content$, overlay$, fileList$)
  .map(([content, overlay, history]) => {
    return div([content, overlay, history]);
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
