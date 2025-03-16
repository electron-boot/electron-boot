import Checkpointer from 'pouchdb-checkpointer';
import genReplicationId from 'pouchdb-generate-replication-id';

export interface ParsedDumpResult {
  err?: Error;
  docs?: Document[];
  lastSeq?: number;
}

function parseDump(data: string): ParsedDumpResult {
  const docs: Document[] = [];
  let lastSeq = 0;
  try {
    data.split('\n').forEach((line) => {
      if (!line) {
        return;
      }
      const parsedLine = JSON.parse(line);
      if (parsedLine.docs) {
        docs.push(...parsedLine.docs);
      }
      if (parsedLine.seq) {
        lastSeq = parsedLine.seq;
      }
    });
  } catch (err) {
    return { err: err as Error };
  }
  return { docs, lastSeq };
}

export interface LoadStringOptions {
  proxy?: string;
  filter?: string;
  query_params?: Record<string, any>;
  view?: string;
}

export function loadString(db: any, data: string, opts: LoadStringOptions, callback: (err?: Error) => void): void {
  const parsedDump = parseDump(data);
  if (parsedDump.err) {
    return callback(parsedDump.err);
  }
  const docs = parsedDump.docs!;
  const lastSeq = parsedDump.lastSeq!;

  function writeProxyCheckpoint(): Promise<void> {
    return db.info().then((info) => {
      const src = new db.constructor(opts.proxy!,
        Object.assign({}, {}, opts));
      const target = new db.constructor(info.db_name,
        Object.assign({}, db.__opts, opts));
      const replIdOpts: Record<string, any> = {};
      if (opts.filter) {
        replIdOpts.filter = opts.filter;
      }
      if (opts.query_params) {
        replIdOpts.query_params = opts.query_params;
      }
      if (opts.view) {
        replIdOpts.view = opts.view;
      }

      return genReplicationId(src, target, replIdOpts).then((replId) => {
        const state = {
          cancelled: false
        };
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        const checkpointer = new Checkpointer(src, target, replId, state);
        return checkpointer.writeCheckpoint(lastSeq);
      });
    });
  }

  db.bulkDocs({ docs, new_edits: false }).then(() => {
    if (!opts.proxy) {
      return;
    }
    return writeProxyCheckpoint();
  }).then(() => {
    callback();
  }, callback);
}
