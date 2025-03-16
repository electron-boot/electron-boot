/// <reference types="pouchdb-core" />
declare module 'pouchdb-replication-stream' {
  interface ReplicationStreamPlugin {
    plugin: {
      stream: {
        dump: (stream: NodeJS.WritableStream) => Promise<void>
        load: (stream: NodeJS.ReadableStream) => Promise<void>
      }
    }
    adapters: {
      writableStream: any
    }
  }

  interface ReplicationStreamStatic {
    plugin: ReplicationStreamPlugin['plugin']
    adapters: ReplicationStreamPlugin['adapters']
  }

  const replicationStream: ReplicationStreamStatic
  export default replicationStream
}
declare module 'pouchdb-load' {
  interface LoadPlugin {
    load: (blob: Blob | Buffer | string) => Promise<void>
  }

  const load: LoadPlugin
  export default load
}
type DataType = string | Buffer | Stream
declare namespace PouchDB {
  interface Static {
    adapter(name: string, adapter: any, opts?: any): void
  }
  interface Database {
    loadIt: (blob: DataType, options?: any) => Promise<void>
    dump: (stream: DataType, options?: any) => Promise<void>
  }
}

// generate-replication-id.d.ts
declare module 'pouchdb-generate-replication-id' {

  function generateReplicationId(src: PouchDB.Database, target: Database, opts: {
    doc_ids?: string[];
    filter?: string;
    query_params?: Record<string, any>;
    selector?: Record<string, any>;
    view?: string;
  }): Promise<string>;

  export = generateReplicationId;
}


declare module 'pouchdb-checkpointer' {
  type Database = PouchDB.Database
  import { isForbiddenError } from 'pouchdb-utils';

  const CHECKPOINT_VERSION: number;
  const REPLICATOR: string;
  const CHECKPOINT_HISTORY_SIZE: number;
  const LOWEST_SEQ: number;

  function updateCheckpoint(
    db: Database,
    id: string,
    checkpoint: any,
    session: string,
    returnValue: { cancelled: boolean }
  ): Promise<void>;

  export class CheckpointerInternal {
    constructor(
      src: Database,
      target: Database,
      id: string,
      returnValue: { cancelled: boolean },
      opts?: {
        writeSourceCheckpoint?: boolean;
        writeTargetCheckpoint?: boolean;
      }
    );

    writeCheckpoint(checkpoint: any, session: string): Promise<void>;
    updateTarget(checkpoint: any, session: string): Promise<void>;
    updateSource(checkpoint: any, session: string): Promise<void>;
    getCheckpoint(): Promise<number>;
  }

  const comparisons: {
    [key: string]: (targetDoc: any, sourceDoc: any) => number;
  };

  function compareReplicationLogs(srcDoc: any, tgtDoc: any): { last_seq: any; history: any[] };
  function compareReplicationHistory(sourceHistory: any[], targetHistory: any[]): { last_seq: number; history: any[] };
  function hasSessionId(sessionId: string, history: any[]): boolean;

  function Checkpointer(
    src: Database,
    target: Database,
    id: string,
    returnValue: { cancelled: boolean },
    opts?: {
      writeSourceCheckpoint?: boolean;
      writeTargetCheckpoint?: boolean;
    }
  ): CheckpointerInternal;

  export = Checkpointer;
}

declare module 'pouchdb-promise' {
  import { Promise } from 'es6-promise';
  export = Promise;
}

declare module 'argsarray' {
  export default function getArguments(func: Function): Function;
}
