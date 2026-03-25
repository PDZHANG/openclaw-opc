declare module 'sql.js' {
  export interface Database {
    run(sql: string, ...params: any[]): any;
    get(sql: string, ...params: any[]): any;
    all(sql: string, ...params: any[]): any[];
    exec(sql: string): any[];
    prepare(sql: string): Statement;
    export(): Uint8Array;
  }

  export interface Statement {
    run(...params: any[]): any;
    get(...params: any[]): any;
    all(...params: any[]): any[];
    getAsObject(...params: any[]): any;
    reset(): void;
    free(): void;
  }

  export interface SQLJs {
    Database: new (data?: Uint8Array) => Database;
  }

  function initSqlJs(options?: any): Promise<SQLJs>;
  export default initSqlJs;
}