declare module "sql.js" {
  type SqlJsDatabase = {
    exec: (sql: string) => Array<{ columns: string[]; values: unknown[][] }>;
    close: () => void;
  };
  type SqlJsModule = { Database: new () => SqlJsDatabase };
  type SqlJsInitializer = (options?: { locateFile?: (file: string) => string }) => Promise<SqlJsModule>;
  const initSqlJs: SqlJsInitializer;
  export default initSqlJs;
}
