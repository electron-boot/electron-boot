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
