export interface ConnectionConfig {
  readonly name: string;
  readonly engine: 'postgres' | 'mysql' | 'mssql' | 'custom';
  readonly baseUrl: string;
}

export interface ColumnInfo {
  readonly column_name: string;
  readonly data_type: string;
  readonly udt_name: string;
  readonly is_nullable: boolean;
  readonly column_default: string | null;
  readonly is_identity: boolean;
  readonly identity_generation: string | null;
  readonly character_maximum_length: number | null;
  readonly numeric_precision: number | null;
  readonly numeric_scale: number | null;
  readonly ordinal_position: number;
}

export interface TableInfo {
  readonly table_name: string;
  readonly table_type: string;
  readonly row_count?: number;
}

export interface TableSchema {
  readonly table_name: string;
  readonly columns: readonly ColumnInfo[];
}

export interface SchemaConstraint {
  readonly constraint_name: string;
  readonly constraint_type: string;
  readonly columns: readonly string[];
  readonly referenced_table_schema: string | null;
  readonly referenced_table: string | null;
  readonly referenced_columns: readonly string[];
  readonly update_rule: string | null;
  readonly delete_rule: string | null;
}

export interface IndexInfo {
  readonly index_name: string;
  readonly is_unique: boolean;
  readonly is_primary: boolean;
  readonly method: string;
  readonly predicate: string | null;
  readonly columns: readonly string[];
  readonly definition: string;
}

export interface FullTableSchema {
  readonly table_name: string;
  readonly table_schema: string;
  readonly table_type: string;
  readonly columns: readonly ColumnInfo[];
  readonly constraints: readonly SchemaConstraint[];
  readonly indexes: readonly IndexInfo[];
}

export interface ForeignKeyInfo {
  readonly constraintName: string;
  readonly column: string;
  readonly referencedTable: string;
  readonly referencedColumn: string;
}

export interface ChildForeignKeyInfo {
  readonly childTable: string;
  readonly childColumn: string;
  readonly parentColumn: string;
}

export interface FetchPredicate {
  readonly text: string;
  readonly args: unknown[] | Record<string, unknown>;
}

export interface FetchSort {
  readonly column: string;
  readonly direction: 'ASC' | 'DESC';
}

export interface FetchPagination {
  readonly size: number;
  readonly index: number;
}

export interface FetchRequest {
  readonly table: string;
  readonly predicates?: readonly FetchPredicate[];
  readonly sort?: readonly FetchSort[];
  readonly pagination?: FetchPagination;
}

export interface FetchResponse<T = Record<string, unknown>> {
  readonly data: readonly T[];
  readonly total?: number;
  readonly page?: number;
  readonly pageSize?: number;
}
