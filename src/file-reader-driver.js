import xs from 'xstream';

export function makeFileReaderDriver() {
  return function fileReaderDriver(request$, streamAdapter) {
    const response$$ = request$.map(readFile).remember();
    response$$.addListener({next: () => {}, error: () => {}, complete: () => {}});
    return response$$;
  };
}

function readFile(file) {
  const response$ = createReader(file).remember();
  response$.addListener({next: () => {}, error: () => {}, complete: () => {}});
  return response$;
}

function createReader(file) {
  return xs.create({
    start: function startFileReaderStream(listener) {
      this.reader = new FileReader();
      this.reader.onprogress = evt => listener.next(evt);
      this.reader.onload = () => {
        listener.next(this.reader.result);
        listener.complete();
      };
      this.reader.readAsText(file);
    },
    stop: function stopFileReaderStream() {
      this.reader.abort();
    }
  });
}
